import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProAdminPage } from "@/lib/auth";
import { findUserById, getQuoteById, getRateTableByVersion, listAttachments, getScreenTextContent } from "@/lib/db";
import { resolveWizardFieldLabel, showChoiceRow } from "@/lib/content/pageContent";
import { isSafetyPledgeComplete } from "@/lib/scoring/scoreQuote";
import { won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  SECTION_LABEL,
  SECTION_SUBTOTAL_CAPTION,
  SECTION_TAG,
  contractSectionAmounts,
  feeGroupOf,
} from "@/lib/pricing/lineItemGroups";
import {
  defaultDayTags,
  effectiveDayTag,
  findAddon,
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
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
  type Attachment,
  type DayTag,
  type MidHallDayRole,
  type QuoteStatus,
} from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";
import { PrintButton } from "@/components/PrintButton";
import { SaveDocumentButton } from "@/components/SaveDocumentButton";
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
  REST: "휴무",
};

const DAY_TAG_LABEL: Record<DayTag, string> = {
  PREP: "셋업",
  PERFORMANCE: "공연",
  LOAD_OUT: "철수",
  REST: "휴무일",
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
    <div className="flex gap-4 border-b border-border/25 py-2.5 last:border-b-0">
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
            <tr key={i} className="border-b border-border/25">
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
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/25 py-2.5 last:border-b-0">
      <span className="w-44 shrink-0 text-xs text-muted">{tag}</span>
      <a
        href={`/api/quotes/${quoteId}/attachments/${file.id}`}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 break-all text-s font-bold underline decoration-border-soft underline-offset-4 hover:decoration-foreground"
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
  const admin = await requireProAdminPage();

  const embed = ((await searchParams) ?? {}).embed === "1";
  const { id } = await params;
  const quote = await getQuoteById(id);
  // [버그 수정 2026-09-17] "신청 내역 보기를 누르면 404" — 신청자 계정을 지우면
  // deleteUserCascade 가 그 계정의 신청서까지 함께 지운다(테스트 계정 정리 때 실제로 발생).
  // 삭제 전에 열어 둔 심사 화면에서 이 레이어를 열면 이미 없는 신청서를 부르게 된다.
  // 상세 화면(../page.tsx)은 2026-09-03에 같은 신고("알림 클릭하면 404")로 목록
  // 리다이렉트로 바꿨는데 이 하위 화면이 빠져 있었다. 레이어(embed) 안에서 목록을
  // 통째로 띄우면 이상하므로 여기서는 안내문만 내고, 페이지로 열었을 때는 상세와 똑같이
  // 신청 현황으로 보낸다. (권한 부족은 requireProAdminPage 가 전부 redirect 로 처리하므로
  // 이 분기까지 오지 않는다 — 여기 도달했다면 원인은 언제나 "신청서가 없음"이다.)
  if (!quote) {
    if (!embed) redirect("/admin");
    return (
      <div className="flex flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className={PAGE_TITLE}>삭제된 신청서입니다</p>
          <p className="break-keep text-s text-muted">
            신청자 계정이 삭제되면 그 계정의 신청서도 함께 삭제됩니다.
            「신청 현황」 목록에서 다시 확인해 주세요.
          </p>
        </main>
      </div>
    );
  }

  const [applicant, attachments, rateTable, screenText] = await Promise.all([
    findUserById(quote.applicantId),
    // 분류를 주지 않으면 전부 가져온다 — 신청 서류·공공/공익 자료·마케팅 계획·
    // 티켓오픈/시설회의 자료를 한 자리에서 본다.
    listAttachments(id),
    getRateTableByVersion(quote.rateTableVersion),
    getScreenTextContent(),
  ]);

  const s = quote.selection;
  const info = s.performanceInfo;
  const marketing = s.marketingCooperation;
  // [2026-09-17] info.safetyPledgeSigned는 아무도 set하지 않는 죽은 필드다(항상 false) —
  // 서약은 이 스텝이 아니라 selection.safetyPledge(StepSafetyPledge.tsx)에 저장된다.
  const pledgeComplete = isSafetyPledgeComplete(s.safetyPledge);

  // 일정 — 상세 화면과 같은 방식으로 날짜를 태그별로 묶는다.
  const dates = resolveSelectedDates(s);
  const pkg = findPackage(rateTable, s.packageId);
  // [2026-09-17] 추가일 기본값 = 준비일(rateTableUtils.defaultDayTags 참고) — 견적 엔진과 같은 판정
  const defaults = defaultDayTags(dates, pkg?.defaultPerformanceDays ?? 1, s.extraDays);
  const midHallByRole = new Map<MidHallDayRole, string[]>();
  for (const [date, day] of Object.entries(s.midHallDays ?? {})) {
    midHallByRole.set(day.role, [...(midHallByRole.get(day.role) ?? []), date].sort());
  }
  const byTag = new Map<DayTag, string[]>();
  for (const date of dates) {
    const tag = effectiveDayTag(date, s.dayTags ?? {}, defaults);
    byTag.set(tag, [...(byTag.get(tag) ?? []), date]);
  }
  // [버그 수정 2026-09-17] "실제 입력값이랑 최종 신청 내역 보기 컬럼값이 일치해야 하는데
  // 다르다" — 동시 대관·중형 단독 신청에서 "공간"·"총 대관일수"·"예상 관객"이 항상
  // 아레나 기준(venueName·totalRentalDays·expectedAudience)으로만 나와, 중형 단독
  // 신청은 엉뚱한 값(0명·의미 없는 일수)이, 동시 대관은 중형 쪽 숫자가 통째로 빠져
  // 보였다. print/[id]/page.tsx·Step6Submit.tsx가 이미 하던 분기를 그대로 가져온다.
  const isSimultaneous = s.bookingMode === "SIMULTANEOUS";
  const showsArena = isSimultaneous || s.venueId !== "medium-hall";
  const showsMidHall = isSimultaneous || s.venueId === "medium-hall";
  const venueName = isSimultaneous
    ? "아레나 + 중형공연장 (동시 대관)"
    : (VENUES.find((v) => v.id === (s.venueId ?? DEFAULT_VENUE_ID))?.name ?? NONE);

  return (
    <div className="flex flex-1 flex-col">
      {/* [2026-09-18] 이 화면 자체가 대관심의 자료로 인쇄·저장된다(nora) — 백오피스
          네비는 종이에도 저장본에도 남으면 안 된다. */}
      {!embed && (
        <div className="print:hidden" data-doc-hide>
          <AdminNav active="/admin" user={admin} />
        </div>
      )}

      <main
        className={
          embed
            ? "mx-auto w-full max-w-4xl flex-1 px-1 pb-6"
            : "mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10"
        }
      >
        {!embed && (
          <Link href={`/admin/${quote.id}`} className={`${LINK_BTN} print:hidden`} data-doc-hide>
            ← 신청서 상세
          </Link>
        )}

        <header
          className={`flex flex-wrap items-start justify-between gap-4 border-b border-border/25 pb-6 ${embed ? "" : "mt-5"}`}
        >
          <div className="min-w-0">
            <h1 className={PAGE_TITLE}>신청 내역</h1>
            <p className="mt-2 break-keep text-s text-muted">
              {quote.id} · {applicant?.name ?? NONE} · {applicant?.companyName ?? NONE} ·{" "}
              {STATUS_LABEL[quote.status]}
            </p>
          </div>
          {/* 버튼 줄 전체가 인쇄물·저장본에서 빠진다 — 개별 버튼에 하나씩 표시하면
              새 버튼이 늘 때 빠뜨린다(실제로 「신청 상세보기」·「문서 저장」이 그렇게
              인쇄물에 남았다). 줄 단위로 거는 편이 안전하다. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden" data-doc-hide>
            {/* [신규 2026-09-17] "관리자가 신청자와 동일하게 다 볼 수 있어야 해. 미리보기
                위저드 레벨이 아니라" — 여기(요약 표)와 별개로, 신청자가 실제로 밟은
                위저드 화면 그대로(달력 포함, 진짜 제출값) 훑어보는 화면을 새 탭에서 연다. */}
            {!embed && (
              <a
                href={`/admin/${quote.id}/wizard`}
                target="_blank"
                rel="noreferrer"
                className={btnClass("secondary", "md")}
              >
                신청 상세보기
              </a>
            )}
            {/* [신규 2026-09-19] "pdf 저장, 문서 저장 둘 다 있어야 해" — 심사 회의에
                종이로 들고 가는 일도 있고(PDF 저장 = 인쇄 대화상자에서 PDF로), 파일
                자체를 이메일 첨부·보관해야 할 때도 있다(문서 저장 = 즉시 HTML 다운로드).
                [개정 2026-09-18] "현재 요약본만 저장이 가능하며 (요약본도, 들어가있는 정보가
                부족한것 같습니다) 신청 내역 전체 저장이 안 됩니다"(nora, 대관심의 자료 취합) —
                두 버튼 모두 요약본(/print/[id], 5개 항목)을 가리키고 있었다. 이 화면이 이미
                12개 항목을 다 갖고 있으므로, 요약본을 키우는 대신 이 화면을 그대로 인쇄·저장
                대상으로 삼는다(요약본 라우트는 신청자용으로 그대로 둔다). */}
            <PrintButton label="PDF 저장" variant="secondary" />
            <SaveDocumentButton
              quoteId={quote.id}
              path={`/admin/${quote.id}/application`}
            />
          </div>
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
                    ? `${resolveWizardFieldLabel(screenText.wizardStrings, "applicantCompanyType", info.applicantCompanyType, APPLICANT_COMPANY_TYPE_LABEL)}${info.applicantCompanyTypeOtherDetail ? ` — ${info.applicantCompanyTypeOtherDetail}` : ""}`
                    : NONE
                }
              />
              <Row label="사업자등록번호" value={text(info.applicantBusinessRegistrationNumber)} />
              <Row label="대표자" value={text(info.applicantRepresentativeName)} />
              {/* [개정 2026-09-06] "담당자 정보를 한 줄짜리 반복 행으로" — 담당자·공연
                  운영/안전관리 총괄 책임자를 합친 contactPersons 반복 목록. 그 필드가
                  추가되기 전(2026-09-06 이전) 신청서는 옛 개별 필드로 되돌아간다. */}
              {info.contactPersons && info.contactPersons.length > 0 ? (
                info.contactPersons.map((person, i) => (
                  <Row
                    key={i}
                    label={person.role || `담당자 ${i + 1}`}
                    value={[text(person.name), text(person.phone), person.email, person.department]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ))
              ) : (
                <Row
                  label="담당자"
                  value={`${text(info.applicantContactName)} · ${text(info.applicantContactPhone)} · ${text(info.applicantContactEmail)}`}
                />
              )}
            </>
          ) : null}
        </Section>

        <Section title="일정 · 규모">
          <Row label="공간" value={venueName} />
          {/* [신규 2026-09-18] "어느 패키지를 신청했는지 화면 어디에도 이름으로 나오지
              않습니다"(niki 시안) — 맨 아래 가격표에 「기본 대관료(Rate B)」로 섞여 있을
              뿐이라 심사자가 한눈에 읽을 자리가 없었다. 신청자 화면
              (QuoteApplicationDetail 의 「구성 · 옵션」)은 이미 이 줄을 갖고 있어, 두 화면이
              서로 다른 상태였던 것 자체가 이번에 맞추려는 불일치다.
              중형 단독은 패키지 개념이 없어(시간·일 단가제) 줄 자체를 넣지 않는다. */}
          {showsArena && pkg && (
            <Row
              label="패키지"
              value={pkg.tagline ? `${pkg.name} — ${pkg.tagline}` : pkg.name}
            />
          )}
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
          {showsArena && (
            <>
              <Row
                label={isSimultaneous ? "총 대관일수 (아레나)" : "총 대관일수"}
                value={`${totalRentalDays(s)}일`}
              />
              <Row
                label={isSimultaneous ? "주차 (아레나)" : "주차"}
                value={`${s.week.year}.${s.week.month} ${s.week.weekOfMonth}주차`}
              />
              <Row
                label={isSimultaneous ? "예상 관객 (아레나)" : "예상 관객"}
                value={`${s.expectedAudience.toLocaleString("ko-KR")}명`}
              />
            </>
          )}
          {showsMidHall && (
            <>
              <Row
                label={isSimultaneous ? "대관일수 (중형)" : "대관일수"}
                value={`${Object.keys(s.midHallDays ?? {}).length}일`}
              />
              <Row
                label={isSimultaneous ? "예상 관객 (중형)" : "예상 관객"}
                value={`${s.secondaryAudience.toLocaleString("ko-KR")}명`}
              />
            </>
          )}
        </Section>

        {/* [신규 2026-09-18] "어떤 부대시설·옵션을 얼마나 신청했는지는 화면 어디에도
            이름으로 나오지 않습니다 — 맨 아래 가격표에 항목명이 섞여 있을 뿐"(niki 시안).
            가격표(신청 예상금액)는 그대로 두고, "무엇을 신청했는가"만 모아 보여주는 자리를
            따로 둔다. 기본 대관료·할인·추가일·공연 일수 조정처럼 수량 개념이 없는 금액
            항목은 빼고, 실제로 고르거나(대기실·스카이박스) 자동 산출된(청소비) 것만 남긴다. */}
        {(() => {
          const configItems = quote.lineItems.filter(
            (item) =>
              item.addonId !== "BASE_FEE" &&
              feeGroupOf(item) !== "EXCLUSIVE" &&
              item.amount >= 0 &&
              item.requested > 0,
          );
          if (configItems.length === 0) return null;
          return (
            <Section title="구성 · 옵션">
              <div className="py-2">
                <MiniTable
                  head={["구성 항목", "신청 수량", "기본 포함"]}
                  rows={configItems.map((item) => {
                    // 단위(실·식·인…)는 LineItem 에 없다 — 요금표의 unitLabel("원/실")에서 뗀다.
                    const unit = findAddon(rateTable, item.addonId)?.unitLabel.split("/")[1] ?? "";
                    return [
                      item.label,
                      `${item.requested.toLocaleString("ko-KR")}${unit}`,
                      item.included > 0
                        ? `${item.included.toLocaleString("ko-KR")}${unit} 포함`
                        : NONE,
                    ];
                  })}
                />
              </div>
            </Section>
          );
        })()}

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
              {/* [2026-09-18] 행사규모 입력칸은 2026-08-22(1fa7ddb)에 위저드에서 빠졌다
                  — 관객 규모 탭이 같은 걸 더 정확히 받는다. 그 뒤 신청서는 항상 비어
                  있으므로 값이 남아 있는 옛 신청서에만 보여 준다(niki "중간에 삭제된
                  필드값들은 안 보이도록"). 지우지 않는 이유: 옛 신청서에는 실제 값이 있다. */}
              {text(info.eventScale) !== NONE ? (
                <Row label="행사규모 (구)" value={text(info.eventScale)} />
              ) : null}
              {showChoiceRow(
                info.eventTypes.length > 0,
                "performanceInfo.eventTypes",
                Object.keys(EVENT_TYPE_LABEL),
                screenText.wizardDisabledFields ?? [],
                screenText.wizardCustomOptions,
              ) && (
                <Row
                  label="행사유형"
                  value={
                    info.eventTypes.length
                      ? info.eventTypes
                          .map((t) => resolveWizardFieldLabel(screenText.wizardStrings, "eventTypes", t, EVENT_TYPE_LABEL))
                          .join(", ")
                      : NONE
                  }
                />
              )}
              {showChoiceRow(
                !!info.ageRating,
                "performanceInfo.ageRating",
                Object.keys(AGE_RATING_LABEL),
                screenText.wizardDisabledFields ?? [],
                screenText.wizardCustomOptions,
              ) && (
                <Row
                  label="공연등급"
                  value={
                    info.ageRating
                      ? `${resolveWizardFieldLabel(screenText.wizardStrings, "ageRating", info.ageRating, AGE_RATING_LABEL)}${info.ageLimitDetail ? ` (${info.ageLimitDetail})` : ""}`
                      : NONE
                  }
                />
              )}
              {showChoiceRow(
                info.stageTypes.length > 0,
                "performanceInfo.stageTypes",
                Object.keys(STAGE_TYPE_LABEL),
                screenText.wizardDisabledFields ?? [],
                screenText.wizardCustomOptions,
              ) && (
                <Row
                  label="무대형태"
                  value={
                    info.stageTypes.length
                      ? `${info.stageTypes.map((t) => resolveWizardFieldLabel(screenText.wizardStrings, "stageTypes", t, STAGE_TYPE_LABEL)).join(", ")}${info.stageTypeOtherDetail ? ` — ${info.stageTypeOtherDetail}` : ""}`
                      : NONE
                  }
                />
              )}
              {showChoiceRow(
                info.seatingTypes.length > 0,
                "performanceInfo.seatingTypes",
                Object.keys(SEATING_TYPE_LABEL),
                screenText.wizardDisabledFields ?? [],
                screenText.wizardCustomOptions,
              ) && (
                <Row
                  label="객석형태"
                  value={
                    info.seatingTypes.length
                      ? `${info.seatingTypes.map((t) => resolveWizardFieldLabel(screenText.wizardStrings, "seatingTypes", t, SEATING_TYPE_LABEL)).join(", ")}${info.seatingTypeOtherDetail ? ` — ${info.seatingTypeOtherDetail}` : ""}`
                      : NONE
                  }
                />
              )}
              <Row label="셋업 추가 요청시간" value={text(info.setupRequestTime)} />
              <Row label="철수 완료 예정시간" value={text(info.teardownCompletionTime)} />
              <Row label="티켓 오픈 예정일" value={text(info.ticketOpenExpectedDate)} />
            </Section>

            {/* contactPersons가 있으면 공연 운영/안전관리 총괄이 이미 위 "담당자 정보"
                반복 목록에 포함돼 있어 이 Section은 생략한다 — 옛 신청서만 남긴다. */}
            {(!info.contactPersons || info.contactPersons.length === 0) && (
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
            )}

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
                <p className="mb-1.5 text-xs text-muted">티켓 유형별 가격</p>
                <MiniTable
                  head={["유형", "가격"]}
                  rows={(info.ticketTypes ?? []).map((r) => [r.label, won(r.price)])}
                />
              </div>
              {/* [2026-09-18] 예상 판매율(예상 BEP) 입력은 2026-09-08(eb583f2)에 운영진
                  요청으로 위저드에서 빠졌다 — 그 뒤 신청서는 항상 0% 라, 심의자에게
                  "판매율 0%"라는 잘못된 신호를 준다. 값이 있는 옛 신청서에만 보여 준다. */}
              {info.expectedPaidSalesRate ? (
                <Row label="예상 유료 판매율 (구)" value={`${info.expectedPaidSalesRate}%`} />
              ) : null}
              {/* [2026-09-18] 경합 시 추가 대관료 레인지 입력은 2026-09-07(13b4c2a)에
                  빠지고 아래 「티켓 매출 RS 요율」만 남았다. 값이 있는 옛 신청서에만. */}
              {info.competitionFeeOptionMin || info.competitionFeeOptionMax ? (
                <Row
                  label="경합 시 추가 대관료 (구)"
                  value={`${won(info.competitionFeeOptionMin ?? 0)} ~ ${won(info.competitionFeeOptionMax ?? 0)}`}
                />
              ) : null}
              <Row
                label="티켓 매출 RS 요율"
                value={info.ticketRevenueShareRate ? `${info.ticketRevenueShareRate}%` : NONE}
              />
              <Row
                label="부대사업 계획"
                value={
                  info.ancillaryBusinessPlans?.length
                    ? `${info.ancillaryBusinessPlans.map((p) => resolveWizardFieldLabel(screenText.wizardStrings, "ancillaryBusinessPlans", p, ANCILLARY_BUSINESS_PLAN_LABEL)).join(", ")}${info.ancillaryBusinessPlanOtherDetail ? ` — ${info.ancillaryBusinessPlanOtherDetail}` : ""}`
                    : NONE
                }
              />
            </Section>

            <Section title="공공 · 공익 참여">
              {info.publicInterestItems?.length ? (
                /* [2026-09-18] 항목을 켰을 때 펼쳐지던 상세 입력칸은 2026-09-08(eb583f2)에
                   빠졌다 — 그 뒤 신청서는 상세가 항상 비어 "—"만 찍혀, 체크를 했는데도
                   아무것도 안 낸 것처럼 보였다. 행 자체는 지우지 않는다: 체크한 항목은
                   살아 있는 입력이고 심의에 꼭 필요하다. 상세가 없으면 「선택함」으로 말한다. */
                info.publicInterestItems.map((item) => (
                  <Row
                    key={item}
                    label={PUBLIC_INTEREST_ITEM_LABEL[item]}
                    value={
                      text(info.publicInterestDetails?.[item]) !== NONE
                        ? text(info.publicInterestDetails?.[item])
                        : "선택함"
                    }
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
              {/* [2026-09-18] 이 체크박스는 2026-09-07(1f88816)에 위저드에서 빠졌다 —
                  아무도 true 로 만들 수 없어 모든 신규 신청서가 「미확인」으로 찍힌다.
                  심의자에게 "고지를 안 받았다"는 잘못된 신호라, 실제로 확인된 옛
                  신청서에만 보여 준다. */}
              {info.sensitiveInfoMaskingAcknowledged ? (
                <Row label="민감정보 마스킹 고지 (구)" value="확인함" />
              ) : null}
              <Row
                label="안전규정 준수 확약서"
                value={pledgeComplete ? "작성 완료" : "미작성"}
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
            {/* [2026-09-18] 타깃 정의·집행 예산·타임라인 입력은 2026-08-26(26b35b0)에
                빠졌다 — 바로 위 mediaMix 와 같은 처지인데 이 세 줄만 조건 없이 그려져
                항상 "—" 로 남아 있었다. 같은 규칙(값 있을 때만 · 「(구)」)으로 맞춘다. */}
            {marketing.executionPlan?.targetDefinition ? (
              <Row label="타깃 정의 (구)" value={marketing.executionPlan.targetDefinition} />
            ) : null}
            {marketing.executionPlan?.budget ? (
              <Row label="예산 (구)" value={marketing.executionPlan.budget} />
            ) : null}
            {marketing.executionPlan?.timeline ? (
              <Row label="일정 (구)" value={marketing.executionPlan.timeline} />
            ) : null}
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

        {/* [개정 2026-09-18] "계약금액 / 예상금액(추가옵션) / 총 예상금액 이렇게 구분이
            되어 있는데 신청내역보기 금액계산서에는 반영이 안 되어 있다"(nora·niki) —
            신청자가 마지막에 본 화면과 같은 두 묶음으로 나눈다. 다만 운영자에게는
            신청·기본포함·과금수량이 심사·정산 근거라, 위저드용 표(QuoteLineItemsReport,
            항목/세부내역/금액)로 갈아끼우지 않고 지금 열 구성을 그대로 둔 채 묶음만 씌운다. */}
        <section className="mt-8 border-t-2 border-foreground pt-4">
          <h2 className="text-s font-bold">신청 예상금액</h2>
          {(() => {
            const { sections, vatPct } = contractSectionAmounts(quote);
            return sections.map(({ section, items, subtotal, vat, total }) => (
              <div key={section} className="mt-4 border border-border/25 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-s font-bold">{SECTION_LABEL[section]}</h3>
                  <span className="text-xs text-muted">{SECTION_TAG[section]}</span>
                </div>
                <div className="py-2">
                  <MiniTable
                    head={["항목", "신청", "기본포함", "과금수량", "금액"]}
                    rows={items.map((item) => [
                      item.label,
                      item.requested.toLocaleString("ko-KR"),
                      item.included || NONE,
                      item.billable.toLocaleString("ko-KR"),
                      won(item.amount),
                    ])}
                  />
                </div>
                <dl>
                  <Row label="소계 (VAT 별도)" value={won(subtotal)} />
                  <Row label={`부가세 ${vatPct}%`} value={won(vat)} />
                </dl>
                <div
                  className={`mt-3 flex justify-between px-3 py-2.5 text-s font-bold tabular-nums ${
                    section === "CONTRACT"
                      ? "bg-accent text-on-accent"
                      : "bg-inverse-bg text-inverse-fg"
                  }`}
                >
                  <span>{SECTION_SUBTOTAL_CAPTION[section]}</span>
                  <span>{won(total)}</span>
                </div>
              </div>
            ));
          })()}
          <div className="mt-4 flex items-baseline justify-between bg-inverse-bg px-3 py-3 text-inverse-fg">
            <span className="text-s font-bold">총 예상금액</span>
            <span className="text-h6-m font-bold tabular-nums sm:text-h6">{won(quote.total)}</span>
          </div>
        </section>

        <div className="mt-10 border-t border-border/25 pt-6 print:hidden" data-doc-hide>
          <Link href={`/admin/${quote.id}`} className={btnClass("primary", "md")}>
            신청서 상세로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
