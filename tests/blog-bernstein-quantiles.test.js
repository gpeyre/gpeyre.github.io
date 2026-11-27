"use strict";

const assert = require("node:assert/strict");
const { gaussianCDF, bernsteinQuantileMixture, bernsteinQuantileExperiment } = require("../blog/preparations/assets/ot-lab/core.js");

function close(actual, expected, tolerance = 1e-11) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected} by more than ${tolerance}`);
}
const rankFractions = [[1, 10], [1, 4], [1, 2], [3, 4], [9, 10]];
const levels = rankFractions.map(([a, b]) => a / b);
const standardDensity = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

for (const s of [-1, .2, 1]) {
  const coarse = bernsteinQuantileExperiment(s, { intervals: 600 });
  const { law, levels: actualLevels, curves, quadrature } = bernsteinQuantileExperiment(s);
  assert.deepEqual(actualLevels, levels);
  assert.equal(curves.length, levels.length);
  assert.deepEqual(law.means, [-1.25 + .65 * s, 1.1 + .35 * s]);
  assert.deepEqual(law.weights, [.52 - .25 * s, .48 + .25 * s]);
  assert.equal(law.sigma, .52);
  assert.ok(law.weights.every(w => w > 0));
  close(law.weights[0] + law.weights[1], 1);
  assert.equal(quadrature.intervals, 1200);
  close(quadrature.lower, Math.min(...law.means) - 9 * law.sigma);
  close(quadrature.upper, Math.max(...law.means) + 9 * law.sigma);
  const mean = law.weights.reduce((acc, w, i) => acc + w * law.means[i], 0);
  for (const [i, { t, quantile, points }] of curves.entries()) {
    assert.equal(t, levels[i]);
    close(law.cdf(quantile), t);
    if (i) assert.ok(quantile > curves[i - 1].quantile);
    assert.equal(points.length, 120);
    close(points[0].estimate, mean);
    for (const [index, point] of points.entries()) {
      const n = index + 1, [a, b] = rankFractions[i];
      assert.equal(point.n, n);
      assert.equal(point.rank, Math.floor((n * a + b - 1) / b));
      assert.equal(point.error, Math.abs(point.signedError));
      assert.equal(point.signedError, point.estimate - quantile);
      // The omitted true probability is bounded by Mills' inequality and
      // the union bound; the remaining discrepancy is numerical error.
      const omittedMassBound = 2 * n * standardDensity(9) / 9;
      assert.ok(omittedMassBound < 3e-17);
      close(point.mass, 1, 2e-12 + omittedMassBound);
      close(point.estimate, coarse.curves[i].points[index].estimate, 2e-12);
      if (i) assert.ok(point.estimate >= curves[i - 1].points[index].estimate - 2e-12);
    }
  }
  // E[min] and E[max] for two independent mixture draws are E[X] plus/minus
  // half the mean absolute difference, computed here from folded Gaussians.
  const sd = Math.SQRT2 * law.sigma;
  let absoluteDifference = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const delta = law.means[i] - law.means[j], z = delta / sd;
    absoluteDifference += law.weights[i] * law.weights[j] * (2 * sd * standardDensity(z) + delta * (2 * gaussianCDF(z) - 1));
  }
  const smallest = curves[0].points[1].estimate, largest = curves.at(-1).points[1].estimate;
  close(smallest, mean - absoluteDifference / 2);
  close(largest, mean + absoluteDifference / 2);
  close(smallest + largest, 2 * mean);
}

// For equal weights the mixture is symmetric about its midpoint, so odd-size
// sample medians have exactly that expectation (and zero bias).
const symmetric = bernsteinQuantileExperiment(.08, { maxN: 13 });
const midpoint = (symmetric.law.means[0] + symmetric.law.means[1]) / 2;
const median = symmetric.curves[2];
close(median.quantile, midpoint);
for (const { n, estimate, error } of median.points) {
  if (n % 2) { close(estimate, midpoint); close(error, 0); }
  // With even n, the empirical quantile picks the lower of the two central
  // order statistics rather than interpolating them.
  else assert.ok(estimate < midpoint);
}

// Independent probability-coordinate calculation: numerically invert F and
// integrate Q(u) against the Beta density, rather than integrate in x.
const inverseCheck = bernsteinQuantileExperiment(-.12, { maxN: 31 });
for (const i of [1, 2, 3]) {
  const { n, rank, estimate } = inverseCheck.curves[i].points.at(-1);
  let coefficient = n;
  for (let j = 1; j < rank; j++) coefficient *= (n - j) / j;
  const intervals = 1100;
  let value = 0;
  for (let j = 0; j < intervals; j++) {
    const u = (j + .5) / intervals, q = inverseCheck.law.quantile(u);
    value += q * coefficient * u ** (rank - 1) * (1 - u) ** (n - rank) / intervals;
  }
  close(estimate, value, 2e-10);
}
for (const s of [-1.01, 1.01, NaN, Infinity, "0"]) assert.throws(() => bernsteinQuantileMixture(s), RangeError);
for (const options of [{ maxN: 0 }, { maxN: 1.5 }, { intervals: 1199 }, { intervals: 0 }]) {
  assert.throws(() => bernsteinQuantileExperiment(0, options), RangeError);
}
console.log("Bernstein quantiles: exact rank rounding, support tails and mass, refined quadrature, sample means and extrema, symmetry, and inverse-CDF Beta reference passed.");
