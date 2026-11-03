import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.message,
      data: {
        ...shape.data,
        message: error.message,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth?.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ctx.authError
        ? `Authentication failed: ${ctx.authError.message}`
        : "You must be signed in to perform this action.",
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ctx.dbError
        ? `Database error: ${ctx.dbError.message}`
        : `Authenticated as ${ctx.auth.userId}, but user record could not be loaded or auto-provisioned in the database.`,
    });
  }

  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth,
      user: ctx.user,
      userId: ctx.user.id,
    },
  });
});
