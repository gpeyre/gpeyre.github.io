"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
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
  const html=fs.readFileSync(path.join(__dirname,"../blog/preparations",slug+".html"),"utf8");
  assert.ok(html.includes('content="noindex,follow"'));assert.ok(html.includes("Alpha preview · Work in progress"));
  const keywords=html.match(/<meta name="keywords" content="([^"]+)"/)[1].split(",").map(x=>x.trim());
  assert.ok(keywords.length>=22);assert.equal(new Set(keywords).size,keywords.length);
  const ids=new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]));
  for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(m[1]),slug+" missing "+m[1]);
  for(const m of html.matchAll(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g))assert.ok(!m[0].includes("<"),slug+" has unescaped HTML inside math");
  assert.ok(!html.includes("\u0000"));assert.ok(!html.includes("PLACEHOLDER"));
}
console.log("Optimization geometry: scalar invariants and independent factor ODE, Hessian spectra, gradient checks, local training, isospectral rotations, smoothness constants, and descent bounds passed.");

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
      const response=await page.goto(base+"/blog/preparations/"+slug+".html");assert.equal(response.status(),200);
      await page.waitForFunction(()=>window.MathJax?.isReady,{}, {timeout:45000});await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
      assert.ok(await page.evaluate(()=>MathJax.Hub.getAllJax().length)>20);assert.equal(await page.locator(".MathJax_Error,.merror").count(),0);
      assert.ok(await page.locator("details.blog-proof").evaluateAll(nodes=>nodes.every(n=>!n.open)));
      await page.evaluate(()=>document.querySelectorAll("details.blog-proof").forEach(n=>n.open=true));await page.evaluate(()=>new Promise(resolve=>MathJax.Hub.Queue(resolve)));
      const frameEl=page.locator("iframe.idea-experiment");await frameEl.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector("iframe.idea-experiment").dataset.ready==="true");
      const frame=await(await frameEl.elementHandle()).contentFrame();await frame.waitForSelector("#metrics");
      if(index===0){assert.equal(await frame.locator("#play").getAttribute("aria-pressed"),"false");assert.equal(await frame.locator("#time").inputValue(),"0");}
      const sliders=frame.locator("input[type=range]");
      for(let i=0;i<await sliders.count();i++)for(const endpoint of ["min","max"]){await sliders.nth(i).evaluate((el,endpoint)=>{el.value=el[endpoint];el.dispatchEvent(new Event("input",{bubbles:true}));},endpoint);assert.ok(!/NaN|Infinity|undefined/.test(await frame.locator("#metrics").innerText()));}
      if(index===0){await frame.getByRole("button",{name:"Reset time"}).click();await frame.getByRole("button",{name:"Play",exact:true}).click();await page.waitForTimeout(250);assert.ok(+(await frame.locator("#time").inputValue())>0);await frame.getByRole("button",{name:"Pause",exact:true}).click();}
      if(index===2)for(const mode of ["soft","hard","mixed"]){await frame.locator("#direction").selectOption(mode);assert.ok(!/NaN|Infinity|undefined/.test(await frame.locator("#metrics").innerText()));}
      for(const width of [1200,375,320]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+" page overflow "+width);assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+" frame overflow "+width);const dims=await frameEl.evaluate(el=>({height:el.clientHeight,content:el.contentDocument.documentElement.scrollHeight}));assert.ok(dims.height>=dims.content-2,slug+" iframe clipping");}
      if(process.env.BLOG_SCREENSHOT_DIR)await frameEl.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,slug+"-mobile.png")});
      console.log("Optimization geometry browser passed:",slug);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
