import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { blockDate, listDateBlocks, unblockDate } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({ blocks: listDateBlocks() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const block = blockDate(date, reason);
  return NextResponse.json({ block });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  unblockDate(date);
  return NextResponse.json({ ok: true });
}
