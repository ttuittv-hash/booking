import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { blockWeek, listWeekBlocks, unblockWeek } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  return NextResponse.json({ blocks: listWeekBlocks(year) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const year = Number(body?.year);
  const month = Number(body?.month);
  const weekOfMonth = Number(body?.weekOfMonth);
  const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(weekOfMonth)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const block = blockWeek({ year, month, weekOfMonth, reason });
  return NextResponse.json({ block });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const year = Number(body?.year);
  const month = Number(body?.month);
  const weekOfMonth = Number(body?.weekOfMonth);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(weekOfMonth)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  unblockWeek(year, month, weekOfMonth);
  return NextResponse.json({ ok: true });
}
