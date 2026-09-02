import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { DATA_DIR } from "@/lib/dataDir";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "registration-attachments");

/**
 * 업로드 라우트가 받는 확장자는 .pdf / .jpg / .jpeg / .png 뿐이고, 전부 브라우저가
 * 그대로 띄울 수 있는 형식이다. 확장자에서 형식을 정해 **새 탭에서 바로 보이게** 한다
 * (2026-09-02). 예전에는 무조건 application/octet-stream + attachment 여서, 심사할 때
 * 사업자등록증 한 장 보려고 매번 파일을 내려받아 뷰어로 열어야 했다.
 *
 * 저장 파일명은 업로드 때 우리가 붙인 것이라 확장자를 신뢰할 수 있다 — 아래 정규식을
 * 통과한 이름만 여기까지 온다. 목록에 없는 확장자는 형식을 단정하지 않고 내려받게 둔다.
 */
const INLINE_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

// 사업자등록증 등 민감한 첨부파일이므로, 열람은 운영자만 가능하다.
export async function GET(request: Request, ctx: { params: Promise<{ filename: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { filename } = await ctx.params;
  // 저장 파일명은 항상 `${crypto.randomUUID()}${확장자}` 형식 — 그 외 요청은 모두 거부한다 (경로조작 방지)
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{1,10}$/.test(filename)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = await fs.readFile(path.join(UPLOAD_ROOT, filename)).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const params = new URL(request.url).searchParams;
  const downloadName = params.get("name") || filename;
  // `?download=1` 은 화면의 [내려받기] 가 붙인다 — 보기와 저장을 같은 파일에 대해
  // 둘 다 할 수 있어야 한다.
  const inlineType = params.get("download") ? null : INLINE_TYPE[path.extname(filename)];
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": inlineType ?? "application/octet-stream",
      "Content-Disposition": `${inlineType ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
