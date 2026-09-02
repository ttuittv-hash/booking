import { NextResponse } from "next/server";
import { notifyQuoteApplicant } from "@/lib/message/quoteEvents";
import crypto from "node:crypto";
import { canActOnQuotes, getCurrentUser } from "@/lib/auth";
import {
  addAuditLog,
  withTransaction,
  createNotification,
  createQuote,
  findBlockedDatesAmong,
  getCurrentRateTable,
  listQuotes,
  listQuotesPaged,
  nextQuoteNumber,
  notifyAdmins,
} from "@/lib/db";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import type { QuoteSelection } from "@/lib/pricing/types";

function formatBlockedDatesError(blocked: { date: string; reason: string | null }[]): string {
  const list = blocked
    .map((b) => `${b.date}${b.reason ? ` (${b.reason})` : ""}`)
    .join(", ");
  return `선택하신 일정 중 대관 신청이 불가능한 날짜가 있습니다: ${list}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const quotes =
    user.role === "ADMIN"
      ? (await listQuotesPaged({}, 1, 100)).items // 전체 덤프는 막는다 — 운영 목록은 페이지 화면이 따로 있다
      : user.companyId
        ? await listQuotes({ companyId: user.companyId })
        : await listQuotes({ applicantId: user.id });
  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  // 화면(/apply)은 승인 완료 계정만 열리지만 API 는 로그인만 보고 있었다(2026-08-28 보안 점검).
  if (!canActOnQuotes(user)) {
    return NextResponse.json({ error: "승인 완료 후 이용할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const selection = body?.selection as QuoteSelection | undefined;
  if (!selection) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  // 아레나(패키지 필요)는 SINGLE·SIMULTANEOUS 모두, 중형(DAILY, 패키지 없음)은
  // SIMULTANEOUS·중형 단독일 때 필요하다 — 동시 대관은 두 조건을 동시에 만족해야 한다.
  const needsPackage = selection.venueId !== "medium-hall" || selection.bookingMode === "SIMULTANEOUS";
  const needsMidHall = selection.venueId === "medium-hall" || selection.bookingMode === "SIMULTANEOUS";
  if (needsPackage && typeof selection.packageId !== "number") {
    return NextResponse.json({ error: "패키지를 선택해주세요." }, { status: 400 });
  }
  if (needsMidHall && Object.keys(selection.midHallDays ?? {}).length === 0) {
    return NextResponse.json({ error: "중형공연장 일정을 선택해주세요." }, { status: 400 });
  }

  const arenaDates = needsPackage ? resolveSelectedDates(selection) : [];
  // 「패키지」는 needsMidHall 이 false 지만 중형 날짜를 잡는다 — 조건을 걸면 운영자가
  // 막아 둔 중형 날짜가 그대로 통과한다(2026-09-02). 잡힌 날짜가 있으면 늘 검사한다.
  const midHallDates = Object.keys(selection.midHallDays ?? {});
  const blockedDates = [
    ...(await findBlockedDatesAmong(arenaDates, "arena")),
    ...(await findBlockedDatesAmong(midHallDates, "medium-hall")),
  ];
  if (blockedDates.length > 0) {
    return NextResponse.json({ error: formatBlockedDatesError(blockedDates) }, { status: 409 });
  }

  // 클라이언트가 보낸 금액은 신뢰하지 않고, 서버에서 현재 요금표로 재계산한다.
  const rateTable = await getCurrentRateTable();
  const computed = calculateQuote(selection, rateTable);
  if (computed.blockingIssues.length > 0) {
    return NextResponse.json({ error: computed.blockingIssues.join(" ") }, { status: 400 });
  }

  // 신청서·이력·알림은 한 묶음이다 — 중간에 실패하면 전부 되돌린다.
  const quote = await withTransaction(async () => {
    const quote = await createQuote({
      id: await nextQuoteNumber(new Date()),
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

    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: quote.id,
      stage: "SUBMITTED",
      snapshot: quote,
      actorId: user.id,
      createdAt: quote.createdAt,
    });

    await notifyAdmins({
      quoteId: quote.id,
      message: `새 대관 신청서 ${quote.id}가 접수되었습니다.`,
      createdAt: quote.createdAt,
    });

    await createNotification({
      id: crypto.randomUUID(),
      recipientId: user.id,
      quoteId: quote.id,
      message: `신청서 ${quote.id}가 정상 접수되었습니다. 운영자 심사 후 결과를 안내해 드립니다.`,
      createdAt: quote.createdAt,
    });

    return quote;
  });

  // RT-01 대관 신청 접수 — 트랜잭션 밖에서 보낸다(백그라운드 발송이 커밋된 커넥션을 물지 않게).
  notifyQuoteApplicant({ templateCode: "RT-01", quoteId: quote.id, applicantId: user.id, variables: {}, request });

  return NextResponse.json({ quote });
}
