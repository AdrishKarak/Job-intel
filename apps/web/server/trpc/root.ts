import { router, publicProcedure } from "./trpc";

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return {
      message: "pong",
      timestamp: new Date().toISOString(),
    };
  }),
});

export type AppRouter = typeof appRouter;
