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
 * Executes a streaming DeepSeek chat completion loop with tool calling and reasoning support.
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

  const thinkFilter = createThinkFilter();
  let loopCount = 0;
  const maxLoops = 2;
  let hasProducedUsableContent = false;
  let executedAnyTools = false;

  const markContentProduced = () => {
    if (!hasProducedUsableContent) {
      hasProducedUsableContent = true;
      if (options.onFirstContentProduced) {
        options.onFirstContentProduced();
      }
    }
  };

  while (loopCount < maxLoops) {
    loopCount++;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model: activeModel,
        messages: conversationHistory,
        tools: deepseekTools,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 4096,
        stream: true,
      }),
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
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) continue; // comments / heartbeats
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

            // 2. Tool calls delta
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

              if (!executedAnyTools && Object.keys(toolCallsMap).length === 0) {
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

    const toolCallsArray = Object.values(toolCallsMap);

    if (toolCallsArray.length > 0) {
      executedAnyTools = true;
      markContentProduced();

      // Record assistant tool intent
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

      const completedToolCalls: ToolCall[] = [];

      for (const tc of toolCallsArray) {
        let args: any = {};
        try {
          args = JSON.parse(tc.arguments || '{}');
        } catch {}

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
        completedToolCalls.push(result.toolCall);

        yield {
          type: 'tool_group',
          data: {
            id: `step-tool-${tc.id}`,
            type: 'tool_group',
            tools: [result.toolCall],
          },
        };

        conversationHistory.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: sanitizeToolResultForLLM(result.rawResult),
        });
      }

      // Loop continues to generate the final synthesized assessment
    } else {
      // No tool calls produced: loop finished
      break;
    }
  }

  yield { type: 'done' };
}
