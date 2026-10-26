import { beforeEach, describe, expect, it, vi } from "vitest";
import { bookingSelection } from "@/test/fixtures/bookingSelection";
import { selectPreviewWeek } from "@/components/wizard/bookingPreviewScheduleState";
import { buildSeedRateTable } from "@/lib/pricing/seed";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { SPECIAL_VENUE_ID } from "@/lib/pricing/types";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), blocked: vi.fn(), create: vi.fn(), update: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user, canActOnQuotes: () => true, canAccessQuote: async () => true }));
vi.mock("@/lib/bookingClosed", () => ({ isBookingClosed: async () => false }));
vi.mock("@/lib/quoteStatus", () => ({ canApplicantEditQuote: () => true }));
vi.mock("@/lib/message/quoteEvents", () => ({ notifyQuoteApplicant: vi.fn() }));
vi.mock("@/lib/message/dispatch", () => ({ dispatchMessageInBackground: vi.fn() }));
vi.mock("@/lib/db", () => ({
  getCurrentRateTable: () => buildSeedRateTable(),
  findBlockedDatesAmong: mocks.blocked,
  listApprovedQuoteBlocks: async () => [],
  createQuote: mocks.create, updateQuoteSelection: mocks.update,
  getQuoteById: async () => ({ id: "test", status: "ESTIMATE", review: null }),
  withTransaction: async (fn: () => Promise<unknown>) => fn(),
  nextQuoteNumber: async () => "test", addAuditLog: vi.fn(), notifyAdmins: vi.fn(),
  createNotification: vi.fn(), listUsers: async () => [], clearQuoteReview: vi.fn(),
  listQuotes: vi.fn(), listQuotesPaged: vi.fn(), listAuditLogsForQuote: vi.fn(),
}));
import { POST } from "./route";
import { PUT } from "./[id]/route";
const ctx = { params: Promise.resolve({ id: "test" }) };
const week = { year: 2027, month: 8, weekOfMonth: 2 };
const request = (selection?: unknown) => new Request("http://localhost/api/quotes", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selection }),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "applicant", role: "APPLICANT" });
  mocks.blocked.mockResolvedValue([]);
  mocks.create.mockImplementation(async data => data);
  mocks.update.mockImplementation(async (_id, data) => ({ id: "test", ...data }));
});
describe("preview payload with real server pricing, isolated persistence/notifications", () => {
  it.each(["arena", "medium-hall", "simultaneous", "all-in-one"])("creates and updates %s without altering price or schedule", async mode => {
    const rates = buildSeedRateTable();
    const venueId = mode === "all-in-one" ? SPECIAL_VENUE_ID : mode === "medium-hall" ? "medium-hall" : "arena";
    const packageId = venueId === "medium-hall" ? null : rates.packages.find(p => p.venueId === venueId)!.id;
    let selection = selectPreviewWeek(bookingSelection({ venueId, packageId, bookingMode: mode === "simultaneous" ? "SIMULTANEOUS" : "SINGLE" }), week, venueId === "medium-hall");
    if (mode === "simultaneous") selection = selectPreviewWeek(selection, week, true);
    const expected = calculateQuote(selection, rates);
    const created = await POST(request(selection));
    expect(created.status).toBe(200);
    expect((await created.json()).quote.total).toBe(expected.total);
    const updated = await PUT(request(selection), ctx);
    expect(updated.status).toBe(200);
    expect((await updated.json()).quote.selection).toEqual(selection);
  });
  it("rejects an empty update request with 400 instead of throwing", async () => {
    expect((await PUT(request(), ctx)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("checks reserved mid-hall dates when updating All in One", async () => {
    const selection = selectPreviewWeek(bookingSelection({ venueId: SPECIAL_VENUE_ID }), week, false);
    mocks.blocked.mockImplementation(async (dates, venue) => venue === "medium-hall" ? [{ date: dates[0], reason: "blocked" }] : []);
    expect((await PUT(request(selection), ctx)).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects mismatched simultaneous ranges on both create and update", async () => {
    let selection = selectPreviewWeek(bookingSelection({ bookingMode: "SIMULTANEOUS" }), week, false);
    selection = selectPreviewWeek(selection, { ...week, weekOfMonth: 3 }, true);
    expect((await POST(request(selection))).status).toBe(400);
    expect((await PUT(request(selection), ctx)).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("keeps authentication and block checks before persistence", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await POST(request(bookingSelection()))).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
