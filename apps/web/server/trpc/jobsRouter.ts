import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./trpc";
import {
  JobFiltersSchema,
  UpdateJobStatusInputSchema,
} from "@repo/shared-types";
import { searchAndSyncJobs } from "@/server/discovery";
import { scoreJobsForUser } from "@/server/matching";
import { checkRateLimit } from "@/server/rateLimit";
import { logger, createRunId } from "@/server/logger";
import {
  evaluateJobMatch,
  resolveCandidateExperienceYears,
  CITY_SYNONYMS,
  type CandidateFitCriteria,
} from "@/server/jobFilterEngine";

export const jobsRouter = router({
  // 1. List jobs for authenticated user with filters and pagination
  list: protectedProcedure
    .input(
      z.object({
        filters: JobFiltersSchema.optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        sort: z.enum(["newest", "score", "salary"]).default("newest"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filters, page, limit, sort } = input;
      const skip = (page - 1) * limit;

      // Construct where clause strictly scoped to ctx.userId (AC 27.1)
      const where: any = {
        userId: ctx.userId,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.role) {
        where.OR = [
          { title: { contains: filters.role, mode: "insensitive" } },
          { company: { name: { contains: filters.role, mode: "insensitive" } } },
        ];
      }

      if (filters?.location) {
        if (/^india$/i.test(filters.location.trim())) {
          const indiaLocations = [
            "India",
            "Bengaluru",
            "Bangalore",
            "Hyderabad",
            "Pune",
            "Chennai",
            "Gurugram",
            "Gurgaon",
            "Noida",
            "Mumbai",
            "Kolkata",
            "Delhi",
            "Ahmedabad",
            "Kochi",
          ];
          const indiaOr = indiaLocations.map((loc) => ({
            location: { contains: loc, mode: "insensitive" },
          }));
          where.AND = where.AND ? [...where.AND, { OR: indiaOr }] : [{ OR: indiaOr }];
        } else {
          where.location = { contains: filters.location, mode: "insensitive" };
        }
      }

      if (filters?.company) {
        where.company = {
          name: { contains: filters.company, mode: "insensitive" },
        };
      }

      if (filters?.remote !== undefined) {
        where.remote = filters.remote;
      }

      if (filters?.minSalary) {
        const salaryCondition = [
          { salaryMin: { gte: filters.minSalary } },
          { salaryMax: { gte: filters.minSalary } },
        ];
        where.AND = where.AND ? [...where.AND, { OR: salaryCondition }] : [{ OR: salaryCondition }];
      }

      if (filters?.minMatchScore !== undefined) {
        where.matchScore = { gte: filters.minMatchScore };
      }

      // Filter only jobs matching candidate preferred locations/remote and roles/skills
      if (filters?.onlyMatching !== false) {
        const [profile, userSkills] = await Promise.all([
          ctx.prisma.candidateProfile.findUnique({
            where: { userId: ctx.userId },
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
          ctx.prisma.userSkill.findMany({
            where: { userId: ctx.userId },
            select: { skillId: true },
          }),
        ]);

        const andConditions: any[] = [];

        if (profile) {
          const candidateYears = resolveCandidateExperienceYears({
            experienceYears: profile.experienceYears,
            minExperienceYears: profile.minExperienceYears,
            maxExperienceYears: profile.maxExperienceYears,
            experienceSummary: profile.experienceSummary as any,
            preferredRoles: profile.preferredRoles,
            preferredLocations: profile.preferredLocations,
            remotePreference: profile.remotePreference,
          });

          // Stage 1: Experience-wise DB constraints
          if (candidateYears >= 3) {
            andConditions.push({
              NOT: {
                OR: [
                  { title: { contains: "Intern", mode: "insensitive" } },
                  { title: { contains: "Internship", mode: "insensitive" } },
                  { title: { contains: "Co-op", mode: "insensitive" } },
                ],
              },
            });
          } else if (candidateYears < 2) {
            andConditions.push({
              NOT: {
                OR: [
                  { title: { contains: "Director", mode: "insensitive" } },
                  { title: { contains: "VP", mode: "insensitive" } },
                  { title: { contains: "Chief", mode: "insensitive" } },
                  { title: { contains: "Principal", mode: "insensitive" } },
                  { title: { contains: "Head of", mode: "insensitive" } },
                ],
              },
            });
          }

          // Negative Filter: Exclude completely unrelated occupational fields
          andConditions.push({
            NOT: {
              OR: [
                { title: { contains: "Nurse", mode: "insensitive" } },
                { title: { contains: "Physician", mode: "insensitive" } },
                { title: { contains: "Receptionist", mode: "insensitive" } },
                { title: { contains: "Cashier", mode: "insensitive" } },
                { title: { contains: "Barista", mode: "insensitive" } },
                { title: { contains: "Janitor", mode: "insensitive" } },
                { title: { contains: "Account Executive", mode: "insensitive" } },
                { title: { contains: "Sales Development", mode: "insensitive" } },
                { title: { contains: "Recruiter", mode: "insensitive" } },
                { title: { contains: "Talent Acquisition", mode: "insensitive" } },
                { title: { contains: "Dental", mode: "insensitive" } },
                { title: { contains: "Paralegal", mode: "insensitive" } },
              ],
            },
          });

          // Stage 2: Location & Remote constraints
          const locOr: any[] = [];
          if (profile.remotePreference === "REMOTE") {
            locOr.push({ remote: true });
          } else {
            if (profile.preferredLocations && profile.preferredLocations.length > 0) {
              const addedLocations = new Set<string>();
              const hasIndiaLocation = profile.preferredLocations.some((loc) => {
                const l = loc.toLowerCase().trim();
                return (
                  l.includes("india") ||
                  [
                    "bengaluru", "bangalore", "hyderabad", "pune", "chennai", "gurugram",
                    "gurgaon", "noida", "delhi", "new delhi", "kolkata", "mumbai", "ahmedabad", "kochi"
                  ].includes(l)
                );
              });

              for (const loc of profile.preferredLocations) {
                const clean = loc.toLowerCase().trim();
                if (!clean) continue;
                if (!addedLocations.has(clean)) {
                  addedLocations.add(clean);
                  locOr.push({ location: { contains: loc, mode: "insensitive" } });
                }
                const syns = CITY_SYNONYMS[clean] || [];
                for (const syn of syns) {
                  if (!addedLocations.has(syn)) {
                    addedLocations.add(syn);
                    locOr.push({ location: { contains: syn, mode: "insensitive" } });
                  }
                }
              }

              if (hasIndiaLocation && !addedLocations.has("india")) {
                locOr.push({ location: { contains: "India", mode: "insensitive" } });
              }
            }
            if (profile.remotePreference !== "ONSITE") {
              locOr.push({ remote: true });
            }
          }
          if (locOr.length > 0) {
            andConditions.push({ OR: locOr });
          }

          // Stage 3: Role & Skill Relevance
          const roleSkillOr: any[] = [];
          if (profile.preferredRoles && profile.preferredRoles.length > 0) {
            const addedTitles = new Set<string>();
            for (const r of profile.preferredRoles) {
              const clean = r.trim();
              if (!clean) continue;
              if (!addedTitles.has(clean.toLowerCase())) {
                addedTitles.add(clean.toLowerCase());
                roleSkillOr.push({ title: { contains: clean, mode: "insensitive" } });
              }

              // Also match common variations like Fullstack/Full Stack, Backend/Back-end
              if (/full\s*stack/i.test(clean)) {
                for (const syn of ["Fullstack", "Full-Stack", "Full Stack"]) {
                  if (!addedTitles.has(syn.toLowerCase())) {
                    addedTitles.add(syn.toLowerCase());
                    roleSkillOr.push({ title: { contains: syn, mode: "insensitive" } });
                  }
                }
              }
              if (/backend/i.test(clean)) {
                for (const syn of ["Back-End", "Back End", "Backend"]) {
                  if (!addedTitles.has(syn.toLowerCase())) {
                    addedTitles.add(syn.toLowerCase());
                    roleSkillOr.push({ title: { contains: syn, mode: "insensitive" } });
                  }
                }
              }
              if (/frontend/i.test(clean)) {
                for (const syn of ["Front-End", "Front End", "Frontend"]) {
                  if (!addedTitles.has(syn.toLowerCase())) {
                    addedTitles.add(syn.toLowerCase());
                    roleSkillOr.push({ title: { contains: syn, mode: "insensitive" } });
                  }
                }
              }
              if (/software\s*engineer/i.test(clean)) {
                for (const syn of ["Software Developer", "SDE", "MTS", "Member of Technical Staff"]) {
                  if (!addedTitles.has(syn.toLowerCase())) {
                    addedTitles.add(syn.toLowerCase());
                    roleSkillOr.push({ title: { contains: syn, mode: "insensitive" } });
                  }
                }
              }
            }
          }
          if (userSkills.length > 0) {
            const skillIds = userSkills.map((us) => us.skillId);
            roleSkillOr.push({
              jobSkills: { some: { skillId: { in: skillIds } } },
            });
            roleSkillOr.push({ matchScore: { gte: 50 } });
          }
          if (roleSkillOr.length > 0) {
            andConditions.push({ OR: roleSkillOr });
          }
        }

        if (andConditions.length > 0) {
          where.AND = where.AND ? [...where.AND, ...andConditions] : andConditions;
        }
      }

      // Determine orderBy
      let orderBy: any = { discoveredAt: "desc" };
      if (sort === "score") {
        orderBy = { matchScore: "desc" };
      } else if (sort === "salary") {
        orderBy = { salaryMax: "desc" };
      }

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
          select: {
            id: true,
            title: true,
            location: true,
            remote: true,
            salaryMin: true,
            salaryMax: true,
            applicationUrl: true,
            source: true,
            status: true,
            matchScore: true,
            company: {
              select: { name: true },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        ctx.prisma.job.count({ where }),
      ]);

      return {
        jobs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // 2. Get single job by ID
  getById: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.userId, // Security: scoped by userId
        },
        include: {
          company: true,
          jobSkills: {
            include: { skill: true },
          },
          statusHistory: {
            orderBy: { changedAt: "desc" },
          },
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return job;
    }),

  // 3. Update job status (AC 16.1, AC 16.2)
  updateStatus: protectedProcedure
    .input(UpdateJobStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.job.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found or access denied",
        });
      }

      const updated = await ctx.prisma.job.update({
        where: { id: input.jobId },
        data: {
          status: input.status,
        },
      });

      // Append to status history
      await ctx.prisma.applicationStatusHistory.create({
        data: {
          userId: ctx.userId,
          jobId: input.jobId,
          status: input.status,
          note: input.note,
        },
      });

      return updated;
    }),

  // 4. Trigger discovery for authenticated user
  syncDiscovery: protectedProcedure
    .input(z.object({ companyIds: z.array(z.string()).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx.userId, "jobs.syncDiscovery", { maxRequests: 5, windowMs: 60_000 });
      const runId = createRunId();
      logger.info("jobs.syncDiscovery", "Starting discovery sync", { runId, userId: ctx.userId });

      const result = await searchAndSyncJobs(ctx.userId, { companyIds: input?.companyIds });

    logger.info("jobs.syncDiscovery", "Completed manual discovery sync", {
      runId,
      userId: ctx.userId,
      metadata: { newJobs: result.newJobsCount, updated: result.updatedJobsCount },
    });
    return result;
  }),

  // 5. Score jobs for authenticated user (AC 10.1, AC 11.1, AC 12.1)
  scoreAll: protectedProcedure
    .input(z.object({ jobIds: z.array(z.string()).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx.userId, "jobs.scoreAll", { maxRequests: 10, windowMs: 60_000 });
      const runId = createRunId();
      logger.info("jobs.scoreAll", "Starting batch job scoring", { runId, userId: ctx.userId });

      const result = await scoreJobsForUser(ctx.userId, input?.jobIds);

      logger.info("jobs.scoreAll", "Finished batch job scoring", {
        runId,
        userId: ctx.userId,
        metadata: { scored: result.scored.length, failed: result.failed.length },
      });
      return {
        scoredCount: result.scored.length,
        failedCount: result.failed.length,
        scored: result.scored,
      };
    }),

  // 6. Cleanup expired jobs older than expiresAt (AC 18.1, ADR-009)
  cleanupExpired: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const result = await ctx.prisma.job.deleteMany({
      where: {
        userId: ctx.userId,
        expiresAt: { lte: now },
      },
    });

    return {
      deletedCount: result.count,
    };
  }),

  // 7. Prune irrelevant jobs from database based on 3-stage matching
  pruneIrrelevant: protectedProcedure.mutation(async ({ ctx }) => {
    checkRateLimit(ctx.userId, "jobs.pruneIrrelevant", { maxRequests: 10, windowMs: 60_000 });
    const runId = createRunId();
    logger.info("jobs.pruneIrrelevant", "Pruning non-matching discovered jobs", { runId, userId: ctx.userId });

    const [jobs, profile, userSkills] = await Promise.all([
      ctx.prisma.job.findMany({
        where: {
          userId: ctx.userId,
          status: "DISCOVERED",
        },
        include: {
          jobSkills: { include: { skill: true } },
        },
      }),
      ctx.prisma.candidateProfile.findUnique({
        where: { userId: ctx.userId },
      }),
      ctx.prisma.userSkill.findMany({
        where: { userId: ctx.userId },
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

    const idsToDelete: string[] = [];
    for (const job of jobs) {
      const evalRes = evaluateJobMatch(
        {
          id: job.id,
          title: job.title,
          description: job.description,
          location: job.location,
          remote: job.remote,
          skills: job.jobSkills.map((js) => js.skill.name),
        },
        fitCriteria
      );

      if (!evalRes.passed) {
        idsToDelete.push(job.id);
      }
    }

    if (idsToDelete.length > 0) {
      await ctx.prisma.job.deleteMany({
        where: {
          id: { in: idsToDelete },
          userId: ctx.userId,
        },
      });
    }

    logger.info("jobs.pruneIrrelevant", `Pruned ${idsToDelete.length} non-matching jobs`, {
      runId,
      userId: ctx.userId,
      metadata: { deletedCount: idsToDelete.length },
    });

    return { deletedCount: idsToDelete.length };
  }),
});
