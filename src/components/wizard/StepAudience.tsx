"use client";

import { CHOICE_SELECTED_VARS, toggleClass } from "@/components/ui/kit";

import { useState, type ReactNode } from "react";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import {
  ANCILLARY_BUSINESS_PLAN_LABEL,
  type AncillaryBusinessPlan,
  type PerformanceInfo,
  type QuoteSelection,
  type StepValidationResult,
  type TicketTypeRecord,
} from "@/lib/pricing/types";
import { useWizardText } from "@/lib/content/wizardText";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";
import { StepHeading } from "./StepHeading";

const ANCILLARY_PLANS = Object.keys(ANCILLARY_BUSINESS_PLAN_LABEL) as AncillaryBusinessPlan[];

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// 규모 단계(STEP 4)의 필수값 검증 — 예상 유료 판매율만 선택이고 부대사업 계획은 필수다
// (2026-08-22, "예상 유료판매율만 (선택)... 나머지는 필수사항"). 자료 첨부(객석배치도)는
// 다른 슬롯과 같은 이유로 여기서는 검증하지 않는다.
export function validateAudienceStep(
  info: PerformanceInfo,
  venueLabel?: string,
  disabledFields: string[] = [],
  // [신규 2026-09-07] "체크박스 항목도 + 버튼으로 추가" — StepPerformanceInfo.tsx의
  // validatePerformanceInfoStep과 같은 이유로, 관리자가 추가한 커스텀 항목까지
  // 포함해야 "고를 항목이 하나도 없을 때만 건너뛴다"는 계산이 맞는다.
  customOptions: Record<string, string[]> = {},
  // [신규 2026-09-07] "미입력 필수항목 빨간색 표시 + 자동 스크롤" — StepPerformanceInfo.tsx의
  // validatePerformanceInfoStep과 같은 이유로 안내 문구를 tStr(key, fallback)로 조회한다.
  tStr: (key: string, fallback: string) => string = (_key, fallback) => fallback,
): StepValidationResult | null {
  const prefix = venueLabel ? `${venueLabel} ` : "";
  // [버그 수정 2026-09-06] "체크박스 노출/숨김이 필수 항목으로 처리되어 있음" —
  // StepPerformanceInfo.tsx의 같은 수정과 짝 — 어드민이 이 그룹(또는 그 안 개별
  // 항목 전부)을 꺼서 화면에 고를 선택지가 없으면 필수 검사를 건너뛴다.
  // [버그 수정 2026-09-06] STEP3 "예상 관객 및 사업규모" 슬롯 자체를 통째로 껐을 때
  // (slot.3.audience, SlotOrderPanel의 새 체크박스)는 이 컴포넌트가 아예 렌더되지
  // 않으므로 위 그룹 검사와 별개로 슬롯 검사도 함께 건너뛴다 — StepPerformanceInfo.tsx의
  // isSlotDisabled와 같은 규칙.
  if (disabledFields.includes("slot.3.audience")) return null;
  const allAncillaryPlans = [...ANCILLARY_PLANS, ...(customOptions[ANCILLARY_PLANS_GROUP_ID] ?? [])];
  const visiblePlansForValidation = disabledFields.includes(ANCILLARY_PLANS_GROUP_ID)
    ? []
    : allAncillaryPlans.filter((plan) => !disabledFields.includes(`${ANCILLARY_PLANS_GROUP_ID}.${plan}`));
  if (visiblePlansForValidation.length > 0 && info.ancillaryBusinessPlans.length === 0) {
    return {
      fieldKey: ANCILLARY_PLANS_GROUP_ID,
      message: `${prefix}${tStr(`validationMessage.${ANCILLARY_PLANS_GROUP_ID}`, "부대사업 계획을 하나 이상 선택해 주세요.")}`,
    };
  }
  // [신규 2026-09-06] "모든 항목에 기타 버튼 눌렀을때" 상세 입력칸이 뜨도록 일반화 —
  // 무대형태·객석형태(StepPerformanceInfo.tsx)와 같은 패턴.
  if (info.ancillaryBusinessPlans.includes("OTHER") && !info.ancillaryBusinessPlanOtherDetail?.trim()) {
    return {
      fieldKey: `${ANCILLARY_PLANS_GROUP_ID}.other`,
      message: `${prefix}${tStr(`validationMessage.${ANCILLARY_PLANS_GROUP_ID}.other`, '부대사업 계획 "기타" 상세를 입력해 주세요.')}`,
    };
  }
  return null;
}

