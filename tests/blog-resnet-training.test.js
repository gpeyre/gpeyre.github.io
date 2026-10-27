"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const inputs = [[1, 0.4], [-0.3, 0.8], [0.1, -1.2]];
const targets = [[-0.2, 0.7], [0.8, -0.1], [0.4, 0.5]];
const norm2 = x => x.reduce((s, v) => s + v * v, 0);
function forward(matrices) {
  const h = 1 / matrices.length;
  const paths = inputs.map(x => [x.slice()]);
  for (const path of paths) for (const A of matrices) {
    const [x, y] = path[path.length - 1];
    path.push([x + h * (A[0] * x + A[1] * y), y + h * (A[2] * x + A[3] * y)]);
  }
  return paths;
}
function loss(matrices, lambda) {
  const paths = forward(matrices), h = 1 / matrices.length;
  return paths.reduce((v, path, i) => v + norm2(path[path.length - 1].map((x, k) => x - targets[i][k])) / 6, 0)
    + lambda * h / 2 * matrices.reduce((s, A) => s + norm2(A), 0);
}
function gradient(matrices, lambda) {
  const paths = forward(matrices), h = 1 / matrices.length;
  const gradients = matrices.map(A => A.map(v => h * lambda * v));
  for (let i = 0; i < inputs.length; i++) {
    let p = paths[i][matrices.length].map((v, k) => v - targets[i][k]);
    for (let l = matrices.length - 1; l >= 0; l--) {
      const [x, y] = paths[i][l], A = matrices[l];
      [p[0] * x, p[0] * y, p[1] * x, p[1] * y].forEach((v, k) => gradients[l][k] += h * v / inputs.length);
      p = [p[0] + h * (A[0] * p[0] + A[2] * p[1]), p[1] + h * (A[1] * p[0] + A[3] * p[1])];
    }
  }
  return gradients;
}
let checks = 0;
for (const L of [1, 2, 7, 25]) for (const lambda of [0, 0.17]) {
  const A = Array.from({length:L}, (_, l) => Array.from({length:4}, (_, k) => 0.3 * Math.sin((l + 1) * (k + 2))));
  const G = gradient(A, lambda), eps = 1e-5;
  for (let l = 0; l < L; l++) for (let k = 0; k < 4; k++) {
    const v = A[l][k]; A[l][k] = v + eps; const plus = loss(A, lambda);
    A[l][k] = v - eps; const minus = loss(A, lambda); A[l][k] = v;
    assert.ok(Math.abs((plus - minus) / (2 * eps) - G[l][k]) < 2e-9); checks++;
  }
  const direction = G.map(row => row.map(v => -L * v));
  const moved = A.map((row, l) => row.map((v, k) => v + 1e-6 * direction[l][k]));
  const predicted = -L * G.reduce((s, row) => s + norm2(row), 0);
  assert.ok(Math.abs((loss(moved, lambda) - loss(A, lambda)) / 1e-6 - predicted) < 2e-5);
}
for (const L of [1, 3, 20]) {
  const a = [0.1, -0.4, 0.3, -0.2], A = Array.from({length:L}, () => a.slice());
  const G = gradient(A, 0).reduce((sum, row) => sum.map((v, k) => v + row[k]), [0, 0, 0, 0]);
  for (let k = 0; k < 4; k++) {
    const perturb = sign => A.map(row => row.map((v, j) => v + (j === k ? sign * 1e-5 : 0)));
    assert.ok(Math.abs((loss(perturb(1), 0) - loss(perturb(-1), 0)) / 2e-5 - G[k]) < 2e-9); checks++;
  }
}
const html = fs.readFileSync("blog/preparations/training-very-deep-resnets.html", "utf8");
assert.match(html, /noindex,follow/); assert.match(html, /Alpha preview · Work in progress/);
assert.ok(html.match(/<meta name="keywords" content="([^"]+)"/)[1].split(",").length >= 25);
assert.equal((html.match(/<details class="blog-proof">/g) || []).length, 5);
for (const topic of ["flow", "landscape"]) assert.match(html, new RegExp('data-experiment="resnet-' + topic + '"'));
for (const match of html.matchAll(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g)) assert.ok(!/[<>]/.test(match[0]), "Escape HTML comparisons in math");
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), "Missing local reference: " + match[1]);
console.log(`${checks} independent finite-difference gradient checks, tied-gradient scaling, training descent, and article metadata passed.`);
