import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getQuoteById, getRateTableByVersion, listAttachments } from "@/lib/db";
import { won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  defaultDayTags,
  effectiveDayTag,
  findPackage,
  totalRentalDays,
} from "@/lib/pricing/rateTableUtils";
import {
  AGE_RATING_LABEL,
  ANCILLARY_BUSINESS_PLAN_LABEL,
  APPLICANT_COMPANY_TYPE_LABEL,
  CAST_CONTRACT_STATUS_LABEL,
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  ORGANIZER_ROLE_LABEL,
  PUBLIC_INTEREST_ITEM_LABEL,
  RETRACTABLE_SEAT_FLOOR_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
  type Attachment,
  type DayTag,
  type MidHallDayRole,
  type QuoteStatus,
  type RetractableSeatFloor,
} from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";
import { LINK_BTN, NONE, PAGE_TITLE } from "@/components/admin/adminUi";
import { btnClass } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "신청 내역",
};

/*
  심사용 신청 내역 전문 (2026-09-02).

  운영자가 심사할 때 필요한 것은 "이 사람이 무엇을 써서 냈는가" 전부다. 그런데 신청서
  상세 화면은 심사·계약·정산 패널이 함께 있어 신청 내용이 그 사이에 흩어져 있었고,
  책임자 · 아티스트 이력 · 티켓 가격 · 공공/공익 참여 · 마케팅 협조는 아예 보이지
  않았다. 무엇을 근거로 심사했는지 남지 않는다는 뜻이다.

  여기는 **읽기 전용**이다. 심사 액션(승인·보류·거절)은 상세 화면에 그대로 있다 —
  같은 화면에서 고칠 수 있게 만들면 "본 것"과 "바꾼 것"이 섞인다.
*/

const STATUS_LABEL: Record<QuoteStatus, string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정 (정산 대기)",
  SETTLED: "정산 완료",
};

const MID_HALL_ROLE_LABEL: Record<MidHallDayRole, string> = {
  SETUP: "셋업",
  PERFORMANCE: "공연",
  LOAD_OUT: "철수",
};

const DAY_TAG_LABEL: Record<DayTag, string> = {
  PREP: "셋업",
  PERFORMANCE: "공연",
  LOAD_OUT: "철수",
};

/** 첨부 분류 라벨 — 어느 단계에서 올라온 서류인지 한눈에 갈라 보이게 한다. */
const ATTACHMENT_CATEGORY_LABEL: Record<string, string> = {
  MARKETING_PLAN: "마케팅 실행 계획",
  TICKET_OPEN: "티켓 오픈 자료",
  FACILITY_MEETING: "시설 회의 자료",
};

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}.${Number(d)}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** 값이 비면 대시 하나로 — 빈칸을 그대로 두면 "안 낸 것"인지 "화면이 빠뜨린 것"인지 모른다. */
function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return NONE;
  const s = String(value).trim();
  return s === "" ? NONE : s;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-border/15 py-2.5 last:border-b-0">
      <dt className="w-44 shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-keep text-s">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t-2 border-foreground pt-4">
      <h2 className="text-s font-bold">{title}</h2>
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
              <th key={h} className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-muted">
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

/** 첨부 한 줄 — 이름을 누르면 내려받는다(이미지·PDF 는 새 탭에서 열린다). */
function AttachmentRow({ quoteId, file }: { quoteId: string; file: Attachment }) {
  const tag = file.publicInterestItem
    ? PUBLIC_INTEREST_ITEM_LABEL[file.publicInterestItem]
    : file.category
      ? (ATTACHMENT_CATEGORY_LABEL[file.category] ?? file.category)
      : "신청 서류";
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/15 py-2.5 last:border-b-0">
      <span className="w-44 shrink-0 text-xs text-muted">{tag}</span>
      <a
        href={`/api/quotes/${quoteId}/attachments/${file.id}`}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 break-all text-s font-bold underline decoration-border-soft underline-offset-4 hover:decoration-accent"
      >
        {file.originalName}
      </a>
      <span className="shrink-0 text-xs text-muted tabular-nums">{formatSize(file.size)}</span>
    </div>
  );
}

