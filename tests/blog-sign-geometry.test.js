"use strict";

const assert = require("node:assert/strict");
const G = require("../blog/preparations/assets/sign-geometry/core.js");

function close(actual, expected, tol = 2e-13) {
  assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}
function norm(a, b, p) {
  if (p === Infinity) return Math.max(Math.abs(a), Math.abs(b));
  // Use independent analytic formulas for the smaller p below and max-scaling
  // for larger p so there is no loss of magnitude near a dual endpoint.
  const m = norm(a, b, Infinity);
  return m === 0 ? 0 : m * ((Math.abs(a) / m) ** p + (Math.abs(b) / m) ** p) ** (1 / p);
}

assert.deepEqual(G.direction(3, -2, 1), [-3, 0]);
assert.deepEqual(G.direction(-2, 3, 1), [0, -3]);
assert.deepEqual(G.direction(-2, 2, 1), [2, 0]);
assert.deepEqual(G.direction(3, -2, 2), [-3, 2]);
assert.deepEqual(G.direction(3, -2, Infinity), [-5, 5]);
assert.deepEqual(G.direction(3, 0, Infinity), [-3, 0]);
assert.equal(G.stepSize(1), 1);
assert.equal(G.stepSize(2), 1);
assert.equal(G.stepSize(Infinity), .5);
for (const p of [...G.exponents, 1 + Number.EPSILON]) {
  const q = p === 1 ? Infinity : p === Infinity ? 1 : p / (p - 1);
  assert.deepEqual(G.direction(0, 0, p), [0, 0]);
  for (const [a, b] of [[.07, -.9], [2, 2], [-1, 0], [0, .2], [.9, -.7]]) {
    const [x, y] = G.direction(a, b, p);
    close(a * x + b * y, -(norm(a, b, q) ** 2));
    close(norm(x, y, p), norm(a, b, q));
  }
  // Independently check the curvature bound on many directions.
  for (let k = 0; k < 128; k++) {
    const t = 2 * Math.PI * k / 128, x = Math.cos(t), y = Math.sin(t);
    for (const angle of [0, Math.PI / 4]) {
      assert.ok(2 * G.energy(G.hessianAt(angle), x, y) * G.stepSize(p) <= norm(x, y, p) ** 2 + 1e-14);
    }
  }
}

assert.equal(G.seeds.length, 5);
assert.equal(new Set(G.seeds.map(seed => seed.join(","))).size, 5);
assert.ok(Object.isFrozen(G.seeds) && G.seeds.every(Object.isFrozen));
for (const p of G.exponents) {
  const { trajectories, eta } = G.compute(p), [axis, rotated] = trajectories;
  assert.equal(trajectories.length, 2);
  close(eta, G.stepSize(p));
  const [soft, hard] = G.eigenvalues;
  for (const { hessian: [a, b, c], angle, runs } of trajectories) {
    close(a + c, soft + hard);
    close(a * c - b * b, soft * hard);
    assert.equal(runs.length, G.seeds.length);
    for (const level of G.levels) {
      const { x, y } = G.contourPoint(angle, level, 2.39);
      close(G.energy([a, b, c], x, y), level);
    }
    for (const [j, { selected, euclidean }] of runs.entries()) {
      const [u, v] = G.seeds[j], start = G.rotate(angle, u, v);
      close(selected[0].x, start.x);
      close(selected[0].y, start.y);
      assert.deepEqual(selected[0], euclidean[0]);
      close(selected[0].loss, (soft * u * u + hard * v * v) / 2);
      for (const [series, exponent, step] of [[selected, p, eta], [euclidean, 2, 1]]) {
        assert.equal(series.length, G.horizon + 1);
        for (let i = 0; i < series.length; i++) {
          const { x, y, loss } = series[i];
          assert.ok(Math.abs(x) < G.extent && Math.abs(y) < G.extent);
          close(loss, G.energy([a, b, c], x, y));
          assert.ok(loss >= 0);
          if (!i) continue;
          const previous = series[i - 1];
          assert.ok(loss <= previous.loss + 1e-14);
          const [dx, dy] = G.direction(a * previous.x + b * previous.y, b * previous.x + c * previous.y, exponent);
          close(x - previous.x, step * dx);
          close(y - previous.y, step * dy);
        }
        assert.ok(series.at(-1).loss < series[0].loss * 1e-4);
      }
      if (p === 2) assert.deepEqual(selected, euclidean);
    }
  }
  for (let j = 0; j < G.seeds.length; j++) for (let k = 0; k <= G.horizon; k++) {
    const { x, y, loss } = axis.runs[j].euclidean[k];
    const c = Math.SQRT1_2;
    close(rotated.runs[j].euclidean[k].x, c * (x - y));
    close(rotated.runs[j].euclidean[k].y, c * (x + y));
    close(rotated.runs[j].euclidean[k].loss, loss);
  }
}

const [axisSign, rotatedSign] = G.compute(Infinity).trajectories.map(({ runs }) => runs[0]);
const [axisCoordinate, rotatedCoordinate] = G.compute(1).trajectories.map(({ runs }) => runs[0]);
assert.notDeepEqual(axisSign.selected[1], axisSign.euclidean[1]);
assert.notDeepEqual(axisSign.selected[1], axisCoordinate.selected[1]);
assert.ok(Math.abs(axisSign.selected[2].loss - rotatedSign.selected[2].loss) > .01);
assert.notEqual(rotatedCoordinate.selected[1].loss, rotatedCoordinate.euclidean[1].loss);
assert.throws(() => G.compute(.9), RangeError);
assert.throws(() => G.compute(NaN), RangeError);
console.log("2D steepest descent: five matched starts, norm identities and endpoints, safe steps, true contours, decreasing losses and Euclidean rotation invariance passed.");
