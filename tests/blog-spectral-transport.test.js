"use strict";
const assert = require("node:assert/strict");
const S = require("../blog/preparations/assets/spectral-transport/core.js");
const close = (x, y, tolerance = 3e-10) => assert.ok(Math.abs(x - y) <= tolerance * Math.max(1, Math.abs(x), Math.abs(y)), x + " != " + y);
const dot = (a, b) => a[0] * b[0] + 2 * a[1] * b[1] + a[2] * b[2];
function checkPlan(source, target, result) {
  const n = source.length;
  for (const row of result.plan) {
    assert.ok(row.every(x => Number.isFinite(x) && x >= 0));
    close(row.reduce((x, y) => x + y), 1 / n);
  }
  for (let j = 0; j < n; j++) close(result.plan.reduce((sum, row) => sum + row[j], 0), 1 / n);
  S.planMoment(source, target, result.plan).forEach((v, k) => close(v, result.q[k]));
  close(result.distance ** 2, result.cost);
  close(result.eigenvalues[0] + result.eigenvalues[1], result.q[0] + result.q[2]);
}
function permutations(n) {
  if (n === 1) return [[0]];
  return permutations(n - 1).flatMap(rest => Array.from({ length: n }, (_, j) => [...rest.slice(0, j), n - 1, ...rest.slice(j)]));
}
function permutationPlan(permutation) {
  return permutation.map(j => permutation.map((_, k) => Number(j === k) / permutation.length));
}

// The low-discrepancy clouds are deterministic and nested across slider values.
const small = S.clouds(12), large = S.clouds(100);
assert.deepEqual(small.source, large.source.slice(0, 12));
assert.deepEqual(small.target, large.target.slice(0, 12));
assert.deepEqual(S.clouds(48), S.clouds(48));
assert.ok(new Set(large.source.map(x => x.join(","))).size === 100);

// Independent brute force checks the Hungarian linear oracle, including signed costs.
for (const n of [2, 3, 4, 5, 6]) {
  const costs = Array.from({ length: n * n }, (_, i) => Math.sin(i * 1.79 + .7));
  const value = pi => pi.reduce((sum, j, i) => sum + costs[i * n + j], 0);
  close(value(S.assignment(costs, n)), Math.min(...permutations(n).map(value)));
}

// The original two-point geometry has a complete one-dimensional transport polytope.
const source2 = [[1, 0], [-1, 0]], target2 = [[.25, 1.2], [.05, -.8]];
const coupling2 = t => [[t / 2, (1 - t) / 2], [(1 - t) / 2, t / 2]];
for (const p of [.5, .525, .75, .99, 1, 1.001, 1.5, 2, 4, 8, Infinity]) {
  const r = S.solve(source2, target2, p, { tolerance: 1e-11, smoothing: 1e-8, maxIterations: 1000 });
  checkPlan(source2, target2, r);
  let exact = Infinity;
  for (let k = 0; k <= 10000; k++) exact = Math.min(exact, S.gamma(S.planMoment(source2, target2, coupling2(k / 10000)), p));
  assert.ok(r.cost <= exact + 2e-8, "two-point solution must agree with the complete polytope");
  if (p >= 1) {
    assert.ok(r.lowerBound <= exact + 1e-9);
    assert.ok(r.gap < 2e-8);
  } else {
    assert.equal(r.certified, false);
    assert.equal(r.gap, null);
    assert.equal(r.lowerBound, null);
    assert.equal(r.status, "multistart heuristic");
  }
}

// Convex bounds and nonconvex multistart results versus every assignment for n=5.
const tiny = S.clouds(5), allPlans = permutations(5).map(permutationPlan);
for (const p of [.5, .75, 1, 1.5, 2, 8, Infinity]) {
  const r = S.solve(tiny.source, tiny.target, p);
  const bestAssignment = Math.min(...allPlans.map(plan => S.gamma(S.planMoment(tiny.source, tiny.target, plan), p)));
  checkPlan(tiny.source, tiny.target, r);
  if (p >= 1) {
    assert.ok(r.lowerBound <= bestAssignment + 1e-10);
    assert.ok(r.cost <= bestAssignment + r.gap + 1e-10);
  } else {
    // This data set is small enough to independently verify the heuristic's result.
    // The application never extrapolates this check into a global guarantee.
    close(r.cost, bestAssignment);
  }
}

