import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: '1440x900', w: 1440, h: 900 },
  { name: '1280x800', w: 1280, h: 800 },
  { name: '1024x768', w: 1024, h: 768 },
  { name: '768x1024', w: 768, h: 1024 },
  { name: '375x812', w: 375, h: 812 },
];

async function testCustomerDashboard() {
  console.log('=== CUSTOMER DASHBOARD QA ===');
  const browser = await chromium.launch({ headless: true });
  
  // Test desktop first for full flow
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const failedReqs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR:'+e.message));
  page.on('requestfailed', r => failedReqs.push(r.url() + ' ' + r.failure()?.errorText));

  console.log('1. Navigating to /login');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);
  console.log('  Login page loaded, title:', await page.title());

  console.log('2. Logging in as customer@demo.com');
  await page.fill('input[name="email"]', 'customer@demo.com');
  await page.fill('input[name="password"]', 'CoLab!Demo2026');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  const urlAfterLogin = page.url();
  console.log('  After login URL:', urlAfterLogin);
  if (!urlAfterLogin.includes('/customer/dashboard')) {
    console.log('  WARN: Not on customer dashboard, trying manual navigate');
    await page.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log('  After manual nav:', page.url());
  }

  console.log('3. Checking dashboard content');
  await page.waitForTimeout(1500);
  const heroTitle = await page.locator('h1').first().textContent().catch(()=>null);
  console.log('  Hero h1:', heroTitle?.slice(0,60));
  const welcome = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.innerText.slice(0,80) : null;
  });
  console.log('  Welcome text:', welcome);

  // Check user name displayed (should be real user, not hardcoded)
  const userDisplay = await page.evaluate(() => {
    const nameEl = document.querySelector('[class*="truncate"]');
    return document.body.innerText.includes('Welcome back') ? 'found welcome' : 'no welcome';
  });
  console.log('  User display check:', userDisplay);

  // Check services
  console.log('4. Checking Our Services');
  const servicesText = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(e=>e.textContent.includes('Our Services'));
    return h2 ? 'found Our Services' : 'not found';
  });
  console.log('  Services section:', servicesText);
  const serviceCards = await page.locator('section:has-text("Our Services") button').count().catch(()=>0);
  console.log('  Service cards count:', serviceCards);

  // Check My Bookings
  console.log('5. Checking My Bookings');
  const bookingsSection = await page.evaluate(() => {
    const el = [...document.querySelectorAll('h3')].find(e=>e.textContent.includes('My Bookings'));
    return el ? 'found' : 'not found';
  });
  console.log('  My Bookings section:', bookingsSection);
  const bookingsEmpty = await page.locator('text=No bookings yet').count();
  console.log('  Empty bookings state visible:', bookingsEmpty>0);
  const bookingsCards = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s=>s.textContent.includes('My Bookings'));
    return sec ? sec.innerHTML.slice(0,200) : 'no sec';
  });
  console.log('  Bookings HTML snippet:', bookingsCards.slice(0,120));

  // Check Service Requests
  console.log('6. Checking Service Requests');
  const reqSection = await page.evaluate(() => {
    const el = [...document.querySelectorAll('h3')].find(e=>e.textContent.includes('Service Requests'));
    return el ? 'found' : 'not found';
  });
  console.log('  Service Requests section:', reqSection);

  // Check Quick Actions
  console.log('7. Checking Quick Actions');
  const quickActions = await page.evaluate(() => {
    const el = [...document.querySelectorAll('h3')].find(e=>e.textContent.includes('Quick Actions'));
    return el ? 'found' : 'not found';
  });
  console.log('  Quick Actions:', quickActions);
  const qaButtons = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s=>s.textContent.includes('Quick Actions'));
    return sec ? sec.querySelectorAll('button').length : 0;
  });
  console.log('  Quick Actions buttons:', qaButtons);

  // Check Support card
  console.log('8. Checking Support card');
  const supportCard = await page.evaluate(() => {
    const el = [...document.querySelectorAll('h3')].find(e=>e.textContent.includes('Fair Work'));
    return el ? 'found' : 'not found';
  });
  console.log('  Support card:', supportCard);

  // Check trust indicators
  console.log('9. Checking Trust indicators');
  const trust = await page.evaluate(() => {
    return document.body.innerText.includes('Verified Workers') ? 'found' : 'not found';
  });
  console.log('  Trust indicators:', trust);

  // Test sidebar navigation
  console.log('10. Testing sidebar navigation');
  const sidebarLinks = [
    { label: 'Dashboard', href: '/customer/dashboard' },
    { label: 'Services', href: '/customer/services' },
    { label: 'My Requests', href: '/customer/request' },
    { label: 'Bookings', href: '/customer/bookings' },
    { label: 'Wallet', href: '/customer/history' },
    { label: 'Profile', href: '/customer/profile' },
  ];
  for (const link of sidebarLinks) {
    const el = page.locator(`a[href="${link.href}"]`).first();
    const visible = await el.isVisible().catch(()=>false);
    console.log(`  Sidebar ${link.label} (${link.href}) visible:`, visible);
    if (visible) {
      await el.click();
      await page.waitForTimeout(800);
      console.log(`    -> navigated to ${page.url()}`);
      await page.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
    }
  }

  // Test header search
  console.log('11. Testing header search (customer only)');
  const searchInput = page.locator('input[placeholder*="Search services"]');
  const searchVisible = await searchInput.isVisible().catch(()=>false);
  console.log('  Header search visible (desktop):', searchVisible);
  if (searchVisible) {
    await searchInput.fill('electrician');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    console.log('  After search URL:', page.url());
    await page.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
  }

  // Test Quick Actions clicks
  console.log('12. Testing Quick Actions clicks');
  const qaMap = [
    { text: 'Request Service', expect: '/customer/request' },
    { text: 'Track Booking', expect: '/customer/bookings' },
    { text: 'View Wallet', expect: '/customer/history' },
  ];
  for (const qa of qaMap) {
    const btn = page.locator(`button:has-text("${qa.text}")`).first();
    const vis = await btn.isVisible().catch(()=>false);
    console.log(`  QA "${qa.text}" visible:`, vis);
    if (vis) {
      await btn.click();
      await page.waitForTimeout(800);
      console.log(`    -> URL ${page.url()} (expect ${qa.expect})`);
      await page.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
    }
  }

  // Check for white screen / error states
  console.log('13. Checking for white screen / errors');
  const bodyText = await page.evaluate(() => document.body.innerText.length);
  console.log('  Body text length:', bodyText);
  const hasErrorState = await page.evaluate(() => document.body.innerText.includes('Something went wrong'));
  console.log('  Error state visible:', hasErrorState);
  const hasWhiteScreen = bodyText < 200;
  console.log('  White screen detected:', hasWhiteScreen);

  // Test responsive viewports
  console.log('14. Testing responsive layouts');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    }));
    console.log(`  ${vp.name}: overflow=${overflow.overflow} docW=${overflow.docW} winW=${overflow.winW}`);
    // check hero not clipped
    const heroVisible = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return false;
      const r = h1.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    console.log(`    hero visible: ${heroVisible}`);
    // screenshot
    await page.screenshot({ path: `qa-customer-${vp.name}.png`, fullPage: false });
    console.log(`    screenshot qa-customer-${vp.name}.png`);
  }

  // Reset to desktop
  await page.setViewportSize({ width: 1280, height: 800 });

  // Test Services page
  console.log('15. Opening Services page');
  await page.goto('http://localhost:5173/customer/services', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('  Services URL:', page.url());
  const servicesLoaded = await page.evaluate(() => document.body.innerText.includes('Services') || document.body.innerText.includes('Electrician'));
  console.log('  Services content loaded:', servicesLoaded);

  // Test Request Service page
  console.log('16. Opening Request Service page');
  await page.goto('http://localhost:5173/customer/request', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('  Request URL:', page.url());
  const requestForm = await page.evaluate(() => document.body.innerText.includes('Request a Service') || document.body.innerText.includes('Service Category'));
  console.log('  Request form visible:', requestForm);

  console.log('17. Console errors:', consoleErrors.slice(0,3));
  console.log('18. Failed requests:', failedReqs.slice(0,3));

  await ctx.close();
  await browser.close();
  console.log('\n=== QA COMPLETE ===');
}

testCustomerDashboard().catch(e => {
  console.error('QA FAILED:', e);
  process.exit(1);
});
