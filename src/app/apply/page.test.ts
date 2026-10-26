import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildSeedRateTable } from "@/lib/pricing/seed";
import { previewScreenText, previewLiveHallContent } from "@/components/wizard/bookingPreviewData";
import { bookingSelection } from "@/test/fixtures/bookingSelection";

const state = vi.hoisted(() => ({ shell: vi.fn(), closed: vi.fn(), user: { id: "operator", role: "ADMIN", name: "담당자", companyId: "company" } }));
vi.mock("@/components/wizard/WizardShell", () => ({ WizardShell: state.shell }));
vi.mock("@/components/PublicHeader", () => ({ PublicHeader: () => null }));
vi.mock("@/components/ui/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/lib/auth", () => ({ requireAccessedUser: async () => state.user, canAccessQuote: async () => true }));
vi.mock("@/lib/bookingClosed", () => ({ isBookingClosed: state.closed }));
vi.mock("@/lib/quoteStatus", () => ({ canApplicantEditQuote: () => true }));
vi.mock("@/lib/db", () => ({
  getCurrentRateTable: async () => buildSeedRateTable(),
  getScreenTextContent: async () => previewScreenText,
  getRatesContent: async () => ({ liveHall: previewLiveHallContent }),
  getNoticeCalendarWindow: async () => ({ enabled: true, startMonth: "2027-07", endMonth: "2027-12" }),
  listWeekDemand: async () => [], listMidHallWeekDemand: async () => ({}),
  listDateBlocks: async () => [{ date: "2027-08-10", venueId: "arena", reason: "사용 불가" }],
  listApprovedQuoteBlocks: async () => [],
  findCompanyById: async () => ({ name: "실제 회사 정보", businessRegistrationNumber: "123", representativeName: "대표" }),
  getQuoteById: async () => ({ id: "existing", selection: bookingSelection() }),
  listAttachments: async () => [{ id: "attachment", filename: "plan.pdf" }],
}));
import ApplyPage from "./page";
import EditPage from "./edit/[id]/page";
beforeEach(() => { vi.clearAllMocks(); state.closed.mockResolvedValue(false); state.shell.mockImplementation(() => React.createElement("div", null, "live-wizard")); });
it("operator apply uses the redesigned UI with live data and real submission mode", async () => {
  state.closed.mockResolvedValue(true);
  const html = renderToStaticMarkup(await ApplyPage({ searchParams: Promise.resolve({ operator: "1" }) }));
  const props = state.shell.mock.calls[0][0];
  expect(props.redesigned).toBe(true);
  expect(props.designPreview).toBeUndefined();
  expect(props.editorPreview).toBeUndefined();
  expect(props.currentUser).toEqual(state.user);
  expect(props.applicantPrefill.companyName).toBe("실제 회사 정보");
  expect(props.dateBlocks).toHaveLength(1);
  expect(html).toContain("live-wizard");
  expect(html).not.toContain("디자인 미리보기");
});
it("normal open apply also uses the redesign", async () => {
  renderToStaticMarkup(await ApplyPage({ searchParams: Promise.resolve({}) }));
  expect(state.shell.mock.calls[0][0].redesigned).toBe(true);
});
it("closed application still requires the explicit operator entry", async () => {
  state.closed.mockResolvedValue(true);
  const html = renderToStaticMarkup(await ApplyPage({ searchParams: Promise.resolve({}) }));
  expect(state.shell).not.toHaveBeenCalled();
  expect(html).toContain("/apply?operator=1");
});
it("editing retains the saved selection, attachments and live identity", async () => {
  renderToStaticMarkup(await EditPage({ params: Promise.resolve({ id: "existing" }) }));
  const props = state.shell.mock.calls[0][0];
  expect(props.redesigned).toBe(true);
  expect(props.designPreview).toBeUndefined();
  expect(props.editingQuoteId).toBe("existing");
  expect(props.initialSelection).toEqual(bookingSelection());
  expect(props.existingAttachments[0].id).toBe("attachment");
});
