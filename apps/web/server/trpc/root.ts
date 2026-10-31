import { router, publicProcedure } from "./trpc";
import { profileRouter } from "./profileRouter";

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return {
      message: "pong",
      timestamp: new Date().toISOString(),
    };
  }),
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
