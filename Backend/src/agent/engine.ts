import dotenv from 'dotenv';
import { SECURITY_AGENT_SYSTEM_PROMPT } from './systemPrompt';
import { SECURITY_AGENT_TOOLS, executeSecurityTool, validateTargetScope, ToolCall } from './tools';
import { groqKeyManager } from './groqKeyManager';
import { cheaperInferenceManager } from './cheaperInferenceManager';

dotenv.config();

export interface StreamEvent {
  type: 'reasoning' | 'tool_group' | 'content_chunk' | 'done' | 'error';
  data?: any;
}

const VALID_GROQ_MODELS = new Set([
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'qwen/qwen3.6-27b',
  'groq/compound',
  'groq/compound-mini',
]);

const MODEL_ALIAS_MAP: Record<string, string> = {
  // DeepSeek failover fallback to Groq GPT-OSS 120B
  'v4-flash-0731': 'openai/gpt-oss-120b',
  'v4-flash': 'openai/gpt-oss-120b',
  'deepseek/v4-flash-0731': 'openai/gpt-oss-120b',
  'deepseek-v4-flash-0731': 'openai/gpt-oss-120b',
  'deepseek-v4-flash': 'openai/gpt-oss-120b',
  'deepseek-v4': 'openai/gpt-oss-120b',
  'deepseek': 'openai/gpt-oss-120b',

  // Groq high performance mappings
  'openai/gpt-oss-120b': 'openai/gpt-oss-120b',
  'openai/gpt-oss-20b': 'openai/gpt-oss-20b',
  'gpt-oss-120b': 'openai/gpt-oss-120b',
  'gpt-oss-20b': 'openai/gpt-oss-20b',
  'openai/gpt-4o': 'openai/gpt-oss-120b',
  'gpt-4o': 'openai/gpt-oss-120b',
  'gpt-4': 'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  'llama-3.3-70b': 'openai/gpt-oss-120b',
  'groq/llama-3.3-70b': 'openai/gpt-oss-120b',
  'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
  'llama-3.1-8b': 'openai/gpt-oss-20b',
};

export const isCheaperInferenceModel = (requestedModel?: string): boolean => {
  if (!requestedModel) return false;
  const clean = requestedModel.trim().toLowerCase();
  return (
    clean === 'v4-flash-0731' ||
    clean === 'v4-flash' ||
    clean.includes('v4-flash') ||
    clean.includes('deepseek') ||
    clean.includes('cheaperinference')
  );
};

export const resolveModel = (requestedModel?: string): string => {
  if (!requestedModel) return 'openai/gpt-oss-120b';
  const clean = requestedModel.trim().toLowerCase();

  // Exact alias map lookup
  if (MODEL_ALIAS_MAP[clean]) {
    return MODEL_ALIAS_MAP[clean];
  }

  // Already a valid official Groq model ID
  if (VALID_GROQ_MODELS.has(clean)) {
    return clean;
  }

  return 'openai/gpt-oss-120b';
};

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

