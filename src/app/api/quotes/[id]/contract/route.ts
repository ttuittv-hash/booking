import { NextResponse } from "next/server";
import { formatAmount, notifyQuoteApplicant } from "@/lib/message/quoteEvents";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import {
  addAuditLog,
  createDeposit,
  createNotification,
  ensureContractSignature,
  ensureTaxInvoice,
  getQuoteById,
  setQuoteContract,
  withTransaction,
} from "@/lib/db";
import type { ContractAdjustment } from "@/lib/pricing/types";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (quote.status !== "ESTIMATE") {
    return NextResponse.json({ error: "이미 계약 처리된 신청서입니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const adjustments = Array.isArray(body?.adjustments)
    ? (body.adjustments as { label: string; amount: number; reason: string }[]).filter(
        (a) => typeof a.label === "string" && typeof a.amount === "number",
      )
    : [];

  const depositRateInput = Number(body?.depositRate);
  const depositRate = Number.isFinite(depositRateInput) && depositRateInput >= 0 ? depositRateInput : 10;

  const contractTotal = quote.total + adjustments.reduce((sum, a) => sum + a.amount, 0);
  const contract: ContractAdjustment = {
    quoteId: id,
    adjustments,
    contractTotal,
    decidedAt: new Date().toISOString(),
    decidedBy: user.id,
  };

  // 계약 확정은 신청서 상태·감사로그·보증금·전자날인·세금계산서·알림이 한 묶음이다.
  // 중간에 실패해서 "계약은 확정됐는데 보증금 레코드가 없는" 상태가 남으면 안 된다.
  const { updated, deposit } = await withTransaction(async () => {
    const updated = await setQuoteContract(id, contract);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage: "CONTRACTED",
      snapshot: updated,
      actorId: user.id,
      createdAt: contract.decidedAt,
    });

    const deposit = await createDeposit({
      id: crypto.randomUUID(),
      quoteId: id,
      requiredAmount: Math.round((contractTotal * depositRate) / 100),
      depositRate,
      createdAt: contract.decidedAt,
    });

    await ensureContractSignature(id, contract.decidedAt);
    await ensureTaxInvoice(id, "CONTRACT", contractTotal, contract.decidedAt);

    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: id,
      message: `${id}의 계약금액이 ₩${contractTotal.toLocaleString("ko-KR")}으로 확정되었습니다.`,
      createdAt: contract.decidedAt,
    });

    return { updated, deposit };
  });

  // RT-03 — 트랜잭션 밖에서 보낸다(백그라운드 발송이 커밋된 커넥션을 물지 않게).
  notifyQuoteApplicant({
    templateCode: "RT-03",
    quoteId: id,
    applicantId: quote.applicantId,
    variables: { 금액: formatAmount(contractTotal) },
    request,
  });
  return NextResponse.json({ quote: updated, deposit });
}
