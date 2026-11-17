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
  function mixture(theta) {
    if (!Number.isFinite(theta) || theta < -1 || theta > 1) throw new RangeError("theta must belong to [-1,1]");
    const a = 1.35 * theta, variance = 1 - .49 * a * a;
    return { theta, a, weights: weights.slice(), means: offsets.map(x => a * x), variance, sigma: Math.sqrt(variance) };
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
    const a = state.a, cf = characteristic(2, state);
    // Central cumulants of (.2,.5,.3) at (-1.1,-.1,.9) are
    // kappa_3 = -.048 and kappa_4 = -.2306. These formulas avoid
    // subtracting nearly equal raw moments close to the Gaussian.
    const residual3 = .048 * a ** 3, residual4 = .2306 * a ** 4;
    const values = [[0, 0, 0], [1, 1, 0], [0, -residual3, residual3], [0, -residual4, residual4],
      [2 * cf.real, cf.xImag, 2 * cf.real - cf.xImag], [-2 * cf.imag, cf.xReal, -2 * cf.imag - cf.xReal]];
    const means = [1, 0, 0, -residual3, cf.imag, cf.real];
    return tests.map((test, i) => ({ key: test.key, label: test.label, expectation: means[i], derivative: values[i][0], xTimesF: values[i][1], residual: state.theta === 0 ? 0 : values[i][2] }));
  }
  function steinValue(test, x) { return test.derivative(x) - x * test.f(x); }
  function state(theta, selected = "cubic") {
    if (!tests.some(test => test.key === selected)) throw new RangeError("Unknown test function");
    const q = mixture(theta);
    return { ...q, selected, rows: expectations(q), mean: rawMoment(1, q), secondMoment: rawMoment(2, q) };
  }
  return { weights, offsets, tests, mixture, gaussian, density, rawMoment, characteristic, expectations, steinValue, state };
}));
