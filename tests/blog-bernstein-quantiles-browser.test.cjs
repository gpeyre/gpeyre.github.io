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
// Integrate the normal density with a Gauss–Legendre rule independently of
// the panel's normal CDF formula. Its precision matters for biases at n=20000.
function legendreRule(n) {
  const nodes=[];
  for(let i=1;i<=n/2;i++) {
    let x=Math.cos(Math.PI*(i-.25)/(n+.5)),derivative;
    for(let iter=0;iter<12;iter++) {
      let p=1,previous=0;
      for(let k=1;k<=n;k++)[p,previous]=[((2*k-1)*x*p-(k-1)*previous)/k,p];
      derivative=n*(x*p-previous)/(x*x-1);
      const delta=p/derivative;x-=delta;
      if(Math.abs(delta)<1e-15)break;
    }
    const w=2/((1-x*x)*derivative*derivative);
    nodes.push([-x,w],[x,w]);
  }
  return nodes;
}
const normalRule=legendreRule(32);
function normalCDF(x) {
  if(x<=-8)return 0;
  if(x>=8)return 1;
  const half=Math.abs(x)*.5;
  const value=.5+Math.sign(x)*half*normalRule.reduce((sum,[z,w])=>sum+w*phi(half*(z+1)),0);
  return Math.max(0,Math.min(1,value));
}
const density=(law,x)=>law.means.reduce((sum,m,i)=>sum+law.weights[i]*phi((x-m)/law.sigma)/law.sigma,0);
const distribution=(law,x)=>law.means.reduce((sum,m,i)=>sum+law.weights[i]*normalCDF((x-m)/law.sigma),0);

function independentOrderGrid(law) {
  const lo=Math.min(...law.means)-9*law.sigma, hi=Math.max(...law.means)+9*law.sigma, cells=4096;
  const dx=(hi-lo)/cells;
  return Array.from({length:cells},(_,i)=>{
    const x=lo+(i+.5)*dx,F=Math.min(1,distribution(law,x));
    return [x,density(law,x),Math.log(F),Math.log1p(-F)];
  });
}
function independentOrderMean(grid,n,k) {
  // The beta density's normalizing constant cancels in this ratio of
  // midpoint sums. Center the exponents at the mode to avoid overflow.
  const mode=(k-1)/(n-1),logF0=Math.log(mode),logS0=Math.log1p(-mode);
  let mass=0,mean=0;
  for(const [x,f,logF,logS] of grid) {
    const weight=Math.exp((k-1)*(logF-logF0)+(n-k)*(logS-logS0))*f;
    mass+=weight;mean+=x*weight;
  }
  return mean/mass;
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
      rateGuide:(()=>{
        const line=plots[1].querySelector(".bernstein-rate-guide");
        return {points:marks(line),dash:getComputedStyle(line).strokeDasharray};
      })(),
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
  assert.deepEqual(state.errorDomain,{x:[20,20000],y:[1e-6,1]});
  close(state.errorFloor,state.errorDomain.y[0]);
  const sizes=state.sampleSizes;
  assert.equal(sizes[0],20);assert.equal(sizes.at(-1),20000);
  assert.ok(sizes.length>=35&&sizes.length<200);
  assert.ok(sizes.every((n,i)=>n%20===0&&(i===0||n>sizes[i-1])));
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
  const [logXmin,logXmax]=state.errorDomain.x.map(Math.log10), [logYmin,logYmax]=state.errorDomain.y.map(Math.log10);
  const [start,end]=[report.rateGuide.points[0],report.rateGuide.points.at(-1)];
  assert.notEqual(report.rateGuide.dash,"none");
  close(start[0],40,7e-5);close(end[0],360,7e-5);
  close((end[1]-start[1])/220*(logYmax-logYmin),logXmax-logXmin,7e-6);
  const grid=independentOrderGrid(law);
  const median=state.curves.find(curve=>curve.t===.5).points.at(-1).signedError;
  const statusBias=Number(status.match(/signed median bias at n = 20,000: ([\d.e+-]+)/)?.[1]);
  close(statusBias,median,Math.max(1e-10,.00051*Math.abs(median)));
  for(const {t,quantile,points} of state.curves) {
    assert.ok(levels.includes(t));close(distribution(law,quantile),t,2e-7);
    const marker=report.quantiles.find(d=>d.t===t);
    const guide=report.guides.find(d=>d.t===t);
    close(marker.x,40+320*(quantile+4)/8,6e-5);close(guide.x,marker.x,6e-5);
    close(marker.y,250-220*density(law,quantile)/.7,6e-5);
    const line=report.errors.find(d=>d.t===t);
    assert.equal(line.color,marker.color,"quantile marker and error curve share a color");
    assert.equal(points.length,sizes.length);assert.equal(line.points.length,points.length);
    for(const [i,p] of points.entries()) {
      assert.equal(p.n,sizes[i]);
      assert.equal(p.rank,Math.ceil(p.n*Math.round(100*t)/100));
      close(p.error,Math.abs(p.estimate-quantile));close(p.signedError,p.estimate-quantile);
      close(p.mass,1,3e-6);
      const [sx,sy]=line.points[i];
      close(sx,40+320*(Math.log10(p.n)-logXmin)/(logXmax-logXmin),7e-5);
      const logError=Math.log10(Math.max(state.errorFloor,p.error));
      close(sy,250-220*(logError-logYmin)/(logYmax-logYmin),7e-5);
      assert.ok(sy>=30-1e-4&&sy<=250+1e-4,"bias curve stays within the fixed chart frame");
    }
    for(const index of [0,Math.floor(points.length/2),points.length-1]) {
      const {estimate,n,rank}=points[index];
      close(estimate,independentOrderMean(grid,n,rank),2e-8);
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
    console.log(`Bernstein quantile browser checks passed: five levels, log-log n=20 to 20000, 1/n guide, independent high-n estimates, keyboard slider, and ${widths.join(" / ")}px article layouts.`);
  }finally{await browser.close();}
}

main().catch(error=>{console.error(error);process.exitCode=1;});