function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: ReactNode;
  onChange: () => void;
}) {
  return (
    <label
      /* 선택 = 검정 채움. 안쪽 글자가 따라오도록 토큰을 국소 반전한다 */
      style={checked ? CHOICE_SELECTED_VARS : undefined}
      className={[
        // 인라인 칩도 버튼과 같은 단(40) — px/py 조합으로 43px 을 만들지 않는다
        "flex h-10 cursor-pointer items-center gap-2 border px-4 text-s transition-colors",
        checked ? "border-foreground bg-inverse-bg text-inverse-fg" : "border-border-soft hover:border-foreground",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        /* 검정 채움 위에서는 체크박스도 밝은 면으로 뒤집는다 — 안 그러면 검정 위 검정이다 */
        className={`h-4 w-4 ${checked ? "accent-[var(--background)]" : "accent-[var(--foreground)]"}`}
      />
      {label}
    </label>
  );
}

// 공간별 총 공연 횟수 — 1회당 예상 관객수 × 총 공연 횟수 합산에 쓰인다.
function venueShowCounts(selection: QuoteSelection): { arenaShows: number; midHallShows: number } {
  const arenaDates = resolveSelectedDates(selection);
  const defaults = defaultDayTags(arenaDates, 2);
  const arenaShows = arenaDates.reduce((sum, d) => {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    return tag === "PERFORMANCE" ? sum + (selection.dayShowCounts[d] ?? 1) : sum;
  }, 0);
  const midHallShows = Object.values(selection.midHallDays).reduce(
    (sum, d) => (d.role === "PERFORMANCE" ? sum + d.shows : sum),
    0,
  );
  return { arenaShows, midHallShows };
}

// STEP 3-1과 동일한 공통/아레나/중형 탭 구조 — 1회당 예상 관객수 · 총 예상 관객수는
// 아레나/중형 탭에서 자신의 공간 값만 보여주고(총액은 아레나 탭에만, STEP 3-1의
// 총 공연 횟수 배치와 동일한 이유), 예상 유료 판매율 · 부대사업 계획은 각 공간에서
// 독립적으로 입력한다(2026-08-19, 04 기본 정보 그룹 전체로 분리 확대 요청).
// [신규 2026-09-06] "예상 부대행사 옆에도 노출 미노출 여부 체크할수 있게" — 신청 기업
// 유형·행사 유형 등 03 기본정보 체크박스 그룹에 쓰던 것과 같은 "그룹id.키" 방식 순서·
// 노출 처리(StepPerformanceInfo.tsx의 resolveGroupOrder/visibleInGroup과 동일 로직).
// 어드민 화면(WizardTextPreview.tsx)의 FieldOrderPanel이 순서 조정도 함께 주므로 여기도
// 노출 여부만이 아니라 순서까지 반영한다.
const ANCILLARY_PLANS_GROUP_ID = "audience.ancillaryBusinessPlans";

// [개정 2026-09-07] "+ 버튼으로 항목 자체를 추가" — base(고정 목록 + 관리자가 만든
// 커스텀 항목)를 호출부에서 넘겨받아, 그 기준으로 순서를 계산한다.
function resolveAncillaryPlansOrder(configured: string[] | undefined, base: AncillaryBusinessPlan[]): AncillaryBusinessPlan[] {
  return configured && configured.length > 0
    ? [
        ...(configured.filter((key) => (base as readonly string[]).includes(key)) as AncillaryBusinessPlan[]),
        ...base.filter((key) => !configured.includes(key)),
      ]
    : [...base];
}

function AudienceFields({
  info,
  onChange,
  audienceSummary,
  fieldOrders,
  disabledFields,
  customOptions,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  audienceSummary: { arenaLine: string | null; midHallLine: string | null; totalLine: string | null };
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
  customOptions?: Record<string, string[]>;
}) {
  const { t, tStr } = useWizardText();

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  function clampRate(raw: string): number {
    return Math.max(0, Math.min(100, Number(raw) || 0));
  }

  // [신규 2026-08-26, 개정 2026-09-06] 티켓 유형별 가격 반복 행 — 예상 판매율은
  // 유형별 컬럼에서 빠지고 아래 전체 티켓 기준 단일 입력(expectedPaidSalesRate)으로
  // 되돌아갔다.
  const ticketTypes = info.ticketTypes ?? [];

  function addTicketType() {
    set("ticketTypes", [...ticketTypes, { label: "", price: 0 }]);
  }

  function updateTicketType(index: number, patch: Partial<TicketTypeRecord>) {
    set(
      "ticketTypes",
      ticketTypes.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeTicketType(index: number) {
    set(
      "ticketTypes",
      ticketTypes.filter((_, i) => i !== index),
    );
  }

  const hasSummaryRow = audienceSummary.arenaLine || audienceSummary.midHallLine || audienceSummary.totalLine;
  const ancillaryPlansBase = [...ANCILLARY_PLANS, ...(customOptions?.[ANCILLARY_PLANS_GROUP_ID] ?? [])];
  const ancillaryPlansOrder = resolveAncillaryPlansOrder(fieldOrders?.[ANCILLARY_PLANS_GROUP_ID], ancillaryPlansBase);
  // [신규 2026-09-06] "체크박스 위에 항목 레이블 자체도 노출/미노출 설정 가능해야" —
  // 그룹 전체(제목 포함)를 한 번에 끄는 토글(StepPerformanceInfo.tsx의 visibleInGroup과
  // 같은 규칙 — groupId 자체가 disabledFields에 있으면 통째로 비운다).
  const visibleAncillaryPlans = disabledFields?.includes(ANCILLARY_PLANS_GROUP_ID)
    ? []
    : ancillaryPlansOrder.filter((plan) => !disabledFields?.includes(`${ANCILLARY_PLANS_GROUP_ID}.${plan}`));

  return (
    /* 단계 안의 블록은 박스로 싸지 않는다 — 굵은 헤어라인 + H6 으로만 나눈다
       (신청자 정보·공공성과 같은 규칙) */
    <div className="border-t-2 border-foreground pt-5">
      <h3 className="type-kr-heading text-h6-m">{t("audience.sectionHeading", "예상 관객 및 사업규모")}</h3>

      <div className="mt-4 space-y-4">
        {/* 아레나/중형/총 예상 관객 수를 세 칸씩 쌓지 않고 한 줄로 — 눈이 세로로 오르내리지
            않게 한다(2026-08-22, 한 줄 배치 요청). 셋 중 화면에 없는 값은 그 칸만 빠진다. */}
        {hasSummaryRow && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {audienceSummary.arenaLine && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">
                  {t("audience.expectedAudiencePerShowArenaLabel", "1회당 예상 관객 수 — 아레나")}
                </label>
                <div className="flex h-10 items-center border border-border-soft px-3.5 text-s text-foreground">
                  {audienceSummary.arenaLine}
                </div>
              </div>
            )}
            {audienceSummary.midHallLine && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">
                  {t("audience.expectedAudiencePerShowMidHallLabel", "1회당 예상 관객 수 — 중형")}
                </label>
                <div className="flex h-10 items-center border border-border-soft px-3.5 text-s text-foreground">
                  {audienceSummary.midHallLine}
                </div>
              </div>
            )}
            {audienceSummary.totalLine && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">
                  {t("audience.totalExpectedAudienceLabel", "총 예상 관객 수")}
                </label>
                <div className="flex h-10 items-center border border-border-soft px-3.5 text-s text-foreground">
                  {audienceSummary.totalLine}
                </div>
              </div>
            )}
          </div>
        )}

        {/* [개정 2026-08-26, 2026-09-06] "티켓 유형별로 행 추가(R석, VIP석 등),
            티켓가는 입력할 수 있게" — 유형·가격 반복 행은 유지하고, 예상 판매율은
            유형별 컬럼에서 빼서 바로 아래 전체 티켓 기준 단일 입력으로 보여준다
            ("예상 판매율은 티켓등급별이 아니라 전체 티켓 예상 판매율 기입란으로"). */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <label className="text-xs font-bold text-muted">{t("audience.ticketTypesLabel", "티켓 유형별 가격")}</label>
            <button type="button" onClick={addTicketType} className={toggleClass(false)}>
              {t("audience.addTicketTypeButton", "＋ 행 추가")}
            </button>
          </div>
          <div className="space-y-2">
            {ticketTypes.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-1.5 border-b border-border/15 py-2">
                <input
                  value={row.label}
                  placeholder={tStr("audience.ticketTypeLabelPlaceholder", "예: R석, VIP석")}
                  onChange={(e) => updateTicketType(i, { label: e.target.value })}
                  className="field-base"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={row.price || ""}
                    placeholder={tStr("audience.ticketPricePlaceholder", "티켓가")}
                    onChange={(e) => updateTicketType(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                    className="field-base w-full"
                  />
                  <span className="text-xs text-muted">{t("audience.wonUnit", "원")}</span>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => removeTicketType(i)}
                    aria-label={tStr("audience.removeTicketTypeAriaLabel", "삭제")}
                    className={toggleClass(false)}
                  >
                    {t("audience.removeTicketTypeButton", "삭제")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* [신규 2026-09-06] 유형별 컬럼에서 뺀 예상 판매율 — 티켓 유형 전체를 합친
            기준 하나로 받는다(expectedPaidSalesRate). */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-muted">
            {t("audience.expectedPaidSalesRateLabel", "예상 판매율(%)")}
          </label>
          <div className="flex w-40 items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              value={info.expectedPaidSalesRate || ""}
              placeholder={tStr("audience.expectedPaidSalesRatePlaceholder", "예상 판매율")}
              onChange={(e) => set("expectedPaidSalesRate", clampRate(e.target.value))}
              className="field-base w-full"
            />
            <span className="text-xs text-muted">%</span>
          </div>
        </div>

        {/* [신규 2026-08-26, 2026-08-26 레이아웃 정리] 같은 주차에 여러 신청이 몰려
            경합이 붙었을 때 심사에서 참고하는 경쟁력 지표 2종 — 대관료 옵션 추가
            범위(최소~최대)와 티켓 매출 RS 요율. "한 행에 다 넣어달라"는 요청으로
            한 줄에 같이 배치한다. */}
        <div>
          <div className="mb-2.5">
            <label className="text-xs font-bold text-muted">
              {t("audience.competitionFeeOptionLabel", "대관 경합 시 대관료 옵션 추가 가능 범위")}
            </label>
            <p className="mt-1 text-xs text-muted">
              {t(
                "audience.competitionFeeOptionHint",
                "같은 주차에 다른 신청과 경합이 붙을 경우, 추가로 제시할 수 있는 대관료 옵션의 범위입니다.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={info.competitionFeeOptionMin ?? ""}
                placeholder={tStr("audience.competitionFeeOptionMinPlaceholder", "최소")}
                onChange={(e) => set("competitionFeeOptionMin", Math.max(0, Number(e.target.value) || 0))}
                className="field-base w-full"
              />
              <span className="text-xs text-muted">{t("audience.wonUnit", "원")}</span>
            </div>
            <span className="text-xs text-muted">~</span>
            <div className="flex flex-1 items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={info.competitionFeeOptionMax ?? ""}
                placeholder={tStr("audience.competitionFeeOptionMaxPlaceholder", "최대")}
                onChange={(e) => set("competitionFeeOptionMax", Math.max(0, Number(e.target.value) || 0))}
                className="field-base w-full"
              />
              <span className="text-xs text-muted">{t("audience.wonUnit", "원")}</span>
            </div>
            <span className="mx-1 h-6 w-px bg-border/40" aria-hidden="true" />
            <label className="text-xs font-bold whitespace-nowrap text-muted">
              {t("audience.ticketRevenueShareRateLabel", "티켓 매출 RS 요율")}
            </label>
            <div className="flex w-28 items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={info.ticketRevenueShareRate ?? ""}
                placeholder={tStr("audience.ticketRevenueShareRatePlaceholder", "요율")}
                onChange={(e) => set("ticketRevenueShareRate", clampRate(e.target.value))}
                className="field-base w-full"
              />
              <span className="text-xs text-muted">%</span>
            </div>
          </div>
        </div>

        {/* [버그 수정 2026-09-06] "언체크해도 라벨명은 노출되잖아 — 항목 전체에 대한
            온오프가 필요" — 항목을 전부 꺼도 제목만 남지 않도록 함께 숨긴다. */}
        {visibleAncillaryPlans.length > 0 && (
          <div data-field-key={ANCILLARY_PLANS_GROUP_ID}>
            <div className="mb-2 text-xs font-bold text-muted">{t("audience.ancillaryPlansLabel", "부대사업 계획")}</div>
            <div className="flex flex-wrap gap-2">
              {visibleAncillaryPlans.map((plan) => (
                <CheckboxChip
                  key={plan}
                  label={t(`fieldLabel.ancillaryBusinessPlans.${plan}`, ANCILLARY_BUSINESS_PLAN_LABEL[plan] ?? plan)}
                  checked={info.ancillaryBusinessPlans.includes(plan)}
                  onChange={() => set("ancillaryBusinessPlans", toggleInArray(info.ancillaryBusinessPlans, plan))}
                />
              ))}
            </div>
            {/* [신규 2026-09-06] "기타 체크박스 선택 시 텍스트 기입할수 있도록" —
                무대형태·객석형태(StepPerformanceInfo.tsx)와 같은 패턴. */}
            {info.ancillaryBusinessPlans.includes("OTHER") && (
              <input
                value={info.ancillaryBusinessPlanOtherDetail ?? ""}
                placeholder={tStr("audience.ancillaryPlanOtherDetailPlaceholder", "기타 부대사업 계획 설명")}
                onChange={(e) => set("ancillaryBusinessPlanOtherDetail", e.target.value)}
                className="field-base mt-2 w-full max-w-xs"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function StepAudience({
  info,
  onChange,
  midHallInfo,
  onChangeMidHallInfo,
  selection,
  showHeading = true,
  title,
  lead,
  fieldOrders,
  disabledFields,
  customOptions,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  selection: QuoteSelection;
  // [2026-08-23] "신청자 정보"·"규모" 탭을 하나로 합치면서, 합친 화면에서는 큰 제목이
  // 두 번 나오지 않게 이 컴포넌트만 자기 제목(StepHeading)을 생략할 수 있게 했다.
  showHeading?: boolean;
  title: ReactNode;
  lead: ReactNode;
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
  customOptions?: Record<string, string[]>;
}) {
  const { tStr } = useWizardText();
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const isMidHallInvolved = isSimultaneous || selection.venueId === "medium-hall";
  const { arenaShows, midHallShows } = venueShowCounts(selection);
  const arenaAudienceTotal = selection.expectedAudience * arenaShows;
  const midHallAudienceTotal = selection.secondaryAudience * midHallShows;
  const totalAudience = arenaAudienceTotal + midHallAudienceTotal;
  const peopleUnit = tStr("audience.peopleUnit", "명");
  const totalLine = `${totalAudience.toLocaleString()}${peopleUnit} ${tStr("audience.autoCalcSuffix", "(자동)")}`;

  const midHallDifferent = isSimultaneous && midHallInfo !== null;
  const effectiveTab: VenueSplitTab = midHallDifferent ? (activeTab === "MIDHALL" ? "MIDHALL" : "ARENA") : "COMMON";

  function splitAndSelect(tab: "ARENA" | "MIDHALL") {
    if (!midHallDifferent) onChangeMidHallInfo(midHallInfo ?? { ...INITIAL_PERFORMANCE_INFO });
    setActiveTab(tab);
  }

  function mergeToCommon() {
    onChangeMidHallInfo(null);
    setActiveTab("COMMON");
  }

  return (
    <section>
      {showHeading && <StepHeading title={title} lead={lead} />}

      {/* [2026-08-24] "공통" 하나뿐일 때(분리 전)는 탭 줄 + "공간별로 다르게 입력" 버튼이
          예상 관객 및 사업규모 위에 불필요한 영역으로 남아 삭제 요청됨. 분리는 다른 탭
          (신청자 정보·공공성)에서 시작할 수 있고, 이미 분리된 상태에서는 여기서도
          아레나/중형 전환이 필요하므로 그 경우에만 탭 바를 보여준다. */}
      {isSimultaneous && midHallDifferent && (
        <VenueSplitTabBar
          midHallDifferent={midHallDifferent}
          activeTab={effectiveTab}
          onSelectTab={setActiveTab}
          onSplit={() => splitAndSelect("ARENA")}
          onMerge={mergeToCommon}
        />
      )}

      <div className="mt-6">
        {effectiveTab === "COMMON" && (
          <AudienceFields
            info={info}
            onChange={onChange}
            audienceSummary={{
              arenaLine: `${selection.expectedAudience.toLocaleString()}${peopleUnit}`,
              midHallLine: isMidHallInvolved ? `${selection.secondaryAudience.toLocaleString()}${peopleUnit}` : null,
              totalLine,
            }}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
        {effectiveTab === "ARENA" && (
          <AudienceFields
            info={info}
            onChange={onChange}
            audienceSummary={{
              arenaLine: `${selection.expectedAudience.toLocaleString()}${peopleUnit}`,
              midHallLine: null,
              totalLine,
            }}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
        {effectiveTab === "MIDHALL" && midHallInfo && (
          <AudienceFields
            info={midHallInfo}
            onChange={onChangeMidHallInfo}
            audienceSummary={{
              arenaLine: null,
              midHallLine: `${selection.secondaryAudience.toLocaleString()}${peopleUnit}`,
              totalLine: null,
            }}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
      </div>
    </section>
  );
}
