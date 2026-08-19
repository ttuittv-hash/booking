import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import {
  addAuditLog,
  findBlockedDatesAmong,
  getCurrentRateTable,
  getQuoteById,
  listAuditLogsForQuote,
  updateQuoteSelection,
} from "@/lib/db";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import type { QuoteSelection } from "@/lib/pricing/types";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!(await canAccessQuote(user, quote))) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const auditLog = user.role === "ADMIN" ? await listAuditLogsForQuote(id) : [];
  return NextResponse.json({ quote, auditLog });
}

// 신청자가 심사 전(ESTIMATE) 신청서의 내용을 직접 수정할 때 사용한다.
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!(await canAccessQuote(user, quote))) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }
  if (quote.status !== "ESTIMATE") {
    return NextResponse.json({ error: "심사가 시작된 신청서는 수정할 수 없습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const selection = body?.selection as QuoteSelection | undefined;
  if (!selection) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const needsPackage = selection.venueId !== "medium-hall" || selection.bookingMode === "SIMULTANEOUS";
  const needsMidHall = selection.venueId === "medium-hall" || selection.bookingMode === "SIMULTANEOUS";
  if (needsPackage && typeof selection.packageId !== "number") {
    return NextResponse.json({ error: "패키지를 선택해주세요." }, { status: 400 });
  }
  if (needsMidHall && Object.keys(selection.midHallDays ?? {}).length === 0) {
    return NextResponse.json({ error: "중형공연장 일정을 선택해주세요." }, { status: 400 });
  }

  const arenaDates = needsPackage ? resolveSelectedDates(selection) : [];
  const midHallDates = needsMidHall ? Object.keys(selection.midHallDays ?? {}) : [];
  const blockedDates = await findBlockedDatesAmong([...arenaDates, ...midHallDates]);
  if (blockedDates.length > 0) {
    const list = blockedDates.map((b) => `${b.date}${b.reason ? ` (${b.reason})` : ""}`).join(", ");
    return NextResponse.json(
      { error: `선택하신 일정 중 대관 신청이 불가능한 날짜가 있습니다: ${list}` },
      { status: 409 },
    );
  }

  const rateTable = await getCurrentRateTable();
  const computed = calculateQuote(selection, rateTable);
  if (computed.blockingIssues.length > 0) {
    return NextResponse.json({ error: computed.blockingIssues.join(" ") }, { status: 400 });
  }

  const updated = await updateQuoteSelection(id, {
    rateTableVersion: computed.rateTableVersion,
    selection: computed.selection,
    lineItems: computed.lineItems,
    subtotal: computed.subtotal,
    vat: computed.vat,
    total: computed.total,
  });

  await addAuditLog({
    id: crypto.randomUUID(),
    quoteId: id,
    stage: "EDITED",
    snapshot: updated,
    actorId: user.id,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ quote: updated });
}