// For convex p, the certificate brackets the global minimum, not just assignments.
// Random feasible mixtures must therefore lie above the reported lower bound.
for (const n of [12, 48, 100]) {
  const { source, target } = S.clouds(n);
  for (const p of [.5, .75, 1, 1.025, 1.5, 2, 8, Infinity]) {
    const r = S.solve(source, target, p);
    checkPlan(source, target, r);
    if (p >= 1) {
      assert.ok(r.certified && Number.isFinite(r.gap) && r.gap >= 0);
      close(r.gap, r.cost - r.lowerBound);
      assert.ok(r.gap <= .002 * Math.max(1, r.cost), "a useful numerical certificate is required");
      if (p === 1) close(r.gap, 0);
      if (p === Infinity) assert.ok(r.smoothingError > 0);
      for (let k = 1; k <= 3; k++) {
        const plan = source.map((_, i) => source.map((__, j) => .4 * Number(j === i) / n + .6 * Number(j === (i + k) % n) / n));
        assert.ok(S.gamma(S.planMoment(source, target, plan), p) >= r.lowerBound - 1e-10);
      }
    }
  }
}

// The exponent changes the transport, not just the displayed norm of a fixed plan.
const example = S.clouds(48), trace = S.solve(example.source, example.target, 1), balanced = S.solve(example.source, example.target, 2);
assert.ok(balanced.q[2] > trace.q[2] + .08);
assert.ok(Math.abs(balanced.q[1]) < Math.abs(trace.q[1]) - .04);
assert.ok(S.gamma(balanced.q, 2) < S.gamma(trace.q, 2) - .01);
assert.ok(balanced.supportSize > 1, "fractional spectral couplings must be permitted");

// Interpolation preserves total mass, endpoint marginals, and the interpolated mean.
for (const t of [0, .4, 1]) {
  const particles = S.interpolation(example.source, example.target, balanced.plan, t);
  close(particles.reduce((sum, item) => sum + item.mass, 0), 1);
  for (let k = 0; k < 2; k++) {
    const a = example.source.reduce((sum, x) => sum + x[k], 0) / 48;
    const b = example.target.reduce((sum, x) => sum + x[k], 0) / 48;
    close(particles.reduce((sum, item) => sum + item.mass * item.point[k], 0), (1 - t) * a + t * b);
  }
  if (t === 0 || t === 1) for (let i = 0; i < 48; i++) {
    const field = t === 0 ? "source" : "target";
    close(particles.filter(item => item[field] === i).reduce((sum, item) => sum + item.mass, 0), 1 / 48);
  }
}

// Independent differences check packed spectral gradients, including infinity smoothing.
const q = [.7, .15, .3], direction = [.2, -.1, -.07], h = 1e-6, smoothing = .002;
for (const p of [.5, .75, 1, 1.5, 2, 8, Infinity]) {
  const value = matrix => p === Infinity ? (matrix[0] + matrix[2] + Math.hypot(matrix[0] - matrix[2], 2 * matrix[1], smoothing)) / 2 : S.gamma(matrix, p);
  close(dot(S.gradient(q, p, smoothing), direction),
    (value(q.map((v, k) => v + h * direction[k])) - value(q.map((v, k) => v - h * direction[k]))) / (2 * h), 2e-7);
}
for (const p of [.5, 1, 2, 8, Infinity]) for (const factor of [1e-100, .01, 100, 1e100])
  close(S.gamma([3 * factor, 0, factor], p) / factor, S.gamma([3, 0, 1], p), 1e-10);
assert.throws(() => S.clouds(1), RangeError);
assert.throws(() => S.gamma([1, 0, 1], 0), RangeError);
assert.throws(() => S.solve([[0, 0]], [[1, 1]], 2), RangeError);
console.log("Spectral point-cloud transport: assignment oracle, feasible plans, convex certificates, nonconvex labels, interpolation, and gradients passed.");
