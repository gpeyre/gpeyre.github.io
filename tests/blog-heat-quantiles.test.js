"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const filename = path.join(__dirname, "../blog/preparations/assets/heat-quantiles/core.js");
const H = require(filename);
function close(a, b, tolerance = 2e-11) {
  assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
}

// CommonJS and the CDN-free browser global must expose the same implementation.
const browser = {};
vm.runInNewContext(fs.readFileSync(filename, "utf8"), browser);
close(browser.HeatQuantiles.quantile(.2, .4, H.mixture()), H.quantile(.2, .4, H.mixture()));

// Independent tabulated values, including very small tails, test the CDF routine.
for (const [z, value] of [[0, .5], [-1, .15865525393145707], [-2, .02275013194817921],
  [-3, .0013498980316300946], [-5, 2.866515718791933e-7], [-8, 6.220960574271784e-16], [-10, 7.61985302416047e-24]]) {
  assert.ok(Math.abs(H.normalCDF(z) / value - 1) < 3e-14, `normal tail at ${z}`);
  close(H.normalSurvival(-z), H.normalCDF(z), 1e-15);
}
assert.equal(H.normalCDF(-Infinity), 0);
assert.equal(H.normalCDF(Infinity), 1);

for (const a of [.2, 1, 2, 3.2]) {
  const c = H.mixture(a);
  const initial = H.moments(0, c);
  for (const t of [0, .001, .1, .7, 2]) {
    const moments = H.moments(t, c);
    close(moments.mean, initial.mean);
    close(moments.variance, initial.variance + 2 * t);
    let previous = -Infinity;
    for (const s of [1e-9, .0005, .01, .1, .28, .5, .7, .9, .99, .9995, 1 - 1e-9]) {
      const q = H.quantile(s, t, c);
      assert.ok(Number.isFinite(q) && q > previous, "quantiles are finite and strictly increasing");
      close(H.cdf(q, t, c), s, 2e-13);
      if (s < .01) assert.ok(Math.abs(H.cdf(q, t, c) / s - 1) < 2e-11, "left tail inverts accurately");
      if (s > .99) assert.ok(Math.abs(H.survival(q, t, c) / (1 - s) - 1) < 2e-11, "right tail inverts accurately");
      previous = q;
    }
  }
}

// The hardest visual configuration has well-separated modes. Include levels
// exactly at cumulative mixture weights, and very small tail probabilities.
const separated = H.mixture(3.2);
for (const t of [0, 1e-5, .1, 2]) for (const s of [.28, .7, 1e-14, 1 - 1e-14]) {
  const q = H.quantile(s, t, separated);
  close(H.cdf(q, t, separated), s, 3e-15);
  assert.ok(Number.isFinite(q));
  if (s < .01) assert.ok(Math.abs(H.cdf(q, t, separated) / s - 1) < 1e-10);
  if (s > .99) assert.ok(Math.abs(H.survival(q, t, separated) / (1 - s) - 1) < 1e-10);
}

// A single Gaussian has Q_t(s)=m+sqrt(sigma^2+2t) Phi^{-1}(s).
const gaussian = { weights: [1], means: [.6], sigmas: [.7] };
for (const z of [-5, -2, -.5, 0, .8, 2]) for (const t of [0, .02, .4, 2]) {
  const s = H.normalCDF(z), expected = .6 + Math.sqrt(.7 ** 2 + 2 * t) * z;
  close(H.quantile(s, t, gaussian), expected, 2e-12);
  close(H.velocity(s, t, gaussian), z / Math.sqrt(.7 ** 2 + 2 * t), 2e-12);
}

