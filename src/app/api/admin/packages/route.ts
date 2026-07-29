import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, saveNewRateTableVersion } from "@/lib/db";
import type { MediaTier, PackageInclusion, RentalPackage } from "@/lib/pricing/types";

const MEDIA_TIERS: (MediaTier | null)[] = ["BASIC", "EXTENDED", "FULL", null];

function blankPackage(id: number): RentalPackage {
  return {
    id,
    name: `패키지 ${id}`,
    audienceTier: { min: 0, max: 0, label: "" },
    baseFeePerWeek: 0,
    includedWeeks: 1,
    includedItems: [],
    mediaTier: null,
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

  const str = (key: string) => (typeof p[key] === "string" ? (p[key] as string) : current[key as keyof RentalPackage]);

  const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : current.name;
  const baseFeePerWeek = Number.isFinite(Number(p.baseFeePerWeek)) ? Math.max(0, Number(p.baseFeePerWeek)) : current.baseFeePerWeek;
  const defaultPerformanceDays = Number.isFinite(Number(p.defaultPerformanceDays))
    ? Math.max(0, Math.round(Number(p.defaultPerformanceDays)))
    : current.defaultPerformanceDays;

  return {
    ...current,
    name,
    baseFeePerWeek,
    defaultPerformanceDays,
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

  const next = saveNewRateTableVersion({
    vatRate: current.vatRate,
    extraWeekRatio: current.extraWeekRatio,
    dayExclusionDiscountRatio: current.dayExclusionDiscountRatio,
    packages,
    addons: current.addons,
  });

  return NextResponse.json({ rateTable: next });
}
