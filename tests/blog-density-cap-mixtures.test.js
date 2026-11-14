"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const M=require("../blog/preparations/assets/ot-lab/core.js");
const close=(a,b,tol=1e-11)=>assert.ok(Math.abs(a-b)<=tol,`${a} differs from ${b}`);
const normal=M.gaussianMixture1D([0],[1],1);
close(normal.density(0),1/Math.sqrt(2*Math.PI));close(normal.cdf(0),.5);
close(normal.quantile(.5),0);close(normal.cdf(1),.8413447460685429);
for(const r of [1e-9,1e-7,.001,.1,.5,.9,.999,1-1e-7,1-1e-9])close(normal.cdf(normal.quantile(r)),r,3e-15);
assert.throws(()=>normal.quantile(0),RangeError);assert.throws(()=>normal.quantile(1),RangeError);
assert.throws(()=>M.gaussianMixture1D([0],[.8],1),RangeError);
assert.throws(()=>M.gaussianMixture1D([0],[1],0),RangeError);
close(M.gaussianMixtureDensityCap(normal),1/Math.sqrt(2*Math.PI));
assert.throws(()=>M.gaussianMixtureDensityCap(normal,0),RangeError);
const overlap=M.gaussianMixture1D([-.4,.1,.6],[.2,.5,.3],.7);
let overlapPeak=0;
for(let j=0;j<=20000;j++)overlapPeak=Math.max(overlapPeak,overlap.density(-3+6*j/20000));
const overlapCap=M.gaussianMixtureDensityCap(overlap);
assert.ok(overlapCap>=overlapPeak);assert.ok(overlapCap<=1.001*overlapPeak);
assert.ok(M.gaussianMixtureDensityCap(overlap,2048)<=M.gaussianMixtureDensityCap(overlap,1024)+1e-14);

const cases=[...Array.from({length:8},(_,i)=>[i+1,i+1]),[1,8],[8,1],[3,5]];
for(const sigma of [.1,.22,.32])for(const [sourceCount,targetCount] of cases){
  const scene=M.gaussianDensityCapScene(sigma,501,sourceCount,targetCount);
  assert.equal(scene.sourceCount,sourceCount);assert.equal(scene.targetCount,targetCount);
  assert.equal(scene.source.means.length,sourceCount);assert.equal(scene.target.means.length,targetCount);
  if(sourceCount===2){assert.deepEqual(scene.source.means,[-1.5,.2]);assert.deepEqual(scene.source.weights,[.55,.45]);}
  if(targetCount===2){assert.deepEqual(scene.target.means,[-.2,1.5]);assert.deepEqual(scene.target.weights,[.4,.6]);}
  for(const law of [scene.source,scene.target]){
    close(M.sum(law.weights),1);assert.ok(law.weights.every(w=>w>0));
    // Independent spatial integration of the entire localized mixture.
    const n=16000,lo=Math.min(...law.means)-9*sigma,hi=Math.max(...law.means)+9*sigma,dx=(hi-lo)/n;
    let integral=.5*(law.density(lo)+law.density(hi));
    for(let j=1;j<n;j++)integral+=law.density(lo+j*dx);
    close(integral*dx,1,2e-13);
    const ownCap=M.gaussianMixtureDensityCap(law);let peak=0;
    for(let j=0;j<=4000;j++){
      const value=law.density(lo+j*(hi-lo)/4000);assert.ok(value<=ownCap+1e-12);peak=Math.max(peak,value);
    }
    assert.ok(ownCap<=1.002*peak,"Certified cap must stay close to the true peak");
    assert.ok(ownCap<=scene.cap+1e-12);
    for(const r of [1e-9,1e-6,.01,.4,.5,.55,.6,.9,1-1e-9])close(law.cdf(law.quantile(r)),r,3e-15);
    const x=.1,h=1e-6;close((law.cdf(x+h)-law.cdf(x-h))/(2*h),law.density(x),3e-10);
  }
  assert.ok(scene.r[0]<=scene.tail);assert.ok(scene.r.at(-1)>=1-scene.tail);
  for(let j=1;j<scene.r.length;j++){
    assert.ok(scene.r[j]>scene.r[j-1]);assert.ok(scene.q0[j]>scene.q0[j-1]);assert.ok(scene.q1[j]>scene.q1[j-1]);
  }
  for(const t of [0,.01,.2,.5,.83,.99,1]){
    const current=M.gaussianDensityCapGeodesic(scene,t);
    assert.ok(current.peak>0 && current.peak<=scene.cap+1e-12);
    for(let j=0;j<current.points.length;j++){
      const [x,rho]=current.points[j];assert.ok(Number.isFinite(x) && Number.isFinite(rho) && rho>0);
      close(x,(1-t)*scene.q0[j]+t*scene.q1[j]);
      // The density is a weighted harmonic mean, so it cannot exceed the
      // larger of the endpoint densities at these matched mass ranks.
      assert.ok(rho<=Math.max(scene.d0[j],scene.d1[j])+1e-12);
      if(t===0)close(rho,scene.source.density(x));
      if(t===1)close(rho,scene.target.density(x));
      if(j)assert.ok(x>current.points[j-1][0]);
    }
  }
}
const defaults=M.gaussianDensityCapScene();assert.equal(defaults.sourceCount,2);assert.equal(defaults.targetCount,2);
const single=M.gaussianDensityCapScene(.22,501,1,1);
for(const t of [0,.5,1]){
  const law=M.gaussianMixture1D([-.65+1.3*t],[1],.22),current=M.gaussianDensityCapGeodesic(single,t);
  for(const [x,rho] of current.points)close(rho,law.density(x),2e-13);
}
assert.throws(()=>M.gaussianDensityCapScene(.5),RangeError);
for(const count of [0,9,1.5,NaN,Infinity]){
  assert.throws(()=>M.gaussianDensityCapScene(.22,501,count,2),RangeError);
  assert.throws(()=>M.gaussianDensityCapScene(.22,501,2,count),RangeError);
}
assert.throws(()=>M.gaussianDensityCapScene(.22,1,2,2),RangeError);
assert.throws(()=>M.gaussianDensityCapGeodesic(M.gaussianDensityCapScene(),1.1),RangeError);

const root=path.resolve(__dirname,".."),app=fs.readFileSync(path.join(root,"blog/preparations/assets/ot-lab/app.js"),"utf8");
const caps=app.match(/function caps\(\)\{([\s\S]*?)\nfunction independence\(\)/)[1];
assert.match(caps,/\[0,1\.025\*cap\]/);assert.match(caps,/Gaussian bandwidth/);
assert.match(caps,/slider\("Source components k₀",1,8,2,1\)/);
assert.match(caps,/slider\("Target components k₁",1,8,2,1\)/);
assert.doesNotMatch(caps,/Quantile modulation|At halfway|density is uniform/);
const post=require("./blog-article-source.js").articleSource("wasserstein-geodesics-density-caps").body;
assert.match(post,/Separate sliders select the source and target component counts/);assert.match(post,/without renormalization/);
console.log("Gaussian-mixture density caps: counts1–8, asymmetric counts, normalization, CDF inversion, tails, monotonicity, exact endpoints, certified interval bounds, and tight plotting scale passed.");
