import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/db";

interface CachedUser {
  user: any;
  cachedAt: number;
}

const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const userCache = new Map<string, CachedUser>();

export function invalidateUserContextCache(clerkId?: string) {
  if (clerkId) {
    userCache.delete(clerkId);
  } else {
    userCache.clear();
  }
}

export async function createTRPCContext() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Handling cases when called outside request context (e.g., tests)
    session = null;
  }

  let dbUser = null;

  if (session?.userId) {
    const cached = userCache.get(session.userId);
    if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
      dbUser = cached.user;
    } else {
      dbUser = await prisma.user.findUnique({
        where: { clerkId: session.userId },
      });

      if (!dbUser) {
        // Auto-provision user if Clerk webhook hasn't fired yet
        const clerkUser = await currentUser();
        const primaryEmail =
          clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${session.userId}@user.local`;
        const name = clerkUser
          ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()
          : null;

        try {
          dbUser = await prisma.user.upsert({
            where: { clerkId: session.userId },
            update: {
              email: primaryEmail,
              name: name || undefined,
            },
            create: {
              clerkId: session.userId,
              email: primaryEmail,
              name: name || undefined,
            },
          });
        } catch (e) {
          console.error("Failed to auto-provision user in context:", e);
        }
      }

      if (dbUser) {
        userCache.set(session.userId, { user: dbUser, cachedAt: Date.now() });
      }
    }
  }

  return {
    prisma,
    auth: session,
    user: dbUser,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
