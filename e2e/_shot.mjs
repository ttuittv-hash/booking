import { chromium } from "@playwright/test";
const B="https://partner.dev.seoularena.net", OUT=process.env.OUT;
const b=await chromium.launch();
const jobs=[
 ["/rates", 390, "rates-mobile"], ["/rates", 1440, "rates-desktop"],
 ["/mypage/profile", 390, "profile-mobile"],
 ["/faq", 390, "faq-mobile"],
 ["/terms", 390, "terms-mobile"],
];
for (const [route,w,name] of jobs){
  const ctx=await b.newContext({viewport:{width:w,height:900}});
  const p=await ctx.newPage();
  await p.goto(`${B}/login`,{waitUntil:"domcontentloaded"});
  const i=p.locator("input"); await i.nth(0).fill(process.env.U); await i.nth(1).fill("Test1234!");
  await p.locator('button[type="submit"]').first().click();
  await p.waitForURL(u=>!u.toString().includes("/login"),{timeout:20000}).catch(()=>{});
  await p.goto(B+route,{waitUntil:"networkidle"});
  await p.screenshot({path:`${OUT}/${name}.png`, fullPage:false});
  await ctx.close();
  console.log(name);
}
await b.close();
