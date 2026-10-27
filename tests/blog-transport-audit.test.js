/* Independent algebraic checks for the transport-geometry article audit. */
"use strict";
const assert = require("node:assert/strict");
const S = require("../blog/preparations/assets/spectral-transport/core.js");
const O = require("../blog/preparations/assets/ot-lab/core.js");
const close = (a, b, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
const gram = a => [a[0][0] ** 2 + a[1][0] ** 2,
  a[0][0] * a[0][1] + a[1][0] * a[1][1], a[0][1] ** 2 + a[1][1] ** 2];
const opSquared = a => S.gamma(gram(a), Infinity);
const inner = (a, b) => a.flat().reduce((v, x, i) => v + x * b.flat()[i], 0);

// The partial polar selector minimizes the squared operator-norm action.
// At a nonzero rank-deficient gradient, other velocities can minimize it too.
const n = 2, gradient = [[2, 0], [0, 0]];
const action = v => (inner(gradient, v) + opSquared(v) / 2) / n;
const selected = [[-2, 0], [0, 0]];
close(action(selected), -2 / n);
for (const extra of [-2, -1, .5, 2]) close(action([[-2, 0], [0, extra]]), action(selected));
const random = O.rng(2701026);
for (let k = 0; k < 500; k++) {
  const v = Array.from({ length: 2 }, () => Array.from({ length: 2 }, () => 8 * random() - 4));
  assert.ok(action(v) >= action(selected) - 1e-12);
}
close(action([[0, 0], [0, 0]]), 0);

// A convex positive PSD gauge need not be Loewner-monotone, and then its
// Gram lift can fail the triangle inequality dramatically.
const badGauge = q => Math.abs(q[0] - 2 * q[2]) + .1 * (q[0] + q[2]);
close(badGauge([1, 0, 0]), 1.1);
close(badGauge([1, 0, .5]), .15);
const x = [[1, 0], [0, Math.sqrt(.5)]], y = [[1, 0], [0, -Math.sqrt(.5)]];
const sum = x.map((row, i) => row.map((v, j) => v + y[i][j]));
assert.ok(Math.sqrt(badGauge(gram(sum))) > Math.sqrt(badGauge(gram(x))) + Math.sqrt(badGauge(gram(y))));

// Forced couplings in the half-Schatten example: successive costs are one,
// whereas the direct cost is sqrt(gamma_p(I_2)). The obstruction needs d>=2.
for (const p of [.1, .25, .49, .5, .75, 1, 2, Infinity]) {
  const first = Math.sqrt(S.gamma([1, 0, 0], p));
  const second = Math.sqrt(S.gamma([0, 0, 1], p));
  const direct = Math.sqrt(S.gamma([1, 0, 1], p));
  close(first, 1); close(second, 1);
  if (p < .5) assert.ok(direct > first + second);
  else assert.ok(direct <= first + second + 1e-12);
  // One-dimensional motions embed as rank-one second moments for every p.
  close(S.gamma([3.5, 0, 0], p), 3.5);
}
for (const p of [.25, .5, .75]) {
  close(S.gamma([1, 1, 1], p), 2);
  close(S.gamma([1, -1, 1], p), 2);
  assert.ok(S.gamma([1, 0, 1], p) > 2, "Mixtures destroy convexity below p=1");
}

// The composition counterexample has an exact positive cost gap.
const a = [[2, 0], [0, 1]], b = [[2, 1], [1, 2]];
const product = O.matmul(b, a), covariance = O.matmul(product, O.transpose(product));
assert.deepEqual(product, [[4, 1], [2, 2]]);
assert.deepEqual(covariance, [[17, 10], [10, 8]]);
const optimum = O.sqrtSPD(covariance);
const gaussianCost = m => 2 + inner(m, m) - 2 * (m[0][0] + m[1][1]);
close(gaussianCost(product) - gaussianCost(optimum), 2 * Math.sqrt(37) - 12);
assert.ok(gaussianCost(product) > gaussianCost(optimum));

// Translation examples compare both assignments, so ties are also visible.
const mixedCubic = (x, y) => x * x * y;
const rectangle = (cost, shift) => cost(shift, shift) + cost(shift + 1, shift + 1)
  - cost(shift + 1, shift) - cost(shift, shift + 1);
for (const shift of [-2, -1, -.5, 0, 3]) close(rectangle(mixedCubic, shift), 2 * shift + 1);
const equivariantCubic = (x, y) => x * x * y - x * y * y;
for (const shift of [-2, -.5, 0, 3]) close(rectangle(equivariantCubic, shift), 0);

// Independence: the 2x2 entropy minimizer satisfies the exact first-order
// condition and converges to the product at high temperature.
for (const angle of [0, .4, Math.PI / 2]) for (const epsilon of [.5, 2, 100]) {
  const cosine = Math.cos(angle), t = 1 / (2 * (1 + Math.exp(-4 * cosine / epsilon)));
  close(-8 * cosine + 2 * epsilon * Math.log(t / (.5 - t)), 0, 1e-8);
  assert.ok(t >= .25 - 1e-15 && t < .5);
}

// A two-source martingale has zero weak cost but its ordinary OT projection
// has positive barycentric cost; the direction reversal is not free.
const source = [[-.5], [.5]], target = [[-1], [1]], mass = [.5, .5];
const martingale = [[3 / 8, 1 / 8], [1 / 8, 3 / 8]];
close(O.feasibility(martingale, mass, mass), 0);
close(O.objective(martingale, source, target, mass), 0);
const matching = [[.5, 0], [0, .5]];
close(O.objective(matching, source, target, mass), .25);
close(O.objective(matching, target, source, mass), .25);

// Uniform order-statistic moments independently reproduce E W2^2=1/(6n).
for (const count of [1, 2, 3, 10, 50]) {
  let expected = 0;
  for (let i = 1; i <= count; i++) {
    const lo = (i - 1) / count, hi = i / count;
    const mean = i / (count + 1), moment2 = i * (i + 1) / ((count + 1) * (count + 2));
    expected += moment2 / count - mean * (hi * hi - lo * lo) + (hi ** 3 - lo ** 3) / 3;
  }
  close(expected, 1 / (6 * count));
}

// The density-cap example uses exact quantile derivatives, not a solver cap.
for (const modulation of [0, .2, .7, .99]) for (const time of [0, .1, .5, .9, 1]) {
  const maximum = 1 / (1 - Math.abs(1 - 2 * time) * modulation);
  assert.ok(maximum <= 1 / (1 - modulation) + 1e-10);
  for (let j = 0; j <= 100; j++) {
    const derivative = 1 + (1 - 2 * time) * modulation * Math.cos(2 * Math.PI * j / 100);
    assert.ok(1 / derivative <= maximum + 1e-10);
  }
}

console.log("Transport audit: partial-polar normalization/nonuniqueness, covariance monotonicity, half-Schatten threshold, composition, translation, entropy, weak transport, quantization, and density caps passed.");
