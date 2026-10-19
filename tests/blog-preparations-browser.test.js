/* BLOG_PREVIEW_URL=http://127.0.0.1:4189 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-preparations-browser.test.js */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright");
const base=process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4189";
const shots=process.env.BLOG_SCREENSHOT_DIR||"/private/tmp";
const topics=["monge","moments","caps","clt","energy","composition","cdf","matchings","bernstein","quantization","weak","independence","envelope","gaussian","sgd"];
const slugs=["monge-gap-inversions","autonomous-wasserstein-statistics","gaussian-gromov-wasserstein-counterexample","wasserstein-geodesics-density-caps","central-limit-wasserstein-constants","divergences-and-bregman-geometry","energy-distance-wasserstein-convexity","composing-optimal-transport-maps","wasserstein-distance-without-quantiles","noncrossing-matchings-catalan","optimal-transport-convex-extension","bernstein-polynomials-on-measures","optimal-particles-versus-random-sampling","weak-transport-and-convex-order","gaussian-sinkhorn-convergence","sgd-iterate-covariance","perspective-transform-on-measures","spectral-wasserstein-distances"];
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:1000},reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    if(process.env.BLOG_TEST_ONLY!=="articles")for(const topic of topics) {
      await page.goto(base+"/blog/preparations/assets/ot-lab/index.html?topic="+topic);
      await page.waitForFunction(()=>document.querySelector("#status").textContent.length>0);
      if(topic==="weak")await page.waitForFunction(()=>!document.querySelector("#status").textContent.includes("refining"));
      const sliders=page.locator("input[type=range]");
      for(let i=0;i<await sliders.count();i++)for(const end of ["max","min"]) {
        await sliders.nth(i).evaluate((el,end)=>{el.value=el[end];el.dispatchEvent(new Event("input",{bubbles:true}));},end);
        await page.waitForTimeout(topic==="weak"?400:30);
        const status=await page.locator("#status").textContent();
        assert.ok(!/ERROR|Numerical error|NaN|Infinity|undefined/.test(status),topic+": "+status);
        assert.ok(await page.locator("svg polyline, svg circle, svg polygon").count()>0,topic+" must render");
      }
      if(topic==="bernstein")for(const option of ["square","linear","corner"]) {
        await page.locator("select").selectOption(option);
        if(option==="linear")assert.match(await page.locator("#status").innerText(),/error (?:0|[\d.]+e-1[4567])/);
      }
      if(topic==="gaussian"||topic==="sgd") {
        const controlIndex=topic==="gaussian"?1:2;
        await page.getByRole("button",{name:topic==="gaussian"?"Play cycles":"Play iterations",exact:true}).click();
        await page.waitForTimeout(200);
        assert.ok(+(await sliders.nth(controlIndex).inputValue())>0,topic+" playback must advance");
        await page.getByRole("button",{name:"Restart",exact:true}).click();
        assert.equal(await sliders.nth(controlIndex).inputValue(),"0");
        assert.equal(await page.locator('script[src="data.js"]').count(),0,topic+" experiment must not load unrelated trajectories");
      }
      if(topic==="matchings") {
        for(const label of ["Try 500 downhill swaps","Explore 100 random matchings","Uniform random matching"])await page.getByRole("button",{name:label,exact:true}).click();
        await page.getByRole("button",{name:"Load three-pair trap",exact:true}).click();
        const before=await page.locator("#status").innerText();
        await page.getByRole("button",{name:"Try 500 downhill swaps",exact:true}).click();
        assert.equal(await page.locator("#status").innerText(),before,"Pair swaps must not escape the strict local minimum");
      }
      if(topic==="weak") {
        await page.getByRole("button",{name:"Reset clouds"}).click();
        for(const cloud of ["x","y"]) {
          const point=await page.locator("svg").first().locator(`circle[data-cloud=${cloud}]`).first().boundingBox();
          await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();
          await page.mouse.move(point.x+24,point.y+15,{steps:3});await page.mouse.up();
          await page.waitForTimeout(300);
        }
        await page.getByRole("button",{name:"Refine weak solution"}).click();
      }
      await page.goto(base+"/blog/preparations/assets/ot-lab/index.html?topic="+topic);
      await page.screenshot({path:path.join(shots,"forthcoming-demo-"+topic+".png"),fullPage:true});
      await page.setViewportSize({width:320,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),topic+" overflows mobile");
      await page.setViewportSize({width:1200,height:1000});
      console.log("Experiment passed:",topic);
    }
    if(process.env.BLOG_TEST_ONLY!=="experiments") {
      await page.goto(base+"/blog/preparations/");
      const links=await page.locator(".draft-card").evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));
      assert.equal(links.length,23);assert.equal(new Set(links).size,23);
      assert.ok(!links.some(link=>link.includes("heat-equation-over-quantiles")),"published heat post must leave forthcoming previews");
      await page.screenshot({path:path.join(shots,"forthcoming-index.png"),fullPage:true});
      for(const slug of slugs.filter(slug=>!process.env.BLOG_START_AT||slugs.indexOf(slug)>=slugs.indexOf(process.env.BLOG_START_AT))) {
        const response=await page.goto(base+"/blog/preparations/"+slug+".html");
        assert.equal(response.status(),200,slug);
        await page.waitForFunction(()=>window.MathJax?.isReady,{},{timeout:45000});
        await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
        assert.ok(await page.evaluate(()=>MathJax.Hub.getAllJax().length>5),slug+" lacks typeset math");
        assert.equal(await page.locator(".MathJax_Error,.merror").count(),0,slug);
        assert.ok(await page.locator("details.blog-proof").evaluateAll(nodes=>nodes.every(n=>!n.open)),slug+" proofs start open");
        await page.evaluate(()=>{document.querySelectorAll("details.blog-proof").forEach(n=>n.open=true);});
        await page.waitForTimeout(100);
        await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
        assert.equal(await page.locator(".MathJax_Error,.merror").count(),0,slug+" open proofs");
        await page.waitForFunction(()=>Array.from(document.querySelectorAll("details.blog-proof .MathJax_SVG > svg")).every(svg=>{
          const box=svg.getBoundingClientRect();return box.width>0&&box.height>0;
        }));
        const missing=await page.evaluate(()=>Array.from(document.querySelectorAll('a[href^="#"]')).map(a=>a.getAttribute("href").slice(1)).filter(id=>!document.getElementById(decodeURIComponent(id))));
        assert.deepEqual(missing,[],slug+" has missing citation targets");
        assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"),"noindex,follow");
        const frame=page.locator("iframe.idea-experiment");
        if(slug==="optimal-transport-convex-extension") {
          assert.equal(await frame.count(),0,"convex-extension article must not embed the numerical experiment");
          assert.ok(!/experiment/i.test(await page.locator('meta[name="description"]').getAttribute("content")),"convex-extension description must not promise an experiment");
        }
        if(await frame.count()) {
          await frame.scrollIntoViewIfNeeded();
          await page.waitForFunction(()=>document.querySelector("iframe.idea-experiment").dataset.ready==="true");
          const embedded=await (await frame.elementHandle()).contentFrame();
          assert.ok((await embedded.locator("#status").innerText()).length>0);
        }
        await page.setViewportSize({width:375,height:900});
        await page.waitForTimeout(200);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+" mobile overflow");
        if(await frame.count()) {
          await frame.scrollIntoViewIfNeeded();
          const dimensions=await frame.evaluate(el=>({height:el.clientHeight,content:el.contentDocument.querySelector("main").getBoundingClientRect().height}));
          assert.ok(dimensions.height>=dimensions.content-2,slug+" clips mobile experiment");
          if(["weak-transport-and-convex-order","bernstein-polynomials-on-measures"].includes(slug))await frame.screenshot({path:path.join(shots,"forthcoming-mobile-figure-"+slug+".png")});
        }
        await page.screenshot({path:path.join(shots,"forthcoming-mobile-"+slug+".png")});
        await page.setViewportSize({width:1200,height:1000});
        console.log("Article passed:",slug);
      }
    }
    assert.deepEqual(errors,[]);console.log("No browser errors or horizontal mobile overflow.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
