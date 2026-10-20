/* BLOG_PREVIEW_URL=http://127.0.0.1:4196 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-projection-lab-browser.test.js */
"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright"),base=process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4196";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  for(const slug of ["quantum-pinsker-sign-observable","tensor-rank-without-best-approximation","projections-corrections-reflections"]){
   await page.goto(base+"/blog/preparations/"+slug+".html");await page.waitForFunction(()=>window.MathJax?.isReady);await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));assert.equal(await page.locator(".MathJax_Error,.merror").count(),0,slug+" math errors");assert.ok(await page.evaluate(()=>MathJax.Hub.getAllJax().length)>20,slug+" missing mathematics");assert.equal(await page.locator("details[open]").count(),0);
   await page.evaluate(()=>document.querySelectorAll("details.blog-proof").forEach(d=>d.open=true));await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));assert.equal(await page.locator(".MathJax_Error,.merror").count(),0);
   for(const width of [1200,375,320]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+" overflow at "+width);}
  }
  await page.setViewportSize({width:1200,height:1000});const iframe=page.locator("iframe.idea-experiment");await iframe.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector("iframe").dataset.ready==="true");const frame=await(await iframe.elementHandle()).contentFrame();await frame.waitForFunction(()=>window.ProjectionDemo);
  assert.equal(await frame.evaluate(()=>ProjectionDemo.isPlaying()),false);assert.equal(await frame.locator(".cell").count(),81);
  await frame.locator("#step").click();assert.equal(await frame.locator("#iteration-value").textContent(),"1");
  const stateAfterStep=await frame.evaluate(()=>Array.from(ProjectionDemo.getState().z[0]));await frame.locator("#restart").click();await frame.locator("#step").click();assert.deepEqual(await frame.evaluate(()=>Array.from(ProjectionDemo.getState().z[0])),stateAfterStep);
  await frame.locator("#restart").click();await frame.locator("#speed").evaluate(n=>{n.value="120";n.dispatchEvent(new Event("input",{bubbles:true}));});await frame.locator("#play").click();await frame.waitForFunction(()=>document.querySelector("#validation-value").dataset.solved==="true",null,{timeout:10000});assert.equal(await frame.evaluate(()=>ProjectionDemo.isPlaying()),false);assert.match(await frame.locator("#status").textContent(),/Exact solution/);assert.equal(await frame.locator("#violations-value").textContent(),"0");assert.equal(await frame.locator("#play").isDisabled(),true);
  await frame.locator("#new-seed").click();assert.equal(await frame.locator("#seed").inputValue(),"2");assert.equal(await frame.locator("#iteration-value").textContent(),"0");assert.equal(await frame.evaluate(()=>ProjectionDemo.isPlaying()),false);await frame.locator("#step").focus();await page.keyboard.press("Enter");assert.equal(await frame.locator("#iteration-value").textContent(),"1");
  await frame.locator("#puzzle").selectOption("2");assert.equal(await frame.locator("#iteration-value").textContent(),"0");assert.equal(await frame.locator(".cell.clue").count(),17);
  for(const value of ["0","2","8"]){await frame.locator("#cycles").evaluate((n,v)=>{n.value=v;n.dispatchEvent(new Event("input",{bubbles:true}));},value);assert.equal(await frame.locator("#cycles-value").textContent(),value);}
  for(const width of [375,320]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(250);assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"experiment overflow at "+width);const sizes=await iframe.evaluate(n=>({height:n.clientHeight,content:n.contentDocument.querySelector("main").getBoundingClientRect().height}));assert.ok(sizes.height>=sizes.content-2,"experiment clipped");}
  if(process.env.BLOG_SCREENSHOT_DIR){fs.mkdirSync(process.env.BLOG_SCREENSHOT_DIR,{recursive:true});await frame.locator("#restart").click();await frame.locator("#puzzle").selectOption("0");await page.setViewportSize({width:1200,height:1000});await page.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,"projections-article.png"),fullPage:true});await iframe.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,"projection-sudoku.png")});}
  assert.deepEqual(errors,[]);console.log("Projection articles: MathJax, nested proofs, mobile layout; Sudoku playback, exact solution, seed reproducibility, keyboard controls, halfplanes and responsive iframe passed.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
