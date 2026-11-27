"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const {articleSource}=require("./blog-article-source.js");
const G = require("../blog/preparations/assets/optimization-geometry/core.js");
const close = (a, b, tol = 1e-10) => assert.ok(Math.abs(a-b) <= tol*Math.max(1,Math.abs(a),Math.abs(b)), `${a} != ${b}`);
// Independent symmetric Jacobi diagonalization of J*J (12 parameters), not the
// closed-form eigenvalue list used in the display.
function eigenvalues(matrix) {
  const a=matrix.map(row=>row.slice()),n=a.length;
  for(let sweep=0;sweep<2000;sweep++) {
    let p=0,q=1,largest=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>largest){largest=Math.abs(a[i][j]);p=i;q=j;}
    if(largest<1e-12)break;
    const angle=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(angle),s=Math.sin(angle);
    const app=a[p][p],aqq=a[q][q],apq=a[p][q];
    a[p][p]=c*c*app-2*c*s*apq+s*s*aqq;a[q][q]=s*s*app+2*c*s*apq+c*c*aqq;a[p][q]=a[q][p]=0;
    for(let k=0;k<n;k++)if(k!==p&&k!==q){const x=a[k][p],y=a[k][q];a[k][p]=a[p][k]=c*x-s*y;a[k][q]=a[q][k]=s*x+c*y;}
  }
  return a.map((row,i)=>row[i]).sort((x,y)=>x-y);
}
for (const z of [-2, -.01, 0, .02, 3]) for (const lambda of [-4, -.1, 0, .7, 5]) {
  const {a,b,mobility} = G.scalarFactors(z,lambda);
  close(a*b,z);close(a*a-b*b,lambda);close(a*a+b*b,mobility);
  close(-((z-1.3)*b)*b-a*((z-1.3)*a),G.scalarVelocity(z,lambda,1.3));
}
for (const lambda of [0,.2,2,4]) {
  const path=G.scalarTrajectory(.05,lambda,1.3,5,1000);
  path.forEach((p,i)=>{close(p.a*p.b,p.z);close(p.a*p.a-p.b*p.b,lambda);assert.ok(p.z<=1.3+1e-12);if(i)assert.ok(p.z>=path[i-1].z);});
  const refined=G.scalarTrajectory(.05,lambda,1.3,5,2000);
  close(path[1000].z,refined[2000].z,2e-9);
  // Independent RK4 integration of the original two-factor ODE.
  let {a,b}=path[0];const h=.0005;
  const f=(x,y)=>[-(x*y-1.3)*y,-(x*y-1.3)*x];
  for(let k=0;k<10000;k++){
    const p=f(a,b),q=f(a+h*p[0]/2,b+h*p[1]/2),r=f(a+h*q[0]/2,b+h*q[1]/2),s=f(a+h*r[0],b+h*r[1]);
    a+=h*(p[0]+2*q[0]+2*r[0]+s[0])/6;b+=h*(p[1]+2*q[1]+2*r[1]+s[1])/6;
  }
  close(a,path[1000].a,2e-8);close(b,path[1000].b,2e-8);
}
for(const s of [.25,.5,1,2,4]) {
  const c=G.lowRankCondition(s);close(c.kappa,4*(s*s+s**-2)/Math.min(s*s,s**-2));close(c.kappa,G.lowRankCondition(1/s).kappa);assert.ok(c.kappa>=8);
  assert.equal(c.eigenvalues.length,8);
  const {A,B}=G.lowRankFactors(s);close(G.lowRankLossGradient(A,B).loss,0);
  const J=Array.from({length:9},()=>Array(12).fill(0));
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<2;k++){J[3*i+j][2*i+k]=B[k][j];J[3*i+j][6+3*k+j]=A[i][k];}
  const H=Array.from({length:12},(_,i)=>Array.from({length:12},(_,j)=>J.reduce((sum,row)=>sum+row[i]*row[j],0)));
  const spectrum=eigenvalues(H),expected=[0,0,0,0,...c.eigenvalues].sort((x,y)=>x-y);
  spectrum.forEach((x,i)=>close(x,expected[i],3e-10));
  const tr=G.lowRankTrajectory(s,4000);
  assert.equal(tr.result[0].relative,1);assert.ok(tr.result[4000].relative<.004);
  tr.result.forEach((p,i)=>{assert.ok(Number.isFinite(p.loss)&&p.loss>=0);if(i)assert.ok(p.loss<=tr.result[i-1].loss+1e-20);if(p.linearized>1e-9)assert.ok(Math.abs(p.relative/p.linearized-1)<.003);});
  const a=G.lowRankFactors(s,.001),grad=G.lowRankLossGradient(a.A,a.B),h=1e-6;
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){
    a.A[i][j]+=h;const plus=G.lowRankLossGradient(a.A,a.B).loss;a.A[i][j]-=2*h;const minus=G.lowRankLossGradient(a.A,a.B).loss;a.A[i][j]+=h;
    close((plus-minus)/(2*h),grad.gA[i][j],1e-8);
  }
  for(let i=0;i<2;i++)for(let j=0;j<3;j++){
    a.B[i][j]+=h;const plus=G.lowRankLossGradient(a.A,a.B).loss;a.B[i][j]-=2*h;const minus=G.lowRankLossGradient(a.A,a.B).loss;a.B[i][j]+=h;
    close((plus-minus)/(2*h),grad.gB[i][j],1e-8);
  }
}
const ca=G.pairConstants(),cs=G.pairConstants(20,.01,true);
close(ca.kappa2,100);close(cs.kappa2,100);close(ca.kappainf,1901);close(cs.kappainf,119);
// Check the exact l-infinity smoothness by independently enumerating all cube vertices.
for (const spread of [false,true]) {
  const c=G.pairConstants(8,.03,spread);let max=0;
  for(let mask=0;mask<256;mask++){const x=Array.from({length:8},(_,i)=>(mask>>i)&1?1:-1);max=Math.max(max,G.dot(x,G.pairGradient(x,.03,spread)));}
  close(max,c.Linf);
}
for(const mode of ["soft","mixed","hard"]) {
  const axis=G.initialDirection(20,mode),spread=G.rotateToSpread(axis);
  close(G.norm(axis),1);close(G.norm(spread),1);
  const ga=G.pairGradient(axis),gs=G.pairGradient(spread,.01,true);
  G.rotateToSpread(ga).forEach((u,i)=>close(u,gs[i]));
  const gd0=G.signTrajectory({method:"gd",mode}),gd1=G.signTrajectory({method:"gd",mode,spread:true});
  gd0.result.forEach((p,i)=>close(p.relative,gd1.result[i].relative,3e-12));
  for(const spread of [false,true])for(const method of ["gd","sign"]){
    const tr=G.signTrajectory({spread,method,mode});
    close(tr.result[0].relative,1);
    tr.result.forEach((p,i)=>{assert.ok(p.relative<=p.bound+1e-12);if(i)assert.ok(p.loss<=tr.result[i-1].loss+1e-14);});
    assert.ok(tr.result.at(-1).relative<.4);
  }
}
assert.throws(()=>G.lowRankCondition(0),RangeError);assert.throws(()=>G.pairConstants(3),RangeError);assert.throws(()=>G.signTrajectory({method:"unscaled"}),RangeError);
const posts=["intrinsic-factor-training-dynamics","balanced-low-rank-conditioning","sign-gradient-descent-geometry"];
for(const slug of posts){
  const article=articleSource(slug),html=article.source;
  if(article.published){assert.match(html,/^proofs: true$/m);assert.match(html,/^embedded_experiment: true$/m);}
  else{assert.ok(html.includes('content="noindex,follow"'));assert.ok(html.includes("Alpha preview · Work in progress"));}
  const keywords=article.keywords;
  assert.ok(keywords.length>=22);assert.equal(new Set(keywords).size,keywords.length);
  const ids=new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]));
  for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(m[1]),slug+" missing "+m[1]);
  for(const m of html.matchAll(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g))assert.ok(!m[0].includes("<"),slug+" has unescaped HTML inside math");
  assert.ok(!html.includes("\u0000"));assert.ok(!html.includes("PLACEHOLDER"));
}
console.log("Optimization geometry: scalar invariants and independent factor ODE, Hessian spectra, gradient checks, local training, isospectral rotations, smoothness constants, and descent bounds passed.");

