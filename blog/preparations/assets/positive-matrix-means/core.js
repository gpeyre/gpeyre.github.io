/* Two geometric means of strictly positive 2 × 2 matrices; row-major arrays. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("../bures-covariances/core.js"));
  else root.PositiveMatrixMeans = factory(root.BuresCovariances);
})(typeof globalThis !== "undefined" ? globalThis : this, function (B) {
  "use strict";
  function spd(A) {
    const E = B.eigen(A);
    if (!(E.values[1] > 0)) throw new RangeError("Logarithms and these inverse formulas require strictly positive definite matrices.");
    return E;
  }
  function spectral(E, fn) {
    const a = fn(E.values[0]), b = fn(E.values[1]);
    if (![a, b].every(Number.isFinite)) throw new RangeError("The spectral function exceeds floating-point range.");
    const c = Math.cos(E.angle), s = Math.sin(E.angle);
    return [a * c * c + b * s * s, (a - b) * c * s, (a - b) * c * s, a * s * s + b * c * c];
  }
  function log(A) { return spectral(spd(A), Math.log); }
  function exp(H) {
    if (!Array.isArray(H) || H.length !== 4 || !H.every(Number.isFinite)) throw new RangeError("A symmetric exponent needs four finite entries.");
    const scale = Math.max(1, ...H.map(Math.abs));
    if (Math.abs(H[1] - H[2]) / scale > 64 * Number.EPSILON) throw new RangeError("The exponent must be symmetric.");
    const b = H[1] / 2 + H[2] / 2, center = H[0] / 2 + H[3] / 2, radius = Math.hypot(H[0] / 2 - H[3] / 2, b);
    return spectral({ values: [center + radius, center - radius], angle: Math.atan2(2 * b, H[0] - H[3]) / 2 }, Math.exp);
  }
  function power(A, p) {
    if (!Number.isFinite(p)) throw new RangeError("A power must be finite.");
    return spectral(spd(A), v => Math.exp(p * Math.log(v)));
  }
  function logDet(A) { const E = spd(A); return Math.log(E.values[0]) + Math.log(E.values[1]); }
  function parameter(t) { if (!Number.isFinite(t) || t < 0 || t > 1) throw new RangeError("Interpolation time must be in [0,1]."); }
  function sandwich(S, A) { return B.symmetric(B.multiply(B.multiply(S, A), B.transpose(S))); }
  function logEuclidean(A, C, t) {
    parameter(t); spd(A); spd(C);
    if (t === 0) return A.slice(); if (t === 1) return C.slice();
    return exp(B.add(B.scale(log(A), 1 - t), B.scale(log(C), t)));
  }
  function geometric(A, C, t) {
    parameter(t); spd(A); spd(C);
    if (t === 0) return A.slice(); if (t === 1) return C.slice();
    // Normalize endpoints separately before whitening: avoid multiplying two
    // huge common scales only to cancel them with an inverse square root.
    const a = Math.max(...A.map(Math.abs)), c = Math.max(...C.map(Math.abs));
    const X = B.scale(A, 1 / a), Y = B.scale(C, 1 / c);
    const root = B.sqrt(X), inverseRoot = B.inverseSqrt(X);
    const relative = sandwich(inverseRoot, Y);
    const factor = Math.exp((1 - t) * Math.log(a) + t * Math.log(c));
    return B.scale(sandwich(root, power(relative, t)), factor);
  }
  function logarithmic(A, C) {
    spd(A); spd(C);
    const scale = Math.max(...A.map(Math.abs), ...C.map(Math.abs));
    const X = B.scale(A, 1 / scale), Y = B.scale(C, 1 / scale);
    const root = B.sqrt(X), inverseRoot = B.inverseSqrt(X);
    const relative = sandwich(inverseRoot, Y);
    const average = spectral(spd(relative), value => {
      const r = Math.log(value);
      return r === 0 ? 1 : Math.expm1(r) / r;
    });
    return B.scale(sandwich(root, average), scale);
  }
  function interpolate(A, C, t, kind) {
    if (kind === "log") return logEuclidean(A, C, t);
    if (kind === "ka") return geometric(A, C, t);
    throw new RangeError("Unknown geometric mean.");
  }
  function relativeDifference(A, C) { return B.norm(A.map((v, i) => v - C[i])) / Math.max(B.norm(A), B.norm(C), Number.MIN_VALUE); }
  const presets = {
    commuting: { aAngle: 20, bAngle: 20, aAspect: 5, bAspect: 2, bSize: 1.1, t: .5 },
    noncommuting: { aAngle: -22, bAngle: 37, aAspect: 9, bAspect: 6, bSize: 1.08, t: .5 },
    thin: { aAngle: -15, bAngle: 63, aAspect: 25, bAspect: 25, bSize: .85, t: .5 },
    scalar: { aAngle: 0, bAngle: 0, aAspect: 1, bAspect: 1, bSize: 2, t: .5 }
  };
  return { ...B, log, exp, power, logDet, sandwich, logEuclidean, geometric, logarithmic, interpolate, relativeDifference, presets };
});
