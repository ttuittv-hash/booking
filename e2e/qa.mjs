// QA 러너 — 개발이 끝난 뒤 마지막에 한 번 돌려 「정상/정상/정상」을 확인하는 자리.
//
//   QA_ADMIN=<아이디> QA_ADMIN_PW=<비밀번호> node e2e/qa.mjs
//
// 환경변수(기본값을 두지 않는다 — 저장소에 비밀번호를 박지 않기 위해):
//   QA_ADMIN, QA_ADMIN_PW   백오피스 운영자 계정 (필수)
//   QA_BO                   백오피스 주소 (기본 https://bo.seoularena.net)
//   QA_PARTNER              신청자 화면 주소 (기본 https://partner.seoularena.net)
//   QA_ARENA_QUOTE          아레나 신청서 번호 (심사 화면 검사 대상)
//   QA_MID_QUOTE            중형 신청서 번호
//
// 규칙 — 모듈을 추가할 때도 지킬 것:
//   1. **운영에서는 읽기만 한다.** 신청서를 만들거나 고치거나 지우지 않는다. 승인·거절·
//      제출·삭제 버튼을 누르지 않는다. 운영에는 실제 접수 건이 살아 있다.
//   2. **값을 못 읽으면 실패다.** 통과로 세지 않는다(_lib.mjs 의 CANNOT_READ 참고).
//   3. **자격증명은 환경변수로만.** 기본값을 두지 않는다.
//
//   QA_BASIC_USER, QA_BASIC_PW   일반관리자(BASIC) 계정 — 권한 경계 검증용.
//                                2026-09-18 에 qabasic01 을 만들었다(운영자 계정 관리 화면).
//
// 아직 못 덮는 것(정직하게 남긴다):
//   · invoice · signature 라우트의 등급 차단 — 구조상 신청서 조회가 등급 검사보다 앞이라,
//     "없는 신청번호" 안전장치를 쓰면 404 만 나와 판별이 안 된다(security.mjs 주석 참고).
//   · 요금표 PUT 의 등급 차단 — 신청번호가 없어 안전장치를 걸 수 없다. 막힘이 풀려 있으면
//     요금표가 실제로 바뀌므로 아예 호출하지 않는다.
//   · 신청자(APPLICANT) 관점의 경계 — 승인된 신청자 테스트 계정이 운영에 없다.
import { chromium } from "@playwright/test";
import { env } from "./qa/_lib.mjs";
import * as regression from "./qa/regression.mjs";
import * as security from "./qa/security.mjs";

const MODULES = [security, regression];

const cfg = {
  bo: process.env.QA_BO || "https://bo.seoularena.net",
  partner: process.env.QA_PARTNER || "https://partner.seoularena.net",
  adminUser: env("QA_ADMIN"),
  adminPw: env("QA_ADMIN_PW"),
  arenaQuote: process.env.QA_ARENA_QUOTE || "2026-00051",
  midQuote: process.env.QA_MID_QUOTE || "2026-00030",
  // 권한 경계 검증용 일반관리자(BASIC) 계정. 없으면 security 모듈이 "검증 못 했다"로
  // 표시한다 — 조용히 건너뛰지 않는다(건너뛴 검사를 통과로 세면 안 된다).
  basicUser: process.env.QA_BASIC_USER || null,
  basicPw: process.env.QA_BASIC_PW || null,
};

console.log(`\n대상: ${cfg.bo}  (읽기 전용)\n`);

const browser = await chromium.launch();
const reports = [];
try {
  for (const m of MODULES) {
    console.log(`\n── ${m.title}`);
    reports.push(await m.run(browser, cfg));
  }
} finally {
  await browser.close();
}

console.log("\n" + "─".repeat(60));
let bad = 0;
for (const r of reports) {
  console.log(`  ${r.failed === 0 ? "정상" : "실패"}  ${r.summary()}`);
  bad += r.failed;
}
const total = reports.reduce((n, r) => n + r.rows.length, 0);
const ok = reports.reduce((n, r) => n + r.passed, 0);
console.log("─".repeat(60));
console.log(bad === 0 ? `\n✅ 전부 정상 — ${ok}/${total}\n` : `\n❌ ${bad}건 확인 필요 — ${ok}/${total}\n`);
process.exit(bad === 0 ? 0 : 1);
