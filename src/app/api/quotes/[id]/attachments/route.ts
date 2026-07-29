import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import { DATA_DIR } from "@/lib/dataDir";
import { createAttachment, getQuoteById } from "@/lib/db";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads");
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/haansofthwp",
  "application/x-hwp",
  "application/zip",
]);

function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!canAccessQuote(user, quote)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일을 선택하세요." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 20MB 이하여야 합니다." }, { status: 400 });
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "허용되지 않는 파일 형식입니다. (PDF/이미지/문서 파일만 가능)" },
      { status: 400 },
    );
  }

  const attachmentId = crypto.randomUUID();
  const storedName = `${attachmentId}${safeExtension(file.name)}`;
  const quoteDir = path.join(UPLOAD_ROOT, id);
  await fs.mkdir(quoteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(quoteDir, storedName), buffer);

  const attachment = createAttachment({
    id: attachmentId,
    quoteId: id,
    storedName,
    originalName: file.name.slice(0, 255),
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedBy: user.id,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ attachment });
}
