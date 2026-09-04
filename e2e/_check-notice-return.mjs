// 로그아웃 상태에서 공지 상세 → 로그인 → 공지 상세로 복귀하는지 (2026-09-04 버그 수정 확인).
//   node e2e/_check-notice-return.mjs   (E2E_BASE 기본 dev, E2E_USER/E2E_PASSWORD 기본 testuser)
import { chromium } from "@playwright/test";
const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const U = process.env.E2E_USER || "testuser", P = process.env.E2E_PASSWORD || "Test1234!";
const NOTICE = "/notices/notice-2027-h2-regular";
const b = await chromium.launch(); const pg = await b.newPage();
await pg.goto(`${BASE}${NOTICE}`); await pg.waitForTimeout(800);
const loginUrl = new URL(pg.url()); const next = loginUrl.searchParams.get("next");
console.log(`로그인 화면 next=${next}  → ${next === NOTICE ? "PASS" : "FAIL (패턴/오류)"}`);
const i = pg.locator("input"); await i.nth(0).fill(U); await i.nth(1).fill(P);
await pg.locator('button[type="submit"]').first().click();
await pg.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }); await pg.waitForTimeout(1200);
const path = new URL(pg.url()).pathname;
const title = await pg.locator("h1, h2").first().textContent().catch(() => "");
console.log(`로그인 후 도착: ${path}  → ${path === NOTICE ? "PASS 공지 상세" : "FAIL"} · 제목: ${(title || "").trim().slice(0, 40)}`);
await b.close();