export default async function AdminQuoteApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /**
   * `?embed=1` — 레이어(모달) 안에서 열릴 때. 상단바·되돌아가기 링크를 빼고 본문만 낸다.
   *
   * 같은 내용을 두 벌로 만들지 않기 위해 레이어는 이 화면을 그대로 띄운다(2026-09-02).
   * 심사 화면에서 곁눈질로 확인할 때는 레이어가 빠르고, 첨부를 새 탭으로 열거나 주소를
   * 담당자끼리 주고받을 때는 페이지가 낫다 — 어느 쪽을 쓸지는 운영자가 고른다.
   */
  searchParams?: Promise<{ embed?: string }>;
}) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/apply");

  const embed = ((await searchParams) ?? {}).embed === "1";
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();

  const [applicant, attachments, rateTable] = await Promise.all([
    findUserById(quote.applicantId),
    // 분류를 주지 않으면 전부 가져온다 — 신청 서류·공공/공익 자료·마케팅 계획·
    // 티켓오픈/시설회의 자료를 한 자리에서 본다.
    listAttachments(id),
    getRateTableByVersion(quote.rateTableVersion),
  ]);

  const s = quote.selection;
  const info = s.performanceInfo;
  const marketing = s.marketingCooperation;

  // 일정 — 상세 화면과 같은 방식으로 날짜를 태그별로 묶는다.
  const dates = resolveSelectedDates(s);
  const pkg = findPackage(rateTable, s.packageId);
  const defaults = defaultDayTags(dates, pkg?.defaultPerformanceDays ?? 1);
  const midHallByRole = new Map<MidHallDayRole, string[]>();
  for (const [date, day] of Object.entries(s.midHallDays ?? {})) {
    midHallByRole.set(day.role, [...(midHallByRole.get(day.role) ?? []), date].sort());
  }
  const byTag = new Map<DayTag, string[]>();
  for (const date of dates) {
    const tag = effectiveDayTag(date, s.dayTags ?? {}, defaults);
    byTag.set(tag, [...(byTag.get(tag) ?? []), date]);
  }
  const venueName =
    VENUES.find((v) => v.id === (s.venueId ?? DEFAULT_VENUE_ID))?.name ?? NONE;

  return (
    <div className="flex flex-1 flex-col">
      {!embed && <AdminNav active="/admin" user={admin} />}

      <main
        className={
          embed
            ? "mx-auto w-full max-w-4xl flex-1 px-1 pb-6"
            : "mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10"
        }
      >
        {!embed && (
          <Link href={`/admin/${quote.id}`} className={LINK_BTN}>
            ← 신청서 상세
          </Link>
        )}

        <header
          className={`flex flex-wrap items-start justify-between gap-4 border-b border-border/20 pb-6 ${embed ? "" : "mt-5"}`}
        >
          <div className="min-w-0">
            <h1 className={PAGE_TITLE}>신청 내역</h1>
            <p className="mt-2 break-keep text-s text-muted">
              {quote.id} · {applicant?.name ?? NONE} · {applicant?.companyName ?? NONE} ·{" "}
              {STATUS_LABEL[quote.status]}
            </p>
          </div>
          {/* 심사 회의에 종이로 들고 가는 일이 있어 인쇄본을 함께 둔다. */}
          <a href={`/print/${quote.id}`} className={btnClass("secondary", "md")}>
            인쇄
          </a>
        </header>

        <Section title="접수 정보">
          <Row label="신청번호" value={quote.id} />
          <Row label="신청일시" value={new Date(quote.createdAt).toLocaleString("ko-KR")} />
          <Row label="상태" value={STATUS_LABEL[quote.status]} />
          <Row
            label="신청자"
            value={`${applicant?.name ?? NONE} (${applicant?.email ?? NONE})`}
          />
          <Row label="회사" value={applicant?.companyName ?? NONE} />
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
          <Row label="공간" value={venueName} />
          {[...byTag.entries()].map(([tag, list]) => (
            <Row
              key={tag}
              label={DAY_TAG_LABEL[tag]}
              value={list.map(formatDateShort).join(", ")}
            />
          ))}
          {/* 「패키지」·동시 대관은 같은 기간 안에서 중형 일정도 함께 잡는다 — 아레나
              태그만 찍으면 심사자가 중형 일정을 못 본다(2026-09-02). */}
          {midHallByRole.size > 0 &&
            [...midHallByRole.entries()].map(([role, list]) => (
              <Row
                key={role}
                label={`중형 ${MID_HALL_ROLE_LABEL[role]}`}
                value={list.map(formatDateShort).join(", ")}
              />
            ))}
          <Row label="총 대관일수" value={`${totalRentalDays(s)}일`} />
          <Row label="주차" value={`${s.week.year}.${s.week.month} ${s.week.weekOfMonth}주차`} />
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
                  info.castContractStatus ? CAST_CONTRACT_STATUS_LABEL[info.castContractStatus] : NONE
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

        <Section title={`첨부 서류 (${attachments.length})`}>
          {attachments.length > 0 ? (
            attachments.map((file) => (
              <AttachmentRow key={file.id} quoteId={quote.id} file={file} />
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

        <div className="mt-10 border-t border-border/20 pt-6">
          <Link href={`/admin/${quote.id}`} className={btnClass("primary", "md")}>
            신청서 상세로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
