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
  } catch (authErr) {
    console.warn("Clerk auth() failed in createTRPCContext:", authErr);
    session = null;
  }

  let dbUser = null;

  if (session?.userId) {
    const cached = userCache.get(session.userId);
    if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
      dbUser = cached.user;
    } else {
      try {
        dbUser = await prisma.user.findUnique({
          where: { clerkId: session.userId },
        });
      } catch (findErr) {
        console.error("Failed to query user in database (check DATABASE_URL configuration):", findErr);
      }

      if (!dbUser) {
        // Auto-provision user if Clerk webhook hasn't fired yet
        let primaryEmail = `${session.userId}@user.local`;
        let name: string | null = null;

        try {
          const clerkUser = await currentUser();
          if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
            primaryEmail = clerkUser.emailAddresses[0].emailAddress;
          }
          if (clerkUser) {
            name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null;
          }
        } catch (clerkErr) {
          console.warn(
            "Could not fetch currentUser from Clerk (CLERK_SECRET_KEY might not be configured in Vercel):",
            clerkErr
          );
        }

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
        } catch (upsertErr) {
          console.error("Failed to auto-provision user in database:", upsertErr);
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
