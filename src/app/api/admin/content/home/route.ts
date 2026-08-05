import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getHomeContent, saveHomeContent } from "@/lib/db";
import type { HomeContent } from "@/lib/content/types";

export async function GET() {
  return NextResponse.json({ content: getHomeContent() });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const content = body?.content as HomeContent | undefined;
  if (
    !content ||
    typeof content !== "object" ||
    !Array.isArray(content.narrativeStatements) ||
    !Array.isArray(content.processSteps)
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const saved = saveHomeContent({
    heroImage: content.heroImage ?? null,
    heroEyebrow: content.heroEyebrow ?? "",
    heroTitle: content.heroTitle ?? "",
    heroSubDisplay: content.heroSubDisplay ?? "",
    heroSubtitle: content.heroSubtitle ?? "",
    heroPrimaryLabel: content.heroPrimaryLabel ?? "",
    heroPrimaryHref: content.heroPrimaryHref ?? "/apply",
    heroSecondaryLabel: content.heroSecondaryLabel ?? "",
    heroSecondaryHref: content.heroSecondaryHref ?? "/venue",
    narrativeLabel: content.narrativeLabel ?? "",
    narrativeTitle: content.narrativeTitle ?? "",
    narrativeLead: content.narrativeLead ?? "",
    narrativeStatements: content.narrativeStatements,
    narrativeClosing: content.narrativeClosing ?? "",
    processLabel: content.processLabel ?? "",
    processTitle: content.processTitle ?? "",
    processSteps: content.processSteps,
  });
  return NextResponse.json({ content: saved });
}
