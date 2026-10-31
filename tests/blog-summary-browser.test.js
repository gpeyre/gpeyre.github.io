/* BLOG_PREVIEW_URL=http://127.0.0.1:4197 BLOG_SITE_DIR=/path/to/site
 * BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-summary-browser.test.js */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright");
const root=path.resolve(__dirname,".."),site=process.env.BLOG_SITE_DIR;
const base=process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4197";
const images=JSON.parse(fs.readFileSync(path.join(root,"blog/summary-images.json"),"utf8")).images;
const postNames=fs.readdirSync(path.join(root,"blog/_posts"));
const expectedPublished=Object.keys(images).filter(slug=>postNames.some(name=>name.endsWith("-"+slug+".md"))).length;
const expectedForthcoming=Object.keys(images).length-expectedPublished;
(async()=>{
 assert.ok(site,"Set BLOG_SITE_DIR to a fresh safe Jekyll build");
 for(const privatePath of ["blog/announcement-queue.html","blog/announcement-queue.md","blog/published.md","blog/publication-log.json","css/blog-queue.css","js/blog-queue.js"])
  assert.equal(fs.existsSync(path.join(site,privatePath)),false,privatePath+" must remain private");
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  for(const [url,selector,count] of [["/blog/",".blog-preview-image img",expectedPublished],["/blog/preparations/",".draft-summary-image",expectedForthcoming]]){
   await page.goto(base+url,{waitUntil:"domcontentloaded"});
   assert.equal(await page.locator(selector).count(),count,url+" covers every experiment");
   const sources=await page.locator(selector).evaluateAll(nodes=>nodes.map(node=>node.src));
   await page.evaluate(async sources=>{
    await Promise.all(sources.map(source=>new Promise((resolve,reject)=>{
     const image=new Image();image.onload=()=>image.naturalWidth>0?resolve():reject(Error("Empty image "+source));
     image.onerror=()=>reject(Error("Missing image "+source));image.src=source;
    })));
   },sources);
   for(const width of [320,375,600,640,768,1280]){
    await page.setViewportSize({width,height:950});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),url+" has no horizontal overflow at "+width);
    if(url==="/blog/"){
     const cards=await page.locator('.blog-preview').evaluateAll(nodes=>nodes.map(node=>{
      const body=node.querySelector('.blog-preview-body'),image=body.querySelector('.blog-preview-image'),heading=body.querySelector('h2');
      const box=element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};};
      return {hasImage:body.classList.contains('has-image'),display:getComputedStyle(body).display,body:box(body),heading:box(heading),image:image&&box(image),fit:image&&getComputedStyle(image.querySelector('img')).objectFit};
     }));
     for(const card of cards){
      assert.equal(card.hasImage,Boolean(card.image),'Image layout applies only to illustrated posts');
      if(!card.image){assert.notEqual(card.display,'grid','Text-only posts reserve no thumbnail column');continue;}
      assert.ok(card.image.width<=(width<=600?128:200)+1,'Thumbnails stay compact at '+width);
      assert.equal(card.fit,'contain','Scientific plots are not cropped');
      assert.ok(Math.abs(card.image.right-card.body.right)<=1,'Thumbnail is aligned to the right');
      if(width<=600){
       assert.ok(Math.abs(card.heading.width-card.body.width)<=1,'Mobile titles retain the full width');
       assert.ok(card.image.top>=card.heading.bottom-1,'Mobile image follows the title');
      }else assert.ok(card.image.left>=card.heading.right+15,'Desktop title and thumbnail never overlap');
     }
    }
   }
   if(process.env.BLOG_SCREENSHOT_DIR){
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,url==="/blog/"?"blog-summary-archive.png":"blog-summary-forthcoming.png")});
   }
  }
  let published=0,forthcoming=0;
  for(const [slug,image] of Object.entries(images)){
   const source=path.join(site,"blog/preparations",slug+".html");
   let file;
   if(fs.existsSync(source)&&!fs.readFileSync(source,"utf8").includes('http-equiv="refresh"')){file=source;forthcoming++;}
   else{
    const post=postNames.find(name=>name.endsWith("-"+slug+".md"));
    assert.ok(post,"Published image must have an article "+slug);
    file=path.join(site,"blog",post.slice(0,4),post.slice(5,7),post.slice(8,10),slug,"index.html");published++;
   }
   const html=fs.readFileSync(file,"utf8"),expected="https://www.gpeyre.com"+image.path;
   assert.ok(html.includes('property="og:image" content="'+expected+'"'),slug+" has its real social image");
   assert.ok(html.includes('name="twitter:image" content="'+expected+'"'),slug+" has its large-card image");
   assert.ok(html.includes('property="og:image:width" content="'+image.width+'"'),slug+" has encoded width");
   assert.ok(html.includes('property="og:image:height" content="'+image.height+'"'),slug+" has encoded height");
   assert.ok(fs.existsSync(path.join(site,image.path)),slug+" image is public");
  }
  assert.equal(published,expectedPublished);assert.equal(forthcoming,expectedForthcoming);assert.deepEqual(errors,[]);
  console.log(`Summary images: all ${published+forthcoming} social cards, ${published} published + ${forthcoming} forthcoming thumbnails, image loading, responsive layouts, and private queue exclusions passed.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
