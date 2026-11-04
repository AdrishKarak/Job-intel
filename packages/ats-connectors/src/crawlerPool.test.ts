import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  firecrawlPool,
  scrapeViaFirecrawl,
  scrapeViaScrapedo,
  crawlTargetPage,
} from "./crawlerPool";

describe("CrawlerPool - Multi-Engine & Multi-Key Failover", () => {
  beforeEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_KEY2;
    delete process.env.FIRECRAWL_API_KEYS;
    delete process.env.SCRAPEDO_API_KEY;
    firecrawlPool.resetCooldowns();
    vi.restoreAllMocks();
  });

  it("extracts multiple Firecrawl keys from env vars", () => {
    process.env.FIRECRAWL_API_KEY = "fc-key-1";
    process.env.FIRECRAWL_API_KEY2 = "fc-key-2";
    process.env.FIRECRAWL_API_KEYS = "fc-key-3, fc-key-4";

    const keys = firecrawlPool.getFirecrawlKeys();
    expect(keys).toEqual(["fc-key-1", "fc-key-2", "fc-key-3", "fc-key-4"]);
  });

  it("rotates and marks exhausted Firecrawl key on 429/402", async () => {
    process.env.FIRECRAWL_API_KEY = "fc-exhausted";
    process.env.FIRECRAWL_API_KEY2 = "fc-backup";

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string, opts: any) => {
      callCount++;
      const auth = opts?.headers?.Authorization;
      if (auth?.includes("fc-exhausted")) {
        return { status: 402, ok: false };
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({
          success: true,
          data: { markdown: "Software Engineer opening at Startup" },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeViaFirecrawl("https://example.com/careers");
    expect(result).toContain("Software Engineer");
    expect(callCount).toBe(2);
  });

  it("falls back to Scrape.do when Firecrawl is unavailable", async () => {
    process.env.SCRAPEDO_API_KEY = "scrapedo-test-key";

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("api.scrape.do")) {
        return {
          status: 200,
          ok: true,
          text: async () => "<html><body><h1>Senior Platform Engineer</h1><p>Bengaluru</p></body></html>",
        };
      }
      return { status: 500, ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await crawlTargetPage("https://example.com/jobs", "TestCo");
    expect(result.engineUsed).toBe("SCRAPEDO");
    expect(result.text).toContain("Senior Platform Engineer");
  });
});
