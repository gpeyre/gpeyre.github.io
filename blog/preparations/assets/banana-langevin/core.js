/* Deterministic physical-space Fokker–Planck solver.  Cell densities evolve by
   a reversible, nearest-neighbour Scharfetter–Gummel generator.  Each implicit
   directional solve preserves positivity, mass and the sampled target; this
   is a first-order time splitting, not an exact continuum solution. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BananaLangevin = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const gaussianMeanH = 0.3745672074914087;
  const gaussianVarianceH = 0.18976744917231836;
  const defaults = Object.freeze({ nx: 121, ny: 321, xMin: -6, xMax: 6,
    yMin: -6, yMax: 26, dt: 0.0125, tMax: 20, snapshotCount: 101, a: -1.5 });
  function h(x) { const z = Math.abs(x); return z + Math.log1p(Math.exp(-2 * z)) - Math.LN2; }
  function bendMap(x, y, bend) { return [x, y + bend * (h(x) - gaussianMeanH)]; }
  function potential(x, y, bend) {
    const r = y - bend * (h(x) - gaussianMeanH);
    return 0.5 * (x * x + r * r);
  }
  function drift(x, y, bend) {
    const r = y - bend * (h(x) - gaussianMeanH);
    return [-x + bend * Math.tanh(x) * r, -r];
  }
  function lsiBounds(bend) {
    const b = Math.abs(bend), lipschitz = (Math.hypot(b, 2) + b) / 2;
    return { lower: 1 / (lipschitz * lipschitz), upper: 1 / (1 + bend * bend * gaussianVarianceH) };
  }
  // Bernoulli function, including its removable singularity and both tails.
  function bernoulli(z) {
    if (Math.abs(z) < 1e-5) return 1 - z / 2 + z * z / 12 - z ** 4 / 720;
    if (z > 50) return z * Math.exp(-z);
    if (z < -50) return -z;
    return z / Math.expm1(z);
  }
  function makeGrid(options) {
    const o = Object.assign({}, defaults, options);
    if (!Number.isInteger(o.nx) || !Number.isInteger(o.ny) || o.nx < 5 || o.ny < 5 ||
      o.nx > 1001 || o.ny > 1001 || ![o.xMin, o.xMax, o.yMin, o.yMax].every(Number.isFinite) ||
      !(o.xMax > o.xMin) || !(o.yMax > o.yMin)) throw new RangeError("Invalid finite-volume grid");
    const dx = (o.xMax - o.xMin) / o.nx, dy = (o.yMax - o.yMin) / o.ny;
    return { nx: o.nx, ny: o.ny, xMin: o.xMin, xMax: o.xMax, yMin: o.yMin, yMax: o.yMax,
      dx, dy, area: dx * dy,
      x: Float64Array.from({ length: o.nx }, (_, i) => o.xMin + (i + 0.5) * dx),
      y: Float64Array.from({ length: o.ny }, (_, j) => o.yMin + (j + 0.5) * dy) };
  }
  function integrate(values, grid) { let s = 0; for (let i = 0; i < values.length; i++) s += values[i]; return s * grid.area; }
  function normalize(values, grid) {
    const z = integrate(values, grid);
    if (!(z > 0) || !Number.isFinite(z)) throw new RangeError("Nonintegrable initial density");
    for (let k = 0; k < values.length; k++) values[k] /= z;
    return z;
  }
  function metrics(density, target, grid) {
    let mass = 0, entropy = 0, left = 0, minimum = Infinity;
    for (let j = 0, k = 0; j < grid.ny; j++) for (let i = 0; i < grid.nx; i++, k++) {
      const p = density[k];
      mass += p; minimum = Math.min(minimum, p);
      // The centered expression avoids negative roundoff near equilibrium.
      if (p > 0) {
        const logRatio = Math.log(p) - Math.log(target[k]);
        entropy += Math.abs(logRatio) < 0.5 ? target[k] * (Math.expm1(logRatio) * logRatio - Math.expm1(logRatio) + logRatio) :
          p * logRatio - p + target[k];
      } else entropy += target[k];
      const fraction = Math.max(0, Math.min(1, (0 - (grid.x[i] - grid.dx / 2)) / grid.dx));
      left += fraction * p;
    }
    return { mass: mass * grid.area, entropy: Math.max(0, entropy * grid.area),
      leftMass: left * grid.area, minimum };
  }
  function createSolver(options) {
    const o = Object.assign({}, defaults, options), bend = o.bend === undefined ? 0 : o.bend;
    if (!Number.isFinite(bend) || Math.abs(bend) > 8 || !(o.dt > 0) || !Number.isFinite(o.dt) ||
      !Number.isFinite(o.a)) throw new RangeError("Invalid Langevin parameters");
    const grid = makeGrid(o), { nx, ny, dx, dy } = grid, size = nx * ny;
    const V = new Float64Array(size), target = new Float64Array(size), density = new Float64Array(size);
    // Optional callbacks let other smooth targets reuse this same checked
    // physical-space SG engine without changing the historical banana API.
    const potentialAt = typeof o.potentialFunction === "function" ? o.potentialFunction :
      (x, y) => potential(x, y, bend);
    for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
      V[k] = potentialAt(grid.x[i], grid.y[j]);
      target[k] = Math.exp(-V[k]);
      if (!(target[k] > 0)) throw new RangeError("Domain produces underflow: shorten it or reduce bending");
    }
    const targetNormalizer = normalize(target, grid);
    for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
      density[k] = typeof o.initialDensityFunction === "function" ? o.initialDensityFunction(grid.x[i], grid.y[j]) :
        target[k] * Math.exp(o.a * grid.x[i] - o.a * o.a / 2);
      if (!(density[k] >= 0) || !Number.isFinite(density[k])) throw new RangeError("Invalid initial density");
    }
    normalize(density, grid);
    const xForward = new Float64Array(size), xBackward = new Float64Array(size);
    const yForward = new Float64Array(size), yBackward = new Float64Array(size);
    for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
      if (i + 1 < nx) { const delta = V[k + 1] - V[k]; xForward[k] = bernoulli(delta) / (dx * dx); xBackward[k + 1] = bernoulli(-delta) / (dx * dx); }
      if (j + 1 < ny) { const delta = V[k + nx] - V[k]; yForward[k] = bernoulli(delta) / (dy * dy); yBackward[k + nx] = bernoulli(-delta) / (dy * dy); }
    }
    let time = 0, factors = null, factorStep = -1;
    const intermediate = new Float64Array(size);
    function factor(forward, backward, stride, lineLength, lineCount, stepSize) {
      const inverse = new Float64Array(size), upper = new Float64Array(size), lower = new Float64Array(size);
      for (let line = 0; line < lineCount; line++) {
        const start = stride === 1 ? line * nx : line;
        for (let p = 0; p < lineLength; p++) {
          const k = start + p * stride;
          lower[k] = p ? -stepSize * forward[k - stride] : 0;
          const diagonal = 1 + stepSize * (forward[k] + backward[k]);
          inverse[k] = 1 / (diagonal - (p ? lower[k] * upper[k - stride] : 0));
          upper[k] = p + 1 < lineLength ? -stepSize * backward[k + stride] * inverse[k] : 0;
        }
      }
      return { inverse, upper, lower, stride, lineLength, lineCount };
    }
    function solve(input, output, f) {
      const { stride, lineLength, lineCount, lower, inverse, upper } = f;
      for (let line = 0; line < lineCount; line++) {
        const start = stride === 1 ? line * nx : line;
        for (let p = 0; p < lineLength; p++) {
          const k = start + p * stride;
          output[k] = (input[k] - (p ? lower[k] * output[k - stride] : 0)) * inverse[k];
        }
        for (let p = lineLength - 2; p >= 0; p--) {
          const k = start + p * stride; output[k] -= upper[k] * output[k + stride];
        }
      }
    }
    function step(stepSize = o.dt) {
      if (!(stepSize > 0) || !Number.isFinite(stepSize)) throw new RangeError("Step must be finite and positive");
      if (Math.abs(stepSize - o.dt) < 1e-10 * o.dt) stepSize = o.dt;
      if (stepSize !== factorStep) {
        factors = [factor(xForward, xBackward, 1, nx, ny, stepSize), factor(yForward, yBackward, nx, ny, nx, stepSize)];
        factorStep = stepSize;
      }
      solve(density, intermediate, factors[0]); solve(intermediate, density, factors[1]); time += stepSize;
      return time;
    }
    function advance(until) {
      if (!Number.isFinite(until) || until < time - 1e-12) throw new RangeError("Solver cannot move backwards");
      while (until - time > 1e-11 * Math.max(1, until)) step(Math.min(o.dt, until - time));
      time = until; return metrics(density, target, grid);
    }
    return { bend, a: o.a, grid, target, density, targetNormalizer, dt: o.dt,
      get time() { return time; }, step, advance, metrics: () => metrics(density, target, grid) };
  }
  function run(bend, options) {
    const o = Object.assign({}, defaults, options, { bend });
    if (!Number.isInteger(o.snapshotCount) || o.snapshotCount < 2 || o.snapshotCount > 2001 ||
      !(o.tMax > 0) || !Number.isFinite(o.tMax)) throw new RangeError("Invalid snapshot times");
    const solver = createSolver(o), times = new Float64Array(o.snapshotCount), snapshots = [],
      entropies = new Float64Array(o.snapshotCount), leftMass = new Float64Array(o.snapshotCount);
    const diagnostics = { massError: 0, minimum: Infinity, entropyIncrease: 0, initialKLContinuum: o.a * o.a / 2,
      targetNormalizer: solver.targetNormalizer, continuumNormalizer: 2 * Math.PI, method: "Scharfetter–Gummel; alternating implicit Euler; reflecting boundaries" };
    for (let n = 0; n < o.snapshotCount; n++) {
      const t = o.tMax * n / (o.snapshotCount - 1), m = solver.advance(t);
      times[n] = t; snapshots.push(Float32Array.from(solver.density)); entropies[n] = m.entropy; leftMass[n] = m.leftMass;
      diagnostics.massError = Math.max(diagnostics.massError, Math.abs(m.mass - 1));
      diagnostics.minimum = Math.min(diagnostics.minimum, m.minimum);
      if (n) diagnostics.entropyIncrease = Math.max(diagnostics.entropyIncrease, entropies[n] - entropies[n - 1]);
    }
    return { bend, a: o.a, grid: solver.grid, target: solver.target, times, snapshots, entropies, leftMass, diagnostics };
  }
  function sample(result, time, output) {
    const t = Math.max(result.times[0], Math.min(result.times[result.times.length - 1], time));
    let right = 1; while (right + 1 < result.times.length && result.times[right] < t) right++;
    const left = right - 1, u = (t - result.times[left]) / (result.times[right] - result.times[left]);
    const density = output || new Float32Array(result.target.length), A = result.snapshots[left], B = result.snapshots[right];
    for (let k = 0; k < density.length; k++) density[k] = A[k] * (1 - u) + B[k] * u;
    return { time: t, density, entropy: result.entropies[left] * (1 - u) + result.entropies[right] * u,
      leftMass: result.leftMass[left] * (1 - u) + result.leftMass[right] * u };
  }
  return { defaults, gaussianMeanH, gaussianVarianceH, h, bendMap, potential, drift, lsiBounds, bernoulli,
    makeGrid, integrate, metrics, createSolver, run, sample };
}));
