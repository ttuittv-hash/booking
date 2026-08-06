import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const [,, theme, user, pass, ...pages] = process.argv;
const ctx = await b.newContext({ viewport: { width: 1512, height: 950 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:3100/');
await p.evaluate((t)=>localStorage.setItem('sa-theme',t), theme);
if (user !== '-') {
  await p.goto('http://127.0.0.1:3100/login', { waitUntil: 'networkidle' });
  await p.fill('input[type="text"]', user).catch(()=>{});
  await p.fill('input[type="password"]', pass);
  await Promise.all([p.waitForLoadState('networkidle'), p.click('button[type="submit"], form button')]);
  await p.waitForTimeout(2000);
}
for (const spec of pages) {
  const [path, out] = spec.split('=');
  await p.goto('http://127.0.0.1:3100' + path, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1400);
  await p.screenshot({ path: out, fullPage: true });
  console.log('ok', path);
}
await b.close();
