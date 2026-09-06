import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const B = "http://localhost:3000";

try {
  await page.goto(`${B}/admin/login`, { waitUntil: "networkidle" });
  await page.getByLabel("아이디").fill("admin");
  await page.getByLabel("비밀번호").fill("admin1234!");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }),
    page.getByRole("button", { name: "로그인" }).click(),
  ]);
  console.log("admin login OK:", page.url());

  await page.goto(`${B}/admin/content`, { waitUntil: "networkidle" });
  await page.getByText("화면 문구", { exact: true }).first().click();
  await page.waitForTimeout(800);

  const slotOrderSection = page.getByText("위저드 슬롯 순서", { exact: false }).first();
  console.log("슬롯 순서 section found:", await slotOrderSection.count());

  const publicInterestSection = page.getByText("공공/공익 참여 항목", { exact: false }).first();
  console.log("공공/공익 참여 항목 section found:", await publicInterestSection.count());

  const stepNavSection = page.getByText("위저드 단계 메뉴 이름", { exact: false }).first();
  console.log("위저드 단계 메뉴 이름 section found:", await stepNavSection.count());

  await page.screenshot({ path: "/tmp/full-content-page.png", fullPage: true });

  console.log("TEST COMPLETE");
} catch (err) {
  console.error("TEST FAILED:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
