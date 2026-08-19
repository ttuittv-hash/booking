"use client";

import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  ANCILLARY_BUSINESS_PLAN_LABEL,
  type AncillaryBusinessPlan,
  type PerformanceInfo,
  type QuoteSelection,
} from "@/lib/pricing/types";

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
        "flex cursor-pointer items-center gap-2 rounded-sm border px-3.5 py-2.5 text-[13px] transition-colors",
        checked ? "border-accent bg-accent-soft text-foreground" : "border-border bg-panel hover:border-accent/50",
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

export function StepAudience({
  info,
  onChange,
  selection,
  files,
  onFilesChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  selection: QuoteSelection;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

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

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">STEP 3-2 · 예상 관객 및 사업규모</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        관객 수는 공간별로 자동 산정되며, 객석배치도는 계획안 기준으로 별도 첨부합니다.
      </p>

      <div className="mt-6 rounded-sm border border-border bg-panel/30 p-6">
        <h3 className="text-[15px] font-semibold">예상 관객 및 사업규모</h3>
        <p className="mt-1 text-[12px] text-muted">
          객석배치도는 계획안 기준으로 제출할 수 있으며, 승인 후 변경 시 사전 협의가 필요합니다
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-muted">1회당 예상 관객 수 — 아레나</label>
            <div className="rounded-sm border border-border bg-panel/60 px-4 py-2.5 text-[14px] text-foreground">
              {selection.expectedAudience.toLocaleString()}명
            </div>
            <p className="mt-1 text-[11px] text-muted">STEP 1 값과 연동 — 수정은 STEP 1에서</p>
          </div>

          {isMidHallInvolved && (
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-muted">1회당 예상 관객 수 — 중형</label>
              <div className="rounded-sm border border-border bg-panel/60 px-4 py-2.5 text-[14px] text-foreground">
                {selection.secondaryAudience.toLocaleString()}명
              </div>
              <p className="mt-1 text-[11px] text-muted">STEP 1 값과 연동 — 수정은 STEP 1에서</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-muted">총 예상 관객 수</label>
            <div className="rounded-sm border border-border bg-panel/60 px-4 py-2.5 text-[14px] text-foreground">
              {isMidHallInvolved
                ? `아레나 ${arenaAudienceTotal.toLocaleString()} + 중형 ${midHallAudienceTotal.toLocaleString()} = ${totalAudience.toLocaleString()}명 (자동)`
                : `${totalAudience.toLocaleString()}명 (자동)`}
            </div>
          </div>

          <div className="max-w-xs">
            <label className="mb-1.5 block text-[12.5px] font-medium text-muted">예상 유료 판매율</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={info.expectedPaidSalesRate || ""}
                onChange={(e) => set("expectedPaidSalesRate", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="w-24 rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="text-[13px] text-muted">%</span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12.5px] font-medium text-muted">부대사업 계획</div>
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

      <div className="mt-6 rounded-sm border border-border bg-panel/30 p-6">
        <h3 className="text-[15px] font-semibold">자료 첨부</h3>
        <p className="mt-1 mb-2.5 text-[12px] leading-5 text-muted">
          객석배치도(PDF/이미지)를 첨부하세요.
          {isSimultaneous && " 동시 대관은 두 공간의 객석배치도를 각각 첨부합니다."}
        </p>

        {files.length > 0 && (
          <ul className="mb-3 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded border border-border bg-panel px-3.5 py-2.5"
              >
                <span className="truncate text-[13px] font-medium">{file.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-[11.5px] text-muted hover:text-red-600">
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
          className="text-[12.5px] text-muted file:mr-3 file:rounded file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium"
        />
      </div>
    </section>
  );
}
