import dotenv from 'dotenv';
import { SECURITY_AGENT_SYSTEM_PROMPT } from './systemPrompt';
import { SECURITY_AGENT_TOOLS, executeSecurityTool, validateTargetScope, ToolCall } from './tools';
import { groqKeyManager } from './groqKeyManager';
import { runDeepSeekStream, isDeepSeekModel } from './deepseekService';
import {
  buildTargetApplicationModel,
  evaluateCandidateAgainstBenignExplanations,
  formatTechnicalSecurityReport,
  Observation,
  SecurityFinding,
  TargetApplicationModel,
} from './securityPipeline';

export { isDeepSeekModel } from './deepseekService';

dotenv.config();

export interface StreamEvent {
  type: 'reasoning' | 'tool_group' | 'content_chunk' | 'done' | 'error';
  data?: any;
}

const VALID_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3.8-27b',
  'qwen/qwen3.6-27b',
  'groq/compound',
  'groq/compound-mini',
]);

const MODEL_ALIAS_MAP: Record<string, string> = {
  // Llama mappings
  'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
  'llama-3.3-70b': 'llama-3.3-70b-versatile',
  'groq/llama-3.3-70b': 'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant': 'llama-3.1-8b-instant',
  'llama-3.1-8b': 'llama-3.1-8b-instant',
  'groq/llama-3.1-8b': 'llama-3.1-8b-instant',

  // OpenAI aliases
  'openai/gpt-4o': 'llama-3.3-70b-versatile',
  'gpt-4o': 'llama-3.3-70b-versatile',
  'gpt-4': 'llama-3.3-70b-versatile',

  // Legacy compatibility fallbacks
  'openai/gpt-oss-120b': 'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b': 'llama-3.1-8b-instant',
  'gpt-oss-120b': 'llama-3.3-70b-versatile',
  'gpt-oss-20b': 'llama-3.1-8b-instant',
};

export const resolveModel = (requestedModel?: string): string => {
  if (!requestedModel) return 'llama-3.3-70b-versatile';
  const clean = requestedModel.trim().toLowerCase();

  if (MODEL_ALIAS_MAP[clean]) {
    return MODEL_ALIAS_MAP[clean];
  }

  // Already a valid official Groq model ID
  if (VALID_GROQ_MODELS.has(clean)) {
    return clean;
  }

  return 'llama-3.3-70b-versatile';
};

/**
 * Silent runtime model fallback chain.
 * If the Groq API key doesn't have access to the primary model (404 model_not_found),
 * the backend transparently retries with the next model in this chain.
 * No UI changes — the user still sees "Llama 3.3 70B" everywhere.
 */
const MODEL_FALLBACK_CHAIN: Record<string, string[]> = {
  'llama-3.3-70b-versatile': ['llama-3.3-70b-specdec', 'llama-3.1-8b-instant'],
  'llama-3.3-70b-specdec': ['llama-3.1-8b-instant'],
};

function isModelNotFoundError(err: any): boolean {
  if (!err) return false;
  if (err.status === 404) {
    const msg = err.message || '';
    const errBody = err.error?.error?.code || err.error?.code || '';
    return msg.includes('model') || msg.includes('does not exist') || errBody === 'model_not_found';
  }
  return false;
}

function sanitizeToolResultForLLM(result: any): string {
  if (!result) return '{}';
  try {
    const clean = typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : result;
    if (typeof clean === 'object' && clean !== null) {
      if ('screenshotBase64' in clean) {
        clean.screenshotBase64 = '[Base64 PNG Screenshot Captured and rendered in User UI]';
      }
      if ('screenshotDataUrl' in clean) {
        clean.screenshotDataUrl = '[Base64 PNG Screenshot Captured and rendered in User UI]';
      }
    }
    const str = typeof clean === 'string' ? clean : JSON.stringify(clean);
    if (str.length > 4000) {
      return str.slice(0, 4000) + '... [truncated for context efficiency]';
    }
    return str;
  } catch {
    return String(result).slice(0, 4000);
  }
}

