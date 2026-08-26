// 알림톡 실발송 E2E — 기획 이벤트(MB-01 가입 접수, MB-02 승인)가 실제 앱 경로로 카카오까지 가는지 확인한다.
//
// dev 는 BIZTALK_RECIPIENT_ALLOWLIST 로 허용된 번호에만 외부 발송이 나간다. 이 스크립트는
// 우회 인증에 PHONE(허용 번호)을 실어 그 번호로 가입 → 운영자 승인까지 화면으로 진행한다.
//
//   PHONE=01027866732 node e2e/alimtalk.spec.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const STUB = fs.readFileSync("/tmp/arena-dev-stub.env", "utf8").trim().split("=")[1];
const PHONE = (process.env.PHONE || "").replace(/\D/g, "");
if (!PHONE) throw new Error("PHONE=수신번호 가 필요하다");

const results = [];
function check(id, label, ok, detail = "") {
  results.push({ id, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(6)} ${label}${detail ? "  — " + detail : ""}`);
}
async function fillIfEditable(p, sel, value) {
  if ((await p.locator(sel).getAttribute("readonly")) !== null) return;
  await p.fill(sel, value);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.setExtraHTTPHeaders({ "x-dev-stub": STUB });
const page = await ctx.newPage();
const t = String(Date.now()).slice(-6);
const username = "at" + t;

// 우회 인증 요청에 수신 번호를 실어 보낸다 — 인증 결과 휴대폰번호가 이 번호가 된다.
await page.route("**/api/auth/nice/start", async (route) => {
  const body = JSON.parse(route.request().postData() || "{}");
  await route.continue({ postData: JSON.stringify({ ...body, stubPhone: PHONE, stubName: "알림톡테스트" }) });
});

try {
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.click('[data-testid="pick-corporate"]');
  await page.waitForSelector('[data-testid="step-terms"]');
  await page.check('[data-testid="agree-SERVICE"]');
  await page.check('[data-testid="agree-PRIVACY_REQUIRED"]');
  await page.click('[data-testid="terms-next"]');
  await page.waitForSelector('[data-testid="step-identity"]');
  await page.click('[data-testid="identity-start"]');
  await page.waitForSelector('[data-testid="step-info"]', { timeout: 20000 });
  const phoneShown = (await page.inputValue('[data-testid="f-phone"]')).replace(/\D/g, "");
  check("MB-0", "인증 결과 휴대폰번호가 수신 번호로 들어간다", phoneShown === PHONE, phoneShown);

  await page.fill('[data-testid="f-companyName"]', "카카오");
  await page.fill('[data-testid="f-brn"]', "120-81-47521");
  await page.fill('[data-testid="f-representativeName"]', "정신아");
  await page.click('[data-testid="verify-brn"]');
  await page.waitForSelector('[data-testid="brn-check-message"]', { timeout: 25000 });
  await fillIfEditable(page, '[data-testid="f-postalCode"]', "13529");
  await fillIfEditable(page, '[data-testid="f-address"]', "경기도 성남시 분당구 판교역로 166");
  await page.fill('[data-testid="f-username"]', username);
  await page.fill('[data-testid="f-email"]', `${username}@seoul-ent.co.kr`);
  await page.fill('[data-testid="f-password"]', "Test1234!");
  await page.fill('[data-testid="f-passwordConfirm"]', "Test1234!");
  await page.click('[data-testid="check-username"]');
  await page.waitForSelector('[data-testid="id-check-message"]', { timeout: 20000 });
  await page.click('[data-testid="submit-register"]');
  await page.waitForSelector('[data-testid="step-done"]', { timeout: 30000 });
  check("MB-01", "가입 신청 접수 → MB-01(또는 MB-01J) 발송 이벤트 발생", true, username);

  // 운영자 승인 → MB-02
  const bo = await (await browser.newContext()).newPage();
  await bo.goto(`${BO}/login`, { waitUntil: "domcontentloaded" });
  const inputs = bo.locator("input");
  await inputs.nth(0).fill("admin");
  await inputs.nth(1).fill(process.env.ADMIN_PW || "Dkfpsk123!");
  await bo.locator('button[type="submit"]').first().click();
  await bo.waitForURL(/\/admin/, { timeout: 20000 });
  await bo.goto(`${BO}/admin/applicants`, { waitUntil: "domcontentloaded" });
  const row = bo.locator("tr", { hasText: `${username}@seoul-ent.co.kr` }).first();
  await row.waitFor({ timeout: 20000 });
  await row.getByRole("button", { name: "승인" }).click();
  await row.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  check("MB-02", "운영자 승인 → MB-02 발송 이벤트 발생", true);
  console.log(`USERNAME=${username}`);
} catch (e) {
  const toast = await page.locator('[data-testid="toast"]').first().innerText().catch(() => "");
  check("ERR", "예외", false, e.message.split("\n")[0] + (toast ? ` / 토스트: ${toast.replace(/\s+/g, " ")}` : ""));
  await page.screenshot({ path: "e2e-failure.png" }).catch(() => {});
}
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`합계 ${results.length}건 · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
