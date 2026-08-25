import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, saveNewRateTableVersion } from "@/lib/db";
import {
  VENUES,
  type AddonCategory,
  type AddonItem,
  type AvailabilityMode,
  type LineItemVisibility,
  type MediaTier,
  type PackageInclusion,
  type RentalPackage,
} from "@/lib/pricing/types";

const MEDIA_TIERS: (MediaTier | null)[] = ["BASIC", "EXTENDED", "FULL", null];
const ADDON_VISIBILITIES: LineItemVisibility[] = ["VISIBLE", "ITEM_ONLY", "HIDDEN"];
const AVAILABILITY_MODES: AvailabilityMode[] = ["ALWAYS", "IF_PACKAGE_IN", "IF_NOT_INCLUDED"];

// availability.packages(항목을 어떤 패키지에서 제공할지)가 이걸 안 읽으면 어드민에서
// "제공" 체크를 바꿔도 저장이 안 된다(2026-08-23, "체크한것만 노출되는걸로 바꿔라" 구현
// 중 발견 — visibility 드롭다운도 같은 이유로 이미 저장이 안 되고 있었다).
function sanitizeAvailability(input: unknown, current: AddonItem["availability"]): AddonItem["availability"] {
  if (!input || typeof input !== "object") return current;
  const a = input as Record<string, unknown>;
  if (!AVAILABILITY_MODES.includes(a.mode as AvailabilityMode)) return current;
  const mode = a.mode as AvailabilityMode;
  if (mode !== "IF_PACKAGE_IN") return { mode };
  const packages = Array.isArray(a.packages)
    ? (a.packages as unknown[]).filter((v): v is number => Number.isFinite(Number(v))).map(Number)
    : [];
  return { mode, packages };
}

const ADDON_CATEGORIES: AddonCategory[] = [
  "SCHEDULE",
  "SERVICE",
  "FACILITY",
  "SPACE",
  "PREMIUM",
  "PRODUCTION",
  "FEE",
  "UTILITY",
  "PROMOTION",
];

function sanitizeAddonUpdate(current: AddonItem, input: unknown): AddonItem {
  if (!input || typeof input !== "object") return current;
  const a = input as Record<string, unknown>;
  return {
    ...current,
    name: typeof a.name === "string" && a.name.trim() ? a.name.trim() : current.name,
    unitLabel: typeof a.unitLabel === "string" && a.unitLabel.trim() ? a.unitLabel.trim() : current.unitLabel,
    unitPrice:
      Number.isFinite(Number(a.unitPrice)) && Number(a.unitPrice) >= 0
        ? Number(a.unitPrice)
        : current.unitPrice,
    visibility: ADDON_VISIBILITIES.includes(a.visibility as LineItemVisibility)
      ? (a.visibility as LineItemVisibility)
      : current.visibility,
    availability: sanitizeAvailability(a.availability, current.availability),
  };
}

function sanitizeNewAddon(input: Record<string, unknown>): AddonItem | null {
  const id = typeof input.id === "string" && input.id.trim() ? input.id.trim() : null;
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : null;
  const category = ADDON_CATEGORIES.includes(input.category as AddonCategory)
    ? (input.category as AddonCategory)
    : null;
  if (!id || !name || !category) return null;
  return {
    id,
    category,
    name,
    pricingType: "PER_DAY",
    unitPrice: Number.isFinite(Number(input.unitPrice)) ? Math.max(0, Number(input.unitPrice)) : 0,
    unitLabel: typeof input.unitLabel === "string" && input.unitLabel.trim() ? input.unitLabel.trim() : "원",
    // 새 항목도 클라이언트가 보낸 노출등급·제공범위를 그대로 받는다 — PackagesForm에서
    // "선택 옵션"으로 만든 새 항목은 지금 편집 중인 패키지에만 우선 노출되도록
    // { mode: "IF_PACKAGE_IN", packages: [그 패키지 id] }를 보낸다.
    availability: sanitizeAvailability(input.availability, { mode: "ALWAYS" }),
    billingPhase: "ESTIMATE",
    visibility: ADDON_VISIBILITIES.includes(input.visibility as LineItemVisibility)
      ? (input.visibility as LineItemVisibility)
      : "VISIBLE",
  };
}

