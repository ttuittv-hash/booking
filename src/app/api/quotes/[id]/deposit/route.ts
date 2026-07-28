import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { confirmDeposit, getDepositByQuoteId, getQuoteById, reportDeposit } from "@/lib/db";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "report") {
    const quote = getQuoteById(id);
    if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
    if (quote.applicantId !== user.id) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const deposit = getDepositByQuoteId(id);
    if (!deposit) return NextResponse.json({ error: "보증금 안내가 아직 없습니다." }, { status: 404 });
    if (deposit.status !== "PENDING") {
      return NextResponse.json({ error: "이미 입금신청되었거나 확인된 보증금입니다." }, { status: 409 });
    }

    const depositorName = typeof body?.depositorName === "string" ? body.depositorName.trim() : "";
    if (!depositorName) {
      return NextResponse.json({ error: "입금자명을 입력하세요." }, { status: 400 });
    }

    const updated = reportDeposit(id, depositorName, new Date().toISOString());
    return NextResponse.json({ deposit: updated });
  }

  if (action === "confirm") {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
    }

    const deposit = getDepositByQuoteId(id);
    if (!deposit) return NextResponse.json({ error: "보증금 안내가 없습니다." }, { status: 404 });
    if (deposit.status !== "REPORTED") {
      return NextResponse.json({ error: "입금신청 상태가 아닙니다." }, { status: 409 });
    }

    const updated = confirmDeposit(id, user.id, new Date().toISOString());
    return NextResponse.json({ deposit: updated });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
