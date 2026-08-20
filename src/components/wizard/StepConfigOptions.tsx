"use client";

import { useState } from "react";
import { won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  defaultDayTags,
  effectiveDayTag,
  findPackage,
  includedQuantity,
  isAddonAvailable,
  packagesForVenue,
} from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  MEDIA_TIER_LABEL,
  type AddonCategory,
  type AddonItem,
  type QuoteSelection,
  type RateTable,
  type RentalPackage,
} from "@/lib/pricing/types";

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 05/12] "규모/패키지 선택 → 기본 포함사항 →
// 추가 옵션" 3개 화면을 STEP 2(구성·옵션) 한 화면으로 합친다. 패키지는 신청자가 카드를
// 눌러 고르는 게 아니라 관객 규모로 자동 결정되고(2-16, recommendPackage), 이 화면은
// 그 결과와 기본 구성·선택 옵션만 보여준다.
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

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays);
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performance = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE").length;
  const loadOut = dates.filter((d) => selection.midHallDays[d].role === "LOAD_OUT").length;
  return `${dates.length}일 · 셋업${setup} · 공연${performance}${loadOut > 0 ? ` · 철수${loadOut}` : ""}`;
}

type BaseCompositionGroup = "일정" | "공간" | "인프라";

interface BaseCompositionTile {
  group: BaseCompositionGroup;
  label: string;
  value: string;
}

const BASE_COMPOSITION_GROUP_ORDER: BaseCompositionGroup[] = ["일정", "공간", "인프라"];

const TRUSS_ADDON_IDS = ["mother_truss_a", "mother_truss_b", "mother_truss_c", "mother_truss_l", "mother_truss_r"];

// addon.category → 기본구성 그리드 그룹. SPACE는 공간, PRODUCTION·PREMIUM은 인프라(무대·조명·
// 음향 등 설비류)로 묶는다 — 일정(준비/공연)은 addon이 아니라 합성 항목이라 별도 처리한다.
function baseCompositionGroupOf(category: AddonCategory): BaseCompositionGroup {
  return category === "SPACE" ? "공간" : "인프라";
}

function unitSuffix(unitLabel: string): string {
  if (unitLabel.includes("일")) return "일";
  if (unitLabel.includes("대")) return "대";
  if (unitLabel.includes("실")) return "실";
  return "";
}

// 중형공연장 패키지에서 재사용하는 addon 중 일부는 아레나와 quantity의 의미가 다르다 —
// 아레나는 waiting_room/intercom_wireless를 일 단위 과금 addon(원/일)으로 써서 quantity가
// "포함 일수"를 뜻하지만, 중형 패키지는 같은 addon을 "대기실 몇 실 · 인터컴 몇 대"라는
// 개수 의미로 재사용한다(waitingRoomNote="지상 2실"과 일치). unitLabel만 보고는 구분이
// 안 되므로 중형 패키지에 한해 addonId로 단위를 오버라이드한다.
const MID_HALL_COUNT_UNIT_OVERRIDES: Record<string, string> = {
  waiting_room: "실",
  intercom_wireless: "대",
  intercom_wired: "대",
};

