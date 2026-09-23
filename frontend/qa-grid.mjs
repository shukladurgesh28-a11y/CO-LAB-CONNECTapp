import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1280,height:800}});
const p = await ctx.newPage();
await p.goto('http://localhost:5173/login',{waitUntil:'networkidle'});
await p.fill('input[name="email"]','customer@demo.com');
await p.fill('input[name="password"]','CoLab!Demo2026');
await p.click('button[type="submit"]');
await p.waitForTimeout(2500);
await p.goto('http://localhost:5173/customer/dashboard',{waitUntil:'networkidle'});
await p.waitForTimeout(1500);
const info = await p.evaluate(()=>{
  const grid=document.querySelector('div.grid.grid-cols-12');
  if(!grid) return {found:false};
  const children=[...grid.children];
  return children.map((c,i)=>{
    const s=getComputedStyle(c);
    return {i, cls:c.className.slice(0,150), gridColumn:s.gridColumn, display:s.display, width:Math.round(c.getBoundingClientRect().width), tag:c.tagName};
  });
});
console.log(JSON.stringify(info,null,2));
await b.close();
