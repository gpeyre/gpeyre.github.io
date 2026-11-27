"use strict";
// BLOG_PREVIEW_URL=http://127.0.0.1:PORT BLOG_PLAYWRIGHT_PATH=/path/to/playwright
// node tests/blog-cdf-law-comparison-browser.test.cjs
const assert = require("node:assert/strict");
const path = require("node:path");
const {articleSource} = require("./blog-article-source.js");
const {chromium} = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");

const article = articleSource("wasserstein-distance-without-quantiles");
const demo = "/blog/preparations/assets/ot-lab/index.html?topic=cdf";
const base = new URL(process.env.BLOG_PREVIEW_URL || "http://127.0.0.1:4189");
const widths = [1200, 375, 320];
const close = (a,b,tol=1e-10) => assert.ok(Number.isFinite(a) && Math.abs(a-b)<=tol, `${a} != ${b} (tol ${tol})`);
const density = (lambda,x) => 1+lambda*Math.sin(2*Math.PI*x);
const distribution = (lambda,x) => x+lambda*(1-Math.cos(2*Math.PI*x))/(2*Math.PI);
const integrand = (a,b,x,y) => Math.max(0,distribution(a,x)-distribution(b,y),distribution(b,x)-distribution(a,y));

function independentEstimate(a,b,n) {
  let value=0;
  for(let i=0;i<n;i++)for(let j=i;j<n;j++) {
    const diagonal=i===j;
    const x=(i+(diagonal?1/3:.5))/n, y=(j+(diagonal?2/3:.5))/n;
    value+=(diagonal?1:2)*integrand(a,b,x,y);
  }
  return value/(n*n);
}

async function setRange(frame,id,value) {
  await frame.locator("#cdf-"+id).evaluate((input,next)=>{
    input.value=String(next);
    input.dispatchEvent(new Event("input",{bubbles:true}));
  },value);
}

async function inspect(frame,alpha,beta,resolution) {
  await frame.waitForFunction(({alpha,beta,resolution})=>{
    const state=window.CDFExperiment?.getState();
    return state?.alpha===alpha && state.beta===beta && state.resolution===resolution;
  },{alpha,beta,resolution});
  const report=await frame.evaluate(()=>{
    const panels=["#cdf-density","#cdf-curves","#cdf-integrand"].map(id=>document.querySelector(id));
    return {state:CDFExperiment.getState(), width:innerWidth, scroll:document.documentElement.scrollWidth,
      status:document.querySelector("#status").textContent,
      bounds:panels.map(p=>{const r=p.getBoundingClientRect();return [r.width,r.height];}),
      curves:panels.slice(0,2).map(p=>["alpha","beta"].map(law=>{
        const line=p.querySelector(`polyline[data-law="${law}"]`);
        return {points:Array.from(line.points,({x,y})=>[x,y]),color:getComputedStyle(line).stroke};
      })),
      heat:[...document.querySelectorAll("#cdf-heat path[data-level]")].map(p=>[+p.dataset.level,p.getAttribute("d")])};
  });
  const {state,curves,status}=report;
  assert.ok(report.scroll<=report.width+1,JSON.stringify([report.width,report.scroll]));
  assert.ok(report.bounds.every(([w,h])=>w>90&&h>70),"three visible plot panels");
  assert.ok(status.length>0 && !/NaN|Infinity|undefined|numerical error/i.test(status),status);
  close(state.integrandMax,.6);
  assert.equal(state.meshSize,Math.min(resolution,80));
  close(state.estimate,independentEstimate(alpha,beta,resolution),2e-12);
  close(Number(status.match(/CDF quadrature\): ([\d.e+-]+)/)?.[1]),state.estimate,2e-8);
  const exact=alpha===beta?0:alpha===0||beta===0?3*(alpha+beta)**2/(8*Math.PI**2):null;
  if(exact===null) {
    assert.equal(state.exact,null);assert.doesNotMatch(status,/exact benchmark/i);
  } else {
    close(state.exact,exact,2e-12);assert.match(status,/exact benchmark/i);
  }
  assert.notEqual(curves[0][0].color,curves[0][1].color,"the two laws use distinct colors");
  for (const [i,lambda] of [alpha,beta].entries()) {
    assert.equal(curves[0][i].color,curves[1][i].color,"consistent density/CDF color");
    for(const [panel,curve] of curves.entries()) {
      const {points}=curve[i];
      assert.ok(points.length>=51);
      close(points[0][0],40,1e-4);close(points.at(-1)[0],360,1e-4);
      for(const [sx,sy] of points) {
        const x=(sx-40)/320;
        const ordinate=(250-sy)/220;
        close(ordinate,panel===0?density(lambda,x)/2:distribution(lambda,x),1e-6);
      }
    }
  }
  return report;
}

