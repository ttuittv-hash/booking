// API 상태 점검 — 인증 경계(401)와 정상 응답(200)을 확인한다. 데이터 변경 없음.
import { chromium } from "@playwright/test";
const B="https://partner.dev.seoularena.net", BO="https://bo.dev.seoularena.net";
const USER=process.env.E2E_USER||"testuser", PW=process.env.E2E_PASSWORD||"Test1234!";
const out=[]; const say=(ok,l,d="")=>{out.push(ok);console.log(`${ok?"OK  ":"NG  "} ${l}${d?"  — "+d:""}`)};
const b=await chromium.launch();

// 비로그인 컨텍스트
const guest=await b.newContext();
const gp=await guest.newPage();
for (const [path, expect, label] of [
  ["/api/terms", 200, "약관 본문(공개)"],
  ["/api/auth/nice/config", 200, "본인인증 설정(공개)"],
  ["/api/rates", 200, "요금표 조회"],
  ["/api/notifications", 401, "알림(로그인 필요)"],
  ["/api/company/members", [401,403], "담당자 목록(로그인 필요)"],
  ["/api/admin/notification-rules", 401, "알림 규칙(운영자 전용)"],
]) {
  const r=await gp.request.get(B+path);
  const okS=Array.isArray(expect)?expect.includes(r.status()):r.status()===expect;
  say(okS, `비로그인 ${path} → ${expect}`, `실제 ${r.status()} · ${label}`);
}

// 신청자 로그인
await gp.goto(`${B}/login`,{waitUntil:"domcontentloaded"});
const i=gp.locator("input"); await i.nth(0).fill(USER); await i.nth(1).fill(PW);
await gp.locator('button[type="submit"]').first().click(); await gp.waitForTimeout(2500);
for (const [path, expect, label] of [
  ["/api/notifications", 200, "알림"],
  ["/api/company/members", 200, "담당자 목록"],
  ["/api/companies/search?field=name&keyword=서울아레나", 200, "회사 검색"],
  ["/api/admin/notification-rules", 401, "운영자 API 는 신청자에게 401"],
]) {
  const r=await gp.request.get(B+path);
  say(r.status()===expect, `신청자 ${path.split("?")[0]} → ${expect}`, `실제 ${r.status()} · ${label}`);
}
await guest.close();

// 운영자
const adm=await b.newContext(); const ap=await adm.newPage();
await ap.goto(`${BO}/login`,{waitUntil:"networkidle"});
const j=ap.locator("input"); await j.nth(0).fill("admin"); await j.nth(1).fill("Dkfpsk123!");
await Promise.all([ap.waitForURL(/\/admin(?!\/login)/,{timeout:25000}), ap.locator('button[type="submit"]').first().click()]);
for (const [path, expect, label] of [
  ["/api/admin/notification-rules", 200, "알림 규칙 목록"],
  ["/api/admin/companies/members?companyId=x", 200, "회사 담당자(운영자)"],
  ["/api/rates", 200, "요금표"],
]) {
  const r=await ap.request.get(BO+path);
  say(r.status()===expect, `운영자 ${path.split("?")[0]} → ${expect}`, `실제 ${r.status()} · ${label}`);
}
await b.close();
console.log(`합계 ${out.length}건 · 통과 ${out.filter(Boolean).length} · 실패 ${out.filter(x=>!x).length}`);
