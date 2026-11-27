"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const C=require("../blog/preparations/assets/clt-distribution-core.js");
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../blog/preparations/assets/ot-lab/data.js"),"utf8"),context);
const ns=Array.from(context.window.BLOG_DATA.clt.n);

function close(a,b,tolerance=3e-14){
  assert.ok(Number.isFinite(a)&&Number.isFinite(b));
  assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
}
function simpson(f,a,b,count){
  let result=f(a)+f(b);
  for(let j=1;j<count;j++)result+=(j%2?4:2)*f(a+(b-a)*j/count);
  return result*(b-a)/(3*count);
}

close(C.normalPdf(0),1/Math.sqrt(2*Math.PI));
close(C.normalPdf(2),C.normalPdf(-2));
close(C.normalPdf(Infinity),0);

// Independent binomial formula for small n; high-n normalization and moments
// are checked using atom centers, not the artificial widths of drawn bars.
for(const n of ns){
  const distribution=C.bernoulli(n),{bars,width}=distribution;
  assert.equal(bars.length,n+1);close(width,2/Math.sqrt(n));
  let mass=0,mean=0,variance=0,fourth=0,coefficient=1;
  bars.forEach((bar,k)=>{
    assert.ok(bar.mass>=0 && bar.height>=0 && Number.isFinite(bar.height));
    close(bar.center,(2*k-n)/Math.sqrt(n));
    close(bar.right-bar.left,width);
    close(bar.height*width,bar.mass);
    close(bar.mass,bars[n-k].mass);
    if(n<=16){close(bar.mass,coefficient/2**n);coefficient*=((n-k)/(k+1));}
    mass+=bar.mass;mean+=bar.mass*bar.center;
    variance+=bar.mass*bar.center**2;fourth+=bar.mass*bar.center**4;
  });
  close(mass,1);close(mean,0);close(variance,1);close(fourth,3-2/n,5e-14);
}

// Closed-form continuous-uniform and triangular CDFs.
for(let j=0;j<=200;j++){
  const x=-3+6*j/200;
  close(C.uniformCdf(1,x),Math.max(0,Math.min(1,.5+x/(2*Math.sqrt(3)))));
  const t=1+x/Math.sqrt(6);
  const triangular=t<=0?0:t>=2?1:t<=1?t*t/2:1-(2-t)**2/2;
  close(C.uniformCdf(2,x),triangular);
}

// References computed independently from the exact alternating polynomial
// sum (-1)^j binom(n,j)(t-j)^n/n!, at 250 decimal digits. The browser does
// not use this ill-conditioned formula; it uses positive CDF recurrences.
for(const [n,x,expected] of [
  [3,-1,0.16666666666666666],
  [4,-.5,0.314700608453314],
  [8,-2,0.02201923460593164],
  [32,-1.25,0.10616980733133308],
  [64,-2,0.022664923506519323],
  [154,-.7,0.24214201285103584],
  [192,-1,0.1587814916744706],
  [192,-4.5,3.082869656872807e-6]
])close(C.uniformCdf(n,x),expected,2e-15);

const edges=Array.from({length:37},(_,i)=>-4.5+i*.25);
for(const n of ns){
  let previous=0;
  for(let j=0;j<=100;j++){
    const x=-5+j*.1,cdf=C.uniformCdf(n,x);
    assert.ok(cdf>=0 && cdf<=1 && cdf>=previous-1e-15);
    close(cdf+C.uniformCdf(n,-x),1);previous=cdf;
  }
  close(C.uniformCdf(n,-Math.sqrt(3*n)-.01),0);
  close(C.uniformCdf(n,Math.sqrt(3*n)+.01),1);
  const {bars,totalMass,leftTail,rightTail,omittedMass}=C.uniform(n,edges);
  assert.equal(bars.length,36);
  bars.forEach((bar,i)=>{
    assert.ok(bar.mass>=0 && Number.isFinite(bar.mass));
    close(bar.height*(bar.right-bar.left),bar.mass);
    close(bar.mass,bars[35-i].mass);
    close(bar.left,edges[i]);close(bar.right,edges[i+1]);
  });
  close(totalMass+omittedMass,1);close(leftTail,rightTail);
}

// Genuine omitted tails, not a histogram renormalized to fit the viewport.
const tail=C.uniform(192,edges);
close(tail.omittedMass,2*3.082869656872807e-6,1e-18);
assert.ok(tail.totalMass<1);
const restricted=C.uniform(4,[-1,-.1,.4,1.5]);
close(restricted.totalMass,C.uniformCdf(4,1.5)-C.uniformCdf(4,-1));
close(restricted.leftTail,C.uniformCdf(4,-1));
close(restricted.rightTail,1-C.uniformCdf(4,1.5));

// Continuous inputs still have variance one. Integrate their continuous CDF,
// not the coarse histogram, using E[X^2]=4 integral_0^infinity x P(X>x) dx.
for(const n of [1,2,4,64,192]){
  const variance=4*simpson(x=>x*C.uniformCdf(n,-x),0,Math.sqrt(3*n),3072);
  close(variance,1,2e-9);
}

// Both standardized laws approach the same density scale without changing
// amplitudes by hand; the residual bin average for uniform stays O(width^2).
const centerError=n=>{
  const b=C.bernoulli(n).bars[n/2];return Math.abs(b.height-C.normalPdf(0));
};
assert.ok(centerError(192)<centerError(64));
const histogramError=n=>C.uniform(n,edges).bars.reduce((sum,b)=>sum+Math.abs(b.height-C.normalPdf(b.center))*(b.right-b.left),0);
assert.ok(histogramError(192)<histogramError(4));

for(const invalid of [0,-1,1.5,Infinity,NaN,4097]){
  assert.throws(()=>C.bernoulli(invalid),RangeError);
  assert.throws(()=>C.uniformCdf(invalid,0),RangeError);
}
assert.throws(()=>C.uniformCdf(2,NaN),RangeError);
for(const invalid of [[],[1],[0,0],[1,0],[0,Infinity]])assert.throws(()=>C.uniform(2,invalid),RangeError);

console.log("CLT distribution bars: exact binomial masses, continuous Irwin–Hall CDFs, normalization, moments, tails, high-precision fixtures, and Gaussian convergence passed.");
