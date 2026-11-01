import { router, publicProcedure } from "./trpc";
import { profileRouter } from "./profileRouter";
import { jobsRouter } from "./jobsRouter";
import { dashboardRouter } from "./dashboardRouter";

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return {
      message: "pong",
      timestamp: new Date().toISOString(),
    };
  }),
  profile: profileRouter,
  jobs: jobsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