// [화면 뼈대 2026-08-19, 패키지 구성 산정표] "기본 구성" 그리드는 pkg.includedItems를 그대로
// 데이터 기반으로 나열하고(addonId → 요금표에서 이름·단위 조회), 일정 · 공간 · 인프라 3개
// 그룹으로 묶어 보여준다 — 관리자가 "패키지 관리"에서 항목을 추가·삭제·수정하면 이 그리드에도
// 그대로 반영된다. 트러스 5종(A+B+C+L+R)만 산정표처럼 "트러스(센터)" 한 줄로 합쳐 보여준다
// (선택 옵션에서는 5종 그대로 개별 addon으로 남는다 — 여기는 표시 전용 큐레이션일 뿐 요금
// 데이터 모델은 바꾸지 않는다). 준비/공연 일수는 대응하는 addon이 없어 dayBreakdown 문자열
// 에서 그대로 읽는다 — 다만 중형공연장은 패키지 고정 일수가 아니라 캘린더에서 자유롭게
// 고른 일수(최소 대관일수 제한 없음)라 dayBreakdown 기반 준비/공연 타일은 의미가 없으므로
// includeSchedule=false 로 꺼서 공간·인프라 기본 구성만 보여준다.
function baseCompositionTiles(
  pkg: RentalPackage,
  rateTable: RateTable,
  options: { includeSchedule?: boolean } = {},
): BaseCompositionTile[] {
  const { includeSchedule = true } = options;
  const tiles: BaseCompositionTile[] = [];

  if (includeSchedule) {
    const match = pkg.dayBreakdown.match(/준비\s*(\d+)일.*공연\s*(\d+)일/);
    const setupDays = match ? Number(match[1]) : 4;
    const performanceDays = match ? Number(match[2]) : 2;
    tiles.push({ group: "일정", label: "준비", value: `${setupDays}일` });
    tiles.push({ group: "일정", label: "공연", value: `${performanceDays}일` });
  }

  let trussDays = 0;
  for (const item of pkg.includedItems) {
    if (TRUSS_ADDON_IDS.includes(item.addonId)) {
      trussDays = Math.max(trussDays, item.quantity);
      continue;
    }
    const addon = rateTable.addons.find((a) => a.id === item.addonId);
    if (!addon) continue;
    const suffix =
      pkg.venueId === "medium-hall" && MID_HALL_COUNT_UNIT_OVERRIDES[item.addonId]
        ? MID_HALL_COUNT_UNIT_OVERRIDES[item.addonId]
        : unitSuffix(addon.unitLabel);
    tiles.push({
      group: baseCompositionGroupOf(addon.category),
      label: addon.name,
      value: `${item.quantity.toLocaleString()}${suffix}`,
    });
  }
  if (trussDays > 0) tiles.push({ group: "인프라", label: "트러스(센터)", value: `${trussDays}일` });

  return tiles;
}

// [화면 뼈대 2026-08-20, 개정] 관객 규모는 더 이상 별도 "패키지 선택" 화면에서 입력하지
// 않는다 — 일정을 먼저 고르고, 그 규모에 따라 자동 결정되는 패키지·구성을 바로 이 화면
// (구성·옵션)에서 함께 보면서 조정할 수 있게 옮겼다.
function ScaleInputBlock({
  label,
  value,
  onChange,
  note,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  note: string;
}) {
  return (
    <div className="mb-6 border-b border-border pb-6">
      <label className="block text-[13px] font-medium text-foreground">{label} *</label>
      <div className="mt-2">
        <input
          type="number"
          min={0}
          step={500}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-40 rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <span className="ml-2 text-[13px] text-muted">명</span>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{note}</p>
    </div>
  );
}

