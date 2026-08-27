// 승인된 신청자 세션으로 신청서를 API 로 제출한다 — 대관 이벤트 알림톡(RT-01) 확인용.
//   U=at128610 node e2e/_submit-quote.mjs
import { chromium } from "@playwright/test";
const B = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const U = process.env.U; if (!U) throw new Error("U 필요");
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
const i = p.locator("input"); await i.nth(0).fill(U); await i.nth(1).fill(process.env.PW || "Test1234!");
await p.locator('button[type="submit"]').first().click();
await p.waitForURL((x) => !x.toString().includes("/login"), { timeout: 20000 });
// 위저드를 한 번 열어 기본 draft(performanceInfo 기본값 포함)를 얻는다.
await p.goto(`${B}/apply?new=1`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2500);
const draft = await p.evaluate(() => {
  for (const k of Object.keys(localStorage)) { try { const v = JSON.parse(localStorage.getItem(k)); if (v && typeof v === "object" && "performanceInfo" in v) return { key: k, v }; if (v?.selection?.performanceInfo) return { key: k, v: v.selection }; } catch {} }
  return null;
});
console.log("draft key:", draft?.key ?? "(없음)");
const base = draft?.v ?? {};
const selection = {
  ...base,
  venueId: "arena", bookingMode: "SINGLE", packageId: 1,
  week: { year: 2026, month: 12, weekOfMonth: 2 }, excludedDays: [], extraDays: 0,
  dayTags: base.dayTags ?? {}, dayShowCounts: base.dayShowCounts ?? {},
  expectedAudience: 10000, secondaryAudience: 0, midHallDays: {}, midHallExtraSetupHours: 0, midHallExtraLoadOutHours: 0,
  addons: base.addons ?? [], performanceInfo: base.performanceInfo ?? {}, midHallPerformanceInfo: null,
};
const res = await p.evaluate(async (sel) => {
  const r = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selection: sel }) });
  return { status: r.status, body: (await r.text()).slice(0, 300) };
}, selection);
console.log("POST /api/quotes →", res.status, res.body);
await b.close();
