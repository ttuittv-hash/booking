import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' });
await p.getByLabel('아이디').fill('admin');
await p.getByLabel('비밀번호').fill('admin1234!');
await p.getByRole('button', { name: '로그인', exact: true }).click();
await p.waitForLoadState('networkidle');
await p.waitForTimeout(1000);
console.log('URL', p.url());
for (const [path, name] of [['/admin', 'admin-dashboard'], ['/admin/applicants', 'admin-applicants'], ['/admin/inquiries', 'admin-inquiries'], ['/admin/feature-spec', 'admin-feature-spec']]) {
  await p.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `/tmp/shots/${name}.png`, fullPage: true });
  console.log('shot', name, p.url());
}
await b.close();
