import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

export interface WorkableJobRaw {
  id?: number | string;
  shortcode: string;
  title: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  remote?: boolean;
  telecommuting?: boolean;
  url?: string;
  shortlink?: string;
  description?: string;
}

export interface WorkableResponse {
  results?: WorkableJobRaw[];
  jobs?: WorkableJobRaw[];
}

export async function fetchWorkableJobs(
  subdomain: string,
  companyName: string
): Promise<NormalizedJob[]> {
  const url = `https://apply.workable.com/api/v3/accounts/${subdomain}/jobs`;

  let response: Response | null = null;
  let attempts = 0;

  while (attempts < 2) {
    try {
      attempts++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "JobIntelBot/1.0",
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (response.ok) break;
    } catch (err) {
      if (attempts >= 2) throw err;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      `Workable API failed for account ${subdomain} with status ${response?.status}`
    );
  }

  const data = (await response.json()) as WorkableResponse;
  const rawJobs = data.results || data.jobs || [];

  return rawJobs.map((raw) => {
    const locParts = [raw.location?.city, raw.location?.region, raw.location?.country].filter(Boolean);
    const locationStr = locParts.length > 0 ? locParts.join(", ") : null;
    const remote = Boolean(raw.remote || raw.telecommuting) || isRemotePosition(locationStr, raw.title);
    const cleanDesc = stripHtml(raw.description || "");
    const { salaryMin, salaryMax } = extractSalaryRange(cleanDesc);
    const skills = extractSkillsFromText(`${raw.title}\n${cleanDesc}`);

    return {
      externalId: raw.shortcode || String(raw.id),
      title: raw.title.trim(),
      companyName,
      location: locationStr,
      remote,
      salaryMin,
      salaryMax,
      description: cleanDesc || raw.title,
      applicationUrl: raw.url || raw.shortlink || `https://apply.workable.com/${subdomain}/j/${raw.shortcode}/`,
      source: "WORKABLE" as const,
      skills,
    };
  });
}
