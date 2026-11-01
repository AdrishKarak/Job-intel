import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

export interface SmartRecruitersJobRaw {
  id: string;
  name: string;
  refNumber?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  department?: { label?: string };
  releasedDate?: string;
}

export interface SmartRecruitersResponse {
  content?: SmartRecruitersJobRaw[];
}

export async function fetchSmartRecruitersJobs(
  companyIdentifier: string,
  companyName: string
): Promise<NormalizedJob[]> {
  const url = `https://api.smartrecruiters.com/v1/companies/${companyIdentifier}/postings`;

  let response: Response | null = null;
  let attempts = 0;

  while (attempts < 2) {
    try {
      attempts++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      response = await fetch(url, {
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
      `SmartRecruiters API failed for company ${companyIdentifier} with status ${response?.status}`
    );
  }

  const data = (await response.json()) as SmartRecruitersResponse;
  const rawJobs = data.content || [];

  return rawJobs.map((raw) => {
    const locParts = [raw.location?.city, raw.location?.region, raw.location?.country].filter(Boolean);
    const locationStr = locParts.length > 0 ? locParts.join(", ") : null;
    const remote = Boolean(raw.location?.remote) || isRemotePosition(locationStr, raw.name);
    const { salaryMin, salaryMax } = extractSalaryRange(raw.name);
    const skills = extractSkillsFromText(raw.name);

    return {
      externalId: String(raw.id),
      title: raw.name.trim(),
      companyName,
      location: locationStr,
      remote,
      salaryMin,
      salaryMax,
      description: `${raw.name} - ${companyName} (${locationStr || (remote ? "Remote" : "Not specified")})`,
      applicationUrl: `https://jobs.smartrecruiters.com/${companyIdentifier}/${raw.id}`,
      source: "SMARTRECRUITERS" as const,
      skills,
    };
  });
}