async function signGeometryBrowser(frame) {
  await frame.waitForFunction(() => window.SignGeometryApp?.getState().trajectories.length === 2);
  const geometry = frame.locator("#exponent"), iteration = frame.locator("#iteration");
  const step = frame.locator("#step-size");
  const reference = frame.locator("#show-euclidean");
  const exponents = await frame.evaluate(() => window.SignGeometryCore.exponents);
  const seeds = [[.90,.66],[-.77,.83],[-1.13,-.39],[.62,-.94],[1.09,-.28]];
  assert.equal(exponents[0], 1);
  assert.equal(exponents.at(-1), Infinity);
  for (const [key,value] of [["min",.1],["max",1.9],["step",.05],["value",1]]) {
    assert.equal(+(await step.getAttribute(key)),value);
  }
  const horizon = +(await iteration.getAttribute("max"));
  assert.ok(horizon >= 20);

  async function setRange(input, value) {
    await input.evaluate((el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event("input", {bubbles:true}));
    }, value);
  }
  const drawn = () => frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // The shared browser harness runs each slider through its endpoints before
  // entering this helper. Restore the default for the prior comparisons.
  await setRange(step,1);
  await frame.waitForFunction(() => SignGeometryApp.getState().multiplier===1);

  // Rendered pixels, rather than just the computed state, must change as the
  // slider moves. Compare each plot before and after revealing a trajectory.
  async function pixels(id) {
    return frame.locator(id).evaluate(canvas => {
      const {width, height} = canvas.getBoundingClientRect();
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      const palette = SignGeometryView.runColors.map(color=>parseInt(color.slice(1),16));
      const paletteCounts = palette.map(()=>0);
      let hash = 2166136261;
      for (let i=0; i<data.length; i+=4) {
        const color = (data[i]<<16) | (data[i+1]<<8) | data[i+2];
        if (data[i+3] && i%44===0) colors.add(color);
        const index = palette.indexOf(color);
        if (index>=0 && data[i+3]===255) paletteCounts[index]++;
        hash = Math.imul(hash^color, 16777619);
      }
      return {width, height, colors: colors.size, hash, paletteCounts};
    });
  }

  const ids = ["#axis-plot", "#rotated-plot"];
  for (const id of [...ids, "#loss-plot"]) await frame.locator(id).waitFor({state:"visible"});
  await setRange(iteration, 0);
  await frame.waitForFunction(() => SignGeometryApp.getState().iteration === 0);
  await drawn();
  const atStart = await Promise.all(ids.map(pixels));
  for (const plot of atStart) {
    assert.ok(plot.width >= 150 && Math.abs(plot.width-plot.height) <= 1, "objective plot is a visible square");
    assert.ok(plot.colors > 8, "objective contours and filled bands are painted");
  }
  close(atStart[0].width, atStart[1].width);
  assert.notEqual(atStart[0].hash, atStart[1].hash, "the rotated contours and starting position differ");

  const firstSteps = [], firstPlotHashes = new Set();
  await setRange(iteration, 6);
  for (const p of [1, 1.5, 2, Infinity]) {
    const index = exponents.indexOf(p);
    assert.notEqual(index, -1);
    await setRange(geometry, index);
    await frame.waitForFunction(({p, k}) => {
      const s=SignGeometryApp.getState();
      return s.iteration===k && s.p===p;
    }, {p, k:6});
    const state = await frame.evaluate(() => SignGeometryApp.getState());
    assert.equal(await reference.isDisabled(),p===2);
    assert.ok(state.eta > 0 && Number.isFinite(state.eta));
    assert.equal(state.trajectories.length, 2);
    assert.doesNotMatch(await frame.locator("#metrics").innerText(), /NaN|undefined|Infinity/);
    for (const {hessian:[a,b,c], runs} of state.trajectories) {
      // The same eigenvalues .16 and 1 have the same trace and determinant.
      close(a+c, 1.16);
      close(a*c-b*b, .16);
      assert.equal(runs.length, seeds.length);
      for (const {selected,euclidean} of runs) {
        for (const path of [selected, euclidean]) {
          assert.equal(path.length, horizon+1);
          path.forEach(({x, y, loss}, i) => {
            assert.ok([x,y,loss].every(Number.isFinite) && loss>=0);
            close(loss, .5*(a*x*x+2*b*x*y+c*y*y));
            if(i)assert.ok(loss<=path[i-1].loss+1e-12);
          });
        }
        close(selected[0].x, euclidean[0].x);
        close(selected[0].y, euclidean[0].y);
        if(p===2)selected.forEach(({x,y},i)=>{close(x,euclidean[i].x);close(y,euclidean[i].y);});
        if(p===1)selected.slice(1).forEach(({x,y},i)=>assert.ok(x===selected[i].x || y===selected[i].y));
        if(p===Infinity)close(Math.abs(selected[1].x-selected[0].x),Math.abs(selected[1].y-selected[0].y));
      }
    }
    const [axis,rotated] = state.trajectories;
    assert.ok(Math.abs(axis.hessian[1])<1e-12 && Math.abs(rotated.hessian[1])>.3);
    const c = Math.cos(rotated.angle), s = Math.sin(rotated.angle);
    axis.runs.forEach(({euclidean}, j) => {
      close(euclidean[0].x,seeds[j][0]); close(euclidean[0].y,seeds[j][1]);
      euclidean.forEach(({x,y,loss},i) => {
        const other=rotated.runs[j].euclidean[i];
        close(other.x,c*x-s*y); close(other.y,s*x+c*y); close(other.loss,loss);
      });
    });
    firstSteps.push(axis.runs[0].selected[1]);
    await drawn();
    firstPlotHashes.add((await pixels(ids[0])).hash);
  }
  assert.equal(firstPlotHashes.size, firstSteps.length, "each tested geometry changes the rendered path");
  for(let i=0;i<firstSteps.length;i++)for(let j=0;j<i;j++) {
    assert.ok(Math.hypot(firstSteps[i].x-firstSteps[j].x, firstSteps[i].y-firstSteps[j].y)>1e-3,
      "changing the ℓp geometry changes the first iterate");
  }
  for (const [i,id] of ids.entries()) {
    await frame.waitForFunction(({id, previous}) => {
      const canvas = document.querySelector(id);
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (let j=0; j<data.length; j+=4) hash=Math.imul(hash^((data[j]<<16)|(data[j+1]<<8)|data[j+2]),16777619);
      return hash!==previous;
    }, {id, previous:atStart[i].hash});
  }
  await setRange(iteration, horizon);
  await frame.waitForFunction(horizon => SignGeometryApp.getState().iteration === horizon, horizon);
  await setRange(iteration, 6);
  await drawn();

  // All five trajectory colors are painted on both canvases, and focus and
  // reference controls change both state and the visible plot.
  async function checkLossReadout(focus, withReference=false) {
    const {iteration,trajectories}=await frame.evaluate(()=>SignGeometryApp.getState());
    const metrics=await frame.locator("#metrics").innerText();
    const get=(label)=>Number(metrics.match(new RegExp(label+String.raw`: ([\d.e-]+)`,"i"))?.[1].replace(/\.$/,""));
    const check=(label,runs,key)=>{
      const visible=focus===null?runs:[runs[focus]];
      const expected=visible.reduce((sum,run)=>sum+run[key][iteration].loss/run[key][0].loss,0)/visible.length;
      const displayed=get(label);
      assert.ok(Math.abs(displayed-expected)<=.006*expected,`${label} ${displayed} != ${expected}`);
    };
    check("aligned",trajectories[0].runs,"selected");
    check("rotated",trajectories[1].runs,"selected");
    if(withReference)check(String.raw`Euclidean \(both\)`,trajectories[0].runs,"euclidean");
  }
  const palette = await frame.evaluate(() => SignGeometryView.runColors);
  assert.equal(new Set(palette).size, seeds.length);
  const all = await Promise.all(ids.map(pixels));
  all.forEach(({paletteCounts})=>assert.ok(paletteCounts.every(n=>n>0),"five paths must be painted"));
  await checkLossReadout(null);
  const focus = frame.locator("[data-start='2']"), showAll = frame.locator("[data-start='all']");
  assert.equal(await showAll.getAttribute("aria-pressed"), "true");
  assert.equal(await reference.isChecked(), false);
  await focus.click();
  await frame.waitForFunction(() => SignGeometryApp.getState().focus === 2);
  assert.equal(await focus.getAttribute("aria-pressed"), "true");
  assert.equal(await showAll.getAttribute("aria-pressed"), "false");
  await drawn();
  const focused = await Promise.all(ids.map(pixels));
  focused.forEach(({hash,paletteCounts},i)=>{
    assert.notEqual(hash,all[i].hash,"focus must change displayed paths");
    assert.ok(paletteCounts.every((n,j)=>j===2?n>0:n===0),"only the focused path is painted");
  });
  await checkLossReadout(2);

  await reference.check();
  await frame.waitForFunction(() => SignGeometryApp.getState().showReference === true);
  await drawn();
  const withReference = await Promise.all(ids.map(pixels));
  withReference.forEach(({hash},i)=>assert.notEqual(hash,focused[i].hash,"reference toggle must change displayed paths"));
  await checkLossReadout(2,true);

  const baselineLoss = (await pixels("#loss-plot")).hash;
  const baseline = await frame.evaluate(() => SignGeometryApp.getState());
  await setRange(step,.4);
  await frame.waitForFunction(() => SignGeometryApp.getState().multiplier===.4);
  const changed = await frame.evaluate(() => SignGeometryApp.getState());
  assert.equal(changed.p,Infinity);
  assert.equal(changed.iteration,6);
  assert.equal(changed.focus,2);
  assert.equal(changed.showReference,true);
  close(changed.eta,.2);
  close(changed.referenceEta,.4);
  assert.match(await frame.locator("#step-size-value").innerText(),/0\.40×.*η = 0\.2/);
  assert.match(await step.getAttribute("aria-valuetext"),/0\.40 times default.*step size 0\.2/);
  changed.trajectories.forEach(({hessian:[a,b,c],runs},i)=>{
    const {selected,euclidean}=runs[2];
    const {x,y}=selected[0], gx=a*x+b*y, gy=b*x+c*y;
    const scale=Math.abs(gx)+Math.abs(gy);
    close(selected[1].x,x-.2*scale*Math.sign(gx));
    close(selected[1].y,y-.2*scale*Math.sign(gy));
    close(euclidean[1].x,x-.4*gx);
    close(euclidean[1].y,y-.4*gy);
    const before=baseline.trajectories[i].runs[2].selected[6];
    assert.ok(Math.hypot(selected[6].x-before.x,selected[6].y-before.y)>.01,"the current point moves");
  });
  await drawn();
  (await Promise.all(ids.map(pixels))).forEach(({hash},i)=>assert.notEqual(hash,withReference[i].hash));
  assert.notEqual((await pixels("#loss-plot")).hash,baselineLoss,"step changes must redraw the loss chart");
  await checkLossReadout(2,true);

  for (const [key,value] of [["Home",.1],["End",1.9]]) {
    await step.press(key);
    await frame.waitForFunction(value=>SignGeometryApp.getState().multiplier===value,value);
    const state=await frame.evaluate(()=>SignGeometryApp.getState());
    close(state.eta,value/2);
    close(state.referenceEta,value);
    for(const {runs} of state.trajectories)for(const {selected,euclidean} of runs) {
      for(const path of [selected,euclidean])path.slice(1).forEach(({loss},i)=>{
        assert.ok(Number.isFinite(loss) && loss<=path[i].loss+1e-12);
      });
    }
  }
  await setRange(geometry,exponents.indexOf(2));
  await frame.waitForFunction(()=>SignGeometryApp.getState().p===2);
  const euclideanStep=await frame.evaluate(()=>SignGeometryApp.getState());
  close(euclideanStep.eta,1.9);
  close(euclideanStep.referenceEta,1.9);
  assert.equal(euclideanStep.showReference,false);
  const [axis,rotated]=euclideanStep.trajectories, co=Math.cos(rotated.angle), si=Math.sin(rotated.angle);
  axis.runs.forEach(({selected},j)=>selected.forEach(({x,y,loss},i)=>{
    const other=rotated.runs[j].selected[i];
    close(other.x,co*x-si*y); close(other.y,si*x+co*y); close(other.loss,loss);
    const reference=axis.runs[j].euclidean[i];
    close(x,reference.x); close(y,reference.y);
  }));
  await setRange(geometry,exponents.indexOf(Infinity));
  await setRange(step,1);
  await reference.uncheck();
  await showAll.click();
  await frame.waitForFunction(() => {
    const {focus,showReference}=SignGeometryApp.getState();
    return focus===null && !showReference;
  });
  await drawn();
}

