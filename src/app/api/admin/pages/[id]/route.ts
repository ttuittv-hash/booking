import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deletePage, updatePage } from "@/lib/db";

const SLUG_RE = /^[a-z0-9-]+$/;

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const navLabel = typeof body?.navLabel === "string" ? body.navLabel.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const pageBody = typeof body?.body === "string" ? body.body.trim() : "";
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0;

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "슬러그는 영문 소문자·숫자·하이픈만 사용할 수 있습니다." }, { status: 400 });
  }
  if (!navLabel || !title || !pageBody) {
    return NextResponse.json({ error: "탭 이름, 제목, 내용을 입력하세요." }, { status: 400 });
  }

  try {
    const page = await updatePage(id, { slug, navLabel, title, body: pageBody, sortOrder, updatedAt: new Date().toISOString() });
    if (!page) return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ error: "이미 같은 슬러그의 페이지가 있습니다." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  await deletePage(id);
  return NextResponse.json({ ok: true });
}
