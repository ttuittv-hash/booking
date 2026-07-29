import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { DATA_DIR } from "@/lib/dataDir";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "notice-attachments");
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".hwp", ".hwpx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip"]);

function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일을 선택하세요." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 20MB 이하여야 합니다." }, { status: 400 });
  }
  const ext = safeExtension(file.name);
  if (!ext) {
    return NextResponse.json(
      { error: "PDF/Word/한글/Excel/PowerPoint/ZIP 파일만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const storedName = `${crypto.randomUUID()}${ext}`;
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_ROOT, storedName), buffer);

  return NextResponse.json({ url: `/api/notices/attachment/${storedName}`, name: file.name });
}
