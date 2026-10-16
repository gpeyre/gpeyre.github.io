/* BLOG_PREVIEW_URL=http://127.0.0.1:4192 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/attention-sampling-browser.test.js */
"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),{pathToFileURL}=require("node:url");
const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright");
const base=process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4192";
const shots=process.env.BLOG_SCREENSHOT_DIR||"/private/tmp";
const slug="token-sample-complexity-attention",publishedPath="/blog/2026/10/16/"+slug+"/";
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    const response=await page.goto(base+publishedPath);
    assert.equal(response.status(),200);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"),"https://www.gpeyre.com"+publishedPath);
    assert.equal(await page.locator('.blog-eyebrow time').getAttribute("datetime"),"2026-10-16");
    assert.equal((await page.locator('.blog-eyebrow time').textContent()).trim(),"16 October 2026");
    assert.equal(await page.locator(".draft-status").count(),0,"published article has no alpha-preview badge");
    assert.ok(await page.locator('meta[name="robots"]').evaluateAll(nodes=>nodes.every(n=>!n.content.includes("noindex"))),"published article must be indexable");
    await page.waitForFunction(()=>window.MathJax?.isReady,{},{timeout:45000});
    await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
    assert.ok(await page.evaluate(()=>MathJax.Hub.getAllJax().length>30));
    assert.equal(await page.locator(".MathJax_Error,.merror").count(),0);
    assert.equal(await page.locator(".blog-prose table").count(),0,"absolute-value notation must not be parsed as a Markdown table");
    assert.ok(await page.locator("details.blog-proof").evaluateAll(nodes=>nodes.every(n=>!n.open)));
    const anchors=await page.locator('a[href^="#"]').evaluateAll(nodes=>nodes.map(n=>n.hash.slice(1)).filter(id=>!document.getElementById(id)));
    assert.deepEqual(anchors,[]);
    const iframe=page.locator("iframe.idea-experiment");await iframe.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector("iframe").dataset.ready==="true");
    const frame=await (await iframe.elementHandle()).contentFrame();
    async function ready(){await frame.locator('#results[aria-busy="false"]').waitFor();}
    async function norms(){await ready();return frame.locator("#norms output").allTextContents();}
    async function slider(id,value){await frame.locator(id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));},String(value));await ready();}
    await ready();const initial=await norms();
    assert.equal(initial.length,5);assert.ok(initial.every(value=>Number.isFinite(+value)&&+value>0));
    for(const n of ["3","13","8"]){
      await slider("#sample-size",n);
      for(const tau of [".25","2","1"]){
        await slider("#strength",tau);
        const values=await norms();assert.ok(values.every(value=>Number.isFinite(+value)&&+value>0));
        assert.match(await frame.locator("#status").innerText(),/Showing five draws/);
      }
    }
    assert.deepEqual(await norms(),initial,"same seeded prefixes reproduce the same norms");
    await frame.locator("#resample").click();
    assert.notDeepEqual(await norms(),initial,"resampling changes the samples");
    await frame.locator("#sample-size").evaluate(el=>{for(const value of [13,3,12,8]){el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));}});
    await ready();assert.match(await frame.locator("#status").innerText(),/256 tokens/);
    const numerical=await frame.evaluate(()=>{
      const M=AttentionSampling,n=+document.querySelector("#sample-size-value").textContent.replace(/,/g,""),tau=+document.querySelector("#strength-value").textContent;
      const seed=+document.querySelector("#seed-note").textContent.match(/Seed (\d+)/)[1],rule=M.simpsonRule();
      return M.sampleBank(seed).map(values=>{const sample=M.prepareSample(values,n);return M.l2FromValues(Float64Array.from(rule.nodes,x=>M.evaluatePrepared(sample,x,tau)),tau,rule);});
    });
    (await norms()).forEach((value,i)=>assert.ok(Math.abs(+value-numerical[i])<=.00051));
    await iframe.screenshot({path:path.join(shots,"attention-experiment-desktop.png")});
    await page.evaluate(()=>{document.querySelectorAll("details.blog-proof").forEach(n=>n.open=true);});
    await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
    assert.equal(await page.locator(".MathJax_Error,.merror").count(),0);
    for(const width of [375,320]){
      await page.setViewportSize({width,height:900});await page.waitForTimeout(250);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"post overflows at "+width);
      assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"figure overflows at "+width);
      const size=await iframe.evaluate(el=>({height:el.clientHeight,content:el.contentDocument.querySelector("main").getBoundingClientRect().height}));
      assert.ok(size.height>=size.content-2,"iframe clips figure at "+width);
    }
    await iframe.screenshot({path:path.join(shots,"attention-experiment-mobile.png")});
    await page.locator("#theorem-2").scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(shots,"attention-post-mobile-math.png")});
    await page.setViewportSize({width:1200,height:1000});
    await page.locator("#theorem-2").scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(shots,"attention-post-math.png")});
    await page.goto(base+"/blog/preparations/?q=Boyer");
    await page.locator('[data-ready="true"]').waitFor();
    const result=page.locator(".blog-search-result").filter({has:page.locator('h3 a[href$="'+publishedPath+'"]')});
    assert.equal(await result.count(),1);
    assert.equal((await result.locator(".blog-search-badge").textContent()).trim(),"Published");
    assert.equal(await result.locator(".is-forthcoming").count(),0);
    assert.equal(await result.locator("time").getAttribute("datetime"),"2026-10-16");
    await page.goto(base+"/blog/preparations/");
    assert.equal(await page.locator('.draft-card[href*="'+slug+'"]').count(),0,"published post is removed from forthcoming cards");
    await page.goto(base+"/blog/");
    assert.ok(await page.locator('a[href$="'+publishedPath+'"]').count()>0,"published post is in the blog archive");
    for(const feed of ["rss.xml","atom.xml"]){
      const response=await page.request.get(base+"/blog/"+feed);
      assert.equal(response.status(),200);
      assert.ok((await response.text()).includes("https://www.gpeyre.com"+publishedPath),"published post is included in "+feed);
    }
    await page.goto(base+"/blog/preparations/"+slug+".html");
    await page.waitForURL(url=>url.pathname===publishedPath);
    assert.equal(new URL(page.url()).origin,new URL(base).origin,"preview redirect stays on the current website");
    const local=await browser.newPage();
    await local.goto(pathToFileURL(path.resolve(__dirname,"../blog/preparations/assets/attention-sampling/index.html")).href);
    await local.locator('#results[aria-busy="false"]').waitFor();
    assert.deepEqual(await local.locator("#norms output").allTextContents(),initial);
    assert.deepEqual(errors,[]);
    console.log("Attention post passed: publication date, indexing, math, folded proofs, resampling, slider extremes, numerical metrics, mobile layout, iframe height, local files, published search/archive/feed links, and preview redirect.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
