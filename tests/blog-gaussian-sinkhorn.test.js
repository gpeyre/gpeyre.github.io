"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const filename = path.join(__dirname, "../blog/preparations/assets/gaussian-sinkhorn-core.js");
const G = require(filename);
const close = (a, b, tolerance = 2e-12) => assert.ok(
  Math.abs(a-b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)),
  a + " != " + b
);
const relativeClose = (a, b, tolerance = 2e-10) => assert.ok(
  Math.abs(a-b) <= tolerance * Math.max(Math.abs(a), Math.abs(b)),
  a + " != " + b + " (relative)"
);

// Browser and CommonJS exports implement the same API.
const browser = {window: {}};
vm.runInNewContext(fs.readFileSync(filename, "utf8"), browser);
close(browser.window.GaussianSinkhorn.parameters(1, 1, .1).q, G.parameters(1, 1, .1).q);

for (const a of [.2, 1, 7]) for (const b of [.3, 1, 4]) {
  for (const epsilon of [.001, .01, .1, 1, 10]) {
    const p = G.parameters(a, b, epsilon);
    close(p.rho*p.rho + p.delta*p.rho, 1);
    close(p.q, p.rho**4);
    close(p.logq, -4*Math.asinh(p.delta/2));
    close(p.sStar, epsilon*Math.sqrt(a/b)*p.rho);
    close(p.sMinus, -epsilon*Math.sqrt(a/b)/p.rho);
    close(G.step(p.sStar, a, b, epsilon), p.sStar);
    close(p.sStar + b*p.sStar*p.sStar/(epsilon*epsilon), a);
    // Independently differentiate the stated fractional-linear map.
    const derivative = a*a*b*b / (b*p.sStar + a*b + epsilon*epsilon)**2;
    close(derivative, p.q);

    for (const initialRatio of [.02, .5, 1, 2, 20]) {
      let s = initialRatio*p.sStar, previousKL = Infinity;
      for (let k=0; k<=60; k++) {
        const t = G.state(a, b, epsilon, initialRatio, k);
        close(t.s, s);
        assert.ok(t.s > 0 && t.xVariance > 0 && t.determinant > 0);
        assert.equal(t.jointCov[1][1], b);
        assert.equal(t.jointCov[0][1], t.jointCov[1][0]);
        close(t.crossCov, b*t.s/epsilon);
        close(t.xVariance, t.s + b*t.s*t.s/(epsilon*epsilon));
        const determinant = t.xVariance*b - t.crossCov*t.crossCov;
        assert.ok(determinant > 0, "the actual displayed covariance must be positive definite");
        assert.ok(Math.abs(determinant-b*t.s) <= 16*Number.EPSILON*
          (t.xVariance*b+t.crossCov*t.crossCov+b*t.s),
          "determinant agrees to the precision allowed by cancellation");
        assert.ok(t.kl >= 0 && t.kl <= previousKL + 1e-11);
        previousKL = t.kl;
        close(t.logCrossRatioReduction, k*p.logq);
        if (initialRatio === 1) {
          assert.equal(t.relativeConditionalError, 0);
          assert.equal(t.logRelativeError, -Infinity);
          assert.equal(t.kl, 0);
          assert.equal(t.logKL, -Infinity);
          assert.equal(t.xVariance, a);
        } else {
          const z0 = (initialRatio*p.sStar-p.sStar)/(initialRatio*p.sStar-p.sMinus);
          close(t.crossRatio, z0*Math.exp(k*p.logq));
          if (Math.abs(t.relativeConditionalError)>1e-7) {
            relativeClose(t.u-1, t.relativeConditionalError, 1e-8);
            close(Math.log(Math.abs(t.u-1)), t.logRelativeError, 1e-8);
          }
        }
        // A separate direct recurrence, not the core's step implementation.
        s = a*(b*s+epsilon*epsilon)/(b*s+a*b+epsilon*epsilon);
      }
    }
  }
}

