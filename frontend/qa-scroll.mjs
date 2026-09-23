import { chromium } from 'playwright';
const VIEWPORTS = [
  { name: 'mobile-375', w: 375, h: 812 },
  { name: 'desktop-1280', w: 1280, h: 800 },
];
for (const vp of VIEWPORTS) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type()==='error') console.log('CONSOLE ERR', m.text()); });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // scroll stepwise to trigger reveals
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`\n=== ${vp.name} scrollHeight ${h} ===`);
  for (let y=0; y<h; y+=600) {
    await page.evaluate(y=>window.scrollTo(0,y), y);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
  // check visibility of key texts
  const checks = await page.evaluate(() => {
    const texts = ['Request. Track. Relax.','Fair work. Real growth.','A real command center','Smarter matching','Verification you can see','Every rupee, explained','Know your workforce','One network, every household need','One platform, five roles','Build stronger communities'];
    return texts.map(t => {
      const found = [...document.querySelectorAll('*')].some(el => el.textContent.trim().includes(t));
      // check if element containing text is visible (opacity>0 and in viewport area)
      let visible = false;
      let elFound = null;
      for (const el of document.querySelectorAll('*')) {
        if (el.textContent.includes(t) && el.children.length===0) { elFound=el; break; }
        if (el.textContent.includes(t) && t.length>10) { // broader
          // find smallest containing
        }
      }
      // find first element that contains text
      const el = [...document.querySelectorAll('h3,h4,p,span')].find(e=>e.textContent.includes(t));
      if (el) {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const parent = el.closest('[style*="opacity"]') || el;
        const parentStyle = getComputedStyle(parent);
        visible = style.opacity !== '0' && parentStyle.opacity !== '0' && r.height>0;
        return { text: t.slice(0,24), found, visible, opacity: style.opacity, parentOpacity: parentStyle.opacity, rect: {h:Math.round(r.height),top:Math.round(r.top)} };
      }
      return { text: t.slice(0,24), found, visible:false };
    });
  });
  checks.forEach(c=> console.log(`${c.found?'✔':'✘'} ${c.visible?'👁':'👻'} ${c.text} op=${c.opacity} parentOp=${c.parentOpacity} h=${c.rect?.h}`));

  const overflow = await page.evaluate(()=> ({ docW: document.documentElement.scrollWidth, winW: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth+1 }));
  console.log('Overflow:', overflow);

  // check for horizontal scrollbar
  const hasHScroll = await page.evaluate(()=> document.documentElement.scrollWidth > document.documentElement.clientWidth+2);
  console.log('Has H scroll:', hasHScroll);

  // screenshot after scroll
  await page.evaluate(()=> window.scrollTo(0,0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `qa-scroll-${vp.name}.png`, fullPage: true });
  console.log(`Saved qa-scroll-${vp.name}.png`);
  await browser.close();
}
