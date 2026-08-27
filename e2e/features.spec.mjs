// 신기능 인터랙션 — 서명패드 · 공지 에디터(접기/캘린더) · 알림 규칙 CRUD · 권한 이관 화면.
// dev 전용: 공지·알림 규칙은 만들었다가 지운다.
import { chromium } from "@playwright/test";
const B="https://partner.dev.seoularena.net", BO="https://bo.dev.seoularena.net";
const out=[]; const say=(ok,l,d="")=>{out.push(ok);console.log(`${ok?"OK  ":"NG  "} ${l}${d?"  — "+d:""}`)};
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1440,height:1100}})).newPage();
const errs=[]; p.on("pageerror",e=>errs.push(String(e).slice(0,100)));
p.on("console",m=>{if(m.type()==="error")errs.push(m.text().slice(0,100))});
const t=String(Date.now()).slice(-6);
try{
// ── bo 로그인
await p.goto(`${BO}/login`,{waitUntil:"networkidle"});
const i=p.locator("input"); await i.nth(0).fill("admin"); await i.nth(1).fill("Dkfpsk123!");
await Promise.all([p.waitForURL(/\/admin(?!\/login)/,{timeout:25000}), p.locator('button[type="submit"]').first().click()]);
say(true,"bo 로그인");

// ── 알림 규칙 — 추가 → 목록 확인 → 삭제
await p.goto(`${BO}/admin/notification-rules`,{waitUntil:"networkidle"});
const body0=(await p.locator("main").innerText()).replace(/\s+/g," ");
say(/알림/.test(body0), "알림 규칙 화면 열림", body0.slice(0,60));
// CRUD 는 API 왕복으로 검증 (UI 는 위 표시 확인으로 충분)
{
  const res=await p.request.post(`${BO}/api/admin/notification-rules`,{data:{
    label:"점검용 규칙 "+t, description:"E2E 점검용", messageTemplate:"점검 메시지", enabled:false,
  }});
  const data=await res.json().catch(()=>({}));
  const id=data.rule?.id ?? data.id ?? null;
  say(res.ok()&&!!id, "알림 규칙 추가(API)", `status ${res.status()}`);
  if (id) {
    await p.reload({waitUntil:"networkidle"});
    say((await p.locator("main").innerText()).includes("점검용 규칙 "+t), "추가한 규칙이 화면에 보인다");
    const del=await p.request.delete(`${BO}/api/admin/notification-rules/${id}`);
    say(del.ok(), "알림 규칙 삭제(API·정리)", `status ${del.status()}`);
  }
}

// ── 공지 에디터 — 신기능 툴바(접기/캘린더/HTML 소스)가 실렸는지 + 편집 가능 확인 후 취소
await p.goto(`${BO}/admin/content?tab=notices`,{waitUntil:"networkidle"});
await p.locator('button:has-text("새 공지사항 등록")').first().click(); await p.waitForTimeout(1200);
const toolbar=(await p.locator("main").innerText()).replace(/\s+/g," ");
say(toolbar.includes("+ 접기/펼치기"), "공지 에디터 — 접기/펼치기 삽입");
say(toolbar.includes("+ 대관 캘린더"), "공지 에디터 — 대관 캘린더 삽입");
say(toolbar.includes("HTML 소스"), "공지 에디터 — HTML 소스 모드");
const editor=p.locator('[contenteditable="true"]').first();
await editor.click(); await editor.pressSequentially("에디터 입력 확인");
say((await editor.innerText()).includes("에디터 입력 확인"), "에디터 타이핑 반영");
await p.locator('button:has-text("취소")').first().click(); await p.waitForTimeout(800);

// ── 운영자 계정 — 마스터 권한 이관 UI 존재(실행은 안 함)
await p.goto(`${BO}/admin/users`,{waitUntil:"networkidle"});
const ub=(await p.locator("main").innerText()).replace(/\s+/g," ");
say(/이관|마스터/.test(ub), "운영자 계정 — 권한 이관 UI", (ub.match(/이관[^ ]*/)||[])[0]??"");

// ── 서명패드 — 위저드 최종 단계 캔버스
const w=await (await b.newContext({viewport:{width:1440,height:1200}})).newPage();
await w.goto(`${B}/login`,{waitUntil:"domcontentloaded"});
// U = 승인된 신청자 아이디(full-flow 가 만든 m로 시작하는 계정). 없으면 로그인부터 못 하니 미리 알린다.
if (!process.env.U) throw new Error("환경변수 U(승인된 신청자 아이디)가 필요하다 — 예: U=m397315 node e2e/features.spec.mjs");
const k=w.locator("input"); await k.nth(0).fill(process.env.U); await k.nth(1).fill("Test1234!");
await w.locator('button[type="submit"]').first().click(); await w.waitForTimeout(2000);
await w.goto(`${B}/apply?new=1`,{waitUntil:"domcontentloaded"}); await w.waitForTimeout(2500);
const wnext=async()=>{await w.locator('button:has-text("다음")').last().click(); await w.waitForTimeout(1400);};
const cells=w.locator('button:not([disabled])').filter({hasText:/^\d{1,2}$/});
await cells.nth(Math.floor(await cells.count()*0.6)).click(); await w.waitForTimeout(900);
await wnext();
await w.locator('button, [role=button], label').filter({hasText:/PACKAGE 1/}).first().click().catch(()=>{});
await w.waitForTimeout(800);
await wnext(); // → 기본 정보

// 기본 정보(필수 15+개) 범용 채움 — 빈 텍스트/전화/날짜 전부 채우고, 칩 그룹마다 첫 칩 선택.
// 개별 라벨에 묶으면 기획이 필드를 바꿀 때마다 스펙이 깨진다.
async function fillStep3() {
  await w.evaluate(() => {
    const set=(el,v)=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;s.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));};
    for (const el of document.querySelectorAll("main input")) {
      const t=(el.getAttribute("type")||"text").toLowerCase();
      if (t==="checkbox"||t==="radio"||t==="file") continue;
      if (el.value) continue;
      if (t==="date") set(el,"2026-12-01");
      else if (t==="number") set(el,"1");
      else if (/연락처|전화|phone/.test(el.placeholder||"")) set(el,"010-0000-0000");
      else set(el, t==="tel" ? "010-0000-0000" : "E2E 점검");
    }
    for (const ta of document.querySelectorAll("main textarea")) {
      if (!ta.value){const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value").set;s.call(ta,"E2E 점검");ta.dispatchEvent(new Event("input",{bubbles:true}));}
    }
  });
  // 칩 그룹(체크박스 label 묶음)마다 첫 칩 — 이미 선택된 그룹은 건너뜀
  const groups=await w.locator("main .flex.flex-wrap").filter({has:w.locator('input[type="checkbox"]')}).all();
  for (const g of groups) {
    const anyChecked=await g.locator('input[type="checkbox"]:checked').count();
    // "기타"는 상세 입력칸이 따로 열려(2026-08-28 기획 병합) 한 바퀴 더 돌아야 한다 — 기타가 아닌 첫 칩을 고른다.
    if (!anyChecked) {
      const plain = g.locator("label").filter({ hasNotText: "기타" }).first();
      if (await plain.count()) await plain.click().catch(()=>{});
      else await g.locator("label").first().click().catch(()=>{});
    }
  }
  // 남은 미체크 체크박스 전부 — 단독 동의류(마스킹 허용·확약서 작성 완료 등)가 계속 늘어난다
  await w.evaluate(() => {
    for (const cb of document.querySelectorAll('main input[type="checkbox"]')) {
      // "기타" 칩은 상세 입력칸을 요구한다 — 여기서 켜면 채울 기회가 없다.
      if (/기타/.test(cb.closest("label")?.textContent || "")) continue;
      if (!cb.checked) cb.closest("label")?.click();
    }
    // 라디오 그룹 — 그룹에 선택이 없으면 첫 항목("동의" 우선)을 고른다
    const byName = {};
    for (const r of document.querySelectorAll('main input[type="radio"]')) {
      (byName[r.name || r.closest("fieldset")?.id || "_"] ||= []).push(r);
    }
    for (const group of Object.values(byName)) {
      if (group.some((r) => r.checked)) continue;
      const prefer = group.find((r) => /동의/.test(r.closest("label")?.textContent || "")) || group[0];
      const wrap = prefer.closest("label");
      if (wrap) wrap.click(); else prefer.click();
    }
  });
  // 셀렉트가 있으면 두 번째 옵션
  for (const sel of await w.locator("main select").all()) {
    await sel.selectOption({index:1}).catch(()=>{});
  }
}
for (let s2=0;s2<8;s2++){
  if (await w.locator("canvas").count()) break;
  await fillStep3();
  // 홍보 노출 동의 — 버튼 토글(체크박스 아님)
  await w.locator('main button:has-text("동의")').filter({hasNotText:"비동의"}).first().click().catch(()=>{});
  await wnext();
  const toast=(await w.locator('[data-testid="toast"]').first().innerText().catch(()=>"")).replace(/\s+/g," ");
  if (toast) console.log("  진행 토스트:", toast.slice(0,44));
  await w.locator('[data-testid="toast"]').first().waitFor({state:"detached",timeout:6000}).catch(()=>{});
}
console.log("  캔버스 발견 시점:", await w.locator('[aria-current="step"], [data-testid="wizard-step-title"], main h2').first().innerText().catch(()=>"?"), "| canvas 수:", await w.locator("canvas").count());
const canvas=w.locator("canvas").first();
if (await canvas.count()) {
  // 마우스 좌표는 뷰포트 기준이다 — 서명란이 화면 아래(폴드 밖)에 있으면 이벤트가 캔버스에 닿지 않는다.
  await canvas.scrollIntoViewIfNeeded(); await w.waitForTimeout(300);
  const box=await canvas.boundingBox();
  await w.mouse.move(box.x+30, box.y+30);
  await w.mouse.down(); await w.mouse.move(box.x+150, box.y+60, {steps:8}); await w.mouse.up();
  const drawn=await canvas.evaluate(c=>{const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data; for(let i=3;i<d.length;i+=4){if(d[i]>0) return true;} return false;});
  say(drawn, "안전 서약 서명패드 — 캔버스에 실제로 그려진다");
} else say(false, "서명패드 캔버스를 찾지 못함");
await w.close();
}catch(e){ say(false,"예외",String(e).split("\n")[0].slice(0,90)); }
console.log("콘솔 오류:", errs.length? [...new Set(errs)].slice(0,3).join(" | ") : "없음");
console.log(`합계 ${out.length}건 · 통과 ${out.filter(Boolean).length} · 실패 ${out.filter(x=>!x).length}`);
await b.close();
