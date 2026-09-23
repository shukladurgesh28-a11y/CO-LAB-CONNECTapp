import { chromium } from 'playwright';

async function loginAndShot(role, email, viewport) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  page.on('pageerror', e=> errs.push('PAGEERR:'+e.message));
  console.log(`\n=== ${role} ${viewport.width}x${viewport.height} as ${email} ===`);
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'CoLab!Demo2026');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('after login url', page.url());
  // go to dashboard directly if not redirected
  const dashMap = {
    customer: '/customer/dashboard',
    worker: '/worker/dashboard',
    cooperative: '/cooperative/dashboard',
    federation: '/federation/dashboard',
  };
  const dash = dashMap[role] || '/customer/dashboard';
  await page.goto('http://localhost:5173'+dash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('dashboard url', page.url());
  // check overlapping: measure bounding rects of main sections
  const overlap = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('section, div.rounded-\\[24px\\], div.rounded-\\[20px\\]')].slice(0,15);
    const rects = sections.map(s=> {
      const r=s.getBoundingClientRect();
      return {tag:s.tagName, cls:s.className.slice(0,60), top:Math.round(r.top), bottom:Math.round(r.bottom), h:Math.round(r.height), w:Math.round(r.width)};
    }).filter(r=>r.h>20);
    // check for overlapping: any two rects where one bottom > next top + 5 and they are vertically adjacent
    let overlaps=[];
    for(let i=0;i<rects.length-1;i++){
      for(let j=i+1;j<rects.length;j++){
        const a=rects[i], b=rects[j];
        // check if b starts before a ends and they are not parent-child (simple)
        if(b.top < a.bottom - 20 && b.top > a.top && Math.abs(a.top-b.top)>20){
          // check horizontal overlap
          const horizOverlap = !(a.w < 300 && b.w < 300); // ignore small
          if(horizOverlap) overlaps.push({a:i,b:j, aTop:a.top, aBot:a.bottom, bTop:b.top, bBot:b.bottom});
        }
      }
    }
    // check for workers in customer
    const body = document.body.innerText;
    const hasWorker = body.includes('A. Verma') || body.includes('S. Khan');
    const customerHeroWorker = document.querySelector('section')?.innerText.includes('A. Verma');
    return {rects:rects.slice(0,8), overlaps: overlaps.slice(0,5), hasWorker, customerHeroWorker, bodyLen: body.length};
  });
  console.log('overlap check:', JSON.stringify(overlap, null, 2).slice(0,1500));
  // check data mixing: does customer page show worker-specific data like "Current workload" etc?
  const mixing = await page.evaluate(()=>{
    const txt = document.body.innerText;
    return {
      hasWorkload: txt.includes('Current workload') || txt.includes('is_available'),
      hasMyRequests: txt.includes('My Requests'),
      hasWorkerAllocated: txt.includes('WORKER ALLOCATED'),
      hasCooperative: txt.includes('Cooperative Control'),
    };
  });
  console.log('mixing check:', mixing);
  await page.screenshot({ path: `qa-${role}-${viewport.width}.png`, fullPage: true });
  console.log(`saved qa-${role}-${viewport.width}.png errs:`, errs.slice(0,2));
  await browser.close();
  return {overlap, mixing, errs};
}

for (const vp of [{width:1280,height:800},{width:375,height:812}]) {
  await loginAndShot('customer','customer@demo.com', vp);
  await loginAndShot('worker','worker@demo.com', vp);
  await loginAndShot('cooperative','coop@demo.com', vp);
}
