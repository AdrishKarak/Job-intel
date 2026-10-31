import { router, publicProcedure } from "./trpc";
import { profileRouter } from "./profileRouter";
import { jobsRouter } from "./jobsRouter";

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return {
      message: "pong",
      timestamp: new Date().toISOString(),
    };
  }),
  profile: profileRouter,
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
