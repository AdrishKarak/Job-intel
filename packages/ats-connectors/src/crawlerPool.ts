import { stripHtml } from "./normalize";

export interface FirecrawlScrapeResponse {
  success?: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
}

class CrawlerKeyPool {
  private keys: string[] = [];
  private index = 0;
  private cooldowns = new Map<string, number>();

  public getFirecrawlKeys(): string[] {
    const vars = [
      "FIRECRAWL_API_KEY",
      "FIRECRAWL_API_KEY2",
      "FIRECRAWL_API_KEYS",
      "FIRECRAWL_API_KEY_1",
      "FIRECRAWL_API_KEY_2",
    ];

    const collected: string[] = [];
    for (const v of vars) {
      const val = process.env[v];
      if (!val) continue;
      const parts = val.split(",").map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!p.startsWith("fc_placeholder") && !collected.includes(p)) {
          collected.push(p);
        }
      }
    }
    this.keys = collected;
    return this.keys;
  }

  public getAvailableKey(): string | null {
    const keys = this.getFirecrawlKeys();
    const now = Date.now();
    for (const [k, exp] of this.cooldowns.entries()) {
      if (now >= exp) this.cooldowns.delete(k);
    }
    const viable = keys.filter((k) => !this.cooldowns.has(k));
    if (viable.length === 0) return null;
    const key = viable[this.index % viable.length];
    this.index = (this.index + 1) % viable.length;
    return key;
  }

  public markExhausted(key: string, cooldownMs = 60_000 * 10) {
    this.cooldowns.set(key, Date.now() + cooldownMs);
  }

  public resetCooldowns() {
    this.cooldowns.clear();
  }
}

export const firecrawlPool = new CrawlerKeyPool();

/**
 * Attempts scraping via Firecrawl with multi-key failover
 */
export async function scrapeViaFirecrawl(targetUrl: string): Promise<string | null> {
  const allKeys = firecrawlPool.getFirecrawlKeys();
  if (allKeys.length === 0) return null;

  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const apiKey = firecrawlPool.getAvailableKey();
    if (!apiKey) break;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: targetUrl,
          formats: ["markdown", "html"],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Handle exhaustion status codes
      if (response.status === 429 || response.status === 402) {
        console.warn(`Firecrawl key exhausted (HTTP ${response.status}), switching to next crawler key...`);
        // 402 = Payment/credits exhausted (longer cooldown), 429 = Rate limit
        firecrawlPool.markExhausted(apiKey, response.status === 402 ? 60_000 * 60 : 60_000 * 5);
        continue;
      }

      if (response.ok) {
        const result = (await response.json()) as FirecrawlScrapeResponse;
        const text = result.data?.markdown || stripHtml(result.data?.html || "");
        if (text && text.trim().length > 20) {
          return text;
        }
      }
    } catch (err: any) {
      console.warn(`Firecrawl attempt failed for key: ${err.message || err}`);
      firecrawlPool.markExhausted(apiKey, 60_000);
    }
  }

  return null;
}

/**
 * Attempts scraping via Scrape.do proxy engine
 */
export async function scrapeViaScrapedo(targetUrl: string): Promise<string | null> {
  const apiKey =
    process.env.SCRAPEDO_API_KEY ||
    process.env.SCRAPE_DO_API_KEY ||
    process.env.SCRAPEDO_KEY;

  if (!apiKey || apiKey.startsWith("placeholder")) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const scrapedoUrl = `https://api.scrape.do/?token=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(scrapedoUrl, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const text = stripHtml(html);
      if (text && text.trim().length > 20) {
        return text;
      }
    } else {
      console.warn(`Scrape.do returned status ${response.status} for ${targetUrl}`);
    }
  } catch (err: any) {
    console.warn(`Scrape.do fetch failed for ${targetUrl}:`, err.message || err);
  }

  return null;
}

/**
 * Graceful direct HTTP fallback
 */
export async function scrapeViaDirectFetch(targetUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "JobIntelBot/1.0 (Mozilla/5.0 Compatible)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      return stripHtml(html);
    }
  } catch {
    // Suppress network errors on direct fetch fallback
  }

  return null;
}

/**
 * Master multi-engine web crawler:
 * Firecrawl (Key 1 -> Key 2) -> Scrape.do -> Direct Fetch -> Resilient Fallback
 */
export async function crawlTargetPage(
  targetUrl: string,
  companyName: string
): Promise<{ text: string; engineUsed: "FIRECRAWL" | "SCRAPEDO" | "DIRECT_FETCH" | "FALLBACK" }> {
  // 1. Try Firecrawl multi-key pool
  const firecrawlResult = await scrapeViaFirecrawl(targetUrl);
  if (firecrawlResult) {
    return { text: firecrawlResult, engineUsed: "FIRECRAWL" };
  }

  // 2. Try Scrape.do
  const scrapedoResult = await scrapeViaScrapedo(targetUrl);
  if (scrapedoResult) {
    return { text: scrapedoResult, engineUsed: "SCRAPEDO" };
  }

  // 3. Try direct HTTP fetch
  const directResult = await scrapeViaDirectFetch(targetUrl);
  if (directResult) {
    return { text: directResult, engineUsed: "DIRECT_FETCH" };
  }

  // 4. Fallback text so pipeline never crashes
  return {
    text: `${companyName} Career Opportunities and Open Engineering Positions`,
    engineUsed: "FALLBACK",
  };
}
