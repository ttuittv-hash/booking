// 대관 신청 위저드 — 시설 선택부터 신청서 제출 직전까지 전 단계를 태운다.
// 접수 개시(2026-09-01) 전이라 SEOUL_ARENA_APPLY_OPEN=true 인 환경에서만 열린다.
//
// 로그인 계정은 환경변수로 받는다 — 승인 완료된 신청자 계정이어야 한다.
//   E2E_USER (기본 testuser) · E2E_PASSWORD (기본 Test1234!)
// 계정이 없으면 /register 로 가입한 뒤 bo 의 회원 관리에서 승인하거나,
// full-flow.spec.mjs 를 한 번 돌리면 승인된 계정이 하나 만들어진다.
import { chromium } from "@playwright/test";

const USER = process.env.E2E_USER || "testuser";
const PW = process.env.E2E_PASSWORD || "Test1234!";
const B="https://partner.dev.seoularena.net";
const out=[]; const say=(ok,l,d="")=>{out.push(ok);console.log(`${ok?"OK  ":"NG  "} ${l}${d?"  — "+d:""}`)};
const b=await chromium.launch();
const lc=await b.newContext(); {const p=await lc.newPage();
 await p.goto(`${B}/login`,{waitUntil:"domcontentloaded"});const i=p.locator("input");
 await i.nth(0).fill(USER);await i.nth(1).fill(PW);
 await p.locator('button[type="submit"]').first().click();
 await p.waitForURL(x=>!x.toString().includes("/login"),{timeout:20000});await p.close();}
const p=await (await b.newContext({viewport:{width:1440,height:1200},storageState:await lc.storageState()})).newPage();
const errs=[]; p.on("pageerror",e=>errs.push(String(e).slice(0,100)));
p.on("console",m=>{if(m.type()==="error")errs.push(m.text().slice(0,100))});

const text = async () => (await p.locator("main").innerText()).replace(/\s+/g," ");
const next = async () => {
  const btn = p.locator('button:has-text("다음")').last();
  await btn.scrollIntoViewIfNeeded().catch(()=>{});
  await btn.click({timeout:15000});
  await p.waitForTimeout(1600);
};

await p.goto(B+"/apply?new=1",{waitUntil:"domcontentloaded"});
await p.waitForTimeout(2500);
say((await p.locator('button:has-text("다음")').count())>0, "위저드가 열린다");

// STEP1 공간/일정 — 시설 선택 + 달력에서 한 주
await p.locator('button, label').filter({hasText:/아레나/}).first().click().catch(()=>{});
await p.waitForTimeout(800);
const cells = p.locator('button:not([disabled])').filter({hasText:/^\d{1,2}$/});
const n = await cells.count();
await cells.nth(Math.floor(n*0.6)).click(); await p.waitForTimeout(1000);
say(/주차/.test(await text()), `공간/일정에서 한 주가 잡힌다 (${n}칸)`, (await text()).match(/2026년 \d+월 \d+주차[^\.]{0,20}/)?.[0] ?? "");
await next();

// STEP2 구성·옵션 — 패키지 수동 선택(개편으로 자동 산정에서 바뀜)
say(/구성.*옵션|패키지/.test(await text()), "STEP2 구성·옵션 도달");
await p.locator('button, [role=button], label').filter({hasText:/PACKAGE 1/}).first().click().catch(()=>{});
await p.waitForTimeout(900);
await next();

// STEP3 기본 정보 → STEP4 신청서 제출
say(/신청자 정보|기본 정보/.test(await text()), "STEP3 기본 정보 도달");
let reached = false;
for (let i = 0; i < 5 && !reached; i++) {
  await next();
  reached = (await p.locator('button:has-text("신청서 생성"), button:has-text("수정 내용 저장"), button:has-text("제출")').count()) > 0;
}
say(reached, "마지막 단계(신청서 제출)까지 간다", reached ? "" : (await text()).slice(-80));

if (reached) {
  const submit = p.locator('button:has-text("신청서 생성"), button:has-text("수정 내용 저장")').last();
  if (await submit.count()) {
    say(!(await submit.isDisabled()), "[신청서 생성]이 잠겨 있지 않다");
    await submit.scrollIntoViewIfNeeded().catch(()=>{});
    await submit.click();
    await p.waitForTimeout(1400);
    const t=(await p.locator('[data-testid="toast"]').first().innerText().catch(()=>"")).replace(/\s+/g," ");
    say(/동의|서약|확인/.test(t), "동의 전 제출은 이유를 알려준다", t.slice(0,44));
  }
}

say(errs.length===0, "콘솔 오류가 없다", [...new Set(errs)].slice(0,2).join(" | "));
await b.close();
console.log(`\n합계 ${out.length}건 · 통과 ${out.filter(Boolean).length} · 실패 ${out.filter(x=>!x).length}`);
