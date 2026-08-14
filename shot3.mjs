import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/notices?page=2', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `/tmp/shots/notices-p2-${w}.png`, fullPage: true });
  console.log('shot', w);
  await ctx.close();
}
await b.close();
