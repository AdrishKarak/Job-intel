import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { dailyReportCron, syncDiscoveryCron, dailyHealthSummaryCron } from "@/server/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyReportCron, syncDiscoveryCron, dailyHealthSummaryCron],
});
