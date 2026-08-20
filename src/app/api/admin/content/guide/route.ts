import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGuideContent, saveGuideContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";

export async function GET() {
  return NextResponse.json({ content: await getGuideContent() });
}

/** 리드 문단 하나만 저장한다 (2026-08 재구성으로 나머지 필드는 코드 정본으로 옮겼다). */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const intro = body?.content?.intro;
  if (typeof intro !== "string") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const saved = await saveGuideContent({ intro: sanitizeRichText(intro) });
  return NextResponse.json({ content: saved });
}
