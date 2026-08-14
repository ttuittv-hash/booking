import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const shot = async (path, name, full = true) => {
  await p.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `/tmp/shots/${name}.png`, fullPage: full });
  console.log('shot', name);
};
// 공개 페이지
for (const [path, name] of [['/', 'home'], ['/venue/specs', 'venue-specs'], ['/notices', 'notices'], ['/login', 'login'], ['/register', 'register'], ['/apply', 'apply']]) {
  await shot(path, name);
}
// 운영자 로그인
await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/shots/admin-login.png', fullPage: true });
const txt = await p.locator('body').innerText();
console.log('ADMIN_LOGIN_TEXT', txt.slice(0, 400));
await b.close();
