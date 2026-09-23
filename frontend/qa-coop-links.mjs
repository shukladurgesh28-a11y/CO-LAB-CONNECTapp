import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await p.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await p.fill('input[name="email"]', 'coop@demo.com');
await p.fill('input[name="password"]', 'CoLab!Demo2026');
await p.click('button[type="submit"]');
await p.waitForTimeout(2500);
console.log('coop url', p.url());
const links = [
  '/cooperative',
  '/cooperative/requests',
  '/cooperative/allocations',
  '/cooperative/workers',
  '/cooperative/workforce',
  '/cooperative/services',
  '/cooperative/payments',
  '/cooperative/welfare',
  '/cooperative/earnings',
  '/cooperative/ratings',
  '/cooperative/notifications',
  '/cooperative/analytics',
];
for (const href of links) {
  await p.goto('http://localhost:5173' + href, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  const bodyLen = await p.evaluate(() => document.body.innerText.length);
  const hasError = await p.evaluate(() => document.body.innerText.includes('Something went wrong') || document.body.innerText.includes('Failed to load'));
  const url = p.url();
  console.log(`${href} -> ${url} bodyLen:${bodyLen} error:${hasError} ${bodyLen<200?'WHITE?':''}`);
}
// also test customer and worker not polluted
for (const [email, expect] of [['customer@demo.com','/customer/dashboard'],['worker@demo.com','/worker/dashboard']]) {
  const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await c2.newPage();
  await p2.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await p2.fill('input[name="email"]', email);
  await p2.fill('input[name="password"]', 'CoLab!Demo2026');
  await p2.click('button[type="submit"]');
  await p2.waitForTimeout(2500);
  console.log(`${email} -> ${p2.url()} expect ${expect}`);
  await c2.close();
}
await b.close();
console.log('QA DONE');
