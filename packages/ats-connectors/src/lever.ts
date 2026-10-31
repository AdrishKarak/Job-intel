import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

export interface LeverPostingRaw {
  id: string;
  text: string;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
  };
  descriptionPlain?: string;
  description?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
}

export async function fetchLeverJobs(
  siteSlug: string,
  companyName: string
): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${siteSlug}?mode=json`;

  let response: Response | null = null;
  let attempts = 0;

  while (attempts < 2) {
    try {
      attempts++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "JobIntelBot/1.0",
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        break;
      }
    } catch (err) {
      if (attempts >= 2) throw err;
      await new Promise((res) => setTimeout(res, 2000)); // 2s backoff
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      `Lever API failed for slug ${siteSlug} with status ${response?.status}`
    );
  }

  const postings = (await response.json()) as LeverPostingRaw[];
  if (!Array.isArray(postings)) {
    return [];
  }

  return postings.map((raw) => {
    const rawDescription = raw.descriptionPlain || stripHtml(raw.description || "");
    const locationName = raw.categories?.location ?? null;
    const remote = isRemotePosition(locationName, raw.text);
    const { salaryMin, salaryMax } = extractSalaryRange(rawDescription);
    const skills = extractSkillsFromText(`${raw.text}\n${rawDescription}`);

    return {
      externalId: raw.id,
      title: raw.text.trim(),
      companyName,
      location: locationName,
      remote,
      salaryMin,
      salaryMax,
      description: rawDescription || raw.text,
      applicationUrl: raw.applyUrl || raw.hostedUrl || `https://jobs.lever.co/${siteSlug}/${raw.id}`,
      source: "LEVER" as const,
      skills,
    };
  });
}
