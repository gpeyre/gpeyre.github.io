/* BLOG_PREVIEW_URL=http://127.0.0.1:4191 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-search-browser.test.js */
"use strict";
const assert=require("node:assert/strict"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright");
const base=(process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4191").replace(/\/$/,"");
const shots=process.env.BLOG_SCREENSHOT_DIR||"/private/tmp";
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    for(const collection of ["/blog/","/blog/preparations/"]){
      await page.goto(base+collection);
      await page.locator('[data-blog-search][data-ready="true"]').waitFor();
      const input=page.getByLabel("Title, keyword, or topic"),status=page.locator("[data-search-status]"),cards=page.locator(".blog-search-result");
      const records=await page.evaluate(()=>window.BLOG_SEARCH_RECORDS);
      assert.equal(records.length,47);
      assert.match(await status.innerText(),/24 published articles · 23 forthcoming previews/);
      assert.equal(await page.locator("[data-blog-browse]").isVisible(),true);
      async function search(query){await input.fill(query);await page.locator("form[role=search]").evaluate(form=>form.requestSubmit());}
      await search("Sinkhorn");
      assert.ok(await cards.count()>1);
      assert.ok(await cards.locator(".is-forthcoming").count()>0);
      assert.ok(await cards.locator("time").count()>0);
      assert.equal(await page.locator("[data-blog-browse]").isVisible(),false);
      assert.equal(new URL(page.url()).searchParams.get("q"),"Sinkhorn");
      await page.getByLabel("Forthcoming",{exact:true}).check();
      assert.equal(await cards.count(),await cards.locator(".is-forthcoming").count());
      await page.getByLabel("Published",{exact:true}).check();
      assert.equal(await cards.locator(".is-forthcoming").count(),0);
      assert.ok(await cards.count()>0);
      await page.getByRole("button",{name:"Clear",exact:true}).click();
      assert.equal(await page.locator("[data-blog-browse]").isVisible(),true);
      assert.equal(await input.inputValue(),"");
      assert.equal(await input.evaluate(el=>el===document.activeElement),true);
      for(const [query,title] of [["Dieuleveut","The covariance of SGD iterates"],["cappe","Tout comprendre"],["Fenchel Young","Inverse optimisation"],["ICNN","Convex neural networks"],["Sinkhorn gaussian","Sinkhorn on Gaussians"],["Boyer","How many tokens does attention need"]]){
        await search(query);
        assert.match((await cards.allInnerTexts()).join(" "),new RegExp(title,"i"),query);
      }
      await search("sgd");
      await cards.first().locator("summary").click();
      assert.ok(await cards.first().locator(".blog-search-all-keywords a").count()>=18);
      const keyword=cards.first().locator(".blog-search-all-keywords a").first(),word=await keyword.innerText();
      await keyword.click();
      await page.locator('[data-ready="true"]').waitFor();
      assert.equal(await input.inputValue(),word);
      assert.ok(await cards.count()>0);
      await search("thereisnosuchkeyword");
      assert.equal(await cards.count(),0);
      assert.match(await page.locator(".blog-search-empty").innerText(),/No matching posts/);
      await search("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen");
      assert.match(await status.innerText(),/at most 16/);
      await search('<img src=x onerror="window.searchInjected=true">');
      assert.equal(await page.evaluate(()=>window.searchInjected),undefined);
      assert.equal(await page.locator("[data-search-results] img").count(),0);
      const longQuery="Sinkhorn ".repeat(30).trim();
      await page.goto(base+collection+"?q="+encodeURIComponent(longQuery));
      await page.locator('[data-ready="true"]').waitFor();
      assert.equal(await input.inputValue(),longQuery);
      assert.match(await status.innerText(),/256 characters/);
      await page.goto(base+collection+"?q=Sinkhorn&status=forthcoming");
      await page.locator('[data-ready="true"]').waitFor();
      assert.equal(await input.inputValue(),"Sinkhorn");
      assert.equal(await cards.count(),await cards.locator(".is-forthcoming").count());
      await page.reload();
      await page.locator('[data-ready="true"]').waitFor();
      assert.ok(await cards.count()>0);
      await page.screenshot({path:path.join(shots,"blog-search-"+(collection.includes("preparations")?"forthcoming":"published")+".png")});
      for(const width of [320,375]){
        await page.setViewportSize({width,height:900});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),collection+" mobile overflow");
        assert.ok((await page.getByRole("button",{name:"Clear",exact:true}).boundingBox()).height<50,"Clear button should stay on one line");
      }
      await page.screenshot({path:path.join(shots,"blog-search-mobile.png")});
      await page.setViewportSize({width:1200,height:1000});
      await page.getByRole("button",{name:"Clear",exact:true}).click();
      await page.getByLabel("Published",{exact:true}).check();
      assert.equal(await cards.count(),24);
      await page.getByLabel("Forthcoming",{exact:true}).check();
      assert.equal(await cards.count(),23);
      for(const record of records){
        const response=await page.request.get(base+record.url);
        assert.equal(response.status(),200,record.url);
      }
      console.log("Search passed:",collection);
    }
    const local=await browser.newPage();
    const localURL=pathToFileURL(path.resolve(__dirname,"../blog/preparations/index.html"));
    localURL.searchParams.set("q","Sinkhorn");
    await local.goto(localURL.href);
    await local.locator('[data-ready="true"]').waitFor();
    const localLinks=await local.locator(".blog-search-result h3 a").evaluateAll(nodes=>nodes.map(node=>node.href));
    assert.ok(localLinks.some(url=>url.startsWith("file:")&&url.includes("/blog/preparations/")));
    assert.ok(localLinks.some(url=>url.startsWith("https://www.gpeyre.com/blog/")));
    console.log("Local-file preview links passed.");
    const noJS=await browser.newPage({javaScriptEnabled:false});
    for(const collection of ["/blog/","/blog/preparations/"]){
      await noJS.goto(base+collection+"?q=Sinkhorn");
      assert.equal(await noJS.locator("[data-blog-browse]").isVisible(),true);
      assert.equal(await noJS.getByLabel("Title, keyword, or topic").isDisabled(),true);
      assert.match(await noJS.locator("noscript").innerText(),/browse/);
    }
    const missing=await browser.newPage();
    await missing.route("**/blog-search-index.js",route=>route.abort());
    await missing.goto(base+"/blog/?q=Sinkhorn");
    assert.equal(await missing.locator("[data-blog-browse]").isVisible(),true);
    assert.match(await missing.locator("[data-search-status]").innerText(),/temporarily unavailable/);
    assert.deepEqual(errors,[]);
    console.log("No-JavaScript and missing-catalogue fallbacks passed; no browser errors.");
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
