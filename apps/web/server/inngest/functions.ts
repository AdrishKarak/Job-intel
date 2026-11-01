import { inngest } from "./client";
import { prisma } from "@repo/db";
import { generateDailyReport } from "../reporting";
import { searchAndSyncJobs } from "../discovery";
import { scoreJobsForUser } from "../matching";

/**
 * 7:00 PM Daily Trigger for Email Intelligence Report (AC 25.1, Task Breakdown Phase 7)
 */
export const dailyReportCron = inngest.createFunction(
  { id: "daily-job-report-trigger", triggers: [{ cron: "0 19 * * *" }] },
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
          console.error(`Daily report failed for user ${user.id}:`, err);
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
  { id: "periodic-job-sync", triggers: [{ cron: "0 */6 * * *" }] }, // Run every 6 hours
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
          console.error(`Background discovery sync failed for ${u.id}:`, err);
        }
      }
      return summary;
    });

    return { usersSynced: users.length, syncResults };
  }
);
