"use client";

import { CHOICE_SELECTED_VARS } from "@/components/ui/kit";

import { useState } from "react";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import {
  ANCILLARY_BUSINESS_PLAN_LABEL,
  type AncillaryBusinessPlan,
  type PerformanceInfo,
  type QuoteSelection,
} from "@/lib/pricing/types";
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
  showMidHallRate,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  audienceSummary: { arenaLine: string | null; midHallLine: string | null; totalLine: string | null };
  showMidHallRate: boolean;
}) {
  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  function clampRate(raw: string): number {
    return Math.max(0, Math.min(100, Number(raw) || 0));
  }

  const hasSummaryRow = audienceSummary.arenaLine || audienceSummary.midHallLine || audienceSummary.totalLine;

  return (
    /* 단계 안의 블록은 박스로 싸지 않는다 — 굵은 헤어라인 + H6 으로만 나눈다
       (신청자 정보·공공성과 같은 규칙) */
    <div className="border-t-2 border-foreground pt-5">
      <h3 className="type-kr-heading text-h6-m">예상 관객 및 사업규모</h3>

      <div className="mt-4 space-y-4">
        {/* 아레나/중형/총 예상 관객 수를 세 칸씩 쌓지 않고 한 줄로 — 눈이 세로로 오르내리지
            않게 한다(2026-08-22, 한 줄 배치 요청). 셋 중 화면에 없는 값은 그 칸만 빠진다. */}
        {hasSummaryRow && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {audienceSummary.arenaLine && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">1회당 예상 관객 수 — 아레나</label>
                <div className="flex h-10 items-center border border-border-soft px-3.5 text-s text-foreground">
                  {audienceSummary.arenaLine}
                </div>
              </div>
            )}
            {audienceSummary.midHallLine && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">1회당 예상 관객 수 — 중형</label>
                <div className="flex h-10 items-center border border-border-soft px-3.5 text-s text-foreground">
                  {audienceSummary.midHallLine}
                </div>
              </div>
            )}
            {audienceSummary.totalLine && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">총 예상 관객 수</label>
                <div className="flex h-10 items-center border border-border-soft px-3.5 text-s text-foreground">
                  {audienceSummary.totalLine}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 예상 유료 판매율도 같은 이유로 한 줄로 — 동시 대관이면 아레나/중형을 각각 입력한다.
            "예상 유료 판매율 — 아레나/중형" 을 매번 반복하지 않고, 대관기간 행처럼 상위
            라벨 하나로 묶은 뒤 아레나/중형은 짧은 하위 라벨로만 구분한다(2026-08-22,
            "예상 유료 판매율로 묶고 아레나, 중형 보여주면" 요청). */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-muted">예상 유료 판매율 (선택)</label>
          {/* grid-cols-2였을 때 칸 폭이 내용보다 훨씬 넓어 두 입력이 멀리 떨어져 보였다
              (2026-08-22, "간격 너무 떨어져있는것도 이상하니까" 피드백) — 내용 폭만큼만
              차지하는 flex로 바꿔 붙여 놓는다. */}
          <div className={showMidHallRate ? "flex flex-wrap gap-8" : "max-w-xs"}>
            <div>
              {showMidHallRate && <div className="mb-1 text-xs text-muted">아레나</div>}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={info.expectedPaidSalesRate || ""}
                  onChange={(e) => set("expectedPaidSalesRate", clampRate(e.target.value))}
                  className="field-base w-24"
                />
                <span className="text-s text-muted">%</span>
              </div>
            </div>
            {showMidHallRate && (
              <div>
                <div className="mb-1 text-xs text-muted">중형</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={info.expectedPaidSalesRateMidHall || ""}
                    onChange={(e) => set("expectedPaidSalesRateMidHall", clampRate(e.target.value))}
                    className="field-base w-24"
                  />
                  <span className="text-s text-muted">%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold text-muted">부대사업 계획</div>
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
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  selection: QuoteSelection;
  // [2026-08-23] "신청자 정보"·"규모" 탭을 하나로 합치면서, 합친 화면에서는 큰 제목이
  // 두 번 나오지 않게 이 컴포넌트만 자기 제목(StepHeading)을 생략할 수 있게 했다.
  showHeading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const isMidHallInvolved = isSimultaneous || selection.venueId === "medium-hall";
  const { arenaShows, midHallShows } = venueShowCounts(selection);
  const arenaAudienceTotal = selection.expectedAudience * arenaShows;
  const midHallAudienceTotal = selection.secondaryAudience * midHallShows;
  const totalAudience = arenaAudienceTotal + midHallAudienceTotal;
  const totalLine = `${totalAudience.toLocaleString()}명 (자동)`;

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
      {showHeading && <StepHeading title="규모" lead="관객 수는 공간별로 자동 산정됩니다." />}

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
              arenaLine: `${selection.expectedAudience.toLocaleString()}명`,
              midHallLine: isMidHallInvolved ? `${selection.secondaryAudience.toLocaleString()}명` : null,
              totalLine,
            }}
            showMidHallRate={isMidHallInvolved}
          />
        )}
        {effectiveTab === "ARENA" && (
          <AudienceFields
            info={info}
            onChange={onChange}
            audienceSummary={{
              arenaLine: `${selection.expectedAudience.toLocaleString()}명`,
              midHallLine: null,
              totalLine,
            }}
            showMidHallRate={false}
          />
        )}
        {effectiveTab === "MIDHALL" && midHallInfo && (
          <AudienceFields
            info={midHallInfo}
            onChange={onChangeMidHallInfo}
            audienceSummary={{
              arenaLine: null,
              midHallLine: `${selection.secondaryAudience.toLocaleString()}명`,
              totalLine: null,
            }}
            showMidHallRate={false}
          />
        )}
      </div>
    </section>
  );
}
