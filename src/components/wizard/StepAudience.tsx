"use client";

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

const ANCILLARY_PLANS = Object.keys(ANCILLARY_BUSINESS_PLAN_LABEL) as AncillaryBusinessPlan[];

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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
      className={[
        "flex cursor-pointer items-center gap-2 border px-3.5 py-2.5 text-s transition-colors",
        checked ? "border-foreground bg-inverse-bg text-inverse-fg text-foreground" : "border-border bg-panel hover:border-foreground/50",
      ].join(" ")}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-accent" />
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
  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  return (
    <div className="border border-border bg-panel/30 p-6">
      <h3 className="text-r font-bold">예상 관객 및 사업규모</h3>
      <p className="mt-1 text-xs text-muted">
        객석배치도는 계획안 기준으로 제출할 수 있으며, 승인 후 변경 시 사전 협의가 필요합니다
      </p>

      <div className="mt-4 space-y-4">
        {audienceSummary.arenaLine && (
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">1회당 예상 관객 수 — 아레나</label>
            <div className="border border-border bg-panel/60 px-4 py-2.5 text-s text-foreground">
              {audienceSummary.arenaLine}
            </div>
            <p className="mt-1 text-xs text-muted">구성 · 옵션 값과 연동 — 수정은 구성 · 옵션에서</p>
          </div>
        )}

        {audienceSummary.midHallLine && (
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">1회당 예상 관객 수 — 중형</label>
            <div className="border border-border bg-panel/60 px-4 py-2.5 text-s text-foreground">
              {audienceSummary.midHallLine}
            </div>
            <p className="mt-1 text-xs text-muted">구성 · 옵션 값과 연동 — 수정은 구성 · 옵션에서</p>
          </div>
        )}

        {audienceSummary.totalLine && (
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">총 예상 관객 수</label>
            <div className="border border-border bg-panel/60 px-4 py-2.5 text-s text-foreground">
              {audienceSummary.totalLine}
            </div>
          </div>
        )}

        <div className="max-w-xs">
          <label className="mb-1.5 block text-xs font-bold text-muted">예상 유료 판매율</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={info.expectedPaidSalesRate || ""}
              onChange={(e) => set("expectedPaidSalesRate", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-24 border border-border bg-panel px-3.5 py-2.5 text-s outline-none focus:border-foreground focus:ring-2 focus:ring-accent/20"
            />
            <span className="text-s text-muted">%</span>
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
  files,
  onFilesChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  selection: QuoteSelection;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    onFilesChange([...files, ...Array.from(selected)]);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const isMidHallInvolved = isSimultaneous || selection.venueId === "medium-hall";
  const { arenaShows, midHallShows } = venueShowCounts(selection);
  const arenaAudienceTotal = selection.expectedAudience * arenaShows;
  const midHallAudienceTotal = selection.secondaryAudience * midHallShows;
  const totalAudience = arenaAudienceTotal + midHallAudienceTotal;
  const totalLine = isMidHallInvolved
    ? `아레나 ${arenaAudienceTotal.toLocaleString()} + 중형 ${midHallAudienceTotal.toLocaleString()} = ${totalAudience.toLocaleString()}명 (자동)`
    : `${totalAudience.toLocaleString()}명 (자동)`;

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
    <section className="border border-border bg-background p-7">
      <h2 className="type-kr-heading text-h5-m sm:text-h5">관객</h2>
      <p className="mt-1.5 text-s text-muted">
        관객 수는 공간별로 자동 산정되며, 객석배치도는 계획안 기준으로 별도 첨부합니다.
      </p>

      {isSimultaneous && (
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
          />
        )}
      </div>

      <div className="mt-6 border border-border bg-panel/30 p-6">
        <h3 className="text-r font-bold">자료 첨부</h3>
        <p className="mt-1 mb-2.5 text-xs leading-5 text-muted">
          객석배치도(PDF/이미지)를 첨부하세요.
          {isSimultaneous && " 동시 대관은 두 공간의 객석배치도를 각각 첨부합니다."}
        </p>

        {files.length > 0 && (
          <ul className="mb-3 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between border border-border bg-panel px-3.5 py-2.5"
              >
                <span className="truncate text-s font-bold">{file.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-xs text-muted hover:text-danger">
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          type="file"
          multiple
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
          className="text-xs text-muted file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-bold"
        />
      </div>
    </section>
  );
}
