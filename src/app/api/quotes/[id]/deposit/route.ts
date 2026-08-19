import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import {
  addAuditLog,
  confirmDeposit,
  createNotification,
  getDepositByQuoteId,
  getQuoteById,
  notifyAdmins,
  reportDeposit,
} from "@/lib/db";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "report") {
    const quote = await getQuoteById(id);
    if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
    if (!(await canAccessQuote(user, quote))) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const deposit = await getDepositByQuoteId(id);
    if (!deposit) return NextResponse.json({ error: "보증금 안내가 아직 없습니다." }, { status: 404 });
    if (deposit.status !== "PENDING") {
      return NextResponse.json({ error: "이미 입금신청되었거나 확인된 보증금입니다." }, { status: 409 });
    }

    const depositorName = typeof body?.depositorName === "string" ? body.depositorName.trim() : "";
    if (!depositorName) {
      return NextResponse.json({ error: "입금자명을 입력하세요." }, { status: 400 });
    }

    const createdAt = new Date().toISOString();
    const updated = await reportDeposit(id, depositorName, createdAt);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage: "DEPOSIT_REPORTED",
      snapshot: updated,
      actorId: user.id,
      createdAt,
    });
    await notifyAdmins({
      quoteId: id,
      message: `${id}의 보증금 입금신청이 접수되었습니다. (입금자명: ${depositorName})`,
      createdAt,
    });
    return NextResponse.json({ deposit: updated });
  }

  if (action === "confirm") {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
    }

    const quote = await getQuoteById(id);
    if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

    const deposit = await getDepositByQuoteId(id);
    if (!deposit) return NextResponse.json({ error: "보증금 안내가 없습니다." }, { status: 404 });
    if (deposit.status !== "REPORTED") {
      return NextResponse.json({ error: "입금신청 상태가 아닙니다." }, { status: 409 });
    }

    const createdAt = new Date().toISOString();
    const updated = await confirmDeposit(id, user.id, createdAt);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage: "DEPOSIT_CONFIRMED",
      snapshot: updated,
      actorId: user.id,
      createdAt,
    });
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: id,
      message: `${id}의 보증금 입금이 확인되었습니다.`,
      createdAt,
    });
    return NextResponse.json({ deposit: updated });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
