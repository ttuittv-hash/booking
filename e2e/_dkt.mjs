// DKT CBT 유저웹 — 발신번호·템플릿 등록 상태 확인 (읽기만)
import { chromium } from "@playwright/test";
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
await p.goto("https://cbt-web.dktechinmsg.com/user/login",{waitUntil:"networkidle",timeout:30000});
console.log("로그인 화면:", (await p.locator("body").innerText()).replace(/\s+/g," ").slice(0,80));
const inputs=p.locator("input");
console.log("입력칸:", await inputs.count());
await inputs.nth(0).fill("cbt001.arena@kakaocorp.com");
await inputs.nth(1).fill("CTSELARNA0");
await p.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")').first().click();
await p.waitForTimeout(4000);
console.log("로그인 후 URL:", p.url());
console.log("본문:", (await p.locator("body").innerText()).replace(/\s+/g," ").slice(0,300));
await p.screenshot({path:process.env.OUT+"/dkt-home.png"});
await b.close();
