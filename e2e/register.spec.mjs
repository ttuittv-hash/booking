// 회원가입 5스텝 E2E — 기획서 A2~A8 을 화면에서 그대로 확인한다.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const STUB = fs.readFileSync("/tmp/arena-dev-stub.env", "utf8").trim().split("=")[1];

const results = [];
function check(id, label, ok, detail = "") {
  results.push({ id, label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(6)} ${label}${detail ? "  — " + detail : ""}`);
}


/**
 * 이미 등록된 회사로 확인되면 기업정보가 읽기 전용으로 잠긴다(정상 동작).
 * 잠긴 칸에 fill 을 시도하면 타임아웃이 나므로, 편집 가능한 칸만 채운다.
 */
async function fillIfEditable(p, sel, value) {
  const ro = await p.locator(sel).getAttribute("readonly");
  if (ro !== null) return;
  await p.fill(sel, value);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
// 스텁 헤더를 모든 요청에 붙인다(dev 전용).
await ctx.setExtraHTTPHeaders({ "x-dev-stub": STUB });
const page = await ctx.newPage();
const t = String(Date.now()).slice(-6);

try {
  // ── A2 STEP 1 회원 유형 ───────────────────────────────────
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="step-member-type"]');
  check("A2-1", "STEP1 회원 유형 화면이 먼저 나온다",
    (await page.getAttribute('[data-testid="register-wizard"]', "data-step")) === "1");
  check("A2-2", "기업회원은 가입 가능으로 노출된다",
    (await page.locator('[data-testid="pick-corporate"]').innerText()).includes("가입 가능"));
  const indiv = page.locator('[data-testid="pick-individual"]');
  check("A2-3", "개인회원은 감추지 않고 준비 중으로 노출된다",
    await indiv.isVisible() && (await indiv.innerText()).includes("준비 중"));
  check("A2-4", "개인회원 버튼은 비활성이다",
    await indiv.locator("button").isDisabled() && (await indiv.getAttribute("aria-disabled")) === "true");

  await page.click('[data-testid="pick-corporate"]');

  // ── A3 STEP 2 약관 동의 ───────────────────────────────────
  await page.waitForSelector('[data-testid="step-terms"]');
  const nextBtn = page.locator('[data-testid="terms-next"]');
  check("A3-1", "필수 약관 미체크 상태에서 [다음]이 잠겨 있다", await nextBtn.isDisabled());
  check("A3-2", "약관 전문이 화면 안에 제공된다",
    (await page.locator('[data-testid="terms-body-SERVICE"]').innerText()).includes("제1조"));
  await page.check('[data-testid="agree-SERVICE"]');
  check("A3-3", "필수 1건만 체크하면 여전히 잠겨 있다", await nextBtn.isDisabled());
  await page.check('[data-testid="agree-PRIVACY_REQUIRED"]');
  check("A3-4", "필수 2건을 모두 체크해야 [다음]이 열린다", await nextBtn.isEnabled());
  check("A3-5", "선택 약관은 미동의로도 진행할 수 있다",
    !(await page.isChecked('[data-testid="agree-PRIVACY_OPTIONAL"]')));
  await nextBtn.click();

  // ── A4 STEP 3 본인인증 ────────────────────────────────────
  await page.waitForSelector('[data-testid="step-identity"]');
  const idText = await page.locator('[data-testid="step-identity"]').innerText();
  check("A4-1", "인증 수단이 휴대폰 하나만 노출된다",
    idText.includes("휴대폰") && !idText.includes("아이핀"));
  check("A4-2", "인증 결과는 수정 불가라고 안내한다", idText.includes("수정할 수 없습니다"));
  check("A4-3", "인증 불가 케이스 문의 경로를 안내한다", idText.includes("고객센터"));
  await page.click('[data-testid="identity-start"]');

  // ── A5 STEP 4 정보 입력 ───────────────────────────────────
  await page.waitForSelector('[data-testid="step-info"]', { timeout: 20000 });
  check("A4-4", "인증을 마치면 정보 입력 단계로 넘어간다",
    (await page.getAttribute('[data-testid="register-wizard"]', "data-step")) === "4");
  check("A5-1", "이름이 인증 결과로 채워지고 읽기 전용이다",
    (await page.inputValue('[data-testid="f-name"]')) !== "" &&
      (await page.locator('[data-testid="f-name"]').getAttribute("readonly")) !== null);
  check("A5-2", "휴대폰번호도 읽기 전용이다",
    (await page.locator('[data-testid="f-phone"]').getAttribute("readonly")) !== null);

  // ── A6 회사정보 불러오기 ──────────────────────────────────
  const bodyText = await page.locator('[data-testid="step-info"]').innerText();
  check("A6-1", "회사 목록이 화면에 미리 노출되지 않는다", !bodyText.includes("검색 결과"));
  await page.click('[data-testid="open-company-search"]');
  await page.waitForSelector('[data-testid="company-search"]');
  check("A6-2", "버튼을 눌러야 검색 팝업이 열린다",
    await page.locator('[data-testid="company-search"]').isVisible());
  await page.fill('[data-testid="search-keyword"]', "카");
  await page.click('[data-testid="search-run"]');
  await page.waitForSelector('[data-testid="search-message"]');
  check("A6-3", "1자 입력은 검색되지 않는다",
    (await page.locator('[data-testid="search-message"]').innerText()).includes("2자 이상"));
  await page.fill('[data-testid="search-keyword"]', "없는회사");
  await page.click('[data-testid="search-run"]');
  await page.waitForTimeout(600);
  check("A6-4", "결과가 없으면 신규 등록으로 안내한다",
    (await page.locator('[data-testid="search-message"]').innerText()).includes("직접 입력"));
  await page.click('[data-testid="search-close"]');

  // ── 최초 가입자로 신규 등록 ───────────────────────────────
  await page.fill('[data-testid="f-companyName"]', "카카오");
  await page.fill('[data-testid="f-brn"]', "120-81-47521");
  await page.fill('[data-testid="f-representativeName"]', "정신아");
  // 기획서 A5 — 사업자등록번호는 [중복·진위확인]을 통과해야 제출할 수 있다
  await page.click('[data-testid="verify-brn"]');
  await page.waitForSelector('[data-testid="brn-check-message"]', { timeout: 25000 });
  await fillIfEditable(page, '[data-testid="f-postalCode"]', "13529");
  await fillIfEditable(page, '[data-testid="f-address"]', "경기도 성남시 분당구 판교역로 166");
  await page.fill('[data-testid="f-username"]', "e2e" + t);
  await page.fill('[data-testid="f-email"]', `e2e${t}@example.com`);
  await page.fill('[data-testid="f-password"]', "Test1234!");
  await page.fill('[data-testid="f-passwordConfirm"]', "Test1234!");
  // 로그인 ID 도 [중복확인]을 거쳐야 한다
  await page.click('[data-testid="check-username"]');
  await page.waitForSelector('[data-testid="id-check-message"]', { timeout: 20000 });
  await page.click('[data-testid="submit-register"]');

  // ── A8 STEP 5 가입완료 ────────────────────────────────────
  await page.waitForSelector('[data-testid="step-done"]', { timeout: 30000 });
  const doneText = await page.locator('[data-testid="step-done"]').innerText();
  check("A8-1", "가입 신청 접수 화면이 뜬다", doneText.includes("접수되었습니다"));
  check("A8-2", "승인 후 이용 가능하다고 안내한다", doneText.includes("승인 완료 후 이용 가능"));
} catch (e) {
  check("ERR", "예외 발생", false, e.message.split("\n")[0]);
  await page.screenshot({ path: "e2e-failure.png" }).catch(() => {});
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n합계 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exit(failed.length ? 1 : 0);
