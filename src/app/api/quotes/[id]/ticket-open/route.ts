import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser, isProAdminOrAbove } from "@/lib/auth";
import { addAuditLog, ensureTicketOpen, getDepositByQuoteId, getQuoteById, setTicketOpenDate } from "@/lib/db";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  // [보안 2026-09-18] 등급까지 본다 — 화면은 requireProAdminPage() 로 일반관리자(BASIC)를
  // 막는데 이 API 는 role 만 봐서, 콘텐츠 권한만 있는 운영자가 직접 호출할 수 있었다.
  if (!isProAdminOrAbove(user)) {
    return NextResponse.json({ error: "프로 관리자 이상만 티켓 오픈 자료를 다룰 수 있습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

  const deposit = await getDepositByQuoteId(id);
  if (!deposit || deposit.status !== "CONFIRMED") {
    return NextResponse.json({ error: "계약금 입금 확인 후 등록할 수 있습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const openDate = typeof body?.openDate === "string" ? body.openDate : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(openDate)) {
    return NextResponse.json({ error: "티켓오픈일을 선택하세요." }, { status: 400 });
  }

  await ensureTicketOpen(id, new Date().toISOString());
  const ticketOpen = await setTicketOpenDate(id, openDate);
  await addAuditLog({
    id: crypto.randomUUID(),
    quoteId: id,
    stage: "TICKET_OPEN_SET",
    snapshot: ticketOpen,
    actorId: user.id,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ ticketOpen });
}
