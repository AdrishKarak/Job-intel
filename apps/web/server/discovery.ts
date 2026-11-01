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

export interface DiscoverySyncResult {
  newJobsCount: number;
  updatedJobsCount: number;
  companiesQueried: number;
  companiesFailed: { companyId: string; companyName: string; reason: string }[];
}

/**
 * Filters out jobs from company boards that do not match the candidate's preferred
 * locations/remote, or are completely unrelated to their target roles and skills.
 */
function isJobMatchingPreferences(
  job: NormalizedJob,
  profile: {
    preferredLocations: string[];
    preferredRoles: string[];
    remotePreference: string;
  } | null,
  userSkillNames: string[]
): boolean {
  if (!profile) return true;

  // 1. Check Location & Remote Preferences
  const hasLocPrefs = profile.preferredLocations.length > 0;
  const isRemoteOnly = profile.remotePreference === "REMOTE";
  const isOnsiteOnly = profile.remotePreference === "ONSITE";
  const jobLoc = (job.location || "").toLowerCase();
  const isJobRemote = Boolean(
    job.remote ||
    jobLoc.includes("remote") ||
    jobLoc.includes("anywhere") ||
    jobLoc.includes("work from home") ||
    jobLoc.includes("distributed")
  );

  let locationMatches = true;
  if (isRemoteOnly) {
    locationMatches = isJobRemote;
  } else if (hasLocPrefs) {
    const inPreferredArea = profile.preferredLocations.some((loc) => {
      const cleanLoc = loc.toLowerCase().trim();
      return cleanLoc.length > 0 && jobLoc.includes(cleanLoc);
    });
    // Remote positions are allowed unless candidate explicitly set ONSITE
    locationMatches = inPreferredArea || (!isOnsiteOnly && isJobRemote);
  }

  if (!locationMatches) {
    return false;
  }

  // 2. Check Roles & Skills Relevance
  const hasRolePrefs = profile.preferredRoles.length > 0;
  const hasSkills = userSkillNames.length > 0;

  if (!hasRolePrefs && !hasSkills) {
    return true; // No specific role/skills defined, location check passes
  }

  // Check role title match
  let roleMatches = false;
  if (hasRolePrefs) {
    const jobTitle = job.title.toLowerCase();
    roleMatches = profile.preferredRoles.some((prefRole) => {
      const target = prefRole.toLowerCase().trim();
      if (!target) return false;
      if (jobTitle.includes(target)) return true;
      const tokens = target.split(/\s+/).filter((t) => t.length > 3);
      return tokens.length > 0 && tokens.every((t) => jobTitle.includes(t));
    });
  }

  // Check technical skill overlap
  let skillMatches = false;
  if (hasSkills && job.skills && job.skills.length > 0) {
    skillMatches = job.skills.some((js) => userSkillNames.includes(js.toLowerCase()));
  }

  return roleMatches || skillMatches;
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

  const userSkillNames = userSkills.map((us) => us.skill.name.toLowerCase());

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
      // Filter out jobs that do not match candidate's location, remote, role, or skills
      if (!isJobMatchingPreferences(rawJob, profile, userSkillNames)) {
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
