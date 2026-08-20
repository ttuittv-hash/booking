// 라우트별 응답 시간만 잰다 — 알림톡이 닿지 않을 때 화면이 얼마나 붙잡히는지.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const B="https://partner.dev.seoularena.net", BO="https://bo.dev.seoularena.net";
const STUB=fs.readFileSync("/tmp/arena-dev-stub.env","utf8").trim().split("=")[1];
const b=await chromium.launch();
const ctx=await b.newContext(); await ctx.setExtraHTTPHeaders({"x-dev-stub":STUB});
const p=await ctx.newPage();
const timings=[];
p.on("response", async r=>{
  const u=r.url();
  if(!/\/api\/(auth\/register|admin\/applicants)/.test(u)) return;
  const t=r.request().timing();
  timings.push(`${u.replace(B,"").replace(BO,"")}  ${((t.responseEnd-t.requestStart)/1000).toFixed(1)}초  ${r.status()}`);
});
const t=String(Date.now()).slice(-6);
await p.goto(`${B}/register`,{waitUntil:"domcontentloaded"});
await p.click('[data-testid="pick-corporate"]');
await p.check('[data-testid="agree-SERVICE"]'); await p.check('[data-testid="agree-PRIVACY_REQUIRED"]');
await p.click('[data-testid="terms-next"]');
await p.click('[data-testid="identity-start"]');
await p.waitForSelector('[data-testid="step-info"]',{timeout:20000});
await p.fill('[data-testid="f-companyName"]',"카카오");
await p.fill('[data-testid="f-brn"]',"120-81-47521");
await p.fill('[data-testid="f-representativeName"]',"정신아");
await p.click('[data-testid="verify-brn"]');
await p.waitForSelector('[data-testid="brn-check-message"]',{timeout:25000});
for (const [sel,v] of [['[data-testid="f-postalCode"]',"13529"],['[data-testid="f-address"]',"경기도 성남시 분당구 판교역로 166"]]) {
  if (await p.locator(sel).getAttribute("readonly") === null) await p.fill(sel,v);
}
await p.fill('[data-testid="f-username"]',"lat"+t);
await p.fill('[data-testid="f-email"]',`lat${t}@seoul-ent.co.kr`);
await p.fill('[data-testid="f-password"]',"Test1234!");
await p.fill('[data-testid="f-passwordConfirm"]',"Test1234!");
await p.click('[data-testid="check-username"]');
await p.waitForSelector('[data-testid="id-check-message"]',{timeout:20000});
const t0=Date.now();
await p.click('[data-testid="submit-register"]');
await p.waitForSelector('[data-testid="step-done"]',{timeout:120000});
console.log(`가입 제출 → 완료 화면: ${((Date.now()-t0)/1000).toFixed(1)}초`);
for (const x of timings) console.log("  " + x);
await b.close();
