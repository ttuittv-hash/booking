// 1:1 문의 작성 페이지 열이 가운데 있는지 (2026-09-04). 로그인 후 제목 블록·폼 블록의 좌우 여백이 비슷한지 잰다.
import { chromium } from "@playwright/test";
const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const U = process.env.E2E_USER || "testuser", P = process.env.E2E_PASSWORD || "Test1234!";
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
await pg.goto(`${BASE}/login`); const i = pg.locator("input"); await i.nth(0).fill(U); await i.nth(1).fill(P);
await pg.locator('button[type="submit"]').first().click(); await pg.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
await pg.goto(`${BASE}/mypage/inquiries/new`); await pg.waitForTimeout(1200);
const boxes = await pg.locator("div.mx-auto.max-w-2xl").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(window.innerWidth - r.right), w: Math.round(r.width) }; }));
console.log("가운데 블록:", JSON.stringify(boxes));
const ok = boxes.length >= 2 && boxes.every((x) => Math.abs(x.left - x.right) <= 40);
console.log(ok ? "PASS 제목·폼 열이 가운데(좌우 여백 대칭)" : "FAIL 정렬 확인 필요");
await b.close();
