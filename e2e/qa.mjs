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
// 아직 못 덮는 것(정직하게 남긴다):
//   · 일반관리자(BASIC)가 계약·정산 API 를 못 쓰는지 — 검증하려면 BASIC 등급 테스트 계정이
//     필요하다. 운영의 일반관리자는 실계정이고, 계정을 새로 만드는 건 운영 DB 에 쓰는
//     일이라 임의로 하지 않았다. 계정을 받으면 security 모듈로 덮는다.
import { chromium } from "@playwright/test";
import { env } from "./qa/_lib.mjs";
import * as regression from "./qa/regression.mjs";

const MODULES = [regression];

const cfg = {
  bo: process.env.QA_BO || "https://bo.seoularena.net",
  partner: process.env.QA_PARTNER || "https://partner.seoularena.net",
  adminUser: env("QA_ADMIN"),
  adminPw: env("QA_ADMIN_PW"),
  arenaQuote: process.env.QA_ARENA_QUOTE || "2026-00051",
  midQuote: process.env.QA_MID_QUOTE || "2026-00030",
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
