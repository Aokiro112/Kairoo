import dotenv from 'dotenv';
import { SECURITY_AGENT_TOOLS, executeSecurityTool, ToolCall } from './tools';

dotenv.config();

export interface DeepSeekStreamOptions {
  model?: string;
  onFirstContentProduced?: () => void;
}

export interface DeepSeekStreamEvent {
  type: 'reasoning' | 'tool_group' | 'content_chunk' | 'done' | 'error';
  data?: any;
}

export function isDeepSeekModel(modelName?: string): boolean {
  if (!modelName || typeof modelName !== 'string') return false;
  const clean = modelName.trim().toLowerCase();
  return (
    clean === 'deepseek-chat' ||
    clean === 'deepseek-reasoner' ||
    clean === 'deepseek' ||
    clean === 'deepseek-v3' ||
    clean === 'deepseek-r1' ||
    clean.startsWith('deepseek/') ||
    clean.includes('deepseek')
  );
}

export function getDeepSeekConfig(): { apiKey: string; model: string; baseUrl: string } {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  let configuredModel = (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim();
  let baseUrl = (process.env.DEEPSEEK_BASE_URL || '').trim();

  if (!baseUrl) {
    if (apiKey.startsWith('ci_live_')) {
      baseUrl = 'https://api.cheaperinference.com/v1';
    } else {
      baseUrl = 'https://api.deepseek.com';
    }
  }

  // If using CheaperInference and model is deepseek-chat or deepseek, map it to deepseek-v4-flash
  if ((baseUrl.includes('cheaperinference.com') || apiKey.startsWith('ci_live_')) && (configuredModel === 'deepseek-chat' || configuredModel === 'deepseek')) {
    configuredModel = 'deepseek-v4-flash';
  }

  return { apiKey, model: configuredModel, baseUrl };
}

/**
 * Filter for raw <think>...</think> XML blocks that some DeepSeek models output in standard content.
 */
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

/**
 * Performs a single streaming DeepSeek API call, yielding events to the caller.
 * Returns the accumulated text content and parsed tool calls from the response.
 *
 * Handles SSE buffering correctly: network chunks are buffered until complete
 * SSE events (terminated by newline) can be extracted and parsed.
 */
async function* streamDeepSeekCall(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: any[],
  tools: any[] | undefined,
  maxTokens: number,
  thinkFilter: (chunk: string) => string,
  shouldStreamContent: boolean,
  markContentProduced: () => void,
): AsyncGenerator<DeepSeekStreamEvent, { textContent: string; toolCalls: Array<{ id: string; name: string; arguments: string }> }> {
  const body: Record<string, any> = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
    stream: true,
  };

  // Only include tools when provided (omit for final synthesis calls)
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = (await response.json()) as any;
      if (errorJson?.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {}
    throw new Error(`DeepSeek API error: ${errorMessage}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};
  let textContent = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are delimited by newlines. Split on newline and keep the
    // last incomplete fragment in the buffer for the next iteration.
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(':')) continue; // SSE comments / heartbeats
      if (line === 'data: [DONE]') continue;

      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          const delta = data.choices?.[0]?.delta;
          if (!delta) continue;

          // 1. DeepSeek R1 / Reasoner reasoning content
          if (delta.reasoning_content) {
            markContentProduced();
            yield {
              type: 'reasoning',
              data: {
                id: `step-deepseek-reasoning-${Date.now()}`,
                type: 'reasoning',
                text: delta.reasoning_content,
              },
            };
          }

          // 2. Tool calls delta (streamed incrementally by the API)
          if (delta.tool_calls) {
            markContentProduced();
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap[idx]) {
                toolCallsMap[idx] = {
                  id: tc.id || `call_deepseek_${Date.now()}_${idx}`,
                  name: tc.function?.name || '',
                  arguments: '',
                };
              }
              if (tc.id) toolCallsMap[idx].id = tc.id;
              if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
            }
          }

          // 3. Regular content chunks
          if (delta.content) {
            markContentProduced();
            textContent += delta.content;

            if (shouldStreamContent) {
              const clean = thinkFilter(delta.content);
              if (clean) {
                yield { type: 'content_chunk', data: clean };
              }
            }
          }
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  }

  // Flush any remaining buffer content after the stream ends
  if (buffer.trim()) {
    const line = buffer.trim();
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const data = JSON.parse(line.slice(6));
        const delta = data.choices?.[0]?.delta;
        if (delta?.content) {
          markContentProduced();
          textContent += delta.content;
          if (shouldStreamContent) {
            const clean = thinkFilter(delta.content);
            if (clean) {
              yield { type: 'content_chunk', data: clean };
            }
          }
        }
      } catch {}
    }
  }

  return {
    textContent,
    toolCalls: Object.values(toolCallsMap),
  };
}

/**
 * Executes a streaming DeepSeek chat completion loop with tool calling and reasoning support.
 *
 * Architecture (matching the Groq agent engine pattern):
 *   1. Tool-calling loop: up to maxLoops iterations, each calling the model with tools
 *      available. When the model returns tool calls, tools are executed, results appended
 *      to conversation, and the loop continues. When the model returns text without tool
 *      calls, the text is streamed as the final answer and the loop exits.
 *   2. Final synthesis step: If tools were executed but the loop ended due to maxLoops
 *      (not because the model chose to produce a text answer), an explicit synthesis
 *      prompt is injected and the model is called WITHOUT tools to generate the final
 *      security assessment report.
 *
 * Calls `onFirstContentProduced` as soon as valid tokens or tool calls arrive, indicating that
 * the DeepSeek request succeeded and quota should not be rolled back.
 */
export async function* runDeepSeekStream(
  conversationHistory: any[],
  options: DeepSeekStreamOptions = {}
): AsyncGenerator<DeepSeekStreamEvent> {
  const { apiKey, model: defaultModel, baseUrl } = getDeepSeekConfig();

  if (!apiKey) {
    throw new Error('DeepSeek API key is not configured on the server (DEEPSEEK_API_KEY).');
  }

  let activeModel = options.model && options.model !== 'deepseek-chat' && options.model !== 'deepseek'
    ? options.model
    : defaultModel;

  if ((baseUrl.includes('cheaperinference.com') || apiKey.startsWith('ci_live_')) && (activeModel === 'deepseek-chat' || activeModel === 'deepseek')) {
    activeModel = 'deepseek-v4-flash';
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const deepseekTools = SECURITY_AGENT_TOOLS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  let hasProducedUsableContent = false;
  let executedAnyTools = false;
  let finalTextGenerated = false;

  const markContentProduced = () => {
    if (!hasProducedUsableContent) {
      hasProducedUsableContent = true;
      if (options.onFirstContentProduced) {
        options.onFirstContentProduced();
      }
    }
  };

  // --------------------------------------------------------------------------
  // Phase 1: Tool-calling ReAct loop (up to 3 iterations)
  // --------------------------------------------------------------------------
  let loopCount = 0;
  const maxLoops = 3;

  while (loopCount < maxLoops) {
    loopCount++;

    const thinkFilter = createThinkFilter();

    // Stream content directly only if we haven't executed tools yet (clean conversational response).
    // If tools have been executed, the model's intermediate text is internal reasoning, not the final answer.
    const shouldStreamContent = !executedAnyTools;

    const stream = streamDeepSeekCall(
      endpoint,
      apiKey,
      activeModel,
      conversationHistory,
      deepseekTools,
      4096,
      thinkFilter,
      shouldStreamContent,
      markContentProduced,
    );

    // Consume all yielded events from the streaming call
    let streamResult: { textContent: string; toolCalls: Array<{ id: string; name: string; arguments: string }> };
    while (true) {
      const iter = await stream.next();
      if (iter.done) {
        streamResult = iter.value;
        break;
      }
      yield iter.value;
    }

    const { textContent, toolCalls: toolCallsArray } = streamResult;

    if (toolCallsArray.length > 0) {
      // Model decided to call tools — execute them
      executedAnyTools = true;
      markContentProduced();

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

      // Execute all requested security tools
      for (const tc of toolCallsArray) {
        let args: any = {};
        try {
          args = JSON.parse(tc.arguments || '{}');
        } catch {}

        // Emit running status
        yield {
          type: 'tool_group',
          data: {
            id: `step-tool-${tc.id}`,
            type: 'tool_group',
            tools: [
              {
                id: tc.id,
                type: 'scan',
                label: `Running ${tc.name.replace(/_/g, ' ')}...`,
                status: 'running',
              },
            ],
          },
        };

        const result = await executeSecurityTool(tc.name, args);

        // Emit completed status
        yield {
          type: 'tool_group',
          data: {
            id: `step-tool-${tc.id}`,
            type: 'tool_group',
            tools: [result.toolCall],
          },
        };

        // Add tool result to conversation history for the model's next iteration
        conversationHistory.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: sanitizeToolResultForLLM(result.rawResult),
        });
      }

      // Loop continues — the model will see the tool results and decide next action
    } else {
      // Model produced text without calling tools — this is the final answer
      if (shouldStreamContent && textContent) {
        finalTextGenerated = true;
      }
      break;
    }
  }

  // --------------------------------------------------------------------------
  // Phase 2: Explicit Final Synthesis (if tools were executed but no final text was produced)
  //
  // This matches the Groq agent engine pattern (engine.ts lines 531-565):
  // After all tools complete, inject a synthesis prompt and call the model
  // WITHOUT tools to force a complete security assessment report.
  // --------------------------------------------------------------------------
  if (executedAnyTools && !finalTextGenerated) {
    conversationHistory.push({
      role: 'user',
      content:
        'All diagnostic reconnaissance and security evaluation tools have completed execution. Based on all the gathered evidence, synthesize the final Precision-First Technical Security Audit Report in markdown format.\n\nCRITICAL PRECISION & EVIDENCE RULES:\n1. Discovery is not a vulnerability! Do NOT put reconnaissance observations (such as /robots.txt, static JS/CSS, sitemaps, server banners, normal API routes, or parameter names like "id") into the Validated Vulnerability Matrix unless there is verified evidence of security impact.\n2. In the Validated Vulnerability Matrix, include ONLY confirmed findings with columns: | ID | Severity | Confidence | Status | Endpoint / Asset | Finding & Impact | Remediation Summary |\n3. Place all informational reconnaissance data into Section 2 (Reconnaissance Observations).\n4. In Section 5 (Evaluated Candidates & Benign Behaviors), provide explicit negative conclusions explaining what was investigated and why it is NOT a vulnerability (e.g. why robots.txt is benign, why normal parameters are not IDOR, why missing headers are hardening recommendations).\n\nStructure:\n# 🛡️ Technical Security Audit Report\n## 🎯 1. Executive Summary & Target Profile\n## 🔍 2. Target Profile & Reconnaissance Observations\n## 🚨 3. Validated Vulnerability Matrix\n## 🔬 4. In-Depth Vulnerability Evidence & Validation\n## 🛡️ 5. Evaluated Candidates & Benign Behaviors\n## 🛠️ 6. Prioritized Remediation Roadmap',
    });

    const synthesisThinkFilter = createThinkFilter();

    // Call the model WITHOUT tools to force text generation (not another tool loop)
    const synthesisStream = streamDeepSeekCall(
      endpoint,
      apiKey,
      activeModel,
      conversationHistory,
      undefined, // No tools — forces text-only response
      8192, // Higher token limit for comprehensive reports
      synthesisThinkFilter,
      true, // Stream all content to the user
      markContentProduced,
    );

    // Consume all events from the synthesis stream
    while (true) {
      const iter = await synthesisStream.next();
      if (iter.done) break;
      yield iter.value;
    }
  }

  yield { type: 'done' };
}
