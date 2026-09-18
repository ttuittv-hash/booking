// [QA] 권한 경계 — 일반관리자(BASIC)가 대관 자료 API 를 쓸 수 없는지 확인한다.
//
// 2026-09-18 에 고친 것: 계약·정산·변경계약·입금·세금계산서·계약날인·티켓오픈·시설회의·
// 요금표 라우트가 `role !== "ADMIN"` 만 보고 `adminTier` 를 안 봤다. 화면은
// requireProAdminPage() 로 BASIC 을 막는데 API 는 독립적으로 막지 않아, 콘텐츠 권한만 받은
// 운영자가 콘솔에서 남의 정산 최종금액을 확정할 수 있었다.
//
// ⚠️ **검증 방법이 중요하다.** 「막히는가」를 보려면 그 API 를 실제로 호출해야 하는데,
// 막힘이 풀려 있으면 호출이 **진짜로 운영 데이터를 바꾼다**. 그래서 **존재하지 않는
// 신청번호**로 호출한다. 등급 검사는 신청서 조회보다 **앞**에 있으므로:
//
//     등급 검사 있음 → 403 (막힘)        등급 검사 없음 → 404 (신청서 없음)
//
// 둘이 깔끔히 갈리고, 없는 신청서는 어차피 바뀔 수 없다. 200 이 나오면 그건 사고다.
//
// 이 방식으로 **검증할 수 없는 것**(정직하게 남긴다):
//   · invoice · signature — 구조상 신청서 조회가 등급 검사보다 앞이라 404 만 나와 판별 불가
//   · 요금표 PUT — 신청번호가 없어 "없는 대상" 안전장치를 걸 수 없다. 막힘이 풀려 있으면
//     요금표가 실제로 바뀔 수 있어 아예 호출하지 않는다.
import { CANNOT_READ, Report, login, watchErrors } from "./_lib.mjs";

export const title = "권한 경계 — 일반관리자(BASIC)";

// 등급 검사가 신청서 조회보다 앞에 있는 라우트만 넣는다(위 주석 참고).
const GUARDED = [
  ["contract", "계약 확정"],
  ["settlement", "정산 확정"],
  ["addendum", "변경계약 추가"],
  ["ticket-open", "티켓 오픈 자료"],
  ["facility-meeting", "시설 회의 자료"],
];

const NO_SUCH_QUOTE = "0000-00000"; // 존재하지 않는 번호 — 막힘이 풀려 있어도 바뀔 대상이 없다

export async function run(browser, cfg) {
  const rep = new Report(title);

  if (!cfg.basicUser || !cfg.basicPw) {
    rep.add(
      "BASIC 계정 자격증명",
      CANNOT_READ,
      "QA_BASIC_USER / QA_BASIC_PW 가 없어 권한 경계를 검증하지 못했습니다",
    );
    return rep;
  }

  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await login(page, { base: cfg.bo, user: cfg.basicUser, pw: cfg.basicPw });

  for (const [path, label] of GUARDED) {
    const url = `${cfg.bo}/api/quotes/${NO_SUCH_QUOTE}/${path}`;
    let status;
    try {
      const r = await page.request.post(url, { data: {}, failOnStatusCode: false });
      status = r.status();
    } catch (e) {
      status = CANNOT_READ;
      void e;
    }
    rep.check(
      `${label} API 가 일반관리자를 막는다`,
      status,
      (s) => s === 403,
      (s) => (s === 403 ? "403 막힘" : s === 404 ? "404 — 등급 검사가 없다(신청서 조회가 먼저 돌았다)" : `${s}`),
    );
  }

  // 화면 쪽도 같이 본다 — 화면은 원래 막고 있었지만, 같이 확인해 두면 한쪽만 풀렸을 때 보인다.
  await page.goto(`${cfg.bo}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const onList = page.url().includes("/admin") && !page.url().includes("/login");
  rep.check(
    "신청 현황 화면은 일반관리자에게 열리지 않는다",
    onList ? (await page.locator("body").innerText()).slice(0, 200) : CANNOT_READ,
    (t) => !/신청 목록/.test(t),
    (t) => (/신청 목록/.test(t) ? "열렸습니다 — 확인 필요" : "막힘"),
  );

  rep.check("JS 에러 없음", errs.js.length === 0 ? "없음" : errs.js[0], (v) => v === "없음", (v) => v);

  await ctx.close();
  return rep;
}
