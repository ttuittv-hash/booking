// UI 전수 점검 — 뷰포트 3종 × 전 페이지. 콘솔 오류·가로 넘침·터치 타깃·줄바꿈을 본다.
import { chromium } from "@playwright/test";
const B = "https://partner.dev.seoularena.net";
const BO = "https://bo.dev.seoularena.net";
const USER = process.env.U, PW = "Test1234!";

const VIEWPORTS = [
  { name: "모바일", width: 390, height: 844 },
  { name: "태블릿", width: 768, height: 1024 },
  { name: "데스크톱", width: 1440, height: 900 },
];
const PAGES = ["/", "/seoularena", "/features", "/guide", "/rates", "/rules", "/documents",
  "/notices", "/faq", "/mypage/inquiries", "/apply", "/mypage/process", "/mypage/history",
  "/mypage/profile", "/mypage/members", "/mypage/notifications", "/terms", "/privacy"];

const issues = [];
const add = (kind, where, detail) => issues.push({ kind, where, detail });

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 120)));

  // 로그인
  await page.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  const i = page.locator("input");
  await i.nth(0).fill(USER); await i.nth(1).fill(PW);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 20000 }).catch(() => {});

  for (const route of PAGES) {
    consoleErrors.length = 0;
    const res = await page.goto(B + route, { waitUntil: "networkidle" }).catch(() => null);
    const landed = new URL(page.url()).pathname;
    if (!res || res.status() >= 400) { add("HTTP", `${vp.name} ${route}`, `status ${res?.status()}`); continue; }
    if (landed !== route) { add("리다이렉트", `${vp.name} ${route}`, `→ ${landed}`); continue; }

    // 가로 넘침
    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      if (d.scrollWidth <= d.clientWidth + 1) return null;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > d.clientWidth + 1 || r.left < -1)) {
          const s = getComputedStyle(el);
          if (s.position === "fixed" || s.overflowX === "auto" || s.overflowX === "scroll") continue;
          bad.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]} w=${Math.round(r.width)} right=${Math.round(r.right)}`);
        }
      }
      return { page: d.scrollWidth, view: d.clientWidth, sample: bad.slice(0, 3) };
    });
    if (overflow) add("가로넘침", `${vp.name} ${route}`, `${overflow.page}>${overflow.view}px · ${overflow.sample.join(" | ")}`);

    // 터치 타깃 (모바일에서만)
    if (vp.width < 500) {
      const small = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll("a[href], button, input[type=submit]")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (getComputedStyle(el).display === "none") continue;
          if (r.height < 36) bad.push(`${el.tagName.toLowerCase()}「${(el.textContent||"").trim().slice(0,14)}」h=${Math.round(r.height)}`);
        }
        return bad.slice(0, 5);
      });
      if (small.length) add("터치타깃", `${vp.name} ${route}`, small.join(" | "));
    }

    // 줄바꿈 — 실제 줄 수를 센다. 짧은 라벨이 두 줄로 쪼개지거나 마지막 줄에 한 글자만 남는 경우.
    const orphan = await page.evaluate(() => {
      const bad = [];
      const lineCount = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0);
        const tops = [...new Set(rects.map((x) => Math.round(x.top)))];
        return { lines: tops.length, rects, tops };
      };
      for (const el of document.querySelectorAll("h1,h2,h3,button,a[class*=btn],[class*=Button],label,th")) {
        const t = (el.textContent || "").trim();
        if (!t || t.length < 3 || t.length > 30) continue;
        if (el.querySelector("svg, img, div, p")) continue;
        const { lines, rects, tops } = lineCount(el);
        if (lines < 2) continue;
        const lastTop = Math.max(...tops);
        const lastWidth = rects.filter((x) => Math.round(x.top) === lastTop).reduce((a, x) => a + x.width, 0);
        const firstTop = Math.min(...tops);
        const firstWidth = rects.filter((x) => Math.round(x.top) === firstTop).reduce((a, x) => a + x.width, 0);
        // 마지막 줄이 첫 줄의 1/5 미만 = 한두 글자만 떨어진 것
        if (lastWidth < firstWidth / 5) bad.push(`「${t.slice(0, 20)}」 ${lines}줄·꼬리 ${Math.round(lastWidth)}px`);
        else if (t.length <= 8 && lines >= 2) bad.push(`「${t}」 ${lines}줄로 쪼개짐`);
      }
      return [...new Set(bad)].slice(0, 5);
    });
    if (orphan.length) add("줄바꿈", `${vp.name} ${route}`, orphan.join(" | "));

    if (consoleErrors.length) add("콘솔오류", `${vp.name} ${route}`, [...new Set(consoleErrors)].slice(0,2).join(" | "));
  }
  await ctx.close();
}
await browser.close();

const byKind = {};
for (const it of issues) (byKind[it.kind] ||= []).push(it);
for (const [k, list] of Object.entries(byKind)) {
  console.log(`\n━━ ${k} (${list.length}건)`);
  for (const it of list) console.log(`   ${it.where.padEnd(28)} ${it.detail}`);
}
console.log(`\n총 ${issues.length}건`);
