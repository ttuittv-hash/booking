"use client";

import { won } from "@/lib/format";
import { findAddon, recommendPackage } from "@/lib/pricing/rateTableUtils";
import { MEDIA_TIER_LABEL, type RateTable } from "@/lib/pricing/types";
import { Badge, Label } from "@/components/ui/kit";

/** 입력 필드 — mypage/ProfileForm 의 FIELD 와 동일 규격 (샤프 · border-soft · 옐로 아웃라인) */
const FIELD =
  "w-full border border-border-soft bg-surface px-3.5 py-2.5 text-s text-foreground transition-colors placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-accent";

export function Step1Package({
  rateTable,
  packageId,
  expectedAudience,
  onSelectPackage,
  onChangeAudience,
}: {
  rateTable: RateTable;
  packageId: number | null;
  expectedAudience: number;
  onSelectPackage: (id: number) => void;
  onChangeAudience: (value: number) => void;
}) {
  const recommended = recommendPackage(rateTable, expectedAudience);

  return (
    <section>
      <Label className="text-muted">Step 02</Label>
      <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">규모 / 패키지 선택</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        예상 관객 규모를 입력하면 패키지가 추천됩니다. 패키지는 정찰제 고정가이며, 각 패키지에 기본
        포함된 구성을 비교해서 선택하세요.
      </p>

      <div className="mt-7 max-w-xs">
        <label htmlFor="expected-audience" className="type-label mb-2 block text-xs text-muted">
          예상 관객 규모 (명)
        </label>
        <input
          id="expected-audience"
          type="number"
          min={0}
          step={500}
          value={expectedAudience}
          onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
          className={`${FIELD} tabular-nums`}
        />
      </div>

      {/* 선택 타일이 아니라 헤어라인 로우. 선택 상태는 옐로 좌측 바로 표시한다. */}
      <ul className="mt-8 border-t border-border/25">
        {rateTable.packages.map((pkg) => {
          const isSelected = packageId === pkg.id;
          const isRecommended = recommended === pkg.id;
          return (
            <li key={pkg.id} className="border-b border-border/25">
              <button
                type="button"
                onClick={() => onSelectPackage(pkg.id)}
                aria-pressed={isSelected}
                className={[
                  "flex w-full flex-col gap-5 border-l-4 py-6 pl-4 pr-1 text-left outline-none transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                  "sm:flex-row sm:items-start sm:gap-8",
                  isSelected
                    ? "border-l-accent bg-foreground/[0.04]"
                    : "border-l-transparent hover:bg-foreground/[0.03]",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="type-kr-heading text-h6-m sm:text-h6">{pkg.name}</span>
                    <span className="text-s text-muted">{pkg.audienceTier.label}</span>
                    {isRecommended && <Badge tone="accent">추천</Badge>}
                    {isSelected && <Badge tone="neutral">선택됨</Badge>}
                  </div>

                  {pkg.tagline && <p className="mt-2 text-s text-muted">{pkg.tagline}</p>}

                  <div className="mt-4 border-t border-border/15 pt-3">
                    <div className="type-label mb-2 text-xs text-muted">기본 포함</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                      {pkg.includedItems.length === 0 ? (
                        <span className="text-xs text-muted">별도 기본 포함 항목 없음</span>
                      ) : (
                        pkg.includedItems.map((item) => {
                          const addon = findAddon(rateTable, item.addonId);
                          return (
                            <span key={item.addonId} className="text-xs text-muted">
                              {addon?.name ?? item.addonId}{" "}
                              <b className="tabular-nums text-foreground">{item.quantity}</b>
                            </span>
                          );
                        })
                      )}
                      <span className="text-xs text-muted">
                        홍보 디지털 매체{" "}
                        <b className="text-foreground">
                          {pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함"}
                        </b>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 sm:text-right">
                  <div className="type-display text-h6-m tabular-nums sm:text-h6">
                    {won(pkg.baseFeePerWeek)}
                  </div>
                  <div className="mt-1 text-xs text-muted">/ 주 (화~일) · VAT 별도</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
