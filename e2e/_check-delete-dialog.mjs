// bo 콘텐츠 관리 — 공지 [삭제] 가 디자인 다이얼로그로 확인을 받는지 (2026-09-04).
//   node e2e/_check-delete-dialog.mjs   (E2E_BO 기본 bo.dev, E2E_ADMIN/E2E_ADMIN_PASSWORD 기본값)
import { chromium } from "@playwright/test";
const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const ADMIN = process.env.E2E_ADMIN || "admin", APW = process.env.E2E_ADMIN_PASSWORD || "Dkfpsk123!";
const b = await chromium.launch(); const pg = await b.newPage();
let id = null;
try {
  await pg.goto(`${BO}/admin/login`); const i = pg.locator("input"); await i.nth(0).fill(ADMIN); await i.nth(1).fill(APW);
  await pg.locator('button[type="submit"]').first().click(); await pg.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 });
  const title = `[삭제 다이얼로그 검사] ${Date.now()}`;
  const r = await pg.request.post(`${BO}/api/admin/notices`, { data: { title, body: "<p>임시</p>" } });
  id = (await r.json().catch(() => ({}))).notice?.id ?? (await r.json().catch(() => ({}))).id ?? null;
  console.log("임시 공지:", r.status(), id);
  await pg.goto(`${BO}/admin/content`); await pg.waitForTimeout(1200);
  const rows = pg.locator("div.flex.items-start.justify-between", { hasText: title }); console.log("행 후보:", await rows.count()); const row = rows.filter({ visible: true }).first();
  await row.waitFor({ timeout: 20000 }); console.log("행 발견:", await row.count());
  const delBtn = row.getByRole("button", { name: "삭제" }); await delBtn.waitFor({ timeout: 10000 });
  pg.once("dialog", (d) => { console.log("FAIL 브라우저 기본 confirm 사용:", d.message()); d.dismiss(); });
  await delBtn.click(); await pg.waitForTimeout(800);
  const dlg = pg.locator('[role="dialog"], [role="alertdialog"]').first();
  const shown = await dlg.isVisible().catch(() => false);
  const text = shown ? (await dlg.textContent()) ?? "" : "";
  console.log(`다이얼로그 표시: ${shown ? "PASS" : "FAIL"} · 문구: ${text.replace(/\s+/g, " ").slice(0, 90)}`);
  if (shown) { await dlg.getByRole("button", { name: "취소" }).click(); await pg.waitForTimeout(400); }
  const still = await pg.getByText(title, { exact: false }).count();
  console.log(`취소 후 공지 유지: ${still > 0 ? "PASS" : "FAIL"}`);
} finally {
  if (id) { const d = await pg.request.delete(`${BO}/api/admin/notices/${id}`); console.log("정리 삭제:", d.status()); }
  await b.close();
}
