"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/gaussian-mixture-langevin");
const M = require(path.join(directory, "core.js"));
let assertions = 0;
function ok(value, label) { assertions++; assert.ok(value, label); }
function close(actual, expected, tolerance, label) {
  ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`);
}
const browser = {};
vm.runInNewContext(fs.readFileSync(path.join(directory, "../banana-langevin/core.js"), "utf8"), browser);
vm.runInNewContext(fs.readFileSync(path.join(directory, "core.js"), "utf8"), browser);
close(browser.MixtureLangevin.model(3, 2).potential(0.3, 0.2), M.model(3, 2).potential(0.3, 0.2), 1e-14, "browser / Node model parity");
for (const k of [1, 2, 3, 6]) for (const spread of [0, 1, 2.5]) {
  const model = M.model(k, spread), centers = M.centers(k, spread);
  ok(centers.length === k, "exact component count");
  centers.forEach(mu => close(Math.hypot(...mu), spread, 1e-14, "moving centers stay on the requested radius"));
  close(centers[0][0], -spread, 1e-14, "first mode lies on the negative x axis");
  const x = 0.48, y = -0.37, epsilon = 1e-5, drift = model.drift(x, y);
  close(drift[0], -(model.potential(x + epsilon, y) - model.potential(x - epsilon, y)) / (2 * epsilon), 1e-8, "physical x score via log-sum-exp");
  close(drift[1], -(model.potential(x, y + epsilon) - model.potential(x, y - epsilon)) / (2 * epsilon), 1e-8, "physical y score via log-sum-exp");
  ok(Number.isFinite(model.logDensity(1000, -1000)) && model.drift(1000, -1000).every(Number.isFinite), "stable distant-tail score without exp underflow");
}
// An overlapping mixture is exactly one Gaussian, independently of k.
for (const k of [2, 3, 6]) {
  const a = M.model(k, 0), b = M.model(1, 0);
  for (const [x, y] of [[0, 0], [1.1, -0.7], [-3, 4]]) {
    close(a.logDensity(x, y), b.logDensity(x, y), 2e-14, "coincident components preserve the density");
    close(a.drift(x, y)[0], b.drift(x, y)[0], 1e-13, "coincident x drift");
    close(a.drift(x, y)[1], b.drift(x, y)[1], 1e-13, "coincident y drift");
  }
}
// Gaussian benchmark: exact mean, scalar covariance and KL. This is not an
// equilibrium-only check; the initial covariance is much smaller than target.
{
  const spread = 2, t = 0.5, exact = M.exactSingleGaussian(t, spread), errors = [];
  for (const dt of [0.05, 0.0125, 0.003125]) {
    const solver = M.createSolver({ k: 1, spread, dt }); solver.advance(t); const m = solver.metrics();
    errors.push(Math.abs(m.entropy - exact.entropy));
    if (dt === 0.003125) {
      close(m.mean[0], exact.mean[0], 0.001, "OU translated mean x");
      close(m.mean[1], exact.mean[1], 0.001, "OU translated mean y");
      close(m.covariance[0], exact.variance, 0.001, "OU widening variance x");
      close(m.covariance[2], exact.variance, 0.001, "OU widening variance y");
      close(m.covariance[1], 0, 1e-12, "OU independent coordinates");
      close(m.entropy, exact.entropy, 0.0005, "OU relative entropy");
    }
  }
  ok(errors[1] < errors[0] * 0.4 && errors[2] < errors[1] * 0.4, "time refinement approaches the exact widening OU solution");
  const initial = M.exactSingleGaussian(0, spread);
  close(initial.variance, M.defaults.initialSigma ** 2, 1e-16, "narrow initial covariance");
  initial.mean.forEach((value, i) => close(value, M.defaults.initialMean[i], 1e-15, "same shifted initial mean"));
}
// The sampled mixture is exactly fixed by every directional solve.
for (const k of [1, 3, 6]) {
  const target = M.model(k, 2.2), solver = M.createSolver({ k, spread: 2.2, nx: 81, ny: 81,
    initialDensityFunction: target.density });
  solver.advance(2); const m = solver.metrics();
  close(m.mass, 1, 3e-13, "stationary mass");
  ok(m.minimum >= 0 && m.entropy < 1e-23 && m.totalVariation < 2e-13, "stationary target / positivity / entropy / TV");
}
const runs = [1, 2, 3].map(k => M.run(k, 2));
for (const result of runs) {
  ok(result.target.length === 151 * 151 && result.snapshots.length === 101, "documented simulation dimensions");
  close(result.times[0], 0, 0, "initial time"); close(result.times[100], 20, 0, "final time");
  close(result.sigma, 0.65, 0, "fixed target component bandwidth");
  close(result.initialSigma, 0.3, 0, "fixed narrow initial bandwidth");
  ok(result.diagnostics.minimum >= 0 && result.diagnostics.massError < 1e-12, "positive probability without renormalizing steps");
  ok(result.diagnostics.entropyIncrease < 1e-12, "KL dissipates throughout all saved times");
  close(result.diagnostics.targetNormalizer, 1, 2e-8, "negligible target box truncation");
  for (const t of [0, 0.17, 2, 5.45, 20]) {
    const state = M.sample(result, t);
    close(state.time, t, 1e-13, "slider physical time");
    close(M.integrate(state.density, result.grid), 1, 2e-7, "Float32 interpolation preserves mass");
    ok(state.entropy >= 0 && state.totalVariation >= 0 && state.totalVariation <= 1, "finite diagnostics along the slider");
  }
}
for (let k = 1; k < runs.length; k++) {
  let l1 = 0; for (let i = 0; i < runs[0].target.length; i++) l1 += Math.abs(runs[k].snapshots[0][i] - runs[0].snapshots[0][i]);
  close(l1 * runs[0].grid.area, 0, 0, "identical initial distribution across component counts");
}
ok(runs[0].entropies[10] < 0.00003 && runs[1].entropies[10] > 0.5 && runs[2].entropies[10] > 0.5,
  "genuine one-mode / multimode contrast by physical time two");
ok(runs[2].totalVariations[100] < runs[1].totalVariations[100], "do not falsely assume mixing is monotonic in component count");
ok(runs[0].entropies[0] < runs[1].entropies[0] && runs[1].entropies[0] < runs[2].entropies[0],
  "same initial law does not mean same initial KL for different targets");
// Spatial refinement of the non-Gaussian three-well problem.
{
  const result = [81, 121, 181].map(nx => M.run(3, 2.2, { nx, ny: nx, tMax: 4, snapshotCount: 2 }));
  const coarse = Math.abs(result[0].entropies[1] - result[2].entropies[1]);
  const medium = Math.abs(result[1].entropies[1] - result[2].entropies[1]);
  ok(medium < 0.4 * coarse && medium < 0.0003, "mixture spatial KL refinement");
  close(result[1].totalVariations[1], result[2].totalVariations[1], 0.00015, "mixture spatial TV refinement");
}
// The single live plot and animated comparison use the same fixed physical
// frame, density palette and bilinear interpolation of the computed arrays.
{
  const V = require(path.join(directory, "view.js"));
  vm.runInNewContext(fs.readFileSync(path.join(directory, "view.js"), "utf8"), browser);
  close(browser.MixtureLangevinView.peak, V.peak, 0, "renderer browser / Node parity");
  close(V.peak, 1 / (2 * Math.PI * 0.3 ** 2), 1e-15, "fixed initial Gaussian peak");
  close(V.domain.xMax - V.domain.xMin, 9, 0, "fixed horizontal physical extent");
  close(V.domain.yMax - V.domain.yMin, 9, 0, "fixed vertical physical extent");
  for (const [width, height] of [[320, 320], [382, 370], [820, 730]]) {
    const f = V.frame(width, height);
    close(f.scale, Math.min((width - 52) / 9, (height - 42) / 9), 1e-14, "shared equal-axis scaling");
    close(f.width, f.height, 1e-14, "square physical plot frame");
    ok(f.left >= 38 && f.top >= 9 && f.left + f.width <= width - 14 + 1e-10 &&
      f.top + f.height <= height - 33 + 1e-10, "mobile / desktop frame stays inside axis margins");
  }
  for (const density of [-1, 0, 1e-12, 0.001, 0.03, 0.5, V.peak, 2 * V.peak]) {
    const rgb = V.color(density);
    ok(rgb.length === 3 && rgb.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255), "finite fixed-scale density colors");
  }
  assert.deepEqual(V.color(V.peak), V.color(2 * V.peak), "density scale saturates without per-frame rescaling");
  const { grid } = runs[2], density = runs[2].snapshots[10];
  for (const [i, j] of [[0, 0], [51, 80], [75, 75], [150, 150]])
    close(V.interpolate(grid, density, grid.x[i], grid.y[j]), density[i + grid.nx * j], 2e-15, "renderer recovers saved cell-center values");
  const i = 71, j = 61, index = i + grid.nx * j;
  close(V.interpolate(grid, density, (grid.x[i] + grid.x[i + 1]) / 2, (grid.y[j] + grid.y[j + 1]) / 2),
    (density[index] + density[index + 1] + density[index + grid.nx] + density[index + grid.nx + 1]) / 4,
    1e-15, "renderer uses actual bilinear density interpolation");
  const square = [[[1, 1], [0, 1]], [[1, 0], [1, 1]], [[0, 0], [1, 0]], [[0, 1], [0, 0]]];
  const lines = V.stitchSegments(square);
  ok(lines.length === 1 && lines[0].length === 5, "shuffled contour segments join into one closed polyline");
  assert.deepEqual(lines[0][0], lines[0][4], "the dashed contour closes continuously");
  ok(new Set(lines[0].slice(0, -1).map(p => p.join(","))).size === 4, "contour joining preserves all four vertices");
}
// Lightweight integration guards complement the main agent's browser review.
{
  const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(directory, "app.js"), "utf8");
  const worker = fs.readFileSync(path.join(directory, "worker.js"), "utf8");
  const exporter = fs.readFileSync(path.join(__dirname, "../scripts/render-blog-mixture-langevin.cjs"), "utf8");
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  ok((html.match(/<canvas\b/g) || []).length === 1, "one single interactive density figure, no second plot");
  ok((html.match(/type="range"/g) || []).length === 3, "exactly the three requested sliders");
  ok(/id="time"[^>]*min="0" max="20"/.test(html), "physical time slider spans zero to twenty");
  ok(/id="components"[^>]*min="1" max="6"/.test(html), "component count is an integer slider from one to six");
  ok(/id="spread"[^>]*min="0" max="2.5"/.test(html), "position slider agrees with model radius domain");
  ok(html.includes("0.65² I") && html.includes("0.3² I") && M.defaults.sigma === 0.65 && M.defaults.initialSigma === 0.3,
    "documented target / narrow initial bandwidths match the actual model");
  ok(!/banana|bending/i.test(visible) && !/same initial (?:KL|relative entropy)/i.test(visible),
    "visible experiment has no stale banana model or equal-initial-KL claim");
  ok(html.includes("Initial KL need not be the same") && html.includes("More components do not automatically mean slower convergence"),
    "fair comparison caveats remain explicit");
  ok(worker.includes('importScripts("../banana-langevin/core.js", "core.js")') && worker.includes("MixtureLangevin.run(k, spread)"),
    "worker loads the checked physical-space engine before the mixture model");
  ok(app.includes('type: "ot-experiment-size"') && app.includes('topic: "gaussian-mixture-langevin"') &&
    app.includes('event.data?.type === "ot-experiment-measure"'), "embedded experiment uses the shared height protocol");
  ok(app.includes('canvas.getContext("2d").clearRect') && app.includes('$("entropy-value").textContent = "—"') &&
    app.includes('$("results").setAttribute("aria-busy", "false")'), "new runs and failures clear stale data / busy states");
  ok(exporter.includes('require("../blog/preparations/assets/gaussian-mixture-langevin/core.js")') &&
    exporter.includes('require("../blog/preparations/assets/gaussian-mixture-langevin/view.js")') &&
    exporter.includes("[1, 2, 3].map(k => M.run(k, 2))") && exporter.includes("M.sample(result, t)"),
    "three-panel export replays the actual numerical arrays on the same clock");
  ok(exporter.includes('flag("--gif")') && exporter.includes("palettegen=") && exporter.includes("paletteuse=") &&
    exporter.includes("physicalTime: [0, 20]"), "GIF export uses a generated fixed palette and records physical time provenance");
}
assert.throws(() => M.centers(0, 2), RangeError);
assert.throws(() => M.centers(7, 2), RangeError);
assert.throws(() => M.centers(3, -1), RangeError);
assert.throws(() => M.centers(3, 3), RangeError);
assert.throws(() => M.createSolver({ initialSigma: 0 }), RangeError);
assert.throws(() => M.model(3, 2, 0), RangeError);
assert.throws(() => M.run(3, 2, { snapshotCount: 1 }), RangeError);
console.log(`Gaussian-mixture Langevin: ${assertions} numerical assertions passed.`);
