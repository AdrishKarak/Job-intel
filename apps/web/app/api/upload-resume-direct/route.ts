import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@repo/db";
import { saveLocalResumeBuffer } from "@/server/storage";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: session.userId },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const storagePath = searchParams.get("path");
  if (!storagePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Security: verify the path is strictly scoped to this user's internal ID partition (AC 27.1)
  const expectedPrefix = `resumes/${dbUser.id}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "Forbidden: Storage path does not match session user partition" },
      { status: 403 }
    );
  }

  try {
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await saveLocalResumeBuffer(storagePath, buffer);
    return NextResponse.json({ success: true, storagePath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save file" }, { status: 500 });
  }
}
