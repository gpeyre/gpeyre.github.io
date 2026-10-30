/* Stable power means and their simultaneous Gauss iteration. No dependencies. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GeneralizedMeans = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function positive(x) {
    if (!(x > 0) || !Number.isFinite(x)) throw new RangeError("Inputs must be finite and strictly positive.");
  }
  function parameter(p) {
    if (!Number.isFinite(p)) throw new RangeError("The power must be finite.");
  }
  function logCosh(z) {
    const a = Math.abs(z);
    if (a < 1e-3) {
      const s = a * a;
      return s * (.5 + s * (-1 / 12 + s * (1 / 45 - 17 * s / 2520)));
    }
    if (a < 20) { const s = Math.sinh(a / 2); return Math.log1p(2 * s * s); }
    return a + Math.log1p(Math.exp(-2 * a)) - Math.LN2;
  }
  function powerMean(p, x, y) {
    parameter(p); positive(x); positive(y);
    if (x === y) return x;
    const lo = Math.min(x, y), hi = Math.max(x, y);
    if (p === 1) return lo / 2 + hi / 2;
    if (p === -1) return lo / (.5 + .5 * (lo / hi));
    if (p === 0) return Math.max(lo, Math.min(hi, Math.sqrt(lo) * Math.sqrt(hi)));
    const lx = Math.log(lo), ly = Math.log(hi), center = lx / 2 + ly / 2, d = (ly - lx) / 2;
    const z = p * d;
    let correction;
    if (Math.abs(z) < 1e-3) {
      const s = z * z;
      // This form stays continuous at p=0, even if p*d underflows.
      correction = p * d * d * (.5 + s * (-1 / 12 + s * (1 / 45 - 17 * s / 2520)));
    } else if (Math.abs(z) >= 20) {
      // Anchor at the dominant input, avoiding large opposing logarithms.
      const anchor = p > 0 ? ly : lx;
      const value = Math.exp(anchor + (Math.log1p(Math.exp(-2 * Math.abs(z))) - Math.LN2) / p);
      return Math.max(lo, Math.min(hi, value));
    } else correction = logCosh(z) / p;
    // Every mean is internal; this also removes endpoint-size roundoff drift.
    return Math.max(lo, Math.min(hi, Math.exp(center + correction)));
  }
  function snapshot(x, y, iteration) {
    const lower = Math.min(x, y), upper = Math.max(x, y), width = upper - lower;
    return { iteration, x, y, lower, upper, width, estimate: lower / 2 + upper / 2, radius: width / 2 };
  }
  function gaussMean(p, q, x, y, options) {
    parameter(p); parameter(q); positive(x); positive(y);
    const opts = options || {}, relativeTolerance = opts.relativeTolerance === undefined ? 1e-12 : opts.relativeTolerance;
    const absoluteTolerance = opts.absoluteTolerance === undefined ? 0 : opts.absoluteTolerance;
    const maxIterations = opts.maxIterations === undefined ? 64 : opts.maxIterations;
    if (!Number.isFinite(relativeTolerance) || relativeTolerance < 0 || !Number.isFinite(absoluteTolerance) || absoluteTolerance < 0 || !Number.isInteger(maxIterations) || maxIterations < 0 || maxIterations > 10000)
      throw new RangeError("Use nonnegative finite tolerances and an iteration cap between 0 and 10000.");
    const trace = [snapshot(x, y, 0)];
    let current = trace[0], stopReason = "max-iterations", converged = false;
    function toleranceMet() { return current.radius <= absoluteTolerance + relativeTolerance * Math.abs(current.estimate); }
    if (x === y) { stopReason = "equal-inputs"; converged = true; }
    else if (toleranceMet()) { stopReason = "tolerance"; converged = true; }
    else for (let n = 1; n <= maxIterations; n++) {
      const nextX = powerMean(p, x, y), nextY = powerMean(q, x, y);
      const previous = current;
      x = nextX; y = nextY;
      current = snapshot(x, y, n); trace.push(current);
      // A zero floating-point width is not evidence of a zero exact error.
      if (current.width === 0) { stopReason = "roundoff"; break; }
      if (toleranceMet()) { stopReason = "tolerance"; converged = true; break; }
      if (current.lower === previous.lower && current.upper === previous.upper) { stopReason = "roundoff"; break; }
    }
    return { p, q, value: current.estimate, lower: current.lower, upper: current.upper,
      radius: current.radius, iterations: current.iteration, converged, stopReason, trace,
      relativeTolerance, absoluteTolerance, maxIterations };
  }
  function sampleFields(p, q, size) {
    parameter(p); parameter(q);
    size = size === undefined ? 111 : size;
    if (!Number.isInteger(size) || size < 3 || size > 301) throw new RangeError("Use a grid size between 3 and 301.");
    const min = .08, max = 2, single = new Float64Array(size * size), composed = new Float64Array(size * size);
    let largestRadius = 0, capped = 0;
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
      const x = min + (max - min) * col / (size - 1), y = max - (max - min) * row / (size - 1), k = row * size + col;
      single[k] = powerMean(p, x, y);
      const result = gaussMean(p, q, x, y, { relativeTolerance: 1e-9, maxIterations: 64 });
      composed[k] = result.value; largestRadius = Math.max(largestRadius, result.radius);
      if (result.stopReason === "max-iterations") capped++;
    }
    return { size, min, max, single, composed, largestRadius, capped };
  }
  return { logCosh, powerMean, gaussMean, sampleFields };
});
