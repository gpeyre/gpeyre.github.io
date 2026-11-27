"use strict";

const assert = require("node:assert/strict");
const { gaussianCDF, bernsteinQuantileMixture, bernsteinQuantileExperiment, bernsteinQuantileRateSizes } = require("../blog/preparations/assets/ot-lab/core.js");

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

const sizes = bernsteinQuantileRateSizes;
assert.ok(Object.isFrozen(sizes));
assert.equal(sizes[0], 20);
assert.equal(sizes.at(-1), 20000);
assert.ok(sizes.length >= 50);
assert.ok(sizes.every((n, i) => n % 20 === 0 && (!i || n > sizes[i - 1])));

for (const s of [-1, .2, 1]) {
  const highN = bernsteinQuantileExperiment(s, { sampleSizes:sizes });
  const refined = bernsteinQuantileExperiment(s, { sampleSizes:sizes, intervals:9600 });
  assert.equal(highN.quadrature.intervals, 4800);
  assert.deepEqual(highN.sampleSizes, sizes);
  assert.notEqual(highN.sampleSizes, sizes);
  assert.deepEqual(highN.curves, bernsteinQuantileExperiment(s, { sampleSizes:sizes }).curves);
  for (const [i, curve] of highN.curves.entries()) {
    const [a, b] = rankFractions[i];
    assert.deepEqual(curve.points.map(point => point.n), sizes);
    for (const [j, point] of curve.points.entries()) {
      assert.equal(point.rank, point.n / b * a);
      close(point.mass, 1, 5e-11);
      close(point.signedError, refined.curves[i].points[j].signedError, 1e-12);
    }
    assert.ok(curve.points.at(-1).error > 1e-6);
  }

  // For aligned rank k=nt, the first-order n*bias limit is
  // −t Q'(t) + t(1−t) Q''(t)/2, from the Beta mean and variance.
  const asymptotic = bernsteinQuantileExperiment(s, { sampleSizes:[2000,20000] });
  const { law } = asymptotic;
  for (const { t, quantile, points } of asymptotic.curves) {
    const density = law.density(quantile);
    const derivative = law.means.reduce((acc, mean, i) => {
      const z = (quantile - mean) / law.sigma;
      return acc - law.weights[i] * z * standardDensity(z) / law.sigma ** 2;
    }, 0);
    const limit = -t / density - .5 * t * (1 - t) * derivative / density ** 3;
    const discrepancies = points.map(p => Math.abs(p.n * p.signedError - limit));
    assert.ok(discrepancies[1] < discrepancies[0]);
    close(points[1].n * points[1].signedError, limit, .035 * Math.max(1, Math.abs(limit)));
  }
}
assert.deepEqual(bernsteinQuantileExperiment(.2, { maxN:1, sampleSizes:[20,40] }).sampleSizes, [20,40]);
for (const sampleSizes of [[], [1,1], [20,10], [20.5], [0,20], [20,undefined,80], null]) {
  assert.throws(() => bernsteinQuantileExperiment(0, {sampleSizes}), RangeError);
}
for (const s of [-1.01, 1.01, NaN, Infinity, "0"]) assert.throws(() => bernsteinQuantileMixture(s), RangeError);
for (const options of [{ maxN: 0 }, { maxN: 1.5 }, { intervals: 1199 }, { intervals: 0 }]) {
  assert.throws(() => bernsteinQuantileExperiment(0, options), RangeError);
}
console.log("Bernstein quantiles: exact ranks, support tails and mass, quadrature refinement, small-sample identities, inverse-CDF Beta reference, and 1/n bias through n=20,000 passed.");
