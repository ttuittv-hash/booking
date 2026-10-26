import { describe, expect, it } from "vitest";
import { bookingSelection } from "@/test/fixtures/bookingSelection";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { buildSeedRateTable } from "@/lib/pricing/seed";
import { SPECIAL_VENUE_ID } from "@/lib/pricing/types";
import { previewScheduleIsIncomplete, selectPreviewWeek } from "./bookingPreviewScheduleState";
import { toggleAncillaryPlan } from "./StepAudience";

const week = { year: 2027, month: 8, weekOfMonth: 2 };
describe("preview schedule API contract", () => {
  it.each([0, 1, 2, 3, 4])("round-trips valid calendar week %s through server date resolution", weekOfMonth => {
    const chosen = { ...week, weekOfMonth };
    const selection = selectPreviewWeek(bookingSelection(), chosen, false);
    expect(Object.keys(selection.dayTags)).toEqual(resolveSelectedDates(selection));
    expect(previewScheduleIsIncomplete(selection)).toBe(false);
    expect(calculateQuote(JSON.parse(JSON.stringify(selection)), buildSeedRateTable()).blockingIssues).toEqual([]);
  });
  it("updates the month/week when choosing a standalone middle-hall week", () => {
    const chosen = { year: 2027, month: 10, weekOfMonth: 1 };
    const selection = selectPreviewWeek(bookingSelection({ venueId: "medium-hall", packageId: null }), chosen, true);
    expect(selection.week).toEqual(chosen);
    expect(previewScheduleIsIncomplete(selection)).toBe(false);
    expect(calculateQuote(selection, buildSeedRateTable()).blockingIssues).toEqual([]);
  });
  it("preserves a mid-first selection and blocks mismatched arena ranges", () => {
    const midFirst = selectPreviewWeek(bookingSelection({ bookingMode: "SIMULTANEOUS" }), week, true);
    expect(previewScheduleIsIncomplete(midFirst)).toBe(true);
    const matched = selectPreviewWeek(midFirst, week, false);
    expect(matched.midHallDays).toEqual(midFirst.midHallDays);
    expect(previewScheduleIsIncomplete(matched)).toBe(false);
    const mismatched = selectPreviewWeek(matched, { ...week, weekOfMonth: 3 }, false);
    expect(previewScheduleIsIncomplete(mismatched)).toBe(true);
  });
  it("synchronizes both venues for All in One and clears stale arena extensions", () => {
    const selection = selectPreviewWeek(bookingSelection({ venueId: SPECIAL_VENUE_ID, extraDays: 2, dayShowCounts: { "2027-07-01": 3 } }), week, false);
    expect(Object.keys(selection.midHallDays)).toEqual(Object.keys(selection.dayTags));
    expect(selection.extraDays).toBe(0);
    expect(selection.dayShowCounts).toEqual({});
  });
  it("cannot advance with only preparation days", () => {
    const selection = selectPreviewWeek(bookingSelection(), week, false);
    selection.dayTags = Object.fromEntries(Object.keys(selection.dayTags).map(date => [date, "PREP"]));
    expect(previewScheduleIsIncomplete(selection)).toBe(true);
  });
});
it("NONE is mutually exclusive without discarding other multi-selections", () => {
  expect(toggleAncillaryPlan(["MD_SALES", "POPUP_STORE"], "NONE")).toEqual(["NONE"]);
  expect(toggleAncillaryPlan(["NONE"], "MD_SALES")).toEqual(["MD_SALES"]);
  expect(toggleAncillaryPlan(["MD_SALES"], "POPUP_STORE")).toEqual(["MD_SALES", "POPUP_STORE"]);
});

it("ignores retained split information when pricing a standalone mid-hall application", () => {
  const single = selectPreviewWeek(bookingSelection({ venueId: "medium-hall", packageId: null }), week, true);
  single.performanceInfo.competitionFeeOptionMax = 100000;
  const stale = { ...single, midHallPerformanceInfo: { ...single.performanceInfo, competitionFeeOptionMax: 900000 } };
  expect(calculateQuote(stale, buildSeedRateTable()).total).toBe(calculateQuote(single, buildSeedRateTable()).total);
});
