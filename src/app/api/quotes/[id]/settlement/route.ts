import { NextResponse } from "next/server";
import { formatAmount, notifyQuoteApplicant } from "@/lib/message/quoteEvents";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import {
  addAuditLog,
  createNotification,
  ensureTaxInvoice,
  getQuoteById,
  setQuoteSettlement,
  withTransaction,
} from "@/lib/db";
import type { Settlement } from "@/lib/pricing/types";

function toEntries(input: unknown): { label: string; amount: number }[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (a): a is { label: string; amount: number } =>
      a && typeof a.label === "string" && typeof a.amount === "number",
  );
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (quote.status !== "CONTRACTED" || !quote.contract) {
    return NextResponse.json({ error: "계약 확정 후에만 정산할 수 있습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const onSiteAdditions = toEntries(body?.onSiteAdditions);
  const unusedDeductions = toEntries(body?.unusedDeductions);
  const meteredActuals = toEntries(body?.meteredActuals);

  const finalTotal =
    quote.contract.contractTotal +
    onSiteAdditions.reduce((sum, a) => sum + a.amount, 0) -
    unusedDeductions.reduce((sum, a) => sum + a.amount, 0) +
    meteredActuals.reduce((sum, a) => sum + a.amount, 0);

  const settlement: Settlement = {
    quoteId: id,
    onSiteAdditions,
    unusedDeductions,
    meteredActuals,
    finalTotal,
    decidedAt: new Date().toISOString(),
    decidedBy: user.id,
  };

  // 정산 확정·감사로그·세금계산서·알림은 한 묶음이다.
  const updated = await withTransaction(async () => {
    const updated = await setQuoteSettlement(id, settlement);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage: "SETTLED",
      snapshot: updated,
      actorId: user.id,
      createdAt: settlement.decidedAt,
    });

    await ensureTaxInvoice(id, "SETTLEMENT", finalTotal, settlement.decidedAt);

    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: id,
      message: `${id}의 최종 정산금액이 ₩${finalTotal.toLocaleString("ko-KR")}으로 확정되었습니다.`,
      createdAt: settlement.decidedAt,
    });

    return updated;
  });

  // RT-08 — 트랜잭션 밖에서 보낸다(백그라운드 발송이 커밋된 커넥션을 물지 않게).
  notifyQuoteApplicant({
    templateCode: "RT-08",
    quoteId: id,
    applicantId: quote.applicantId,
    variables: { 금액: formatAmount(finalTotal) },
    request,
  });
  return NextResponse.json({ quote: updated });
}
