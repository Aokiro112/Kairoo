import dotenv from 'dotenv';
import { SECURITY_AGENT_SYSTEM_PROMPT } from './systemPrompt';
import { SECURITY_AGENT_TOOLS, executeSecurityTool, validateTargetScope, ToolCall } from './tools';
import { groqKeyManager } from './groqKeyManager';

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
  // High performance Groq mappings
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

export const resolveModel = (requestedModel?: string): string => {
  if (!requestedModel) return 'openai/gpt-oss-120b';
  const clean = requestedModel.trim().toLowerCase();

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
  model: string = 'openai/gpt-oss-120b',
  attachments?: Array<{ id: string; name: string; size: number; content: string; language: string }>,
  userIdentifier: string = 'anonymous'
): AsyncGenerator<StreamEvent> {
  const activeModel = resolveModel(model);

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

    let loopCount = 0;
    const maxLoops = 2;
    let finalReportGenerated = false;
    let executedAnyTools = false;
    const thinkFilter = createThinkFilter();

    while (loopCount < maxLoops) {
      loopCount++;

      const streamSource = await groqKeyManager.executeWithRotation(
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
          'All diagnostic reconnaissance and security evaluation tools have completed execution. Based on all the findings gathered above, present the complete, exhaustive Technical Security Audit Report in markdown format.\n\nStructure:\n# 🛡️ Executive Security Summary (Target, Scope, Overall Risk Level)\n## 🎯 Attack Surface & Discovery Overview\n## 🚨 Vulnerability Matrix Table (| ID | Severity | Endpoint / Component | Finding & Impact | Remediation Summary |)\n## 🔬 In-Depth Technical Findings & Evidence\n## 🛠️ Prioritized Remediation Roadmap (Immediate P0, Medium-term P1, Long-term P2)',
      });

      const finalStreamSource = await groqKeyManager.executeWithRotation(
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
