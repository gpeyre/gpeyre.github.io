"use strict";
const assert = require("node:assert/strict");
const M = require("../blog/preparations/assets/attention-sampling/math.js");

function near(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + " != " + expected + " (tolerance " + tolerance + ")");
}

// Reproducible, nondegenerate uniform streams and unpaired Box–Muller normals.
const ua = M.uniformGenerator(73), ub = M.uniformGenerator(73), uc = M.uniformGenerator(74);
let different = false;
for (let i = 0; i < 10000; i++) {
  const a = ua(); assert.equal(a, ub()); different ||= a !== uc();
  assert.ok(a > 0 && a < 1);
}
assert.ok(different);
const normals = M.sampleNormal(113, 100000);
assert.deepEqual(M.sampleNormal(113, 17), normals.slice(0, 17), "sample prefixes are nested exactly, including odd lengths");
let sum = 0, square = 0, cube = 0;
for (const y of normals) { assert.ok(Number.isFinite(y)); sum += y; square += y * y; cube += y * y * y; }
near(sum / normals.length, 0, 0.015); near(square / normals.length, 1, 0.025); near(cube / normals.length, 0, 0.05);
assert.notEqual(normals[0], -normals[1], "sampling is not antithetic");
const bank = M.sampleBank(20261016), again = M.sampleBank(20261016);
assert.equal(bank.length, 5);
for (let k = 0; k < bank.length; k++) {
  assert.deepEqual(bank[k], again[k]);
  assert.deepEqual(bank[k].slice(0, 33), M.sampleBank(20261016, 33)[k]);
  if (k) assert.notDeepEqual(bank[k], bank[k - 1], "draw streams differ");
}
assert.equal(M.nFromExponent(-10), 8); assert.equal(M.nFromExponent(20), 8192);
for (let k = 3; k <= 13; k++) assert.equal(M.nFromExponent(k), 2 ** k);
assert.throws(() => M.nFromExponent(NaN), RangeError);

// Exact special cases, a direct formula comparison, and the population identity.
const values = [-2.3, -0.8, 0.2, 0.9, 1.7];
near(M.attention(values, 0), values.reduce((a, b) => a + b, 0) / values.length);
near(M.attention(values, 12, 0), values.reduce((a, b) => a + b, 0) / values.length);
near(M.attention([2.5], 1e4, 2), 2.5);
for (const tau of [0.25, 1, 2]) for (const x of [-4, -0.2, 0, 0.8, 4]) {
  const weights = values.map(y => Math.exp(tau * x * y));
  const direct = values.reduce((a, y, i) => a + y * weights[i], 0) / weights.reduce((a, b) => a + b, 0);
  near(M.attention(values, x, tau), direct);
  assert.equal(M.population(x, tau), tau * x);
}
near(M.attention([-1, 1], 0.4, 1.7), Math.tanh(0.4 * 1.7));
near(M.attention(values, 0.8, 1, 2), M.attention(values.slice(0, 2), 0.8));
near(M.attention(values.map(y => y + 1000), 0.7), M.attention(values, 0.7) + 1000, 2e-12);

// Exponents that would overflow/underflow a naive implementation stay stable.
near(M.attention([-1000, -999, 999, 1000], 1000), 1000);
near(M.attention([-1000, -999, 999, 1000], -1000), -1000);
near(M.attention([1000, 1001, 1002], -1000), 1000);
near(M.attention([-1002, -1001, -1000], 1000), -1000);
for (const draw of bank) for (const n of [8, 32, 256, 8192]) {
  const sample = M.prepareSample(draw, n);
  for (const tau of [0.25, 1, 2]) {
    let last = -Infinity;
    for (let x = -8; x <= 8; x += 0.5) {
      const a = M.evaluatePrepared(sample, x, tau);
      assert.ok(Number.isFinite(a) && a >= sample.min && a <= sample.max, "attention lies in the token convex hull");
      assert.ok(a >= last - 1e-12, "attention is monotone in the query for positive strength"); last = a;
    }
  }
}
assert.throws(() => M.prepareSample([], 0), RangeError);
assert.throws(() => M.prepareSample([1], 2), RangeError);
assert.throws(() => M.attention([NaN], 0), RangeError);
assert.throws(() => M.attention([0], Infinity), RangeError);

// Simpson integrates cubics exactly; Gaussian quadrature has known reference moments.
const cubicRule = M.simpsonRule(-2, 3, 32);
near(M.integrate(() => 1, cubicRule), 5);
near(M.integrate(x => x ** 3, cubicRule), (3 ** 4 - (-2) ** 4) / 4);
assert.throws(() => M.simpsonRule(-8, 8, 255), RangeError);
assert.throws(() => M.simpsonRule(8, -8), RangeError);
const rule = M.simpsonRule();
near(M.integrate(M.gaussianDensity, rule), 1, 3e-15);
near(M.integrate(x => x * M.gaussianDensity(x), rule), 0, 1e-15);
near(M.integrate(x => x * x * M.gaussianDensity(x), rule), 1, 1e-12);
near(M.l2FromValues(Float64Array.from(rule.nodes, x => 1.2 * x), 1.2, rule), 0);
near(M.l2FromValues(Float64Array.from(rule.nodes, x => x + 2), 1, rule), 2, 1e-13);
near(M.l2FromValues(new Float64Array(rule.nodes.length), 2, rule), 2, 1e-12);
assert.throws(() => M.l2FromValues([0], 1, rule), RangeError);
// Against a much finer deterministic rule, including the strongest attention.
for (const n of [8, 256, 8192]) for (const tau of [0.25, 1, 2]) {
  const sample = M.prepareSample(bank[0], n), fine = M.simpsonRule(-8, 8, 2048);
  const coarseValues = Float64Array.from(rule.nodes, x => M.evaluatePrepared(sample, x, tau));
  const fineValues = Float64Array.from(fine.nodes, x => M.evaluatePrepared(sample, x, tau));
  near(M.l2FromValues(coarseValues, tau, rule), M.l2FromValues(fineValues, tau, fine), 1e-7);
}
console.log("Attention sampling: seeded Gaussian streams, nested prefixes, exact identities, stable softmax, convex-hull bounds, monotonicity and L2 quadrature passed.");
