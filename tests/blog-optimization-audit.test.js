"use strict";
const assert = require("node:assert/strict");
const M = require("../js/blog-math.js");
const close = (a, b, tolerance = 1e-10) => assert.ok(
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);

// Independent witnesses for the absence of a GLOBAL PL constant in the banana
// example. These lie outside fixed sublevels; they do not contradict its bound.
for (const bend of [0.1, 0.5, 1, 2]) {
  let previous = Infinity;
  for (const x of [2, 5, 20, 100]) {
    const r = x - 1, c = 2 * bend * (x - 0.5), z = -r / c;
    const y = z - bend * (x - 0.5) ** 2;
    const { value, gradient } = M.banana(x, y, bend);
    const ratio = gradient.reduce((sum, v) => sum + v * v, 0) / (2 * value);
    close(ratio, 2 / (1 + c * c));
    assert.ok(ratio < previous); previous = ratio;
  }
}
for (const [x, y] of [[-2, 3], [0.5, 1], [2, -1]]) {
  const { value, gradient } = M.banana(x, y, 0);
  close(gradient.reduce((sum, v) => sum + v * v, 0) / (2 * value), 2);
}

// DC quadratic example: validate the full family, not just the spectral split.
for (const s of [-10, -2, -0.1, 0, 0.2, 3, 10]) {
  const c = Math.sqrt(1 + s * s), u = [c, s], v = [s, c];
  const P = u.map(x => u.map(y => x * y));
  const Q = v.map(x => v.map(y => x * y));
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    close(P[i][j] - Q[i][j], i === j ? (i === 0 ? 1 : -1) : 0);
  }
  close(c * c - s * s, 1); // independent curvature directions, hence minimality
  close((P[0][0] - 1) * P[1][1] - P[0][1] ** 2, -s * s);
  close(P[0][0] + P[1][1] + Q[0][0] + Q[1][1], 2 + 4 * s * s);
}
console.log("Optimization audit: global-PL counterexamples and nonunique minimal DC splits passed.");
