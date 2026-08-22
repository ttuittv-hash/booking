// 백오피스 레이아웃·이동 점검 — 뷰포트 2종 × 관리자 화면 전체.
// 가로 넘침·터치 타깃·콘솔 오류를 보고, 회원 관리 탭이 실제로 갈리는지 확인한다.
//
// 운영자 계정은 환경변수로 받는다. E2E_ADMIN (기본 admin) · E2E_ADMIN_PASSWORD (기본 Dkfpsk123!)
import { chromium } from "@playwright/test";

const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const ADMIN = process.env.E2E_ADMIN || "admin";
const ADMIN_PW = process.env.E2E_ADMIN_PASSWORD || "Dkfpsk123!";

// 경로는 화면에 그려진 메뉴에서 뽑는다. 손으로 적으면 메뉴가 바뀔 때 조용히 어긋난다
// — 처음에 /admin/quotes·notices·faqs 를 적었는데 셋 다 없는 주소였고, 404 를 "점검했다"고
// 세고 있었다. 로그인 직후 실제 메뉴를 읽어 그 목록을 돈다.
let ROUTES = [];
const VIEWPORTS = [{ name: "모바일", width: 390, height: 844 }, { name: "데스크톱", width: 1440, height: 900 }];

const issues = [];
const add = (kind, where, detail) => issues.push({ kind, where, detail });

const browser = await chromium.launch();


// 로그인 1회 → 세션 재사용 (뷰포트마다 새로 하면 레이트리밋에 걸린다)
const loginCtx = await browser.newContext();
{
  const p = await loginCtx.newPage();
  await p.goto(`${BO}/login`, { waitUntil: "domcontentloaded" });
  const i = p.locator("input");
  await i.nth(0).fill(ADMIN); await i.nth(1).fill(ADMIN_PW);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForURL(/\/admin/, { timeout: 20000 });
  ROUTES = await p.$$eval("nav a[href^='/admin']", (as) => [
    ...new Set(as.map((a) => new URL(a.href).pathname)),
  ]);
  await p.close();
}
const storageState = await loginCtx.storageState();
await loginCtx.close();
console.log(`메뉴에서 읽은 경로 ${ROUTES.length}개: ${ROUTES.join(" ")}`);


for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, storageState });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 120)));

  for (const route of ROUTES) {
    errors.length = 0;
    const res = await page.goto(BO + route, { waitUntil: "networkidle" }).catch(() => null);
    if (!res || res.status() >= 400) { add("HTTP", `${vp.name} ${route}`, `status ${res?.status()}`); continue; }
    const landed = new URL(page.url()).pathname;
    if (landed !== route) { add("리다이렉트", `${vp.name} ${route}`, `→ ${landed}`); continue; }

    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      if (d.scrollWidth <= d.clientWidth + 1) return null;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > d.clientWidth + 1) {
          const s = getComputedStyle(el);
          if (s.position === "fixed" || s.overflowX === "auto" || s.overflowX === "scroll") continue;
          bad.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]} right=${Math.round(r.right)}`);
        }
      }
      return { page: d.scrollWidth, view: d.clientWidth, sample: bad.slice(0, 3) };
    });
    if (overflow) add("가로넘침", `${vp.name} ${route}`, `${overflow.page}>${overflow.view}px · ${overflow.sample.join(" | ")}`);

    if (vp.width < 500) {
      const small = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll("a[href], button")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || getComputedStyle(el).display === "none") continue;
          if (r.height < 36) bad.push(`${el.tagName.toLowerCase()}「${(el.textContent || "").trim().slice(0, 14)}」h=${Math.round(r.height)}`);
        }
        return [...new Set(bad)].slice(0, 4);
      });
      if (small.length) add("터치타깃", `${vp.name} ${route}`, small.join(" | "));
    }

    if (errors.length) add("콘솔오류", `${vp.name} ${route}`, [...new Set(errors)].slice(0, 2).join(" | "));
  }

  // 회원 관리 탭 — 탭마다 목록이 실제로 갈리는지
  if (vp.width > 500) {
    await page.goto(BO + "/admin/applicants", { waitUntil: "networkidle" });
    for (const tab of ["승인 대기", "처리 완료", "회사별 담당자"]) {
      const el = page.locator(`a:has-text("${tab}"), button:has-text("${tab}")`).first();
      if (!(await el.count())) { add("탭없음", `${vp.name} 회원관리`, tab); continue; }
      await el.click();
      await page.waitForTimeout(1200);
      const body = await page.locator("main").innerText();
      if (!body.includes(tab)) add("탭전환", `${vp.name} 회원관리`, `${tab} 선택 후에도 표시 안 됨`);
    }
  }
  await ctx.close();
}
await browser.close();

const byKind = {};
for (const it of issues) (byKind[it.kind] ||= []).push(it);
for (const [k, list] of Object.entries(byKind)) {
  console.log(`\n━━ ${k} (${list.length}건)`);
  for (const it of list) console.log(`   ${it.where.padEnd(30)} ${it.detail}`);
}
console.log(`\n총 ${issues.length}건`);