// 아레나 탭·중형 탭·중형 단독(midHallOnly)에서 공통으로 쓰는 "기본 포함" 그리드 카드.
function BaseCompositionCard({ tiles, note }: { tiles: BaseCompositionTile[]; note: string }) {
  if (tiles.length === 0) return null;
  return (
    <div className="mt-6 rounded border border-good/30 bg-good-soft/30 p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-good px-2 py-0.5 text-[10.5px] font-semibold text-white">기본 포함</span>
        <span className="text-[12.5px] font-medium text-foreground">{note}</span>
      </div>
      <div className="mt-4 space-y-4">
        {BASE_COMPOSITION_GROUP_ORDER.map((group) => {
          const groupTiles = tiles.filter((t) => t.group === group);
          if (groupTiles.length === 0) return null;
          return (
            <div key={group}>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-good">{group}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {groupTiles.map((tile) => (
                  <div key={tile.label} className="rounded-sm border border-good/20 bg-background px-3 py-2">
                    <div className="text-[11px] text-muted">{tile.label}</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-good">{tile.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
  onChangeAudience,
  onChangeSecondaryAudience,
}: {
  rateTable: RateTable;
  selection: QuoteSelection;
  defaultPerformanceDays: number;
  addonQuantities: Record<string, number>;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
  onChangeAudience: (value: number) => void;
  onChangeSecondaryAudience: (value: number) => void;
}) {
  const midHallOnly = selection.venueId === "medium-hall" && selection.bookingMode === "SINGLE";
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const pkg = findPackage(rateTable, selection.packageId);
  const [venueTab, setVenueTab] = useState<"arena" | "medium-hall">("arena");

  if (midHallOnly) {
    const midHallPkg = packagesForVenue(rateTable, "medium-hall")[0];
    const midHallTiles = midHallPkg ? baseCompositionTiles(midHallPkg, rateTable, { includeSchedule: false }) : [];
    return (
      <section className="rounded border border-border bg-background p-7">
        <h2 className="text-[19px] font-semibold">구성 · 옵션</h2>
        <p className="mt-3 text-[13.5px] text-muted">
          중형공연장은 패키지가 없는 일 단위 요금제입니다 — 아래는 예약 일수와 무관하게 항상
          포함되는 기본 구성입니다.
        </p>

        <div className="mt-6">
          <ScaleInputBlock
            label="예상 관객 규모"
            value={selection.secondaryAudience}
            onChange={onChangeSecondaryAudience}
            note="3,000명 초과 시 별도 문의가 필요할 수 있습니다. 청소비 산출에만 사용됩니다."
          />
        </div>

        <BaseCompositionCard
          tiles={midHallTiles}
          note="대관료에 이미 포함된 구성 — 예약 일수와 무관하게 동일하게 제공됩니다"
        />

        <p className="mt-6 text-[13.5px] text-muted">
          추가 옵션(시설사용료 · 센터리프트 등) 선택 화면은 다음 업데이트에서 반영됩니다.
        </p>
      </section>
    );
  }

  if (!pkg) {
    return (
      <section className="rounded border border-border bg-background p-7">
        <h2 className="text-[19px] font-semibold">구성 · 옵션</h2>
        <div className="mt-6">
          <ScaleInputBlock
            label="예상 관객 규모"
            value={selection.expectedAudience}
            onChange={onChangeAudience}
            note="22,000명 초과 시 별도 문의가 필요할 수 있습니다. 관객 규모에 따라 패키지(구성)가 자동 결정됩니다."
          />
        </div>
        <p className="mt-3 text-[13.5px] text-muted">
          위 관객 규모에 맞는 패키지를 아직 찾지 못했습니다. 규모를 조정해 주세요.
        </p>
      </section>
    );
  }

  const grouped = new Map<AddonCategory, AddonItem[]>();
  for (const addon of rateTable.addons) {
    if (!isAddonAvailable(addon, pkg)) continue;
    if (addon.visibility === "HIDDEN") continue; // 자동 산입 항목 — 신청자가 선택하는 화면이 아니다 (2-71)
    if (addon.visibility === "ITEM_ONLY") continue; // 기본 구성 전용 항목 — 별도 구매 옵션이 아니다
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  // [화면 뼈대 2026-08-19, 화면시나리오 STEP 3-3 #①⑤ "금액 노출 시점"] 이 화면(STEP 2 구성·옵션)
  // 에서는 금액을 노출하지 않는다 — 선택된 옵션 건수만 보여주고, 실제 금액은 다음 화면(예상
  // 대관료)에서 처음 확인한다.
  const selectedOptionCount = [...grouped.values()]
    .flat()
    .filter((addon) => addon.billingPhase !== "SETTLEMENT" && (addonQuantities[addon.id] ?? 0) > 0).length;

  const compositionTiles: BaseCompositionTile[] = [
    ...baseCompositionTiles(pkg, rateTable),
    {
      group: "인프라",
      label: "홍보 디지털 매체",
      value: pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함",
    },
  ];

  const arenaSection = (
    <>
      <ScaleInputBlock
        label="예상 관객 규모"
        value={selection.expectedAudience}
        onChange={onChangeAudience}
        note="22,000명 초과 시 별도 문의가 필요할 수 있습니다. 관객 규모에 따라 아래 패키지(구성)가 자동 결정됩니다."
      />
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="text-[19px] font-semibold">아레나</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            관객 규모 기준 자동 산정 · {pkg.audienceTier.label} · 예상 관객{" "}
            {selection.expectedAudience.toLocaleString()}명 · {arenaSummaryLine(selection, defaultPerformanceDays)}
          </p>
        </div>
      </div>

      <BaseCompositionCard
        tiles={compositionTiles}
        note="대관료에 이미 포함된 구성 — 관객 규모와 무관하게 전 패키지 동일하게 제공됩니다"
      />

      <div className="mt-6 rounded border border-accent/30 bg-accent-soft/20 p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-accent px-2 py-0.5 text-[10.5px] font-semibold text-white">선택 옵션</span>
          <span className="text-[12.5px] font-medium text-foreground">
            필요한 만큼 수량을 정해 추가하는 항목 — 단가 × 수량으로 금액이 즉시 계산됩니다
          </span>
        </div>
        <div className="mt-4 space-y-6">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
                {ADDON_CATEGORY_LABEL[category]}
              </div>
              <div className="space-y-2">
                {items.map((addon) => (
                  <AddonRow
                    key={addon.id}
                    addon={addon}
                    included={includedQuantity(pkg, addon.id)}
                    quantity={addonQuantities[addon.id] ?? 0}
                    expectedRevenue={expectedRevenue}
                    onChangeQuantity={onChangeQuantity}
                    onChangeRevenue={onChangeRevenue}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-sm bg-background px-4 py-3 text-[13.5px] font-semibold">
          <span>선택 옵션</span>
          <span className="tabular-nums">{selectedOptionCount}건 선택됨</span>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          청소 사용료 · 수도광열비 · 추가 광고 구좌 등은 별도입니다. 금액은 표시하지 않으며,
          선택을 마치면 다음 화면(예상 대관료)에서 총액을 확인합니다.
          <br />※ 신청 규모를 초과해 좌석을 오픈하는 경우 사후 정산 시 추가 과금됩니다.
        </p>
      </div>
    </>
  );

  if (!isSimultaneous) {
    return <section className="rounded border border-border bg-background p-7">{arenaSection}</section>;
  }

  const midHallPkgForTab = packagesForVenue(rateTable, "medium-hall")[0];
  const midHallTilesForTab = midHallPkgForTab
    ? baseCompositionTiles(midHallPkgForTab, rateTable, { includeSchedule: false })
    : [];
  const midHallLine = midHallSummaryLine(selection);

  const midHallSection = (
    <>
      <ScaleInputBlock
        label="예상 관객 규모"
        value={selection.secondaryAudience}
        onChange={onChangeSecondaryAudience}
        note="3,000명 초과 시 별도 문의가 필요할 수 있습니다. 청소비 산출에만 사용됩니다."
      />
      <div className="border-b border-border pb-4">
        <h2 className="text-[19px] font-semibold">중형공연장</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          일 단위 요금제 ·{" "}
          {midHallLine ? `${midHallLine} (아레나와 별개 공간)` : "일정 선택의 중형 일정 탭에서 날짜를 먼저 지정해 주세요."}
        </p>
      </div>

      <BaseCompositionCard
        tiles={midHallTilesForTab}
        note="대관료에 이미 포함된 구성 — 예약 일수와 무관하게 동일하게 제공됩니다"
      />

      <p className="mt-6 text-[13.5px] text-muted">
        추가 옵션(시설사용료 · 센터리프트 등) 선택 화면은 다음 업데이트에서 반영됩니다.
      </p>
    </>
  );

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">구성 · 옵션</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        동시 대관은 두 공간의 구성이 서로 달라 탭으로 나눠 보여줍니다.
      </p>

      <div className="mt-5 flex gap-1 border-b border-border">
        {(["arena", "medium-hall"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setVenueTab(tab)}
            className={[
              "border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors",
              venueTab === tab
                ? "border-accent text-accent"
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
  included,
  quantity,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
}: {
  addon: AddonItem;
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
      ? `패키지 ${addon.availability.packages?.join("·")} 전용`
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

  return (
    <div
      className={[
        "flex flex-col gap-3 rounded border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        isUtil ? "border-border/70 bg-panel/50 opacity-60" : "border-border bg-panel/60",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13.5px] font-medium">{addon.name}</span>
          {included > 0 && (
            <span className="rounded-sm bg-good-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-good">
              {included} 기본포함
            </span>
          )}
          {ruleTag && (
            <span className="rounded-sm bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-warn">
              {ruleTag}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted">
          {addon.unitLabel}
          {addon.note ? ` · ${addon.note}` : ""}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <span className="whitespace-nowrap text-[12px] text-muted">{priceLabel}</span>

        {isUtil ? (
          <span className="whitespace-nowrap text-[12.5px] text-muted">정산 단계 부과</span>
        ) : isRevenue ? (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-muted">
              <input
                type="checkbox"
                checked={quantity > 0}
                onChange={(e) => onChangeQuantity(addon.id, e.target.checked ? 1 : 0)}
                className="h-4 w-4 accent-[var(--accent)]"
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
              className="w-24 shrink-0 rounded-sm border border-border bg-background px-2.5 py-1.5 text-right text-[13px] outline-none focus:border-accent disabled:opacity-40 sm:w-28"
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
            className="w-16 shrink-0 rounded-sm border border-border bg-background px-2.5 py-1.5 text-right text-[13px] outline-none focus:border-accent"
          />
        )}
      </div>
    </div>
  );
}
