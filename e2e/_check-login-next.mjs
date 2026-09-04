// 로그인 후 ?next= 복귀 확인 — /login?next=/mypage/members 로 들어가 로그인하면 /apply 가 아닌 목적지(또는 권한상 /mypage)로 가야 한다.
//   node e2e/_check-login-next.mjs            (E2E_BASE 기본 dev, E2E_USER/E2E_PASSWORD 기본 testuser)
import { chromium } from "@playwright/test";
const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const U = process.env.E2E_USER || "testuser", P = process.env.E2E_PASSWORD || "Test1234!";
const b = await chromium.launch(); const pg = await b.newPage();
await pg.goto(`${BASE}/login?next=%2Fmypage%2Fmembers`);
const i = pg.locator("input"); await i.nth(0).fill(U); await i.nth(1).fill(P);
await pg.locator('button[type="submit"]').first().click();
await pg.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }); await pg.waitForTimeout(1500);
const path = new URL(pg.url()).pathname;
console.log(`로그인 후 도착: ${path}  → ${path.startsWith("/mypage") ? "PASS (목적지/마이페이지)" : path === "/apply" ? "FAIL (/apply 로 감)" : "확인 필요"}`);
await pg.goto(`${BASE}/login?next=https%3A%2F%2Fevil.example%2F`).catch(() => {});
await b.close();
