/* Power f-divergences on the probability simplex; shared by plot and tests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DivergenceSimplex = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const floor = .04, defaultTarget = [.16, .58, .26];
  function exprel(t) {
    if (Math.abs(t) < 1e-5) return 1 + t * (1 / 2 + t * (1 / 6 + t * (1 / 24 + t / 120)));
    return Math.expm1(t) / t;
  }
  function phi(r, lambda) {
    if (!Number.isFinite(lambda) || lambda < 0 || lambda > 2 || r < 0 || Number.isNaN(r)) throw new RangeError("Use r ≥ 0 and 0 ≤ λ ≤ 2.");
    if (r === 0) return lambda === 0 ? Infinity : 1 / lambda;
    if (!Number.isFinite(r)) return Infinity;
    const d = r - 1;
    // Integrating phi''(r)=r^(lambda-2) gives this stable expansion at one.
    if (Math.abs(d) < 1e-4) {
      let term = d * d / 2, sum = term;
      for (let k = 3; k <= 7; k++) { term *= (lambda - k + 1) * d / k; sum += term; }
      return Math.max(0, sum);
    }
    const t = Math.log(r);
    const value = Math.abs(lambda - 1) < .25
      ? (r * t * exprel((lambda - 1) * t) - d) / lambda
      : (t * exprel(lambda * t) - d) / (lambda - 1);
    return Math.max(0, value);
  }
  function simplex(q) {
    if (!Array.isArray(q) || q.length !== 3 || q.some(v => !Number.isFinite(v) || v < -1e-12) || Math.abs(q.reduce((a, b) => a + b, 0) - 1) > 1e-9) throw new RangeError("Use a probability vector of length three.");
    return q.map(v => Math.max(0, v));
  }
  function divergence(q, p, lambda) {
    q = simplex(q); p = simplex(p);
    if (p.some(v => v <= 0)) throw new RangeError("The target must have positive coordinates.");
    return q.reduce((value, v, i) => value + p[i] * phi(v / p[i], lambda), 0);
  }
  function projectTarget(q) {
    if (!Array.isArray(q) || q.length !== 3 || q.some(v => !Number.isFinite(v))) throw new RangeError("Invalid target.");
    const mass = 1 - 3 * floor, shifted = q.map(v => v - floor), sorted = shifted.slice().sort((a, b) => b - a);
    let sum = 0, threshold = 0;
    for (let k = 0; k < 3; k++) { sum += sorted[k]; const t = (sum - mass) / (k + 1); if (k === 2 || sorted[k + 1] <= t) { threshold = t; break; } }
    const out = shifted.map(v => floor + Math.max(0, v - threshold));
    out[2] += 1 - out.reduce((a, b) => a + b, 0);
    return out;
  }
  function name(lambda) {
    if (lambda === 0) return "reverse KL";
    if (lambda === .5) return "twice squared Hellinger";
    if (lambda === 1) return "KL";
    if (lambda === 2) return "half Pearson χ²";
    return "power divergence";
  }
  return { phi, divergence, projectTarget, simplex, floor, defaultTarget, name };
});
