/* Exact Gaussian-mixture expectations. No sampling or numerical integration. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SteinOperator = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const weights = Object.freeze([.2, .5, .3]);
  const offsets = Object.freeze([-1.1, -.1, .9]);
  const tests = Object.freeze([
    { key: "constant", label: "1", f: () => 1, derivative: () => 0 },
    { key: "linear", label: "x", f: x => x, derivative: () => 1 },
    { key: "quadratic", label: "x² − 1", f: x => x * x - 1, derivative: x => 2 * x },
    { key: "cubic", label: "x³ − 3x", f: x => x * x * x - 3 * x, derivative: x => 3 * x * x - 3 },
    { key: "sine", label: "sin(2x)", f: x => Math.sin(2 * x), derivative: x => 2 * Math.cos(2 * x) },
    { key: "cosine", label: "cos(2x)", f: x => Math.cos(2 * x), derivative: x => -2 * Math.sin(2 * x) }
  ]);
  // Fixed plotting scales, calibrated over the full two-slider rectangle.
  const residualScales = Object.freeze([1.5, 3.3, 8.4, 20.7, 1, 1.03]);
  function mixture(theta, position = 0) {
    if (!Number.isFinite(theta) || theta < -1 || theta > 1) throw new RangeError("theta must belong to [-1,1]");
    if (!Number.isFinite(position) || position < -1 || position > 1) throw new RangeError("position must belong to [-1,1]");
    const a = 2 * theta, sigma = 1 - .75 * Math.abs(theta), variance = sigma * sigma, shift = 1.5 * position;
    return { theta, position, shift, a, weights: weights.slice(), means: offsets.map(x => shift + a * x), variance, sigma };
  }
  function gaussian(x, mean = 0, variance = 1) {
    return Math.exp(-.5 * (x - mean) ** 2 / variance) / Math.sqrt(2 * Math.PI * variance);
  }
  function density(x, state) { return state.weights.reduce((sum, w, i) => sum + w * gaussian(x, state.means[i], state.variance), 0); }
  function rawMoment(n, state) {
    if (!Number.isInteger(n) || n < 0 || n > 12) throw new RangeError("Use a moment order between zero and twelve");
    return state.weights.reduce((sum, w, i) => {
      let old = 1, current = state.means[i];
      if (!n) return sum + w;
      for (let j = 2; j <= n; j++) { const next = state.means[i] * current + (j - 1) * state.variance * old; old = current; current = next; }
      return sum + w * current;
    }, 0);
  }
  function characteristic(omega, state) {
    const factor = Math.exp(-.5 * state.variance * omega * omega);
    let real = 0, imag = 0, xReal = 0, xImag = 0;
    for (let i = 0; i < state.weights.length; i++) {
      const mu = state.means[i], w = factor * state.weights[i], c = Math.cos(omega * mu), s = Math.sin(omega * mu);
      real += w * c; imag += w * s;
      xReal += w * (mu * c - state.variance * omega * s);
      xImag += w * (mu * s + state.variance * omega * c);
    }
    return { real, imag, xReal, xImag };
  }
  function expectations(state) {
    const m = state.shift, a = state.a, v = state.variance + .49 * a * a;
    const m2 = rawMoment(2, state), m3 = rawMoment(3, state), m4 = rawMoment(4, state), cf = characteristic(2, state);
    const values = [[0, m], [1, m2], [2 * m, m3 - m], [3 * m2 - 3, m4 - 3 * m2],
      [2 * cf.real, cf.xImag], [-2 * cf.imag, cf.xReal]];
    const means = [1, m, m2 - 1, m3 - 3 * m, cf.imag, cf.real];
    // Equivalent cumulant formulas avoid subtracting large nearby raw moments.
    const residuals = [-m, 1 - v - m * m, -(m ** 3) + 3 * m * (1 - v) + .048 * a ** 3,
      -(m ** 4) - 6 * m * m * (v - 1) - 3 * (v - 1) ** 2 + .192 * m * a ** 3 + .2306 * a ** 4,
      2 * cf.real - cf.xImag, -2 * cf.imag - cf.xReal];
    return tests.map((test, i) => {
      const residual = state.theta === 0 && state.position === 0 ? 0 : residuals[i];
      return { key: test.key, label: test.label, expectation: means[i], derivative: values[i][0], xTimesF: values[i][1], residual,
        scale: residualScales[i], normalized: residual / residualScales[i] };
    });
  }
  function steinValue(test, x) { return test.derivative(x) - x * test.f(x); }
  function state(theta, position = 0) {
    const q = mixture(theta, position), secondMoment = rawMoment(2, q);
    return { ...q, rows: expectations(q), mean: q.shift, secondMoment, totalVariance: q.variance + .49 * q.a * q.a };
  }
  return { weights, offsets, tests, residualScales, mixture, gaussian, density, rawMoment, characteristic, expectations, steinValue, state };
}));
