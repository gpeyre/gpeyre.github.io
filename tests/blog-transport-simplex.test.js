"use strict";
const assert = require("node:assert/strict");
const M = require("../blog/preparations/assets/transport-simplex/core.js");
let checks = 0;
function close(a, b, tolerance = 3e-10) {
  checks++;
  assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
}
let seed = 871223;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
function probability() { const a = [random(), random(), random()], sum = a.reduce((s, x) => s + x, 0); return a.map(x => x / sum); }

// Independent LP oracle: enumerate all 5-variable bases of the 3-by-3
// transportation polytope (three row constraints and two column constraints).
// This makes no use of the three-point distance identity or optimal diagonal.
function inverse(matrix) {
  const a = matrix.map((row, i) => [...row, ...row.map((_, j) => +(i === j))]);
  for (let i = 0; i < 5; i++) {
    let pivot = i;
    for (let j = i + 1; j < 5; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    if (Math.abs(a[pivot][i]) < 1e-12) return null;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const scale = a[i][i]; a[i] = a[i].map(x => x / scale);
    for (let j = 0; j < 5; j++) if (j !== i) {
      const factor = a[j][i]; a[j] = a[j].map((x, k) => x - factor * a[i][k]);
    }
  }
  return a.map(row => row.slice(5));
}
const bases = [];
function enumerate(selected, start) {
  if (selected.length === 5) {
    const matrix = Array.from({ length: 5 }, (_, row) => selected.map(k => row < 3 ? +(Math.floor(k / 3) === row) : +(k % 3 === row - 3)));
    const inv = inverse(matrix); if (inv) bases.push({ columns: selected.slice(), inverse: inv });
    return;
  }
  for (let k = start; k < 9; k++) enumerate([...selected, k], k + 1);
}
enumerate([], 0); assert.equal(bases.length, 81);
function linearProgram(a, b, distances) {
  const rhs = [...a, b[0], b[1]]; let result = Infinity;
  for (const basis of bases) {
    const values = basis.inverse.map(row => row.reduce((s, x, i) => s + x * rhs[i], 0));
    if (values.some(x => x < -1e-10)) continue;
    const energy = values.reduce((s, x, i) => { const index = basis.columns[i]; return s + x * distances[Math.floor(index / 3)][index % 3]; }, 0);
    result = Math.min(result, energy);
  }
  assert.ok(Number.isFinite(result)); return result;
}

const supports = [M.defaults.vertices, [[0, 0], [1, 0], [.5, Math.sqrt(3) / 2]], [[0, 0], [1, 0], [3, 0]], [[0, 0], [0, 0], [2, 0]]];
for (let test = 0; test < 250; test++) supports.push(Array.from({ length: 3 }, () => [3 * random(), 3 * random()]));
for (const vertices of supports) {
  const { weights, distances } = M.geometry(vertices);
  assert.ok(weights.every(x => x >= 0));
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) close(weights[i] + weights[j], distances[i][j]);
  const a = probability(), b = probability(), c = probability(), t = random();
  close(M.cost(a, b, vertices), linearProgram(a, b, distances));
  close(M.cost(a, a, vertices), 0);
  close(M.cost(a, b, vertices), M.cost(b, a, vertices));
  assert.ok(M.cost(a, c, vertices) <= M.cost(a, b, vertices) + M.cost(b, c, vertices) + 1e-11);
  const mixture = a.map((v, i) => t * v + (1 - t) * c[i]);
  assert.ok(M.cost(mixture, b, vertices) <= t * M.cost(a, b, vertices) + (1 - t) * M.cost(c, b, vertices) + 1e-11);
  const xa = M.point(a, vertices), xb = M.point(b, vertices);
  assert.ok(Math.hypot(xa[0] - xb[0], xa[1] - xb[1]) <= M.cost(a, b, vertices) + 1e-11);
  close(M.cost(a, b, vertices.map(x => x.map(v => 2.4 * v))), 2.4 * M.cost(a, b, vertices));
}
for (const a of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.4, .6, 0], M.defaults.b]) for (const b of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.7, 0, .3], M.defaults.b]) {
  close(M.cost(a, b, M.defaults.vertices), linearProgram(a, b, M.geometry(M.defaults.vertices).distances));
}
for (let test = 0; test < 100; test++) {
  const a = Array.from({ length: 3 }, () => 4 * random() - 1), projected = M.projectProbability(a);
  close(projected.reduce((s, x) => s + x, 0), 1); assert.ok(projected.every(x => x >= 0));
  M.projectProbability(projected).forEach((x, i) => close(x, projected[i]));
  // First-order projection inequality against every simplex vertex.
  for (let j = 0; j < 3; j++) assert.ok(a.reduce((sum, x, i) => sum + (x - projected[i]) * (+(i === j) - projected[i]), 0) <= 1e-11);
  const point = M.point(projected, M.defaults.vertices);
  M.barycentric(point, M.defaults.vertices).forEach((x, i) => close(x, projected[i]));
}
M.projectProbability([1e20, 1e20, 1e20]).forEach(x => close(x, 1 / 3));
assert.throws(() => M.barycentric([0, 0], supports[2]), RangeError);
assert.throws(() => M.cost([2, 0, 0], M.defaults.b, M.defaults.vertices), RangeError);

