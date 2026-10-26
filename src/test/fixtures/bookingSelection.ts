import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import type { QuoteSelection } from "@/lib/pricing/types";

export function bookingSelection(overrides: Partial<QuoteSelection> = {}): QuoteSelection {
  return {
    venueId: "arena", bookingMode: "SINGLE", packageId: 2,
    week: { year: 2027, month: 8, weekOfMonth: 2 },
    excludedDays: [], extraDays: 0, dayTags: {}, dayShowCounts: {},
    expectedAudience: 8000, secondaryAudience: 1500, midHallDays: {},
    midHallExtraSetupHours: 0, midHallExtraLoadOutHours: 0,
    expectedRevenue: 0, addons: [], performanceInfo: structuredClone(INITIAL_PERFORMANCE_INFO),
    midHallPerformanceInfo: null, ...overrides,
  };
}
