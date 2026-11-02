import { prisma } from "@repo/db";
import {
  fetchGreenhouseJobs,
  fetchLeverJobs,
  fetchAshbyJobs,
  fetchSmartRecruitersJobs,
  fetchWorkableJobs,
  fetchWorkdayJobs,
  scrapeJobsWithFirecrawl,
} from "@repo/ats-connectors";
import type { NormalizedJob } from "@repo/shared-types";
import { evaluateJobMatch, type CandidateFitCriteria } from "./jobFilterEngine";

export interface DiscoverySyncResult {
  newJobsCount: number;
  updatedJobsCount: number;
  companiesQueried: number;
  companiesFailed: { companyId: string; companyName: string; reason: string }[];
}

export async function searchAndSyncJobs(
  userId: string,
  options?: { companyIds?: string[]; limitPerCompany?: number }
): Promise<DiscoverySyncResult> {
  const [companies, profile, userSkills] = await Promise.all([
    prisma.company.findMany({
      where: {
        active: true,
        ...(options?.companyIds ? { id: { in: options.companyIds } } : {}),
      },
      take: options?.companyIds ? undefined : 25,
    }),
    prisma.candidateProfile.findUnique({
      where: { userId },
      select: {
        experienceYears: true,
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
    experienceSummary: profile?.experienceSummary as any,
    preferredLocations: profile?.preferredLocations || [],
    preferredRoles: profile?.preferredRoles || [],
    remotePreference: profile?.remotePreference || "NO_PREFERENCE",
    userSkills: userSkills.map((us) => us.skill.name),
  };

  let newJobsCount = 0;
  let updatedJobsCount = 0;
  const companiesFailed: { companyId: string; companyName: string; reason: string }[] = [];

  for (const company of companies) {
    if (!company.atsIdentifier) {
      continue;
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
        case "WORKDAY":
          normalizedJobs = await fetchWorkdayJobs(company.atsIdentifier, company.name);
          break;
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
      continue;
    }

    if (options?.limitPerCompany && options.limitPerCompany > 0) {
      normalizedJobs = normalizedJobs.slice(0, options.limitPerCompany);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000); // 40-day retention (ADR-009)

    for (const rawJob of normalizedJobs) {
      // 3-Stage Deterministic Fit: Experience -> Location -> Position & Skills
      const fitEvaluation = evaluateJobMatch(rawJob, fitCriteria);
      if (!fitEvaluation.passed) {
        continue;
      }

      try {
        const existing = await prisma.job.findUnique({
          where: {
            userId_companyId_externalId: {
              userId,
              companyId: company.id,
              externalId: rawJob.externalId,
            },
          },
        });

        if (existing) {
          // Update job posting if changed
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
          updatedJobsCount++;
        } else {
          // Create new Job row scoped to this user
          const job = await prisma.job.create({
            data: {
              userId,
              companyId: company.id,
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
              note: `Discovered from ${company.name} (${rawJob.source})`,
            },
          });

          // Link skills
          for (const skillName of rawJob.skills) {
            const skill = await prisma.skill.upsert({
              where: { name: skillName },
              update: {},
              create: { name: skillName },
            });

            await prisma.jobSkill.upsert({
              where: {
                jobId_skillId: {
                  jobId: job.id,
                  skillId: skill.id,
                },
              },
              update: {},
              create: {
                jobId: job.id,
                skillId: skill.id,
                required: true,
              },
            });
          }

          newJobsCount++;
        }
      } catch (err: any) {
        console.warn(`Failed to persist job ${rawJob.externalId}:`, err.message);
      }
    }
  }

  return {
    newJobsCount,
    updatedJobsCount,
    companiesQueried: companies.length,
    companiesFailed,
  };
}
