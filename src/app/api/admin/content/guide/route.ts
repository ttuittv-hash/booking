import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGuideContent, saveGuideContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import type { GuideContent } from "@/lib/content/types";

export async function GET() {
  return NextResponse.json({ content: await getGuideContent() });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const content = body?.content as GuideContent | undefined;
  if (!content || !Array.isArray(content.steps) || !Array.isArray(content.notices)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  content.intro = sanitizeRichText(content.intro);
  content.packageIntro = sanitizeRichText(content.packageIntro);
  content.rulesIntro = sanitizeRichText(content.rulesIntro);

  const saved = await saveGuideContent(content);
  return NextResponse.json({ content: saved });
}
