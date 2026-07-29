import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "notice-attachments");

export async function GET(request: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = await fs.readFile(path.join(UPLOAD_ROOT, filename)).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const downloadName = new URL(request.url).searchParams.get("name") || filename;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
