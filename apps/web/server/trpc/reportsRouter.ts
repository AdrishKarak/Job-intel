import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { generateDailyReport } from "@/server/reporting";
import { generateJobsExcel } from "@/server/excel";

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
    const report = await generateDailyReport(ctx.userId);
    return report;
  }),

  // 3. Export jobs to Excel (.xlsx) base64 format for direct client download
  exportExcel: protectedProcedure.mutation(async ({ ctx }) => {
    const buffer = await generateJobsExcel(ctx.userId, ctx.prisma);
    const base64 = buffer.toString("base64");
    const dateStr = new Date().toISOString().split("T")[0];

    return {
      fileName: `job-intel-export-${dateStr}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: base64,
    };
  }),
});
