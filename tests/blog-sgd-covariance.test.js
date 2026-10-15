"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const filename = path.join(__dirname, "../blog/preparations/assets/sgd-covariance-core.js");
const S = require(filename);
const close = (a,b,tolerance=3e-12) => assert.ok(
  Math.abs(a-b) <= tolerance*Math.max(1,Math.abs(a),Math.abs(b)),
  a+" != "+b
);
const relativeClose = (a,b,tolerance=3e-11) => assert.ok(
  Math.abs(a-b) <= tolerance*Math.max(Math.abs(a),Math.abs(b)),
  a+" != "+b+" (relative)"
);
const vectorClose = (a,b,tolerance) => a.forEach((v,i)=>close(v,b[i],tolerance));
const norm = v => Math.hypot(...v);

const browser = {window:{}};
vm.runInNewContext(fs.readFileSync(filename,"utf8"),browser);
close(browser.window.SGDCovariance.parameters(1,.5,.05).stationary[0],
  S.parameters(1,.5,.05).stationary[0]);

// Derive the update independently from Gaussian fourth moments:
// E[(X'MX)XX']=tr(GM)G+2GMG for M=diag(v).
function fourthMomentStep(v,lambdas,eta,sigma2) {
  const trace = lambdas[0]*v[0]+lambdas[1]*v[1];
  return v.map((value,i)=>value-4*eta*lambdas[i]*value
    +4*eta*eta*(trace*lambdas[i]+2*lambdas[i]*lambdas[i]*value)
    +4*eta*eta*sigma2*lambdas[i]);
}

for (const lambda1 of [.3,1,4]) for (const lambda2 of [.05,.3,1,5]) {
  const R=lambda1+lambda2+2*Math.max(lambda1,lambda2);
  for (const fraction of [.001,.01,.1,.5,.9,.99]) for(const sigma2 of [0,.3,2]) {
    const eta=fraction/R,p=S.parameters(lambda1,lambda2,eta,sigma2);
    close(p.R,R);close(p.maxSafeStep,1/R);
    close(p.A[0][0],1-4*eta*lambda1+12*eta*eta*lambda1*lambda1);
    close(p.A[1][1],1-4*eta*lambda2+12*eta*eta*lambda2*lambda2);
    close(p.A[0][1],4*eta*eta*lambda1*lambda2);
    assert.equal(p.A[0][1],p.A[1][0]);
    assert.ok(p.eigenvalues.every(v=>v>0 && v<1));
    assert.ok(p.stationaryResidual < 1e-12*Math.max(1,norm(p.forcing)));
    vectorClose(fourthMomentStep(p.stationary,p.lambdas,eta,sigma2),p.stationary);
    let v=[0,0],previous=[0,0];
    for(let k=0;k<180;k++) {
      const t=S.state(lambda1,lambda2,eta,sigma2,k);
      vectorClose(t.variances,v);
      assert.ok(t.variances.every((x,i)=>x>=0 && x<=p.stationary[i]+1e-12));
      assert.ok(t.variances.every((x,i)=>x>=previous[i]-1e-12));
      assert.deepEqual(t.covariance,[[t.variances[0],0],[0,t.variances[1]]]);
      assert.equal(t.time,k*eta);
      vectorClose(t.leadingTransient,p.lambdas.map(lambda=>
        eta*sigma2*(1-Math.exp(-4*lambda*k*eta))));
      previous=t.variances;
      v=fourthMomentStep(v,p.lambdas,eta,sigma2);
    }
    const longRun=S.state(lambda1,lambda2,eta,sigma2,100000).variances;
    const remaining=norm(longRun.map((v,i)=>p.stationary[i]-v));
    const bound=Math.exp(100000*p.logSpectralRadius)*norm(p.stationary);
    assert.ok(remaining<=bound*(1+1e-9)+1e-13*Math.max(1,norm(p.stationary)));
  }
}

