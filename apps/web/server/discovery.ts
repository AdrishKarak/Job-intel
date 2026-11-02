import { prisma } from "@repo/db";
import {
  fetchGreenhouseJobs,
  fetchLeverJobs,
  fetchAshbyJobs,
  fetchSmartRecruitersJobs,
  fetchWorkableJobs,
  fetchWorkdayJobs,
  scrapeJobsWithFirecrawl,
  fetchOpenPlatformJobs,
} from "@repo/ats-connectors";
import type { NormalizedJob } from "@repo/shared-types";
import { evaluateJobMatch, type CandidateFitCriteria } from "./jobFilterEngine";

export interface DiscoverySyncResult {
  newJobsCount: number;
  updatedJobsCount: number;
  companiesQueried: number;
  companiesFailed: { companyId: string; companyName: string; reason: string }[];
  totalMatchingInDb: number;
}

const skillCache = new Map<string, string>();

async function getOrCreateSkillId(name: string): Promise<string> {
  const cached = skillCache.get(name);
  if (cached) return cached;
  const skill = await prisma.skill.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  skillCache.set(name, skill.id);
  return skill.id;
}

/**
 * Persists a normalized job into PostgreSQL, updating existing postings or creating new
 * per-user records with 40-day retention (ADR-009) and append-only status history.
 */
async function persistDiscoveredJob(
  userId: string,
  companyId: string,
  companyName: string,
  rawJob: NormalizedJob,
  expiresAt: Date,
  now: Date
): Promise<"created" | "updated" | "skipped"> {
  try {
    const existing = await prisma.job.findUnique({
      where: {
        userId_companyId_externalId: {
          userId,
          companyId,
          externalId: rawJob.externalId,
        },
      },
    });

    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: {
          title: rawJob.title,
          description: rawJob.description,
          location: rawJob.location,
          remote: rawJob.remote,
          salaryMin: rawJob.salaryMin,
          salaryMax: rawJob.salaryMax,
          applicationUrl: rawJob.applicationUrl,
          updatedAt: now,
        },
      });
      return "updated";
    }

    const job = await prisma.job.create({
      data: {
        userId,
        companyId,
        externalId: rawJob.externalId,
        title: rawJob.title,
        description: rawJob.description,
        location: rawJob.location,
        remote: rawJob.remote,
        salaryMin: rawJob.salaryMin,
        salaryMax: rawJob.salaryMax,
        applicationUrl: rawJob.applicationUrl,
        source: rawJob.source as any,
        status: "DISCOVERED",
        discoveredAt: now,
        expiresAt,
      },
    });

    // Record initial status in append-only history (AC 16.2)
    await prisma.applicationStatusHistory.create({
      data: {
        userId,
        jobId: job.id,
        status: "DISCOVERED",
        note: `Discovered from ${companyName} (${rawJob.source})`,
      },
    });

    // Link skills with cached lookup
    for (const skillName of rawJob.skills) {
      const skillId = await getOrCreateSkillId(skillName);
      await prisma.jobSkill.upsert({
        where: {
          jobId_skillId: {
            jobId: job.id,
            skillId,
          },
        },
        update: {},
        create: {
          jobId: job.id,
          skillId,
          required: true,
        },
      });
    }

    return "created";
  } catch (err: any) {
    console.warn(`Failed to persist job ${rawJob.externalId}:`, err.message);
    return "skipped";
  }
}

