/* Two-dimensional linear flows. Matrices are row-major arrays. No dependencies. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ResnetFlow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const I = [1, 0, 0, 1], J = [0, -1, 1, 0], H = [0, 1, 0, 0], V = [0, 0, 1, 0];
  const defaults = {mode: "strain", alpha: 0, omega: 0.35, shear: 1, strain: 0.75, speed: 1.25, reverse: false, horizon: 2};
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const scale = (a, s) => a.map(v => s * v);
  const multiply = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
  const apply = (a, x) => [a[0] * x[0] + a[1] * x[1], a[2] * x[0] + a[3] * x[1]];
  const determinant = a => a[0] * a[3] - a[1] * a[2];
  const norm = a => Math.hypot(...a);
  const distance = (a, b) => norm(a.map((v, i) => v - b[i]));
  const rotation = t => [Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t)];
  const commutator = (a, b) => add(multiply(a, b), scale(multiply(b, a), -1));
  function parameters(options) {
    const p = Object.assign({}, defaults, options);
    if (!["constant", "strain", "shears"].includes(p.mode)) throw new RangeError("Unknown flow mode");
    for (const key of ["alpha", "omega", "shear", "strain", "speed", "horizon"]) {
      if (!Number.isFinite(p[key])) throw new TypeError(key + " must be finite");
    }
    if (p.horizon <= 0) throw new RangeError("horizon must be positive");
    return p;
  }
  function validateTime(t) {
    if (!Number.isFinite(t) || t < 0) throw new RangeError("Time must be finite and nonnegative");
  }
  /* Cayley–Hamilton: B=M−tr(M)I/2 has B²=qI. Series removes cancellation at q≈0. */
  function expm2(m) {
    if (!m || m.length !== 4 || !m.every(Number.isFinite)) throw new TypeError("Expected a finite 2×2 matrix");
    const halfTrace = (m[0] + m[3]) / 2, b = [m[0] - halfTrace, m[1], m[2], m[3] - halfTrace];
    const q = b[0] * b[0] + b[1] * b[2];
    let c, s;
    if (Math.abs(q) < 1e-8) {
      c = 1 + q / 2 + q * q / 24 + q * q * q / 720;
      s = 1 + q / 6 + q * q / 120 + q * q * q / 5040;
    } else if (q > 0) {
      const r = Math.sqrt(q); c = Math.cosh(r); s = Math.sinh(r) / r;
    } else {
      const r = Math.sqrt(-q); c = Math.cos(r); s = Math.sin(r) / r;
    }
    return scale(add(scale(I, c), scale(b, s)), Math.exp(halfTrace));
  }
  function matrixAt(t, options) {
    validateTime(t);
    const p = parameters(options), a = p.alpha;
    if (p.mode === "constant") return [a, p.shear - p.omega, p.omega, a];
    if (p.mode === "shears") {
      const first = t < p.horizon / 2, horizontal = p.reverse ? !first : first;
      return horizontal ? [a, p.shear, 0, a] : [a, 0, p.shear, a];
    }
    const c = p.strain * Math.cos(2 * p.speed * t), s = p.strain * Math.sin(2 * p.speed * t);
    return [a + c, s - p.omega, s + p.omega, a - c];
  }
  function integralMatrix(t, options) {
    validateTime(t);
    const p = parameters(options), a = p.alpha * t;
    if (p.mode === "constant") return scale(matrixAt(0, p), t);
    if (p.mode === "shears") {
      const first = Math.min(t, p.horizon / 2), second = Math.max(0, t - p.horizon / 2);
      return p.reverse ? [a, p.shear * second, p.shear * first, a] : [a, p.shear * first, p.shear * second, a];
    }
    const z = 2 * p.speed * t;
    const sinc = Math.abs(z) < 1e-5 ? 1 - z * z / 6 + z ** 4 / 120 : Math.sin(z) / z;
    const cosc = Math.abs(z) < 1e-5 ? z / 2 - z ** 3 / 24 + z ** 5 / 720 : 2 * Math.sin(z / 2) ** 2 / z;
    const c = p.strain * t * sinc, s = p.strain * t * cosc;
    return [a + c, s - p.omega * t, s + p.omega * t, a - c];
  }
  function exactFundamental(t, options) {
    validateTime(t);
    const p = parameters(options);
    if (p.mode === "constant") return expm2(scale(matrixAt(0, p), t));
    if (p.mode === "shears") {
      const first = Math.min(t, p.horizon / 2), second = Math.max(0, t - p.horizon / 2);
      const firstMatrix = add(I, scale(p.reverse ? V : H, p.shear * first));
      const secondMatrix = add(I, scale(p.reverse ? H : V, p.shear * second));
      return scale(multiply(secondMatrix, firstMatrix), Math.exp(p.alpha * t));
    }
    // y=R(−νt)x removes the rotating principal axes exactly.
    const rotatingFrame = [p.strain, p.speed - p.omega, p.omega - p.speed, -p.strain];
    return scale(multiply(rotation(p.speed * t), expm2(scale(rotatingFrame, t))), Math.exp(p.alpha * t));
  }
  function rk4Step(aAt, t, phi, h) {
    const k1 = multiply(aAt(t), phi);
    const k2 = multiply(aAt(t + h / 2), add(phi, scale(k1, h / 2)));
    const k3 = multiply(aAt(t + h / 2), add(phi, scale(k2, h / 2)));
    const k4 = multiply(aAt(t + h), add(phi, scale(k3, h)));
    return phi.map((x, i) => x + h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  }
  function integrate(aAt, t, maxStep) {
    validateTime(t);
    if (!Number.isFinite(maxStep) || maxStep <= 0) throw new RangeError("Step size must be positive and finite");
    if (t === 0) return {matrix: I.slice(), steps: 0, step: 0};
    const steps = Math.ceil(t / maxStep), step = t / steps;
    let matrix = I.slice();
    for (let n = 0; n < steps; n++) matrix = rk4Step(aAt, n * step, matrix, step);
    return {matrix, steps, step};
  }
  function fundamental(t, options, maxStep) {
    const p = parameters(options);
    if (p.mode !== "strain") return exactFundamental(t, p);
    return integrate(s => matrixAt(s, p), t, maxStep === undefined ? 1 / 120 : maxStep).matrix;
  }
  function diagnostics(t, options, maxStep) {
    const p = parameters(options), step = maxStep === undefined ? 1 / 120 : maxStep;
    const phi = fundamental(t, p, step), naive = expm2(integralMatrix(t, p));
    const det = determinant(phi), liouville = Math.exp(2 * p.alpha * t);
    const fine = p.mode === "strain" ? fundamental(t, p, step / 2) : phi;
    return {phi, naive, determinant: det, liouville,
      determinantError: Math.abs(det - liouville),
      convergence: distance(phi, fine),
      exactError: distance(phi, exactFundamental(t, p)),
      naiveGap: distance(phi, naive),
      relativeNaiveGap: distance(phi, naive) / norm(phi)};
  }
  function history(options, count) {
    const p = parameters(options), n = count === undefined ? 240 : count;
    if (!Number.isInteger(n) || n < 1) throw new RangeError("History count must be a positive integer");
    const step = p.horizon / n, result = [{time: 0, matrix: I.slice()}];
    let phi = I.slice();
    for (let i = 1; i <= n; i++) {
      phi = p.mode === "strain" ? rk4Step(t => matrixAt(t, p), (i - 1) * step, phi, step) : exactFundamental(i * step, p);
      result.push({time: i * step, matrix: phi});
    }
    return result;
  }
  function seedPoints(kind) {
    if (kind === "grid") {
      const points = [];
      for (let y = -1; y <= 1; y += 0.5) for (let x = -1; x <= 1; x += 0.5) points.push([x, y]);
      return points;
    }
    return Array.from({length: 20}, (_, i) => [Math.cos(2 * Math.PI * i / 20), Math.sin(2 * Math.PI * i / 20)]);
  }
  return {I, J, H, V, defaults, add, scale, multiply, apply, determinant, norm, distance, rotation, commutator,
    parameters, expm2, matrixAt, integralMatrix, exactFundamental, rk4Step, integrate, fundamental, diagnostics, history, seedPoints};
});
