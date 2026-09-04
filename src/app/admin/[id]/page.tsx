import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isProAdminOrAbove } from "@/lib/auth";
import {
  findApprovedWeekConflict,
  findUserById,
  getContractSignatureByQuoteId,
  getDepositByQuoteId,
  getFacilityMeetingByQuoteId,
  getQuoteById,
  getRateTableByVersion,
  getTaxInvoice,
  getTicketOpenByQuoteId,
  listAttachments,
  listAuditLogsForQuote,
  listCompetingQuotesForWeek,
  listContractAddendums,
  listUsersByIds,
} from "@/lib/db";
import { num, won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag, findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
  type DayTag,
  type MidHallDayRole,
  type QuoteSelection,
} from "@/lib/pricing/types";
import { SpecTable } from "@/components/ui/kit";
import { AiReviewBox } from "@/components/admin/AiReviewBox";
import { ApplicationViewToggle } from "@/components/admin/ApplicationViewToggle";
import { ContractForm } from "@/components/admin/ContractForm";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { ScoringPanel } from "@/components/admin/ScoringPanel";
import { CompetingQuotesPanel } from "@/components/admin/CompetingQuotesPanel";
import { scoreQuote } from "@/lib/scoring/scoreQuote";
import { buildCandidateFacts } from "@/lib/scoring/competingCandidate";
import { SettlementForm } from "@/components/admin/SettlementForm";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { ContractSignaturePanel } from "@/components/ContractSignaturePanel";
import { ContractAddendumsPanel } from "@/components/ContractAddendumsPanel";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import {
  ERROR_NOTE,
  INFO_NOTE,
  LINK_BTN,
  NONE,
  PANEL,
  SECTION_TITLE,
  SUB_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD_ID,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

// 중형공연장은 주차가 아니라 날짜별(셋업/공연·회차)로 잡히므로 개요 한 줄로 압축해 보여준다.
function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performanceDates = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE");
  const shows = performanceDates.reduce((sum, d) => sum + selection.midHallDays[d].shows, 0);
  return `총 ${dates.length}일 (셋업 ${setup} · 공연 ${performanceDates.length} · 회차 ${shows}) · 관객 ${selection.secondaryAudience.toLocaleString()}명`;
}

