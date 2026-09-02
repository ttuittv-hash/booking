"use client";

/*
  심사용 [신청 내역 보기] 레이어 (2026-09-02).

  운영자가 심사할 때 필요한 것은 "이 사람이 무엇을 써서 냈는가" 전부다. 그런데 상세
  화면은 심사·계약·정산 패널이 함께 있어 신청 내용이 그 사이에 흩어져 있었고, 일부
  항목(책임자·아티스트 이력·티켓 가격·공공 참여·마케팅 협조)은 아예 보이지 않았다.
  그래서 화면을 떠나지 않고 신청서만 통째로 펼쳐 보는 레이어를 둔다.

  여기는 **읽기 전용**이다. 심사 액션은 뒤 화면에 그대로 있고, 이 레이어는 근거를
  확인하는 자리다 — 값을 고칠 수 있게 만들면 "본 것"과 "바꾼 것"이 섞인다.
*/

import { useEffect, useState } from "react";
import { won } from "@/lib/format";
import { btnClass } from "@/components/ui/kit";
import {
  AGE_RATING_LABEL,
  ANCILLARY_BUSINESS_PLAN_LABEL,
  APPLICANT_COMPANY_TYPE_LABEL,
  CAST_CONTRACT_STATUS_LABEL,
  EVENT_TYPE_LABEL,
  ORGANIZER_ROLE_LABEL,
  PUBLIC_INTEREST_ITEM_LABEL,
  RETRACTABLE_SEAT_FLOOR_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  type Quote,
  type RetractableSeatFloor,
} from "@/lib/pricing/types";

const NONE = "—";

/** 값이 비면 대시 하나로 — 빈칸을 그대로 두면 "안 낸 것"인지 "화면이 빠뜨린 것"인지 모른다. */
function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return NONE;
  const s = String(value).trim();
  return s === "" ? NONE : s;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-border/15 py-2.5 last:border-b-0">
      <dt className="w-40 shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-keep text-s">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-foreground pt-4">
      <h3 className="text-s font-bold">{title}</h3>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

