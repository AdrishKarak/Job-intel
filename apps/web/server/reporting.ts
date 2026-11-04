import { prisma } from "@repo/db";
import type { ReportSummary, BestMatch, SkillGapSummaryItem, StatusChangeSummaryItem } from "@repo/shared-types";
import { sendDailyReportEmail } from "./email";
import { getSkillGapsForUser } from "./skillGaps";
import { generateJobsExcel } from "./excel";

export async function generateDailyReport(userId: string) {
  // 1. Fetch user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 2. Count new jobs discovered in past 24h
  const newJobsCount = await prisma.job.count({
    where: {
      userId,
      discoveredAt: { gte: periodStart },
    },
  });

  // 3. Find top 5 best matches
  const topJobs = await prisma.job.findMany({
    where: {
      userId,
      matchScore: { not: null },
    },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { matchScore: "desc" },
    take: 5,
  });

  const bestMatches: BestMatch[] = topJobs.map((j) => ({
    jobId: j.id,
    title: j.title,
    company: j.company.name,
    matchScore: j.matchScore || 0,
  }));

  // 4. Retrieve skill gaps
  const skillGapsList = await getSkillGapsForUser(userId);
  const skillGaps: SkillGapSummaryItem[] = skillGapsList.slice(0, 5).map((g) => ({
    skill: g.skillName,
    frequency: g.frequency,
  }));

  // 5. Retrieve status changes in past 24h
  const statusHistory = await prisma.applicationStatusHistory.findMany({
    where: {
      userId,
      changedAt: { gte: periodStart },
    },
    orderBy: { changedAt: "desc" },
    take: 10,
  });

  const statusChanges: StatusChangeSummaryItem[] = statusHistory.map((h) => ({
    jobId: h.jobId,
    from: "PREVIOUS",
    to: h.status,
  }));

  // 6. Build structured ReportSummary (AC 25.1, AC 25.2)
  const summary: ReportSummary = {
    newJobs: newJobsCount,
    bestMatches,
    skillGaps,
    statusChanges,
  };

  // 7. Persist Report to database (AC 25.3: persists regardless of email outcome)
  const report = await prisma.report.create({
    data: {
      userId,
      type: "DAILY",
      summary: summary as any,
    },
  });

  // 8. Attempt email delivery with attached full Excel spreadsheet
  if (user.email) {
    try {
      let excelAttachment: Buffer | undefined;
      try {
        excelAttachment = await generateJobsExcel(userId, prisma);
      } catch (excelErr) {
        console.error(`Failed to generate excel attachment for ${user.email}:`, excelErr);
      }

      await sendDailyReportEmail(
        user.email,
        summary,
        user.name || undefined,
        excelAttachment
      );
    } catch (err) {
      console.error(`Failed to send daily report email to ${user.email}:`, err);
      // AC 25.3: Report remains intact in database
    }
  }

  return report;
}
