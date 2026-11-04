export interface KeyPoolOptions {
  envVars: string[];
  cooldownMs?: number;
  placeholderPrefix?: string;
}

/**
 * Resilient multi-key manager with automatic failover, cooldown tracking,
 * and round-robin load distribution across multiple API keys.
 */
export class ApiKeyPool {
  private keys: string[] = [];
  private index = 0;
  private cooldowns = new Map<string, number>();

  constructor(private options: KeyPoolOptions) {
    this.refreshKeys();
  }

  /**
   * Refreshes active keys from environment variables (including comma-separated lists)
   */
  public refreshKeys(): string[] {
    const collected: string[] = [];
    for (const varName of this.options.envVars) {
      const val = process.env[varName];
      if (!val) continue;

      const parts = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const p of parts) {
        if (this.options.placeholderPrefix && p.startsWith(this.options.placeholderPrefix)) {
          continue;
        }
        if (!collected.includes(p)) {
          collected.push(p);
        }
      }
    }
    this.keys = collected;
    return this.keys;
  }

  /**
   * Returns healthy keys that are not currently in cooldown
   */
  public getAvailableKeys(): string[] {
    this.refreshKeys();
    const now = Date.now();
    for (const [key, expires] of this.cooldowns.entries()) {
      if (now >= expires) {
        this.cooldowns.delete(key);
      }
    }
    return this.keys.filter((k) => !this.cooldowns.has(k));
  }

  /**
   * Gets the next available key via round-robin, or falls back to the oldest key if all are cooling down
   */
  public getNextKey(): string | null {
    const available = this.getAvailableKeys();
    if (available.length === 0) {
      if (this.keys.length > 0) {
        // Fallback to least recently exhausted key if all are temporarily flagged
        let oldestKey = this.keys[0];
        let oldestExpiry = Infinity;
        for (const [k, exp] of this.cooldowns.entries()) {
          if (exp < oldestExpiry) {
            oldestExpiry = exp;
            oldestKey = k;
          }
        }
        return oldestKey;
      }
      return null;
    }

    const key = available[this.index % available.length];
    this.index = (this.index + 1) % available.length;
    return key;
  }

  /**
   * Temporarily marks a key as exhausted with a cooldown timer
   */
  public markExhausted(key: string, customCooldownMs?: number): void {
    const duration = customCooldownMs ?? (this.options.cooldownMs || 60_000 * 5);
    this.cooldowns.set(key, Date.now() + duration);
  }

  /**
   * Clears cooldown status for all keys
   */
  public resetCooldowns(): void {
    this.cooldowns.clear();
  }

  public getAllKeys(): string[] {
    this.refreshKeys();
    return [...this.keys];
  }

  public get size(): number {
    this.refreshKeys();
    return this.keys.length;
  }
}

/**
 * Singleton Gemini Key Pool: supports GEMINI_API_KEY, GEMINI_API_KEY2, GEMINI_API_KEYS, etc.
 */
export const geminiKeyPool = new ApiKeyPool({
  envVars: ["GEMINI_API_KEY", "GEMINI_API_KEY2", "GEMINI_API_KEYS", "GEMINI_API_KEY_1", "GEMINI_API_KEY_2"],
  placeholderPrefix: "AQ.placeholder",
  cooldownMs: 60_000 * 5, // 5 min cooldown on quota exhaustion
});

/**
 * Singleton Groq Key Pool: supports GROQ_API_KEY, GROQ_API_KEY2, GROQ_API_KEYS, etc.
 */
export const groqKeyPool = new ApiKeyPool({
  envVars: ["GROQ_API_KEY", "GROQ_API_KEY2", "GROQ_API_KEYS", "GROQ_API_KEY_1", "GROQ_API_KEY_2"],
  placeholderPrefix: "gsk_placeholder",
  cooldownMs: 60_000 * 2, // 2 min cooldown on rate limits
});
