// 팝업 대화상자·bo 로그인 "메인으로" 링크 확인 — 스크린샷을 남긴다.
import { chromium } from "@playwright/test";
const BO = "https://bo.dev.seoularena.net"; const OUT = process.env.OUT || ".";
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await p.goto(`${BO}/login`, { waitUntil: "networkidle" });
console.log("메인으로 href:", await p.locator('a:has-text("메인으로")').getAttribute("href"));
const i = p.locator("input"); await i.nth(0).fill("admin"); await i.nth(1).fill("Dkfpsk123!");
await p.locator('button[type="submit"]').first().click(); await p.waitForURL(/\/admin/, { timeout: 20000 });
await p.goto(`${BO}/admin/applicants?tab=decided`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
let nativeDialog = false; p.on("dialog", async (d) => { nativeDialog = true; await d.dismiss(); });
await p.locator('button:has-text("삭제")').first().click(); await p.waitForTimeout(600);
const dlg = p.locator('[data-testid="dialog"]');
console.log("팝업 표시:", await dlg.isVisible(), "| 브라우저 기본 대화상자:", nativeDialog);
console.log("팝업 내용:", (await dlg.innerText()).replace(/\s+/g, " ").slice(0, 160));
await p.screenshot({ path: `${OUT}/dialog-confirm.png` });
await p.locator('[data-testid="dialog-cancel"]').click(); await p.waitForTimeout(300);
console.log("취소 후 닫힘:", !(await dlg.isVisible()));
// 반려 prompt(승인 대기 탭)
await p.goto(`${BO}/admin/applicants`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
const reject = p.locator('button:has-text("거절")').first();
if (await reject.count()) {
  await reject.click(); await p.waitForTimeout(500);
  console.log("입력 팝업:", await p.locator('[data-testid="dialog-input"]').isVisible());
  await p.screenshot({ path: `${OUT}/dialog-prompt.png` });
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  console.log("Esc 후 닫힘:", !(await dlg.isVisible()));
} else console.log("승인 대기 건 없음 — prompt 생략");
await b.close();
