"use strict";

const assert = require("node:assert/strict");
const { sinusoidalLaw, cdfIntegrand, cdfSquaredDistance } = require("../blog/preparations/assets/ot-lab/core.js");

function close(actual, expected, tolerance = 1e-13) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected} by more than ${tolerance}`);
}

for (const lambda of [-.9, -.45, 0, .6, .9]) {
  const { density, cdf } = sinusoidalLaw(lambda);
  for (const x of [-Infinity, -1, -.001]) {
    assert.equal(density(x), 0);
    assert.equal(cdf(x), 0);
  }
  for (const x of [1.001, 2, Infinity]) {
    assert.equal(density(x), 0);
    assert.equal(cdf(x), 1);
  }
  assert.equal(density(0), 1);
  assert.equal(density(1), 1);
  assert.equal(cdf(0), 0);
  assert.equal(cdf(1), 1);
  let mass = 0, previous = 0;
  for (let i = 0; i < 400; i++) {
    const x = (i + .5) / 400, h = 1e-6;
    close(density(x), 1 + lambda * Math.sin(2 * Math.PI * x));
    close((cdf(x + h) - cdf(x - h)) / (2 * h), density(x), 2e-10);
    const value = cdf(x);
    assert.ok(density(x) >= .1 - 1e-14 && value > previous && value < 1);
    mass += density(x) / 400;
    previous = value;
    if (lambda === 0) { assert.equal(density(x), 1); assert.equal(value, x); }
  }
  close(mass, 1);
}
for (const invalid of [-1, 1, NaN, Infinity, "0", undefined]) {
  assert.throws(() => sinusoidalLaw(invalid), RangeError);
}

const uniform = x => Math.max(0, Math.min(1, x));
const square = x => uniform(x) ** 2;
close(cdfIntegrand(uniform, square, .2, .3), .11);
close(cdfIntegrand(square, uniform, .2, .3), .11);
assert.equal(cdfIntegrand(uniform, square, .1, .9), 0);
close(cdfIntegrand(uniform, square, .4, .4), .24);
for (const x of [0, .1, .6, 1]) for (const y of [x, (x + 1) / 2, 1]) {
  assert.equal(cdfIntegrand(square, square, x, y), 0);
}
assert.equal(cdfSquaredDistance(square, square, 60), 0);
// A one-cell square uses the diagonal triangle's centroid and half area.
close(cdfSquaredDistance(uniform, x => uniform(x) ** 4, 1), 1 / 3 - (2 / 3) ** 4);

function checkConvergence(F, G, reference, lower = 0, upper = 1) {
  const estimate = n => cdfSquaredDistance(F, G, n, lower, upper);
  const small = estimate(20), large = estimate(400);
  assert.ok(Math.abs(large - reference) < Math.abs(small - reference), `${small}, ${large}, reference ${reference}`);
  close(large, reference, 1.2e-6);
  assert.equal(large, cdfSquaredDistance(G, F, 400, lower, upper));
}

// The two inverse CDFs are r and sqrt(r); integrate (r − sqrt(r))².
checkConvergence(uniform, square, 1 / 30);
// A translation of a uniform law has constant quantile displacement.
checkConvergence(uniform, x => uniform(x - .2), .04, 0, 1.2);

function quantile(lambda, r) {
  // Invert the closed form by bisection, independently of the shared CDF
  // evaluator and of the ordered-triangle quadrature in the experiment.
  let left = 0, right = 1;
  for (let k = 0; k < 49; k++) {
    const x = (left + right) / 2;
    const cdf = x + lambda * (1 - Math.cos(2 * Math.PI * x)) / (2 * Math.PI);
    if (cdf < r) left = x;
    else right = x;
  }
  return (left + right) / 2;
}
for (const [a, b] of [[.6, -.45], [.9, -.9], [0, .6], [.1, .125]]) {
  const samples = 8192;
  let reference = 0;
  for (let i = 0; i < samples; i++) {
    const r = (i + .5) / samples;
    reference += (quantile(a, r) - quantile(b, r)) ** 2 / samples;
  }
  assert.ok(reference > 0);
  checkConvergence(sinusoidalLaw(a).cdf, sinusoidalLaw(b).cdf, reference);
}
console.log("CDF-only Wasserstein: supported densities and CDFs, symmetric ordered integrand, and quadrature versus closed forms and inverted quantiles passed.");