export async function searchAndSyncJobs(
  userId: string,
  options?: { companyIds?: string[]; limitPerCompany?: number }
): Promise<DiscoverySyncResult> {
  const [companies, profile, userSkills] = await Promise.all([
    prisma.company.findMany({
      where: {
        active: true,
        ...(options?.companyIds
          ? { id: { in: options.companyIds } }
          : {}),
      },
      orderBy: [
        // Prioritize native ATS connectors
        { atsType: "asc" },
      ],
      take: options?.companyIds ? undefined : 60,
    }),
    prisma.candidateProfile.findUnique({
      where: { userId },
      select: {
        experienceYears: true,
        minExperienceYears: true,
        maxExperienceYears: true,
        experienceSummary: true,
        preferredLocations: true,
        preferredRoles: true,
        remotePreference: true,
      },
    }),
    prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    }),
  ]);

  const fitCriteria: CandidateFitCriteria = {
    experienceYears: profile?.experienceYears,
    minExperienceYears: profile?.minExperienceYears,
    maxExperienceYears: profile?.maxExperienceYears,
    experienceSummary: profile?.experienceSummary as any,
    preferredLocations: profile?.preferredLocations || [],
    preferredRoles: profile?.preferredRoles || [],
    remotePreference: profile?.remotePreference || "NO_PREFERENCE",
    userSkills: userSkills.map((us) => us.skill.name),
  };

  let newJobsCount = 0;
  let updatedJobsCount = 0;
  const companiesFailed: { companyId: string; companyName: string; reason: string }[] = [];

  // Batch process companies with concurrency of 8 to ensure fast, non-blocking discovery
  const BATCH_SIZE = 8;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000); // 40-day retention (ADR-009)

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (company) => {
      if (!company.atsIdentifier) {
        return;
      }

      let normalizedJobs: NormalizedJob[] = [];

      try {
        switch (company.atsType) {
          case "GREENHOUSE":
            normalizedJobs = await fetchGreenhouseJobs(company.atsIdentifier, company.name);
            break;
          case "LEVER":
            normalizedJobs = await fetchLeverJobs(company.atsIdentifier, company.name);
            break;
          case "ASHBY":
            normalizedJobs = await fetchAshbyJobs(company.atsIdentifier, company.name);
            break;
          case "SMARTRECRUITERS":
            normalizedJobs = await fetchSmartRecruitersJobs(company.atsIdentifier, company.name);
            break;
          case "WORKABLE":
            normalizedJobs = await fetchWorkableJobs(company.atsIdentifier, company.name);
            break;
          case "WORKDAY": {
            const roleKeyword =
              (fitCriteria.preferredRoles || []).find((r) => /software|engineer|developer/i.test(r)) ||
              "Software Engineer";
            const candidateWantsIndia = (fitCriteria.preferredLocations || []).some((l) =>
              /india|bengaluru|bangalore|hyderabad|pune|chennai|gurugram|delhi|mumbai/i.test(l)
            );
            const searchKeyword = candidateWantsIndia ? `${roleKeyword} India` : roleKeyword;
            normalizedJobs = await fetchWorkdayJobs(company.atsIdentifier, company.name, searchKeyword);
            break;
          }
          case "WELLFOUND":
          case "CUSTOM_FIRECRAWL":
          case "CUSTOM_PUPPETEER":
            normalizedJobs = await scrapeJobsWithFirecrawl(
              company.careerPageUrl || `https://${company.atsIdentifier}`,
              company.name
            );
            break;
          default:
            console.warn(`Unsupported ATS type ${company.atsType} for company ${company.name}`);
            break;
        }
      } catch (err: any) {
        console.warn(`Discovery failed for ${company.name}:`, err.message);
        companiesFailed.push({
          companyId: company.id,
          companyName: company.name,
          reason: err.message || "Failed to fetch from ATS API",
        });
        return;
      }

      if (options?.limitPerCompany && options.limitPerCompany > 0) {
        normalizedJobs = normalizedJobs.slice(0, options.limitPerCompany);
      }

      for (const rawJob of normalizedJobs) {
        // 3-Stage Deterministic Fit: Experience -> Location -> Position & Skills
        const fitEvaluation = evaluateJobMatch(rawJob, fitCriteria);
        if (!fitEvaluation.passed) {
          continue;
        }

        const status = await persistDiscoveredJob(
          userId,
          company.id,
          company.name,
          rawJob,
          expiresAt,
          now
        );
        if (status === "created") newJobsCount++;
        else if (status === "updated") updatedJobsCount++;
      }
    });

    await Promise.allSettled(batchPromises);
  }

  // ── Open Platforms Discovery (Workday, Greenhouse, Lever, Ashby, Remotive, Arbeitnow) ──
  // Discovers matching engineering jobs across open platforms not restricted to catalog companies
  if (!options?.companyIds) {
    try {
      const openJobs = await fetchOpenPlatformJobs({
        roles: fitCriteria.preferredRoles,
        locations: fitCriteria.preferredLocations,
        limitPerSource: 25,
      });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000);

      for (const rawJob of openJobs) {
        const fitEvaluation = evaluateJobMatch(rawJob, fitCriteria);
        if (!fitEvaluation.passed) {
          continue;
        }

        let atsType: "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "SMARTRECRUITERS" | "WORKABLE" | "CUSTOM_FIRECRAWL" = "CUSTOM_FIRECRAWL";
        if (rawJob.source === "WORKDAY") atsType = "WORKDAY";
        else if (rawJob.source === "GREENHOUSE") atsType = "GREENHOUSE";
        else if (rawJob.source === "LEVER") atsType = "LEVER";
        else if (rawJob.source === "ASHBY") atsType = "ASHBY";
        else if (rawJob.source === "SMARTRECRUITERS") atsType = "SMARTRECRUITERS";
        else if (rawJob.source === "WORKABLE") atsType = "WORKABLE";

        // Dynamically find or upsert company record
        const company = await prisma.company.upsert({
          where: { name: rawJob.companyName },
          update: {},
          create: {
            name: rawJob.companyName,
            atsType,
            careerPageUrl: rawJob.applicationUrl,
            active: true,
          },
        });

        const status = await persistDiscoveredJob(
          userId,
          company.id,
          company.name,
          rawJob,
          expiresAt,
          now
        );
        if (status === "created") newJobsCount++;
        else if (status === "updated") updatedJobsCount++;
      }
    } catch (err: any) {
      console.warn("Open platform discovery error:", err.message);
    }
  }

  const totalMatchingInDb = await prisma.job.count({
    where: { userId },
  });

  return {
    newJobsCount,
    updatedJobsCount,
    companiesQueried: companies.length,
    companiesFailed,
    totalMatchingInDb,
  };
}
