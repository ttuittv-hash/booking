import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, saveNewRateTableVersion } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ rateTable: getCurrentRateTable() });
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

  const current = getCurrentRateTable();

  const packages = current.packages.map((pkg) => {
    const override = packageOverrides.find((p) => p.id === pkg.id);
    return override && Number.isFinite(override.baseFeePerWeek) && override.baseFeePerWeek >= 0
      ? { ...pkg, baseFeePerWeek: override.baseFeePerWeek }
      : pkg;
  });

  const addons = current.addons.map((addon) => {
    const override = addonOverrides.find((a) => a.id === addon.id);
    return override && Number.isFinite(override.unitPrice) && override.unitPrice >= 0
      ? { ...addon, unitPrice: override.unitPrice }
      : addon;
  });

  const next = saveNewRateTableVersion({
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
