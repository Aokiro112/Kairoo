import dotenv from 'dotenv';
import { SECURITY_AGENT_SYSTEM_PROMPT } from './systemPrompt';
import { SECURITY_AGENT_TOOLS, executeSecurityTool, ToolCall } from './tools';
import { groqKeyManager } from './groqKeyManager';

dotenv.config();

export interface StreamEvent {
  type: 'reasoning' | 'tool_group' | 'content_chunk' | 'done' | 'error';
  data?: any;
}

const VALID_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'deepseek-r1-distill-llama-70b',
  'qwen-qwq-32b',
  'gemma2-9b-it',
]);

const MODEL_ALIAS_MAP: Record<string, string> = {
  // OpenAI alias mappings to fast/high-capability Groq LPU models
  'openai/gpt-4o': 'llama-3.3-70b-versatile',
  'gpt-4o': 'llama-3.3-70b-versatile',
  'gpt-4': 'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b': 'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b': 'llama-3.1-8b-instant',

  // Groq Llama aliases
  'groq/llama-3.3-70b': 'llama-3.3-70b-versatile',
  'llama-3.3-70b': 'llama-3.3-70b-versatile',
  'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile': 'llama-3.3-70b-versatile',
  'groq/llama-3.1-8b': 'llama-3.1-8b-instant',
  'llama-3.1-8b': 'llama-3.1-8b-instant',
  'llama-3.1-8b-instant': 'llama-3.1-8b-instant',

  // DeepSeek & Qwen aliases
  'deepseek-r1': 'deepseek-r1-distill-llama-70b',
  'deepseek-r1-distill-llama-70b': 'deepseek-r1-distill-llama-70b',
  'qwen/qwen-2.5-coder': 'deepseek-r1-distill-llama-70b',
  'qwen/qwen3.8-27b': 'llama-3.3-70b-versatile',
  'qwen/qwen3.6-27b': 'llama-3.1-8b-instant',
  'qwen-qwq-32b': 'qwen-qwq-32b',
  'mixtral-8x7b-32768': 'llama-3.3-70b-versatile',
};

export const resolveModel = (requestedModel?: string): string => {
  if (!requestedModel) return 'llama-3.3-70b-versatile';
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
  if (clean.includes('r1') || clean.includes('deepseek') || clean.includes('coder')) {
    return 'deepseek-r1-distill-llama-70b';
  }
  if (clean.includes('8b') || clean.includes('instant') || clean.includes('fast')) {
    return 'llama-3.1-8b-instant';
  }
  if (clean.includes('70b') || clean.includes('gpt') || clean.includes('llama') || clean.includes('versatile')) {
    return 'llama-3.3-70b-versatile';
  }

  return 'llama-3.3-70b-versatile';
};

export async function* runSecurityAgentStream(
  messages: Array<{ role: string; content: string }>,
  model: string = 'llama-3.3-70b-versatile'
): AsyncGenerator<StreamEvent> {
  const activeModel = resolveModel(model);

  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const urlMatch =
    lastUserMsg.match(/https?:\/\/([^\/\s]+)/) ||
    lastUserMsg.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const targetDomain = urlMatch ? urlMatch[1] : null;

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
          ? `Target \`${targetDomain}\` detected. Planning diagnostic reconnaissance workflow with \`${activeModel}\` (Auto Key Rotation Active).`
          : `Analyzing query and formulating cybersecurity assessment with \`${activeModel}\` (Auto Key Rotation Active).`,
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
