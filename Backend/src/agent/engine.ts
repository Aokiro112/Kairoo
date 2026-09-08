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
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]);

const MODEL_ALIAS_MAP: Record<string, string> = {
  // Groq GPT-OSS high performance mappings
  'openai/gpt-oss-120b': 'openai/gpt-oss-120b',
  'openai/gpt-oss-20b': 'openai/gpt-oss-20b',
  'gpt-oss-120b': 'openai/gpt-oss-120b',
  'gpt-oss-20b': 'openai/gpt-oss-20b',
  'openai/gpt-4o': 'openai/gpt-oss-120b',
  'gpt-4o': 'openai/gpt-oss-120b',
  'gpt-4': 'openai/gpt-oss-120b',

  // Groq Llama aliases -> Map to ultra-fast GPT-OSS 120B / 20B
  'groq/llama-3.3-70b': 'openai/gpt-oss-120b',
  'llama-3.3-70b': 'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  'llama-3.1-70b-versatile': 'openai/gpt-oss-120b',
  'groq/llama-3.1-8b': 'openai/gpt-oss-20b',
  'llama-3.1-8b': 'openai/gpt-oss-20b',
  'llama-3.1-8b-instant': 'openai/gpt-oss-20b',

  // DeepSeek & Qwen aliases
  'deepseek-r1': 'openai/gpt-oss-120b',
  'deepseek-r1-distill-llama-70b': 'openai/gpt-oss-120b',
  'qwen/qwen-2.5-coder': 'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b': 'openai/gpt-oss-120b',
  'qwen/qwen3.6-27b': 'openai/gpt-oss-20b',
  'groq/compound': 'groq/compound',
  'groq/compound-mini': 'groq/compound-mini',
  'mixtral-8x7b-32768': 'openai/gpt-oss-120b',
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

  // Smart Heuristic Fallbacks
  if (clean.includes('20b') || clean.includes('8b') || clean.includes('instant') || clean.includes('fast')) {
    return 'openai/gpt-oss-20b';
  }

  return 'openai/gpt-oss-120b';
};

export async function* runSecurityAgentStream(
  messages: Array<{ role: string; content: string }>,
  model: string = 'openai/gpt-oss-120b'
): AsyncGenerator<StreamEvent> {
  const activeModel = resolveModel(model);

  const lastUserMsg = messages[messages.length - 1]?.content || '';
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

  // Fallback autonomous execution if no Groq API keys are loaded
  if (!groqKeyManager.hasKeys()) {
    yield {
      type: 'reasoning',
      data: {
        id: `step-reasoning-${Date.now()}`,
        type: 'reasoning',
        text: targetDomain
          ? `Target domain \`${targetDomain}\` identified. Initiating non-destructive passive reconnaissance, TLS inspection, and HTTP security header analysis.`
          : `Analyzing query and conducting security audit reasoning loop. (Note: Add your \`GROQ_API_KEYS\` to \`Backend/.env\` to enable live custom Groq LLM streaming).`,
      },
    };

    const executedTools: ToolCall[] = [];

    if (targetDomain) {
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

    const fallbackReport = `### 🛡️ Security Audit & Reconnaissance Summary

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
    const conversationHistory: any[] = [
      { role: 'system', content: SECURITY_AGENT_SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content || '' })),
    ];

    yield {
      type: 'reasoning',
      data: {
        id: `step-reasoning-${Date.now()}`,
        type: 'reasoning',
        text: targetDomain
          ? `Target \`${targetDomain}\` detected. Planning diagnostic reconnaissance workflow with \`Groq LPU (GPT OSS 120B)\` (Auto Key Rotation Active).`
          : `Analyzing query and formulating cybersecurity assessment with \`Groq LPU (GPT OSS 120B)\` (Auto Key Rotation Active).`,
      },
    };

    let loopCount = 0;
    const maxLoops = 5;
    let finalReportGenerated = false;

    while (loopCount < maxLoops) {
      loopCount++;

      // Execute Chat Completion with automatic multi-key failover if rate limited
      const response = await groqKeyManager.executeWithRotation(
        `ReAct Step #${loopCount}`,
        async (groqClient) => {
          return await groqClient.chat.completions.create({
            model: activeModel,
            messages: conversationHistory,
            tools: groqTools,
            tool_choice: 'auto',
            temperature: 0.2,
            max_tokens: 3072,
          });
        }
      );

      const choice = response.choices[0];
      const toolCalls = choice?.message?.tool_calls;
      const content = choice?.message?.content || '';

      if (toolCalls && toolCalls.length > 0) {
        // Maintain continuous context in history
        conversationHistory.push({
          role: 'assistant',
          content: content,
          tool_calls: toolCalls,
        });

        const stepTools: ToolCall[] = [];

        for (const tc of toolCalls) {
          const fnName = tc.function.name;
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(tc.function.arguments || '{}');
          } catch {}

          try {
            const { toolCall, rawResult } = await executeSecurityTool(fnName, fnArgs);
            stepTools.push(toolCall);

            conversationHistory.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(rawResult),
            });
          } catch (err: any) {
            stepTools.push({
              id: tc.id,
              type: 'scan',
              label: `Tool Error (${fnName})`,
              status: 'failed',
              resultDetails: { matchedResults: [err.message] },
            });

            conversationHistory.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ error: err.message }),
            });
          }
        }

        yield {
          type: 'tool_group',
          data: {
            id: `step-tools-${Date.now()}`,
            type: 'tool_group',
            tools: stepTools,
          },
        };
      } else {
        // Model generated final text directly
        if (content) {
          yield { type: 'content_chunk', data: content };
          finalReportGenerated = true;
        }
        break;
      }
    }

    // If tools executed but final synthesis text was not streamed yet, stream it with key rotation!
    if (!finalReportGenerated) {
      conversationHistory.push({
        role: 'user',
        content:
          'Based on all the diagnostic tool results gathered above, now synthesize and present the complete technical security audit report. Include: Executive Summary, Vulnerability Matrix Table (with Severity, Endpoint, Finding, Remediation), Proof of Concept/Configuration snippets, and Remediation Steps.',
      });

      const finalStream = await groqKeyManager.executeWithRotation(
        'Final Synthesis Stream',
        async (groqClient) => {
          return await groqClient.chat.completions.create({
            model: activeModel,
            messages: conversationHistory,
            temperature: 0.2,
            max_tokens: 3072,
            stream: true,
          });
        }
      );

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