// Isotropic dimension two: both variances follow a scalar affine recursion.
for (const lambda of [.2,1,10]) for(const fraction of [.01,.3,.8,.99]) {
  const eta=fraction/(4*lambda),sigma2=1.7;
  const stationary=eta*sigma2/(1-4*eta*lambda);
  const logContraction=Math.log1p(-4*eta*lambda+16*eta*eta*lambda*lambda);
  const p=S.parameters(lambda,lambda,eta,sigma2);
  p.stationary.forEach(v=>relativeClose(v,stationary));
  for(const k of [0,1,2,10,100,100000]) {
    const expected=stationary*(-Math.expm1(k*logContraction));
    S.state(lambda,lambda,eta,sigma2,k).variances.forEach(v=>close(v,expected));
    vectorClose(S.state(lambda,lambda*(1+1e-12),eta,sigma2,k).variances,
      [expected,expected],3e-10);
  }
}

// Small-eta stationary errors are respectively order eta^2 and eta^3.
const stationaryErrors=[];
for(const eta of [.004,.002,.001,.0005]) {
  const p=S.parameters(1,.2,eta,.7);
  stationaryErrors.push([
    norm(p.stationary.map((v,i)=>v-p.firstOrder[i])),
    norm(p.stationary.map((v,i)=>v-p.secondOrder[i]))
  ]);
  assert.ok(p.stationary.every((v,i)=>v>=p.secondOrder[i]));
}
for(let i=1;i<stationaryErrors.length;i++) {
  close(stationaryErrors[i-1][0]/stationaryErrors[i][0],4,.015);
  close(stationaryErrors[i-1][1]/stationaryErrors[i][1],8,.015);
}

// Fixed physical time, with exact integer k=t/eta, has transient error O(eta^2).
const transientErrors=[];
for(const eta of [.005,.0025,.00125,.000625]) {
  const t=S.state(1,.25,eta,1,Math.round(2/eta));
  assert.equal(t.time,2);
  transientErrors.push(norm(t.variances.map((v,i)=>v-t.leadingTransient[i])));
}
for(let i=1;i<transientErrors.length;i++) {
  close(transientErrors[i-1]/transientErrors[i],4,.02);
}

// Tiny eta must not make the first covariance disappear by rounding A to I.
for(const eta of [1e-12,1e-20]) {
  const t=S.state(1,.2,eta,2,1);
  relativeClose(t.variances[0],4*eta*eta*2);
  relativeClose(t.variances[1],4*eta*eta*2*.2);
}

// Noise scaling, common feature scaling, and exchange of coordinates.
for(const k of [0,1,7,100000]) {
  const base=S.state(1,.2,.07,.3,k);
  const noise=S.state(1,.2,.07,.9,k);
  const scale=S.state(7,1.4,.01,.3,k);
  const swapped=S.state(.2,1,.07,.3,k);
  vectorClose(noise.variances,base.variances.map(v=>3*v));
  vectorClose(scale.variances,base.variances.map(v=>v/7));
  vectorClose(swapped.variances,[base.variances[1],base.variances[0]]);
  vectorClose(scale.leadingTransient,base.leadingTransient.map(v=>v/7));
}

const trajectory=S.trajectory(1,.5,.1,.3,12);
assert.equal(trajectory.length,13);
trajectory.forEach((t,k)=>assert.deepEqual(t,S.state(1,.5,.1,.3,k)));
for(const args of [[0,1,.1],[1,-1,.1],[1,1,0],[1,1,.25],[1,1,.3],[1,1,.1,-1]]) {
  assert.throws(()=>S.parameters(...args),RangeError);
}
assert.throws(()=>S.state(1,1,.1,1,-1),RangeError);
assert.throws(()=>S.state(1,1,.1,1,1.5),RangeError);
assert.throws(()=>S.trajectory(1,1,.1,1,1.5),RangeError);
console.log("SGD covariance: exact Gaussian moments, stationarity, isotropy, small-step orders, scaling, and stable transient evaluation passed.");