function blankPackage(id: number): RentalPackage {
  return {
    id,
    venueId: VENUES[0].id,
    name: `패키지 ${id}`,
    tagline: "",
    audienceTier: { min: 0, max: 0, label: "" },
    baseFeePerWeek: 0,
    bowlFee: 0,
    includedWeeks: 1,
    includedItems: [],
    mediaTier: null,
    discountRatio: 0,
    setupExtraDayFee: 0,
    performanceExtraDayFee: 0,
    dayBreakdown: "준비 4일 + 공연 2일",
    defaultPerformanceDays: 2,
    rentalHours: "09:00 ~ 22:00",
    outdoorPlazaIncluded: false,
    parkingPerDay: "",
    waitingRoomNote: "",
    sideFacilities: "",
    seatingType: "",
    stageType: "",
  };
}

function sanitizePackage(current: RentalPackage, input: unknown): RentalPackage {
  if (!input || typeof input !== "object") return current;
  const p = input as Record<string, unknown>;

  const audienceTier =
    p.audienceTier && typeof p.audienceTier === "object"
      ? {
          min: Number((p.audienceTier as Record<string, unknown>).min) || 0,
          max: Number((p.audienceTier as Record<string, unknown>).max) || 0,
          label:
            typeof (p.audienceTier as Record<string, unknown>).label === "string"
              ? ((p.audienceTier as Record<string, unknown>).label as string)
              : current.audienceTier.label,
        }
      : current.audienceTier;

  const includedItems: PackageInclusion[] = Array.isArray(p.includedItems)
    ? (p.includedItems as unknown[])
        .filter(
          (i): i is { addonId: string; quantity: number } =>
            !!i &&
            typeof i === "object" &&
            typeof (i as Record<string, unknown>).addonId === "string" &&
            Number.isFinite(Number((i as Record<string, unknown>).quantity)) &&
            Number((i as Record<string, unknown>).quantity) > 0,
        )
        .map((i) => ({ addonId: i.addonId, quantity: Math.round(Number(i.quantity)) }))
    : current.includedItems;

  const mediaTier = MEDIA_TIERS.includes(p.mediaTier as MediaTier | null)
    ? (p.mediaTier as MediaTier)
    : current.mediaTier;

  const venueId = VENUES.some((v) => v.id === p.venueId)
    ? (p.venueId as string)
    : (current.venueId ?? VENUES[0].id);

  const str = (key: string) => (typeof p[key] === "string" ? (p[key] as string) : current[key as keyof RentalPackage]);

  const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : current.name;
  const baseFeePerWeek = Number.isFinite(Number(p.baseFeePerWeek)) ? Math.max(0, Number(p.baseFeePerWeek)) : current.baseFeePerWeek;
  const setupExtraDayFee = Number.isFinite(Number(p.setupExtraDayFee))
    ? Math.max(0, Number(p.setupExtraDayFee))
    : current.setupExtraDayFee;
  const performanceExtraDayFee = Number.isFinite(Number(p.performanceExtraDayFee))
    ? Math.max(0, Number(p.performanceExtraDayFee))
    : current.performanceExtraDayFee;
  const defaultPerformanceDays = Number.isFinite(Number(p.defaultPerformanceDays))
    ? Math.max(0, Math.round(Number(p.defaultPerformanceDays)))
    : current.defaultPerformanceDays;
  const discountRatio = Number.isFinite(Number(p.discountRatio))
    ? Math.min(0.9, Math.max(0, Number(p.discountRatio)))
    : current.discountRatio;

  return {
    ...current,
    venueId,
    name,
    tagline: str("tagline") as string,
    baseFeePerWeek,
    setupExtraDayFee,
    performanceExtraDayFee,
    defaultPerformanceDays,
    discountRatio,
    audienceTier,
    includedItems,
    mediaTier,
    dayBreakdown: str("dayBreakdown") as string,
    rentalHours: str("rentalHours") as string,
    parkingPerDay: str("parkingPerDay") as string,
    waitingRoomNote: str("waitingRoomNote") as string,
    sideFacilities: str("sideFacilities") as string,
    seatingType: str("seatingType") as string,
    stageType: str("stageType") as string,
    outdoorPlazaIncluded:
      typeof p.outdoorPlazaIncluded === "boolean" ? p.outdoorPlazaIncluded : current.outdoorPlazaIncluded,
  };
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const overrides = Array.isArray(body?.packages) ? (body.packages as unknown[]) : [];
  const addonOverrides = Array.isArray(body?.addons) ? (body.addons as unknown[]) : [];
  // 화면에서 지운 항목은 여기(removedXxxIds)로만 실제 삭제된다 — 그 전에는 요청에
  // 없는 id를 "빠졌으니 삭제"로 판단하지 않았기 때문에, 서버가 current에서 그대로
  // 다시 채워 넣어 삭제 버튼이 화면에서만 사라지고 저장하면 되살아났다(2026-08-24,
  // "선택옵션들이 삭제해도 rate card에 그대로 남아있는 오류"). id를 아는 항목만
  // 확실히 지우고, 다른 화면(요금표 관리)에서 그 사이 추가된 항목까지 "요청에
  // 없다"는 이유로 함께 지워버리는 사고를 피한다.
  const removedPackageIds = new Set(
    (Array.isArray(body?.removedPackageIds) ? (body.removedPackageIds as unknown[]) : [])
      .filter((v): v is number => Number.isFinite(Number(v)))
      .map(Number),
  );
  const removedAddonIds = new Set(
    (Array.isArray(body?.removedAddonIds) ? (body.removedAddonIds as unknown[]) : []).filter(
      (v): v is string => typeof v === "string",
    ),
  );

  const current = await getCurrentRateTable();

  // 패키지 관리 화면(PackagesForm)은 항상 전체 패키지 목록을 자기 로컬 상태로
  // 들고 있다가 통째로 보낸다(부분 패치가 아니다) — 그래서 요청에 담긴 순서를
  // 그대로 저장 순서로 써도 안전하다. 그 순서가 신청자 화면의 패키지 카드
  // 순서이기도 하다(2026-08-24, "어드민> 패키지 순서 변경 가능하도록"). 요금표
  // 관리(RatesForm) 등 다른 화면은 packages 필드 자체를 보내지 않으므로(빈
  // 배열), 그때는 기존 순서를 그대로 둔다.
  const packages =
    overrides.length > 0
      ? overrides
          .filter(
            (p): p is Record<string, unknown> =>
              !!p && typeof p === "object" && Number.isFinite(Number((p as Record<string, unknown>).id)),
          )
          .map((p) => {
            const id = Number(p.id);
            const base = current.packages.find((pkg) => pkg.id === id) ?? blankPackage(id);
            return sanitizePackage(base, p);
          })
          .filter((pkg) => !removedPackageIds.has(pkg.id))
      : current.packages;

  const packagesWithCleanedItems = packages.map((pkg) =>
    removedAddonIds.size === 0
      ? pkg
      : { ...pkg, includedItems: pkg.includedItems.filter((it) => !removedAddonIds.has(it.addonId)) },
  );

  const currentAddonIds = new Set(current.addons.map((a) => a.id));
  const updatedExistingAddons = current.addons
    .filter((addon) => !removedAddonIds.has(addon.id))
    .map((addon) => {
      const override = addonOverrides.find(
        (a) => a && typeof a === "object" && (a as Record<string, unknown>).id === addon.id,
      );
      return override ? sanitizeAddonUpdate(addon, override) : addon;
    });
  const newAddons = addonOverrides
    .filter(
      (a): a is Record<string, unknown> =>
        !!a && typeof a === "object" && typeof (a as Record<string, unknown>).id === "string" && !currentAddonIds.has((a as Record<string, unknown>).id as string),
    )
    .map(sanitizeNewAddon)
    .filter((a): a is AddonItem => a !== null);
  const addons = [...updatedExistingAddons, ...newAddons];

  const next = await saveNewRateTableVersion({
    vatRate: current.vatRate,
    extraWeekRatio: current.extraWeekRatio,
    dayExclusionDiscountRatio: current.dayExclusionDiscountRatio,
    packages: packagesWithCleanedItems,
    addons,
    midHall: current.midHall,
  });

  return NextResponse.json({ rateTable: next });
}
