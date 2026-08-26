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
export function validateAudienceStep(info: PerformanceInfo, venueLabel?: string): string | null {
  if (info.ancillaryBusinessPlans.length === 0) {
    return `${venueLabel ? `${venueLabel} ` : ""}부대사업 계획을 하나 이상 선택해 주세요.`;
  }
  return null;
}

function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
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
function AudienceFields({
  info,
  onChange,
  audienceSummary,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  audienceSummary: { arenaLine: string | null; midHallLine: string | null; totalLine: string | null };
}) {
  const { t, tStr } = useWizardText();

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  function clampRate(raw: string): number {
    return Math.max(0, Math.min(100, Number(raw) || 0));
  }

  // [신규 2026-08-26] 티켓 유형별 가격 · 예상 판매율 반복 행.
  const ticketTypes = info.ticketTypes ?? [];

  function addTicketType() {
    set("ticketTypes", [...ticketTypes, { label: "", price: 0, expectedSalesRate: 0 }]);
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

        {/* [개정 2026-08-26] "티켓 유형별로 행 추가(R석, VIP석 등), 티켓가·예상
            판매율을 각각" 요청 — 단일 "예상 유료 판매율(%)" 입력을 유형별 반복
            행으로 대체한다. expectedPaidSalesRate(레거시)는 과거 신청서 표시용으로만
            타입에 남아 있고, 이 화면은 더 이상 그 필드를 읽거나 쓰지 않는다. */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <label className="text-xs font-bold text-muted">
              {t("audience.ticketTypesLabel", "티켓 유형별 가격 · 예상 판매율")}
            </label>
            <button type="button" onClick={addTicketType} className={toggleClass(false)}>
              {t("audience.addTicketTypeButton", "＋ 행 추가")}
            </button>
          </div>
          <div className="space-y-2">
            {ticketTypes.map((row, i) => (
              <div key={i} className="grid grid-cols-4 gap-1.5 border-b border-border/15 py-2">
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
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.expectedSalesRate || ""}
                    placeholder={tStr("audience.expectedSalesRatePlaceholder", "예상 판매율")}
                    onChange={(e) => updateTicketType(i, { expectedSalesRate: clampRate(e.target.value) })}
                    className="field-base w-full"
                  />
                  <span className="text-xs text-muted">%</span>
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

        <div>
          <div className="mb-2 text-xs font-bold text-muted">{t("audience.ancillaryPlansLabel", "부대사업 계획")}</div>
          <div className="flex flex-wrap gap-2">
            {ANCILLARY_PLANS.map((plan) => (
              <CheckboxChip
                key={plan}
                label={ANCILLARY_BUSINESS_PLAN_LABEL[plan]}
                checked={info.ancillaryBusinessPlans.includes(plan)}
                onChange={() => set("ancillaryBusinessPlans", toggleInArray(info.ancillaryBusinessPlans, plan))}
              />
            ))}
          </div>
        </div>
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
          />
        )}
      </div>
    </section>
  );
}
