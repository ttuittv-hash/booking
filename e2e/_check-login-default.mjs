// 일반 사용자 로그인 기본 도착지 확인 — next 없이 /login 에서 로그인하면 /apply 가 아니라 홈(/)으로 가야 한다(2026-09-04).
//   node e2e/_check-login-default.mjs            (E2E_BASE 기본 dev, E2E_USER/E2E_PASSWORD 기본 testuser)
import { chromium } from "@playwright/test";
const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const U = process.env.E2E_USER || "testuser", P = process.env.E2E_PASSWORD || "Test1234!";
const b = await chromium.launch(); const pg = await b.newPage();
await pg.goto(`${BASE}/login`);
const i = pg.locator("input"); await i.nth(0).fill(U); await i.nth(1).fill(P);
await pg.locator('button[type="submit"]').first().click();
await pg.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }); await pg.waitForTimeout(1500);
const path = new URL(pg.url()).pathname;
console.log(`next 없이 로그인 → 도착: ${path}  → ${path === "/apply" ? "FAIL (/apply)" : "PASS (홈/목적지)"}`);
await b.close();
