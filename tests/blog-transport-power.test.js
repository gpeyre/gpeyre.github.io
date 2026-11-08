"use strict";
const assert = require("node:assert/strict");
const M = require("../blog/preparations/assets/transport-simplex/core.js");
let checks = 0, linearPrograms = 0, accepted = 0, guarded = 0;
function close(actual, expected, scale = Math.max(1, Math.abs(expected)), tolerance = 3e-10) {
  checks++;
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance * scale,
    `${actual} differs from ${expected} at scale ${scale}`);
}
let seed = 177013;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
function probability() { const a = [random() + .01, random() + .01, random() + .01], sum = a.reduce((s, v) => s + v, 0); return a.map(v => v / sum); }
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// Independent primal LP oracle. Enumerate all nonsingular five-column bases of
// the nine-variable transport polytope; do not use dual potentials, the metric
// identity, shortest paths, or a priori cancellation of common mass.
function inverse(matrix) {
  const n = matrix.length, a = matrix.map((row, i) => [...row, ...row.map((_, j) => +(i === j))]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    if (Math.abs(a[pivot][i]) < 1e-12) return null;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const diagonal = a[i][i]; a[i] = a[i].map(v => v / diagonal);
    for (let j = 0; j < n; j++) if (j !== i) { const coefficient = a[j][i]; a[j] = a[j].map((v, k) => v - coefficient * a[i][k]); }
  }
  return a.map(row => row.slice(n));
}
const bases = [];
function enumerate(columns, next) {
  if (columns.length === 5) {
    const matrix = Array.from({ length: 5 }, (_, r) => columns.map(k => r < 3 ? +(Math.floor(k / 3) === r) : +(k % 3 === r - 3)));
    const inv = inverse(matrix); if (inv) bases.push({ columns: columns.slice(), inverse: inv });
    return;
  }
  for (let k = next; k < 9; k++) enumerate([...columns, k], k + 1);
}
enumerate([], 0); assert.equal(bases.length, 81);
function linearProgram(a, b, costs) {
  linearPrograms++;
  const rhs = [...a, b[0], b[1]], scale = Math.max(...costs.flat()); let minimum = Infinity;
  for (const basis of bases) {
    const mass = basis.inverse.map(row => row.reduce((s, v, i) => s + v * rhs[i], 0));
    if (mass.some(v => v < -2e-12)) continue;
    const value = mass.reduce((sum, v, i) => {
      const k = basis.columns[i]; return sum + Math.max(0, v) * (costs[Math.floor(k / 3)][k % 3] / scale);
    }, 0);
    minimum = Math.min(minimum, value);
  }
  assert.ok(Number.isFinite(minimum)); return minimum * scale;
}
function area(polygon) {
  return Math.abs(polygon.reduce((s, a, i) => { const b = polygon[(i + 1) % polygon.length]; return s + a[0] * b[1] - a[1] * b[0]; }, 0)) / 2;
}
function exactCosts(vertices, p) { return vertices.map(x => vertices.map(y => Math.hypot(x[0] - y[0], x[1] - y[1]) ** p)); }

const shapes = [M.defaults.vertices, [[0, 0], [1, 0], [.5, Math.sqrt(3) / 2]],
  [[-1, 0], [0, .1], [1, 0]], [[.35, .6], [2.85, .6], [1.15, 1.02]],
  [[.1, .3], [1.2, -.1], [1.5, 1.1]]];
