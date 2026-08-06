import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1512, height: 950 } });
const p = await ctx.newPage();
const [,, mode, ...pages] = process.argv;
if (mode === 'dark') { await p.goto('http://127.0.0.1:3100/'); await p.evaluate(()=>{localStorage.setItem('sa-theme','dark')}); }
for (const spec of pages) {
  const [path, out, action] = spec.split('=');
  await p.goto('http://127.0.0.1:3100' + path, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1200);
  if (action === 'menu') { await p.click('button[aria-label="메뉴 열기"]'); await p.waitForTimeout(600); }
  if (action === 'hover') { const el = await p.$('a:has-text("세계 최고 수준의")'); if (el) await el.hover(); await p.waitForTimeout(600); }
  await p.screenshot({ path: out, fullPage: action ? false : true });
  console.log('ok', path, action ?? '');
}
await b.close();
