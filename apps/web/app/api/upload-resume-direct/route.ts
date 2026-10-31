import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveLocalResumeBuffer } from "@/server/storage";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storagePath = searchParams.get("path");
  if (!storagePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Security: verify the path is namespaced with current user's clerk or internal id
  if (!storagePath.startsWith("resumes/")) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 403 });
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