// Optional browser pass:
// BLOG_OPTIMIZATION_BROWSER=1 BLOG_PLAYWRIGHT_PATH=/path/to/playwright
// BLOG_PREVIEW_URL=http://127.0.0.1:PORT node tests/blog-optimization-geometry.test.js
if(process.env.BLOG_OPTIMIZATION_BROWSER==="1") (async()=>{
  const {chromium}=require(process.env.BLOG_PLAYWRIGHT_PATH||"playwright");
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const base=process.env.BLOG_PREVIEW_URL||"http://127.0.0.1:4196",errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1200,height:1000},reducedMotion:"reduce"});
    page.on("pageerror",e=>errors.push(e.message));
    for(const [index,slug] of posts.entries()){
      await page.setViewportSize({width:1200,height:1000});
      const response=await page.goto(base+articleSource(slug).url);assert.equal(response.status(),200);
      await page.waitForFunction(()=>window.MathJax?.isReady,{}, {timeout:45000});await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
      assert.ok(await page.evaluate(()=>MathJax.Hub.getAllJax().length)>20);assert.equal(await page.locator(".MathJax_Error,.merror").count(),0);
      assert.ok(await page.locator("details.blog-proof").evaluateAll(nodes=>nodes.every(n=>!n.open)));
      await page.evaluate(()=>document.querySelectorAll("details.blog-proof").forEach(n=>n.open=true));await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
      const frameEl=page.locator("iframe.idea-experiment");await frameEl.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector("iframe.idea-experiment").dataset.ready==="true");
      const frame=await(await frameEl.elementHandle()).contentFrame();await frame.waitForSelector("#metrics");
      if(index<=1){assert.equal(await frame.locator("#play").getAttribute("aria-pressed"),"false");assert.equal(await frame.locator("#time").inputValue(),"0");}
      const sliders=frame.locator("input[type=range]");
      for(let i=0;i<await sliders.count();i++)for(const endpoint of ["min","max"]){await sliders.nth(i).evaluate((el,endpoint)=>{el.value=el[endpoint];el.dispatchEvent(new Event("input",{bubbles:true}));},endpoint);assert.ok(!/NaN|Infinity|undefined/.test(await frame.locator("#metrics").innerText()));}
      if(index<=1){await frame.getByRole("button",{name:"Reset time"}).click();await frame.getByRole("button",{name:"Play",exact:true}).click();await page.waitForTimeout(250);assert.ok(+(await frame.locator("#time").inputValue())>0);await frame.getByRole("button",{name:"Pause",exact:true}).click();}
      if(index===1){const s=await frame.evaluate(()=>LowRankConditioningApp.getState());assert.equal(s.paths.length,3);for(const p of s.paths){close(p.current.a*p.current.b,p.current.z);close(p.current.a*p.current.a-p.current.b*p.current.b,p.lambda);close(p.current.kappa,(p.current.sigmaMax/p.current.sigmaMin)**2);}assert.equal(await frame.locator("canvas").count(),3);}
      if(index===2){
        await signGeometryBrowser(frame);
        if(process.env.BLOG_SCREENSHOT_DIR)await frameEl.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,slug+"-desktop.png")});
      }
      for(const width of [1200,375,320]){
        await page.setViewportSize({width,height:1000});
        await page.waitForFunction(() => {
          const el=document.querySelector("iframe.idea-experiment");
          return el.clientHeight>=el.contentDocument.documentElement.scrollHeight-2;
        }, null, {timeout:5000});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+" page overflow "+width);
        assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+" frame overflow "+width);
        if(index===2){
          const squares=await frame.locator("#plots canvas").evaluateAll(nodes=>nodes.map(node=>{
            const {width,height}=node.getBoundingClientRect();return {width,height};
          }));
          assert.equal(squares.length,2);
          assert.ok(squares.every(({width,height})=>width>150&&Math.abs(width-height)<=1),slug+" non-square contours at "+width);
        }
      }
      if(process.env.BLOG_SCREENSHOT_DIR)await frameEl.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,slug+"-mobile.png")});
      console.log("Optimization geometry browser passed:",slug);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
