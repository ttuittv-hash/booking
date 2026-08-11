import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, saveNewRateTableVersion } from "@/lib/db";
import type { AddonCategory, AddonItem } from "@/lib/pricing/types";

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

export async function GET() {
  return NextResponse.json({ rateTable: await getCurrentRateTable() });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const packageOverrides = Array.isArray(body?.packages)
    ? (body.packages as { id: number; baseFeePerWeek: number }[])
    : [];
  const addonOverrides = Array.isArray(body?.addons)
    ? (body.addons as { id: string; unitPrice: number }[])
    : [];
  const extraWeekRatio = typeof body?.extraWeekRatio === "number" ? body.extraWeekRatio : undefined;
  const dayExclusionDiscountRatio =
    typeof body?.dayExclusionDiscountRatio === "number" ? body.dayExclusionDiscountRatio : undefined;

  const current = await getCurrentRateTable();

  const packages = current.packages.map((pkg) => {
    const override = packageOverrides.find((p) => p.id === pkg.id);
    return override && Number.isFinite(override.baseFeePerWeek) && override.baseFeePerWeek >= 0
      ? { ...pkg, baseFeePerWeek: override.baseFeePerWeek }
      : pkg;
  });

  const currentAddonIds = new Set(current.addons.map((a) => a.id));
  const updatedExistingAddons = current.addons.map((addon) => {
    const override = addonOverrides.find((a) => a.id === addon.id);
    return override && Number.isFinite(override.unitPrice) && override.unitPrice >= 0
      ? { ...addon, unitPrice: override.unitPrice }
      : addon;
  });
  const newAddonsRaw = Array.isArray(body?.newAddons) ? (body.newAddons as unknown[]) : [];
  const newAddons = newAddonsRaw
    .filter(
      (a): a is Record<string, unknown> =>
        !!a && typeof a === "object" && typeof (a as Record<string, unknown>).id === "string" && !currentAddonIds.has((a as Record<string, unknown>).id as string),
    )
    .map(sanitizeNewAddon)
    .filter((a): a is AddonItem => a !== null);
  const addons = [...updatedExistingAddons, ...newAddons];

  const next = await saveNewRateTableVersion({
    vatRate: current.vatRate,
    extraWeekRatio:
      extraWeekRatio !== undefined && extraWeekRatio >= 0 ? extraWeekRatio : current.extraWeekRatio,
    dayExclusionDiscountRatio:
      dayExclusionDiscountRatio !== undefined && dayExclusionDiscountRatio >= 0
        ? dayExclusionDiscountRatio
        : current.dayExclusionDiscountRatio,
    packages,
    addons,
  });

  return NextResponse.json({ rateTable: next });
}
