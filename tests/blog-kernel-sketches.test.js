"use strict";
const assert=require("node:assert/strict");
const K=require("../blog/preparations/assets/kernel-sketches/core.js");
const close=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const sum=values=>values.reduce((a,b)=>a+b,0);

assert.deepEqual(K.domain,[-2,2]);assert.deepEqual(K.colorRange,[-2,2]);
for(const p of [.5,1,1.5,2]){
  const short=K.createSamples(p,16,42),long=K.createSamples(p,64,42);
  assert.deepEqual(short.draws,long.draws.slice(0,16));
  assert.deepEqual(short,K.createSamples(p,16,42));
  if(p===2)assert.ok(long.draws.every(draw=>draw.logLambda===0));
  const quadratic=[.4,-.8,.2,.7,-.1],points=[-2,-.9,0,.4,2];
  for(const method of ["positive","fourier"]){
    let form=0;
    for(let i=0;i<points.length;i++)for(let j=0;j<points.length;j++){
      const value=K.evaluatePair(points[i],points[j],long)[method];
      form+=quadratic[i]*quadratic[j]*value;
      if(method==="positive")assert.ok(value>=0);
    }
    assert.ok(form>=-1e-12,"A sampled Gram matrix must remain PSD");
  }
}
// All slider positions use the same underlying independent Gaussian/phase
// draws; only the stable scale changes with p.
const half=K.createSamples(.5,32),gaussian=K.createSamples(2,32);
for(let i=0;i<32;i++){
  assert.equal(half.draws[i].z,gaussian.draws[i].z);
  assert.equal(half.draws[i].phase,gaussian.draws[i].phase);
}

// At a=1/2 Kanter's formula reduces independently to
// Lambda=1/(4 E cos^2(U/2)).
for(const u of [.1,.8,1.5,2.4,3])for(const e of [.1,1,4]){
  close(Math.exp(K.stableLogScale(.5,u,e)),1/(4*e*Math.cos(u/2)**2));
}
assert.equal(K.stableLogScale(1,1,1),0);

// Bounded Laplace integrands give a well-conditioned independent Monte Carlo
// test of the stable scale normalization; no moments of Lambda are assumed.
for(const p of [.5,1,1.5,2]){
  const samples=K.createSamples(p,65536,12345),a=p/2;
  for(const t of [.1,1,3]){
    const estimate=sum(samples.draws.map(draw=>Math.exp(-t*Math.exp(draw.logLambda))))/samples.r;
    close(estimate,Math.exp(-(t**a)),.006);
  }
  for(const [x,y] of [[-.4,.4],[-.8,.3],[.5,.5]]){
    const estimate=K.evaluatePair(x,y,samples);
    close(estimate.fourier,estimate.exact,.014);
    // At opposite coordinates the positive product is bounded, eliminating
    // its otherwise infinite-variance issue for generalized Gaussians.
    if(x===-y)close(estimate.positive,estimate.exact,.006);
  }
}

function simpson(fn,left,right,n=4096){
  const step=(right-left)/n;let result=fn(left)+fn(right);
  for(let i=1;i<n;i++)result+=(i%2?4:2)*fn(left+i*step);
  return result*step/3;
}
const normal=z=>Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
// Conditional on each fixed Lambda, independently integrate over Z and
// the random Fourier phase. Both feature maps represent exp(-Lambda(x-y)^2).
for(const lambda of [.2,1,2])for(const [x,y] of [[-.4,.3],[.2,.4],[.3,.3]]){
  const target=Math.exp(-lambda*(x-y)**2);
  const positive=simpson(z=>{
    const draw={logLambda:Math.log(lambda),z,phase:0};
    return normal(z)*K.positiveFeature(x,draw)*K.positiveFeature(y,draw);
  },-10,10);
  close(positive,target,1e-10);
  const fourier=simpson(z=>{
    let phaseAverage=0;
    for(let i=0;i<16;i++){
      const draw={logLambda:Math.log(lambda),z,phase:2*Math.PI*(i+.5)/16};
      phaseAverage+=K.fourierFeature(x,draw)*K.fourierFeature(y,draw)/16;
    }
    return normal(z)*phaseAverage;
  },-10,10,1024);
  close(fourier,target,1e-10);
}

// Display values are genuine estimates, not clipped or projected to positivity.
for(const p of [.5,.55,1,1.5,1.95,2])for(const r of [1,4,64,2048]){
  const grid=K.compute(p,r,{size:33}),n=grid.size;
  assert.equal(grid.stats.positive.negativeFraction,0);
  for(const method of ["exact","positive","fourier"]){
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      const value=grid[method][i*n+j];
      assert.ok(Number.isFinite(value));
      assert.equal(value,grid[method][j*n+i]);
    }
  }
  const samples=K.createSamples(p,r);
  for(const [i,j] of [[0,0],[0,16],[6,29],[16,16],[32,0]]){
    const pair=K.evaluatePair(grid.xs[j],grid.xs[i],samples);
    for(const method of ["exact","positive","fourier"])close(grid[method][i*n+j],pair[method]);
  }
  assert.equal(grid.positive[16*n+16],1,"Positive features equal one at the fixed origin");
  assert.ok(grid.stats.fourier.min>=-2 && grid.stats.fourier.max<=2);
}
const initial=K.compute(1,64);
assert.ok(initial.stats.fourier.min<-.01,"The fixed initial Fourier sketch exhibits negative entries");
assert.equal(initial.stats.positive.negativeFraction,0);
assert.deepEqual(initial,K.compute(1,64));
const saturated=K.compute(2,2048,{size:33});
assert.ok(saturated.stats.positive.max>2,"Values above the palette must not be clipped");
close(saturated.stats.positive.saturatedFraction,
  Array.from(saturated.positive).filter(value=>value>2).length/saturated.positive.length);
close(initial.stats.fourier.rmse,Math.sqrt(sum(Array.from(initial.fourier,(value,i)=>(value-initial.exact[i])**2))/initial.fourier.length));
for(const p of [.5,2])assert.ok(K.compute(p,4096,{size:17}).positive.every(Number.isFinite));

// Ordinary floating-point underflow may produce zero, but no negative
// positive feature; its numerical value is not artificially floored.
assert.equal(K.positiveFeature(1,{logLambda:1500,z:1}),0);
assert.equal(K.positiveFeature(0,{logLambda:1500,z:1}),1);
for(const invalid of [0,.49,2.01,NaN,Infinity])assert.throws(()=>K.compute(invalid,4),RangeError);
for(const invalid of [0,-1,1.5,4097])assert.throws(()=>K.compute(1,invalid),RangeError);
for(const invalid of [2,258,3.5])assert.throws(()=>K.compute(1,4,{size:invalid}),RangeError);

console.log("Kernel sketches: stable-scale normalization, exact conditional features, PSD, positivity, fixed prefixes, genuine signed values and finite grids passed.");
console.log("Default fixed-seed diagnostics:",JSON.stringify(initial.stats));
