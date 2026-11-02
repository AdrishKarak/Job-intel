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
  tenantConfig: string, // format: "tenant:site:cluster" or "tenant:site" or "tenant"
  companyName: string,
  searchText: string = ""
): Promise<NormalizedJob[]> {
  const [tenant, site = "External", cluster = "wd1"] = tenantConfig.split(":");
  const url = `https://${tenant}.${cluster}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;

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
          searchText,
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
    let locationStr = raw.locationsText || null;
    // Extract actual location from externalPath if locationsText is generic (e.g. "3 Locations")
    if (!locationStr || /^\d+\s+locations?$/i.test(locationStr.trim())) {
      const pathMatch = raw.externalPath.match(/\/job\/([^/]+)/);
      if (pathMatch && pathMatch[1]) {
        const seg = pathMatch[1].replace(/[-_]+/g, ", ").trim();
        // Handle common country-city patterns like "India, Bengaluru"
        locationStr = seg;
      }
    }

    const remote =
      isRemotePosition(locationStr, raw.title) ||
      Boolean(locationStr && /remote/i.test(locationStr));
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
      applicationUrl: `https://${tenant}.${cluster}.myworkdayjobs.com/en-US/${site}${raw.externalPath}`,
      source: "WORKDAY" as const,
      skills,
    };
  });
}
