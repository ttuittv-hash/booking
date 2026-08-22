import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, getRatesContent, saveNewRateTableVersion, saveRatesContent } from "@/lib/db";
import type { AddonCategory, AddonItem, MidHallFeeBreakdown, RateTable } from "@/lib/pricing/types";

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
    visibility: "VISIBLE",
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
  const midHallOverride =
    body?.midHall && typeof body.midHall === "object" ? (body.midHall as Record<string, unknown>) : undefined;

  const current = await getCurrentRateTable();

  type MidHallNumberKey = Exclude<keyof RateTable["midHall"], "breakdown">;
  const midHallField = (key: MidHallNumberKey): number => {
    const value = midHallOverride?.[key];
    return typeof value === "number" && value >= 0 ? value : (current.midHall[key] as number);
  };

  // 전용/시설 내역 — 넘어오면 검증해서 담고, 총액은 내역의 합으로 강제한다.
  // 총액과 내역을 따로 받으면 언젠가 어긋난다 — 내역이 있으면 내역이 정본이다.
  const parseBreakdown = (raw: unknown): MidHallFeeBreakdown | null => {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const exclusive = Number(r.exclusive);
    const facility = Number(r.facility);
    if (!Number.isFinite(exclusive) || exclusive < 0) return null;
    if (!Number.isFinite(facility) || facility < 0) return null;
    return { exclusive, facility };
  };
  const rawBreakdown = midHallOverride?.breakdown as Record<string, unknown> | undefined;
  const setup = parseBreakdown(rawBreakdown?.setup);
  const weekday = parseBreakdown(rawBreakdown?.weekday);
  const weekend = parseBreakdown(rawBreakdown?.weekend);
  const breakdown =
    setup && weekday && weekend ? { setup, weekday, weekend } : current.midHall.breakdown;

  const midHall: RateTable["midHall"] = {
    setupDayFee: setup ? setup.exclusive + setup.facility : midHallField("setupDayFee"),
    performanceWeekdayFee: weekday ? weekday.exclusive + weekday.facility : midHallField("performanceWeekdayFee"),
    performanceWeekendFee: weekend ? weekend.exclusive + weekend.facility : midHallField("performanceWeekendFee"),
    extraHourFee: midHallField("extraHourFee"),
    secondShowSurchargeRatio: midHallField("secondShowSurchargeRatio"),
    cleaningUnitPrice: midHallField("cleaningUnitPrice"),
    ...(breakdown ? { breakdown } : {}),
  };

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
    midHall,
  });

  // 내역이 저장됐으면 공개 대관료 페이지 표기도 같은 값으로 갱신한다.
  // 요금표(견적 정본)와 공개 표기(콘텐츠)는 별도 데이터라, 여기서 묶어 주지 않으면
  // 운영자가 두 화면을 오가며 손으로 맞춰야 하고 실제로 어긋난 채 운영된 적이 있다.
  if (setup && weekday && weekend) {
    const fmt = (n: number) => `${n.toLocaleString("ko-KR")}원`;
    const rows: Record<string, MidHallFeeBreakdown> = { setup, weekday, weekend };
    const content = await getRatesContent();
    const liveHall = content.liveHall;
    for (const col of liveHall.columns) {
      const b = rows[col.key];
      if (b && col.values.length > 0) col.values[0] = `${(b.exclusive + b.facility).toLocaleString("ko-KR")}원/일당`;
    }
    for (const col of liveHall.detailColumns) {
      const b = rows[col.key];
      if (b && col.values.length >= 2) {
        col.values[0] = fmt(b.exclusive);
        col.values[1] = fmt(b.facility);
      }
    }
    await saveRatesContent(content);
  }

  return NextResponse.json({ rateTable: next });
}
