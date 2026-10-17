/* Exact two-by-two transport polytope; no entropic or assignment approximation. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SpectralTransport = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const a = [1, 0], b = [0.1, 1], c = [0.15, 0.2];
  const source = [a.slice(), a.map(x => -x)];
  const target = [b.map((x, k) => x + c[k]), b.map((x, k) => -x + c[k])];
  const outer = x => [x[0] * x[0], x[0] * x[1], x[1] * x[1]];
  const u = outer(a.map((x, k) => x - b[k]));
  const v = outer(a.map((x, k) => x + b[k]));
  const center = outer(c);
  const slope = u.map((x, k) => x - v[k]);

  // Symmetric matrices are stored as [Q_11, Q_12, Q_22].
  function covariance(s) {
    if (!Number.isFinite(s) || s < 0 || s > 1) throw new RangeError("Coupling parameter must lie in [0,1].");
    return center.map((x, k) => x + s * u[k] + (1 - s) * v[k]);
  }

  function eigenvalues(q) {
    const trace = q[0] + q[2], gap = Math.hypot(q[0] - q[2], 2 * q[1]);
    const high = Math.max(0, (trace + gap) / 2);
    // The determinant expression preserves the smaller eigenvalue near rank one.
    const determinant = Math.max(0, q[0] * q[2] - q[1] * q[1]);
    return [high, high > 0 ? determinant / high : 0];
  }

  function gamma(q, p) {
    if (!(p > 0)) throw new RangeError("A positive Schatten exponent is required.");
    const [high, low] = eigenvalues(q);
    if (p === Infinity || high === 0) return high;
    return high * Math.pow(1 + Math.pow(low / high, p), 1 / p);
  }

  function value(s, p) { return gamma(covariance(s), p); }
  function coupling(s) { return [[s / 2, (1 - s) / 2], [(1 - s) / 2, s / 2]]; }

  function derivative(s, p) {
    if (!(p > 1)) throw new RangeError("This derivative is used only for p > 1.");
    const q = covariance(s), [high, low] = eigenvalues(q);
    const gap = high - low, traceSlope = slope[0] + slope[2];
    const highSlope = gap > 1e-13 ? traceSlope / 2 +
      ((q[0] - q[2]) * (slope[0] - slope[2]) + 4 * q[1] * slope[1]) / (2 * gap) : traceSlope / 2;
    if (p === Infinity) return highSlope;
    const ratio = low / high;
    return Math.pow(1 + Math.pow(ratio, p), 1 / p - 1) *
      (highSlope + Math.pow(ratio, p - 1) * (traceSlope - highSlope));
  }

  function optimize(p) {
    if (!(p > 0)) throw new RangeError("A positive Schatten exponent is required.");
    let s;
    if (p <= 1) {
      // The positive Schatten p anti-norm is concave for 0 < p < 1;
      // a minimum on this whole segment is therefore attained at an endpoint.
      s = value(0, p) <= value(1, p) ? 0 : 1;
    } else if (derivative(0, p) >= 0) s = 0;
    else if (derivative(1, p) <= 0) s = 1;
    else {
      // Convex one-dimensional problem: bisection on the monotone derivative.
      // In this example the leading eigenvalue is simple throughout [0,1].
      let lo = 0, hi = 1;
      for (let i = 0; i < 64; i++) {
        const middle = (lo + hi) / 2;
        if (derivative(middle, p) < 0) lo = middle;
        else hi = middle;
      }
      s = (lo + hi) / 2;
    }
    const q = covariance(s), cost = gamma(q, p);
    // For convex objectives this is the exact linearization gap on [0,1].
    const d = p > 1 ? derivative(s, p) : 0;
    const gap = p > 1 ? Math.max(0, d * (d >= 0 ? s : s - 1)) : 0;
    return { s, q, eigenvalues: eigenvalues(q), coupling: coupling(s), cost, distance: Math.sqrt(cost), gap };
  }

  function interpolation(s, t) {
    const pi = coupling(s), particles = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (pi[i][j] > 1e-12) {
      particles.push({ mass: pi[i][j], source: i, target: j,
        point: source[i].map((x, k) => (1 - t) * x + t * target[j][k]) });
    }
    return particles;
  }

  return { a, b, c, source, target, slope, covariance, eigenvalues, gamma, value, coupling, derivative, optimize, interpolation };
});
