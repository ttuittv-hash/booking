import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrivacyContent, getTermsContent, savePrivacyContent, saveTermsContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import type { LegalContent } from "@/lib/content/types";

export async function GET() {
  return NextResponse.json({
    terms: await getTermsContent(),
    privacy: await getPrivacyContent(),
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const content = body?.content as LegalContent | undefined;
  if (
    (kind !== "terms" && kind !== "privacy") ||
    !content ||
    typeof content.bodyHtml !== "string" ||
    typeof content.effectiveDate !== "string"
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  content.bodyHtml = sanitizeRichText(content.bodyHtml);

  const saved = kind === "terms" ? await saveTermsContent(content) : await savePrivacyContent(content);
  return NextResponse.json({ content: saved });
}
