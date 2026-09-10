import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'Backend/.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
];
envPaths.forEach((p) => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
});

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  remainingUses: number;
  maxUses: number;
  reason?: string;
}

class CheaperInferenceManager {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.cheaperinference.com/v1';
  private defaultModel: string = 'deepseek-v4-flash-0731';
  private maxUsesPerUser: number = 2;
  private userUsageMap: Map<string, number> = new Map();
  private client: Groq | null = null;

  constructor() {
    this.reloadConfig();
  }

  public reloadConfig(): void {
    let rawKey = (process.env.CHEAPER_INFERENCE_API_KEY || '').trim();
    let rawUrl = (process.env.CHEAPER_INFERENCE_BASE_URL || 'https://api.cheaperinference.com/v1').trim();

    // Auto-recovery if API key was placed into CHEAPER_INFERENCE_BASE_URL
    if (!rawKey && (rawUrl.startsWith('ci_live_') || rawUrl.startsWith('ci_test_') || rawUrl.startsWith('ci_'))) {
      rawKey = rawUrl;
      rawUrl = 'https://api.cheaperinference.com/v1';
    }

    this.apiKey = rawKey;
    this.baseUrl = (rawUrl.replace(/\/+$/, '') || 'https://api.cheaperinference.com/v1');
    
    let rawModel = (process.env.CHEAPER_INFERENCE_MODEL || 'deepseek-v4-flash-0731').trim();
    if (rawModel === 'v4-flash-0731' || rawModel === 'v4-flash') {
      rawModel = 'deepseek-v4-flash-0731';
    }
    this.defaultModel = rawModel || 'deepseek-v4-flash-0731';
    
    const parsedMax = parseInt(process.env.CHEAPER_INFERENCE_MAX_USES_PER_USER || '2', 10);
    this.maxUsesPerUser = isNaN(parsedMax) || parsedMax <= 0 ? 2 : parsedMax;

    if (this.apiKey) {
      this.client = new Groq({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
      const masked = `${this.apiKey.slice(0, 6)}...${this.apiKey.slice(-4)}`;
      console.log(`🧠 [CheaperInferenceManager] Configured DeepSeek (${this.defaultModel}) via ${this.baseUrl} [Key: ${masked} | Max Uses: ${this.maxUsesPerUser}/user]`);
    } else {
      this.client = null;
      console.log(`ℹ️ [CheaperInferenceManager] No CHEAPER_INFERENCE_API_KEY configured. Fallback to Groq pool active.`);
    }
  }

  public resolveModelName(requestedModel?: string): string {
    if (!requestedModel) return this.defaultModel;
    const clean = requestedModel.trim().toLowerCase();
    if (clean.includes('deepseek-v4-flash-0731') || clean === 'v4-flash-0731' || clean === 'v4-flash') {
      return 'deepseek-v4-flash-0731';
    }
    if (clean.includes('deepseek-v4-pro')) {
      return 'deepseek-v4-pro';
    }
    if (clean.includes('deepseek')) {
      return 'deepseek-v4-flash-0731';
    }
    return this.defaultModel || 'deepseek-v4-flash-0731';
  }

  public hasKey(): boolean {
    return !!this.apiKey;
  }

  public getModelName(): string {
    return this.defaultModel;
  }

  public getMaxUses(): number {
    return this.maxUsesPerUser;
  }

  /**
   * Checks if the user / IP is within their 2-use limit for DeepSeek v4-flash-0731
   */
  public checkQuota(userIdentifier: string): QuotaCheckResult {
    const cleanId = (userIdentifier || 'anonymous').trim().toLowerCase();
    const currentUsage = this.userUsageMap.get(cleanId) || 0;
    const remaining = Math.max(0, this.maxUsesPerUser - currentUsage);

    if (currentUsage >= this.maxUsesPerUser) {
      return {
        allowed: false,
        currentUsage,
        remainingUses: 0,
        maxUses: this.maxUsesPerUser,
        reason: `Quota limit reached (${currentUsage}/${this.maxUsesPerUser} free uses used for DeepSeek v4-flash-0731).`,
      };
    }

    return {
      allowed: true,
      currentUsage,
      remainingUses: remaining,
      maxUses: this.maxUsesPerUser,
    };
  }

  /**
   * Consumes 1 use from the user's DeepSeek v4-flash-0731 quota
   */
  public consumeQuota(userIdentifier: string): number {
    const cleanId = (userIdentifier || 'anonymous').trim().toLowerCase();
    const currentUsage = this.userUsageMap.get(cleanId) || 0;
    const newUsage = currentUsage + 1;
    this.userUsageMap.set(cleanId, newUsage);
    return newUsage;
  }

  /**
   * Executes streaming chat completion with CheaperInference API via direct SSE stream
   */
  public async *executeStream(params: {
    messages: any[];
    tools?: any[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): AsyncGenerator<any> {
    if (!this.apiKey) {
      throw new Error('CheaperInference API key is not configured.');
    }

    const modelToUse = this.resolveModelName(params.model);
    const endpoint = `${this.baseUrl}/chat/completions`;

    const reqPayload: any = {
      model: modelToUse,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.max_tokens ?? 3072,
      stream: true,
    };

    if (params.tools && params.tools.length > 0) {
      reqPayload.tools = params.tools;
      reqPayload.tool_choice = 'auto';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqPayload),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`CheaperInference API error (${response.status}): ${errBody || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('CheaperInference response body is empty.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === '[DONE]') return;
              try {
                yield JSON.parse(dataStr);
              } catch {}
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') return;

          try {
            const parsed = JSON.parse(dataStr);
            yield parsed;
          } catch {
            // Ignore JSON parse errors on partial frames
          }
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {}
    }
  }
}

export const cheaperInferenceManager = new CheaperInferenceManager();
