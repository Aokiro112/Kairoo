import Groq from 'groq-sdk';
import dotenv from 'dotenv';

import path from 'path';

// Load .env from Backend directory or root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface KeyStatus {
  index: number;
  maskedKey: string;
  isAvailable: boolean;
  rateLimitedUntil: number | null;
  totalRequests: number;
  totalFailovers: number;
}

class GroqKeyManager {
  private keys: string[] = [];
  private clients: Groq[] = [];
  private rateLimitedUntil: number[] = [];
  private currentIndex: number = 0;
  private totalRequestsPerKey: number[] = [];
  private totalFailoversPerKey: number[] = [];

  constructor() {
    this.reloadKeys();
  }

  /**
   * Loads all available Groq API keys from GROQ_API_KEYS (comma-separated list) or GROQ_API_KEY.
   */
  public reloadKeys(): void {
    const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
    
    // Parse comma-separated, newline-separated, or JSON array format
    let parsedKeys: string[] = [];

    if (rawKeys.trim().startsWith('[') && rawKeys.trim().endsWith(']')) {
      try {
        parsedKeys = JSON.parse(rawKeys);
      } catch {
        parsedKeys = [];
      }
    }

    if (parsedKeys.length === 0) {
      parsedKeys = rawKeys
        .split(/[,\n]/)
        .map((k) => k.replace(/["']/g, '').trim())
        .filter((k) => k.length > 0 && (k.startsWith('gsk_') || k.length > 10));
    }

    // Deduplicate keys
    this.keys = Array.from(new Set(parsedKeys));
    this.clients = this.keys.map((apiKey) => new Groq({ apiKey }));
    this.rateLimitedUntil = new Array(this.keys.length).fill(0);
    this.totalRequestsPerKey = new Array(this.keys.length).fill(0);
    this.totalFailoversPerKey = new Array(this.keys.length).fill(0);
    this.currentIndex = 0;

    if (this.keys.length > 0) {
      console.log(
        `🔑 [GroqKeyManager] Loaded ${this.keys.length} Groq API key(s) into active failover pool.`
      );
      this.keys.forEach((k, idx) => {
        const masked = `${k.slice(0, 7)}...${k.slice(-4)}`;
        console.log(`   ├─ Key #${idx + 1}: ${masked}`);
      });
    } else {
      console.warn('⚠️ [GroqKeyManager] No valid Groq API keys found in GROQ_API_KEYS or GROQ_API_KEY.');
    }
  }

  public getKeyCount(): number {
    return this.keys.length;
  }

  public hasKeys(): boolean {
    return this.keys.length > 0;
  }

  /**
   * Helper to check if an error is a rate limit or quota exhaustion (429 / TPM / RPM).
   */
  public isRateLimitError(err: any): boolean {
    if (!err) return false;
    const status = err.status || err.statusCode || err.response?.status;
    if (status === 429) return true;

    const message = (err.message || '').toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('quota') ||
      message.includes('tokens per minute') ||
      message.includes('requests per minute') ||
      message.includes('tpm') ||
      message.includes('rpm') ||
      message.includes('resource_exhausted')
    );
  }

  /**
   * Finds the next healthy key index that is not currently in rate-limit cooldown.
   */
  private getNextAvailableIndex(): number {
    const now = Date.now();
    const count = this.keys.length;
    if (count === 0) return -1;

    // First try from current index onwards
    for (let i = 0; i < count; i++) {
      const idx = (this.currentIndex + i) % count;
      if (this.rateLimitedUntil[idx] <= now) {
        this.currentIndex = idx;
        return idx;
      }
    }

    // If all are rate limited, find the one with the earliest expiration
    let earliestIdx = 0;
    let earliestTime = this.rateLimitedUntil[0];
    for (let i = 1; i < count; i++) {
      if (this.rateLimitedUntil[i] < earliestTime) {
        earliestTime = this.rateLimitedUntil[i];
        earliestIdx = i;
      }
    }
    this.currentIndex = earliestIdx;
    return earliestIdx;
  }

  /**
   * Executes any Groq SDK call with automatic multi-key rotation and zero context loss.
   * If a key hits 429 / rate limit, it automatically switches to the next available key and retries.
   */
  public async executeWithRotation<T>(
    operationName: string,
    action: (groq: Groq, keyInfo: { index: number; maskedKey: string }) => Promise<T>
  ): Promise<T> {
    if (this.keys.length === 0) {
      throw new Error('No Groq API keys configured in environment.');
    }

    const attempts = Math.max(this.keys.length * 2, 3);
    let lastError: any = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const keyIdx = this.getNextAvailableIndex();
      if (keyIdx === -1) {
        throw new Error('No available Groq API keys found in pool.');
      }

      const client = this.clients[keyIdx];
      const key = this.keys[keyIdx];
      const maskedKey = `${key.slice(0, 7)}...${key.slice(-4)}`;

      try {
        this.totalRequestsPerKey[keyIdx]++;
        const result = await action(client, { index: keyIdx, maskedKey });
        return result;
      } catch (err: any) {
        lastError = err;
        const isRateLimit = this.isRateLimitError(err);

        if (isRateLimit || err.status === 503 || err.status === 500) {
          // Set cooldown for 60 seconds (or standard Groq RPM window)
          const cooldownMs = isRateLimit ? 60000 : 15000;
          this.rateLimitedUntil[keyIdx] = Date.now() + cooldownMs;
          this.totalFailoversPerKey[keyIdx]++;

          const nextIdx = (keyIdx + 1) % this.keys.length;
          const nextMasked = this.keys[nextIdx] ? `${this.keys[nextIdx].slice(0, 7)}...${this.keys[nextIdx].slice(-4)}` : 'none';

          console.warn(
            `⚠️ [GroqKeyManager] ${operationName}: Key #${keyIdx + 1} (${maskedKey}) hit ${
              isRateLimit ? 'Rate Limit (429)' : `Error (${err.status || err.message})`
            }. Auto-switching to Key #${nextIdx + 1} (${nextMasked}). Cooldown: ${cooldownMs / 1000}s.`
          );

          // Rotate to next key immediately
          this.currentIndex = nextIdx;
          
          // Small pause before retrying with next key
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }

        // For non-rate-limit validation / unrecoverable errors, rethrow
        throw err;
      }
    }

    throw lastError || new Error(`Failed all ${attempts} retry attempts across Groq API key pool.`);
  }

  /**
   * Returns current pool diagnostic status.
   */
  public getPoolStatus(): KeyStatus[] {
    const now = Date.now();
    return this.keys.map((k, idx) => ({
      index: idx + 1,
      maskedKey: `${k.slice(0, 7)}...${k.slice(-4)}`,
      isAvailable: this.rateLimitedUntil[idx] <= now,
      rateLimitedUntil: this.rateLimitedUntil[idx] > now ? this.rateLimitedUntil[idx] : null,
      totalRequests: this.totalRequestsPerKey[idx] || 0,
      totalFailovers: this.totalFailoversPerKey[idx] || 0,
    }));
  }
}

export const groqKeyManager = new GroqKeyManager();
