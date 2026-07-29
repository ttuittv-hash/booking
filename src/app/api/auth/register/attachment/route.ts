import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "registration-attachments");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}

// 회원가입 진행 중(비로그인 상태)에 사업자등록증 등을 첨부하기 위한 공개 업로드 엔드포인트.
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일을 선택하세요." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
  }
  const ext = safeExtension(file.name);
  if (!ext) {
    return NextResponse.json({ error: "PDF 또는 이미지(JPG/PNG) 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const storedName = `${crypto.randomUUID()}${ext}`;
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_ROOT, storedName), buffer);

  return NextResponse.json({ url: `/api/auth/register/attachment/${storedName}`, name: file.name });
}