export async function* runSecurityAgentStream(
  messages: Array<{ role: string; content: string }>,
  model: string = 'openai/gpt-oss-120b',
  attachments?: Array<{ id: string; name: string; size: number; content: string; language: string }>,
  userIdentifier: string = 'anonymous'
): AsyncGenerator<StreamEvent> {
  const activeModel = resolveModel(model);
  let isUsingCheaperInference = isCheaperInferenceModel(model);

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

  // Fallback autonomous execution if no Groq API keys are loaded
  if (!groqKeyManager.hasKeys()) {
    yield {
      type: 'reasoning',
      data: {
        id: `step-reasoning-${Date.now()}`,
        type: 'reasoning',
        text: hasAttachments
          ? `Ingesting ${attachments.length} attached file(s) (${attachments.map((a) => a.name).join(', ')}). Formulating AST static code analysis and OWASP vulnerability evaluation.`
          : targetDomain
          ? `Target domain \`${targetDomain}\` identified. Initiating non-destructive passive reconnaissance, TLS inspection, and HTTP security header analysis.`
          : `Analyzing query and conducting security audit reasoning workflow.`,
      },
    };

    const executedTools: ToolCall[] = [];

    if (hasAttachments) {
      for (const att of attachments) {
        try {
          const codeAudit = await executeSecurityTool('sast_code_security_audit', {
            language: att.language,
            codeSnippet: att.content,
          });
          codeAudit.toolCall.label = `SAST Code Audit (${att.name})`;
          executedTools.push(codeAudit.toolCall);
        } catch (e) {}
      }
    } else if (targetDomain) {
      try {
        const wafRes = await executeSecurityTool('waf_detection_wafw00f', {
          targetUrl: `https://${targetDomain}`,
        });
        executedTools.push(wafRes.toolCall);
      } catch (e) {}

      try {
        const headersRes = await executeSecurityTool('analyze_security_headers', {
          targetUrl: `https://${targetDomain}`,
        });
        executedTools.push(headersRes.toolCall);
      } catch (e) {}

      try {
        const dnsRes = await executeSecurityTool('passive_dns_recon', {
          domain: targetDomain,
        });
        executedTools.push(dnsRes.toolCall);
      } catch (e) {}

      try {
        const tlsRes = await executeSecurityTool('ssl_tls_certificate_audit', {
          domain: targetDomain,
        });
        executedTools.push(tlsRes.toolCall);
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

    const fallbackReport = hasAttachments
      ? `### 🛡️ Static Code Security & Artifact Audit Summary

**Audited Artifacts**: ${attachments.map((a) => `\`${a.name}\``).join(', ')}  
**Assessment Engine**: Kairo Native SAST Matrix & Static AST Engine  
**Status**: Completed (${executedTools.length} source file passes)

---

#### 1. File Inspection Findings

| Artifact Name | Language | Status | Vulnerability Findings |
| :--- | :--- | :--- | :--- |
${executedTools
  .map(
    (t) =>
      `| \`${t.label.replace('SAST Code Audit (', '').replace(')', '')}\` | \`Source Code\` | **${t.status.toUpperCase()}** | ${
        t.resultDetails?.matchedResults?.join('; ') || 'No critical patterns detected'
      } |`
  )
  .join('\n')}

---

#### 2. Key Security Recommendations & Remediation
1. **Parameterized Queries**: Replace raw string interpolations in database queries with prepared statements / parameterized bindings.
2. **Input Sanitization & Output Encoding**: Ensure all user-controlled inputs undergo context-aware sanitization before rendering or passing to backend routines.
3. **Secrets Management**: Never commit static credentials, private keys, or API secrets directly in source files or environment templates.
`
      : `### 🛡️ Security Audit & Reconnaissance Summary

**Target Asset**: \`${targetDomain || 'Local Analysis'}\`  
**Assessment Engine**: Kairo Native Security Matrix  
**Status**: Completed (${executedTools.length} diagnostic tool passes)

---

#### 1. Executive Summary & Attack Surface
During automated passive assessment, multiple diagnostic probes were executed across HTTP headers, DNS infrastructure, and TLS configurations.

| Diagnostic Tool | Scope | Status | Key Observation |
| :--- | :--- | :--- | :--- |
${executedTools
  .map(
    (t) =>
      `| \`${t.label}\` | \`${t.query || targetDomain || 'Inspection'}\` | **${t.status.toUpperCase()}** | ${
        t.resultDetails?.matchedResults?.[0] || 'Inspection completed successfully'
      } |`
  )
  .join('\n')}

---

