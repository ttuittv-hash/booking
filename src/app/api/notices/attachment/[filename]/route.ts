import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir";

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "notice-attachments");

// 저장 파일명은 항상 `${crypto.randomUUID()}${확장자}` 형식 — 그 외 요청은 모두 거부한다 (경로조작 방지)
const SAFE_FILENAME_RE = /^[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;

export async function GET(request: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  if (!SAFE_FILENAME_RE.test(filename)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = await fs.readFile(path.join(UPLOAD_ROOT, filename)).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const url = new URL(request.url);
  const downloadName = url.searchParams.get("name") || filename;

  // [신규 2026-09-02] `?inline=1` 이면 브라우저 안에서 그대로 펼친다 — 공지에 붙인
  // PDF 공고를 내려받지 않고 화면에서 바로 보게 하기 위해서다. 기본은 예전처럼
  // 내려받기다(첨부 링크). PDF 만 열어 준다 — 임의 파일을 inline 으로 돌려주면
  // 브라우저가 우리 도메인에서 그 내용을 실행할 수 있다.
  const inline = url.searchParams.get("inline") === "1" && filename.toLowerCase().endsWith(".pdf");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": inline ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
