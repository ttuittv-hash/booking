"use client";

import { useState } from "react";
import { won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  baseCompositionTiles,
  defaultDayTags,
  effectiveDayTag,
  findPackage,
  includedQuantity,
  isAddonAvailable,
  packagesForVenue,
} from "@/lib/pricing/rateTableUtils";
import {
  type AddonCategory,
  type AddonItem,
  type QuoteSelection,
  type RateTable,
  type RentalPackage,
} from "@/lib/pricing/types";
import { CHOICE_SELECTED_VARS, choiceClass } from "@/components/ui/kit";
import { BaseCompositionCard } from "./BaseCompositionCard";
import { StepHeading } from "./StepHeading";

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 05/12] "규모/패키지 선택 → 기본 포함사항 →
// 추가 옵션" 3개 화면을 STEP 2(구성·옵션) 한 화면으로 합친다.
// [개정 2026-08-20] 패키지는 더 이상 관객 규모로 자동 결정하지 않는다 — 아레나 탭 안에
// "패키지 선택" 슬롯에서 4개 패키지 카드 중 하나를 직접 고르면, 그 아래 "선택 옵션" 슬롯이
// 그 패키지에서 고를 수 있는 옵션으로 바뀐다(isAddonAvailable 필터링은 기존과 동일).
function arenaSummaryLine(selection: QuoteSelection, defaultPerformanceDays: number): string {
  const dates = resolveSelectedDates(selection);
  if (dates.length === 0) return "";
  const defaults = defaultDayTags(dates, defaultPerformanceDays);
  let setup = 0;
  let performance = 0;
  let loadOut = 0;
  for (const d of dates) {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    if (tag === "PREP") setup++;
    else if (tag === "LOAD_OUT") loadOut++;
    else performance++;
  }
  const parts = [`셋업${setup}`, `공연${performance}`];
  if (loadOut > 0) parts.push(`철수${loadOut}`);
  return parts.join(" · ");
}

// [개정 2026-08-20] 아레나 패키지 4개는 기본 구성이 전부 동일하고 관객 규모 등급(Bowl
// 사용료)만 다르다 — 카드로 나열해 신청자가 직접 하나를 고르게 한다. 고른 패키지에 따라
// 바로 아래 "선택 옵션" 슬롯의 항목이 달라진다(isAddonAvailable).
// [개정 2026-08-21] "Custom" 카드는 실제 패키지가 아니다 — 클릭해도 견적 계산에 참여하지
// 않고 운영자 문의 안내만 보여주는 자리표시자다. rateTable.packages에 없는 항목이라
// packages 배열과 별개로 하드코딩한다.
function PackagePicker({
  packages,
  selectedId,
  onSelect,
  onClear,
}: {
  packages: RentalPackage[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}) {
  const [showCustomNotice, setShowCustomNotice] = useState(false);

  return (
    <div className="mb-6 border-b border-border pb-6">
      <label className="block text-s font-bold text-foreground">구성 선택 *</label>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {packages.map((p) => {
          const active = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setShowCustomNotice(false);
                onSelect(p.id);
              }}
              /* 고른 카드는 검정 채움 — 안쪽 제목·설명이 따라오도록 토큰을 국소 반전한다 */
              style={active ? CHOICE_SELECTED_VARS : undefined}
              className={choiceClass(active, { dense: true })}
            >
              <div className="text-s font-bold">{p.name}</div>
              <div className="mt-0.5 text-xs text-muted">{p.tagline}</div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            // Custom은 실제 패키지가 아니라 packageId로 표현할 수 없다 — 이전에 고른
            // 패키지가 남아 있으면 카드 두 개가 동시에 선택된 것처럼 보이므로 여기서
            // 함께 지운다(2026-08-22, "커스텀 선택 시 다른 패키지가 선택 해제되지
            // 않는다" 리포트).
            onClear();
            setShowCustomNotice(true);
          }}
          style={showCustomNotice ? CHOICE_SELECTED_VARS : undefined}
          className={`${choiceClass(showCustomNotice, { dense: true })} border-dashed`}
        >
          <div className="text-s font-bold">Custom</div>
          <div className="mt-0.5 text-xs text-muted">직접구성</div>
        </button>
      </div>

      {showCustomNotice && (
        <p className="mt-3 border border-border/30 bg-panel px-3 py-2.5 text-xs text-muted-strong">
          운영자 문의가 필요한 맞춤 구성입니다. 1:1 문의 또는 담당자에게 연락해 주세요.
        </p>
      )}

      {selectedId != null && (
        <div className="mt-4 border border-border/30 bg-panel/40 px-4 py-3">
          <span className="bg-foreground px-2 py-0.5 text-xs font-bold text-background">기본 포함</span>
          <p className="mt-1.5 text-xs leading-5 text-foreground">
            모든 구성에는 공연 운영에 필요한 기본 시설과 장비가 모두 포함되어 있습니다
            <br />
            자세한 포함 옵션은 신청서 제출 시 최종 옵션을 확인해 주세요
          </p>
        </div>
      )}
    </div>
  );
}