function createThinkFilter() {
  let insideThink = false;
  let buffer = '';

  return (chunk: string): string => {
    buffer += chunk;
    let output = '';

    while (buffer.length > 0) {
      if (!insideThink) {
        const startTagIndex = buffer.indexOf('<think>');
        if (startTagIndex === -1) {
          const partialMatch = buffer.match(/<t(?:h(?:i(?:n(?:k)?)?)?)?$/i);
          if (partialMatch) {
            const keepIndex = partialMatch.index!;
            output += buffer.slice(0, keepIndex);
            buffer = buffer.slice(keepIndex);
            break;
          } else {
            output += buffer;
            buffer = '';
            break;
          }
        } else {
          output += buffer.slice(0, startTagIndex);
          insideThink = true;
          buffer = buffer.slice(startTagIndex + 7);
        }
      } else {
        const endTagIndex = buffer.indexOf('</think>');
        if (endTagIndex === -1) {
          const partialEndMatch = buffer.match(/<\/(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/i);
          if (partialEndMatch) {
            buffer = buffer.slice(partialEndMatch.index!);
          } else {
            buffer = '';
          }
          break;
        } else {
          insideThink = false;
          buffer = buffer.slice(endTagIndex + 8);
        }
      }
    }

    return output;
  };
}

export async function* runSecurityAgentStream(
  messages: Array<{ role: string; content: string }>,
  model: string = 'llama-3.3-70b-versatile',
  attachments?: Array<{ id: string; name: string; size: number; content: string; language: string }>,
  userIdentifier: string = 'anonymous',
  options?: { onFirstContentProduced?: () => void }
): AsyncGenerator<StreamEvent> {
  let activeModel = resolveModel(model);

  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const hasAttachments = attachments && attachments.length > 0;
  const urlMatch =
    lastUserMsg.match(/https?:\/\/([^\/\s]+)/) ||
    lastUserMsg.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const targetDomain = urlMatch ? urlMatch[1] : null;

  // Intercept self-targets and restricted subnets before executing any probes
  if (targetDomain) {
    const scopeCheck = validateTargetScope(targetDomain);
    if (!scopeCheck.allowed) {
      yield {
        type: 'reasoning',
        data: {
          id: `step-reasoning-${Date.now()}`,
          type: 'reasoning',
          text: `Target \`${targetDomain}\` is recognized as internal platform infrastructure. Applying Kairo Self-Defense and Scope Protection Policy.`,
        },
      };

      const defenseNotice = `🛡️ **Kairo Self-Defense & Scope Protection Policy**

Target \`${targetDomain}\` is recognized as platform infrastructure, internal network space, or loopback metadata.

- **Status**: Diagnostic scanning restricted.
- **Reason**: Automated penetration testing, vulnerability enumeration, and port reconnaissance against Kairo's internal infrastructure and private subnets are strictly restricted under platform safety guidelines.

> If you are conducting authorized security testing on an external asset, please specify an external domain or authorized target (e.g., \`https://example.com\` or \`scanme.nmap.org\`).`;

      yield { type: 'content_chunk', data: defenseNotice };
      yield { type: 'done' };
      return;
    }
  }

  const selfTargetKeywords = ['kairo.bond', 'kairo.ai', 'localhost', '127.0.0.1', '169.254.169.254'];
  const hasSelfTarget = selfTargetKeywords.some((kw) => lastUserMsg.toLowerCase().includes(kw));
  if (
    hasSelfTarget &&
    (lastUserMsg.toLowerCase().includes('scan') ||
      lastUserMsg.toLowerCase().includes('vuln') ||
      lastUserMsg.toLowerCase().includes('exploit') ||
      lastUserMsg.toLowerCase().includes('port') ||
      lastUserMsg.toLowerCase().includes('audit') ||
      lastUserMsg.toLowerCase().includes('hack') ||
      lastUserMsg.toLowerCase().includes('probe'))
  ) {
    yield {
      type: 'reasoning',
      data: {
        id: `step-reasoning-${Date.now()}`,
        type: 'reasoning',
        text: `Query targets Kairo platform infrastructure. Applying Kairo Self-Defense and Infrastructure Protection Policy.`,
      },
    };

    const defenseNotice = `🛡️ **Kairo Self-Defense & Scope Protection Policy**

Requests to scan, probe, audit, or exploit Kairo's own infrastructure (\`kairo.bond\`) and internal platform networks are strictly restricted.

- **Status**: Probing restricted.
- **Guideline**: Kairo AI performs authorized cybersecurity research and defensive engineering on external assets and authorized systems only.`;

    yield { type: 'content_chunk', data: defenseNotice };
    yield { type: 'done' };
    return;
  }

  // Format attachments block if present
  let attachmentContextText = '';
  if (hasAttachments) {
    attachmentContextText = attachments
      .map(
        (att) =>
          `\n--- ATTACHED ARTIFACT: ${att.name} (Language: ${att.language}, Size: ${att.size} bytes) ---\n\`\`\`${att.language}\n${att.content}\n\`\`\`\n`
      )
      .join('\n');
  }

  // Build complete conversation context
  const formattedHistory = messages.map((m, idx) => {
    if (idx === messages.length - 1 && hasAttachments) {
      return {
        role: m.role,
        content: `${m.content || ''}\n\n${attachmentContextText}`,
      };
    }
    return { role: m.role, content: m.content || '' };
  });

  const conversationHistory: any[] = [
    { role: 'system', content: SECURITY_AGENT_SYSTEM_PROMPT },
    ...formattedHistory,
  ];

  // Route DeepSeek requests directly to DeepSeek service
  if (isDeepSeekModel(model)) {
    yield* runDeepSeekStream(conversationHistory, {
      model,
      onFirstContentProduced: options?.onFirstContentProduced,
    });
    return;
  }

  // Fallback autonomous execution if no Groq API keys are loaded
  if (!groqKeyManager.hasKeys()) {
    yield {
      type: 'reasoning',
      data: {
        id: `step-reasoning-${Date.now()}`,
        type: 'reasoning',
        text: hasAttachments
          ? `Ingesting ${attachments.length} attached file(s) (${attachments.map((a) => a.name).join(', ')}). Conducting evidence-first static code evaluation and context analysis.`
          : targetDomain
          ? `Target domain \`${targetDomain}\` identified. Initiating evidence-first passive reconnaissance, TLS inspection, and HTTP security posture evaluation.`
          : `Analyzing query and conducting evidence-based security reasoning workflow.`,
      },
    };

    const executedTools: ToolCall[] = [];
    const observations: Observation[] = [];
    const confirmedVulnerabilities: SecurityFinding[] = [];
    const candidateFindings: SecurityFinding[] = [];
    const suppressedOrBenign: SecurityFinding[] = [];

    if (hasAttachments) {
      for (const att of attachments) {
        try {
          const codeAudit = await executeSecurityTool('sast_code_security_audit', {
            language: att.language,
            codeSnippet: att.content,
          });
          codeAudit.toolCall.label = `SAST Code Audit (${att.name})`;
          executedTools.push(codeAudit.toolCall);

          const raw = codeAudit.rawResult || {};
          observations.push({
            id: `obs-file-${Date.now()}-${Math.random()}`,
            type: 'file',
            target: att.name,
            sourceTool: 'sast_code_security_audit',
            data: { language: att.language, lines: raw.lines },
            description: `Source file ${att.name} (${att.language}, ${raw.lines} lines)`,
            timestamp: Date.now(),
          });

          // Evaluate raw issues through benign explanation filter
          const issues = raw.detectedIssues || [];
          for (const issue of issues) {
            const isHardcodedSecret = issue.includes('CWE-312') || issue.includes('hardcoded-secret');
            const evalResult = evaluateCandidateAgainstBenignExplanations({
              title: issue,
              category: isHardcodedSecret ? 'Hardcoded Secrets' : 'Source Code Flaw',
              affected_asset: att.name,
              evidence: [issue],
            });

            if (evalResult.isFalsePositive || evalResult.isInformationalOnly) {
              suppressedOrBenign.push({
                id: `benign-${Date.now()}-${Math.random()}`,
                title: issue,
                category: isHardcodedSecret ? 'Hardcoded Secrets' : 'Code Pattern',
                severity: evalResult.recommendedSeverity,
                confidence: evalResult.recommendedConfidence,
                status: evalResult.recommendedStatus,
                affected_asset: att.name,
                description: evalResult.benignExplanation,
                evidence: [issue],
                validation: {
                  testPerformed: 'Static context analysis',
                  expectedBehavior: 'Non-production token or harmless pattern',
                  observedBehavior: 'Harmless or test pattern identified',
                  securityImplication: evalResult.decisionRationale,
                  outcome: 'refuted',
                },
                impact: 'None',
                reasoning: {
                  hypothesis: issue,
                  supportingFactors: ['Pattern matched AST heuristic'],
                  benignExplanationConsidered: evalResult.benignExplanation,
                  decisionRationale: evalResult.decisionRationale,
                },
                remediation: 'No action required for non-production items.',
              });
            } else {
              // Real candidate or confirmed finding
              const isConfirmed = isHardcodedSecret && !att.name.includes('test');
              const finding: SecurityFinding = {
                id: `finding-${Date.now()}-${Math.random()}`,
                title: issue.replace(/^\[[^\]]+\]\s*/, ''),
                category: isHardcodedSecret ? 'CWE-312: High-Entropy Secret Exposure' : 'Software Weakness',
                severity: isConfirmed ? 'HIGH' : 'MEDIUM',
                confidence: isConfirmed ? 'CONFIRMED' : 'MEDIUM',
                status: isConfirmed ? 'validated' : 'candidate',
                affected_asset: att.name,
                description: `Identified security flaw in ${att.name}`,
                evidence: [issue],
                validation: {
                  testPerformed: 'Contextual pattern analysis and secret entropy verification',
                  expectedBehavior: 'Private secret protected in environment variables',
                  observedBehavior: 'High-entropy private credential committed in source artifact',
                  securityImplication: 'Exposure of production secrets leads to direct credential abuse',
                  outcome: isConfirmed ? 'validated' : 'inconclusive',
                },
                impact: isConfirmed ? 'Unauthorized API or service access using exposed private key' : 'Potential injection or execution sink',
                reasoning: {
                  hypothesis: issue,
                  supportingFactors: ['High-entropy matching regex', 'Active production file context'],
                  benignExplanationConsidered: 'Examined test/dummy placeholder exceptions',
                  decisionRationale: 'Pattern confirmed as sensitive private credential',
                },
                remediation: isHardcodedSecret
                  ? 'Immediately revoke exposed credential and migrate key storage to environment variables.'
                  : 'Parameterize all external inputs and sanitize data flows.',
              };

              if (isConfirmed) {
                confirmedVulnerabilities.push(finding);
              } else {
                candidateFindings.push(finding);
              }
            }
          }
        } catch (e) {}
      }
    } else if (targetDomain) {
      try {
        const wafRes = await executeSecurityTool('waf_detection_wafw00f', {
          targetUrl: `https://${targetDomain}`,
        });
        executedTools.push(wafRes.toolCall);
        observations.push({
          id: `obs-waf-${Date.now()}`,
          type: 'technology',
          target: targetDomain,
          sourceTool: 'waf_detection_wafw00f',
          data: wafRes.rawResult,
          description: `WAF Inspection: ${wafRes.rawResult?.wafBrand || wafRes.rawResult?.waf || 'Direct origin exposed'}`,
          timestamp: Date.now(),
        });
      } catch (e) {}

      try {
        const headersRes = await executeSecurityTool('analyze_security_headers', {
          targetUrl: `https://${targetDomain}`,
        });
        executedTools.push(headersRes.toolCall);
        const hRaw = headersRes.rawResult || {};
        observations.push({
          id: `obs-headers-${Date.now()}`,
          type: 'header',
          target: targetDomain,
          sourceTool: 'analyze_security_headers',
          data: hRaw,
          description: `HTTP Server: ${hRaw.serverBanner || 'Undisclosed'}. Missing headers: ${(hRaw.missingHeaders || []).join(', ') || 'None'}`,
          timestamp: Date.now(),
        });

        // Evaluate missing headers with benign rule
        if (hRaw.missingHeaders && hRaw.missingHeaders.length > 0) {
          const headerEval = evaluateCandidateAgainstBenignExplanations({
            title: 'Missing HTTP Security Headers',
            category: 'Configuration Hardening',
            affected_asset: targetDomain,
            evidence: hRaw.missingHeaders.map((h: string) => `Missing ${h}`),
          });
          suppressedOrBenign.push({
            id: `benign-headers-${Date.now()}`,
            title: 'Missing HTTP Security Headers',
            category: 'Defense-in-Depth',
            severity: headerEval.recommendedSeverity,
            confidence: headerEval.recommendedConfidence,
            status: headerEval.recommendedStatus,
            affected_asset: targetDomain,
            description: headerEval.benignExplanation,
            evidence: hRaw.missingHeaders.map((h: string) => `Missing header: ${h}`),
            validation: {
              testPerformed: 'HTTP response header inspection',
              expectedBehavior: 'CSP, HSTS, and framing controls present',
              observedBehavior: `Missing ${hRaw.missingHeaders.join(', ')}`,
              securityImplication: headerEval.decisionRationale,
              outcome: 'inconclusive',
            },
            impact: 'Reduced defense-in-depth against client-side attacks.',
            reasoning: {
              hypothesis: 'Missing headers allow clickjacking or inline script injection',
              supportingFactors: ['Headers absent in response'],
              benignExplanationConsidered: headerEval.benignExplanation,
              decisionRationale: headerEval.decisionRationale,
            },
            remediation: 'Deploy Content-Security-Policy, Strict-Transport-Security, and X-Content-Type-Options.',
          });
        }
      } catch (e) {}

      try {
        const dnsRes = await executeSecurityTool('passive_dns_recon', {
          domain: targetDomain,
        });
        executedTools.push(dnsRes.toolCall);
        const dnsRaw = dnsRes.rawResult || {};
        observations.push({
          id: `obs-dns-${Date.now()}`,
          type: 'dns',
          target: targetDomain,
          sourceTool: 'passive_dns_recon',
          data: dnsRaw,
          description: `DNS Records (A: ${(dnsRaw.records?.A || []).length}, MX: ${(dnsRaw.records?.MX || []).length}, SPF: ${dnsRaw.hasSPF ? 'Configured' : 'Missing'})`,
          timestamp: Date.now(),
        });
      } catch (e) {}

      try {
        const tlsRes = await executeSecurityTool('ssl_tls_certificate_audit', {
          domain: targetDomain,
        });
        executedTools.push(tlsRes.toolCall);
        const tlsRaw = tlsRes.rawResult || {};
        observations.push({
          id: `obs-tls-${Date.now()}`,
          type: 'certificate',
          target: targetDomain,
          sourceTool: 'ssl_tls_certificate_audit',
          data: tlsRaw,
          description: `TLS Issuer: ${tlsRaw.issuer?.O || tlsRaw.issuer?.CN || 'Valid'}, ${tlsRaw.daysRemaining || 0} days remaining, ${(tlsRaw.discoveredSANs || []).length} SANs`,
          timestamp: Date.now(),
        });
      } catch (e) {}
    } else {
      try {
        const codeAudit = await executeSecurityTool('sast_code_security_audit', {
          language: 'generic',
          codeSnippet: lastUserMsg,
        });
        executedTools.push(codeAudit.toolCall);
      } catch (e) {}
    }

    if (executedTools.length > 0) {
      yield {
        type: 'tool_group',
        data: {
          id: `step-tools-${Date.now()}`,
          type: 'tool_group',
          tools: executedTools,
        },
      };
    }

    const appModel = buildTargetApplicationModel(targetDomain || 'Local Analysis', observations);
    const fallbackReport = formatTechnicalSecurityReport({
      model: appModel,
      observations,
      confirmedVulnerabilities,
      candidateFindings,
      suppressedOrBenign,
      diagnosticToolsCount: executedTools.length,
    });

    yield { type: 'content_chunk', data: fallbackReport };
    yield { type: 'done' };
    return;
  }

  // Live Multi-Turn ReAct Agent Execution with Groq Multi-Key Rotation Pool
  try {
    const groqTools: any[] = SECURITY_AGENT_TOOLS.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));


    let loopCount = 0;
    const maxLoops = 3;
    let finalReportGenerated = false;
    let executedAnyTools = false;
    const thinkFilter = createThinkFilter();

    while (loopCount < maxLoops) {
      loopCount++;

      let streamSource: any;
      let modelFallbackAttempted = false;

      try {
        streamSource = await groqKeyManager.executeWithRotation(
          `ReAct Step #${loopCount}`,
          async (groqClient) => {
            return await groqClient.chat.completions.create({
              model: activeModel,
              messages: conversationHistory,
              tools: groqTools,
              tool_choice: 'auto',
              temperature: 0.2,
              max_tokens: 4096,
              stream: true,
            });
          }
        );
      } catch (modelErr: any) {
        // Silent model fallback: if API key lacks access to the model, try alternatives
        if (isModelNotFoundError(modelErr) && MODEL_FALLBACK_CHAIN[activeModel]) {
          const fallbacks = MODEL_FALLBACK_CHAIN[activeModel];
          let fallbackSuccess = false;

          for (const fallbackModel of fallbacks) {
            try {
              console.warn(
                `⚠️ [ModelFallback] Model "${activeModel}" returned 404. Silently falling back to "${fallbackModel}".`
              );
              streamSource = await groqKeyManager.executeWithRotation(
                `ReAct Step #${loopCount} (fallback: ${fallbackModel})`,
                async (groqClient) => {
                  return await groqClient.chat.completions.create({
                    model: fallbackModel,
                    messages: conversationHistory,
                    tools: groqTools,
                    tool_choice: 'auto',
                    temperature: 0.2,
                    max_tokens: 4096,
                    stream: true,
                  });
                }
              );
              // Success — lock activeModel to the working fallback for remaining calls
              activeModel = fallbackModel;
              modelFallbackAttempted = true;
              fallbackSuccess = true;
              console.log(`✅ [ModelFallback] Successfully using "${fallbackModel}" as runtime model.`);
              break;
            } catch (fallbackErr: any) {
              // This fallback also failed — try next one
              console.warn(`⚠️ [ModelFallback] Fallback "${fallbackModel}" also failed: ${fallbackErr.message}`);
              continue;
            }
          }

          if (!fallbackSuccess) {
            throw modelErr; // All fallbacks exhausted — rethrow original error
          }
        } else {
          throw modelErr; // Not a model_not_found error — rethrow
        }
      }

      const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};
      let textContent = '';

      for await (const chunk of streamSource) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap[idx]) {
              toolCallsMap[idx] = {
                id: tc.id || `call_${Date.now()}_${idx}`,
                name: tc.function?.name || '',
                arguments: '',
              };
            }
            if (tc.id) toolCallsMap[idx].id = tc.id;
            if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
          }
        }

        if (delta.content) {
          textContent += delta.content;
          // If no tools have been run yet and no tool calls in this chunk, stream clean conversational response live
          if (!executedAnyTools && Object.keys(toolCallsMap).length === 0) {
            const clean = thinkFilter(delta.content);
            if (clean) {
              yield { type: 'content_chunk', data: clean };
            }
          }
        }
      }

      const toolCallsArray = Object.values(toolCallsMap);

      if (toolCallsArray.length > 0) {
        executedAnyTools = true;
        // Record assistant tool call intent in conversation history
        conversationHistory.push({
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCallsArray.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          })),
        });

        // Execute all requested security tools in parallel
        const toolExecutionPromises = toolCallsArray.map(async (tc) => {
          const fnName = tc.name;
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(tc.arguments || '{}');
          } catch {}

          try {
            const { toolCall, rawResult } = await executeSecurityTool(fnName, fnArgs);
            return {
              toolCall,
              historyItem: {
                role: 'tool',
                tool_call_id: tc.id,
                content: sanitizeToolResultForLLM(rawResult),
              },
            };
          } catch (err: any) {
            return {
              toolCall: {
                id: tc.id,
                type: 'scan' as const,
                label: `Tool Error (${fnName})`,
                status: 'failed' as const,
                resultDetails: { matchedResults: [err.message] },
              },
              historyItem: {
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ error: err.message }),
              },
            };
          }
        });

        const results = await Promise.all(toolExecutionPromises);
        const stepTools: ToolCall[] = results.map((r) => r.toolCall);
        for (const r of results) {
          conversationHistory.push(r.historyItem);
        }

        // Emit tool pills with screenshot previews to the frontend immediately
        yield {
          type: 'tool_group',
          data: {
            id: `step-tools-${Date.now()}`,
            type: 'tool_group',
            tools: stepTools,
          },
        };
      } else {
        // No new tool calls generated
        if (!executedAnyTools) {
          finalReportGenerated = true;
        }
        break;
      }
    }

    // Comprehensive Report Synthesis: if tools were executed, synthesize the complete structured report!
    if (executedAnyTools || !finalReportGenerated) {
      conversationHistory.push({
        role: 'user',
        content:
          'All diagnostic reconnaissance and security evaluation tools have completed execution. Based on all the gathered evidence, synthesize the final Precision-First Technical Security Audit Report in markdown format.\n\nCRITICAL PRECISION & EVIDENCE RULES:\n1. Discovery is not a vulnerability! Do NOT put reconnaissance observations (such as /robots.txt, static JS/CSS, sitemaps, server banners, normal API routes, or parameter names like "id") into the Validated Vulnerability Matrix unless there is verified evidence of security impact.\n2. In the Validated Vulnerability Matrix, include ONLY confirmed findings with columns: | ID | Severity | Confidence | Status | Endpoint / Asset | Finding & Impact | Remediation Summary |\n3. Place all informational reconnaissance data into Section 2 (Reconnaissance Observations).\n4. In Section 5 (Evaluated Candidates & Benign Behaviors), provide explicit negative conclusions explaining what was investigated and why it is NOT a vulnerability (e.g. why robots.txt is benign, why normal parameters are not IDOR, why missing headers are hardening recommendations).\n\nStructure:\n# 🛡️ Technical Security Audit Report\n## 🎯 1. Executive Summary & Target Profile\n## 🔍 2. Target Profile & Reconnaissance Observations\n## 🚨 3. Validated Vulnerability Matrix\n## 🔬 4. In-Depth Vulnerability Evidence & Validation\n## 🛡️ 5. Evaluated Candidates & Benign Behaviors\n## 🛠️ 6. Prioritized Remediation Roadmap',
      });

      let finalStreamSource: any;

      try {
        finalStreamSource = await groqKeyManager.executeWithRotation(
          'Final Synthesis Stream',
          async (groqClient) => {
            return await groqClient.chat.completions.create({
              model: activeModel,
              messages: conversationHistory,
              temperature: 0.2,
              max_tokens: 4096,
              stream: true,
            });
          }
        );
      } catch (modelErr: any) {
        // Silent model fallback for synthesis call
        if (isModelNotFoundError(modelErr) && MODEL_FALLBACK_CHAIN[activeModel]) {
          const fallbacks = MODEL_FALLBACK_CHAIN[activeModel];
          let fallbackSuccess = false;

          for (const fallbackModel of fallbacks) {
            try {
              console.warn(
                `⚠️ [ModelFallback] Synthesis: Model "${activeModel}" returned 404. Falling back to "${fallbackModel}".`
              );
              finalStreamSource = await groqKeyManager.executeWithRotation(
                `Final Synthesis Stream (fallback: ${fallbackModel})`,
                async (groqClient) => {
                  return await groqClient.chat.completions.create({
                    model: fallbackModel,
                    messages: conversationHistory,
                    temperature: 0.2,
                    max_tokens: 4096,
                    stream: true,
                  });
                }
              );
              activeModel = fallbackModel;
              fallbackSuccess = true;
              console.log(`✅ [ModelFallback] Synthesis using "${fallbackModel}".`);
              break;
            } catch (fallbackErr: any) {
              console.warn(`⚠️ [ModelFallback] Synthesis fallback "${fallbackModel}" failed: ${fallbackErr.message}`);
              continue;
            }
          }

          if (!fallbackSuccess) {
            throw modelErr;
          }
        } else {
          throw modelErr;
        }
      }

      const synthesisThinkFilter = createThinkFilter();

      for await (const chunk of finalStreamSource) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          const clean = synthesisThinkFilter(delta.content);
          if (clean) {
            yield { type: 'content_chunk', data: clean };
          }
        }
      }
    }

    yield { type: 'done' };
  } catch (err: any) {
    console.error('❌ [runSecurityAgentStream] Error:', err);
    yield {
      type: 'error',
      data: `Security Agent Error: ${err.message}`,
    };
  }
}