const WEEKDAY_SHORT_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_SHORT_KO[new Date(iso).getDay()]})`;
}

const DAY_TAG_LABEL: Record<DayTag, string> = { PREP: "셋업", PERFORMANCE: "공연", LOAD_OUT: "철수" };
const MID_HALL_ROLE_LABEL: Record<MidHallDayRole, string> = { SETUP: "셋업", PERFORMANCE: "공연", LOAD_OUT: "철수" };

// 신청 상세에서 "언제 어떤 용도로 예약했는지" 날짜별로 풀어서 보여준다("공연정보 슬롯에서
// 대관 부킹한 기간을 상세히 노출해달라" 요청, 2026-08-22) — 헤더의 "총 6일" 요약만으로는
// 어느 날짜가 셋업/공연/철수인지 알 수 없었다.
function groupArenaDatesByTag(
  selection: QuoteSelection,
  defaultPerformanceDays: number,
): { tag: DayTag; dates: string[] }[] {
  const dates = resolveSelectedDates(selection);
  const defaults = defaultDayTags(dates, defaultPerformanceDays);
  const buckets = new Map<DayTag, string[]>();
  for (const date of dates) {
    const tag = effectiveDayTag(date, selection.dayTags, defaults);
    (buckets.get(tag) ?? buckets.set(tag, []).get(tag)!).push(date);
  }
  return (["PREP", "PERFORMANCE", "LOAD_OUT"] as DayTag[])
    .filter((tag) => buckets.has(tag))
    .map((tag) => ({ tag, dates: buckets.get(tag)! }));
}

function groupMidHallDatesByRole(selection: QuoteSelection): { role: MidHallDayRole; dates: string[] }[] {
  const buckets = new Map<MidHallDayRole, string[]>();
  for (const [date, day] of Object.entries(selection.midHallDays).sort(([a], [b]) => a.localeCompare(b))) {
    (buckets.get(day.role) ?? buckets.set(day.role, []).get(day.role)!).push(date);
  }
  return (["SETUP", "PERFORMANCE", "LOAD_OUT"] as MidHallDayRole[])
    .filter((role) => buckets.has(role))
    .map((role) => ({ role, dates: buckets.get(role)! }));
}

const STAGE_LABEL: Record<string, string> = {
  ESTIMATE: "신청 접수",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 확정",
  SUBMITTED: "신청서 제출",
  EDITED: "신청서 수정(신청자)",
  REVIEW_APPROVED: "심사 승인",
  REVIEW_HOLD: "심사 보류",
  REVIEW_REJECTED: "심사 반려",
  DEPOSIT_REPORTED: "계약금 입금신청",
  DEPOSIT_CONFIRMED: "계약금 입금확인",
  SIGNED_VENUE: "계약서 날인(공연장)",
  SIGNED_APPLICANT: "계약서 날인(대관사)",
  CONTRACT_ADDENDUM: "부속합의 등록",
  INVOICE_ISSUED: "세금계산서 발행",
  INVOICE_PAYMENT_REPORTED: "세금계산서 입금신청",
  INVOICE_PAYMENT_CONFIRMED: "세금계산서 입금확인",
  TICKET_OPEN_SET: "티켓오픈일 등록",
  FACILITY_MEETING_SET: "시설회의일 등록",
  SETTLEMENT_MUTUAL_CONFIRMED: "정산 상호확인",
};

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { id } = await params;
  const quote = await getQuoteById(id);
  // 신청서가 삭제된 뒤에도 예전 알림(신청 접수·심사 요청 등)은 그 quoteId 를 그대로
  // 들고 있다 — 그 알림을 눌렀을 때 맨 App Router 404 페이지로 떨어뜨리는 대신
  // 신청 현황 목록으로 보낸다("운영자에서 알림을 클릭하면 404" 신고, 2026-09-03).
  if (!quote) redirect("/admin");


  // 서로 독립인 조회 17건을 직렬로 기다리면 페이지 지연이 왕복 시간의 합이 된다 — 한 번에 띄운다(2026-08-28 성능 점검).
  const isEstimate = quote.status === "ESTIMATE";
  const [
    applicant,
    auditLog,
    deposit,
    generalAttachments,
    marketingPlanAttachments,
    weekConflict,
    competingQuotes,
    signature,
    contractInvoice,
    balanceInvoice,
    settlementInvoice,
    addendums,
    ticketOpen,
    facilityMeeting,
    ticketOpenMaterials,
    facilityMeetingMaterials,
    rateTable,
  ] = await Promise.all([
    findUserById(quote.applicantId),
    listAuditLogsForQuote(id),
    getDepositByQuoteId(id).then((d) => d ?? null),
    // 마케팅 실행 계획서는 MARKETING_PLAN 분류로 올라가 category IS NULL 목록에
    // 잡히지 않는다 — 따로 읽어 같은 첨부 목록에 이어 붙인다(2026-09-02).
    listAttachments(id, null),
    listAttachments(id, "MARKETING_PLAN"),
    isEstimate ? findApprovedWeekConflict(quote).then((c) => c ?? null) : Promise.resolve(null),
    isEstimate ? listCompetingQuotesForWeek(quote) : Promise.resolve([]),
    getContractSignatureByQuoteId(id).then((s) => s ?? null),
    getTaxInvoice(id, "CONTRACT").then((v) => v ?? null),
    getTaxInvoice(id, "CONTRACT_BALANCE").then((v) => v ?? null),
    getTaxInvoice(id, "SETTLEMENT").then((v) => v ?? null),
    quote.contract ? listContractAddendums(id) : Promise.resolve([]),
    getTicketOpenByQuoteId(id).then((v) => v ?? null),
    getFacilityMeetingByQuoteId(id).then((v) => v ?? null),
    listAttachments(id, "TICKET_OPEN"),
    listAttachments(id, "FACILITY_MEETING"),
    // 정산 폼의 "요금표에서 선택" 기능에도 쓰이므로 공간 종류와 무관하게 항상 가져온다.
    getRateTableByVersion(quote.rateTableVersion),
  ]);
  // 마케팅 실행 계획서는 분류가 붙어 별도 조회로 읽어 왔다. 화면에서는 한 목록으로 본다 —
  // 신청서에 딸린 서류라는 점이 같고, 분류별로 상자를 나누면 찾기만 번거로워진다.
  const attachments = [...generalAttachments, ...marketingPlanAttachments];
  // 경합 신청자는 행마다 findUserById 하지 않고 한 번에 읽는다(N+1).
  const competingApplicants = competingQuotes.length
    ? await listUsersByIds(competingQuotes.map(({ quote: q }) => q.applicantId))
    : [];
  const applicantById = new Map(competingApplicants.map((u) => [u.id, u]));
  const competingCandidates =
    competingQuotes.length > 0
      ? [
          buildCandidateFacts(quote, applicant, true),
          ...competingQuotes.map(({ quote: q }) => buildCandidateFacts(q, applicantById.get(q.applicantId), false)),
        ]
      : [];

  // 자동 채점은 한 번만 계산해 자동 심사 표와 심사 점수 칸이 나눠 쓴다 — 같은 화면에서
  // 두 번 계산하면 규칙이 바뀔 때 한쪽만 고쳐질 수 있다.
  const autoScore = scoreQuote(quote.selection);

  const needsArenaDates = quote.selection.venueId !== "medium-hall" || quote.selection.bookingMode === "SIMULTANEOUS";
  const pkg = needsArenaDates ? findPackage(rateTable, quote.selection.packageId) : null;
  const arenaDateGroups =
    needsArenaDates && pkg ? groupArenaDatesByTag(quote.selection, pkg.defaultPerformanceDays) : [];
  const midHallDateGroups = groupMidHallDatesByRole(quote.selection);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 h-14 border-b border-border/20 bg-background/95 backdrop-blur-md sm:h-16">
        <div className="mx-auto flex h-full max-w-4xl items-center gap-x-5 px-4 sm:px-6">
          <Link
            href="/admin"
            className="type-display shrink-0 whitespace-nowrap text-h6-m leading-none"
            aria-label="Seoul Arena 백오피스"
          >
            Seoul Arena
          </Link>
          <Link
            href="/admin"
            className="whitespace-nowrap text-xs font-bold text-muted transition-colors hover:text-foreground"
          >
            ← 신청 현황
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <h1 className="type-display text-h4-m tabular-nums sm:text-h4">{quote.id}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/print/${quote.id}`} target="_blank" className={LINK_BTN}>
                인쇄 / PDF 저장
              </Link>
              <span className="text-xs tabular-nums text-muted">
                신청일시 {new Date(quote.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
          </div>

          <p className="mt-4 text-s text-muted">
            {quote.selection.bookingMode === "SIMULTANEOUS" ? (
              <>
                아레나 {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
                {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
                {quote.selection.expectedAudience.toLocaleString()}명
                <br />
                중형공연장 {midHallSummaryLine(quote.selection)}
              </>
            ) : quote.selection.venueId === "medium-hall" ? (
              <>중형공연장 · {midHallSummaryLine(quote.selection)}</>
            ) : (
              <>
                {VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? NONE} ·{" "}
                {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
                {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
                {quote.selection.expectedAudience.toLocaleString()}명
              </>
            )}
          </p>
          <p className="mt-1.5 text-s text-muted">
            신청자 <span className="font-bold text-foreground">{applicant?.name ?? NONE}</span>
            {" "}({applicant?.email ?? NONE}) · 회사{" "}
            <span className="font-bold text-foreground">{applicant?.companyName ?? NONE}</span>
          </p>

          {/* [신규 2026-09-02] 심사하려면 신청서 전체를 한눈에 봐야 한다. 이 화면은
              심사·계약·정산 패널이 함께 있어 신청 내용이 그 사이에 흩어져 있고, 책임자·
              아티스트 이력·티켓 가격·공공 참여·마케팅 협조는 아예 보이지 않았다.
              신청서만 통째로 읽는 별도 상세 페이지로 보낸다 — 팝업이면 첨부를 새 탭으로
              열 때 레이어가 닫히고, 주소를 담당자끼리 주고받을 수도 없다. */}
          {/* [개정 2026-09-02] 페이지와 레이어 중에 고른다 — 고른 방식은 다음에도 쓴다.
              곁눈질로 확인할 때는 레이어가 빠르고, 첨부를 새 탭으로 열거나 주소를
              주고받을 때는 페이지가 낫다. */}
          <div className="mt-5">
            <ApplicationViewToggle quoteId={quote.id} />
          </div>
        </header>

        <section className={`mt-6 ${PANEL}`}>
          <h2 className={SECTION_TITLE}>공연 정보</h2>

          <div className="mt-4 space-y-2.5">
            {arenaDateGroups.length > 0 && (
              <p className="text-s">
                <span className="font-bold text-foreground">아레나</span>{" "}
                {arenaDateGroups.map(({ tag, dates }, i) => (
                  <span key={tag} className="text-muted">
                    {i > 0 && " · "}
                    <span className="font-bold text-foreground">{DAY_TAG_LABEL[tag]}</span>{" "}
                    {dates.map(formatDateShort).join(", ")}
                  </span>
                ))}
              </p>
            )}
            {midHallDateGroups.length > 0 && (
              <p className="text-s">
                <span className="font-bold text-foreground">중형공연장</span>{" "}
                {midHallDateGroups.map(({ role, dates }, i) => (
                  <span key={role} className="text-muted">
                    {i > 0 && " · "}
                    <span className="font-bold text-foreground">{MID_HALL_ROLE_LABEL[role]}</span>{" "}
                    {dates.map(formatDateShort).join(", ")}
                  </span>
                ))}
              </p>
            )}
          </div>

          {quote.selection.performanceInfo && (
            <div className="mt-4 grid gap-x-10 border-t border-border-soft pt-4 lg:grid-cols-2">
              <SpecTable
                rows={[
                  ["공연(행사)명", quote.selection.performanceInfo.eventName || NONE],
                  ["아티스트", quote.selection.performanceInfo.artist || NONE],
                  ["주최·주관·기획", quote.selection.performanceInfo.organizer || NONE],
                  ["행사규모", quote.selection.performanceInfo.eventScale || NONE],
                ]}
              />
              <SpecTable
                rows={[
                  [
                    "행사유형",
                    quote.selection.performanceInfo.eventTypes.length
                      ? quote.selection.performanceInfo.eventTypes
                          .map((t) => EVENT_TYPE_LABEL[t])
                          .join(", ")
                      : NONE,
                  ],
                  [
                    "무대형태",
                    quote.selection.performanceInfo.stageTypes.length
                      ? quote.selection.performanceInfo.stageTypes
                          .map((t) => STAGE_TYPE_LABEL[t])
                          .join(", ")
                      : NONE,
                  ],
                  [
                    "객석형태",
                    quote.selection.performanceInfo.seatingTypes.length
                      ? quote.selection.performanceInfo.seatingTypes
                          .map((t) => SEATING_TYPE_LABEL[t])
                          .join(", ")
                      : NONE,
                  ],
                  [
                    "수납식 객석 사용여부",
                    quote.selection.performanceInfo.retractableSeatUse
                      ? RETRACTABLE_SEAT_USE_LABEL[quote.selection.performanceInfo.retractableSeatUse]
                      : NONE,
                  ],
                ]}
              />
            </div>
          )}
        </section>

        <section className={`mt-6 ${TABLE_CARD}`}>
          <div className={TABLE_HEAD}>
            <div>
              <p className={TABLE_HEAD_TITLE}>① 신청 예상금액 · 산출내역</p>
              <p className={TABLE_HEAD_DESC}>
                기본 포함 수량을 뺀 과금수량에만 단가가 적용됩니다.
              </p>
            </div>
          </div>
          <div className={TABLE_SCROLL}>
            <table className={TABLE}>
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>항목</th>
                  <th className={TH_NUM}>신청</th>
                  <th className={TH_NUM}>기본포함</th>
                  <th className={TH_NUM}>과금수량</th>
                  <th className={TH_NUM}>단가 (₩)</th>
                  <th className={TH_NUM}>금액 (₩)</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item) => (
                  <tr key={item.addonId} className={TR}>
                    <td className={TD_ID}>{item.label}</td>
                    <td className={TD_NUM}>{item.requested.toLocaleString("ko-KR")}</td>
                    <td className={TD_NUM}>{item.included || NONE}</td>
                    <td className={TD_NUM}>{item.billable.toLocaleString("ko-KR")}</td>
                    <td className={TD_NUM}>{num(item.unitPrice)}</td>
                    <td className={`${TD_NUM} font-bold`}>{num(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-x-8 gap-y-2 border-t border-border-soft px-4 py-3 text-s tabular-nums">
            <span className="text-muted">소계 {won(quote.subtotal)}</span>
            <span className="text-muted">VAT {won(quote.vat)}</span>
            <span className="font-bold">합계 {won(quote.total)}</span>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          {quote.status === "ESTIMATE" && <ScoringPanel breakdown={autoScore} />}

          {competingCandidates.length > 0 && (
            <div className={PANEL}>
              <CompetingQuotesPanel quoteId={quote.id} candidates={competingCandidates} />
            </div>
          )}

          {quote.status === "ESTIMATE" && <AiReviewBox quoteId={quote.id} />}

          {quote.status === "ESTIMATE" && (
            <ReviewForm
              quoteId={quote.id}
              review={quote.review}
              conflict={weekConflict ? { companyName: weekConflict.companyName } : null}
              canReview={isProAdminOrAbove(user)}
              // 같은 계산 결과를 위 자동 심사 표와 심사 점수 칸이 함께 쓴다.
              autoScores={autoScore.results.map((r) => ({
                venueLabel: r.venueLabel,
                provisionalFinal: r.provisionalFinal,
                unresolvedMax: r.unresolvedMax,
              }))}
            />
          )}

          {quote.status === "ESTIMATE" && quote.review?.decision === "REJECTED" && (
            <p className={ERROR_NOTE}>
              심사에서 거절된 신청서입니다. 계약을 진행하려면 심사 결과를 승인으로 변경하세요.
            </p>
          )}
          {quote.status === "ESTIMATE" && quote.review?.decision !== "APPROVED" && quote.review?.decision !== "REJECTED" && (
            <p className={INFO_NOTE}>심사를 승인해야 계약 단계로 진행할 수 있습니다.</p>
          )}
          {quote.status === "ESTIMATE" && quote.review?.decision === "APPROVED" && (
            <ContractForm quoteId={quote.id} baseTotal={quote.total} />
          )}
        </div>

        <div className="mt-6">
          {quote.contract && (
            <div className={PANEL}>
              <h3 className={SECTION_TITLE}>② 계약금액 확정됨</h3>
              <ul className="mt-4 space-y-2 text-s">
                {quote.contract.adjustments.map((a, i) => (
                  <li key={i} className="flex justify-between gap-4 text-muted">
                    <span>
                      {a.label} {a.reason && `(${a.reason})`}
                    </span>
                    <span className="tabular-nums">{won(a.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-t border-border/15 pt-4">
                <span className="text-xs tabular-nums text-muted">
                  확정일시 {new Date(quote.contract.decidedAt).toLocaleString("ko-KR")}
                </span>
                <span className="type-display text-h5-m tabular-nums sm:text-h5">
                  {won(quote.contract.contractTotal)}
                </span>
              </div>
            </div>
          )}

          {quote.contract && (
            <div className="mt-6">
              <ContractAddendumsPanel
                quoteId={quote.id}
                contractTotal={quote.contract.contractTotal}
                addendums={addendums}
                viewerRole="ADMIN"
              />
            </div>
          )}

          {quote.contract && (
            <div className="mt-6">
              <ContractSignaturePanel quoteId={quote.id} signature={signature} viewerRole="ADMIN" />
            </div>
          )}

          {quote.contract && (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TaxInvoicePanel
                quoteId={quote.id}
                purpose="CONTRACT"
                title="세금계산서 (계약금)"
                invoice={contractInvoice}
                viewerRole="ADMIN"
              />
              <TaxInvoicePanel
                quoteId={quote.id}
                purpose="CONTRACT_BALANCE"
                title="세금계산서 (잔금)"
                invoice={balanceInvoice}
                viewerRole="ADMIN"
                allowCreate
              />
            </div>
          )}

          {quote.contract && (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TicketOpenPanel
                quoteId={quote.id}
                depositConfirmed={deposit?.status === "CONFIRMED"}
                balanceInvoicePaid={balanceInvoice ? balanceInvoice.status === "PAID" : null}
                ticketOpen={ticketOpen}
                materials={ticketOpenMaterials}
                viewerRole="ADMIN"
              />
              <FacilityMeetingPanel
                quoteId={quote.id}
                ticketOpenRegistered={!!ticketOpen?.openDate}
                facilityMeeting={facilityMeeting}
                materials={facilityMeetingMaterials}
                viewerRole="ADMIN"
              />
            </div>
          )}

          {quote.status === "CONTRACTED" && quote.contract && (
            <div className="mt-6">
              <SettlementForm
                quoteId={quote.id}
                contractTotal={quote.contract.contractTotal}
                addons={rateTable.addons}
                lineItems={quote.lineItems}
              />
            </div>
          )}

          {quote.settlement && (
            <div className="mt-6 border-l-2 border-good bg-good-soft p-4 sm:p-5">
              <h3 className={`${SECTION_TITLE} text-good`}>③ 최종 정산 완료</h3>
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
                <span className="text-xs tabular-nums text-good">
                  확정일시 {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
                </span>
                <span className="type-display text-h5-m tabular-nums text-good sm:text-h5">
                  {won(quote.settlement.finalTotal)}
                </span>
              </div>
              <SettlementMutualConfirm
                quoteId={quote.id}
                settlement={quote.settlement}
                viewerRole="ADMIN"
              />
            </div>
          )}

          {quote.settlement && (
            <div className="mt-6">
              <TaxInvoicePanel
                quoteId={quote.id}
                purpose="SETTLEMENT"
                title="세금계산서 (정산금)"
                invoice={settlementInvoice}
                viewerRole="ADMIN"
              />
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DepositPanel quoteId={quote.id} deposit={deposit} viewerRole="ADMIN" />
          <AttachmentsPanel quoteId={quote.id} attachments={attachments} />
        </div>

        {auditLog.length > 0 && (
          <section className="mt-10 border-t border-border/20 pt-6">
            <h2 className={`${SUB_TITLE} text-muted`}>감사 로그</h2>
            <ul className="mt-3 border-t border-border-soft">
              {auditLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex justify-between gap-4 border-b border-border-soft px-1 py-2.5 text-xs text-muted"
                >
                  <span>{STAGE_LABEL[entry.stage] ?? entry.stage}</span>
                  <span className="tabular-nums">{new Date(entry.createdAt).toLocaleString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