#### 2. Key Hardening Recommendations
1. **Strict-Transport-Security (HSTS)**: Ensure HSTS is enforced with \`max-age=31536000; includeSubDomains; preload\`.
2. **Content-Security-Policy (CSP)**: Deploy restrictive CSP rules forbidding \`unsafe-inline\` and \`unsafe-eval\`.
3. **WAF & Rate Limiting**: Ensure origin servers are masked behind Cloudflare / AWS WAF with aggressive anti-scraping rules enabled.
`;

    yield { type: 'content_chunk', data: fallbackReport };
    yield { type: 'done' };
    return;
  }

  // Check CheaperInference quota & availability for DeepSeek v4-flash-0731
  let quotaNoticeText = '';
  if (isUsingCheaperInference) {
    if (!cheaperInferenceManager.hasKey()) {
      quotaNoticeText = `DeepSeek v4-flash-0731 selected. No CHEAPER_INFERENCE_API_KEY found in environment; automatically routing to Groq GPT-OSS cluster.`;
      isUsingCheaperInference = false;
    } else {
      const quota = cheaperInferenceManager.checkQuota(userIdentifier);
      if (!quota.allowed) {
        quotaNoticeText = `DeepSeek v4-flash-0731 quota reached (${quota.currentUsage}/${quota.maxUses} free uses used). Seamlessly routing to Groq GPT-OSS security cluster.`;
        isUsingCheaperInference = false;
      } else {
        const usedCount = cheaperInferenceManager.consumeQuota(userIdentifier);
        quotaNoticeText = `Routing through DeepSeek v4-flash-0731 (platform.cheaperinference.com) [Session Quota: ${usedCount}/${cheaperInferenceManager.getMaxUses()} used].`;
      }
    }
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

    // Complete conversation context (all past user, assistant, system prompts)
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

    yield {
      type: 'reasoning',
      data: {
        id: `step-reasoning-${Date.now()}`,
        type: 'reasoning',
        text: quotaNoticeText
          ? quotaNoticeText
          : hasAttachments
          ? `Ingesting ${attachments.length} attached file(s) (${attachments.map((a) => a.name).join(', ')}). Formulating Static AST code analysis and vulnerability verification workflow.`
          : targetDomain
          ? `Target \`${targetDomain}\` detected. Formulating diagnostic reconnaissance workflow and attack surface mapping.`
          : `Analyzing query, security requirements, and threat landscape.`,
      },
    };

    let loopCount = 0;
    const maxLoops = 4;
    let finalReportGenerated = false;

    while (loopCount < maxLoops) {
      loopCount++;

      let stream: any;
      if (isUsingCheaperInference) {
        try {
          stream = cheaperInferenceManager.executeStream({
            messages: conversationHistory,
            tools: groqTools,
            model: 'deepseek-v4-flash-0731',
            temperature: 0.2,
            max_tokens: 3072,
          });
        } catch (ciErr: any) {
          console.warn(`⚠️ [Engine] CheaperInference stream error: ${ciErr.message}. Failing over to Groq cluster.`);
          isUsingCheaperInference = false;
          stream = await groqKeyManager.executeWithRotation(
            `ReAct Step #${loopCount} (Groq Failover)`,
            async (groqClient) => {
              return await groqClient.chat.completions.create({
                model: 'openai/gpt-oss-120b',
                messages: conversationHistory,
                tools: groqTools,
                tool_choice: 'auto',
                temperature: 0.2,
                max_tokens: 3072,
                stream: true,
              });
            }
          );
        }
      } else {
        stream = await groqKeyManager.executeWithRotation(
          `ReAct Step #${loopCount}`,
          async (groqClient) => {
            return await groqClient.chat.completions.create({
              model: activeModel,
              messages: conversationHistory,
              tools: groqTools,
              tool_choice: 'auto',
              temperature: 0.2,
              max_tokens: 3072,
              stream: true,
            });
          }
        );
      }

      const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};
      let textContent = '';

      for await (const chunk of stream) {
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
          // If model is generating text and not forming tool calls, stream it live to the UI!
          if (Object.keys(toolCallsMap).length === 0) {
            yield { type: 'content_chunk', data: delta.content };
          }
        }
      }

      const toolCallsArray = Object.values(toolCallsMap);

      if (toolCallsArray.length > 0) {
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

        // If we reached max loops, guide model to synthesize final report
        if (loopCount >= maxLoops) {
          conversationHistory.push({
            role: 'user',
            content:
              'All diagnostic and browser reconnaissance tools have executed. Based on the findings gathered above, present the complete technical security audit report now in markdown format.',
          });
        }
        // Continue loop to let model either run next tool or stream the final synthesis report!
      } else {
        // Model generated final text response without new tool calls
        if (textContent) {
          finalReportGenerated = true;
        }
        break;
      }
    }

    // Safety fallback: if final report was not generated yet, stream it with key rotation & tools enabled!
    if (!finalReportGenerated) {
      conversationHistory.push({
        role: 'user',
        content:
          'Based on all the diagnostic tool results gathered above, now synthesize and present the complete technical security audit report. Include: Executive Summary, Vulnerability Matrix Table (with Severity, Endpoint, Finding, Remediation), Proof of Concept/Configuration snippets, and Remediation Steps.',
      });

      let finalStream: any;
      if (isUsingCheaperInference) {
        try {
          finalStream = cheaperInferenceManager.executeStream({
            messages: conversationHistory,
            tools: groqTools,
            model: 'deepseek-v4-flash-0731',
            temperature: 0.2,
            max_tokens: 3072,
          });
        } catch {
          finalStream = await groqKeyManager.executeWithRotation(
            'Final Synthesis Stream Fallback (Groq Failover)',
            async (groqClient) => {
              return await groqClient.chat.completions.create({
                model: 'openai/gpt-oss-120b',
                messages: conversationHistory,
                tools: groqTools,
                tool_choice: 'auto',
                temperature: 0.2,
                max_tokens: 3072,
                stream: true,
              });
            }
          );
        }
      } else {
        finalStream = await groqKeyManager.executeWithRotation(
          'Final Synthesis Stream Fallback',
          async (groqClient) => {
            return await groqClient.chat.completions.create({
              model: activeModel,
              messages: conversationHistory,
              tools: groqTools,
              tool_choice: 'auto',
              temperature: 0.2,
              max_tokens: 3072,
              stream: true,
            });
          }
        );
      }

      for await (const chunk of finalStream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          yield { type: 'content_chunk', data: text };
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
