"use strict";
const assert = require("node:assert/strict");
const S = require("../blog/preparations/assets/spectral-transport/core.js");
const close = (x, y, tolerance = 3e-11) => assert.ok(Math.abs(x - y) <= tolerance * Math.max(1, Math.abs(x), Math.abs(y)), x + " != " + y);

// Direct coupling accumulation independently reconstructs the displayed second moment.
for (const s of [0, .03, .2, .5, .87, 1]) {
  const pi = S.coupling(s), q = [0, 0, 0];
  pi.forEach(row => close(row.reduce((x, y) => x + y), .5));
  for (let j = 0; j < 2; j++) close(pi[0][j] + pi[1][j], .5);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const d = S.source[i].map((x, k) => x - S.target[j][k]);
    q[0] += pi[i][j] * d[0] ** 2; q[1] += pi[i][j] * d[0] * d[1]; q[2] += pi[i][j] * d[1] ** 2;
  }
  S.covariance(s).forEach((v, k) => close(v, q[k]));
  const eigen = S.eigenvalues(q);
  assert.ok(eigen[0] >= eigen[1] && eigen[1] > 0);
  close(eigen[0] + eigen[1], q[0] + q[2]);
  close(eigen[0] * eigen[1], q[0] * q[2] - q[1] ** 2);
  close(S.gamma(q, 1), q[0] + q[2]);
  close(S.gamma(q, 2) ** 2, q[0] ** 2 + 2 * q[1] ** 2 + q[2] ** 2);
  close(S.gamma(q, .5), q[0] + q[2] + 2 * Math.sqrt(q[0] * q[2] - q[1] ** 2));
  close(S.gamma(q, Infinity), (q[0] + q[2] + Math.sqrt((q[0] - q[2]) ** 2 + 4 * q[1] ** 2)) / 2);
}

// The p=2 minimizer follows independently from a quadratic polynomial Tr Q(s)^2.
const q0 = S.covariance(0), d = S.covariance(1).map((x, i) => x - q0[i]);
const expectedP2 = -(q0[0] * d[0] + 2 * q0[1] * d[1] + q0[2] * d[2]) / (d[0] ** 2 + 2 * d[1] ** 2 + d[2] ** 2);
close(S.optimize(2).s, expectedP2);
assert.equal(S.optimize(1).s, 1);
assert.equal(S.optimize(.5).s, 0);
assert.equal(S.optimize(.75).s, 1);
assert.ok(S.optimize(2).s > .61 && S.optimize(2).s < .62);
assert.ok(S.optimize(Infinity).s > .56 && S.optimize(Infinity).s < .57);

// For every displayed exponent: compare with the complete polytope sampled finely.
for (const p of [.5, .525, .6, .75, .99, 1, 1.001, 1.025, 1.1, 1.5, 2, 4, 8, Infinity]) {
  const result = S.optimize(p);
  close(result.distance ** 2, result.cost);
  assert.ok(result.s >= 0 && result.s <= 1);
  for (let k = 0; k <= 10000; k++) assert.ok(result.cost <= S.value(k / 10000, p) + 2e-10);
  if (p > 1) assert.ok(result.gap < 1e-11);
  for (let i = 0; i < 10; i++) {
    const s = i / 10, t = (i + 1) / 10, middle = (s + t) / 2;
    const residual = S.value(middle, p) - (S.value(s, p) + S.value(t, p)) / 2;
    assert.ok(p < 1 ? residual >= -1e-11 : residual <= 1e-11);
  }
}

// Independent central differences verify the spectral derivative used for optimization.
for (const p of [1.01, 1.5, 2, 8, Infinity]) for (const s of [.05, .3, .65, .95]) {
  const h = 1e-6;
  close(S.derivative(s, p), (S.value(s + h, p) - S.value(s - h, p)) / (2 * h), 2e-7);
}

// The displayed interpolation conserves total mass and has the correct endpoint laws.
for (const s of [0, .31, 1]) for (const t of [0, .4, 1]) {
  const particles = S.interpolation(s, t);
  close(particles.reduce((x, y) => x + y.mass, 0), 1);
  const mean = [0, 0]; particles.forEach(({ mass, point }) => point.forEach((x, k) => { mean[k] += mass * x; }));
  mean.forEach((x, k) => close(x, t * S.c[k]));
  if (t === 0 || t === 1) for (let i = 0; i < 2; i++) {
    const cloud = t ? S.target : S.source;
    close(particles.filter(x => x.point.every((v, k) => v === cloud[i][k])).reduce((total, x) => total + x.mass, 0), .5);
  }
}

// Homogeneity and extreme spectral scales are retained by the eigenvalue normalization.
for (const p of [.5, 1, 2, 8, Infinity]) for (const factor of [1e-100, .01, 100, 1e100]) {
  const q = [3 * factor, 0, factor];
  close(S.gamma(q, p) / factor, S.gamma([3, 0, 1], p), 1e-10);
}
assert.throws(() => S.covariance(-.1), RangeError);
assert.throws(() => S.gamma([1, 0, 1], 0), RangeError);
console.log("Spectral transport: exact coupling, global optimization, derivatives, interpolation, and scale checks passed.");