// Independent two-dimensional Gaussian KL from inverse matrices/determinants.
function matrixKL(target, current) {
  const det0 = target[0][0]*target[1][1]-target[0][1]**2;
  const det1 = current[0][0]*current[1][1]-current[0][1]**2;
  const trace = (current[1][1]*target[0][0] + current[0][0]*target[1][1]
    - 2*current[0][1]*target[0][1])/det1;
  return .5*(trace-2+Math.log(det1/det0));
}
for (const epsilon of [.01, .2, 2, 10]) for (const ratio of [.2, .7, 1.5, 5]) {
  const stationary = G.state(2, 3, epsilon, 1, 0).jointCov;
  for (const k of [0, 1, 3]) {
    const t = G.state(2, 3, epsilon, ratio, k);
    if (t.kl > 1e-7) relativeClose(t.kl, matrixKL(stationary, t.jointCov), 1e-7);
  }
}

// The small-epsilon gap is 2*epsilon/sqrt(ab), not 4*epsilon/sqrt(ab).
for (const delta of [1e-5, 1e-7, 1e-9]) {
  const p = G.parameters(4, 9, 6*delta);
  relativeClose(-Math.expm1(p.logq), 2*delta, 3*delta);
}

// Conditional/covariance errors have asymptotic factor q; KL has factor q^2.
for (const epsilon of [.001, .1, 1, 10]) {
  const p = G.parameters(1, 1, epsilon);
  const k = Math.ceil(20/(-p.logq));
  const t = G.state(1, 1, epsilon, 2, k);
  const next = G.state(1, 1, epsilon, 2, k+1);
  close(next.logRelativeError-t.logRelativeError, p.logq, 2e-9);
  close(next.logKL-t.logKL, 2*p.logq, 3e-9);
  assert.ok(t.kl > 0 && t.logRelativeError < -19);
}

// Exact log diagnostics survive both rounding u to 1 and floating-point underflow.
const belowRoundoff = G.state(1, 1, .1, 2, 300);
assert.equal(belowRoundoff.u, 1);
assert.ok(belowRoundoff.relativeConditionalError > 0 && belowRoundoff.kl > 0);
const underflow = G.state(1, 1, .1, 2, 10000);
assert.equal(underflow.relativeConditionalError, 0);
assert.equal(underflow.kl, 0);
assert.ok(Number.isFinite(underflow.logRelativeError) && Number.isFinite(underflow.logKL));
const nextUnderflow = G.state(1, 1, .1, 2, 10001);
close(nextUnderflow.logKL-underflow.logKL, 2*G.parameters(1,1,.1).logq);

// The scalar KL has leading coefficient 1/4+rho/(2*delta).
for (const epsilon of [.001, .3, 10]) {
  const p = G.parameters(1, 1, epsilon);
  for (const e of [-1e-6, 1e-6]) {
    const t = G.state(1, 1, epsilon, 1+e, 0);
    const expected = .25 + p.rho/(2*p.delta);
    relativeClose(t.kl/t.relativeConditionalError**2, expected, 3e-6);
  }
}

// Rescaling X and Y with positive factors preserves u, q, KL and rescales covariance.
const a=2,b=3,epsilon=.4,fx=5,fy=.2;
for (const k of [0,1,10,100]) {
  const t = G.state(a,b,epsilon,2,k);
  const scaled = G.state(a*fx*fx,b*fy*fy,epsilon*fx*fy,2,k);
  close(t.u,scaled.u);
  close(t.kl,scaled.kl);
  close(scaled.s,t.s*fx*fx);
  close(scaled.xVariance,t.xVariance*fx*fx);
  close(scaled.crossCov,t.crossCov*fx*fy);
}

const trajectory = G.trajectory(1,2,.3,2,12);
assert.equal(trajectory.length,13);
trajectory.forEach((t,k)=>assert.deepEqual(t,G.state(1,2,.3,2,k)));
for(const args of [[0,1,.1],[1,-1,.1],[1,1,0],[1,1,Infinity]]) {
  assert.throws(()=>G.parameters(...args),RangeError);
}
assert.throws(()=>G.state(1,1,.1,0,1),RangeError);
assert.throws(()=>G.state(1,1,.1,2,-1),RangeError);
assert.throws(()=>G.trajectory(1,1,.1,2,1.5),RangeError);
console.log("Gaussian Sinkhorn: recurrence, covariance, KL, asymptotic rates, scaling, and stable logarithms passed.");
