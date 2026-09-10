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
  private defaultModel: string = 'v4-flash-0731';
  private maxUsesPerUser: number = 2;
  private userUsageMap: Map<string, number> = new Map();
  private client: Groq | null = null;

  constructor() {
    this.reloadConfig();
  }

  public reloadConfig(): void {
    this.apiKey = (process.env.CHEAPER_INFERENCE_API_KEY || '').trim();
    
    // Normalize Base URL
    const rawUrl = (process.env.CHEAPER_INFERENCE_BASE_URL || 'https://api.cheaperinference.com/v1').trim();
    this.baseUrl = rawUrl.replace(/\/+$/, '');
    
    this.defaultModel = (process.env.CHEAPER_INFERENCE_MODEL || 'v4-flash-0731').trim();
    
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

  public hasKey(): boolean {
    return !!this.apiKey && !!this.client;
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
   * Executes streaming chat completion with CheaperInference API
   */
  public async executeStream(params: {
    messages: any[];
    tools?: any[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<any> {
    if (!this.client || !this.apiKey) {
      throw new Error('CheaperInference API key is not configured.');
    }

    const modelToUse = params.model || this.defaultModel;
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

    return await this.client.chat.completions.create(reqPayload);
  }
}

export const cheaperInferenceManager = new CheaperInferenceManager();
