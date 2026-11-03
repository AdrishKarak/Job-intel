import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/context";
import { logger } from "@/server/logger";

function safeErrorDetails(error: { code?: string; cause?: unknown }) {
  const cause = error.cause;
  const causeRecord =
    cause && typeof cause === "object" ? (cause as Record<string, unknown>) : undefined;
  const causeMessage = cause instanceof Error ? cause.message : undefined;

  return {
    trpcCode: error.code,
    causeName: cause instanceof Error ? cause.name : undefined,
    causeCode: typeof causeRecord?.code === "string" ? causeRecord.code : undefined,
    // Prisma errors can include a database URL. Never put credentials in logs.
    causeMessage: causeMessage?.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_DATABASE_URL]"),
  };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(),
    onError: ({ path, error }) => {
      console.error(`❌ [tRPC Error on ${path ?? "<no-path>"}]:`, error);

      logger.error("trpc.request", "tRPC request failed", {
        metadata: {
          path: path ?? "<no-path>",
          ...safeErrorDetails(error),
        },
      });
    },
  });

export { handler as GET, handler as POST };
