import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { DATA_DIR } from "@/lib/dataDir";
import { deleteReviewCriteriaDoc, getReviewCriteriaDoc, setReviewCriteriaDoc } from "@/lib/db";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "review-criteria");
const MAX_SIZE = 20 * 1024 * 1024; // 20MB — 다른 첨부 자료와 같은 한도
const MIME_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  const doc = await getReviewCriteriaDoc();
  return NextResponse.json({
    doc: doc ? { fileName: doc.fileName, uploadedAt: doc.uploadedAt } : null,
  });
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
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "PDF 또는 DOCX 파일만 업로드할 수 있습니다(HWP는 아직 지원하지 않습니다 — PDF나 DOCX로 변환해 올려주세요)." },
      { status: 400 },
    );
  }

  const storedName = `${crypto.randomUUID()}${ext}`;
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(UPLOAD_ROOT, storedName);

  const previous = await getReviewCriteriaDoc();
  await fs.writeFile(filePath, buffer);
  const doc = await setReviewCriteriaDoc({
    fileName: file.name,
    mimeType: file.type,
    filePath,
    uploadedBy: user.id,
  });
  if (previous) await fs.unlink(previous.filePath).catch(() => {});

  return NextResponse.json({ doc: { fileName: doc.fileName, uploadedAt: doc.uploadedAt } });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  const previous = await getReviewCriteriaDoc();
  await deleteReviewCriteriaDoc();
  if (previous) await fs.unlink(previous.filePath).catch(() => {});
  return NextResponse.json({ ok: true });
}
