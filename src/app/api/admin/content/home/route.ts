import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getHomeContent, saveHomeContent } from "@/lib/db";
import type { HomeContent } from "@/lib/content/types";

export async function GET() {
  return NextResponse.json({ content: await getHomeContent() });
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
    !Array.isArray(content.narrativeStatements)
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const saved = await saveHomeContent({
    heroImage: content.heroImage ?? null,
    heroTitle: content.heroTitle ?? "",
    heroSubtitle: content.heroSubtitle ?? "",
    heroPrimaryLabel: content.heroPrimaryLabel ?? "",
    heroPrimaryHref: content.heroPrimaryHref ?? "/register",
    heroSecondaryLabel: content.heroSecondaryLabel ?? "",
    heroSecondaryHref: content.heroSecondaryHref ?? "/guide",
    narrativeLabel: content.narrativeLabel ?? "",
    narrativeTitle: content.narrativeTitle ?? "",
    narrativeLead: content.narrativeLead ?? "",
    narrativeStatements: content.narrativeStatements,
    narrativeClosing: content.narrativeClosing ?? "",
  });
  return NextResponse.json({ content: saved });
}
