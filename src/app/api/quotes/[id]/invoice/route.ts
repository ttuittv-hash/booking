import { NextResponse } from "next/server";
import { notifyQuoteApplicant } from "@/lib/message/quoteEvents";
import crypto from "node:crypto";
import { canAccessQuote, canActOnQuotes, getCurrentUser } from "@/lib/auth";
import {
  addAuditLog,
  confirmTaxInvoicePayment,
  createNotification,
  ensureTaxInvoice,
  getQuoteById,
  getTaxInvoice,
  issueTaxInvoice,
  notifyAdmins,
  reportTaxInvoicePayment,
} from "@/lib/db";
import type { InvoicePurpose } from "@/lib/pricing/types";

const PURPOSE_LABEL: Record<InvoicePurpose, string> = {
  CONTRACT: "계약금",
  CONTRACT_BALANCE: "잔금",
  SETTLEMENT: "정산금",
};

// 세금계산서 발행/입금신청/입금확인 — 계약금(CONTRACT)·잔금(CONTRACT_BALANCE)·정산(SETTLEMENT)
// 공용 엔드포인트. 정식 세금계산서 발행 서비스 연동 전까지는 계약금(Deposit)과 동일한
// 운영자 수동 확인 방식으로 운영한다.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!(await canAccessQuote(user, quote))) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const purpose = body?.purpose as InvoicePurpose;
  if (purpose !== "CONTRACT" && purpose !== "CONTRACT_BALANCE" && purpose !== "SETTLEMENT") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const label = PURPOSE_LABEL[purpose];

  // 잔금(CONTRACT_BALANCE)은 계약금과 달리 계약 확정 시점에 자동으로 만들어두지
  // 않는다 — 계약금:잔금 비율·청구 시점이 아직 확정되지 않아, 운영자가 필요할 때
  // 직접 금액을 정해 청구서를 만든다(2026-08-22 대관료 정산프로세스 반영).
  if (purpose === "CONTRACT_BALANCE" && body.action === "create") {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "운영자만 잔금 청구서를 만들 수 있습니다." }, { status: 403 });
    }
    if (!quote.contract) {
      return NextResponse.json({ error: "계약이 확정된 신청서만 잔금을 청구할 수 있습니다." }, { status: 409 });
    }
    if (await getTaxInvoice(id, "CONTRACT_BALANCE")) {
      return NextResponse.json({ error: "이미 잔금 청구서가 있습니다." }, { status: 409 });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "잔금 청구 금액을 입력하세요." }, { status: 400 });
    }
    // 계약금(CONTRACT)이 계약 확정 시점에 조용히 PENDING으로 만들어지는 것과 같은 수준의
    // 사건이라, 별도 감사로그는 남기지 않는다 — 실제 청구 행위는 이후 "발행"(issue)부터다.
    const invoice = await ensureTaxInvoice(id, "CONTRACT_BALANCE", amount, now);
    return NextResponse.json({ invoice });
  }

  const invoice = await getTaxInvoice(id, purpose);
  if (!invoice) {
    return NextResponse.json({ error: "세금계산서 대상이 없습니다." }, { status: 404 });
  }

  if (body.action === "issue") {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "운영자만 발행할 수 있습니다." }, { status: 403 });
    }
    if (invoice.status !== "PENDING") {
      return NextResponse.json({ error: "이미 발행된 세금계산서입니다." }, { status: 409 });
    }
    const updated = await issueTaxInvoice(id, purpose, user.id, now);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage: "INVOICE_ISSUED",
      snapshot: updated,
      actorId: user.id,
      createdAt: now,
    });
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: id,
      message: `${id}의 ${label} 세금계산서가 발행되었습니다. 입금 후 입금신청을 진행해주세요.`,
      createdAt: now,
    });
    notifyQuoteApplicant({ templateCode: "RT-05", quoteId: id, applicantId: quote.applicantId, eventKey: purpose, variables: { 구분: label }, request });
    return NextResponse.json({ invoice: updated });
  }

  if (body.action === "report") {
    // 신청자 쪽 변경(입금신청)은 deposit report 와 같은 선에서 승인 완료(또는 운영자)만.
    if (!canActOnQuotes(user)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (invoice.status !== "ISSUED") {
      return NextResponse.json({ error: "발행된 세금계산서만 입금신청할 수 있습니다." }, { status: 409 });
    }
    const payerName = typeof body.payerName === "string" ? body.payerName.trim() : "";
    if (!payerName) return NextResponse.json({ error: "입금자명을 입력하세요." }, { status: 400 });
    const updated = await reportTaxInvoicePayment(id, purpose, payerName, now);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage: "INVOICE_PAYMENT_REPORTED",
      snapshot: updated,
      actorId: user.id,
      createdAt: now,
    });
    await notifyAdmins({
      quoteId: id,
      message: `${id}의 ${label} 세금계산서 입금신청이 접수되었습니다. (입금자: ${payerName})`,
      createdAt: now,
    });
    return NextResponse.json({ invoice: updated });
  }

  if (body.action === "confirm") {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "운영자만 확인할 수 있습니다." }, { status: 403 });
    }
    if (invoice.status !== "REPORTED") {
      return NextResponse.json({ error: "입금신청된 건만 확인할 수 있습니다." }, { status: 409 });
    }
    const updated = await confirmTaxInvoicePayment(id, purpose, user.id, now);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage: "INVOICE_PAYMENT_CONFIRMED",
      snapshot: updated,
      actorId: user.id,
      createdAt: now,
    });
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: id,
      message: `${id}의 ${label} 입금이 확인되었습니다.`,
      createdAt: now,
    });
    notifyQuoteApplicant({ templateCode: "RT-06", quoteId: id, applicantId: quote.applicantId, eventKey: purpose, variables: { 구분: label }, request });
    return NextResponse.json({ invoice: updated });
  }

  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}
