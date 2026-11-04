/* Gaussian-mixture target and narrow translated initial law. All evolution is
   solved in physical Cartesian coordinates by the shared reversible SG engine. */
(function (root, factory) {
  "use strict";
  const api = factory(typeof module === "object" && module.exports ? require("../banana-langevin/core.js") : root.BananaLangevin);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MixtureLangevin = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function (S) {
  "use strict";
  if (!S) throw new Error("Load the shared Langevin numerical engine first");
  const defaults = Object.freeze({ nx: 151, ny: 151, xMin: -6, xMax: 6, yMin: -6, yMax: 6,
    dt: 0.0125, tMax: 20, snapshotCount: 101, sigma: 0.65, initialSigma: 0.3, initialMean: [-2.2, -0.35] });
  function centers(k, spread) {
    if (!Number.isInteger(k) || k < 1 || k > 6 || !Number.isFinite(spread) || spread < 0 || spread > 2.5)
      throw new RangeError("Use 1–6 components and spread in [0,2.5]");
    return Array.from({ length: k }, (_, j) => {
      const a = Math.PI + 2 * Math.PI * j / k;
      return [spread * Math.cos(a), spread * Math.sin(a)];
    });
  }
  function model(k, spread, sigma = defaults.sigma) {
    if (!(sigma > 0) || !Number.isFinite(sigma)) throw new RangeError("Invalid component bandwidth");
    const means = centers(k, spread), variance = sigma * sigma;
    const logConstant = Math.log(k * 2 * Math.PI * variance);
    function logDensity(x, y) {
      let maximum = -Infinity;
      for (const mu of means) maximum = Math.max(maximum, -((x - mu[0]) ** 2 + (y - mu[1]) ** 2) / (2 * variance));
      let sum = 0;
      for (const mu of means) sum += Math.exp(-((x - mu[0]) ** 2 + (y - mu[1]) ** 2) / (2 * variance) - maximum);
      return maximum + Math.log(sum) - logConstant;
    }
    function drift(x, y) {
      let maximum = -Infinity;
      for (const mu of means) maximum = Math.max(maximum, -((x - mu[0]) ** 2 + (y - mu[1]) ** 2) / (2 * variance));
      let sum = 0, mx = 0, my = 0;
      for (const mu of means) {
        const w = Math.exp(-((x - mu[0]) ** 2 + (y - mu[1]) ** 2) / (2 * variance) - maximum);
        sum += w; mx += w * mu[0]; my += w * mu[1];
      }
      return [(mx / sum - x) / variance, (my / sum - y) / variance];
    }
    return { k, spread, sigma, centers: means, logDensity, density: (x, y) => Math.exp(logDensity(x, y)),
      potential: (x, y) => -logDensity(x, y), drift };
  }
  function normalDensity(x, y, mean, sigma) {
    return Math.exp(-((x - mean[0]) ** 2 + (y - mean[1]) ** 2) / (2 * sigma * sigma)) / (2 * Math.PI * sigma * sigma);
  }
  function metrics(density, target, grid) {
    const base = S.metrics(density, target, grid);
    let tv = 0, x = 0, y = 0, xx = 0, yy = 0, xy = 0;
    for (let j = 0, index = 0; j < grid.ny; j++) for (let i = 0; i < grid.nx; i++, index++) {
      const p = density[index], gx = grid.x[i], gy = grid.y[j];
      tv += Math.abs(p - target[index]); x += p * gx; y += p * gy;
      xx += p * gx * gx; yy += p * gy * gy; xy += p * gx * gy;
    }
    x *= grid.area; y *= grid.area;
    return Object.assign(base, { totalVariation: tv * grid.area / 2, mean: [x, y],
      covariance: [xx * grid.area - x * x, xy * grid.area - x * y, yy * grid.area - y * y] });
  }
  function createSolver(options = {}) {
    const o = Object.assign({}, defaults, { k: 3, spread: 2.2 }, options);
    if (!(o.initialSigma > 0) || !Number.isFinite(o.initialSigma) || !Array.isArray(o.initialMean) ||
      o.initialMean.length !== 2 || !o.initialMean.every(Number.isFinite)) throw new RangeError("Invalid initial Gaussian");
    const targetModel = model(o.k, o.spread, o.sigma);
    const initial = typeof o.initialDensityFunction === "function" ? o.initialDensityFunction :
      (x, y) => normalDensity(x, y, o.initialMean, o.initialSigma);
    const engine = S.createSolver(Object.assign({}, o, { bend: 0,
      potentialFunction: targetModel.potential, initialDensityFunction: initial }));
    return { k: o.k, spread: o.spread, sigma: o.sigma, centers: targetModel.centers,
      initialMean: o.initialMean.slice(), initialSigma: o.initialSigma, grid: engine.grid,
      target: engine.target, density: engine.density, targetNormalizer: engine.targetNormalizer, dt: engine.dt,
      get time() { return engine.time; }, step: engine.step,
      advance: t => { engine.advance(t); return metrics(engine.density, engine.target, engine.grid); },
      metrics: () => metrics(engine.density, engine.target, engine.grid) };
  }
  function run(k, spread, options) {
    const o = Object.assign({}, defaults, options, { k, spread });
    if (!Number.isInteger(o.snapshotCount) || o.snapshotCount < 2 || o.snapshotCount > 2001 ||
      !(o.tMax > 0) || !Number.isFinite(o.tMax)) throw new RangeError("Invalid snapshot times");
    const solver = createSolver(o), times = new Float64Array(o.snapshotCount), snapshots = [],
      entropies = new Float64Array(o.snapshotCount), totalVariations = new Float64Array(o.snapshotCount);
    const diagnostics = { massError: 0, minimum: Infinity, entropyIncrease: 0,
      targetNormalizer: solver.targetNormalizer, continuumNormalizer: 1,
      method: "Scharfetter–Gummel; alternating implicit Euler; reflecting boundaries" };
    for (let n = 0; n < o.snapshotCount; n++) {
      const t = o.tMax * n / (o.snapshotCount - 1); solver.advance(t); const m = solver.metrics();
      times[n] = t; snapshots.push(Float32Array.from(solver.density)); entropies[n] = m.entropy; totalVariations[n] = m.totalVariation;
      diagnostics.massError = Math.max(diagnostics.massError, Math.abs(m.mass - 1));
      diagnostics.minimum = Math.min(diagnostics.minimum, m.minimum);
      if (n) diagnostics.entropyIncrease = Math.max(diagnostics.entropyIncrease, entropies[n] - entropies[n - 1]);
    }
    return { k, spread, sigma: o.sigma, centers: solver.centers, initialMean: solver.initialMean,
      initialSigma: solver.initialSigma, grid: solver.grid, target: solver.target,
      times, snapshots, entropies, totalVariations, diagnostics };
  }
  function sample(result, time, output) {
    const t = Math.max(result.times[0], Math.min(result.times[result.times.length - 1], time));
    let right = 1; while (right + 1 < result.times.length && result.times[right] < t) right++;
    const left = right - 1, u = (t - result.times[left]) / (result.times[right] - result.times[left]);
    const density = output || new Float32Array(result.target.length), A = result.snapshots[left], B = result.snapshots[right];
    for (let index = 0; index < density.length; index++) density[index] = A[index] * (1 - u) + B[index] * u;
    return { time: t, density, entropy: result.entropies[left] * (1 - u) + result.entropies[right] * u,
      totalVariation: result.totalVariations[left] * (1 - u) + result.totalVariations[right] * u };
  }
  // Exact continuum benchmark when there is one target Gaussian.
  function exactSingleGaussian(t, spread, options = {}) {
    const o = Object.assign({}, defaults, options), mu = centers(1, spread)[0], variance = o.sigma * o.sigma;
    const decay = Math.exp(-t / variance), mean = mu.map((m, i) => m + (o.initialMean[i] - m) * decay);
    const v = variance + (o.initialSigma * o.initialSigma - variance) * decay * decay;
    const ratio = v / variance, distance = (mean[0] - mu[0]) ** 2 + (mean[1] - mu[1]) ** 2;
    return { mean, variance: v, entropy: ratio - 1 - Math.log(ratio) + distance / (2 * variance),
      density: (x, y) => normalDensity(x, y, mean, Math.sqrt(v)) };
  }
  return { defaults, centers, model, normalDensity, metrics, createSolver, run, sample,
    exactSingleGaussian, integrate: S.integrate, makeGrid: options => S.makeGrid(Object.assign({}, defaults, options)) };
}));
