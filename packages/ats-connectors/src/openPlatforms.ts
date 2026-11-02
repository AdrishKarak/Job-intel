import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchAshbyJobs } from "./ashby";
import { fetchWorkdayJobs } from "./workday";

/**
 * Curated open platforms and public ATS boards outside the default company catalog.
 * These are queried dynamically based on user search roles & preferences.
 */
export const OPEN_ATS_BOARDS = {
  // Public Workday platforms (Global + India tech centers)
  workday: [
    { tenant: "nvidia", site: "NVIDIAExternalCareerSite", cluster: "wd5", companyName: "NVIDIA" },
    { tenant: "adobe", site: "external_experienced", cluster: "wd5", companyName: "Adobe" },
    { tenant: "salesforce", site: "External_Career_Site", cluster: "wd12", companyName: "Salesforce" },
    { tenant: "autodesk", site: "Ext", cluster: "wd1", companyName: "Autodesk" },
  ],
  // Public Greenhouse job boards from India tech innovators and top global tech companies
  greenhouse: [
    { token: "razorpaysoftwareprivatelimited", companyName: "Razorpay" },
    { token: "inmobi", companyName: "InMobi" },
    { token: "groww", companyName: "Groww" },
    { token: "rubrik", companyName: "Rubrik" },
    { token: "hackerrank", companyName: "HackerRank" },
    { token: "mongodb", companyName: "MongoDB" },
    { token: "thoughtworks", companyName: "Thoughtworks" },
    { token: "gitlab", companyName: "GitLab" },
    { token: "stripe", companyName: "Stripe" },
    { token: "figma", companyName: "Figma" },
    { token: "discord", companyName: "Discord" },
    { token: "cloudflare", companyName: "Cloudflare" },
    { token: "vercel", companyName: "Vercel" },
    { token: "datadog", companyName: "Datadog" },
    { token: "pinterest", companyName: "Pinterest" },
    { token: "airbnb", companyName: "Airbnb" },
    { token: "reddit", companyName: "Reddit" },
    { token: "elastic", companyName: "Elastic" },
  ],
  // Public Lever boards
  lever: [
    { slug: "meesho", companyName: "Meesho" },
    { slug: "cred", companyName: "CRED" },
    { slug: "postman", companyName: "Postman" },
    { slug: "chargebee", companyName: "Chargebee" },
    { slug: "spotify", companyName: "Spotify" },
    { slug: "palantir", companyName: "Palantir Technologies" },
  ],
  // Public Ashby boards
  ashby: [
    { board: "linear", companyName: "Linear" },
    { board: "ramp", companyName: "Ramp" },
    { board: "retool", companyName: "Retool" },
    { board: "notion", companyName: "Notion" },
  ],
};

/**
 * Fetches open jobs from Remotive API (public open remote tech jobs from hundreds of companies)
 */
export async function fetchRemotiveOpenJobs(
  searchQuery?: string,
  limit: number = 25
): Promise<NormalizedJob[]> {
  try {
    const queryParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
    const url = `https://remotive.com/api/remote-jobs?category=software-dev&limit=${limit}${queryParam}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "JobIntelBot/1.0",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];

    return jobs.map((j: any) => {
      const { salaryMin, salaryMax } = extractSalaryRange(j.salary || "");
      const cleanDesc = stripHtml(j.description || "");
      const extractedSkills = Array.isArray(j.tags) && j.tags.length > 0
        ? Array.from(new Set([...j.tags, ...extractSkillsFromText(cleanDesc)]))
        : extractSkillsFromText(cleanDesc);

      return {
        externalId: `remotive_${j.id}`,
        title: (j.title || "Software Engineer").trim(),
        companyName: (j.company_name || "Tech Startup").trim(),
        location: j.candidate_required_location || "Remote / Worldwide",
        remote: true,
        salaryMin,
        salaryMax,
        description: cleanDesc.slice(0, 4000),
        applicationUrl: j.url || "https://remotive.com",
        source: "FIRECRAWL" as const,
        skills: extractedSkills.slice(0, 15),
      };
    });
  } catch (err: any) {
    console.warn("fetchRemotiveOpenJobs failed:", err.message);
    return [];
  }
}

/**
 * Fetches open jobs from Arbeitnow public job board API
 */
export async function fetchArbeitnowOpenJobs(
  limit: number = 25
): Promise<NormalizedJob[]> {
  try {
    const url = "https://www.arbeitnow.com/api/job-board-api";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "JobIntelBot/1.0",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const rawList = Array.isArray(data.data) ? data.data.slice(0, limit) : [];

    return rawList.map((j: any) => {
      const cleanDesc = stripHtml(j.description || "");
      const { salaryMin, salaryMax } = extractSalaryRange(cleanDesc);
      const isRemote = j.remote || isRemotePosition(j.location, j.title);
      const tags = Array.isArray(j.tags) ? j.tags : [];
      const extractedSkills = Array.from(
        new Set([...tags, ...extractSkillsFromText(cleanDesc), ...extractSkillsFromText(j.title)])
      );

      return {
        externalId: `arbeitnow_${j.slug || Math.random().toString(36).substring(7)}`,
        title: (j.title || "Software Engineer").trim(),
        companyName: (j.company_name || "Technology Company").trim(),
        location: j.location || (isRemote ? "Remote" : null),
        remote: isRemote,
        salaryMin,
        salaryMax,
        description: cleanDesc.slice(0, 4000),
        applicationUrl: j.url || "https://www.arbeitnow.com",
        source: "FIRECRAWL" as const,
        skills: extractedSkills.slice(0, 15),
      };
    });
  } catch (err: any) {
    console.warn("fetchArbeitnowOpenJobs failed:", err.message);
    return [];
  }
}

/**
 * Unified Discovery across Open Platforms (Remotive, Arbeitnow, Lever, Greenhouse, Workday, Ashby)
 * which brings in positions matching candidate roles and regions (e.g. India and Remote).
 */
export async function fetchOpenPlatformJobs(options?: {
  roles?: string[];
  locations?: string[];
  limitPerSource?: number;
}): Promise<NormalizedJob[]> {
  const limit = options?.limitPerSource ?? 25;
  const primaryRole = options?.roles?.[0] || "Software Engineer";
  const allResults: NormalizedJob[] = [];

  const wantsIndia = (options?.locations || []).some((l) =>
    /india|bengaluru|bangalore|hyderabad|pune|chennai|gurugram|delhi|mumbai/i.test(l)
  );

  const tasks: Promise<NormalizedJob[]>[] = [
    fetchRemotiveOpenJobs(primaryRole, limit).catch(() => []),
    fetchArbeitnowOpenJobs(limit).catch(() => []),
  ];

  // If candidate is open to or seeking India positions, poll targeted Indian tech boards
  if (wantsIndia || (options?.locations || []).length === 0) {
    tasks.push(
      fetchLeverJobs("meesho", "Meesho").catch(() => []),
      fetchLeverJobs("cred", "CRED").catch(() => []),
      fetchWorkdayJobs("nvidia:NVIDIAExternalCareerSite:wd5", "NVIDIA", "Software Engineer India").catch(() => [])
    );
  }

  // Settle all parallel fetches gracefully without failing the entire batch
  const settled = await Promise.allSettled(tasks);
  for (const outcome of settled) {
    if (outcome.status === "fulfilled" && Array.isArray(outcome.value)) {
      allResults.push(...outcome.value);
    }
  }

  return allResults;
}
