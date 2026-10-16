/* Dependency-free numerical core, shared by the figure and its Node tests. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AttentionSampling = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MIN_N = 8, MAX_N = 8192, DRAW_COUNT = 5;
  const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

  function mixSeed(seed) {
    let z = seed >>> 0;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    return (z ^ (z >>> 15)) >>> 0;
  }

  // Mulberry32, with midpoint conversion: every uniform is strictly in (0,1).
  function uniformGenerator(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return (((z ^ (z >>> 14)) >>> 0) + 0.5) / 4294967296;
    };
  }

  // Box–Muller generates independent normal pairs, not antithetic pairs or quantiles.
  function normalGenerator(seed) {
    const uniform = uniformGenerator(seed);
    let spare = null;
    return function () {
      if (spare !== null) {
        const value = spare;
        spare = null;
        return value;
      }
      const radius = Math.sqrt(-2 * Math.log(uniform()));
      const angle = 2 * Math.PI * uniform();
      spare = radius * Math.sin(angle);
      return radius * Math.cos(angle);
    };
  }

  function sampleNormal(seed, count) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError("Sample size must be a positive integer.");
    const normal = normalGenerator(seed), values = new Float64Array(count);
    for (let i = 0; i < count; i++) values[i] = normal();
    return values;
  }

  // Precompute each stream once; changing n only selects a longer/shorter prefix.
  function sampleBank(seed, maxN = MAX_N, count = DRAW_COUNT) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError("Draw count must be positive.");
    return Array.from({ length: count }, (_, i) => sampleNormal(mixSeed((seed >>> 0) + i + 1), maxN));
  }

  function nFromExponent(exponent) {
    if (!Number.isFinite(exponent)) throw new RangeError("Finite logarithmic sample size required.");
    return Math.max(MIN_N, Math.min(MAX_N, 2 ** Math.round(exponent)));
  }

  function prepareSample(values, n = values.length) {
    if (!Number.isInteger(n) || n < 1 || n > values.length) throw new RangeError("Invalid sample prefix length.");
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(values[i])) throw new RangeError("Tokens must be finite.");
      min = Math.min(min, values[i]);
      max = Math.max(max, values[i]);
    }
    return { values, n, min, max };
  }

  function population(x, tau = 1) { return tau * x; }

  function evaluatePrepared(sample, x, tau = 1) {
    const coefficient = tau * x;
    if (!Number.isFinite(coefficient)) throw new RangeError("Finite attention coefficient required.");
    // Subtract the largest logit before exponentiating, without forming exp(tau*x*y).
    const anchor = coefficient >= 0 ? sample.max : sample.min;
    let denominator = 0, centeredNumerator = 0;
    for (let i = 0; i < sample.n; i++) {
      const delta = sample.values[i] - anchor;
      const weight = Math.exp(coefficient * delta);
      denominator += weight;
      centeredNumerator += weight * delta;
    }
    const value = anchor + centeredNumerator / denominator;
    // Roundoff must not violate the exact convex-hull property.
    return Math.max(sample.min, Math.min(sample.max, value));
  }

  function attention(values, x, tau = 1, n = values.length) {
    return evaluatePrepared(prepareSample(values, n), x, tau);
  }

  function gaussianDensity(x) { return INV_SQRT_2PI * Math.exp(-x * x / 2); }

  function simpsonRule(a = -8, b = 8, intervals = 256) {
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a || !Number.isInteger(intervals) || intervals < 2 || intervals % 2) {
      throw new RangeError("Simpson quadrature needs finite increasing bounds and an even interval count.");
    }
    const nodes = new Float64Array(intervals + 1), weights = new Float64Array(intervals + 1);
    const h = (b - a) / intervals;
    for (let i = 0; i <= intervals; i++) {
      nodes[i] = a + i * h;
      weights[i] = h * (i === 0 || i === intervals ? 1 : i % 2 ? 4 : 2) / 3;
    }
    return { nodes, weights, a, b, intervals };
  }

  function integrate(fn, rule = simpsonRule()) {
    let result = 0;
    for (let i = 0; i < rule.nodes.length; i++) result += rule.weights[i] * fn(rule.nodes[i]);
    return result;
  }

  function l2FromValues(values, tau, rule) {
    if (values.length !== rule.nodes.length) throw new RangeError("One value is required for every quadrature node.");
    let square = 0;
    for (let i = 0; i < values.length; i++) {
      const error = values[i] - population(rule.nodes[i], tau);
      square += rule.weights[i] * gaussianDensity(rule.nodes[i]) * error * error;
    }
    return Math.sqrt(square);
  }

  return { MIN_N, MAX_N, DRAW_COUNT, mixSeed, uniformGenerator, normalGenerator, sampleNormal,
    sampleBank, nFromExponent, prepareSample, population, evaluatePrepared, attention,
    gaussianDensity, simpsonRule, integrate, l2FromValues };
});