async function checkHeat(frame,{state}) {
  const n=state.meshSize, checks=[];
  for(const t of [.05,.2,.35,.5,.65,.8,.95])for(const u of [0,.02,.1,.2,.35]) {
    const i=Math.floor(t*n),j=Math.floor((t+u)*n);
    if(j>=n)continue;
    const x=(i+(i===j?1/3:.5))/n,y=(j+(i===j?2/3:.5))/n;
    checks.push([x,y]);
    checks.push([y,x]);
  }
  const hits=await frame.evaluate(points=>{
    const paths=[...document.querySelectorAll("#cdf-heat path[data-level]")];
    return points.map(([x,y])=>paths.filter(p=>p.isPointInFill(new DOMPoint(90+220*x,250-220*y))).map(p=>+p.dataset.level));
  },checks);
  let positive=0;
  checks.forEach(([x,y],i)=>{
    const h=x<y?integrand(state.alpha,state.beta,x,y):0;
    if(h>0)positive++;
    const bin=Math.round(47*h/state.integrandMax);
    assert.deepEqual(hits[i],bin===0?[]:[bin],`wrong heat level at ${x}, ${y}`);
  });
  if(state.alpha!==state.beta)assert.ok(positive>0,"check some positive cells");
}

async function main() {
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:1100},reducedMotion:"reduce"});
    await page.route("**/js/site-analytics.js",route=>route.fulfill({contentType:"application/javascript",body:""}));
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    assert.equal((await page.goto(new URL(demo,base).href)).status(),200);
    await page.waitForFunction(()=>!!window.CDFExperiment);
    assert.equal(await page.locator('input[type="range"]').count(),3);
    for(const id of ["alpha","beta"]) {
      const slider=page.locator("#cdf-"+id);
      close(+(await slider.getAttribute("min")),-.9);close(+(await slider.getAttribute("max")),.9);
    }
    const resolution=page.locator("#cdf-resolution");
    assert.deepEqual([+(await resolution.getAttribute("min")),+(await resolution.getAttribute("max"))],[20,400]);
    const initial=await inspect(page,.6,-.45,100);
    await checkHeat(page,initial);
    await setRange(page,"alpha",.75);
    const changedAlpha=await inspect(page,.75,-.45,100);
    for(const [i,curves] of initial.curves.entries()) {
      assert.notDeepEqual(changedAlpha.curves[i][0].points,curves[0].points);
      assert.deepEqual(changedAlpha.curves[i][1].points,curves[1].points,"beta does not move when alpha changes");
    }
    assert.notDeepEqual(changedAlpha.heat,initial.heat);
    await setRange(page,"beta",-.15);
    const changedBeta=await inspect(page,.75,-.15,100);
    for(const [i,curves] of changedAlpha.curves.entries()) {
      assert.deepEqual(changedBeta.curves[i][0].points,curves[0].points,"alpha does not move when beta changes");
      assert.notDeepEqual(changedBeta.curves[i][1].points,curves[1].points);
    }
    assert.notDeepEqual(changedBeta.heat,changedAlpha.heat);
    await setRange(page,"beta",.75);
    const matched=await inspect(page,.75,.75,100);
    assert.equal(matched.state.estimate,0);
    assert.ok(matched.heat.every(([level])=>level===0));
    await checkHeat(page,matched);
    await setRange(page,"alpha",.6);
    await setRange(page,"beta",0);
    await resolution.press("Home");
    const coarse=await inspect(page,.6,0,20);
    await resolution.press("End");
    const fine=await inspect(page,.6,0,400);
    close(fine.state.estimate,fine.state.exact,2e-6);
    assert.ok(Math.abs(fine.state.estimate-fine.state.exact)<Math.abs(coarse.state.estimate-coarse.state.exact));
    assert.deepEqual(fine.curves,coarse.curves,"integration resolution does not change the laws");
    await checkHeat(page,fine);
    await setRange(page,"alpha",0);await setRange(page,"beta",.6);
    const reversed=await inspect(page,0,.6,400);
    close(reversed.state.estimate,fine.state.estimate);
    await page.locator("#cdf-alpha").press("Home");await page.locator("#cdf-beta").press("End");
    await checkHeat(page,await inspect(page,-.9,.9,400));

    assert.equal((await page.goto(new URL(article.url,base).href)).status(),200);
    assert.equal(await page.locator("h1").textContent(),article.title);
    await page.waitForFunction(()=>window.MathJax?.isReady,null,{timeout:45000});
    await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
    const proofs=page.locator("details.blog-proof");
    assert.ok(await proofs.count()>=4);
    assert.equal(await page.locator("details.blog-proof[open]").count(),0);
    const iframe=page.locator('iframe.idea-experiment[data-experiment="cdf"]');
    await iframe.scrollIntoViewIfNeeded();
    const frame=await (await iframe.elementHandle()).contentFrame();
    await inspect(frame,.6,-.45,100);
    for(const width of widths) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(()=>{
        document.querySelectorAll("details.blog-proof").forEach(p=>{p.open=true;});
        MathJax.Hub.Queue(["Rerender",MathJax.Hub]);
      });
      await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
      await page.waitForFunction(()=>{
        const el=document.querySelector('iframe[data-experiment="cdf"]');
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
      await inspect(frame,.6,-.45,100);
      if(process.env.BLOG_SCREENSHOT_DIR)await iframe.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,`cdf-law-comparison-${width}.png`)});
    }
    assert.deepEqual(errors,[]);
    console.log(`CDF law comparison browser checks passed; uniform-law error ${Math.abs(fine.state.estimate-fine.state.exact).toExponential(2)}, responsive at ${widths.join(" / ")}px.`);
  } finally {await browser.close();}
}

main().catch(error=>{console.error(error);process.exitCode=1;});
