import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import { DATA_DIR } from "@/lib/dataDir";
import {
  createAttachment,
  getQuoteById,
  markFacilityMeetingMaterialsUploaded,
  markTicketOpenMaterialsUploaded,
} from "@/lib/db";
import {
  PUBLIC_INTEREST_ITEM_LABEL,
  type AttachmentCategory,
  type PublicInterestItem,
} from "@/lib/pricing/types";

const VALID_CATEGORIES: AttachmentCategory[] = ["TICKET_OPEN", "FACILITY_MEETING"];
// 공공/공익 STEP 이 항목별로 올리는 자료(2026-08-27) — 라벨 표에 있는 키만 받는다.
const VALID_PUBLIC_INTEREST_ITEMS = new Set(Object.keys(PUBLIC_INTEREST_ITEM_LABEL));

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads");
// [개정 2026-08-26] "첨부 용량은 500메가까지 가능하게함" — 클라이언트 쪽 한도
// (StepPerformanceInfo.tsx MAX_FILE_SIZE)도 함께 올렸다.
const MAX_SIZE = 500 * 1024 * 1024; // 500MB
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

// 허용 확장자. file.type(브라우저가 붙이는 MIME)은 .hwp 등에서 빈 값으로 오는 경우가 있어
// MIME 만으로는 걸러지지 않는다 — 확장자 화이트리스트로 .html/.svg 같은 파일 저장을 막는다.
const ALLOWED_EXT = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".webp",
  ".doc", ".docx", ".xls", ".xlsx",
  ".hwp", ".hwpx", ".zip",
]);

function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!(await canAccessQuote(user, quote))) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일을 선택하세요." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 500MB 이하여야 합니다." }, { status: 400 });
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "허용되지 않는 파일 형식입니다. (PDF/이미지/문서 파일만 가능)" },
      { status: 400 },
    );
  }
  const extension = safeExtension(file.name);
  if (!extension) {
    return NextResponse.json(
      { error: "허용되지 않는 파일 형식입니다. (PDF/이미지/문서 파일만 가능)" },
      { status: 400 },
    );
  }

  const categoryInput = formData?.get("category");
  const category = VALID_CATEGORIES.includes(categoryInput as AttachmentCategory)
    ? (categoryInput as AttachmentCategory)
    : null;

  const publicInterestInput = formData?.get("publicInterestItem");
  const publicInterestItem =
    typeof publicInterestInput === "string" && VALID_PUBLIC_INTEREST_ITEMS.has(publicInterestInput)
      ? (publicInterestInput as PublicInterestItem)
      : null;

  const attachmentId = crypto.randomUUID();
  const storedName = `${attachmentId}${extension}`;
  const quoteDir = path.join(UPLOAD_ROOT, id);
  await fs.mkdir(quoteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(quoteDir, storedName), buffer);

  const now = new Date().toISOString();
  const attachment = await createAttachment({
    id: attachmentId,
    quoteId: id,
    storedName,
    originalName: file.name.slice(0, 255),
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedBy: user.id,
    category,
    publicInterestItem,
    createdAt: now,
  });

  if (category === "TICKET_OPEN") await markTicketOpenMaterialsUploaded(id, now);
  if (category === "FACILITY_MEETING") await markFacilityMeetingMaterialsUploaded(id, now);

  return NextResponse.json({ attachment });
}
