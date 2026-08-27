// 운영자 [삭제] 버튼으로 계정을 지운다 — EMAIL=대상 이메일 node e2e/_delete-user.mjs
import { chromium } from "@playwright/test";
const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const EMAIL = process.env.EMAIL;
if (!EMAIL) throw new Error("EMAIL 필요");
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const dialogs = [];
p.on("dialog", async (d) => { dialogs.push(`${d.type()}: ${d.message().split("\n")[0]}`); await d.accept(); });
await p.goto(`${BO}/login`, { waitUntil: "domcontentloaded" });
const i = p.locator("input"); await i.nth(0).fill("admin"); await i.nth(1).fill(process.env.ADMIN_PW || "Dkfpsk123!");
await p.locator('button[type="submit"]').first().click(); await p.waitForURL(/\/admin/, { timeout: 20000 });
await p.goto(`${BO}/admin/applicants?tab=decided`, { waitUntil: "domcontentloaded" });
const row = p.locator("tr", { hasText: EMAIL }).first();
await row.waitFor({ timeout: 20000 });
await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500); // 하이드레이션 전에 누르면 핸들러가 없다
console.log("행:", (await row.innerText()).replace(/\s+/g, " "));
await row.getByRole("button", { name: "삭제" }).click();
await p.waitForTimeout(3000);
console.log("대화상자:", dialogs);
await p.reload({ waitUntil: "domcontentloaded" });
console.log("삭제 후 남은 행:", await p.locator("tr", { hasText: EMAIL }).count());
await b.close();
