import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: 'desktop-1280', w: 1280, h: 800 },
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'mobile-375', w: 375, h: 812 },
  { name: 'tablet-768', w: 768, h: 1024 },
];

const URL = 'http://localhost:5173/';

async function checkViewport(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const failedRequests = [];
  page.on('requestfailed', r => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));

  console.log(`\n=== ${vp.name} ${vp.w}x${vp.h} ===`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Check horizontal overflow
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    const bodyOverflow = getComputedStyle(document.body).overflowX;
    const htmlOverflow = getComputedStyle(document.documentElement).overflowX;
    // find elements wider than viewport
    const offenders = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > winW + 1 && r.width < 5000) {
        // ignore if element is supposed to be full width
        if (r.left < -1 || r.right > winW + 1) {
          const sel = el.tagName + (el.className ? '.' + String(el.className).split(' ').slice(0,2).join('.') : '') + (el.id ? '#'+el.id : '');
          offenders.push({ sel, w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) });
        }
      }
    });
    return { docW, winW, overflow: docW > winW + 1, bodyOverflow, htmlOverflow, offenders: offenders.slice(0,5) };
  });
  console.log(`Overflow check: docW=${overflow.docW} winW=${overflow.winW} overflow=${overflow.overflow} bodyOverflow=${overflow.bodyOverflow}`);
  if (overflow.offenders.length) console.log('  offenders:', overflow.offenders);

  // Check hero headline
  const hero = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return { found: false };
    const r = h1.getBoundingClientRect();
    return { found: true, text: h1.innerText.slice(0,80), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) };
  });
  console.log('Hero h1:', hero);

  // Check ProductPreview
  const preview = await page.evaluate(() => {
    const el = document.querySelector('[class*="rounded-\\[24px\\]"]') || document.evaluate("//*[contains(text(),'LIVE')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.closest('div');
    // fallback: find element containing "LIVE"
    let target = null;
    for (const d of document.querySelectorAll('div')) if (d.textContent.includes('LIVE') && d.textContent.includes('Incoming')) { target = d.closest('.relative') || d; break; }
    // broader: find preview container by its unique structure
    const candidates = [...document.querySelectorAll('div')].filter(d => d.textContent.includes('FAIR PAYOUT BREAKDOWN') && d.textContent.includes('Worker receives'));
    if (candidates.length) target = candidates[0].closest('.relative') || candidates[0];
    if (!target) return { found: false };
    const r = target.getBoundingClientRect();
    return { found: true, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), winW: window.innerWidth };
  });
  console.log('Preview:', preview);

  // Check sections visibility
  const sections = await page.evaluate(() => {
    const ids = ['how','customer','cooperative','trust','services'];
    return ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, found: false };
      const r = el.getBoundingClientRect();
      return { id, found: true, top: Math.round(r.top), h: Math.round(r.height), visible: r.height > 0 };
    });
  });
  console.log('Sections:', sections);

  // Check navbar
  const nav = await page.evaluate(() => {
    const n = document.querySelector('nav');
    if (!n) return { found: false };
    const r = n.getBoundingClientRect();
    return { found: true, top: Math.round(r.top), w: Math.round(r.width), class: n.className.slice(0,120) };
  });
  console.log('Navbar:', nav);

  // Test scroll - check navbar transition
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const navTop = await page.$eval('nav', el => getComputedStyle(el).backgroundColor);
  console.log('Navbar bg at top:', navTop);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(800);
  const navScrolled = await page.$eval('nav', el => getComputedStyle(el).backgroundColor);
  console.log('Navbar bg after scroll:', navScrolled);

  // Test mobile drawer if mobile
  if (vp.w <= 768) {
    const menuBtn = await page.$('button[aria-label="Menu"]');
    if (menuBtn) {
      console.log('Mobile menu button found, clicking...');
      await menuBtn.click();
      await page.waitForTimeout(500);
      const drawerVisible = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a')].filter(a => a.textContent.includes('How It Works'));
        return links.length > 1; // drawer adds second set
      });
      console.log('Drawer open, links visible:', drawerVisible);
      // close
      await menuBtn.click();
      await page.waitForTimeout(300);
    } else {
      console.log('Mobile menu button NOT found');
    }
  }

  // Hover test service card
  const svcCard = await page.$('#services button');
  if (svcCard) {
    await svcCard.hover();
    await page.waitForTimeout(400);
    console.log('Service card hover done');
  }

  // Check CTA buttons clickable
  const getStarted = await page.$('button:has-text("Get Started")');
  console.log('Get Started button found:', !!getStarted);
  const loginBtn = await page.$('button:has-text("Login")');
  console.log('Login button found:', !!loginBtn);

  // Console errors
  console.log('Console errors:', consoleErrors.slice(0,3));
  console.log('Failed requests:', failedRequests.slice(0,3));

  // Screenshot
  const path = `qa-${vp.name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`Screenshot saved: ${path} `);

  // Full page height
  const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`Page scrollHeight: ${pageH}`);

  await context.close();
  return { vp: vp.name, overflow, hero, preview, sections, consoleErrors, failedRequests, pageH };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const vp of VIEWPORTS) {
    try {
      const r = await checkViewport(browser, vp);
      results.push(r);
    } catch (e) {
      console.error(`FAILED ${vp.name}:`, e.message);
      results.push({ vp: vp.name, error: e.message });
    }
  }
  await browser.close();
  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`${r.vp}: overflow=${r.overflow?.overflow} hero=${r.hero?.found} preview=${r.preview?.found} errors=${r.consoleErrors?.length} failed=${r.failedRequests?.length}`);
  }
})();
