// 8/24 오픈 범위 전체 흐름 E2E — 기획서 A2~A15 를 화면에서 1:1 확인한다.
//
// 전제: 카카오(120-81-47521)가 dev DB 에 없어야 한다.
// 진위확인을 통과하려면 실제로 존재하는 사업자번호를 써야 해서 실행마다 번호를 바꿀 수 없다.
// 그래서 이 회사가 남아 있으면 이번 사용자는 "최초 가입자(대표 담당자)"가 아니라 소속 담당자로
// 붙고, 대표 담당자 전용인 담당자 관리(A10)부터 줄줄이 실패한다. 실행 전에 지운다:
//
//   ./e2e/reset-dev.sh
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
const t = String(Date.now()).slice(-6);

/**
 * 하이드레이션 전에 값을 채우면 DOM 에는 들어가지만 React 상태는 비어 있다.
 * 이후 같은 값으로 다시 채워도 React 는 "값이 그대로"라 보고 onChange 를 건너뛰어,
 * 화면은 입력된 것처럼 보이는데 제출은 빈 값으로 나간다.
 *
 * 입력칸의 value 만 봐서는 이걸 구분할 수 없다 — DOM 값은 React 와 무관하게 채워진다.
 * 예전에는 "버튼이 풀렸는가"로 판정했는데, 입력이 비었다고 버튼을 잠그는 UI 를
 * 걷어내면서(잠긴 버튼은 눌러도 반응이 없어 고장으로 보인다) 그 신호도 사라졌다.
 * 그래서 결과로 확인한다 — 채우고 누른 뒤 다음 화면이 나오지 않으면 다시 채워 누른다.
 */