/** 표 형태의 반복 입력(이력·티켓 유형 등). 행이 없으면 섹션째 비어 보이지 않게 한 줄 남긴다. */
function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="py-2.5 text-s text-muted">{NONE}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-s">
        <thead>
          <tr className="border-b border-border-soft bg-background text-left">
            {head.map((h) => (
              <th key={h} className="px-2 py-1.5 text-xs font-bold text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/15">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 align-top">
                  {text(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface QuoteSheetMeta {
  applicantName: string;
  applicantEmail: string;
  companyName: string;
  createdAtLabel: string;
  statusLabel: string;
  /** 일정 — 서버에서 미리 문자열로 만든다(toLocale* 는 서버·브라우저가 갈린다) */
  scheduleLines: string[];
  attachmentNames: string[];
}

export function QuoteDetailSheetButton({ quote, meta }: { quote: Quote; meta: QuoteSheetMeta }) {
  const [open, setOpen] = useState(false);

  // 레이어가 열려 있는 동안 뒤 화면이 같이 스크롤되면 어디를 보고 있었는지 잃는다.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass("primary", "md")}>
        신청 내역 보기
      </button>
      {open ? <Sheet quote={quote} meta={meta} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Sheet({
  quote,
  meta,
  onClose,
}: {
  quote: Quote;
  meta: QuoteSheetMeta;
  onClose: () => void;
}) {
  const s = quote.selection;
  const info = s.performanceInfo;
  const marketing = s.marketingCooperation;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-stretch justify-center bg-foreground/40 p-0 sm:items-center sm:p-6"
      // 바깥을 눌러 닫는다. 안쪽 클릭이 올라와 닫히지 않도록 패널에서 전파를 멈춘다.
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="신청 내역"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-4xl flex-col bg-background sm:h-[90vh]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-foreground px-5 py-4">
          <div className="min-w-0">
            <p className="text-h6-m font-bold">신청 내역</p>
            <p className="mt-1 truncate text-xs text-muted">
              {quote.id} · {meta.applicantName} · {meta.companyName} · {meta.statusLabel}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href={`/print/${quote.id}`} className={btnClass("secondary", "sm")}>
              인쇄
            </a>
            <button type="button" onClick={onClose} className={btnClass("secondary", "sm")}>
              닫기
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Section title="접수 정보">
            <Row label="신청번호" value={quote.id} />
            <Row label="신청일시" value={meta.createdAtLabel} />
            <Row label="상태" value={meta.statusLabel} />
            <Row label="신청자" value={`${meta.applicantName} (${meta.applicantEmail})`} />
            <Row label="회사" value={meta.companyName} />
            {info ? (
              <>
                <Row
                  label="기업 유형"
                  value={
                    info.applicantCompanyType
                      ? APPLICANT_COMPANY_TYPE_LABEL[info.applicantCompanyType]
                      : NONE
                  }
                />
                <Row label="사업자등록번호" value={text(info.applicantBusinessRegistrationNumber)} />
                <Row label="대표자" value={text(info.applicantRepresentativeName)} />
                <Row
                  label="담당자"
                  value={`${text(info.applicantContactName)} · ${text(info.applicantContactPhone)}`}
                />
              </>
            ) : null}
          </Section>

          <Section title="일정 · 규모">
            {meta.scheduleLines.length > 0 ? (
              meta.scheduleLines.map((line, i) => <Row key={i} label={i === 0 ? "대관일정" : ""} value={line} />)
            ) : (
              <Row label="대관일정" value={NONE} />
            )}
            <Row
              label="주차"
              value={`${s.week.year}.${s.week.month} ${s.week.weekOfMonth}주차`}
            />
            <Row label="예상 관객" value={`${s.expectedAudience.toLocaleString("ko-KR")}명`} />
          </Section>

          {info ? (
            <>
              <Section title="공연 정보">
                <Row label="공연(행사)명" value={text(info.eventName)} />
                <Row label="아티스트" value={text(info.artist)} />
                <Row
                  label="주최 · 주관 · 기획"
                  value={
                    info.organizers && info.organizers.length > 0
                      ? info.organizers
                          .map((o) => `${ORGANIZER_ROLE_LABEL[o.role]} ${o.name}`)
                          .join(" · ")
                      : text(info.organizer)
                  }
                />
                <Row label="행사규모" value={text(info.eventScale)} />
                <Row
                  label="행사유형"
                  value={
                    info.eventTypes.length
                      ? info.eventTypes.map((t) => EVENT_TYPE_LABEL[t]).join(", ")
                      : NONE
                  }
                />
                <Row
                  label="공연등급"
                  value={
                    info.ageRating
                      ? `${AGE_RATING_LABEL[info.ageRating]}${info.ageLimitDetail ? ` (${info.ageLimitDetail})` : ""}`
                      : NONE
                  }
                />
                <Row
                  label="무대형태"
                  value={
                    info.stageTypes.length
                      ? `${info.stageTypes.map((t) => STAGE_TYPE_LABEL[t]).join(", ")}${info.stageTypeOtherDetail ? ` — ${info.stageTypeOtherDetail}` : ""}`
                      : NONE
                  }
                />
                <Row
                  label="객석형태"
                  value={
                    info.seatingTypes.length
                      ? `${info.seatingTypes.map((t) => SEATING_TYPE_LABEL[t]).join(", ")}${info.seatingTypeOtherDetail ? ` — ${info.seatingTypeOtherDetail}` : ""}`
                      : NONE
                  }
                />
                <Row
                  label="수납식 객석"
                  value={
                    info.retractableSeatUse
                      ? `${RETRACTABLE_SEAT_USE_LABEL[info.retractableSeatUse]}${
                          info.retractableSeatFloorUse
                            ? ` (${(Object.keys(RETRACTABLE_SEAT_FLOOR_LABEL) as RetractableSeatFloor[])
                                .filter((f) => info.retractableSeatFloorUse?.[f])
                                .map(
                                  (f) =>
                                    `${RETRACTABLE_SEAT_FLOOR_LABEL[f]} ${RETRACTABLE_SEAT_USE_LABEL[info.retractableSeatFloorUse![f]!]}`,
                                )
                                .join(" · ")})`
                            : ""
                        }`
                      : NONE
                  }
                />
                <Row label="철수 완료 예정시간" value={text(info.teardownCompletionTime)} />
                <Row label="티켓 오픈 예정일" value={text(info.ticketOpenExpectedDate)} />
              </Section>

              <Section title="책임자">
                <Row
                  label="공연 운영 총괄"
                  value={`${text(info.operationsResponsible?.name)} · ${text(info.operationsResponsible?.title)} · ${text(info.operationsResponsible?.phone)}`}
                />
                <Row
                  label="안전관리 총괄"
                  value={`${text(info.safetyResponsible?.name)} · ${text(info.safetyResponsible?.title)} · ${text(info.safetyResponsible?.phone)}`}
                />
              </Section>

              <Section title="아티스트 · 개최 이력">
                <div className="py-2">
                  <p className="mb-1.5 text-xs text-muted">아티스트 주요 이력</p>
                  <MiniTable
                    head={["아티스트", "소속사", "데뷔연도", "주요 활동 · 수상"]}
                    rows={(info.artistMainHistory ?? []).map((r) => [
                      r.artistName,
                      r.agency,
                      r.debutYear,
                      r.achievements,
                    ])}
                  />
                </div>
                <div className="py-2">
                  <p className="mb-1.5 text-xs text-muted">최근 공연 이력</p>
                  <MiniTable
                    head={["공연명", "공연일", "공연장", "도시 · 국가", "횟수", "회당 객석", "관객", "판매율"]}
                    rows={(info.artistRecentPerformances ?? []).map((r) => [
                      r.eventName,
                      r.eventDate,
                      r.venue,
                      r.cityCountry,
                      r.showCount,
                      r.seatsPerShow,
                      r.audience,
                      r.sellRate,
                    ])}
                  />
                </div>
                <div className="py-2">
                  <p className="mb-1.5 text-xs text-muted">대관사 최근 3년 공연 실적</p>
                  <MiniTable
                    head={["공연명", "공연장", "기간", "관객", "역할"]}
                    rows={(info.pastPerformances ?? []).map((r) => [
                      r.eventName,
                      r.venue,
                      r.period,
                      r.audience,
                      r.role,
                    ])}
                  />
                </div>
              </Section>

              <Section title="티켓 · 사업규모">
                <div className="py-2">
                  <p className="mb-1.5 text-xs text-muted">티켓 유형별 가격 · 예상 판매율</p>
                  <MiniTable
                    head={["유형", "가격", "예상 판매율(%)"]}
                    rows={(info.ticketTypes ?? []).map((r) => [
                      r.label,
                      won(r.price),
                      r.expectedSalesRate,
                    ])}
                  />
                </div>
                <Row
                  label="경합 시 추가 대관료"
                  value={
                    info.competitionFeeOptionMin || info.competitionFeeOptionMax
                      ? `${won(info.competitionFeeOptionMin ?? 0)} ~ ${won(info.competitionFeeOptionMax ?? 0)}`
                      : NONE
                  }
                />
                <Row
                  label="티켓 매출 RS 요율"
                  value={info.ticketRevenueShareRate ? `${info.ticketRevenueShareRate}%` : NONE}
                />
                <Row
                  label="부대사업 계획"
                  value={
                    info.ancillaryBusinessPlans?.length
                      ? info.ancillaryBusinessPlans
                          .map((p) => ANCILLARY_BUSINESS_PLAN_LABEL[p])
                          .join(", ")
                      : NONE
                  }
                />
              </Section>

              <Section title="공공 · 공익 참여">
                {info.publicInterestItems?.length ? (
                  info.publicInterestItems.map((item) => (
                    <Row
                      key={item}
                      label={PUBLIC_INTEREST_ITEM_LABEL[item]}
                      value={text(info.publicInterestDetails?.[item])}
                    />
                  ))
                ) : (
                  <Row label="참여 항목" value={NONE} />
                )}
              </Section>

              <Section title="개최 신뢰도 · 안전">
                <Row
                  label="출연진 계약 상태"
                  value={
                    info.castContractStatus
                      ? CAST_CONTRACT_STATUS_LABEL[info.castContractStatus]
                      : NONE
                  }
                />
                <Row label="해외 아티스트 사항" value={text(info.foreignArtistNotes)} />
                <Row
                  label="민감정보 마스킹 고지"
                  value={info.sensitiveInfoMaskingAcknowledged ? "확인함" : "미확인"}
                />
                <Row
                  label="안전규정 준수 확약서"
                  value={info.safetyPledgeSigned ? "작성 완료" : "미작성"}
                />
              </Section>
            </>
          ) : (
            <Section title="공연 정보">
              <Row label="" value="이 신청서에는 공연 정보가 저장돼 있지 않습니다." />
            </Section>
          )}

          {marketing ? (
            <Section title="홍보 · 마케팅 협조">
              <div className="py-2">
                <p className="mb-1.5 text-xs text-muted">프로모션 채널</p>
                <MiniTable
                  head={["채널", "계정 / URL", "구독자 · 팔로워"]}
                  rows={(marketing.channels ?? []).map((c) => [c.platform, c.handle, c.followers])}
                />
              </div>
              {/* 실행 계획은 2026-09-02 부터 첨부파일로 받는다. 그 전에 제출된 신청서에는
                  아래 줄글이 남아 있으므로 값이 있을 때만 보여 준다. */}
              {marketing.executionPlan?.mediaMix ? (
                <Row label="마케팅 실행 계획 (구)" value={marketing.executionPlan.mediaMix} />
              ) : null}
              <Row label="타깃 정의" value={text(marketing.executionPlan?.targetDefinition)} />
              <Row label="예산" value={text(marketing.executionPlan?.budget)} />
              <Row label="일정" value={text(marketing.executionPlan?.timeline)} />
            </Section>
          ) : null}

          <Section title="첨부 서류">
            {meta.attachmentNames.length > 0 ? (
              meta.attachmentNames.map((name, i) => (
                <Row key={i} label={i === 0 ? "파일" : ""} value={name} />
              ))
            ) : (
              <Row label="파일" value={NONE} />
            )}
          </Section>

          <Section title="신청 예상금액">
            <div className="py-2">
              <MiniTable
                head={["항목", "신청", "기본포함", "과금수량", "금액"]}
                rows={quote.lineItems.map((item) => [
                  item.label,
                  item.requested.toLocaleString("ko-KR"),
                  item.included || NONE,
                  item.billable.toLocaleString("ko-KR"),
                  won(item.amount),
                ])}
              />
            </div>
            <Row label="소계" value={won(quote.subtotal)} />
            <Row label="부가세" value={won(quote.vat)} />
            <Row label="합계" value={<b>{won(quote.total)}</b>} />
          </Section>
        </div>
      </div>
    </div>
  );
}
