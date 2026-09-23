import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });

async function testViewport(vp, label) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  page.on('pageerror', e=> errs.push('PAGEERR '+e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  console.log(`\n=== ${label} ${vp.width}x${vp.height} ===`);
  // check hero headline not clipped
  const heroWrap = await page.evaluate(()=>{
    const h1 = document.querySelector('h1');
    const r = h1.getBoundingClientRect();
    return { w:Math.round(r.width), win:window.innerWidth, overflow: r.right > window.innerWidth+2 };
  });
  console.log('Hero wrap overflow:', heroWrap.overflow, heroWrap);

  // hover primary CTA
  const primary = page.locator('button:has-text("Get Started")').first();
  await primary.hover();
  await page.waitForTimeout(300);
  const hoverStyle = await primary.evaluate(el=> getComputedStyle(el).transform);
  console.log('Primary hover transform:', hoverStyle.slice(0,60));

  // press
  await primary.evaluate(el=> el.dispatchEvent(new MouseEvent('mousedown', { bubbles:true })));
  await page.waitForTimeout(150);
  const pressStyle = await primary.evaluate(el=> getComputedStyle(el).transform);
  console.log('Primary press transform:', pressStyle.slice(0,60));
  await primary.evaluate(el=> el.dispatchEvent(new MouseEvent('mouseup', { bubbles:true })));

  // service card hover
  const svc = page.locator('#services button').first();
  await svc.hover();
  await page.waitForTimeout(400);
  const svcHover = await svc.evaluate(el=> getComputedStyle(el).transform);
  console.log('Service hover transform:', svcHover.slice(0,60));

  // scroll through to test reveals and connector
  for (let y=0; y<5000; y+=400) {
    await page.evaluate(y=>window.scrollTo(0,y), y);
    await page.waitForTimeout(150);
  }
  // check connector line exists
  const connector = await page.evaluate(()=> {
    const el = document.querySelector('[class*="left-\\[18px\\]"]');
    return !!el;
  });
  console.log('How-it-works connector exists:', connector);

  // test navbar links
  const links = ['How It Works','Services','For Cooperatives','Trust'];
  for (const txt of links) {
    const a = page.locator(`a:has-text("${txt}")`).first();
    const visible = await a.isVisible().catch(()=>false);
    console.log(`Link "${txt}" visible:`, visible);
    if (visible) {
      await a.click();
      await page.waitForTimeout(500);
      const hash = await page.evaluate(()=> location.hash);
      console.log(`  clicked -> hash ${hash}`);
    }
  }

  // test Get Started navigation (should go to /register, but we intercept)
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const getStarted = page.locator('button:has-text("Get Started")').first();
  // check it has correct onClick navigation - we can evaluate its behavior by clicking and checking URL change
  // Instead, check that clicking doesn't cause console error and triggers navigation
  const navPromise = page.waitForURL('**/register', { timeout: 3000 }).catch(()=>null);
  await getStarted.click();
  const urlAfter = await page.url();
  console.log('After Get Started click URL:', urlAfter, ' (expected /register)');

  // test Login
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const loginBtn = page.locator('button:has-text("Login")').first();
  await loginBtn.click();
  await page.waitForTimeout(800);
  console.log('After Login click URL:', await page.url());

  // check for horizontal overflow after all interactions
  const overflow = await page.evaluate(()=> ({ docW: document.documentElement.scrollWidth, win: window.innerWidth, hasH: document.documentElement.scrollWidth > window.innerWidth+1 }));
  console.log('Final overflow:', overflow);
  console.log('Console/page errors:', errs.slice(0,3));

  // mobile drawer test if mobile
  if (vp.width < 768) {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const menu = page.locator('button[aria-label="Menu"]');
    const vis = await menu.isVisible();
    console.log('Mobile menu visible:', vis);
    if (vis) {
      await menu.click();
      await page.waitForTimeout(400);
      const drawerLinks = await page.locator('a:has-text("How It Works")').count();
      console.log('Drawer links count after open:', drawerLinks);
      await page.screenshot({ path: `qa-drawer-${vp.width}.png` });
      console.log('Drawer screenshot saved');
      await menu.click();
      await page.waitForTimeout(300);
    }
  }

  await ctx.close();
}

await testViewport({width:1280,height:800}, 'desktop-1280');
await testViewport({width:375,height:812}, 'mobile-375');
await testViewport({width:768,height:1024}, 'tablet-768');
await testViewport({width:1440,height:900}, 'desktop-1440');

await browser.close();
console.log('\n=== ALL INTERACTION TESTS DONE ===');
