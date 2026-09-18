import { NextResponse } from "next/server";
import { canAccessQuote, canActOnQuotes, getCurrentUser } from "@/lib/auth";
import { getQuoteById, notifyAdmins, setQuoteReview } from "@/lib/db";

/**
 * [신규 2026-09-18] 보완 제출 — 보류(보완 요청)를 받은 신청자가 자료를 올린 뒤 "다 냈습니다"
 * 하고 프로세스를 닫는 자리(nora).
 *
 * 보류 상태는 **그대로 둔다.** decision 을 지우면 보류 사유·점수·심사자 이력이 함께
 * 사라진다 — 운영자는 「보완 제출됨」 표시를 보고 다시 심사하면 된다. 여기서 하는 일은
 * 제출 시각을 남기고 운영자에게 알리는 것뿐이다.
 *
 * 알림은 인앱만 보낸다. 알림톡은 새 템플릿을 카카오에 등록하고 검수를 받아야 해서
 * 며칠 걸린다 — 승인되면 이 자리에 notifyQuoteApplicant 처럼 한 줄 얹으면 된다.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!(await canAccessQuote(user, quote))) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }
  if (!canActOnQuotes(user)) {
    return NextResponse.json({ error: "승인 완료 후 이용할 수 있습니다." }, { status: 403 });
  }

  const review = quote.review;
  if (!review || review.decision !== "HOLD") {
    return NextResponse.json(
      { error: "보완 요청(보류)을 받은 신청서만 보완 제출을 할 수 있습니다." },
      { status: 409 },
    );
  }
  if (review.supplementSubmittedAt) {
    return NextResponse.json(
      { error: "이미 보완 제출을 마쳤습니다. 추가 자료가 필요하면 운영자에게 문의해 주세요." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  // 기존 심사 기록을 펼쳐서 보존한다 — 보류 사유·점수·심사자를 덮어쓰면 안 된다.
  await setQuoteReview(id, { ...review, supplementSubmittedAt: now });

  // 트랜잭션 밖이다(알림이 커밋되지 않은 커넥션을 물면 안 된다 — AGENTS.md).
  await notifyAdmins({
    quoteId: id,
    link: `/admin/${id}`,
    message: `${id} 보완 자료가 제출되었습니다. 확인 후 심사를 진행해 주세요.`,
    createdAt: now,
  });

  return NextResponse.json({ supplementSubmittedAt: now });
}
