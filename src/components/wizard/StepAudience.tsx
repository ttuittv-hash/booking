"use client";

import { CHOICE_SELECTED_VARS, toggleClass } from "@/components/ui/kit";

import { useState, type ReactNode } from "react";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import {
  ANCILLARY_BUSINESS_PLAN_LABEL,
  type AncillaryBusinessPlan,
  type MarketingCooperation,
  type PerformanceInfo,
  type QuoteSelection,
  type StepValidationResult,
  type TicketTypeRecord,
} from "@/lib/pricing/types";
import { won } from "@/lib/format";
import { useWizardText } from "@/lib/content/wizardText";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";
import { StepHeading } from "./StepHeading";
import { PromotionChannelsFields } from "./StepMarketingCooperation";

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
  audienceSummary: {
    arena: { value: number; onChange: (n: number) => void } | null;
    midHall: { value: number; onChange: (n: number) => void } | null;
    totalLine: string | null;
  };
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
  customOptions?: Record<string, string[]>;
}) {
  const { t, tStr } = useWizardText();

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
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

  const hasSummaryRow = audienceSummary.arena || audienceSummary.midHall || audienceSummary.totalLine;
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
            {/* [수정 2026-09-08] "1회당 예상 관객 수 - 수정기능 필요(현재 수정 불가)" —
                패키지 관객 등급에서 자동으로 채우던 읽기전용 표시를 직접 고칠 수 있는
                입력으로 되돌린다. 값은 청소비 등 계산에 그대로 쓰인다. */}
            {audienceSummary.arena && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">
                  {t("audience.expectedAudiencePerShowArenaLabel", "1회당 예상 관객 수 — 아레나")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={audienceSummary.arena.value || ""}
                  onChange={(e) => audienceSummary.arena!.onChange(Math.max(0, Number(e.target.value) || 0))}
                  className="field-base h-10 w-full"
                />
              </div>
            )}
            {audienceSummary.midHall && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">
                  {t("audience.expectedAudiencePerShowMidHallLabel", "1회당 예상 관객 수 — 중형")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={audienceSummary.midHall.value || ""}
                  onChange={(e) => audienceSummary.midHall!.onChange(Math.max(0, Number(e.target.value) || 0))}
                  className="field-base h-10 w-full"
                />
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
                  className="field-base h-8"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={row.price || ""}
                    placeholder={tStr("audience.ticketPricePlaceholder", "티켓가")}
                    onChange={(e) => updateTicketType(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                    className="field-base h-8 w-full"
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

        {/* [삭제 2026-09-08] 예상 판매율(예상 BEP) 입력 — 운영진 요청으로 위저드에서 뺐다
            (nora, 9/8 16:20 "수납식 객석, 예상 BEP 미노출"). 필드(expectedPaidSalesRate)는
            남겨 예전 신청서 값은 심사 화면에 그대로 보인다. */}

        {/* [개정 2026-09-07] "대관 경합 시 대관료 옵션 추가 가능 범위"·"티켓 매출 RS
            요율" 둘 다 별도 슬롯으로 분리해 탭 맨 아래(StepCompetitionOption, STEP3
            슬롯 순서 마지막)로 옮겼다 — 여기(예상 관객 및 사업규모)에는 남지 않는다. */}

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
  onChangeExpectedAudience,
  onChangeSecondaryAudience,
  marketingCooperation,
  onChangeMarketingCooperation,
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
  // [신규 2026-09-08] "1회당 예상 관객 수 - 수정기능 필요(현재 수정 불가)" — 패키지
  // 관객 등급에서 자동 채운 값을 직접 고칠 수 있게 상위(WizardShell)의 setSelection에
  // 연결하는 통로.
  onChangeExpectedAudience: (n: number) => void;
  onChangeSecondaryAudience: (n: number) => void;
  // [신규 2026-09-08] "프로모션 채널 슬롯을 신청자 정보 및 규모 탭 하위로 이동" —
  // 마케팅 협업 STEP의 데이터(selection.marketingCooperation)를 여기서도 쓴다.
  marketingCooperation: MarketingCooperation;
  onChangeMarketingCooperation: (info: MarketingCooperation) => void;
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
              arena: { value: selection.expectedAudience, onChange: onChangeExpectedAudience },
              midHall: isMidHallInvolved
                ? { value: selection.secondaryAudience, onChange: onChangeSecondaryAudience }
                : null,
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
              arena: { value: selection.expectedAudience, onChange: onChangeExpectedAudience },
              midHall: null,
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
              arena: null,
              midHall: { value: selection.secondaryAudience, onChange: onChangeSecondaryAudience },
              totalLine: null,
            }}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
      </div>

      {/* [이동 2026-09-08] "해당 슬롯은 신청자 정보 및 규모 탭 하위 슬롯으로 이동" —
          마케팅 협업 STEP에 있던 "프로모션 채널(선택)" 입력을 여기로 옮겼다. 공간별
          탭(아레나/중형)과 무관한 신청서 전체 기준 값이라 탭 전환과 별개로 한 번만
          보여준다(marketingCooperation, StepMarketingCooperation.tsx). */}
      <div className="mt-8">
        <PromotionChannelsFields info={marketingCooperation} onChange={onChangeMarketingCooperation} />
      </div>
    </section>
  );
}

/**
 * [신규 2026-09-07] "대관 경합 시 대관료 옵션 추가 가능 범위를 별도 슬롯으로 분류하고
 * 탭 가장 밑으로 배치" — 예전엔 "예상 관객 및 사업규모" 슬롯 안에 티켓 매출 RS 요율과
 * 한 줄로 묶여 있었다. STEP3(신청자 정보 및 규모) 슬롯 순서 시스템(wizardSlots.ts
 * STEP3_DEFAULT_SLOT_ORDER)에 다섯 번째 슬롯으로 등록해 독립적으로 순서를 옮길 수
 * 있게 하고, 기본 위치를 맨 끝에 둔다. 경합 여지는 신청서 전체 기준 값이라 아레나·
 * 중형으로 나눠 받지 않는다(다른 STEP3 슬롯과 달리 midHallInfo 를 받지 않는 이유).
 * [개정 2026-09-07] "티켓 매출 RS 요율도 경합 슬롯에 있어야지, 예상 관객 및 사업규모
 * 에서는 빼고" — 원래 이 범위와 한 줄에 같이 있던 RS 요율을 다시 여기로 옮긴다(예상
 * 관객 및 사업규모 슬롯에는 남기지 않는다).
 */
export function StepCompetitionOption({
  info,
  onChange,
  expectedRevenue,
  framed = false,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  /** 총 예상 티켓매출(원) — selection.expectedRevenue(2단계 매출 연동 옵션에서 입력). 오른쪽
   *  「소계」는 이 값 × RS 요율이다. [개정 2026-09-08 19:34] 여기 있던 매출(원) 입력 칸은
   *  nora "내부 결정이 바뀌어서… 동그라미 친 부분만 냅두고 삭제" 로 뺐다 — 읽기만 한다. */
  expectedRevenue: number;
  /** [신규 2026-09-08] 예상 대관료 화면의 박스 사이에 끼울 때 — 굵은 헤어라인 대신 다른
   *  박스(대관료·추후 정산)와 같은 테두리 박스로 그린다. */
  framed?: boolean;
}) {
  const { t, tStr } = useWizardText();

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  // [개정 2026-09-08] "RS 2% 리미트" — 운영 방침상 RS 는 2%까지만 제안받는다(nora, 9/8 16:20).
  // 입력 단계에서 잘라 제출값이 2를 넘지 못하게 한다.
  const RS_MAX_PERCENT = 2;
  function clampRate(raw: string): number {
    return Math.max(0, Math.min(RS_MAX_PERCENT, Number(raw) || 0));
  }
  const rate = info.ticketRevenueShareRate ?? 0;
  const rsAmount = Math.round((expectedRevenue * rate) / 100);

  // [개정 2026-09-08 19:34] nora "동그라미 친 부분만 냅두고 다시 삭제 — 기입 부분은 요율이
  // 들어가야 하고 2%까지 리미트" — 왼쪽은 「티켓 매출 RS」 제목·설명·요율(%) 입력 하나뿐이고,
  // 오른쪽 「소계」에 총 예상 티켓매출 × 요율(원)을 보여준다. 매출(원) 입력 칸과 두 번째
  // RS 블록은 뺐다. 제목·설명·자리표시는 t() 키라 백오피스 화면 문구에서 고칠 수 있다.
  // 소계는 표시용이며 총금액에는 더하지 않는다(계약 협의용 제안값).
  return (
    <div className={framed ? "border border-border bg-panel/40 p-5" : "border-t-2 border-foreground pt-5"}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <h3 className="type-kr-heading text-h6-m">
            {t("audience.ticketRevenueShareRateLabel", "티켓 매출 RS")}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {t("audience.ticketRevenueShareRateHint", "RS(Revenue Share)는 2%까지 제안 가능합니다.")}
          </p>
          <div className="mt-3 flex max-w-sm items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={RS_MAX_PERCENT}
              step={0.1}
              value={info.ticketRevenueShareRate ?? ""}
              placeholder={tStr("audience.ticketRevenueShareRatePlaceholder", "요율")}
              onChange={(e) => set("ticketRevenueShareRate", clampRate(e.target.value))}
              className="field-base w-full"
            />
            <span className="text-xs text-muted">%</span>
          </div>
        </div>

        <div className="md:min-w-56 md:text-right">
          <h3 className="type-kr-heading text-h6-m">{t("competitionOption.subtotalHeading", "소계")}</h3>
          <p className="mt-1 text-xs text-muted">
            {t("competitionOption.subtotalHint", "총 예상 티켓매출 × RS 요율")}
          </p>
          <div className="mt-3 text-h5-m font-bold tabular-nums">{won(rsAmount)}</div>
        </div>
      </div>
    </div>
  );
}
