import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureTicketOpen, getDepositByQuoteId, getQuoteById, setTicketOpenDate } from "@/lib/db";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const quote = getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

  const deposit = getDepositByQuoteId(id);
  if (!deposit || deposit.status !== "CONFIRMED") {
    return NextResponse.json({ error: "보증금 입금 확인 후 등록할 수 있습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const openDate = typeof body?.openDate === "string" ? body.openDate : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(openDate)) {
    return NextResponse.json({ error: "티켓오픈일을 선택하세요." }, { status: 400 });
  }

  ensureTicketOpen(id, new Date().toISOString());
  const ticketOpen = setTicketOpenDate(id, openDate);
  return NextResponse.json({ ticketOpen });
}
