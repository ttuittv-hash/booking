import type { AddonItem, RateTable, RentalPackage } from "./types";

export function findPackage(
  rateTable: RateTable,
  id: number | null | undefined,
): RentalPackage | undefined {
  return rateTable.packages.find((p) => p.id === id);
}

export function findAddon(rateTable: RateTable, id: string): AddonItem | undefined {
  return rateTable.addons.find((a) => a.id === id);
}

export function recommendPackage(rateTable: RateTable, expectedAudience: number): number | null {
  const match = rateTable.packages.find(
    (p) => expectedAudience >= p.audienceTier.min && expectedAudience <= p.audienceTier.max,
  );
  return match ? match.id : null;
}

export function includedQuantity(pkg: RentalPackage | undefined, addonId: string): number {
  const item = pkg?.includedItems.find((i) => i.addonId === addonId);
  return item ? item.quantity : 0;
}

// 패키지 선택에 따라 부대시설이 선택 가능한지 판단 (명세서 3.4)
export function isAddonAvailable(addonItem: AddonItem, pkg: RentalPackage | undefined): boolean {
  if (!pkg) return false;
  const { mode, packages } = addonItem.availability;
  if (mode === "ALWAYS") return true;
  if (mode === "IF_PACKAGE_IN") return !!packages?.includes(pkg.id);
  if (mode === "IF_NOT_INCLUDED") return includedQuantity(pkg, addonItem.id) === 0;
  return false;
}

export function extraWeekPrice(rateTable: RateTable, pkg: RentalPackage): number {
  return Math.round(pkg.baseFeePerWeek * rateTable.extraWeekRatio);
}
