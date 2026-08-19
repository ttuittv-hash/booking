// 8/24 오픈 범위 전체 흐름 E2E — 기획서 A2~A15 를 화면에서 1:1 확인한다.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const STUB = fs.readFileSync("/tmp/arena-dev-stub.env", "utf8").trim().split("=")[1];

const results = [];
function check(id, label, ok, detail = "") {
  results.push({ id, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(7)} ${label}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch();
const t = String(Date.now()).slice(-6);

async function newCtx() {
  const c = await browser.newContext();
  await c.setExtraHTTPHeaders({ "x-dev-stub": STUB });
  return c;
}

// ── 회원가입(마스터) ────────────────────────────────────────
const ctx = await newCtx();
const page = await ctx.newPage();
let masterUser = "m" + t;

try {
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.click('[data-testid="pick-corporate"]');
  await page.check('[data-testid="agree-SERVICE"]');
  await page.check('[data-testid="agree-PRIVACY_REQUIRED"]');
  await page.click('[data-testid="terms-next"]');
  await page.click('[data-testid="identity-start"]');
  await page.waitForSelector('[data-testid="step-info"]', { timeout: 20000 });
  await page.fill('[data-testid="f-companyName"]', "카카오");
  await page.fill('[data-testid="f-brn"]', "120-81-47521");
  await page.fill('[data-testid="f-representativeName"]', "정신아");
  await page.fill('[data-testid="f-postalCode"]', "13529");
  await page.fill('[data-testid="f-address"]', "경기도 성남시 분당구 판교역로 166");
  await page.fill('[data-testid="f-username"]', masterUser);
  await page.fill('[data-testid="f-email"]', `${masterUser}@seoul-ent.co.kr`);
  await page.fill('[data-testid="f-password"]', "Test1234!");
  await page.fill('[data-testid="f-passwordConfirm"]', "Test1234!");
  await page.click('[data-testid="submit-register"]');
  await page.waitForSelector('[data-testid="step-done"]', { timeout: 30000 });
  check("A8-1", "최초 가입자 가입이 접수된다", true);

  // ── A15 접근권한: 승인 대기 상태 ──────────────────────────
  await page.goto(`${BASE}/apply`, { waitUntil: "domcontentloaded" });
  check("A15-1", "승인 대기는 대관신청이 막힌다", page.url().includes("/pending"));
  await page.goto(`${BASE}/guide`, { waitUntil: "domcontentloaded" });
  check("A15-2", "승인 대기도 대관안내는 열람한다", page.url().includes("/guide"));
  await page.goto(`${BASE}/venue`, { waitUntil: "domcontentloaded" });
  check("A15-3", "시설소개는 누구나 열람한다", page.url().includes("/venue"));
  await page.goto(`${BASE}/mypage/profile`, { waitUntil: "domcontentloaded" });
  check("A15-4", "승인 대기도 본인 정보 수정은 들어간다", page.url().includes("/mypage/profile"));

  // 비로그인 차단
  const guest = await (await newCtx()).newPage();
  await guest.goto(`${BASE}/guide`, { waitUntil: "domcontentloaded" });
  check("A15-5", "비로그인은 대관안내가 막힌다", guest.url().includes("/login"));
  await guest.goto(`${BASE}/venue`, { waitUntil: "domcontentloaded" });
  check("A15-6", "비로그인도 시설소개는 본다", guest.url().includes("/venue"));

  // ── A9 운영자 승인 ────────────────────────────────────────
  const boCtx = await newCtx();
  const bo = await boCtx.newPage();
  await bo.goto(`${BO}/login`, { waitUntil: "domcontentloaded" });
  await bo.fill('input[name="username"], input:below(:text("아이디"))>>nth=0', "admin").catch(() => {});
  const inputs = bo.locator("input");
  await inputs.nth(0).fill("admin");
  await inputs.nth(1).fill("Dkfpsk123!");
  await bo.locator('button[type="submit"]').first().click();
  await bo.waitForURL(/\/admin/, { timeout: 20000 });
  check("A9-1", "운영자가 백오피스에 로그인한다", true);

  // 승인 대상 id 는 실행 중에 파일로 넘겨받는다(테스트 전용 조회 API 를 만들지 않기 위함).
  fs.writeFileSync("/tmp/e2e-master-username.txt", masterUser);
  let masterId = "";
  for (let i = 0; i < 30 && !masterId; i++) {
    masterId = fs.existsSync("/tmp/e2e-master-id.txt")
      ? fs.readFileSync("/tmp/e2e-master-id.txt", "utf8").trim()
      : "";
    if (!masterId) await new Promise((r) => setTimeout(r, 1000));
  }
  const approve = await bo.request.post(`${BO}/api/admin/applicants`, {
    data: { id: masterId, action: "approve" },
  });
  check("A9-2", "운영자가 최초 가입자를 승인한다", approve.ok(), String(approve.status()));

  // ── 승인 후 접근권한 ──────────────────────────────────────
  await page.goto(`${BASE}/apply`, { waitUntil: "domcontentloaded" });
  check("A15-7", "승인 완료면 대관신청이 열린다", page.url().includes("/apply"));

  // ── A10 담당자 관리 · A11 초대 ────────────────────────────
  await page.goto(`${BASE}/mypage/members`, { waitUntil: "domcontentloaded" });
  check("A10-1", "마스터에게 담당자 관리 화면이 열린다", page.url().includes("/mypage/members"));
  await page.waitForSelector('[data-testid="members-table"]');
  await page.fill('[data-testid="invite-email"]', `staff${t}@seoul-ent.co.kr`);
  await page.click('[data-testid="invite-send"]');
  await page.waitForSelector('[data-testid="invite-url"]', { timeout: 15000 });
  const inviteUrl = (await page.locator('[data-testid="invite-url"] .font-mono').innerText()).trim();
  check("A11-1", "초대 링크가 발급된다", inviteUrl.includes("/invite?token="));

  // 초대 수락 — 다른 브라우저 컨텍스트(= 다른 사람)
  const inviteeCtx = await newCtx();
  const invitee = await inviteeCtx.newPage();
  await invitee.goto(inviteUrl, { waitUntil: "domcontentloaded" });
  await invitee.click('[data-testid="identity-start"]');
  await invitee.waitForSelector('[data-testid="invite-username"]', { timeout: 20000 });
  check("A11-2", "초대받은 사람이 본인인증을 거친다", true);
  await invitee.fill('[data-testid="invite-username"]', "s" + t);
  await invitee.fill('[data-testid="invite-password"]', "Test1234!");
  await invitee.fill('[data-testid="invite-password-confirm"]', "Test1234!");
  await invitee.click('[data-testid="invite-submit"]');
  await invitee.waitForSelector('[data-testid="invite-done"]', { timeout: 30000 });
  check("A11-3", "본인이 비밀번호를 직접 정해 합류한다", true);

  // 같은 링크 재사용 차단
  const reuse = await (await newCtx()).newPage();
  await reuse.goto(inviteUrl, { waitUntil: "domcontentloaded" });
  await reuse.click('[data-testid="identity-start"]').catch(() => {});
  await reuse.waitForSelector('[data-testid="invite-username"]', { timeout: 20000 }).catch(() => {});
  await reuse.fill('[data-testid="invite-username"]', "x" + t).catch(() => {});
  await reuse.fill('[data-testid="invite-password"]', "Test1234!").catch(() => {});
  await reuse.fill('[data-testid="invite-password-confirm"]', "Test1234!").catch(() => {});
  await reuse.click('[data-testid="invite-submit"]').catch(() => {});
  await reuse.waitForSelector('[data-testid="invite-error"]', { timeout: 15000 }).catch(() => {});
  const reuseErr = await reuse.locator('[data-testid="invite-error"]').innerText().catch(() => "");
  const stillOnForm = await reuse.locator('[data-testid="invite-done"]').isVisible().catch(() => false);
  check("A11-4", "쓴 초대 링크는 다시 못 쓴다",
    !stillOnForm && (reuseErr.includes("만료") || reuseErr.includes("사용")), reuseErr.slice(0, 40));

  // ── A13 계정 복구 ─────────────────────────────────────────
  const rec = await (await newCtx()).newPage();
  await rec.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  check("A13-1", "로그인 화면에 아이디 찾기 링크가 있다",
    await rec.locator('[data-testid="link-find-id"]').isVisible());
  check("A13-2", "비밀번호 찾기 링크가 있다",
    await rec.locator('[data-testid="link-reset-password"]').isVisible());

  await rec.goto(`${BASE}/reset-password`, { waitUntil: "domcontentloaded" });
  await rec.fill('[data-testid="reset-username"]', masterUser);
  await rec.click('[data-testid="reset-next"]');
  await rec.click('[data-testid="identity-start"]');
  await rec.waitForSelector('[data-testid="reset-password-new"]', { timeout: 20000 });
  await rec.fill('[data-testid="reset-password-new"]', "NewPass1234!");
  await rec.fill('[data-testid="reset-password-confirm"]', "NewPass1234!");
  await rec.click('[data-testid="reset-submit"]');
  await rec.waitForSelector('[data-testid="reset-error"], [data-testid="reset-done"]', { timeout: 20000 });
  const resetErr = await rec.locator('[data-testid="reset-error"]').innerText().catch(() => "");
  check("A13-3", "다른 사람의 인증으로는 남의 비밀번호를 못 바꾼다",
    resetErr.includes("일치하는 회원이 없습니다"), resetErr.slice(0, 40));
} catch (e) {
  check("ERR", "예외 발생", false, e.message.split("\n")[0]);
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n합계 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exit(failed.length ? 1 : 0);
