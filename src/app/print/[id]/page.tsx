import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import { findUserById, getQuoteById } from "@/lib/db";
import { num, won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
} from "@/lib/pricing/types";
import { PrintButton } from "@/components/PrintButton";

/**
 * 인쇄 전용 화면. 흑백 가독성이 최우선이므로 색면(옐로·서페이스)은 화면에서만 쓰고
 * 인쇄에서는 모두 제거한다(`print:bg-transparent`). 구분은 헤어라인 표로만.
 * 폰트는 전부 토큰(text-s / text-xs)으로, 라디우스는 쓰지 않는다.
 */
export default async function PrintQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const quote = getQuoteById(id);
  if (!quote) notFound();
  if (!canAccessQuote(user, quote)) notFound();

  const applicant = findUserById(quote.applicantId);

  return (
    <div className="mx-auto max-w-3xl bg-surface px-8 py-10 text-s text-foreground print:max-w-none print:bg-transparent print:px-0 print:py-0">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-border/25 px-4 py-3 print:hidden">
        <span className="text-xs text-muted">
          브라우저 인쇄 대화상자에서 대상을 &quot;PDF로 저장&quot;으로 선택하면 PDF 파일로 저장됩니다.
        </span>
        <PrintButton />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <div className="type-display text-h5-m sm:text-h5">Seoul Arena</div>
          <div className="mt-1 text-xs text-muted">대관 신청서 (예상 견적 기준)</div>
        </div>
        <dl className="text-right text-xs text-muted">
          <div>
            <dt className="inline">신청번호 </dt>
            <dd className="inline tabular-nums text-foreground">{quote.id}</dd>
          </div>
          <div className="mt-0.5">
            <dt className="inline">신청일시 </dt>
            <dd className="inline tabular-nums text-foreground">
              {new Date(quote.createdAt).toLocaleString("ko-KR")}
            </dd>
          </div>
        </dl>
      </header>

      <section className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-bold text-muted">신청자 정보</h2>
          <dl className="mt-3 border-t border-border/40">
            <SpecRow label="담당자" value={applicant?.name ?? "—"} />
            <SpecRow label="회사/기획사" value={applicant?.companyName ?? "—"} />
            <SpecRow label="이메일" value={applicant?.email ?? "—"} />
          </dl>
        </div>
        <div>
          <h2 className="text-xs font-bold text-muted">대관 일정</h2>
          <dl className="mt-3 border-t border-border/40">
            <SpecRow
              label="공간"
              value={
                VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "—"
              }
            />
            <SpecRow
              label="주차"
              value={`${quote.selection.week.year}년 ${quote.selection.week.month}월 ${quote.selection.week.weekOfMonth}주차`}
            />
            <SpecRow label="총 대관일수" value={`${totalRentalDays(quote.selection)}일`} />
            <SpecRow label="예상 관객" value={`${quote.selection.expectedAudience.toLocaleString()}명`} />
          </dl>
        </div>
      </section>

      {quote.selection.performanceInfo && (
        <section className="mt-8 grid gap-8 break-inside-avoid sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-bold text-muted">공연 정보</h2>
            <dl className="mt-3 border-t border-border/40">
              <SpecRow label="공연(행사)명" value={quote.selection.performanceInfo.eventName || "—"} />
              <SpecRow label="아티스트" value={quote.selection.performanceInfo.artist || "—"} />
              <SpecRow label="주최·주관·기획" value={quote.selection.performanceInfo.organizer || "—"} />
              <SpecRow label="행사규모" value={quote.selection.performanceInfo.eventScale || "—"} />
            </dl>
          </div>
          <div>
            <h2 className="text-xs font-bold text-muted">공연 구성</h2>
            <dl className="mt-3 border-t border-border/40">
              <SpecRow
                label="행사유형"
                value={
                  quote.selection.performanceInfo.eventTypes.length
                    ? quote.selection.performanceInfo.eventTypes.map((t) => EVENT_TYPE_LABEL[t]).join(", ")
                    : "—"
                }
              />
              <SpecRow
                label="무대형태"
                value={
                  quote.selection.performanceInfo.stageTypes.length
                    ? quote.selection.performanceInfo.stageTypes.map((t) => STAGE_TYPE_LABEL[t]).join(", ")
                    : "—"
                }
              />
              <SpecRow
                label="객석형태"
                value={
                  quote.selection.performanceInfo.seatingTypes.length
                    ? quote.selection.performanceInfo.seatingTypes.map((t) => SEATING_TYPE_LABEL[t]).join(", ")
                    : "—"
                }
              />
              <SpecRow
                label="수납식 객석 사용여부"
                value={
                  quote.selection.performanceInfo.retractableSeatUse
                    ? RETRACTABLE_SEAT_USE_LABEL[quote.selection.performanceInfo.retractableSeatUse]
                    : "—"
                }
              />
            </dl>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xs font-bold text-muted">산출내역서</h2>
        <table className="mt-3 w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-foreground text-left">
              <th className="py-2 pr-3 font-bold">항목</th>
              <th className="py-2 pr-3 text-right font-bold">신청 (수량)</th>
              <th className="py-2 pr-3 text-right font-bold">기본포함 (수량)</th>
              <th className="py-2 pr-3 text-right font-bold">과금 (수량)</th>
              <th className="py-2 pr-3 text-right font-bold">단가 (원)</th>
              <th className="py-2 text-right font-bold">금액 (원)</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((item) => (
              <tr key={item.addonId} className="border-b border-border/40 tabular-nums">
                <td className="py-2 pr-3">{item.label}</td>
                <td className="py-2 pr-3 text-right">{item.requested.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right">{item.included ? item.included.toLocaleString() : "—"}</td>
                <td className="py-2 pr-3 text-right">{item.billable.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right">{num(item.unitPrice)}</td>
                <td className="py-2 text-right">{num(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto w-full max-w-xs">
          <div className="flex justify-between border-b border-border/40 py-1.5 text-xs">
            <dt className="text-muted">소계 (VAT 별도)</dt>
            <dd className="tabular-nums">{won(quote.subtotal)}</dd>
          </div>
          <div className="flex justify-between border-b border-border/40 py-1.5 text-xs">
            <dt className="text-muted">VAT</dt>
            <dd className="tabular-nums">{won(quote.vat)}</dd>
          </div>
          <div className="flex justify-between border-b-2 border-foreground py-2 font-bold">
            <dt>신청 예상금액</dt>
            <dd className="tabular-nums">{won(quote.total)}</dd>
          </div>
        </dl>
      </section>

      {quote.contract && (
        <section className="mt-10 break-inside-avoid">
          <h2 className="text-xs font-bold text-muted">계약금액</h2>
          <dl className="mt-3 border-t border-border/40">
            {quote.contract.adjustments.map((a, i) => (
              <div key={i} className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-xs">
                <dt>
                  {a.label} {a.reason && `(${a.reason})`}
                </dt>
                <dd className="tabular-nums">{won(a.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-b-2 border-foreground py-2 font-bold">
              <dt>계약금액 (확정일 {new Date(quote.contract.decidedAt).toLocaleDateString("ko-KR")})</dt>
              <dd className="tabular-nums">{won(quote.contract.contractTotal)}</dd>
            </div>
          </dl>
        </section>
      )}

      {quote.settlement && (
        <section className="mt-10 break-inside-avoid">
          <h2 className="text-xs font-bold text-muted">최종 정산금액</h2>
          <dl className="mt-3 border-t border-border/40">
            <div className="flex justify-between gap-4 border-b-2 border-foreground py-2 font-bold">
              <dt>정산금액 (확정일 {new Date(quote.settlement.decidedAt).toLocaleDateString("ko-KR")})</dt>
              <dd className="tabular-nums">{won(quote.settlement.finalTotal)}</dd>
            </div>
          </dl>
        </section>
      )}

      <p className="mt-12 border-t border-border/40 pt-4 text-xs text-muted">
        {quote.meteredNotice} 본 문서의 &quot;신청 예상금액&quot;은 확정 금액이 아니며, 계약금액·정산금액이
        확정되기 전까지는 참고용입니다. 요금표 버전: {quote.rateTableVersion}
      </p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-xs">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
