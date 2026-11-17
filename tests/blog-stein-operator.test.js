"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const folder = path.resolve(__dirname, "../blog/preparations/assets/stein-operator"), M = require(path.join(folder, "core.js")), V = require(path.join(folder, "view.js"));
let checks = 0;
function close(a, b, tol = 2e-11) { checks++; assert.ok(Math.abs(a - b) < tol * Math.max(1, Math.abs(a), Math.abs(b)), `${a} differs from ${b}`); }
function integrate(fun, lo = -13, hi = 13, n = 16000) { const h = (hi - lo) / n; let total = fun(lo) + fun(hi); for (let j = 1; j < n; j++) total += (j % 2 ? 4 : 2) * fun(lo + j * h); return total * h / 3; }
const context = {}; vm.runInNewContext(fs.readFileSync(path.join(folder, "core.js"), "utf8"), context); close(context.SteinOperator.state(.5,.3).variance, M.state(.5,.3).variance);
const maxNormalized = M.tests.map(() => 0), minResidual = M.tests.map(() => Infinity), maxResidual = M.tests.map(() => -Infinity);
for (let i = 0; i <= 200; i++) for (let j = 0; j <= 200; j++) {
  const theta = (i - 100) / 100, position = (j - 100) / 100, q = M.state(theta, position);
  assert.ok(q.variance >= .0625 && q.sigma <= 1 && q.rows.every(r => Object.values(r).filter(v => typeof v === "number").every(Number.isFinite))); checks++;
  close(M.rawMoment(0, q), 1); close(q.mean, 1.5 * position); close(M.rawMoment(1,q), q.mean);
  close(q.secondMoment, q.mean ** 2 + q.variance + .49 * q.a ** 2);
  close(q.totalVariance, q.variance + .49 * q.a ** 2);
  for (let k = 0; k < q.rows.length; k++) {
    const row = q.rows[k]; close(row.derivative - row.xTimesF, row.residual);
    close(row.normalized, row.residual / M.residualScales[k]); assert.ok(Math.abs(row.normalized) <= 1 + 1e-12); checks++;
    maxNormalized[k] = Math.max(maxNormalized[k], Math.abs(row.normalized)); minResidual[k] = Math.min(minResidual[k], row.residual); maxResidual[k] = Math.max(maxResidual[k], row.residual);
  }
}
for (let i = 0; i < 6; i++) { assert.ok(maxNormalized[i] > .97, `Test ${i} must use most of its independently scaled half-axis`); assert.ok(minResidual[i] < -.001 && maxResidual[i] > .001); }
for (const theta of [-1, -.73, -.1, 0, .19, .64, 1]) for (const position of [-1, -.37, 0, .22, 1]) {
  const q = M.state(theta, position), reverse = M.state(-theta, -position);
  close(integrate(x => M.density(x, q)), 1, 3e-10);
  close(integrate(x => x * M.density(x, q)), q.mean, 3e-10);
  close(integrate(x => x * x * M.density(x, q)), q.secondMoment, 3e-10);
  for (let i = 0; i < M.tests.length; i++) {
    const f = M.tests[i], row = q.rows[i];
    close(integrate(x => f.f(x) * M.density(x, q)), row.expectation, 3e-10);
    close(integrate(x => f.derivative(x) * M.density(x, q)), row.derivative, 3e-10);
    close(integrate(x => x * f.f(x) * M.density(x, q)), row.xTimesF, 3e-10);
    close(integrate(x => (f.derivative(x) - x * f.f(x)) * M.density(x, q)), row.residual, 3e-10);
    close(row.residual, [0, 2, 5].includes(i) ? -reverse.rows[i].residual : reverse.rows[i].residual);
    for (const x of [-2.31, -.7, .123, 1.48]) { const eps = 1e-5; close((f.f(x + eps) - f.f(x - eps)) / (2 * eps), f.derivative(x), 4e-9); }
  }
  for (const x of [-6, -2.7, -.13, 0, 1.9, 5]) { close(M.density(x, q), M.density(-x, reverse)); assert.ok(M.density(x, q) >= 0); }
}
const center = M.state(0, 0); for (const row of center.rows) assert.equal(row.residual, 0);
for (const position of [-1, -.3, 0, .7, 1]) {
  const q = M.state(0, position);
  for (const x of [-4, -.3, 0, .7, 4]) close(M.density(x, q), M.gaussian(x, 1.5 * position, 1));
  close(q.rows[0].residual, -1.5 * position); close(q.rows[1].residual, -((1.5 * position) ** 2));
}
for (const bad of [-1.001, 1.001, NaN, Infinity, "0"]) { assert.throws(() => M.mixture(bad,0), RangeError); assert.throws(() => M.mixture(0,bad), RangeError); }
assert.throws(() => M.rawMoment(13, center), RangeError);
// All geometry is finite and zero stays at the exact center of the bar plotting area.
const ctx = new Proxy({}, { get: (_, name) => name === "measureText" ? () => ({ width: 20 }) : (...args) => { for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), `${String(name)} has a nonfinite coordinate`); } });
for (const theta of [-1, 0, 1]) for (const position of [-1, 0, 1]) for (const width of [240, 260, 320, 500]) {
  const q = M.state(theta, position); V.drawDensity(ctx, width, 245, q);
  const layout = V.drawHistogram(ctx, width, 330, q);
  close(layout.zeroY, (layout.top + layout.bottom) / 2); assert.equal(layout.bars.length,6);
  for (const bar of layout.bars) { assert.ok(bar.y >= layout.top-1e-9 && bar.y <= layout.bottom+1e-9); assert.ok(bar.sketch.top > layout.bottom); close(bar.y,layout.zeroY-bar.normalized*layout.half); }
}
V.drawSummary(ctx, 1200, 630, M.state(1,-.4));
const html = fs.readFileSync(path.join(folder, "index.html"), "utf8"), app = fs.readFileSync(path.join(folder, "app.js"), "utf8");
assert.equal((html.match(/type="range"/g)||[]).length,2); assert.match(html,/id="position"/); assert.match(html,/id="residuals"/); assert.doesNotMatch(html,/id="function"/);
assert.match(html, /not a characterization/); assert.match(html,/fixed per-test divisors/); assert.match(app, /topic: "stein"/); assert.doesNotMatch(html, /site-analytics|https?:\/\//);
console.log(`Stein mixture tests passed: ${checks} mathematical checks, exact quadrature, fixed scale coverage, and centered bar geometry.`);
