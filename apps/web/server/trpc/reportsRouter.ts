import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { generateDailyReport } from "@/server/reporting";
import { generateJobsExcel } from "@/server/excel";
import { checkRateLimit } from "@/server/rateLimit";
import { logger, createRunId } from "@/server/logger";

export const reportsRouter = router({
  // 1. List user's reports (strictly scoped by userId)
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 10;
      const reports = await ctx.prisma.report.findMany({
        where: { userId: ctx.userId },
        orderBy: { generatedAt: "desc" },
        take: limit,
      });

      return reports;
    }),

  // 2. Trigger on-demand report generation and email dispatch
  generateNow: protectedProcedure.mutation(async ({ ctx }) => {
    checkRateLimit(ctx.userId, "reports.generateNow", { maxRequests: 5, windowMs: 3600_000 });
    const runId = createRunId();
    logger.info("reports.generateNow", "Starting on-demand report generation", { runId, userId: ctx.userId });

    const report = await generateDailyReport(ctx.userId);

    logger.info("reports.generateNow", "Report generated successfully", {
      runId,
      userId: ctx.userId,
      metadata: { reportId: report.id },
    });
    return report;
  }),

  // 3. Export jobs to Excel (.xlsx) base64 format for direct client download
  exportExcel: protectedProcedure.mutation(async ({ ctx }) => {
    checkRateLimit(ctx.userId, "reports.exportExcel", { maxRequests: 15, windowMs: 60_000 });
    const runId = createRunId();
    logger.info("reports.exportExcel", "Exporting jobs to Excel", { runId, userId: ctx.userId });

    const buffer = await generateJobsExcel(ctx.userId, ctx.prisma);
    const base64 = buffer.toString("base64");
    const dateStr = new Date().toISOString().split("T")[0];

    logger.info("reports.exportExcel", "Excel export ready", {
      runId,
      userId: ctx.userId,
      metadata: { bytes: buffer.length },
    });

    return {
      fileName: `job-intel-export-${dateStr}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: base64,
    };
  }),
});
