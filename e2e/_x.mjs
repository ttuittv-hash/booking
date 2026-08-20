import { chromium } from "@playwright/test";
const B="https://partner.dev.seoularena.net";
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1440,height:960}})).newPage();
await p.goto(`${B}/register`,{waitUntil:"domcontentloaded"});
await p.click('[data-testid="pick-corporate"]');
await p.check('[data-testid="agree-SERVICE"]'); await p.check('[data-testid="agree-PRIVACY_REQUIRED"]');
await p.click('[data-testid="terms-next"]');
await p.click('[data-testid="identity-bypass"]');
await p.waitForSelector('[data-testid="step-info"]',{timeout:25000});

const gone=async()=>{ await p.locator('[data-testid="toast"]').first().waitFor({state:"detached",timeout:9000}).catch(()=>{}); };
// 등록된 회사로 확인되면 칸이 잠긴다 — [회사정보 불러오기]를 눌러 푼 뒤 다음 케이스로 간다.
const unlock=async()=>{
  if (await p.locator('[data-testid="f-brn"]').getAttribute("readonly") === null) return;
  await p.click('[data-testid="open-company-search"]');
  await p.waitForTimeout(600);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
};
const press=async(brn,label)=>{
  await gone(); await unlock();
  await p.fill('[data-testid="f-brn"]', brn);
  await p.click('[data-testid="verify-brn"]');
  const t=p.locator('[data-testid="toast"]').first();
  const shown=await t.waitFor({state:"visible",timeout:15000}).then(()=>true).catch(()=>false);
  const text=shown ? (await t.innerText()).replace(/\s+/g," ").replace(/[!✕✓i]/g,"").trim() : "(토스트 없음)";
  const tone=shown ? await t.getAttribute("data-tone") : "-";
  const inline=(await p.locator('[data-testid="brn-check-message"]').innerText().catch(()=>"")).replace(/\s+/g," ");
  console.log(`${label}`);
  console.log(`   토스트[${tone}] ${text}`);
  console.log(`   화면문구  ${inline}`);
  return shown;
};

const r1=await press("1018116511", "① 스크린샷과 같은 번호 (조회 안 되는 번호)");
if (r1) await p.screenshot({path:`${process.env.OUT}/toast-fail.png`});
await press("1018116510", "② 이미 등록된 회사");
await press("1208147521", "③ 실제 존재하는 번호 (카카오)");
await gone();
await press("123", "④ 자릿수 부족 (클라이언트 검증)");
await b.close();
