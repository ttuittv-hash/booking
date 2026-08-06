"use client";

import { won } from "@/lib/format";
import {
  findAddon,
  packagePrice,
  packagesForVenue,
  recommendPackage,
} from "@/lib/pricing/rateTableUtils";
import { MEDIA_TIER_LABEL, type RateTable } from "@/lib/pricing/types";
import { CHOICE_SELECTED_VARS, choiceClass } from "@/components/ui/kit";

export function Step1Package({
  rateTable,
  venueId,
  packageId,
  expectedAudience,
  onSelectPackage,
  onChangeAudience,
}: {
  rateTable: RateTable;
  venueId: string;
  packageId: number | null;
  expectedAudience: number;
  onSelectPackage: (id: number) => void;
  onChangeAudience: (value: number) => void;
}) {
  const recommended = recommendPackage(rateTable, expectedAudience, venueId);
  const venuePackages = packagesForVenue(rateTable, venueId);

  return (
    <section>
      <h2 className="type-kr-heading text-h4-m sm:text-h4">규모 / 패키지 선택</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        예상 관객 규모를 입력하면 패키지가 추천됩니다. 패키지는 정찰제 고정가이며, 각 패키지에 기본
        포함된 구성을 비교해서 선택하세요.
      </p>

      <div className="mt-7 max-w-xs">
        <label htmlFor="expected-audience" className="mb-2 block text-xs font-bold text-muted">
          예상 관객 규모 (명)
        </label>
        <input
          id="expected-audience"
          type="number"
          min={0}
          step={500}
          value={expectedAudience}
          onChange={(e) => onChangeAudience(Math.max(0, Number(e.target.value) || 0))}
          className="field-base tabular-nums"
        />
      </div>

      {/*
        선택 칩 규격(Figma Multi-step Forms). 선택 = 검정 채움 하나로만 표현하고,
        모든 카드는 같은 내부 구조·같은 순서로 정보를 담아 높이가 흔들리지 않게 한다.
      */}
      <ul className="mt-8 grid gap-3">
        {venuePackages.map((pkg) => {
          const isSelected = packageId === pkg.id;
          const isRecommended = recommended === pkg.id;
          return (
            <li key={pkg.id}>
              <button
                type="button"
                onClick={() => onSelectPackage(pkg.id)}
                aria-pressed={isSelected}
                style={isSelected ? CHOICE_SELECTED_VARS : undefined}
                className={choiceClass(isSelected)}
              >
                <span className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="type-kr-heading text-h6-m sm:text-h6">{pkg.name}</span>
                      <span className="text-s text-muted">{pkg.audienceTier.label}</span>
                      {isRecommended && (
                        <span className="type-display text-xs tracking-[0.08em]">추천</span>
                      )}
                    </span>
                    {pkg.tagline && <span className="mt-2 block text-s text-muted">{pkg.tagline}</span>}
                  </span>

                  <span className="shrink-0 sm:text-right">
                    <span className="type-display block text-h6-m tabular-nums sm:text-h6">
                      {won(packagePrice(rateTable, pkg))}
                    </span>
                    <span className="mt-1 block text-xs text-muted">/ 주 (화~일) · VAT 별도</span>
                  </span>
                </span>

                <span className="mt-5 block border-t border-border/40 pt-3">
                  <span className="mb-2 block text-xs font-bold text-muted">기본 포함</span>
                  <span className="flex flex-wrap gap-x-6 gap-y-1.5">
                    {pkg.includedItems.length === 0 ? (
                      <span className="text-xs text-muted">별도 기본 포함 항목 없음</span>
                    ) : (
                      pkg.includedItems.map((item) => {
                        const addon = findAddon(rateTable, item.addonId);
                        return (
                          <span key={item.addonId} className="text-xs text-muted">
                            {addon?.name ?? item.addonId}{" "}
                            <b className="tabular-nums">{item.quantity}</b>
                          </span>
                        );
                      })
                    )}
                    <span className="text-xs text-muted">
                      홍보 디지털 매체{" "}
                      <b>{pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함"}</b>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
