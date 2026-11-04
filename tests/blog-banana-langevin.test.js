"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/banana-langevin");
const M = require(path.join(directory, "core.js"));
const V = require(path.join(directory, "view.js"));
let assertions = 0;
function ok(value, message) { assertions++; assert.ok(value, message); }
function close(a, b, tolerance, label) { ok(Math.abs(a - b) <= tolerance, `${label || "values differ"}: ${a} vs ${b}`); }
const browser = {};
vm.runInNewContext(fs.readFileSync(path.join(directory, "core.js"), "utf8"), browser);
vm.runInNewContext(fs.readFileSync(path.join(directory, "view.js"), "utf8"), browser);
close(browser.BananaLangevin.h(1), M.h(1), 1e-15, "UMD browser export");
close(browser.BananaLangevinView.peak, 1 / (2 * Math.PI), 1e-16, "renderer browser export");
close(M.h(1000), 1000 - Math.LN2, 1e-12, "stable log cosh");
close(M.h(0), 0, 0, "banana at origin");
for (const z of [-60, -7, -0.00001, 0, 0.00001, 7, 60]) {
  ok(M.bernoulli(z) > 0, "positive edge rate");
  close(M.bernoulli(-z), Math.exp(z) * M.bernoulli(z), 1e-12, "detailed balance Bernoulli identity");
}
for (const b of [0, 0.5, 2, 4]) {
  const bounds = M.lsiBounds(b);
  ok(bounds.lower > 0 && bounds.lower <= bounds.upper && bounds.upper <= 1, "valid LSI bounds");
  const x = 0.72, y = -0.4, d = 1e-5, drift = M.drift(x, y, b);
  close(drift[0], -(M.potential(x + d, y, b) - M.potential(x - d, y, b)) / (2 * d), 2e-9, "physical x drift");
  close(drift[1], -(M.potential(x, y + d, b) - M.potential(x, y - d, b)) / (2 * d), 2e-9, "physical y drift");
  const image = M.bendMap(x, y, b);
  close(M.potential(image[0], image[1], b), (x * x + y * y) / 2, 2e-15, "Gaussian pushforward potential");
}
// Independent Gaussian quadrature checks the centering and variance used in
// the Poincare upper bound. They are not fitted to the simulated decay.
{
  const n = 12000, dx = 16 / n;
  let mean = 0, second = 0;
  for (let i = 0; i <= n; i++) {
    const x = -8 + i * dx, q = Math.log(Math.cosh(x));
    const w = (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    mean += w * q; second += w * q * q;
  }
  mean *= dx / 3; second *= dx / 3;
  close(M.gaussianMeanH, mean, 2e-12, "Gaussian mean of log cosh");
  close(M.gaussianVarianceH, second - mean * mean, 2e-12, "Gaussian variance of log cosh");
}
// No-flux edges, positive M-matrix solves and sampled-target stationarity.
{
  const solver = M.createSolver({ bend: 4, a: 0, nx: 61, ny: 161 });
  const original = Float64Array.from(solver.target);
  solver.advance(2);
  const metrics = solver.metrics();
  close(metrics.mass, 1, 3e-13, "stationary mass");
  ok(metrics.minimum >= 0, "stationary positivity");
  ok(metrics.entropy < 1e-23, "stationary relative entropy");
  let l1 = 0; for (let i = 0; i < original.length; i++) l1 += Math.abs(original[i] - solver.density[i]);
  ok(l1 * solver.grid.area < 3e-13, "sampled target remains stationary");
}
const runs = [M.run(0), M.run(4)];
for (const r of runs) {
  ok(r.snapshots.length === 101 && r.target.length === 121 * 321, "documented output dimensions");
  close(r.times[0], 0, 0); close(r.times[100], 20, 0);
  ok(r.diagnostics.massError < 2e-12, "mass conservation without renormalizing time steps");
  ok(r.diagnostics.minimum >= 0, "density positivity");
  ok(r.diagnostics.entropyIncrease < 1e-12, "relative entropy dissipates at every recorded time");
  close(r.entropies[0], 1.125, 3e-5, "equal continuum initial KL up to box truncation");
  close(r.diagnostics.targetNormalizer / (2 * Math.PI), 1, 2e-6, "negligible target truncation mass");
  for (const t of [0, 0.33, 2, 7.24, 20]) {
    const s = M.sample(r, t);
    close(s.time, t, 1e-13, "sample time");
    close(M.integrate(s.density, r.grid), 1, 2e-7, "interpolated Float32 density mass");
    ok(s.entropy >= 0 && s.leftMass >= 0 && s.leftMass <= 1, "finite interpolated diagnostics");
  }
}
close(runs[0].entropies[0], runs[1].entropies[0], 1e-7, "same initial entropy across bends");
ok(runs[0].entropies[40] < 1e-6 && runs[1].entropies[40] > 0.15, "visible unbent / bent contrast at fixed physical t=8");
ok(runs[0].leftMass[40] < 0.501 && runs[1].leftMass[40] > 0.6, "arm imbalance is not hidden by KL alone");
// The unbent continuum is exactly OU: N((a exp(-t),0),I). Decreasing
// the time step converges toward its exact KL; no claim of exact numerics.
{
  const exact = 1.125 * Math.exp(-2), errors = [];
  for (const dt of [0.1, 0.025, 0.00625]) {
    const r = M.run(0, { dt, tMax: 1, snapshotCount: 2, nx: 121, ny: 91, yMin: -5, yMax: 5 });
    errors.push(Math.abs(r.entropies[1] - exact));
  }
  ok(errors[1] < errors[0] * 0.4 && errors[2] < errors[1] * 0.4, "OU time-step refinement");
  ok(errors[2] < 0.0015, "OU continuum accuracy at t=1");
}
// Grid refinement on the genuinely bent problem. Comparing entropy and arm
// mass avoids hiding errors behind a visually smooth interpolation.
{
  const gridRuns = [81, 121, 181].map(nx => M.run(4, {
    nx, ny: Math.round(nx * 321 / 121), dt: 0.0125, tMax: 4, snapshotCount: 2
  }));
  const errorCoarse = Math.abs(gridRuns[0].entropies[1] - gridRuns[2].entropies[1]);
  const errorMedium = Math.abs(gridRuns[1].entropies[1] - gridRuns[2].entropies[1]);
  ok(errorMedium < errorCoarse * 0.4 && errorMedium < 0.0006, "bent-grid entropy refinement");
  close(gridRuns[1].leftMass[1], gridRuns[2].leftMass[1], 0.0001, "bent-grid arm-mass refinement");
  const largerStep = M.run(4, { dt: 0.025, tMax: 4, snapshotCount: 2 });
  ok(Math.abs(largerStep.entropies[1] - gridRuns[1].entropies[1]) < 0.0037, "bent time-step sensitivity");
}
// The live and video renderers must not stretch the banana or silently change
// the density scale as bending and time vary.
{
  close(V.domain.xMax - V.domain.xMin, 9, 0, "common horizontal display extent");
  close(V.domain.yMax - V.domain.yMin, 15.5, 0, "common vertical display extent");
  close(V.peak, 1 / (2 * Math.PI), 0, "fixed full-space Gaussian peak");
  for (const [w, h] of [[320, 510], [500, 620], [960, 650]]) {
    const f = V.frame(w, h), expected = Math.min((w - 50) / 9, (h - 42) / 15.5);
    close(f.scale, expected, 1e-13, "equal-axis frame scale");
    close(f.width / 9, f.height / 15.5, 1e-13, "same pixels per unit on both axes");
    ok(f.left >= 38 && f.top >= 9 && f.left + f.width <= w - 12 + 1e-10 &&
      f.top + f.height <= h - 33 + 1e-10, "plot frame remains within mobile / video margins");
  }
  for (const value of [0, 1e-12, 0.01, 0.05, V.peak, 2 * V.peak]) {
    const rgb = V.color(value);
    ok(rgb.length === 3 && rgb.every(c => Number.isInteger(c) && c >= 0 && c <= 255), "finite fixed-scale RGB mapping");
  }
  assert.deepEqual(V.color(V.peak), V.color(2 * V.peak), "density palette saturates at its documented ceiling");
  const r = runs[1], density = r.snapshots[20], grid = r.grid;
  for (const [i, j] of [[0, 0], [17, 63], [60, 160], [120, 320]]) {
    const actual = V.interpolate(grid, density, grid.x[i], grid.y[j]);
    close(actual, density[i + grid.nx * j], 1e-13, "renderer recovers actual cell-center density");
  }
  const i = 42, j = 91, k = i + grid.nx * j;
  close(V.interpolate(grid, density, (grid.x[i] + grid.x[i + 1]) / 2, (grid.y[j] + grid.y[j + 1]) / 2),
    (density[k] + density[k + 1] + density[k + grid.nx] + density[k + grid.nx + 1]) / 4,
    1e-13, "bilinear interpolation, not invented or fitted density contours");
}
// Lightweight integration contracts. The main browser review verifies the
// visible controls; these checks guard provenance and failure-state handling.
{
  const app = fs.readFileSync(path.join(directory, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
  const video = fs.readFileSync(path.join(__dirname, "../scripts/render-blog-banana-langevin.cjs"), "utf8");
  ok(app.includes('type: "ot-experiment-size"') && app.includes('topic: "banana-langevin"') &&
    app.includes('event.data?.type==="ot-experiment-measure"'), "shared iframe size and measurement protocol");
  ok(app.includes('result = null; $("results").setAttribute("aria-busy","true")') &&
    app.includes('for(const id of ["density","target","entropy"])') && app.includes('clearRect(0,0,canvas.width,canvas.height)'),
  "new run clears old densities and diagnostics before starting its worker");
  ok(app.includes('if (data.error)') && app.includes('worker.onerror =') &&
    app.includes('$("results").setAttribute("aria-busy","false")') && app.includes('play.disabled = true'),
  "worker failures leave an explicit nonbusy, nonplaying error state");
  ok(html.includes('time step 0.0125') && M.defaults.dt === 0.0125, "documented time step agrees with actual solver");
  ok(html.includes('min="0" max="20"') && html.includes('id="time"'), "time slider covers physical times zero to twenty");
  ok(video.includes('require("../blog/preparations/assets/banana-langevin/core.js")') &&
    video.includes('require("../blog/preparations/assets/banana-langevin/view.js")') &&
    video.includes('runs=[M.run(0),M.run(4)]') && video.includes('M.sample(result,t)') &&
    video.includes('physicalTime:[0,20]'), "video replays the real shared density simulation at common physical times");
}
assert.throws(() => M.createSolver({ nx: 2 }), RangeError);
assert.throws(() => M.createSolver({ dt: 0 }), RangeError);
assert.throws(() => M.run(0, { snapshotCount: 1 }), RangeError);
console.log(`Banana Langevin: ${assertions} numerical assertions passed.`);
