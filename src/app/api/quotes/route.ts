import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAuditLog, createNotification, createQuote, getCurrentRateTable, listQuotes, notifyAdmins } from "@/lib/db";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import type { QuoteSelection } from "@/lib/pricing/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const quotes =
    user.role === "ADMIN"
      ? listQuotes()
      : user.companyId
        ? listQuotes({ companyId: user.companyId })
        : listQuotes({ applicantId: user.id });
  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const selection = body?.selection as QuoteSelection | undefined;
  if (!selection || typeof selection.packageId !== "number") {
    return NextResponse.json({ error: "패키지를 선택해주세요." }, { status: 400 });
  }

  // 클라이언트가 보낸 금액은 신뢰하지 않고, 서버에서 현재 요금표로 재계산한다.
  const rateTable = getCurrentRateTable();
  const computed = calculateQuote(selection, rateTable);

  const quote = createQuote({
    id: `SA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    applicantId: user.id,
    rateTableVersion: computed.rateTableVersion,
    selection: computed.selection,
    lineItems: computed.lineItems,
    subtotal: computed.subtotal,
    vat: computed.vat,
    total: computed.total,
    meteredNotice: computed.meteredNotice,
    createdAt: new Date().toISOString(),
  });

  addAuditLog({
    id: crypto.randomUUID(),
    quoteId: quote.id,
    stage: "ESTIMATE",
    snapshot: quote,
    actorId: user.id,
    createdAt: quote.createdAt,
  });

  notifyAdmins({
    quoteId: quote.id,
    message: `새 대관 신청서 ${quote.id}가 접수되었습니다.`,
    createdAt: quote.createdAt,
  });

  createNotification({
    id: crypto.randomUUID(),
    recipientId: user.id,
    quoteId: quote.id,
    message: `신청서 ${quote.id}가 정상 접수되었습니다. 운영자 심사 후 결과를 안내해 드립니다.`,
    createdAt: quote.createdAt,
  });

  return NextResponse.json({ quote });
}
