import { arenaMiddleBaseDaysIncomplete, midHallDatesOutsideArenaRange, resolveSelectedDates } from "@/lib/pricing/dateRange";
import { SPECIAL_VENUE_ID, type QuoteSelection } from "@/lib/pricing/types";
/** Produce the existing API payload, not a second preview-only schedule model. */
export function selectPreviewWeek(previous: QuoteSelection, week: QuoteSelection["week"], mid: boolean): QuoteSelection {
    const dates = resolveSelectedDates({ week, excludedDays: [], extraDays: 0 });
    const isPerformance = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
    const midHallDays: QuoteSelection["midHallDays"] = Object.fromEntries(dates.map(date => [date, {
            role: isPerformance(date) ? "PERFORMANCE" : "SETUP", shows: 1,
        }]));
    if (mid)
        return { ...previous, week: previous.bookingMode === "SIMULTANEOUS" ? previous.week : week, midHallDays };
    return {
        ...previous, week, excludedDays: [], extraDays: 0,
        dayTags: Object.fromEntries(dates.map(date => [date, isPerformance(date) ? "PERFORMANCE" : "PREP"])),
        dayShowCounts: {},
        midHallDays: previous.venueId === SPECIAL_VENUE_ID ? midHallDays : previous.midHallDays,
    };
}
/** Shared by Next and direct step navigation so neither can bypass schedule validation. */
export function previewScheduleIsIncomplete(selection: QuoteSelection): boolean {
    if (!selection.venueId)
        return true;
    const hasMidPerformance = Object.values(selection.midHallDays).some(day => day.role === "PERFORMANCE");
    if (selection.venueId === "medium-hall")
        return !hasMidPerformance;
    if (!Object.values(selection.dayTags).includes("PERFORMANCE") || arenaMiddleBaseDaysIncomplete(selection))
        return true;
    return selection.bookingMode === "SIMULTANEOUS" && (!hasMidPerformance || midHallDatesOutsideArenaRange(selection, selection.midHallDays).length > 0);
}
