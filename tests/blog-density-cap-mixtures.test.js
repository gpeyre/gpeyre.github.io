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

for(const sigma of [.1,.155,.22,.275,.32]){
  const scene=M.gaussianDensityCapScene(sigma);
  for(const law of [scene.source,scene.target]){
    assert.equal(law.means.length,2);close(M.sum(law.weights),1);
    // Independent spatial integration of the entire localized mixture.
    const n=16000,lo=-5,hi=5,dx=(hi-lo)/n;
    let integral=.5*(law.density(lo)+law.density(hi));
    for(let j=1;j<n;j++)integral+=law.density(lo+j*dx);
    close(integral*dx,1,2e-13);
    for(let j=0;j<=2000;j++)assert.ok(law.density(lo+j*(hi-lo)/2000)<=scene.cap+1e-12);
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
assert.throws(()=>M.gaussianDensityCapScene(.5),RangeError);
assert.throws(()=>M.gaussianDensityCapGeodesic(M.gaussianDensityCapScene(),1.1),RangeError);

const root=path.resolve(__dirname,".."),app=fs.readFileSync(path.join(root,"blog/preparations/assets/ot-lab/app.js"),"utf8");
const caps=app.match(/function caps\(\)\{([\s\S]*?)\nfunction independence\(\)/)[1];
assert.match(caps,/\[0,1\.025\*cap\]/);assert.match(caps,/Gaussian bandwidth/);
assert.doesNotMatch(caps,/Quantile modulation|At halfway|density is uniform/);
const post=fs.readFileSync(path.join(root,"blog/preparations/wasserstein-geodesics-density-caps.html"),"utf8");
assert.match(post,/mixtures of two localized Gaussians/);assert.match(post,/without renormalization/);
console.log("Gaussian-mixture density caps: normalization, CDF inversion, tails, monotonicity, exact endpoints, harmonic bound, and tight nonnegative plotting scale passed.");
