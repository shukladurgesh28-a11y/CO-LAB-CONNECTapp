import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [email, url] of [
  ['customer@demo.com', '/customer/dashboard'],
  ['worker@demo.com', '/worker/dashboard'],
  ['coop@demo.com', '/cooperative'],
  ['admin@collabconnect.local', '/admin'],
]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', 'CoLab!Demo2026');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(2500);
  console.log(`${email} -> ${p.url()} (expect ${url})`);
  if (email === 'coop@demo.com') {
    const has = await p.evaluate(() => document.body.innerText.includes('Co-Op & Society Operations'));
    console.log('  Coop header:', has);
    for (const t of ['Requests', 'Worker Allocation', 'Workers', 'Societies', 'Services', 'Payments']) {
      const v = await p.evaluate((tt) => document.body.innerText.includes(tt), t);
      console.log(`  tab ${t}:`, v);
    }
    // verify customer/worker not polluted
    const bad = await p.evaluate(() => document.body.innerText.includes('Customer Space') || document.body.innerText.includes('Worker Space'));
    console.log('  no customer/worker pollution:', !bad);
    // open request detail drawer
    const viewBtn = p.locator('button:has-text("View Request")').first();
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await p.waitForTimeout(800);
      const ai = await p.evaluate(() => document.body.innerText.includes('AI recommends'));
      console.log('  AI matching visible after View Request:', ai);
    }
  }
  console.log('  errs:', errs.slice(0, 2));
  await ctx.close();
}
await b.close();
console.log('QA DONE');
