import { chromium } from "@playwright/test";
const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const U = process.env.E2E_USER || "testuser", P = process.env.E2E_PASSWORD || "Test1234!";
const b = await chromium.launch(); const pg = await b.newPage();
await pg.goto(`${BASE}/login`); const i = pg.locator("input"); await i.nth(0).fill(U); await i.nth(1).fill(P);
await pg.locator('button[type="submit"]').first().click(); await pg.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
for (const tab of ["arena", "live-hall", "special"]) {
  await pg.goto(`${BASE}/rates?venue=${tab}`); await pg.waitForTimeout(800);
  const h3 = await pg.locator("h3.type-kr-heading.mt-4").count();
  const h1 = await pg.locator("h1, h2").filter({ hasText: /rate/i }).first().textContent().catch(() => "");
  const tabs = await pg.locator('[role="tab"], nav a, button').filter({ hasText: /rate|대관료/ }).allTextContents();
  console.log(`${tab}: 부제목 h3=${h3}건 (0이어야 함) · 큰제목="${(h1||"").trim()}" · 탭=${JSON.stringify([...new Set(tabs)].slice(0,4))}`);
}
await b.close();
