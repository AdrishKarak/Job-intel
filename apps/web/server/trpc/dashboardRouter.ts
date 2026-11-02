import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import type { ApplicationStatus } from "@repo/shared-types";
import { computeSkillGapsForUser, getSkillGapsForUser } from "@/server/skillGaps";
import { checkRateLimit } from "@/server/rateLimit";
import { logger, createRunId } from "@/server/logger";
import { evaluateJobMatch, type CandidateFitCriteria } from "@/server/jobFilterEngine";

export const dashboardRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const runId = createRunId();
    logger.info("dashboard.getSummary", "Loading dashboard summary metrics", {
      runId,
      userId,
    });
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // These reads are independent. Fetch them together so dashboard latency is
    // bound by the slowest query rather than the sum of their round trips.
    const [rawJobs, profile, userSkills, statusHistory, persistedRecommendations] = await Promise.all([
      ctx.prisma.job.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          remote: true,
          status: true,
          matchScore: true,
          missingSkills: true,
          discoveredAt: true,
          company: {
            select: { name: true },
          },
          jobSkills: {
            select: {
              skill: { select: { name: true } },
            },
          },
        },
      }),
      ctx.prisma.candidateProfile.findUnique({
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
      ctx.prisma.userSkill.findMany({
        where: { userId },
        select: {
          skill: { select: { name: true } },
        },
      }),
      ctx.prisma.applicationStatusHistory.findMany({
        where: { userId },
        take: 10,
        orderBy: { changedAt: "desc" },
        include: {
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
            },
          },
        },
      }),
      getSkillGapsForUser(userId, ctx.prisma),
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

    // Filter jobs using 3-stage criteria so only relevant jobs populate dashboard metrics
    const jobs = rawJobs.filter((job) => {
      if (job.status !== "DISCOVERED") return true; // Keep all user-interacted jobs
      return evaluateJobMatch(
        {
          id: job.id,
          title: job.title,
          description: job.description,
          location: job.location,
          remote: job.remote,
          skills: job.jobSkills ? job.jobSkills.map((js: any) => js.skill.name) : [],
        },
        fitCriteria
      ).passed;
    });

    // Calculate core stats
    const totalJobs = jobs.length;
    let jobsFoundToday = 0;
    let activeApplications = 0;
    let interviews = 0;
    let offers = 0;
    let totalScore = 0;
    let scoredJobsCount = 0;

    const scoreDistribution = {
      high: 0, // >= 80%
      good: 0, // 70-79%
      moderate: 0, // < 70%
      unscored: 0,
    };

    const statusCounts: Record<string, number> = {};
    const skillGapFrequency: Record<string, number> = {};

    for (const job of jobs) {
      if (job.discoveredAt >= startOfToday) {
        jobsFoundToday++;
      }

      // Status breakdown
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;

      if (
        [
          "APPLIED",
          "OA_RECEIVED",
          "OA_CLEARED",
          "INTERVIEW_SCHEDULED",
          "INTERVIEW_CLEARED",
        ].includes(job.status)
      ) {
        activeApplications++;
      }

      if (["INTERVIEW_SCHEDULED", "INTERVIEW_CLEARED"].includes(job.status)) {
        interviews++;
      }

      if (job.status === "OFFER") {
        offers++;
      }

      // Score distribution
      if (job.matchScore !== null && job.matchScore !== undefined) {
        scoredJobsCount++;
        totalScore += job.matchScore;

        if (job.matchScore >= 80) {
          scoreDistribution.high++;
        } else if (job.matchScore >= 70) {
          scoreDistribution.good++;
        } else {
          scoreDistribution.moderate++;
        }
      } else {
        scoreDistribution.unscored++;
      }

      // Aggregate skill gaps
      for (const skill of job.missingSkills) {
        const cleaned = skill.trim();
        if (cleaned) {
          skillGapFrequency[cleaned] = (skillGapFrequency[cleaned] || 0) + 1;
        }
      }
    }

    const avgMatchScore =
      scoredJobsCount > 0 ? Math.round(totalScore / scoredJobsCount) : null;

    // Format top skill gaps
    const topSkillGaps = Object.entries(skillGapFrequency)
      .map(([skillName, count]) => ({
        skillName,
        count,
        percentage: totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Format unified activity feed.
    const activityList = [
      ...statusHistory.map((h) => ({
        id: `status-${h.id}`,
        type: "STATUS_TRANSITION" as const,
        title: h.job.title,
        company: h.job.company.name,
        status: h.status as ApplicationStatus,
        note: h.note,
        timestamp: h.changedAt,
      })),
      ...jobs
        .sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime())
        .slice(0, 5)
        .map((j) => ({
          id: `discovered-${j.id}`,
          type: "JOB_DISCOVERED" as const,
          title: j.title,
          company: j.company.name,
          status: j.status as ApplicationStatus,
          note: j.matchScore ? `${Math.round(j.matchScore)}% match` : null,
          timestamp: j.discoveredAt,
        })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      stats: {
        jobsFoundToday,
        totalJobs,
        activeApplications,
        interviews,
        offers,
        avgMatchScore,
      },
      scoreDistribution,
      statusCounts,
      topSkillGaps,
      recommendations: persistedRecommendations,
      recentActivity: activityList,
    };
  }),

  // Re-compute and update SkillGapRecommendation records (AC 19.1)
  refreshSkillGaps: protectedProcedure.mutation(async ({ ctx }) => {
    checkRateLimit(ctx.userId, "dashboard.refreshSkillGaps", { maxRequests: 10, windowMs: 60_000 });
    const runId = createRunId();
    logger.info("dashboard.refreshSkillGaps", "Refreshing user skill gaps", {
      runId,
      userId: ctx.userId,
    });

    const updated = await computeSkillGapsForUser(ctx.userId, ctx.prisma);

    logger.info("dashboard.refreshSkillGaps", "Finished refreshing skill gaps", {
      runId,
      userId: ctx.userId,
      metadata: { count: updated.length },
    });
    return {
      count: updated.length,
      recommendations: updated,
    };
  }),

  // 3. Paginated list of top matching qualified jobs for the dashboard
  getTopMatches: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where = { userId: ctx.userId };

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
          select: {
            id: true,
            title: true,
            location: true,
            remote: true,
            status: true,
            matchScore: true,
            applicationUrl: true,
            company: { select: { name: true } },
          },
          orderBy: [
            { matchScore: "desc" },
            { discoveredAt: "desc" },
          ],
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
});
