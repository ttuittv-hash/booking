import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { DATA_DIR } from "@/lib/dataDir";

/**
 * 콘텐츠 관리에서 내려받기용 문서를 올린다 (2026-09-02).
 *
 * 대관 규약 파일이 첫 용처다. 예전에는 파일 주소를 운영자가 직접 타이핑해야 했고
 * (대관 자료 목록의 href), 그러다 보니 오타 하나로 링크가 죽었다.
 *
 * 이미지 전용인 pages/upload 와 나눈 이유: 허용 형식과 저장 위치가 다르고,
 * 여기 올라온 파일은 화면에 그려지는 게 아니라 첨부로 내려간다.
 */
const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "content-documents");
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// 확장자 화이트리스트가 실질 방어다 — file.type 은 .hwp 등에서 빈 값으로 오는 일이 잦아
// MIME 만 보면 걸러지지 않는다. .html/.svg 처럼 브라우저가 실행하는 형식은 받지 않는다.
const ALLOWED_EXT = new Set([
  ".pdf",
  ".hwp",
  ".hwpx",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".png",
  ".jpg",
  ".jpeg",
]);

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
    return NextResponse.json({ error: "파일 크기는 50MB 이하여야 합니다." }, { status: 400 });
  }
  const ext = safeExtension(file.name);
  if (!ext) {
    return NextResponse.json(
      { error: "PDF · 한글 · 워드 · 엑셀 · PPT · ZIP · 이미지 파일만 올릴 수 있습니다." },
      { status: 400 },
    );
  }

  const storedName = `${crypto.randomUUID()}${ext}`;
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_ROOT, storedName), buffer);

  // 원본 파일명은 저장하지 않는다 — 내려받을 때 쓸 이름은 콘텐츠(fileName)에 함께 담긴다.
  return NextResponse.json({
    url: `/api/content/document/${storedName}`,
    name: file.name,
    size: file.size,
  });
}
