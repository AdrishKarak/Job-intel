import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

export interface AshbyJobRaw {
  id: string;
  title: string;
  location?: string;
  department?: string;
  isRemote?: boolean;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
}

export interface AshbyResponse {
  jobs?: AshbyJobRaw[];
  jobPostings?: AshbyJobRaw[];
}

export async function fetchAshbyJobs(
  boardName: string,
  companyName: string
): Promise<NormalizedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardName}`;

  let response: Response | null = null;
  let attempts = 0;

  while (attempts < 2) {
    try {
      attempts++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      // Ashby public job board endpoint accepts GET requests
      response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "JobIntelBot/1.0",
        },
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
      `Ashby API failed for board ${boardName} with status ${response?.status}`
    );
  }

  const data = (await response.json()) as AshbyResponse;
  const rawJobs = data.jobs || data.jobPostings || [];

  return rawJobs.map((raw) => {
    const rawDesc = raw.descriptionPlain || raw.descriptionHtml || "";
    const cleanDesc = stripHtml(rawDesc);
    const locationStr = raw.location || null;
    const remote = raw.isRemote || isRemotePosition(locationStr, raw.title);
    const { salaryMin, salaryMax } = extractSalaryRange(cleanDesc);
    const skills = extractSkillsFromText(`${raw.title}\n${cleanDesc}`);

    return {
      externalId: String(raw.id),
      title: raw.title.trim(),
      companyName,
      location: locationStr,
      remote,
      salaryMin,
      salaryMax,
      description: cleanDesc || raw.title,
      applicationUrl: raw.jobUrl || raw.applyUrl || `https://jobs.ashbyhq.com/${boardName}/${raw.id}`,
      source: "ASHBY" as const,
      skills,
    };
  });
}
