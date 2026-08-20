// 인터랙션 점검 — 메뉴·폼 검증·토스트·관리자 화면
import { chromium } from "@playwright/test";
const B="https://partner.dev.seoularena.net", BO="https://bo.dev.seoularena.net";
const out=[]; const say=(ok,label,detail="")=>{out.push(ok);console.log(`${ok?"OK  ":"NG  "} ${label}${detail?"  — "+detail:""}`)};
const b=await chromium.launch();
const login=async(p,u,pw)=>{await p.goto(`${B}/login`,{waitUntil:"domcontentloaded"});const i=p.locator("input");await i.nth(0).fill(u);await i.nth(1).fill(pw);await p.locator('button[type="submit"]').first().click();await p.waitForURL(x=>!x.toString().includes("/login"),{timeout:20000}).catch(()=>{})};

// ── 1. 메가메뉴 (데스크톱)
{
  const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  await login(p, process.env.U, "Test1234!");
  await p.goto(B+"/",{waitUntil:"networkidle"});
  const cats=["Your Stage","Book It","Know It","Host It"];
  for (const c of cats){
    const trigger=p.getByRole("button",{name:c}).or(p.locator(`text="${c}"`).first());
    await trigger.first().hover().catch(()=>{});
    await p.waitForTimeout(400);
    const visible=await p.locator("a[href='/seoularena'], a[href='/guide'], a[href='/notices'], a[href='/apply']").first().isVisible().catch(()=>false);
    say(visible, `메가메뉴 「${c}」 hover 시 하위 노출`);
  }
  // 메뉴 안 링크 전부 이동되는지
  const hrefs=await p.$$eval("header a[href^='/']", as=>[...new Set(as.map(a=>a.getAttribute("href")))]);
  let dead=[];
  for (const h of hrefs){ const r=await p.request.get(B+h); if(r.status()>=400) dead.push(`${h}:${r.status()}`); }
  say(dead.length===0, `헤더 링크 ${hrefs.length}개 전부 살아있다`, dead.join(","));
}

// ── 2. 1:1 문의 작성 — 검증 + 저장
{
  const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await login(p, process.env.U, "Test1234!");
  await p.goto(B+"/mypage/inquiries/new",{waitUntil:"networkidle"});
  const submit=p.locator('button[type="submit"]').first();
  await submit.click(); await p.waitForTimeout(1200);
  const toast=await p.locator('[data-testid="toast"]').first().innerText().catch(()=>"");
  const stayed=p.url().includes("/inquiries/new");
  say(stayed, "빈 문의는 저장되지 않는다", toast.replace(/\s+/g," ").slice(0,40));
  const t=String(Date.now()).slice(-6);
  await p.locator("input[name=title], input[type=text]").first().fill("UI 점검 문의 "+t);
  await p.locator("textarea").first().fill("본문 확인용입니다.");
  await submit.click(); await p.waitForTimeout(2500);
  say(!p.url().includes("/new"), "문의가 저장되고 목록으로 간다", p.url().replace(B,""));
}

// ── 3. 로그인 검증 토스트
{
  const p=await (await b.newContext()).newPage();
  await p.goto(`${B}/login`,{waitUntil:"domcontentloaded"});
  const i=p.locator("input"); await i.nth(0).fill("nobody999"); await i.nth(1).fill("Wrong1234!");
  await p.locator('button[type="submit"]').first().click(); await p.waitForTimeout(2000);
  const msg=await p.locator('[data-testid="toast"], [role=alert]').first().innerText().catch(()=>"");
  say(!!msg.trim(), "틀린 로그인은 사유를 알려준다", msg.replace(/\s+/g," ").slice(0,45));
}

// ── 4. 관리자 화면
{
  const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  await p.goto(`${BO}/login`,{waitUntil:"domcontentloaded"});
  const i=p.locator("input"); await i.nth(0).fill("admin"); await i.nth(1).fill("Dkfpsk123!");
  await p.locator('button[type="submit"]').first().click();
  await p.waitForURL(/\/admin/,{timeout:20000});
  for (const [route,label] of [["/admin","대시보드"],["/admin/applicants","회원 관리"],["/admin/quotes","대관 신청"],["/admin/content","콘텐츠"],["/admin/rates","요금"],["/admin/notices","공지"],["/admin/users","운영자"]]) {
    const r=await p.goto(BO+route,{waitUntil:"domcontentloaded"});
    say(r.status()<400 && new URL(p.url()).pathname===route, `${label} ${route}`, `status ${r.status()} → ${new URL(p.url()).pathname}`);
  }
  // 탭 3종
  await p.goto(BO+"/admin/applicants",{waitUntil:"networkidle"});
  for (const tab of ["승인 대기","처리 완료","회사별 담당자"]) {
    const el=p.locator(`a:has-text("${tab}"), button:has-text("${tab}")`).first();
    const exists=await el.count()>0;
    if (exists){ await el.click(); await p.waitForTimeout(1200); }
    say(exists, `회원관리 탭 「${tab}」`, exists? new URL(p.url()).search : "탭 없음");
  }
}
await b.close();
console.log(`\n합계 ${out.length}건 · 통과 ${out.filter(Boolean).length} · 실패 ${out.filter(x=>!x).length}`);
