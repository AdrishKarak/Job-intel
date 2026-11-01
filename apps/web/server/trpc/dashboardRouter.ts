import { router, protectedProcedure } from "./trpc";
import type { ApplicationStatus } from "@repo/shared-types";

export const dashboardRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Fetch user's jobs for stats, scoring distribution, and skill gaps
    const jobs = await ctx.prisma.job.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        matchScore: true,
        missingSkills: true,
        discoveredAt: true,
        company: {
          select: { name: true },
        },
      },
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

    // 2. Fetch recent application status transitions
    const statusHistory = await ctx.prisma.applicationStatusHistory.findMany({
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
    });

    // 3. Format unified activity feed
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
      recentActivity: activityList,
    };
  }),
});
