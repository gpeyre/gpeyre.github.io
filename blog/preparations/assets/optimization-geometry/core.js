/* Small deterministic numerical models; also importable by Node tests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OptimizationGeometry = api;
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";
  const sum = a => a.reduce((s, x) => s + x, 0);
  const norm = a => Math.hypot(...a);
  const dot = (a, b) => sum(a.map((x, i) => x * b[i]));
  function positive(x, name) { if (!Number.isFinite(x) || x <= 0) throw new RangeError(name + " must be positive"); }
  function count(n) { if (!Number.isInteger(n) || n < 0 || n > 20000) throw new RangeError("invalid iteration count"); }

  function scalarFactors(z, lambda) {
    if (!Number.isFinite(z) || !Number.isFinite(lambda)) throw new RangeError("finite scalar state required");
    const mobility = Math.hypot(lambda, 2 * z);
    // Choose the nonnegative branch when z >= 0, with a stable small root.
    let a, b;
    if (lambda >= 0) { a = Math.sqrt((mobility + lambda) / 2); b = a ? z / a : 0; }
    else { b = Math.sqrt((mobility - lambda) / 2); a = b ? z / b : 0; }
    return {a, b, z, lambda, mobility};
  }
  function scalarVelocity(z, lambda, target) { return -Math.hypot(lambda, 2 * z) * (z - target); }
  function scalarTrajectory(z0, lambda, target = 1.3, horizon = 5, samples = 1000) {
    positive(z0, "initial product"); positive(target, "target"); positive(horizon, "horizon");
    positive(samples, "samples"); count(samples);
    const dt = horizon / samples, result = [];
    let z = z0;
    for (let k = 0; k <= samples; k++) {
      result.push({t: k * dt, ...scalarFactors(z, lambda)});
      const f = u => scalarVelocity(u, lambda, target);
      // Substeps prevent the largest mobility from compromising the RK4 solve.
      const steps = Math.max(1, Math.ceil(dt * Math.hypot(lambda, 2 * target) / .02));
      const h = dt / steps;
      for (let j = 0; j < steps; j++) {
        const v1 = f(z), v2 = f(z + h * v1 / 2), v3 = f(z + h * v2 / 2), v4 = f(z + h * v3);
        z += h * (v1 + 2 * v2 + 2 * v3 + v4) / 6;
      }
    }
    return result;
  }
  function lowRankCondition(s, singulars = [4, 1]) {
    positive(s, "factor scale");
    if (!singulars.length || singulars.some(x => !Number.isFinite(x) || x <= 0)) throw new RangeError("positive singular values required");
    const alpha = singulars.map(x => s * s * x), beta = singulars.map(x => x / (s * s));
    const eigenvalues = alpha.flatMap(a => beta.map(b => a + b)).concat(alpha, beta);
    const L = Math.max(...eigenvalues), mu = Math.min(...eigenvalues);
    return {s, alpha, beta, eigenvalues, L, mu, kappa: L / mu};
  }
  function lowRankFactors(s, delta = 0) {
    positive(s, "factor scale");
    if (!Number.isFinite(delta) || delta < 0) throw new RangeError("nonnegative perturbation required");
    const d = delta / Math.SQRT2;
    return {A: [[2 * s, 0], [0, s], [0, d]], B: [[2 / s, 0, 0], [0, 1 / s, d]]};
  }
  function lowRankLossGradient(A, B) {
    const Y = [[4, 0, 0], [0, 1, 0], [0, 0, 0]];
    const E = Y.map((row, i) => row.map((y, j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] - y));
    const gA = A.map((row, i) => row.map((_, k) => sum(E[i].map((e, j) => e * B[k][j]))));
    const gB = B.map((row, k) => row.map((_, j) => sum(A.map((a, i) => a[k] * E[i][j]))));
    return {loss: sum(E.flat().map(e => e * e)) / 2, E, gA, gB};
  }
  function lowRankTrajectory(s, iterations = 1800, delta = .001) {
    count(iterations); positive(delta, "perturbation");
    const {L, mu, kappa} = lowRankCondition(s), eta = .8 / L;
    let {A, B} = lowRankFactors(s, delta);
    const initialLoss = lowRankLossGradient(A, B).loss, result = [];
    const alpha = s * s, beta = 1 / alpha;
    for (let k = 0; k <= iterations; k++) {
      const {loss, gA, gB} = lowRankLossGradient(A, B);
      const linearized = (alpha * Math.pow(1 - eta * alpha, 2 * k) + beta * Math.pow(1 - eta * beta, 2 * k)) / (alpha + beta);
      result.push({k, loss, relative: loss / initialLoss, linearized});
      A = A.map((row, i) => row.map((x, j) => x - eta * gA[i][j]));
      B = B.map((row, i) => row.map((x, j) => x - eta * gB[i][j]));
    }
    return {result, initialLoss, delta, L, mu, kappa, eta};
  }
  function pairConstants(d = 20, epsilon = .01, spread = false) {
    if (!Number.isInteger(d) || d < 2 || d % 2 || !Number.isFinite(epsilon) || epsilon <= 0 || epsilon >= 1) throw new RangeError("even dimension and epsilon in (0,1) required");
    const L2 = 1, mu2 = epsilon;
    const Linf = spread ? d : d - 1 + epsilon;
    const muinf = spread ? d * epsilon / (1 + (d - 1) * epsilon) : epsilon;
    return {d, epsilon, L2, mu2, Linf, muinf, kappa2: L2 / mu2, kappainf: Linf / muinf};
  }
  function rotateToSpread(x) {
    const d = x.length, w = x.map((_, i) => (i === 0 ? 1 : 0) - 1 / Math.sqrt(d));
    const c = 2 * dot(w, x) / dot(w, w);
    return x.map((u, i) => u - c * w[i]);
  }
  function pairGradient(x, epsilon = .01, spread = false) {
    const mean = sum(x) / x.length;
    return x.map((u, i) => spread ? u - (1 - epsilon) * mean : (i === 0 ? epsilon * u : u));
  }
  function initialDirection(d = 20, mode = "mixed") {
    if (!["soft", "mixed", "hard"].includes(mode)) throw new RangeError("unknown initial direction");
    const x = Array.from({length: d}, (_, i) => i === 0 ? 0 : (i % 2 ? 1 : -1) / Math.sqrt(d - 1));
    if (mode === "soft") return x.map((_, i) => i === 0 ? 1 : 0);
    if (mode === "hard") return x;
    return x.map((u, i) => i === 0 ? 1 / Math.SQRT2 : u / Math.SQRT2);
  }
  function signTrajectory({d = 20, epsilon = .01, spread = false, method = "sign", mode = "mixed", iterations = 1200} = {}) {
    count(iterations);
    if (!["sign", "gd"].includes(method)) throw new RangeError("unknown descent method");
    const constants = pairConstants(d, epsilon, spread);
    const L = method === "gd" ? constants.L2 : constants.Linf;
    const mu = method === "gd" ? constants.mu2 : constants.muinf;
    const eta = 1 / L;
    let x = initialDirection(d, mode); if (spread) x = rotateToSpread(x);
    const initialLoss = dot(x, pairGradient(x, epsilon, spread)) / 2;
    const result = [];
    for (let k = 0; k <= iterations; k++) {
      const g = pairGradient(x, epsilon, spread), loss = Math.max(0, dot(x, g) / 2);
      result.push({k, relative: loss / initialLoss, loss, bound: Math.pow(1 - mu / L, k)});
      const scale = method === "sign" ? sum(g.map(Math.abs)) : 1;
      x = x.map((u, i) => u - eta * (method === "gd" ? g[i] : scale * Math.sign(g[i])));
    }
    return {result, x, initialLoss, eta, L, mu, ...constants};
  }
  return {scalarFactors, scalarVelocity, scalarTrajectory, lowRankCondition, lowRankFactors, lowRankLossGradient, lowRankTrajectory,
    pairConstants, rotateToSpread, pairGradient, initialDirection, signTrajectory, norm, dot};
});
