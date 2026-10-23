"use strict";
// Capture the real published numerical figures. No plotted data is synthesized.
const fs=require("node:fs"),path=require("node:path");
const {stripMetadata}=require("./blog-summary-jpeg.cjs");
const root=path.resolve(__dirname,".."),base=process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4197";
const jobs=[
 {slug:"straight-flows-and-euler-error",source:"/blog/2026/04/16/straight-flows-and-euler-error/",figure:"ode",settings:{bend:.9,steps:8,time:1},alt:"A curved exact flow in teal and its orange Euler polygon, showing the accumulated discretization error with eight steps."},
 {slug:"diffusion-versus-optimal-transport",source:"/blog/2026/06/15/diffusion-versus-optimal-transport/",figure:"diffusion",settings:{time:.7,sigma:.12},alt:"The same Gaussian particles move to three clusters along curved deterministic diffusion paths and straight optimal-transport paths, colored by destination."},
 {slug:"kl-barycenters-of-gaussians",source:"/blog/2026/07/13/kl-barycenters-of-gaussians/",figure:"gaussian",settings:{weight:.5,angle:115},alt:"Two Gaussian covariance ellipses and their reverse-KL barycenter, whose mean and precision interpolate the inputs."},
 {slug:"perron-frobenius-and-sinkhorn",source:"/blog/2026/07/30/perron-frobenius-and-sinkhorn/",figure:"sinkhorn",settings:{epsilon:.22,iteration:8},crop:"sinkhorn",alt:"Successive red-to-blue curved triangular images of positive scaling vectors under normalized Sinkhorn updates, at regularization 0.22 and eight iterations."},
 {slug:"polyak-lojasiewicz-gradient-flows",source:"/blog/2026/08/14/polyak-lojasiewicz-gradient-flows/",figure:"pl",settings:{bend:1.4,time:1.1},alt:"Gradient-flow particles descend a curved banana-shaped valley toward a parabolic set of minimizers, with energy contours and trajectories."},
 {slug:"gaussian-preserving-wasserstein-flows",source:"/blog/2026/09/15/gaussian-preserving-wasserstein-flows/",figure:"gaussian-flow",settings:{angle:110,anisotropy:3.5,time:.9},alt:"A Gaussian covariance ellipse relaxes toward an anisotropic Gaussian target under the exact Wasserstein KL gradient flow; faint ellipses show earlier states."},
 {slug:"inverse-optimisation-gap-loss",source:"/blog/2026/10/03/inverse-optimisation-gap-loss/",figure:"inverse",settings:{points:Math.log(100/10)/Math.log(40),theta:.4},alt:"Two separated Gaussian-mixture point clouds with optimal pairings, beside convex inverse-transport gap-loss curves for increasing sample counts."},
 {slug:"barycentric-projection-map",source:"/blog/2026/10/10/barycentric-projection-map/",figure:"barycentric",settings:{source:12,target:240,motion:35,epsilon:.2},alt:"A many-to-many entropic transport coupling from twelve blue points to 240 orange points appears in gray; black arrows end at conditional barycenters."},
 {slug:"icnn-universality-and-depth",source:"/blog/2026/10/15/icnn-universality-and-depth/",figure:"icnn",settings:{width:6},alt:"Signed approximation-error heatmaps for fitted convex ReLU networks with one and two hidden layers, with target crease lines and the flat-triangle obstruction."},
 {slug:"token-sample-complexity-attention",source:"/blog/preparations/assets/attention-sampling/index.html",kind:"attention",settings:{"sample-size":7,strength:1.4},alt:"Five empirical attention curves from 128 Gaussian tokens depart from the exact straight population map, beside their query-weighted squared errors."},
 {slug:"heat-equation-over-quantiles",source:"/blog/preparations/assets/heat-quantiles/index.html",kind:"heat",settings:{points:40,separation:2.5,time:.45},alt:"A three-Gaussian mixture diffuses under heat: density markers, increasing quantile functions and noncrossing quantile trajectories share mass-rank colors."}
];
async function input(page,selector,value){await page.locator(selector).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}));},value);}
async function mount(page,selector){
 await page.evaluate(selector=>{const element=document.querySelector(selector),wrapper=document.createElement("div");wrapper.id="summary-capture";element.parentNode.insertBefore(wrapper,element);wrapper.append(element);document.body.append(wrapper);},selector);
 await page.addStyleTag({content:"html,body{margin:0!important;padding:0!important;background:#fff!important}body>:not(#summary-capture){display:none!important}#summary-capture{width:1200px!important;box-sizing:border-box;padding:20px;background:#fff;color:#253039}#summary-capture .interactive-figure{margin:0!important}#summary-capture .figure-controls,#summary-capture figcaption,#summary-capture [data-status],#summary-capture .figure-fallback,#summary-capture .icnn-wide,#summary-capture .icnn-clipping{display:none!important}#summary-capture .figure-legend{font:14px/1.5 system-ui;margin:12px 0 0}#summary-capture h3{font:600 18px/1.4 system-ui}#summary-capture .icnn-panels{grid-template-columns:1fr 1fr}#summary-capture .diffusion-panels,#summary-capture .inverse-panels{grid-template-columns:1fr 1fr}"});
}
function dimensions(bytes){let i=2;while(i<bytes.length){if(bytes[i++]!==255)continue;while(bytes[i]===255)i++;const m=bytes[i++];if(m===217||m===218)break;const n=bytes.readUInt16BE(i);if([192,193,194].includes(m))return {width:bytes.readUInt16BE(i+5),height:bytes.readUInt16BE(i+3)};i+=n;}throw Error("Missing JPEG dimensions");}
async function capture(page,job,output){
 await page.setViewportSize({width:1280,height:1500});
 await page.goto(base+job.source,{waitUntil:"domcontentloaded"});
 let target;
 if(job.figure){
  const figure='[data-figure="'+job.figure+'"]';await page.locator(figure).scrollIntoViewIfNeeded();
  await page.waitForFunction(s=>document.querySelector(s)?.classList.contains("js-ready"),figure);
  for(const[key,value]of Object.entries(job.settings))await input(page,figure+' [data-param="'+key+'"]',value);
  if(job.figure==="inverse")await page.waitForFunction(()=>{const f=document.querySelector('[data-figure="inverse"]');return f.dataset.curveReady==="true"&&+f.dataset.curvesReady>=4;},null,{timeout:120000});
  if(job.figure==="barycentric"||job.figure==="icnn")await page.waitForFunction(s=>document.querySelector(s).dataset.ready==="true",figure,{timeout:60000});
  await mount(page,figure);target=page.locator("#summary-capture");
 }else{
  await page.waitForFunction(()=>document.querySelector("#status").textContent.length>10);
  for(const[key,value]of Object.entries(job.settings))await input(page,"#"+key,value);
  if(job.kind==="attention"){
   await page.waitForFunction(()=>document.querySelector("#results").getAttribute("aria-busy")==="false");
   await page.addStyleTag({content:"#results{display:grid;grid-template-columns:1fr 1fr;gap:16px}.metrics{display:none!important}.plot canvas,.error-panel canvas{height:330px!important}main{max-width:none!important;padding:0!important}.eyebrow,.intro,.formula,.controls,.status,.caveat{display:none!important}"});
   await mount(page,"main");
  }else{
   await page.addStyleTag({content:"main{max-width:none!important;padding:0!important}.eyebrow,.intro,.controls,.playback,.metrics,.method,noscript{display:none!important}.density-panel canvas{height:210px!important}.lower-plots canvas{height:300px!important}.lower-plots{grid-template-columns:1fr 1fr!important}"});
   await mount(page,"main");
  }target=page.locator("#summary-capture");
 }
 await page.waitForTimeout(450);
 const status=await page.locator("#summary-capture").innerText();
 if(/NaN|Infinity|Numerical error/.test(status))throw Error("Non-finite figure "+job.slug);
 let bytes;
 if(job.crop==="sinkhorn"){
  const box=await page.locator('#summary-capture canvas').boundingBox();
  bytes=await page.screenshot({type:"jpeg",quality:88,clip:{x:box.x,y:box.y+box.height*.495,width:box.width,height:box.height*.505}});
 }else bytes=await target.screenshot({type:"jpeg",quality:88,animations:"disabled"});
 if(bytes.length>1000000)throw Error("Image exceeds Bluesky limit "+job.slug);
 bytes=stripMetadata(bytes);fs.writeFileSync(output,bytes);const size=dimensions(bytes);
 return {path:"/blog/imgs/summaries/"+job.slug+".jpg",alt:job.alt,...size,source:job.source,settings:job.settings};
}
module.exports={jobs,capture,dimensions};
if(require.main===module)(async()=>{
 const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
 const only=process.argv.indexOf("--only"),selected=only<0?jobs:jobs.filter(job=>job.slug===process.argv[only+1]);
 if(!selected.length)throw Error("No matching capture job");
 const browser=await chromium.launch({headless:true,channel:"chrome"}),images=only>=0&&fs.existsSync("/private/tmp/blog-summary-native.json")?JSON.parse(fs.readFileSync("/private/tmp/blog-summary-native.json","utf8")).images:{};
 try{const page=await browser.newPage({deviceScaleFactor:1,reducedMotion:"reduce"});for(const job of selected){images[job.slug]=await capture(page,job,path.join(root,"blog/imgs/summaries",job.slug+".jpg"));console.log("Captured",job.slug,images[job.slug].width,images[job.slug].height);}}
 finally{await browser.close();}
 fs.writeFileSync("/private/tmp/blog-summary-native.json",JSON.stringify({version:1,images},null,2)+"\n");
})().catch(e=>{console.error(e);process.exitCode=1;});
