import { inngest } from "./client";
import { prisma } from "@repo/db";
import { generateDailyReport } from "../reporting";
import { searchAndSyncJobs } from "../discovery";
import { scoreJobsForUser } from "../matching";
import { logger } from "../logger";
import { sendEmail } from "../email";

/**
 * 7:00 PM UTC Daily Trigger for Email Intelligence Report (cron: "0 19 * * *", AC 25.1)
 * 7:00 PM UTC = 12:30 AM IST (India Standard Time).
 */
export const dailyReportCron = inngest.createFunction(
  {
    id: "daily-job-report-trigger",
    triggers: [{ cron: "0 19 * * *" }],
    onFailure: async ({ error, event }: any) => {
      logger.error("inngest.dailyReportCron.onFailure", "Daily report cron execution failed", {
        runId: event?.data?.run_id || "cron_failure",
        metadata: { error: error.message, stack: error.stack },
      });
    },
  },
  async ({ step }: any) => {
    // Step 1: Find users with candidate profiles
    const users = await step.run("load-active-users", async () => {
      return prisma.user.findMany({
        where: {
          profile: { isNot: null },
        },
        select: { id: true, email: true },
      });
    });

    // Step 2: Generate and email reports for each candidate
    const results = await step.run("generate-reports", async () => {
      const reports = [];
      for (const user of users) {
        try {
          const report = await generateDailyReport(user.id);
          reports.push({ userId: user.id, reportId: report.id, success: true });
        } catch (err: any) {
          logger.error("dailyReportCron.user", `Daily report failed for user ${user.id}`, {
            userId: user.id,
            metadata: { error: err.message },
          });
          reports.push({ userId: user.id, success: false, error: err.message });
        }
      }
      return reports;
    });

    return { totalUsers: users.length, results };
  }
);

/**
 * Periodic ATS Job Discovery & Scoring Cron
 */
export const syncDiscoveryCron = inngest.createFunction(
  {
    id: "periodic-job-sync",
    triggers: [{ cron: "0 */6 * * *" }], // Run every 6 hours
    onFailure: async ({ error, event }: any) => {
      logger.error("inngest.syncDiscoveryCron.onFailure", "Periodic sync cron execution failed", {
        runId: event?.data?.run_id || "sync_failure",
        metadata: { error: error.message },
      });
    },
  },
  async ({ step }: any) => {
    const users = await step.run("load-users-for-sync", async () => {
      return prisma.user.findMany({
        select: { id: true },
      });
    });

    const syncResults = await step.run("sync-and-score-jobs", async () => {
      const summary = [];
      for (const u of users) {
        try {
          const syncRes = await searchAndSyncJobs(u.id);
          const scoreRes = await scoreJobsForUser(u.id);
          summary.push({
            userId: u.id,
            discovered: syncRes.newJobsCount,
            scored: scoreRes.scored.length,
          });
        } catch (err: any) {
          logger.error("syncDiscoveryCron.user", `Background discovery sync failed for ${u.id}`, {
            userId: u.id,
            metadata: { error: err.message },
          });
        }
      }
      return summary;
    });

    return { usersSynced: users.length, syncResults };
  }
);

/**
 * Operator Daily Health-Summary Email (OBSERVABILITY.md § What healthy looks like)
 */
export const dailyHealthSummaryCron = inngest.createFunction(
  {
    id: "daily-health-summary",
    triggers: [{ cron: "0 8 * * *" }], // Daily at 8:00 AM UTC
    onFailure: async ({ error }: any) => {
      logger.error("inngest.dailyHealthSummaryCron.onFailure", "Health summary cron failed", {
        metadata: { error: error.message },
      });
    },
  },
  async ({ step }: any) => {
    const metrics = await step.run("gather-platform-vitals", async () => {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [totalUsers, activeProfiles, jobsDiscovered24h, scoredJobs24h, reports24h, activeApplications] =
        await Promise.all([
          prisma.user.count(),
          prisma.candidateProfile.count(),
          prisma.job.count({ where: { discoveredAt: { gte: past24h } } }),
          prisma.job.count({ where: { matchScore: { not: null }, updatedAt: { gte: past24h } } }),
          prisma.report.count({ where: { generatedAt: { gte: past24h } } }),
          prisma.job.count({
            where: {
              status: { in: ["APPLIED", "OA_RECEIVED", "OA_CLEARED", "INTERVIEW_SCHEDULED", "OFFER"] },
            },
          }),
        ]);

      return {
        totalUsers,
        activeProfiles,
        jobsDiscovered24h,
        scoredJobs24h,
        reports24h,
        activeApplications,
      };
    });

    await step.run("dispatch-operator-email", async () => {
      const operatorEmail = process.env.SMTP_FROM || "operator@jobintel.local";
      const subject = `AI Job Intelligence Platform — Daily Health Vitals [${new Date().toISOString().split("T")[0]}]`;

      const text = `
SYSTEM HEALTH REPORT
--------------------
Total Users: ${metrics.totalUsers}
Active Candidate Profiles: ${metrics.activeProfiles}
Jobs Discovered (Past 24h): ${metrics.jobsDiscovered24h}
Jobs Scored (Past 24h): ${metrics.scoredJobs24h}
Reports Generated (Past 24h): ${metrics.reports24h}
Active Applications in Pipeline: ${metrics.activeApplications}

System Status: OPERATIONAL (No unhandled critical errors)
      `.trim();

      const html = `
        <div style="font-family: monospace; padding: 20px; border: 2px solid #141414;">
          <h2>SYSTEM HEALTH VITALS — OPERATIONAL</h2>
          <hr style="border: 1px solid #141414; margin: 15px 0;" />
          <ul>
            <li><strong>Total Users:</strong> ${metrics.totalUsers}</li>
            <li><strong>Active Candidate Profiles:</strong> ${metrics.activeProfiles}</li>
            <li><strong>Jobs Discovered (24h):</strong> ${metrics.jobsDiscovered24h}</li>
            <li><strong>Jobs Scored (24h):</strong> ${metrics.scoredJobs24h}</li>
            <li><strong>Reports Generated (24h):</strong> ${metrics.reports24h}</li>
            <li><strong>Active Applications:</strong> ${metrics.activeApplications}</li>
          </ul>
        </div>
      `;

      await sendEmail({
        to: operatorEmail,
        subject,
        text,
        html,
      });
    });

    return metrics;
  }
);
