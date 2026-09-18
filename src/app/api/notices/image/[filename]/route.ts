import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir";
import { getCurrentUser } from "@/lib/auth";
import { accountStateOf, canAccess } from "@/lib/accessPolicy";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "notices");

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
  // [보안 2026-09-18] 공지 본문과 같은 기준(승인 완료 전용)으로 막는다. 형제인 첨부 라우트
  // (api/notices/attachment)는 2026-09-04 에 "UUID 파일명만으론 숨겨지지 않는다"는 이유로
  // 같은 게이트를 넣었는데 이미지 라우트만 빠져 있었다 — 승인이 반려되거나 탈퇴한 계정도
  // 주소를 알고 있으면 공고 이미지를 계속 받을 수 있었다.
  if (!canAccess("/notices", accountStateOf(await getCurrentUser()))) {
    return NextResponse.json({ error: "승인 완료 후 이용할 수 있습니다." }, { status: 403 });
  }
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
      // 접근 제어가 붙었으므로 public 이면 안 된다 — 공유 캐시에 남으면 권한 없는
      // 요청에도 그대로 되돌아가 게이트를 우회한다.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
