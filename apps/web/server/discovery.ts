import { prisma } from "@repo/db";
import {
  fetchGreenhouseJobs,
  fetchLeverJobs,
} from "@repo/ats-connectors";
import type { NormalizedJob } from "@repo/shared-types";

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
  const companies = await prisma.company.findMany({
    where: {
      active: true,
      ...(options?.companyIds ? { id: { in: options.companyIds } } : {}),
    },
    take: options?.companyIds ? undefined : 25,
  });

  let newJobsCount = 0;
  let updatedJobsCount = 0;
  const companiesFailed: { companyId: string; companyName: string; reason: string }[] = [];

  for (const company of companies) {
    if (!company.atsIdentifier) {
      continue;
    }

    let normalizedJobs: NormalizedJob[] = [];

    try {
      if (company.atsType === "GREENHOUSE") {
        normalizedJobs = await fetchGreenhouseJobs(
          company.atsIdentifier,
          company.name
        );
      } else if (company.atsType === "LEVER") {
        normalizedJobs = await fetchLeverJobs(
          company.atsIdentifier,
          company.name
        );
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
