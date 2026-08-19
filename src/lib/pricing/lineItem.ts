import type { LineItem, LineItemVisibility, PricingType } from "./types";

export function makeLine(
  addonId: string,
  label: string,
  pricingType: PricingType,
  requested: number,
  included: number,
  billable: number,
  unitPrice: number,
  amount: number,
  visibility: LineItemVisibility,
  phase: LineItem["phase"] = "ESTIMATE",
): LineItem {
  return { addonId, label, pricingType, requested, included, billable, unitPrice, amount, phase, visibility };
}
