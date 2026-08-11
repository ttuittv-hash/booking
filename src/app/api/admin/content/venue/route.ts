import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVenueContent, saveVenueContent } from "@/lib/db";
import type { VenueContent } from "@/lib/content/types";

export async function GET() {
  return NextResponse.json({ content: await getVenueContent() });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const content = body?.content as VenueContent | undefined;
  if (!content || !Array.isArray(content.halls) || !Array.isArray(content.specs)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const saved = await saveVenueContent(content);
  return NextResponse.json({ content: saved });
}
