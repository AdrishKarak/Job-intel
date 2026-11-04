import type { NormalizedJob } from "@repo/shared-types";
import {
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";
import { crawlTargetPage, FirecrawlScrapeResponse, firecrawlPool } from "./crawlerPool";

export type { FirecrawlScrapeResponse };
export { firecrawlPool };

/**
 * Scrapes non-ATS career sites (e.g. Wellfound or custom career portals)
 * using a multi-engine crawler pool:
 * Firecrawl (Key 1 -> Key 2) -> Scrape.do -> Direct Fetch -> Resilient Heuristic
 */
export async function scrapeJobsWithFirecrawl(
  targetUrl: string,
  companyName: string
): Promise<NormalizedJob[]> {
  const { text: scrapedText } = await crawlTargetPage(targetUrl, companyName);

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

  // Detect candidate locations from scraped content or URL
  const lowerText = scrapedText.toLowerCase();
  const lowerUrl = targetUrl.toLowerCase();
  let detectedLocation = "Bengaluru, India";

  if (/bengaluru|bangalore/i.test(lowerText) || /bengaluru|bangalore/i.test(lowerUrl)) {
    detectedLocation = "Bengaluru, India";
  } else if (/hyderabad/i.test(lowerText) || /hyderabad/i.test(lowerUrl)) {
    detectedLocation = "Hyderabad, India";
  } else if (/pune/i.test(lowerText) || /pune/i.test(lowerUrl)) {
    detectedLocation = "Pune, India";
  } else if (/chennai/i.test(lowerText) || /chennai/i.test(lowerUrl)) {
    detectedLocation = "Chennai, India";
  } else if (/gurugram|gurgaon/i.test(lowerText) || /gurugram|gurgaon/i.test(lowerUrl)) {
    detectedLocation = "Gurugram, India";
  } else if (/noida/i.test(lowerText) || /noida/i.test(lowerUrl)) {
    detectedLocation = "Noida, India";
  } else if (/mumbai/i.test(lowerText) || /mumbai/i.test(lowerUrl)) {
    detectedLocation = "Mumbai, India";
  } else if (/kolkata/i.test(lowerText) || /kolkata/i.test(lowerUrl)) {
    detectedLocation = "Kolkata, India";
  } else if (/delhi/i.test(lowerText) || /delhi/i.test(lowerUrl)) {
    detectedLocation = "Delhi NCR, India";
  } else if (/india|\.in\/|\.in$|\/in-en\//i.test(lowerText) || /india|\.in\/|\.in$|\/in-en\//i.test(lowerUrl)) {
    detectedLocation = "India";
  }

  return uniqueTitles.map((title, index) => {
    const remote = isRemotePosition(null, title);
    const { salaryMin, salaryMax } = extractSalaryRange(scrapedText.slice(0, 5000));
    const skills = extractSkillsFromText(`${title}\n${scrapedText.slice(0, 5000)}`);
    const jobLoc = remote ? "Remote" : detectedLocation;

    return {
      externalId: `fc_${index}_${Math.abs(hashString(title))}`,
      title: title.replace(/^[#*-]\s*/, "").trim(),
      companyName,
      location: jobLoc,
      remote,
      salaryMin,
      salaryMax,
      description: `Opportunity at ${companyName}: ${title}. Discovered via automated web crawling for ${jobLoc}.`,
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