export function StepConfigOptions({
  rateTable,
  selection,
  defaultPerformanceDays,
  addonQuantities,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
  onSelectPackage,
  onClearPackage,
}: {
  rateTable: RateTable;
  selection: QuoteSelection;
  defaultPerformanceDays: number;
  addonQuantities: Record<string, number>;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
  onSelectPackage: (packageId: number) => void;
  onClearPackage: () => void;
}) {
  const midHallOnly = selection.venueId === "medium-hall" && selection.bookingMode === "SINGLE";
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const pkg = findPackage(rateTable, selection.packageId);
  const arenaPackages = packagesForVenue(rateTable, "arena");
  const [venueTab, setVenueTab] = useState<"arena" | "medium-hall">("arena");

  if (midHallOnly) {
    const midHallPkg = packagesForVenue(rateTable, "medium-hall")[0];
    const midHallTiles = midHallPkg ? baseCompositionTiles(midHallPkg, rateTable, { includeSchedule: false }) : [];
    return (
      <section>
        <StepHeading
          title="구성 · 옵션"
          lead="중형공연장은 패키지가 없는 일 단위 요금제입니다 — 아래는 예약 일수와 무관하게 항상 포함되는 기본 구성입니다."
        />

        <BaseCompositionCard
          tiles={midHallTiles}
          note="대관료에 이미 포함된 구성 — 예약 일수와 무관하게 동일하게 제공됩니다"
        />

        <p className="mt-6 text-s text-muted">
          추가 옵션(시설사용료 · 센터리프트 등) 선택 화면은 다음 업데이트에서 반영됩니다.
        </p>
      </section>
    );
  }

  const grouped = new Map<AddonCategory, AddonItem[]>();
  if (pkg) {
    for (const addon of rateTable.addons) {
      if (!isAddonAvailable(addon, pkg)) continue;
      if (addon.visibility === "HIDDEN") continue; // 자동 산입 항목 — 신청자가 선택하는 화면이 아니다 (2-71)
      if (addon.visibility === "ITEM_ONLY") continue; // 기본 구성 전용 항목 — 별도 구매 옵션이 아니다
      const list = grouped.get(addon.category) ?? [];
      list.push(addon);
      grouped.set(addon.category, list);
    }
  }

  // [화면 뼈대 2026-08-19, 화면시나리오 STEP 3-3 #①⑤ "금액 노출 시점"] 이 화면(STEP 2 구성·옵션)
  // 에서는 금액을 노출하지 않는다 — 선택된 옵션 건수만 보여주고, 실제 금액은 다음 화면(예상
  // 대관료)에서 처음 확인한다.
  const selectedOptionCount = [...grouped.values()]
    .flat()
    .filter((addon) => addon.billingPhase !== "SETTLEMENT" && (addonQuantities[addon.id] ?? 0) > 0).length;

  // [개정 2026-08-21] 선택 옵션 목록은 더 이상 카테고리로 묶지 않는다 — 단일 세로 목록으로
  // 평탄화해서 더 가벼운 화면으로 보여준다(요청 시안 기준).
  const flatAddons = [...grouped.values()].flat();

  const arenaSection = (
    <>
      {/* [개정 2026-08-21] 동시 대관은 이미 위에 "아레나/중형공연장" 탭이 있어 그 아래 또
          "아레나" 라벨을 반복하지 않는다 — 탭 없이 단독으로 쓰이는 단일 아레나 예약에서만
          이 헤더가 화면의 유일한 제목이라 남긴다. */}
      {!isSimultaneous && (
        <StepHeading
          title="아레나"
          lead={
            pkg
              ? `${pkg.name} · ${pkg.audienceTier.label} · 예상 관객 ${selection.expectedAudience.toLocaleString()}명 · ${arenaSummaryLine(selection, defaultPerformanceDays)}`
              : undefined
          }
        />
      )}

      <div className="mt-8">
        <PackagePicker
          packages={arenaPackages}
          selectedId={selection.packageId}
          onSelect={onSelectPackage}
          onClear={onClearPackage}
        />
      </div>

      {!pkg ? (
        <p className="text-s text-muted">위에서 구성을 선택하면 선택 옵션을 확인할 수 있습니다.</p>
      ) : (
        /* 선택 옵션 = 아웃라인 박스. 색면을 쓰지 않는다 — 안의 항목도 아웃라인만이다 */
        <div className="mt-6 border border-border/25 p-5">
          <h2 className="type-kr-heading text-h6-m sm:text-h6">선택 옵션</h2>
          <p className="mt-2 text-xs text-muted">
            필요한 만큼 수량을 정해 추가하는 항목 — 단가 × 수량으로 금액이 즉시 계산됩니다
          </p>
          <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {flatAddons.map((addon) => (
              <AddonRow
                key={addon.id}
                addon={addon}
                packages={arenaPackages}
                included={includedQuantity(pkg, addon.id)}
                quantity={addonQuantities[addon.id] ?? 0}
                expectedRevenue={expectedRevenue}
                onChangeQuantity={onChangeQuantity}
                onChangeRevenue={onChangeRevenue}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4 text-s font-bold">
            <span>선택 옵션</span>
            <span className="tabular-nums">{selectedOptionCount}건 선택됨</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            청소 사용료 · 수도광열비 · 추가 광고 구좌 등은 별도입니다. 금액은 표시하지 않으며,
            선택을 마치면 다음 화면(예상 대관료)에서 총액을 확인합니다.
            <br />※ 신청 규모를 초과해 좌석을 오픈하는 경우 사후 정산 시 추가 과금됩니다.
          </p>
        </div>
      )}
    </>
  );

  if (!isSimultaneous) {
    return <section>{arenaSection}</section>;
  }

  const midHallPkgForTab = packagesForVenue(rateTable, "medium-hall")[0];
  const midHallTilesForTab = midHallPkgForTab
    ? baseCompositionTiles(midHallPkgForTab, rateTable, { includeSchedule: false })
    : [];

  const midHallSection = (
    <>
      <BaseCompositionCard
        tiles={midHallTilesForTab}
        note="대관료에 이미 포함된 구성 — 예약 일수와 무관하게 동일하게 제공됩니다"
      />

      <p className="mt-6 text-s text-muted">
        추가 옵션(시설사용료 · 센터리프트 등) 선택 화면은 다음 업데이트에서 반영됩니다.
      </p>
    </>
  );

  return (
    <section>
      <StepHeading title="구성 · 옵션" lead="동시 대관은 두 공간의 구성이 서로 달라 탭으로 나눠 보여줍니다." />

      <div className="mt-8 flex gap-1 border-b border-border">
        {(["arena", "medium-hall"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setVenueTab(tab)}
            className={[
              "flex h-10 items-center border-b-2 px-4 text-s font-bold transition-colors",
              venueTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {tab === "arena" ? "아레나" : "중형공연장"}
          </button>
        ))}
      </div>

      <div className="mt-6">{venueTab === "arena" ? arenaSection : midHallSection}</div>
    </section>
  );
}

function AddonRow({
  addon,
  packages,
  included,
  quantity,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
}: {
  addon: AddonItem;
  packages: RentalPackage[];
  included: number;
  quantity: number;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
}) {
  const isUtil = addon.billingPhase === "SETTLEMENT";
  const isRevenue = addon.pricingType === "REVENUE_PERCENT";
  const ruleTag =
    addon.availability.mode === "IF_PACKAGE_IN"
      ? // "패키지 1·2 전용"처럼 원본 id를 그대로 보여주면 Rate A/B/C/D 이름 변경과
        // 어긋나 헷갈린다(2026-08-22) — 이름으로 바꿔 보여준다.
        `${(addon.availability.packages ?? [])
          .map((id) => packages.find((p) => p.id === id)?.name ?? String(id))
          .join("·")} 전용`
      : addon.availability.mode === "IF_NOT_INCLUDED"
        ? "미포함 시 선택"
        : null;

  const maxTotal =
    addon.availability.maxAddQuantity && addon.availability.maxAddQuantity !== "UNLIMITED"
      ? included + addon.availability.maxAddQuantity
      : undefined;

  const priceLabel = isUtil
    ? "실사용 정산"
    : isRevenue
      ? `매출 ${addon.unitPrice}%`
      : `${won(addon.unitPrice)} / ${addon.unitLabel.replace("원/", "")}`;

  // 항목은 아웃라인만이다. 선택 여부로 면 색을 바꾸지 않는다 —
  // 수량을 적는 칸이 안에 있어서 면 색이 바뀌면 입력한 숫자가 묻힌다.
  return (
    <div
      className={[
        "flex flex-col gap-1.5 border border-border-soft px-3 py-2",
        isUtil ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold">{addon.name}</span>
          {included > 0 && (
            <>
              {/* 숫자와 "기본포함" 라벨이 한 뱃지 안에 붙어 있으면 "14기본포함"처럼
                  읽혀 헷갈린다("뱃지는 따로 분리" 피드백) — 개수는 일반 텍스트로,
                  "기본 포함"은 별도 뱃지로 나눈다. */}
              <span className="border border-border/40 bg-panel px-1.5 py-0.5 text-xs font-bold text-foreground">
                기본 포함
              </span>
              <span className="text-xs font-bold text-muted">{included}개</span>
            </>
          )}
          {ruleTag && (
            <span className="border border-border/40 px-1.5 py-0.5 text-xs font-bold text-muted">
              {ruleTag}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {addon.unitLabel}
          {addon.note ? ` · ${addon.note}` : ""}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="whitespace-nowrap text-xs text-muted">{priceLabel}</span>

        {isUtil ? (
          <span className="whitespace-nowrap text-xs text-muted">정산 단계 부과</span>
        ) : isRevenue ? (
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted">
              <input
                type="checkbox"
                checked={quantity > 0}
                onChange={(e) => onChangeQuantity(addon.id, e.target.checked ? 1 : 0)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              적용
            </label>
            <input
              type="number"
              min={0}
              step={1_000_000}
              placeholder="예상매출"
              value={expectedRevenue || ""}
              disabled={quantity <= 0}
              onChange={(e) => onChangeRevenue(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 shrink-0 border border-border bg-background px-2 py-1 text-right text-xs outline-none focus:border-foreground disabled:opacity-40"
            />
          </div>
        ) : (
          <input
            type="number"
            min={0}
            max={maxTotal}
            value={quantity || ""}
            placeholder="0"
            onChange={(e) =>
              onChangeQuantity(addon.id, Math.max(0, Number(e.target.value) || 0))
            }
            className="w-14 shrink-0 border border-border bg-background px-2 py-1 text-right text-xs outline-none focus:border-foreground"
          />
        )}
      </div>
    </div>
  );
}