// Check both the Eulerian heat PDE and the Lagrangian quantile PDE independently
// with centered finite differences away from t=0 and the singular level endpoints.
const c = H.mixture(2.3), dt = 1e-5, ds = 2e-5;
for (const t of [.05, .4, 1.5]) {
  for (const x of [-3, -.5, 0, 1.2, 3]) {
    const finiteTime = (H.density(x, t + dt, c) - H.density(x, t - dt, c)) / (2 * dt);
    close(finiteTime, H.densitySecondDerivative(x, t, c), 2e-7);
    const finiteCDFTime = (H.cdf(x, t + dt, c) - H.cdf(x, t - dt, c)) / (2 * dt);
    close(finiteCDFTime, H.densityDerivative(x, t, c), 2e-8);
  }
  for (const s of [.05, .2, .35, .5, .65, .85, .95]) {
    const d = H.quantileDerivatives(s, t, c);
    const finiteTime = (H.quantile(s, t + dt, c) - H.quantile(s, t - dt, c)) / (2 * dt);
    const finiteSpace = (H.quantile(s + ds, t, c) - H.quantile(s - ds, t, c)) / (2 * ds);
    const finiteSecond = (H.quantile(s + ds, t, c) - 2 * d.q + H.quantile(s - ds, t, c)) / (ds * ds);
    close(d.qt, finiteTime, 2e-7);
    close(d.qs, finiteSpace, 2e-6);
    close(d.qss, finiteSecond, 5e-5);
    close(d.qt, d.qss / (d.qs * d.qs), 1e-14);
    close(d.qs * H.density(d.q, t, c), 1, 1e-14);
  }
}

// Tracking more points changes only the sampling of Q, never the heat solution.
for (const n of [8, 40, 120]) {
  const data = H.tracks(n, H.mixture(2), { tMax: 2, steps: 80 });
  assert.equal(data.times.length, 81);
  assert.equal(data.positions.length, 81);
  assert.equal(data.times[0], 0);
  assert.equal(data.times[80], 2);
  for (let k = 0; k < data.times.length; k++) {
    assert.equal(data.positions[k].length, n);
    for (let i = 0; i < n; i++) {
      close(data.levels[i], (i + .5) / n, 1e-15);
      close(H.cdf(data.positions[k][i], data.times[k], H.mixture(2)), data.levels[i], 2e-13);
      if (i) assert.ok(data.positions[k][i] > data.positions[k][i - 1], "trajectories never cross");
    }
  }
}

// The density has unit mass, and integrating over equal mass levels recovers
// its mean/variance. This test does not use the analytic moments implementation.
const n = 1000, t = .8, config = H.mixture(1.7);
const points = Array.from({ length: n }, (_, i) => H.quantile((i + .5) / n, t, config));
const mean = points.reduce((sum, q) => sum + q, 0) / n;
const variance = points.reduce((sum, q) => sum + (q - mean) ** 2, 0) / n;
close(mean, H.moments(t, config).mean, .001);
close(variance, H.moments(t, config).variance, .002);

// One implicit JKO step is not exact Gaussian heat evolution over that step.
for (const sigma of [.2, .7, 2]) for (const tau of [.01, .2, 1]) {
  const next = H.gaussianJKOStep(sigma, tau);
  close((next - sigma) / tau, 1 / next, 3e-12);
  assert.ok(next > sigma && next < Math.sqrt(sigma * sigma + 2 * tau));
}
let sigma = .7;
const steps = 2000, horizon = .6;
for (let k = 0; k < steps; k++) sigma = H.gaussianJKOStep(sigma, horizon / steps);
close(sigma, Math.sqrt(.7 ** 2 + 2 * horizon), .0002);

assert.throws(() => H.quantile(-.1, 0, c), RangeError);
assert.throws(() => H.quantile(.5, -1, c), RangeError);
assert.throws(() => H.tracks(0, c), RangeError);
assert.throws(() => H.mixture(-1), RangeError);
assert.throws(() => H.density(0, 0, { weights: [.2], means: [0], sigmas: [1] }), RangeError);
console.log("Heat quantile numerics: CDF tails, exact heat, moments, quantile PDE, JKO limit and noncrossing tracks passed.");
