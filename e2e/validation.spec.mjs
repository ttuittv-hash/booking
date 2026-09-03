// 입력 검증 점검 — 못 채운 칸이 있을 때 버튼이 잠기지 않고 이유를 알려주는지 본다.
// 잠긴 버튼은 눌러도 반응이 없어 고장으로 보인다 — 고객이 실제로 그렇게 신고했다.
//
// 로그인 계정은 환경변수로 받는다 — 승인 완료된 신청자 계정이어야 한다.
//   E2E_USER (기본 testuser) · E2E_PASSWORD (기본 Test1234!)
// 계정이 없으면 /register 로 가입한 뒤 bo 의 회원 관리에서 승인하거나,
// full-flow.spec.mjs 를 한 번 돌리면 승인된 계정이 하나 만들어진다.
import { chromium } from "@playwright/test";

const USER = process.env.E2E_USER || "testuser";
const PW = process.env.E2E_PASSWORD || "Test1234!";
const B="https://partner.dev.seoularena.net";
const out=[]; const say=(ok,label,detail="")=>{out.push(ok);console.log(`${ok?"OK  ":"NG  "} ${label}${detail?"  — "+detail:""}`)};
const toastOf=async(p)=>(await p.locator('[data-testid="toast"], [role=alert]').first().innerText().catch(()=>"")).replace(/\s+/g," ").replace(/^[!✕✓i]\s*/,"").replace(/[✕✓]\s*$/,"").trim();
// 토스트는 4초 유지되고 같은 문구는 하나로 합쳐진다. 다음 검사 전에 사라지길 기다린다.
const toastGone=async(p)=>{ await p.locator('[data-testid="toast"]').first().waitFor({state:"detached",timeout:8000}).catch(()=>{}); };
const b=await chromium.launch();

// 로그인 1회 → 세션 재사용
const lc=await b.newContext(); {
  const p=await lc.newPage();
  await p.goto(`${B}/login`,{waitUntil:"domcontentloaded"});
  const i=p.locator("input"); await i.nth(0).fill(USER); await i.nth(1).fill(PW);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForURL(x=>!x.toString().includes("/login"),{timeout:20000}); await p.close();
}
const state=await lc.storageState(); await lc.close();
const ctx=await b.newContext({viewport:{width:1440,height:1000}, storageState:state});
const p=await ctx.newPage();

// ── 1:1 문의 — 빈 폼
await p.goto(B+"/mypage/inquiries/new",{waitUntil:"networkidle"});
const inqBtn=p.locator('button:has-text("문의 등록")').first();
say(!(await inqBtn.isDisabled()), "문의 등록 버튼이 잠겨 있지 않다");
await inqBtn.click(); await p.waitForTimeout(1200);
let t=await toastOf(p);
say(t.includes("문의 유형"), "빈 폼 제출 시 무엇이 빠졌는지 알려준다", t.slice(0,40));
say(p.url().includes("/new"), "저장되지 않고 화면에 머문다");

// 유형만 고르고 다시 → 다음 결손을 알려주는가
const sel=p.locator("select").first();
await toastGone(p);
await sel.selectOption("facility");
await p.waitForTimeout(500); await inqBtn.click(); await p.waitForTimeout(1200);
t=await toastOf(p);
say(/제목|신청번호/.test(t), "다음으로 빠진 항목을 이어서 알려준다", t.slice(0,40));

// 다 채우면 저장되는가
const n=String(Date.now()).slice(-6);
// [수정 2026-09-03] 제목을 라벨로 특정한다. "답변받으실 곳"의 이름 칸(type=text)이
// 제목 뒤에 생겨 .last() 가 이름을 집었고, 제목이 빈 채 제출돼 저장 실패로 오인했다.
await p.locator('label:has-text("제목") input').fill("UI 점검 "+n);
await p.locator("textarea").first().fill("버튼 검증용 본문입니다.");
await toastGone(p);
await inqBtn.click(); await p.waitForTimeout(3500);
say(!p.url().includes("/new"), "다 채우면 정상 저장된다", p.url().replace(B,""));

// ── 대관 신청 위저드 — STEP2 패키지 미선택에서 [다음]
// (개편 후 STEP1 은 아레나 사전 선택 + 기본 주차라 "시설 미선택" 상태가 없다)
await toastGone(p);
await p.goto(B+"/apply?new=1",{waitUntil:"networkidle"});
const next=p.locator('button:has-text("다음")').last();
if (await next.count()) {
  say(!(await next.isDisabled()), "위저드 [다음]이 잠겨 있지 않다");
  await next.click(); await p.waitForTimeout(1400); // STEP1 → STEP2 (구성·옵션)
  await next.click(); await p.waitForTimeout(1200); // 패키지 없이 다음
  t=await toastOf(p);
  say(/패키지/.test(t), "패키지 미선택이면 이유를 알려준다", t.slice(0,40));
} else say(false, "위저드 [다음] 버튼을 찾지 못함");

// ── 회원 탈퇴 — 빈 상태
await p.goto(B+"/mypage/withdraw",{waitUntil:"networkidle"});
const wd=p.locator('button:has-text("탈퇴")').last();
if (await wd.count()) {
  say(!(await wd.isDisabled()), "탈퇴 버튼이 잠겨 있지 않다");
  await wd.click(); await p.waitForTimeout(1200);
  t=await toastOf(p);
  say(/비밀번호|동의/.test(t), "탈퇴 조건 미충족 사유를 알려준다", t.slice(0,40));
}

// ── 비밀번호 변경 — 빈 상태
await p.goto(B+"/mypage/profile",{waitUntil:"networkidle"});
const pw=p.locator('button:has-text("비밀번호 변경")').last();
if (await pw.count()) {
  say(!(await pw.isDisabled()), "비밀번호 변경 버튼이 잠겨 있지 않다");
  await pw.click(); await p.waitForTimeout(1200);
  t=await toastOf(p);
  say(/현재 비밀번호|8자/.test(t), "비밀번호 변경 사유를 알려준다", t.slice(0,40));
}

// ── 아이디 찾기 — 빈 상태
const g=await (await b.newContext()).newPage();
await g.goto(B+"/reset-password",{waitUntil:"networkidle"});
const rn=g.locator('[data-testid="reset-next"]');
if (await rn.count()) {
  say(!(await rn.isDisabled()), "비밀번호 찾기 [다음]이 잠겨 있지 않다");
  await rn.click(); await g.waitForTimeout(1200);
  t=await toastOf(g);
  say(/아이디/.test(t), "아이디 미입력 사유를 알려준다", t.slice(0,40));
}
await b.close();
console.log(`\n합계 ${out.length}건 · 통과 ${out.filter(Boolean).length} · 실패 ${out.filter(x=>!x).length}`);