async function fillAndAdvance(p, inputSel, value, buttonSel, expectSel) {
  for (let i = 0; i < 8; i++) {
    await p.fill(inputSel, "");
    await p.fill(inputSel, value);
    await p.click(buttonSel);
    try {
      await p.waitForSelector(expectSel, { timeout: 3000 });
      return;
    } catch {
      await p.waitForTimeout(400);
    }
  }
  throw new Error(`다음 화면이 나오지 않음: ${expectSel}`);
}

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
  // 기획서 A5 — 사업자등록번호는 [중복·진위확인]을 통과해야 제출할 수 있다
  await page.click('[data-testid="verify-brn"]');
  await page.waitForSelector('[data-testid="brn-check-message"]', { timeout: 25000 });
  await fillIfEditable(page, '[data-testid="f-postalCode"]', "13529");
  await fillIfEditable(page, '[data-testid="f-address"]', "경기도 성남시 분당구 판교역로 166");
  await page.fill('[data-testid="f-username"]', masterUser);
  await page.fill('[data-testid="f-email"]', `${masterUser}@seoul-ent.co.kr`);
  await page.fill('[data-testid="f-password"]', "Test1234!");
  await page.fill('[data-testid="f-passwordConfirm"]', "Test1234!");
  // 사업자등록증·재직증명서는 필수 첨부(2026-08-28 기획 개정) — 더미 파일을 올린다.
  await page.setInputFiles('[data-testid="f-businessCert"]', new URL("./fixtures/dummy.png", import.meta.url).pathname);
  await page.setInputFiles('[data-testid="f-employmentCert"]', new URL("./fixtures/dummy.png", import.meta.url).pathname);
  await page.waitForTimeout(2500);
  // 로그인 ID 도 [중복확인]을 거쳐야 한다
  await page.click('[data-testid="check-username"]');
  await page.waitForSelector('[data-testid="id-check-message"]', { timeout: 20000 });
  await page.click('[data-testid="submit-register"]');
  await page.waitForSelector('[data-testid="step-done"]', { timeout: 30000 });

  // 이 테스트는 "최초 가입자 = 대표 담당자"를 전제로 한다. 카카오가 이미 있으면 이번
  // 사용자는 소속 담당자로 붙고, 그 사실이 한참 뒤 A10 에서야 드러나 원인을 찾기 어렵다.
  // 여기서 바로 세운다 — 앱은 정상 동작한 것이고, 정리를 안 한 것이 원인이다.
  const doneNotice = await page.locator('[data-testid="step-done"]').innerText();
  if (doneNotice.includes("등록된 회사에 합류")) {
    throw new Error(
      "카카오(120-81-47521)가 dev DB 에 이미 있어 소속 담당자로 가입됐다.\n" +
        "        ./e2e/reset-dev.sh 를 먼저 돌린 뒤 다시 실행할 것.",
    );
  }
  check("A8-1", "최초 가입자 가입이 접수된다", true);

  // ── A15 접근권한: 승인 대기 상태 ──────────────────────────
  await page.goto(`${BASE}/apply`, { waitUntil: "domcontentloaded" });
  check("A15-1", "승인 대기는 대관신청이 막힌다", page.url().includes("/pending"));
  await page.goto(`${BASE}/guide`, { waitUntil: "domcontentloaded" });
  check("A15-2", "승인 대기도 대관안내는 열람한다", page.url().includes("/guide"));
  await page.goto(`${BASE}/seoularena`, { waitUntil: "domcontentloaded" });
  check("A15-3", "서울아레나 소개는 누구나 열람한다", page.url().includes("/seoularena"));
  // IA 재구성으로 상세 스펙(시설 소개)은 로그인이 필요한 /features 로 분리됐다.
  await page.goto(`${BASE}/features`, { waitUntil: "domcontentloaded" });
  check("A15-3b", "승인 대기도 시설 소개를 본다", page.url().includes("/features"));
  await page.goto(`${BASE}/mypage/profile`, { waitUntil: "domcontentloaded" });
  check("A15-4", "승인 대기도 본인 정보 수정은 들어간다", page.url().includes("/mypage/profile"));

  // 비로그인 차단
  const guest = await (await newCtx()).newPage();
  await guest.goto(`${BASE}/guide`, { waitUntil: "domcontentloaded" });
  check("A15-5", "비로그인은 대관안내가 막힌다", guest.url().includes("/login"));
  await guest.goto(`${BASE}/seoularena`, { waitUntil: "domcontentloaded" });
  check("A15-6", "비로그인도 서울아레나 소개는 본다", guest.url().includes("/seoularena"));
  await guest.goto(`${BASE}/features`, { waitUntil: "domcontentloaded" });
  check("A15-6b", "비로그인은 시설 소개가 막힌다", guest.url().includes("/login"));

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

  // 승인은 운영자가 실제로 하는 대로 화면에서 한다.
  // 예전에는 승인 대상 id 를 /tmp 파일로 넘겨받았는데, 그 파일을 채워 줄 주체가 없어
  // 직전 실행이 남긴 낡은 id 를 읽고 "이미 처리된 건"(409)으로 실패했다.
  await bo.goto(`${BO}/admin/applicants`, { waitUntil: "domcontentloaded" });
  const row = bo.locator("tr", { hasText: `${masterUser}@seoul-ent.co.kr` }).first();
  await row.waitFor({ timeout: 20000 });
  await row.getByRole("button", { name: "승인" }).click();
  // 승인되면 승인 대기 목록에서 빠진다
  await row.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  const stillPending = await bo
    .locator("tr", { hasText: `${masterUser}@seoul-ent.co.kr` })
    .filter({ has: bo.getByRole("button", { name: "승인" }) })
    .count();
  check("A9-2", "운영자가 최초 가입자를 승인한다", stillPending === 0);

  // ── 승인 후 접근권한 ──────────────────────────────────────
  await page.goto(`${BASE}/apply`, { waitUntil: "domcontentloaded" });
  check("A15-7", "승인 완료면 대관신청이 열린다", page.url().includes("/apply"));

  // ── A10 담당자 관리 · A11 초대 ────────────────────────────
  await page.goto(`${BASE}/mypage/members`, { waitUntil: "domcontentloaded" });
  check("A10-1", "마스터에게 담당자 관리 화면이 열린다", page.url().includes("/mypage/members"));
  await page.waitForSelector('[data-testid="members-table"]');
  // 초대는 이름이 필수다(2026-08-22 기획 반영)
  await page.fill('[data-testid="invite-name"]', "초대테스트");
  await page.fill('[data-testid="invite-email"]', `staff${t}@seoul-ent.co.kr`);
  // 휴대폰 번호도 필수(2026-08-28 개정: 본인인증 번호와 대조해 심사 생략). 가짜 번호라 대조는 안 맞고
  // 평범한 합류 신청이 된다 — 아래 A11-4~6 은 그 경로를 확인한다.
  await page.fill('[data-testid="invite-phone"]', "010-0000-0001");
  await page.click('[data-testid="invite-send"]');
  await page.waitForSelector('[data-testid="invite-url"]', { timeout: 15000 });
  const inviteUrl = (await page.locator('[data-testid="invite-url"] .font-mono').innerText()).trim();
  check("A11-1", "초대 링크가 회원가입 페이지로 발급된다", inviteUrl.includes("/register"));

  // 초대받은 사람의 가입 — 다른 브라우저 컨텍스트(= 다른 사람).
  // [개정 2026-08-27] 전용 수락 화면을 없앴다. 초대받은 사람은 일반 회원가입을 그대로 밟고
  // (사업자등록번호로 같은 회사에 합류), 대표 담당자가 담당자 관리에서 승인한다.
  const inviteeCtx = await newCtx();
  const invitee = await inviteeCtx.newPage();
  await invitee.goto(inviteUrl, { waitUntil: "domcontentloaded" });
  await invitee.click('[data-testid="pick-corporate"]');
  await invitee.check('[data-testid="agree-SERVICE"]');
  await invitee.check('[data-testid="agree-PRIVACY_REQUIRED"]');
  await invitee.click('[data-testid="terms-next"]');
  await invitee.click('[data-testid="identity-start"]');
  await invitee.waitForSelector('[data-testid="step-info"]', { timeout: 20000 });
  check("A11-2", "초대받은 사람이 일반 회원가입 흐름을 그대로 밟는다", true);
  // 같은 회사 = 같은 사업자등록번호. 진위확인을 거치면 "이미 등록된 회사"로 잠긴다.
  await invitee.fill('[data-testid="f-brn"]', "120-81-47521");
  await invitee.click('[data-testid="verify-brn"]');
  await invitee.waitForSelector('[data-testid="brn-check-message"]', { timeout: 25000 });
  check("A11-3", "사업자등록번호로 같은 회사에 합류로 판정된다",
    (await invitee.locator('[data-testid="f-companyName"]').getAttribute("readonly")) !== null);
  await fillIfEditable(invitee, '[data-testid="f-postalCode"]', "13529");
  await fillIfEditable(invitee, '[data-testid="f-address"]', "경기도 성남시 분당구 판교역로 166");
  await invitee.fill('[data-testid="f-username"]', "s" + t);
  // 초대장과 같은 이메일로 가입해야 "미가입" 초대 행이 자동 정리된다.
  await invitee.fill('[data-testid="f-email"]', `staff${t}@seoul-ent.co.kr`);
  await invitee.fill('[data-testid="f-password"]', "Test1234!");
  await invitee.fill('[data-testid="f-passwordConfirm"]', "Test1234!");
  // 사업자등록증·재직증명서는 필수 첨부(2026-08-28 기획 개정) — 더미 파일을 올린다.
  await invitee.setInputFiles('[data-testid="f-businessCert"]', new URL("./fixtures/dummy.png", import.meta.url).pathname);
  await invitee.setInputFiles('[data-testid="f-employmentCert"]', new URL("./fixtures/dummy.png", import.meta.url).pathname);
  await invitee.waitForTimeout(2500);
  await invitee.click('[data-testid="check-username"]');
  await invitee.waitForSelector('[data-testid="id-check-message"]', { timeout: 20000 });
  await invitee.click('[data-testid="submit-register"]');
  await invitee.waitForSelector('[data-testid="step-done"]', { timeout: 30000 });
  check("A11-4", "초대받은 사람이 합류 신청으로 가입된다",
    (await invitee.locator('[data-testid="step-done"]').innerText()).includes("합류"));

  // 대표 담당자 화면 — 합류 신청이 목록에 뜨고, 초대 행은 소진돼 중복으로 남지 않는다.
  // 합류 직후 바로 새로고침하면 목록에 아직 안 보일 수 있다(2026-08-28 실측) — 몇 번 다시 읽는다.
  let rows = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.reload({ waitUntil: "domcontentloaded" });
    // 표는 먼저 그려지고 목록은 API 로 뒤늦게 채워진다 — 행이 뜰 때까지 기다린다.
    await page
      .waitForSelector(`[data-testid="members-table"] tbody tr:has-text("staff${t}@seoul-ent.co.kr")`, { timeout: 8000 })
      .catch(() => {});
    rows = await page.locator('[data-testid="members-table"] tbody tr').allInnerTexts();
    if (rows.some((r) => r.includes(`staff${t}@seoul-ent.co.kr`))) break;
  }
  check("A11-5", "합류 신청이 대표 담당자 목록에 보인다",
    rows.some((r) => r.includes("승인 대기")), `${page.url()} rows=${rows.length} ${rows.map((r) => r.replace(/\s+/g, " ").slice(0, 60)).join(" | ")}`);
  check("A11-6", "가입한 사람의 초대 행은 중복으로 남지 않는다",
    rows.filter((r) => r.includes(`staff${t}@seoul-ent.co.kr`)).length === 1,
    rows.filter((r) => r.includes(`staff${t}@seoul-ent.co.kr`)).length + "행");

  // ── A13 계정 복구 ─────────────────────────────────────────
  const rec = await (await newCtx()).newPage();
  await rec.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  check("A13-1", "로그인 화면에 아이디 찾기 링크가 있다",
    await rec.locator('[data-testid="link-find-id"]').isVisible());
  check("A13-2", "비밀번호 찾기 링크가 있다",
    await rec.locator('[data-testid="link-reset-password"]').isVisible());

  await rec.goto(`${BASE}/reset-password`, { waitUntil: "domcontentloaded" });
  await fillAndAdvance(
    rec,
    '[data-testid="reset-username"]',
    masterUser,
    '[data-testid="reset-next"]',
    '[data-testid="identity-start"]',
  );
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
  // 어느 단계에서 멈췄는지 알 수 있게 스택 첫 줄과 화면을 남긴다.
  const where = (e.stack || "").split("\n").find((l) => l.includes("full-flow.spec")) || "";
  check("ERR", "예외 발생", false, `${e.message.split("\n")[0]} @${where.trim()}`);
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n합계 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exit(failed.length ? 1 : 0);
