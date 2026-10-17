/* BLOG_PREVIEW_URL=http://127.0.0.1:4192 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-spectral-transport-browser.test.js */
"use strict";
const assert=require("node:assert/strict");
const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright");
const base=process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4192";
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(base+"/blog/preparations/spectral-wasserstein-distances.html");
    await page.waitForFunction(()=>window.MathJax?.isReady);
    await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
    const definition=await page.evaluate(()=>{
      const jax=MathJax.Hub.getAllJax().find(item=>item.originalText.includes("\\gamma_p(S)=")&&item.originalText.includes("\\sum_i"));
      if(!jax)return null;
      const frame=document.getElementById(jax.inputID+"-Frame");
      return {tex:jax.originalText,width:frame?.getBoundingClientRect().width||0};
    });
    assert.ok(definition?.width>0,"Schatten definition must survive HTML parsing and render");
    assert.ok(definition.tex.includes("0\\lt p\\lt \\infty"),"the whole exponent range must remain inside the equation");
    assert.equal(await page.locator(".MathJax_Error,.merror").count(),0);
    assert.ok(await page.locator("p").filter({hasText:"Frobenius norm of the displacement matrix"}).isVisible(),"the paragraph after the definition must remain intact");
    assert.ok(await page.locator("p").filter({hasText:"The robust-cost theorem and convex coupling formulation above no longer apply."}).isVisible(),"the paragraph on subunit exponents must remain intact");
    const threshold=await page.locator("#theorem-3").textContent();
    assert.ok(threshold.includes("the triangle inequality can fail."),"the half-Schatten theorem must remain intact");
    const ranges=await page.evaluate(()=>MathJax.Hub.getAllJax().map(item=>item.originalText));
    assert.ok(ranges.includes("0\\lt p\\lt 1"),"the subunit-exponent range must render");
    assert.ok(ranges.includes("0\\lt p\\lt 1/2"),"the theorem's lower-exponent range must render");
    assert.ok(await page.evaluate(()=>!Array.from(document.querySelectorAll("*")).some(node=>/[<\\]/.test(node.localName))),"math must not create malformed HTML tags");
    const iframe=page.locator("iframe.idea-experiment");
    await iframe.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector("iframe").dataset.ready==="true");
    const frame=await(await iframe.elementHandle()).contentFrame();
    const ready=()=>frame.waitForFunction(()=>document.querySelector("#status")?.dataset.state==="ready");
    await ready();
    assert.equal(await frame.locator("#cost-plot").count(),0,"the complete-objective curve was removed");
    assert.equal(await frame.getByText("The complete optimization problem",{exact:true}).count(),0);
    async function control(id,value){
      await frame.locator("#"+id).evaluate((node,input)=>{node.value=input;node.dispatchEvent(new Event("input",{bubbles:true}));},value);
      await ready();
    }
    async function exponent(p){
      await control("exponent",p);
      assert.ok(Number.isFinite(+(await frame.locator("#distance-value").textContent())));
    }
    for(const n of [12,48,100]){
      await control("points",n);
      assert.equal(+(await frame.locator("#points-value").textContent()),n);
      assert.ok(+(await frame.locator("#support-value").textContent())>=n,"the displayed coupling must represent the whole cloud");
    }
    await control("points",48);
    for(const p of [.5,.75,1,1.05,1.5,2,8]){
      await exponent(p);
      assert.ok(+(await frame.locator("#cost-value").textContent())>0);
      const support=+(await frame.locator("#support-value").textContent());
      if(p<=1)assert.equal(support,48,"matching cases have one edge per point");
      else assert.ok(support>=48);
      if(p<1)assert.match(await frame.locator("#status").textContent(),/local|candidate|not.*global/i);
    }
    await frame.locator("#infinite").check();
    await ready();
    assert.equal(await frame.locator("#exponent").isDisabled(),true);
    assert.equal((await frame.locator("#exponent-value").textContent()).trim(),"∞");
    await frame.locator("#infinite").uncheck();
    await ready();
    const status=await frame.locator("#status").textContent();
    for(const t of [0,.5,1]){
      await control("time",t);
      assert.equal(+(await frame.locator("#time-value").textContent()),t);
      assert.equal(await frame.locator("#status").textContent(),status,"interpolation must not re-solve the coupling");
    }
    // Reproduce an iframe whose script runs before it has a usable layout width.
    await iframe.evaluate(node=>node.style.width="0px");
    await frame.waitForFunction(()=>document.querySelector("canvas").clientWidth<80);
    await exponent(.5);
    await iframe.evaluate(node=>node.style.width="100%");
    await frame.waitForFunction(()=>document.querySelector("canvas").clientWidth>80);
    await exponent(2);
    for(const width of [375,320]){
      await page.setViewportSize({width,height:900});
      await page.waitForTimeout(250);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"article overflows at "+width);
      assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const size=await iframe.evaluate(node=>({height:node.clientHeight,content:node.contentDocument.querySelector("main").getBoundingClientRect().height}));
      assert.ok(size.height>=size.content-2,"iframe clips the experiment");
    }
    assert.deepEqual(errors,[]);
    console.log("Spectral clouds passed: point counts, exponent regimes, infinity, interpolation, removed cost plot, zero-width loading, and mobile layout.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
