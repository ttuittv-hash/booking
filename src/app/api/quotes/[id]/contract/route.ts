import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAuditLog, createDeposit, getQuoteById, setQuoteContract } from "@/lib/db";
import type { ContractAdjustment } from "@/lib/pricing/types";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const quote = getQuoteById(id);
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

  const updated = setQuoteContract(id, contract);
  addAuditLog({
    id: crypto.randomUUID(),
    quoteId: id,
    stage: "CONTRACTED",
    snapshot: updated,
    actorId: user.id,
    createdAt: contract.decidedAt,
  });

  const deposit = createDeposit({
    id: crypto.randomUUID(),
    quoteId: id,
    requiredAmount: Math.round((contractTotal * depositRate) / 100),
    depositRate,
    createdAt: contract.decidedAt,
  });

  return NextResponse.json({ quote: updated, deposit });
}
