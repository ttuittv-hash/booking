import { chromium } from "@playwright/test";
const B="https://partner.dev.seoularena.net";
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const errs=[];
p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.goto(`${B}/login`,{waitUntil:"domcontentloaded"});
const i=p.locator("input"); await i.nth(0).fill(process.env.U); await i.nth(1).fill("Test1234!");
await p.locator('button[type="submit"]').first().click();
await p.waitForURL(x=>!x.toString().includes("/login"),{timeout:20000});
await p.goto(`${B}/apply?new=1`,{waitUntil:"domcontentloaded"}); await p.waitForTimeout(2000);
const text=async()=> (await p.locator("main").innerText().catch(()=>"(본문 없음)")).replace(/\s+/g," ");
console.log("STEP1 선택지:", (await text()).slice(0,150));
// 동시 대관 선택지가 있으면 그걸 고른다
const dongsi=p.locator('button, label').filter({hasText:/동시/}).first();
if (await dongsi.count()) { await dongsi.click(); console.log("→ 동시 대관 선택"); }
else { await p.locator('button, label').filter({hasText:/아레나/}).first().click(); console.log("→ 아레나 선택"); }
await p.waitForTimeout(800);
await p.locator('button:has-text("다음")').last().click(); await p.waitForTimeout(1500);
// 달력에서 하루 선택
const cells=p.locator('button:not([disabled])').filter({hasText:/^\d{1,2}$/});
await cells.nth(Math.floor(await cells.count()*0.6)).click(); await p.waitForTimeout(1200);
await p.locator('button:has-text("다음")').last().click(); await p.waitForTimeout(1500);
console.log("STEP3 도달:", (await text()).slice(0,80));
// 스텝 바에서 04 기본 정보 클릭
const step4=p.locator('button, a, li').filter({hasText:/04 기본 정보|기본 정보/}).first();
await step4.click().catch(e=>console.log("클릭 오류:", String(e).slice(0,80)));
await p.waitForTimeout(1500);
console.log("클릭 후 본문:", (await text()).slice(0,100));
console.log("페이지 오류:", errs.length? errs.join("\n") : "없음");
await b.close();
