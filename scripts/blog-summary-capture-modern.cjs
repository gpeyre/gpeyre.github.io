/* Capture existing, deterministic numerical experiments; never redraw their data. */
"use strict";
const fs = require("fs"), path = require("path");
const {stripMetadata,dimensions}=require("./blog-summary-jpeg.cjs");
const { chromium } = require(process.env.BLOG_PLAYWRIGHT_PATH || "/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const jobs = [
  {slug:"balanced-low-rank-conditioning",source:"blog/preparations/assets/optimization-geometry/index.html?topic=lowrank",alt:"Exact Hessian condition number versus factor scale and local gradient-descent losses for balanced and unbalanced factorizations.",settings:{factor_scale:2,iterations:1800}},
  {slug:"c-transforms-and-averaging",source:"blog/preparations/assets/transport-geometry/c-transform.html",alt:"Averaged cost profiles, their cost transform, and the nonzero gap to the double transform for a cubic cost.",settings:{p:3,grid_points:241,preset:"symmetric"}},
  {slug:"convex-max-softmax-approximation",source:"blog/preparations/convex-max-softmax-approximation.html",alt:"Independently Adam-trained convex max-affine and smooth log-sum-exp approximation surfaces, shown with identical lighting and height scales.",settings:{width:6,temperature:"automatic",optimizer:"Adam, 2000 steps"}},
  {slug:"hump-algebra",source:"blog/preparations/assets/hump-algebra/index.html",alt:"Contour plots of two five-bump Gaussian mixtures and their product, with separate labelled color scales showing the product's narrower overlapping peaks.",settings:{bumps:5,phase:.18,separate_scales:true,grid:181,paused:true}},
  {slug:"intrinsic-factor-training-dynamics",source:"blog/preparations/assets/optimization-geometry/index.html?topic=intrinsic",alt:"Factor-space paths along conserved-imbalance hyperbolas and the product evolution at three different imbalances.",settings:{time:1.7,largest_imbalance:2,initial_product:.06}},
  {slug:"lagrangian-density-interpolation",source:"blog/preparations/assets/new-dynamics/index.html?topic=moser",alt:"Moser interpolation halfway between multimodal periodic densities: transported particles alongside speed and flux directions.",settings:{time:.5,particles:420,uniform_background:.14}},
  {slug:"langevin-without-a-potential",source:"blog/preparations/assets/new-dynamics/index.html?topic=langevin",alt:"Circulating Ornstein–Uhlenbeck particles approaching the stationary Gaussian ellipse, with drift arrows and recent particle trails.",settings:{time:1.4,particles:180,circulation:1.4,noise:.55}},
  {slug:"projections-corrections-reflections",source:"blog/preparations/assets/projection-lab/index.html",alt:"A Sudoku solved by product-space Douglas–Rachford reflections: teal clues and the verified completed grid, beside the violation and unrounded-residual histories.",settings:{puzzle:0,seed:1,stop:"first independently checked valid Sudoku"}},
  {slug:"sign-gradient-descent-geometry",source:"blog/preparations/assets/optimization-geometry/index.html?topic=sign",alt:"Ordinary and scaled sign-gradient descent losses for two isospectral quadratics, with the soft eigendirection aligned or spread across coordinates.",settings:{iterations:1200,initial_direction:"mixed"}},
  {slug:"spectral-wasserstein-distances",source:"blog/preparations/assets/spectral-transport/index.html",alt:"Spectral Wasserstein coupling between two irregular point clouds and the ellipse of their displacement second moment for Schatten exponent two.",settings:{points:48,p:2,time:.5}},
  {slug:"stable-fluids",source:"blog/preparations/assets/new-dynamics/index.html?topic=fluids",alt:"A stirred periodic Stable Fluids simulation: transported teal dye beside the velocity field and signed vorticity.",settings:{steps:18,time_step:.035,viscosity:.0008,dye_diffusivity:.00015,stirring:"four deterministic pointer-drag passes"}},
  {slug:"wasserstein-singular-vectors",source:"blog/preparations/assets/transport-geometry/wasserstein-vectors.html",alt:"Input translated histograms, the learned circular feature geometry, and feature/sample cost matrices after sixteen exact transport-transform cycles.",settings:{family:"periodic translations",cycles:16,regularization:.1}}
];
async function range(page,id,value,type="input") {
  await page.locator("#"+id).evaluate((el,{value,type})=>{el.value=String(value);el.dispatchEvent(new Event(type,{bubbles:true}));},{value,type});
}
async function frame(page, selectors, css="") {
  await page.evaluate(({selectors,css})=>{
    const blocks=selectors.map(s=>{const el=document.querySelector(s);if(!el)throw new Error("Missing capture panel "+s);return el;});
    const shell=document.createElement("div");shell.id="summary-capture";
    for(const el of blocks)shell.append(el);document.body.append(shell);
    const style=document.createElement("style");style.textContent=`body{margin:0!important;background:#f8fbfb!important}body>*:not(#summary-capture){display:none!important}#summary-capture{box-sizing:border-box;width:1200px;padding:22px;background:#f8fbfb;color:#24333b}#summary-capture h2,#summary-capture h3,#summary-capture h4{font:600 17px/1.4 system-ui!important;margin:0 0 10px!important}#summary-capture .caption,#summary-capture .panel>p:not(.legend){display:none!important}#summary-capture .legend{margin:12px 0 0!important;font:14px/1.5 system-ui!important}#summary-capture canvas{max-width:100%;border-radius:5px}#summary-capture .plots,#summary-capture .panels,#summary-capture .panel-grid{gap:20px!important}#summary-capture .panel-grid h4{margin-bottom:10px!important}`+css;document.head.append(style);
    window.dispatchEvent(new Event("resize"));
  },{selectors,css});
  await page.waitForTimeout(350);
}
async function capture(page,job,output,base="http://127.0.0.1:4197/") {
  const errors=[];const onError=e=>errors.push(e.message);page.on("pageerror",onError);
  await page.setViewportSize({width:1280,height:1000});
  await page.goto(new URL(job.source,base).href,{waitUntil:"domcontentloaded",timeout:60000});
  await page.locator("canvas").first().waitFor({state:"visible",timeout:30000});
  if(job.slug==="convex-max-softmax-approximation"){
    await page.locator("#max-surfaces").scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector("#max-experiment")?.dataset.trainingState==="ready",{},{timeout:180000});
    await frame(page,["#max-surfaces .panel-grid"],"#summary-capture .plot-surface{aspect-ratio:1.08!important}");
    await range(page,"max-azimuth",-45);await range(page,"max-elevation",30);
  } else if(job.slug==="hump-algebra"){
    await page.waitForFunction(()=>window.HumpAlgebraApp);
    await range(page,"bumps",job.settings.bumps);
    await range(page,"phase",job.settings.phase);
    await page.locator("#separate-scales").setChecked(job.settings.separate_scales);
    await frame(page,["#landscapes","#scale-note"],"#summary-capture .landscapes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}#summary-capture .panel-note{display:block!important}");
    const state=await page.evaluate(()=>HumpAlgebraApp.getState());
    if(state.playing||state.productTerms!==25||state.residual>1e-12)throw Error("Invalid Gaussian product capture state");
  } else if(job.slug==="wasserstein-singular-vectors"){
    await page.waitForFunction(()=>document.querySelector("#status")?.textContent.startsWith("16 cycles computed"),{},{timeout:180000});
    await frame(page,[".panels"],"#summary-capture .panels{grid-template-columns:repeat(4,1fr)!important;align-items:start}#summary-capture .panel{padding:8px!important}#summary-capture canvas{aspect-ratio:1!important}#summary-capture h2{font-size:14px!important}");
    await range(page,"iteration",16);
  } else if(job.slug==="spectral-wasserstein-distances"){
    await page.waitForFunction(()=>document.querySelector("#status")?.dataset.state==="ready",{},{timeout:120000});
    await frame(page,[".top-plots"],"#summary-capture .top-plots{grid-template-columns:1.45fr 1fr}#summary-capture canvas{height:430px!important}");
    await range(page,"time",.5);
  } else if(job.slug==="c-transforms-and-averaging"){
    await range(page,"p",3);
    await frame(page,[".panels"],"#summary-capture .panels{grid-template-columns:repeat(3,1fr)!important}#summary-capture canvas{aspect-ratio:1.05!important}");
    await range(page,"p",3);
  } else if(job.slug==="projections-corrections-reflections"){
    await page.waitForFunction(()=>window.ProjectionDemo);
    await page.locator("#puzzle").selectOption(String(job.settings.puzzle));
    await page.locator("#seed").fill(String(job.settings.seed));
    await page.locator("#seed").dispatchEvent("change");
    await frame(page,['section[aria-labelledby="sudoku-title"]'],`
      #summary-capture .panel{display:grid;grid-template-columns:470px 1fr;gap:12px 30px;padding:22px;margin:0}
      #summary-capture #sudoku-title{grid-column:1/-1;font-size:23px!important;margin-bottom:12px!important}
      #summary-capture .controls,#summary-capture .buttons,#summary-capture #status,#summary-capture .metrics,#summary-capture .method{display:none!important}
      #summary-capture .board-layout{display:contents}
      #summary-capture #board{width:440px;max-width:440px;height:440px}
      #summary-capture .cell{font-size:27px}
      #summary-capture .plots{display:grid;grid-template-columns:1fr;gap:16px!important;margin:0}
      #summary-capture .plots canvas{height:165px!important}
      #summary-capture .plots h3{font-size:16px!important;margin-bottom:4px!important}
      #summary-capture .legend{font-size:12px!important;margin:0!important}
    `);
    await page.evaluate(()=>{
      for(let k=0;k<5000&&!ProjectionDemo.getDiagnostic().solved;k++)document.querySelector("#step").click();
      const diagnostic=ProjectionDemo.getDiagnostic();
      if(!diagnostic.solved||diagnostic.violations!==0)throw Error("Sudoku capture did not reach a valid board");
    });
  } else if(["balanced-low-rank-conditioning","intrinsic-factor-training-dynamics","sign-gradient-descent-geometry"].includes(job.slug)){
    const selectors=[".panels",job.slug==="intrinsic-factor-training-dynamics"?"#legend":".legend"];
    await frame(page,selectors);
    if(job.slug==="intrinsic-factor-training-dynamics")await range(page,"time",1.7);
    await page.evaluate(()=>window.dispatchEvent(new Event("resize")));
  } else {
    await frame(page,["#plots"],job.slug==="langevin-without-a-potential"?"#summary-capture .wide{aspect-ratio:1.9!important}":"#summary-capture .plots canvas{aspect-ratio:1.15!important}");
    if(job.slug==="lagrangian-density-interpolation")await range(page,"time",120);
    if(job.slug==="langevin-without-a-potential")await range(page,"time",1.4);
    if(job.slug==="stable-fluids"){
      const box=await page.locator("canvas").first().boundingBox();
      const x=box.x+box.width*.2,y=box.y+box.height*.65;
      for(let pass=0;pass<4;pass++){
        await page.mouse.move(x,y);await page.mouse.down();
        for(let i=0;i<35;i++){const t=i/34;await page.mouse.move(box.x+box.width*(.2+.6*t),box.y+box.height*(.55+.19*Math.sin(2*Math.PI*t)),{steps:1});}
        await page.mouse.up();
      }
      await page.evaluate(()=>{for(let i=0;i<18;i++)document.querySelector("#step").click();});
    }
  }
  await page.waitForTimeout(650);
  const diagnostics=await page.locator("#summary-capture canvas").evaluateAll(canvases=>canvases.map(c=>{
    const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let min=255,max=0,colored=0;for(let i=0;i<d.length;i+=16){min=Math.min(min,d[i],d[i+1],d[i+2]);max=Math.max(max,d[i],d[i+1],d[i+2]);if(Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])>15)colored++;}
    return{width:c.width,height:c.height,min,max,colored};
  }));
  if(!diagnostics.length||diagnostics.some(d=>!Number.isFinite(d.width)||d.width<100||d.height<100||d.max-d.min<40||d.colored<20))throw new Error("Blank or invalid numerical canvas: "+JSON.stringify(diagnostics));
  if(errors.length)throw new Error("Experiment JavaScript failure: "+errors.join("; "));
  const box=await page.locator("#summary-capture").boundingBox();
  if(box.width>4096||box.height>4096)throw new Error("Oversized screenshot");
  const bytes=stripMetadata(await page.locator("#summary-capture").screenshot({type:"jpeg",quality:88,animations:"disabled"}));
  fs.writeFileSync(output,bytes);
  if(fs.statSync(output).size>1000000)throw new Error("Image exceeds Bluesky byte limit");
  page.off("pageerror",onError);
  const capture_state=job.slug==="projections-corrections-reflections"?await page.evaluate(()=>({iteration:ProjectionDemo.getState().iteration,solved:ProjectionDemo.getDiagnostic().solved,violations:ProjectionDemo.getDiagnostic().violations,consensus_residual:ProjectionDemo.getDiagnostic().consensus,clue_residual:ProjectionDemo.getDiagnostic().clue})):undefined;
  return{slug:job.slug,path:"blog/imgs/summaries/"+job.slug+".jpg",...dimensions(bytes),alt:job.alt,source:job.source,settings:job.settings,diagnostics,...(capture_state?{capture_state}:{})};
}
module.exports={jobs,capture};
if(require.main===module)(async()=>{
  const args=process.argv.slice(2),get=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const base=get("--base","http://127.0.0.1:4197/"),out=get("--out-dir",path.join(__dirname,"../blog/imgs/summaries")),manifest=get("--manifest","/private/tmp/blog-summary-modern.json"),only=get("--only","");
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:"chrome"});const result=[];
  try{const page=await browser.newPage({deviceScaleFactor:1});for(const job of jobs.filter(j=>!only||j.slug===only)){const record=await capture(page,job,path.join(out,job.slug+".jpg"),base);result.push(record);fs.writeFileSync(manifest,JSON.stringify(result,null,2)+"\n");console.log(job.slug+" "+record.width+"×"+record.height);}}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
