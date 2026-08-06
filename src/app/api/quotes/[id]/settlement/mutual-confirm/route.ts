import { NextResponse } from "next/server";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import { confirmSettlementMutual, getQuoteById } from "@/lib/db";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!canAccessQuote(user, quote)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }
  if (!quote.settlement) {
    return NextResponse.json({ error: "정산 확정 후 확인할 수 있습니다." }, { status: 409 });
  }
  if (quote.settlement.mutualConfirmedAt) {
    return NextResponse.json({ error: "이미 확인된 정산 내역입니다." }, { status: 409 });
  }

  const updated = confirmSettlementMutual(id, user.id, new Date().toISOString());
  return NextResponse.json({ quote: updated });
}
