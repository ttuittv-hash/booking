// 알림톡 연동(배선) 검증 — 카카오까지 못 가는 환경(DKT 방화벽)에서도 "올바른 템플릿·변수로
// 발송 직전까지 갔는지"를 message_sends 이력으로 확인한다. (2026-09-03 ARENA_ 정본 전환·신규 3종)
//
//   node e2e/alimtalk-wiring.spec.mjs            (E2E_ADMIN/E2E_ADMIN_PASSWORD 기본값, PHONE 기본 01027866732)
//
// 흐름: 비회원 1:1 문의 등록(→ ARENA-0010 등록자 · ARENA-0014 운영자 전원) → 운영자 로그인 후 답변 등록
// (→ 비회원이므로 ARENA-0016, 버튼 변수 1:1문의링크). 이력 조회는 aws-infra/db-sql.sh dev 로 한다.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const ADMIN = process.env.E2E_ADMIN || "admin", APW = process.env.E2E_ADMIN_PASSWORD || "Dkfpsk123!";
const PHONE = process.env.PHONE || "01027866732";
const DBSQL = new URL("../../aws-infra/db-sql.sh", import.meta.url).pathname;

const results = [];
const check = (id, label, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${label}${detail ? "  — " + detail : ""}`);
};
const sql = (q) =>
  execFileSync(DBSQL, ["dev", q], { encoding: "utf8" })
    .split("\n")
    .filter((l) => l && !/^(START|DONE|\[dev\]|t\||template_code\|)/.test(l) && !/^\(\d+ rows?\)$/.test(l));

const browser = await chromium.launch();
const ctx = await browser.newContext();
const pg = await ctx.newPage();
try {
  // 1) 비회원 문의 등록
  const title = `[알림톡 검증] ${new Date().toISOString().slice(11, 19)}`;
  const res = await pg.request.post(`${BASE}/api/inquiries`, {
    data: { title, content: "ARENA_0010/0014/0016 배선 검증용 문의입니다.", category: "facility", contactName: "검증담당", contactPhone: PHONE, contactEmail: "alimtalk-check@example.com" },
  });
  const j = await res.json().catch(() => ({}));
  const inquiryId = j.inquiry?.id;
  check("1", "비회원 문의 등록 API 200 + id", res.status() === 200 && !!inquiryId, `status=${res.status()} id=${inquiryId ?? "-"}`);
  if (!inquiryId) throw new Error("문의 등록 실패: " + JSON.stringify(j).slice(0, 200));

  // 2) 운영자 로그인 → 답변 등록
  await pg.goto(`${BO}/admin/login`);
  const inputs = pg.locator("input"); await inputs.nth(0).fill(ADMIN); await inputs.nth(1).fill(APW);
  await pg.locator('button[type="submit"]').first().click();
  await pg.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 });
  const ans = await pg.request.post(`${BO}/api/inquiries/${inquiryId}/answer`, { data: { answer: "검증용 답변입니다." } });
  check("2", "운영자 답변 등록 API 200", ans.status() === 200, `status=${ans.status()}`);

  // 3) 발송 이력 — 백그라운드 발송·타임아웃(10s)을 기다린다
  await new Promise((r) => setTimeout(r, 20000));
  const rows = sql(
    `select template_code, channel, status, coalesce(result_code,''), left(coalesce(result_message,''),40), left(coalesce(payload_json,''),160) from message_sends where idempotency_key like '%${inquiryId}%' order by created_at`,
  );
  console.log(rows.map((r) => "   " + r).join("\n"));
  const has = (code, pred) => rows.some((r) => r.startsWith(code + "|") && pred(r));
  check("3a", "ARENA-0010 등록자(비회원) 발송 시도 이력", has("ARENA-0010", () => true));
  check("3b", "ARENA-0014 운영자 전원 발송 시도 이력(1건 이상)", has("ARENA-0014", () => true));
  check("3c", "ARENA-0016 비회원 답변 완료 — 버튼 변수 1:1문의링크=inquiry/{id}?t=", has("ARENA-0016", (r) => r.includes("1:1문의링크") && r.includes(`inquiry/${inquiryId}?t=`)));
  check("3d", "ARENA-0009(회원용)는 비회원 문의에 안 나감", !has("ARENA-0009", () => true));
  check("3e", "템플릿/변수 오류(result_code=TEMPLATE) 없음", !rows.some((r) => r.includes("|TEMPLATE|")));
  const net = rows.filter((r) => /ALIMTALK/.test(r));
  console.log(`   알림톡 채널 ${net.length}건 상태: ${net.map((r) => r.split("|")[2] + (r.split("|")[3] ? "/" + r.split("|")[3] : "")).join(", ")}`);
} finally {
  await browser.close();
}
console.log(`합계 ${results.length}건 · 통과 ${results.filter(Boolean).length} · 실패 ${results.filter((x) => !x).length}`);
process.exit(results.every(Boolean) ? 0 : 1);