const powers = [.01, .1, .5, 1, 2, 4, 10, 20, 100];
for (const vertices of shapes) for (const p of powers) {
  const exact = exactCosts(vertices, p), scale = Math.max(...exact.flat());
  let model;
  try { model = M.model(vertices, p); }
  catch (error) {
    const nonzero = exact.flat().filter(v => v > 0), ratio = Math.min(...nonzero) / scale;
    assert.ok(error instanceof RangeError && (ratio < 1e-10 || !Number.isFinite(scale)), `Unexpected rejection at p=${p}: ${error}`);
    guarded++; continue;
  }
  accepted++; close(model.p, p); close(model.maxGroundCost, scale, scale);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) close(model.costs[i][j], exact[i][j], exact[i][j] || 1, 2e-12);
  // Every retained dual plane is feasible. Hence no envelope value may exceed
  // the primal optimum, even on boundary faces or at a Dirac pair.
  for (const plane of model.planes) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    checks++; assert.ok(plane.u[i] + plane.v[j] <= model.costs[i][j] + 2e-11 * scale);
  }
  for (const a of E) for (const b of E) close(M.value(a, b, model), linearProgram(a, b, exact), scale, 2e-10);
  for (let k = 0; k < 20; k++) {
    const a = probability(), b = probability(), d = probability(), t = random();
    const value = M.value(a, b, model), expected = linearProgram(a, b, exact);
    close(value, expected, scale); close(M.cost(a, b, vertices, p), expected, scale);
    close(value, M.value(b, a, model), scale); close(M.value(a, a, model), 0, scale);
    const mixture = a.map((v, i) => t * v + (1 - t) * d[i]);
    checks++; assert.ok(M.value(mixture, b, model) <= t * value + (1 - t) * M.value(d, b, model) + 3e-10 * scale);
    if (p <= 1) {
      const weights = exact.map((row, i) => (row[(i + 1) % 3] + row[(i + 2) % 3] - exact[(i + 1) % 3][(i + 2) % 3]) / 2);
      close(value, a.reduce((s, v, i) => s + weights[i] * Math.abs(v - b[i]), 0), scale);
      checks++; assert.ok(M.value(a, d, model) <= value + M.value(b, d, model) + 3e-10 * scale);
    }
  }
  for (const b of [[1 / 3, 1 / 3, 1 / 3], [.12, .63, .25], [0, .4, .6], [1, 0, 0]]) {
    const cells = M.cells(model, b); assert.ok(cells.length > 0);
    close(cells.reduce((s, cell) => s + area(cell.polygon), 0), .5, 1, 3e-8);
    for (const cell of cells) {
      assert.equal(cell.values.length, 3);
      const centroid = [0, 1, 2].map(i => cell.polygon.reduce((s, a) => s + a[i], 0) / cell.polygon.length);
      for (const a of [...cell.polygon, centroid]) {
        close(a.reduce((s, v) => s + v, 0), 1); checks++; assert.ok(a.every(v => v >= -2e-10));
        const affine = a.reduce((s, v, i) => s + v * cell.values[i], 0);
        close(affine, M.value(a, b, model), scale, 5e-10);
        close(affine, linearProgram(a, b, exact), scale, 5e-10);
      }
    }
    const maximum = Math.max(...E.map(a => M.value(a, b, model)));
    const levels = [0, .05, .2, .5, .85, 1.05].map(t => t * maximum);
    const contours = M.contoursFromCells(vertices, cells, levels);
    assert.equal(contours[0].segments.length, 0); assert.equal(contours.at(-1).segments.length, 0);
    for (const contour of contours.slice(1, -1)) {
      checks++; assert.ok(contour.segments.length > 0);
      for (const [x, y] of contour.segments) for (const t of [0, .25, .5, .75, 1]) {
        const point = x.map((v, i) => (1 - t) * v + t * y[i]), a = M.barycentric(point, vertices);
        checks++; assert.ok(a.every(v => v >= -2e-9));
        close(M.value(a, b, model), contour.level, scale, 2e-8);
      }
    }
  }
}

// The middle site can exchange its existing mass, but is not a freely available
// transshipment node. Same signed imbalance does not determine nonmetric cost.
const nonmetric = [[-1, 0], [0, .1], [1, 0]], quadratic = M.model(nonmetric, 2);
close(M.value([.5, .5, 0], [0, .5, .5], quadratic), 1.01);
close(M.value([.5, 0, .5], [0, 0, 1], quadratic), 2);
close(M.value([1, 0, 0], [0, 0, 1], quadratic), 4);
assert.ok(1.01 < .5 * quadratic.costs[0][2]);
// Above exponent one, taking a p-th root would change the plotted values and
// destroy convexity of this slice: the app intentionally plots the LP value.
close(M.value([1, 0, 0], [0, 0, 1], quadratic), 4); assert.notEqual(4, Math.sqrt(4));

// Huge cost ratios must not erase a small but representable transport value.
// These compare with the local value scale, not with the enormous long-edge cost.
const steep = M.model(nonmetric, 100), shortCost = Math.hypot(1, .1) ** 100;
close(M.value([1, 0, 0], [0, 1, 0], steep), shortCost, shortCost, 5e-12);
close(M.value([.5, .5, 0], [0, .5, .5], steep), shortCost, shortCost, 5e-12);
close(M.value([.2, .5, .3], [.2, .5, .3], steep), 0, 1, 1e-12);
// Locked low color scales: a huge coefficient must not make unrelated branch
// boundaries look like zero-valued contour intersections. These small levels
// lie entirely in the well-conditioned central region around the target.
const center = [1 / 3, 1 / 3, 1 / 3];
for (const contour of M.contoursFromCells(nonmetric, M.cells(steep, center), [.1, .2])) {
  assert.ok(contour.segments.length > 0);
  for (const [x, y] of contour.segments) for (const t of [0, .5, 1]) {
    const a = M.barycentric(x.map((v, i) => (1 - t) * v + t * y[i]), nonmetric);
    close(M.value(a, center, steep), contour.level, 1, 1e-9);
  }
}

for (const p of [0, -1, NaN, Infinity, -Infinity]) assert.throws(() => M.model(M.defaults.vertices, p), RangeError);
assert.throws(() => M.model([[0, 0], [1e150, 0], [0, 1e150]], 4), RangeError);
console.log(`Power transport: ${checks} checks, ${linearPrograms} independent primal LPs, ${accepted} finite models (${guarded} precision-guarded); p<1 and p>1, nonmetric exchange, dual feasibility, affine cells and exact contour values pass.`);
