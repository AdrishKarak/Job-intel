import type { NormalizedJob } from "@repo/shared-types";
import {
  stripHtml,
  isRemotePosition,
  extractSalaryRange,
  extractSkillsFromText,
} from "./normalize";

export interface WorkdayJobRaw {
  bulletFields?: string[];
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  timeType?: string;
}

export interface WorkdayResponse {
  total?: number;
  jobPostings?: WorkdayJobRaw[];
}

export async function fetchWorkdayJobs(
  tenantConfig: string, // format: "tenant:site" or "tenant"
  companyName: string
): Promise<NormalizedJob[]> {
  const [tenant, site = "External"] = tenantConfig.split(":");
  const url = `https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;

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
        body: JSON.stringify({
          appliedFacets: {},
          limit: 20,
          offset: 0,
          searchText: "",
        }),
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
      `Workday API failed for tenant ${tenant} with status ${response?.status}`
    );
  }

  const data = (await response.json()) as WorkdayResponse;
  const rawJobs = data.jobPostings || [];

  return rawJobs.map((raw) => {
    const locationStr = raw.locationsText || null;
    const remote = isRemotePosition(locationStr, raw.title);
    const { salaryMin, salaryMax } = extractSalaryRange(raw.title);
    const skills = extractSkillsFromText(raw.title);
    const externalId = raw.externalPath.replace(/[^a-zA-Z0-9_-]/g, "_");

    return {
      externalId,
      title: raw.title.trim(),
      companyName,
      location: locationStr,
      remote,
      salaryMin,
      salaryMax,
      description: `${raw.title} at ${companyName} (${locationStr || (remote ? "Remote" : "Onsite")})`,
      applicationUrl: `https://${tenant}.wd1.myworkdayjobs.com/en-US/${site}${raw.externalPath}`,
      source: "WORKDAY" as const,
      skills,
    };
  });
}
