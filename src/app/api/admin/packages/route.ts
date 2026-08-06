import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, saveNewRateTableVersion } from "@/lib/db";
import { VENUES, type AddonCategory, type AddonItem, type MediaTier, type PackageInclusion, type RentalPackage } from "@/lib/pricing/types";

const MEDIA_TIERS: (MediaTier | null)[] = ["BASIC", "EXTENDED", "FULL", null];

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
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
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
    includedWeeks: 1,
    includedItems: [],
    mediaTier: null,
    discountRatio: 0,
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

  const current = getCurrentRateTable();
  const currentIds = new Set(current.packages.map((pkg) => pkg.id));

  const updatedExisting = current.packages.map((pkg) => {
    const override = overrides.find(
      (p) => p && typeof p === "object" && (p as Record<string, unknown>).id === pkg.id,
    );
    return sanitizePackage(pkg, override);
  });

  const newOnes = overrides
    .filter(
      (p): p is Record<string, unknown> =>
        !!p && typeof p === "object" && Number.isFinite(Number((p as Record<string, unknown>).id)) && !currentIds.has(Number((p as Record<string, unknown>).id)),
    )
    .map((p) => sanitizePackage(blankPackage(Number(p.id)), p));

  const packages = [...updatedExisting, ...newOnes];

  const currentAddonIds = new Set(current.addons.map((a) => a.id));
  const updatedExistingAddons = current.addons.map((addon) => {
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

  const next = saveNewRateTableVersion({
    vatRate: current.vatRate,
    extraWeekRatio: current.extraWeekRatio,
    dayExclusionDiscountRatio: current.dayExclusionDiscountRatio,
    packages,
    addons,
  });

  return NextResponse.json({ rateTable: next });
}