function area(polygon) { return Math.abs(polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]; return sum + p[0] * q[1] - p[1] * q[0]; }, 0)) / 2; }
for (const b of [M.defaults.b, [.04, .23, .73], [0, .4, .6], [1, 0, 0]]) {
  const cells = M.signCells(b);
  close(cells.reduce((sum, cell) => sum + area(cell.polygon), 0), .5);
  for (const { polygon, signs } of cells) for (const a of polygon) {
    close(a.reduce((s, x) => s + x, 0), 1);
    for (let i = 0; i < 3; i++) assert.ok(signs[i] * (a[i] - b[i]) >= -1e-11);
  }
  const { weights } = M.geometry(M.defaults.vertices);
  const maximum = Math.max(...[[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(a => M.weightedCost(a, b, weights)));
  const levels = [0, ...[.02, .1, .2, .4, .7, .99, 1, 1.1].map(t => t * maximum)];
  const curves = M.contours(M.defaults.vertices, b, levels);
  assert.equal(curves[0].segments.length, 0); assert.equal(curves.at(-1).segments.length, 0);
  for (const curve of curves.slice(1, -2)) assert.ok(curve.segments.length > 0);
  for (const { level, segments } of curves) for (const [p, q] of segments) {
    for (const t of [0, .19, .5, .82, 1]) {
      const xy = p.map((v, i) => (1 - t) * v + t * q[i]);
      const a = M.barycentric(xy, M.defaults.vertices);
      assert.ok(a.every(x => x >= -1e-10));
      close(M.weightedCost(a, b, weights), level);
    }
  }
}
assert.equal(M.signCells(M.defaults.b).length, 6);
assert.equal(M.signCells([1, 0, 0]).length, 1);
for (let i = 0; i < 3; i++) assert.equal(M.validateVertexMove(M.defaults.vertices, i, M.defaults.vertices[i]), true);
assert.equal(M.validateVertexMove(M.defaults.vertices, 0, [-.1, 1]), false);
assert.equal(M.validateVertexMove(M.defaults.vertices, 0, M.defaults.vertices[1]), false);
assert.equal(M.validateVertexMove(M.defaults.vertices, 2, [1.4, .2]), false);
assert.equal(M.validateVertexMove(M.defaults.vertices, 1, [2.4, .8]), true);
assert.equal(M.validateVertexMove(M.defaults.vertices, 1, [NaN, .8]), false);
assert.equal(M.validateVertexMove(M.defaults.vertices, 9, [1, 1]), false);
console.log(`Transport simplex: ${checks} numerical equalities, 279 independent coupling LPs, exact contours, barycentric/projection identities, convexity, metric bounds and non-collapse guards pass.`);
