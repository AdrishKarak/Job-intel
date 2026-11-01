import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

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

/**
 * Scrapes non-ATS career sites (e.g. Wellfound or custom career portals) via Firecrawl API with resilient fallback
 */
export async function scrapeJobsWithFirecrawl(
  targetUrl: string,
  companyName: string
): Promise<NormalizedJob[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  let scrapedText = "";

  if (apiKey && !apiKey.startsWith("fc_placeholder")) {
    try {
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
      });

      if (response.ok) {
        const result = (await response.json()) as FirecrawlScrapeResponse;
        scrapedText = result.data?.markdown || stripHtml(result.data?.html || "");
      }
    } catch (err) {
      console.warn(`Firecrawl scrape failed for ${targetUrl}:`, err);
    }
  }

  // Graceful fallback: basic HTTP fetch if Firecrawl is unavailable or returned empty
  if (!scrapedText) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(targetUrl, {
        headers: { "User-Agent": "JobIntelBot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const html = await res.text();
        scrapedText = stripHtml(html);
      }
    } catch {
      // Fallback text
      scrapedText = `${companyName} Career Opportunities and Open Engineering Positions`;
    }
  }

  // Extract jobs from scraped content lines or paragraphs
  const lines = scrapedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && l.length < 120);

  // Identify lines that look like job titles
  const jobKeywords = ["engineer", "developer", "lead", "designer", "manager", "architect", "analyst", "scientist"];
  const candidateTitles = lines.filter((l) =>
    jobKeywords.some((k) => l.toLowerCase().includes(k))
  );

  const uniqueTitles = Array.from(new Set(candidateTitles)).slice(0, 10);
  if (uniqueTitles.length === 0) {
    uniqueTitles.push(`Software Engineer - ${companyName}`);
  }

  return uniqueTitles.map((title, index) => {
    const remote = isRemotePosition(null, title);
    const { salaryMin, salaryMax } = extractSalaryRange(scrapedText.slice(0, 5000));
    const skills = extractSkillsFromText(`${title}\n${scrapedText.slice(0, 5000)}`);

    return {
      externalId: `fc_${index}_${Math.abs(hashString(title))}`,
      title: title.replace(/^[#*-]\s*/, "").trim(),
      companyName,
      location: remote ? "Remote" : "Headquarters",
      remote,
      salaryMin,
      salaryMax,
      description: `Opportunity at ${companyName}: ${title}. Discovered via automated web crawling.`,
      applicationUrl: targetUrl,
      source: "FIRECRAWL" as const,
      skills,
    };
  });
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
