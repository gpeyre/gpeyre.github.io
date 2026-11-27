"use strict";
// BLOG_PREVIEW_URL=http://127.0.0.1:PORT BLOG_PLAYWRIGHT_PATH=/path/to/playwright
// node tests/blog-bernstein-quantiles-browser.test.cjs
const assert=require("node:assert/strict"),path=require("node:path");
const {articleSource}=require("./blog-article-source.js");
const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright");
const article=articleSource("bernstein-polynomials-on-measures");
const demo="/blog/preparations/assets/ot-lab/index.html?topic=bernstein";
const base=new URL(process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4189");
const widths=[1200,375,320], levels=[.1,.25,.5,.75,.9];

function close(actual,expected,tolerance=1e-10) {
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,`${actual} != ${expected} (tol ${tolerance})`);
}
const phi=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
// A separate normal-tail approximation, with absolute error below 8e-8.
function normalCDF(x) {
  const z=Math.abs(x), t=1/(1+.2316419*z);
  const tail=phi(z)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return x<0?tail:1-tail;
}
const density=(law,x)=>law.means.reduce((sum,m,i)=>sum+law.weights[i]*phi((x-m)/law.sigma)/law.sigma,0);
const distribution=(law,x)=>law.means.reduce((sum,m,i)=>sum+law.weights[i]*normalCDF((x-m)/law.sigma),0);

function independentOrderMean(law,n,k) {
  // Midpoints in x, independent of the panel's integration grid and CDF code.
  const lo=Math.min(...law.means)-9*law.sigma, hi=Math.max(...law.means)+9*law.sigma, cells=2400;
  const dx=(hi-lo)/cells;
  let weight=n,mean=0;
  for(let i=1;i<k;i++)weight*=(n-i)/i;
  for(let i=0;i<cells;i++) {
    const x=lo+(i+.5)*dx,F=distribution(law,x);
    mean+=x*weight*F**(k-1)*(1-F)**(n-k)*density(law,x)*dx;
  }
  return mean;
}

async function inspect(frame,shape) {
  await frame.waitForFunction(shape=>window.BernsteinQuantileApp?.getState()?.shape===shape,shape);
  const report=await frame.evaluate(()=>{
    const pair=ids=>ids.map(id=>document.querySelector(id));
    const plots=pair(["#bernstein-density","#bernstein-errors"]);
    const marks=polyline=>Array.from(polyline.points,({x,y})=>[x,y]);
    return {state:BernsteinQuantileApp.getState(),width:innerWidth,scroll:document.documentElement.scrollWidth,
      status:document.querySelector("#status").textContent,
      bounds:plots.map(p=>{const r=p.getBoundingClientRect();return [r.width,r.height];}),
      density:marks(plots[0].querySelector(".bernstein-density-curve")),
      guides:[...plots[0].querySelectorAll(".bernstein-quantile-guide[data-t]")].map(line=>({t:+line.dataset.t,x:+line.getAttribute("x1")})),
      quantiles:[...plots[0].querySelectorAll("circle.bernstein-quantile[data-t]")].map(dot=>({
        t:+dot.dataset.t,x:dot.cx.baseVal.value,y:dot.cy.baseVal.value,color:getComputedStyle(dot).fill
      })),
      errors:[...plots[1].querySelectorAll("polyline.bernstein-error-curve[data-t]")].map(line=>({
        t:+line.dataset.t,points:marks(line),color:getComputedStyle(line).stroke
      }))};
  });
  const {state,status}=report;
  assert.ok(report.scroll<=report.width+1,`${report.width}px demo scrolls to ${report.scroll}px`);
  assert.ok(report.bounds.every(([w,h])=>w>125&&h>110),"two visible plot panels");
  assert.ok(status.length>0&&!/NaN|Infinity|undefined|numerical error/i.test(status),status);
  assert.deepEqual(state.levels,levels);
  assert.deepEqual(state.densityDomain,{x:[-4,4],y:[0,.7]});
  assert.deepEqual(state.errorDomain,{x:[1,120],y:[1e-6,4]});
  close(state.errorFloor,1e-6);
  const law=state.law;
  close(law.means[0],-1.25+.65*shape);close(law.means[1],1.1+.35*shape);
  close(law.weights[0],.52-.25*shape);close(law.weights[1],.48+.25*shape);close(law.sigma,.52);
  assert.ok(report.density.length>=101);
  for(const [sx,sy] of report.density) {
    const x=-4+8*(sx-40)/320;
    close((250-sy)*.7/220,density(law,x),2e-6);
  }
  assert.equal(state.curves.length,5);
  for(const marks of [report.guides,report.quantiles,report.errors])assert.deepEqual(marks.map(d=>d.t).sort((a,b)=>a-b),levels);
  const [xmin,xmax]=state.errorDomain.x, logMin=Math.log10(state.errorDomain.y[0]), logMax=Math.log10(state.errorDomain.y[1]);
  for(const {t,quantile,points} of state.curves) {
    assert.ok(levels.includes(t));close(distribution(law,quantile),t,2e-7);
    const marker=report.quantiles.find(d=>d.t===t);
    const guide=report.guides.find(d=>d.t===t);
    close(marker.x,40+320*(quantile+4)/8,6e-5);close(guide.x,marker.x,6e-5);
    close(marker.y,250-220*density(law,quantile)/.7,6e-5);
    const line=report.errors.find(d=>d.t===t);
    assert.equal(line.color,marker.color,"quantile marker and error curve share a color");
    assert.equal(points.length,120);assert.equal(line.points.length,points.length);
    for(const [i,p] of points.entries()) {
      assert.equal(p.n,i+1);
      assert.equal(p.rank,Math.ceil(p.n*Math.round(100*t)/100));
      close(p.error,Math.abs(p.estimate-quantile));close(p.signedError,p.estimate-quantile);
      close(p.mass,1,3e-6);
      const [sx,sy]=line.points[i];
      close(sx,40+320*(p.n-xmin)/(xmax-xmin),7e-5);
      const logError=Math.log10(Math.max(state.errorFloor,p.error));
      close(sy,250-220*(logError-logMin)/(logMax-logMin),7e-5);
    }
    const mean=law.means.reduce((sum,m,i)=>sum+law.weights[i]*m,0);
    close(points[0].estimate,mean,3e-6);
    for(const index of [8,119]) {
      const {estimate,n,rank}=points[index];
      close(estimate,independentOrderMean(law,n,rank),2e-5);
    }
  }
  assert.equal(new Set(report.quantiles.map(d=>d.color)).size,levels.length);
  return report;
}

