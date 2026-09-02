import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { accountStateOf, canAccess } from "@/lib/accessPolicy";
import { DATA_DIR } from "@/lib/dataDir";

/**
 * 콘텐츠 관리에서 올린 문서를 내려준다 (2026-09-02).
 *
 * 대관 규약 파일이 첫 용처다. 규약 화면(/rules)이 승인 완료 전용이므로 파일도 같은
 * 선을 지킨다 — 화면만 막고 파일 주소는 열어 두면 주소를 아는 사람은 그대로 받는다.
 * 판정은 accessPolicy 한 곳에서 가져온다.
 */
const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "content-documents");

// 업로드 라우트가 붙이는 이름은 항상 `${crypto.randomUUID()}${확장자}` 다.
const FILENAME_RE = /^[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;

const CONTENT_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function GET(request: Request, ctx: { params: Promise<{ filename: string }> }) {
  const user = await getCurrentUser();
  if (!canAccess("/rules", accountStateOf(user))) {
    return NextResponse.json({ error: "승인 완료 후 이용할 수 있습니다." }, { status: 403 });
  }

  const { filename } = await ctx.params;
  if (!FILENAME_RE.test(filename)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = await fs.readFile(path.join(UPLOAD_ROOT, filename)).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  // 내려받을 때 쓸 이름은 콘텐츠에 저장된 원본 파일명이다. 화면이 ?name= 으로 붙여 준다.
  const downloadName = new URL(request.url).searchParams.get("name") || filename;
  const ext = path.extname(filename).toLowerCase();
  return new NextResponse(buffer, {
    headers: {
      // PDF·이미지는 브라우저에서 바로 열리게 두고, 나머지는 내려받게 한다.
      "Content-Type": CONTENT_TYPE[ext] ?? "application/octet-stream",
      "Content-Disposition": `${CONTENT_TYPE[ext] ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
