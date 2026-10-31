import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

export interface GreenhouseJobRaw {
  id: number | string;
  title: string;
  location?: { name: string };
  absolute_url: string;
  content?: string;
  updated_at?: string;
}

export interface GreenhouseResponse {
  jobs: GreenhouseJobRaw[];
}

export async function fetchGreenhouseJobs(
  boardToken: string,
  companyName: string
): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;

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
      `Greenhouse API failed for board ${boardToken} with status ${response?.status}`
    );
  }

  const data = (await response.json()) as GreenhouseResponse;
  if (!Array.isArray(data.jobs)) {
    return [];
  }

  return data.jobs.map((raw) => {
    const rawDescription = raw.content || "";
    const cleanDescription = stripHtml(rawDescription);
    const locationName = raw.location?.name ?? null;
    const remote = isRemotePosition(locationName, raw.title);
    const { salaryMin, salaryMax } = extractSalaryRange(cleanDescription);
    const skills = extractSkillsFromText(`${raw.title}\n${cleanDescription}`);

    return {
      externalId: String(raw.id),
      title: raw.title.trim(),
      companyName,
      location: locationName,
      remote,
      salaryMin,
      salaryMax,
      description: cleanDescription || raw.title,
      applicationUrl: raw.absolute_url,
      source: "GREENHOUSE" as const,
      skills,
    };
  });
}
