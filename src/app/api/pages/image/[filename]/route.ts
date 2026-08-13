import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "pages");

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// 저장 파일명은 항상 `${crypto.randomUUID()}${확장자}` 형식 — 그 외 요청은 모두 거부한다 (경로조작 방지)
const SAFE_FILENAME_RE = /^[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;

export async function GET(_request: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  if (!SAFE_FILENAME_RE.test(filename)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = await fs.readFile(path.join(UPLOAD_ROOT, filename)).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });

  const mimeType = MIME_BY_EXT[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