async function main() {
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:1100},reducedMotion:"reduce"});
    await page.route("**/js/site-analytics.js",route=>route.fulfill({contentType:"application/javascript",body:""}));
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    assert.equal((await page.goto(new URL(demo,base).href)).status(),200);
    await page.waitForFunction(()=>!!window.BernsteinQuantileApp);
    const input=page.locator("#bernstein-mixture");
    assert.equal(await page.locator('input[type="range"]').count(),1);
    for(const [attribute,value] of [["min",-1],["max",1],["step",.05]])close(+(await input.getAttribute(attribute)),value);
    close(+(await input.inputValue()),.2);
    const initial=await inspect(page,.2);
    await input.press("Home");const left=await inspect(page,-1);
    await input.press("End");const right=await inspect(page,1);
    const variants=[initial,left,right];
    for(let i=0;i<variants.length;i++)for(let j=0;j<i;j++) {
      assert.notDeepEqual(variants[i].density,variants[j].density,"mixture slider redraws density");
      assert.notDeepEqual(variants[i].quantiles,variants[j].quantiles,"mixture slider redraws population quantiles");
      assert.notDeepEqual(variants[i].errors,variants[j].errors,"mixture slider redraws error in n");
    }

    assert.equal((await page.goto(new URL(article.url,base).href)).status(),200);
    assert.equal(await page.locator("h1").textContent(),article.title);
    await page.waitForFunction(()=>window.MathJax?.isReady,null,{timeout:45000});
    await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
    assert.ok(await page.locator("details.blog-proof").count()>=4);
    assert.equal(await page.locator("details.blog-proof[open]").count(),0);
    const iframe=page.locator('iframe.idea-experiment[data-experiment="bernstein"]');
    await iframe.scrollIntoViewIfNeeded();
    const frame=await (await iframe.elementHandle()).contentFrame();
    await inspect(frame,.2);
    for(const width of widths) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(()=>{
        document.querySelectorAll("details.blog-proof").forEach(p=>{p.open=true;});
        MathJax.Hub.Queue(["Rerender",MathJax.Hub]);
      });
      await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
      await page.waitForFunction(()=>{
        const el=document.querySelector('iframe[data-experiment="bernstein"]');
        return el.clientHeight>=el.contentDocument.querySelector("main").getBoundingClientRect().height-2;
      });
      const rendered=await page.evaluate(()=>({
        expressions:MathJax.Hub.getAllJax().length,
        errors:MathJax.Hub.getAllJax().filter(j=>/<merror\b/.test(j.root.toMathML())).length,
        scroll:document.documentElement.scrollWidth
      }));
      assert.ok(rendered.expressions>30);assert.equal(rendered.errors,0);
      assert.equal(await page.locator(".MathJax_Error,.merror").count(),0);
      assert.ok(rendered.scroll<=width+1,`${width}px article scrolls to ${rendered.scroll}px`);
      await inspect(frame,.2);
      if(process.env.BLOG_SCREENSHOT_DIR)await iframe.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,`bernstein-quantiles-${width}.png`)});
    }
    assert.deepEqual(errors,[]);
    console.log(`Bernstein quantile browser checks passed: five levels, 120 sample sizes, independent order-statistic means, keyboard slider, and ${widths.join(" / ")}px article layouts.`);
  }finally{await browser.close();}
}

main().catch(error=>{console.error(error);process.exitCode=1;});
