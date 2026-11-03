import { NextResponse } from "next/server";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  const clerkSecret = process.env.CLERK_SECRET_KEY;
  const clerkPub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const sanitizedDbUrl = dbUrl
    ? dbUrl.replace(/:([^:@]+)@/, ":[REDACTED_PASSWORD]@")
    : null;

  const sanitizedDirectUrl = directUrl
    ? directUrl.replace(/:([^:@]+)@/, ":[REDACTED_PASSWORD]@")
    : null;

  let dbStatus = "unknown";
  let userCount = 0;
  let dbError: Record<string, unknown> | null = null;

  try {
    userCount = await prisma.user.count();
    dbStatus = "connected";
  } catch (err: any) {
    dbStatus = "failed";
    dbError = {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      clientVersion: err?.clientVersion,
    };
  }

  const durationMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus === "connected" ? "ok" : "error",
    dbStatus,
    durationMs,
    userCount,
    dbError,
    envCheck: {
      hasDatabaseUrl: Boolean(dbUrl),
      sanitizedDbUrl,
      hasDirectUrl: Boolean(directUrl),
      sanitizedDirectUrl,
      hasClerkSecretKey: Boolean(clerkSecret),
      clerkSecretPrefix: clerkSecret ? clerkSecret.substring(0, 7) + "..." : null,
      hasClerkPublishableKey: Boolean(clerkPub),
      clerkPubPrefix: clerkPub ? clerkPub.substring(0, 7) + "..." : null,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    },
  });
}
