"use client";

import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag, findAddon, findPackage, recommendPackage } from "@/lib/pricing/rateTableUtils";
import { MEDIA_TIER_LABEL, type DayTag, type QuoteSelection, type RateTable } from "@/lib/pricing/types";
import { won } from "@/lib/format";

const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  const date = new Date(iso);
  return `${m}/${d}(${WEEKDAY_SHORT[date.getDay()]})`;
}

export function Step1Package({
  rateTable,
  packageId,
  week,
  excludedDays,
  extraDays,
  dayTags,
  expectedAudience,
  onSelectPackage,
  onChangeAudience,
  onChangeDayTags,
}: {
  rateTable: RateTable;
  packageId: number | null;
  week: QuoteSelection["week"];
  excludedDays: QuoteSelection["excludedDays"];
  extraDays: number;
  dayTags: Record<string, DayTag>;
  expectedAudience: number;
  onSelectPackage: (id: number) => void;
  onChangeAudience: (value: number) => void;
  onChangeDayTags: (dayTags: Record<string, DayTag>) => void;
}) {
  const recommended = recommendPackage(rateTable, expectedAudience);
  const selectedPkg = findPackage(rateTable, packageId);
  const selectedDates = resolveSelectedDates({ week, excludedDays, extraDays });
  const defaults = selectedPkg ? defaultDayTags(selectedDates, selectedPkg.defaultPerformanceDays) : {};

  function toggleDayTag(date: string) {
    const current = effectiveDayTag(date, dayTags, defaults);
    onChangeDayTags({ ...dayTags, [date]: current === "PERFORMANCE" ? "PREP" : "PERFORMANCE" });
  }

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">2. 규모 / 패키지 선택</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        예상 관객 규모를 입력하면 패키지가 추천됩니다. 패키지는 정찰제
        고정가이며, 각 패키지에 기본 포함된 구성을 비교해서 선택하세요.
      </p>

      <div className="mt-6 max-w-xs">
        <label className="mb-1.5 block text-[12.5px] font-medium text-muted">
          예상 관객 규모 (명)
        </label>
        <input
          type="number"
          min={0}
          step={500}
          value={expectedAudience}
          onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-sm border border-border bg-panel px-4 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rateTable.packages.map((pkg) => {
          const isSelected = packageId === pkg.id;
          const isRecommended = recommended === pkg.id;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelectPackage(pkg.id)}
              className={[
                "relative flex flex-col rounded border p-5 text-left transition-colors",
                isSelected
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-panel hover:border-accent/50",
              ].join(" ")}
            >
              {isRecommended && (
                <span className="absolute right-4 top-4 rounded-sm bg-accent px-2.5 py-1 text-[10px] font-semibold text-white">
                  추천
                </span>
              )}
              <div className="text-[15px] font-semibold">{pkg.name}</div>
              <div className="mt-1 text-[12.5px] font-medium text-accent">
                {pkg.audienceTier.label}
              </div>
              <div className="mt-4 text-[19px] font-semibold tabular-nums">
                {won(pkg.baseFeePerWeek)}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">
                / 주 (화~일) · VAT 별도
              </div>

              <div className="mt-4 border-t border-border/70 pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  기본 포함
                </div>
                <ul className="mt-2 space-y-1.5">
                  {pkg.includedItems.length === 0 ? (
                    <li className="text-[12px] text-muted">별도 기본 포함 항목 없음</li>
                  ) : (
                    pkg.includedItems.map((item) => {
                      const addon = findAddon(rateTable, item.addonId);
                      return (
                        <li
                          key={item.addonId}
                          className="flex items-center justify-between text-[12.5px]"
                        >
                          <span>{addon?.name ?? item.addonId}</span>
                          <span className="font-medium text-good">{item.quantity}</span>
                        </li>
                      );
                    })
                  )}
                  <li className="flex items-center justify-between text-[12.5px]">
                    <span>홍보 디지털 매체</span>
                    <span className="font-medium text-good">
                      {pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함"}
                    </span>
                  </li>
                </ul>
              </div>
            </button>
          );
        })}
      </div>

      {selectedPkg && selectedDates.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-[14px] font-semibold">준비일 / 공연일 설정</h3>
          <p className="mt-1.5 text-[12.5px] leading-5 text-muted">
            선택하신 {selectedDates.length}일 중 기본 {selectedPkg.defaultPerformanceDays}일이
            공연일로 지정됩니다. 날짜를 눌러 준비일/공연일을 조정할 수 있으며, 기본 공연일수보다
            늘리거나 줄이면 대관료가 함께 조정됩니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedDates.map((date) => {
              const tag = effectiveDayTag(date, dayTags, defaults);
              const isPerformance = tag === "PERFORMANCE";
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => toggleDayTag(date)}
                  className={[
                    "flex flex-col items-center gap-0.5 rounded-sm border px-3 py-2 text-[12px] font-medium transition-colors",
                    isPerformance
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-panel text-muted hover:border-accent/50",
                  ].join(" ")}
                >
                  <span>{formatDateLabel(date)}</span>
                  <span>{isPerformance ? "공연일" : "준비일"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
