"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const folder = path.resolve(__dirname, "../blog/preparations/assets/stein-operator"), M = require(path.join(folder, "core.js")), V = require(path.join(folder, "view.js"));
let checks = 0;
function close(a, b, tol = 2e-11) { checks++; assert.ok(Math.abs(a - b) < tol * Math.max(1, Math.abs(a), Math.abs(b)), `${a} differs from ${b}`); }
function integrate(fun, lo = -11, hi = 11, n = 16000) { const h = (hi - lo) / n; let total = fun(lo) + fun(hi); for (let j = 1; j < n; j++) total += (j % 2 ? 4 : 2) * fun(lo + j * h); return total * h / 3; }
const context = {}; vm.runInNewContext(fs.readFileSync(path.join(folder, "core.js"), "utf8"), context); close(context.SteinOperator.state(.5).variance, M.state(.5).variance);
for (let j = 0; j <= 200; j++) {
  const theta = (j - 100) / 100, q = M.state(theta), reverse = M.state(-theta);
  assert.ok(q.variance > .106 && q.rows.every(r => Object.values(r).filter(v => typeof v === "number").every(Number.isFinite))); checks++;
  close(M.rawMoment(0, q), 1); close(M.rawMoment(1, q), 0); close(M.rawMoment(2, q), 1);
  close(q.rows[0].residual, 0); close(q.rows[1].residual, 0);
  close(q.rows[2].residual, -M.rawMoment(3, q)); close(q.rows[3].residual, 3 - M.rawMoment(4, q));
  close(q.rows[2].residual, -reverse.rows[2].residual); close(q.rows[3].residual, reverse.rows[3].residual);
  close(q.rows[4].residual, reverse.rows[4].residual); close(q.rows[5].residual, -reverse.rows[5].residual);
  for (const x of [-6, -2.7, -.13, 0, 1.9, 5]) { close(M.density(x, q), M.density(-x, reverse)); assert.ok(M.density(x, q) > 0); checks++; }
}
for (const theta of [-1, -.73, -.1, 0, .19, .64, 1]) {
  const q = M.state(theta);
  close(integrate(x => M.density(x, q)), 1, 3e-10);
  close(integrate(x => x * M.density(x, q)), 0, 3e-10);
  close(integrate(x => x * x * M.density(x, q)), 1, 3e-10);
  for (let i = 0; i < M.tests.length; i++) {
    const f = M.tests[i], row = q.rows[i];
    close(integrate(x => f.f(x) * M.density(x, q)), row.expectation, 3e-10);
    close(integrate(x => f.derivative(x) * M.density(x, q)), row.derivative, 3e-10);
    close(integrate(x => x * f.f(x) * M.density(x, q)), row.xTimesF, 3e-10);
    close(integrate(x => (f.derivative(x) - x * f.f(x)) * M.density(x, q)), row.residual, 3e-10);
    close(row.derivative - row.xTimesF, row.residual);
    for (const x of [-2.31, -.7, .123, 1.48]) { const eps = 1e-5; close((f.f(x + eps) - f.f(x - eps)) / (2 * eps), f.derivative(x), 4e-9); }
  }
}
const center = M.state(0); for (const row of center.rows) assert.equal(row.residual, 0);
for (const x of [-4, -.3, 0, .7, 4]) close(M.density(x, center), M.gaussian(x));
for (const theta of [1e-9, 1e-5, .01]) { close(M.state(theta).rows[3].residual / theta ** 4, .2306 * 1.35 ** 4); assert.ok(M.state(theta).rows[3].residual > 0); }
for (const bad of [-1.001, 1.001, NaN, Infinity, "0"]) assert.throws(() => M.mixture(bad), RangeError);
assert.throws(() => M.state(0, "bad"), RangeError); assert.throws(() => M.rawMoment(13, center), RangeError);
// Mock canvas ensures that every drawn coordinate is finite, also at mobile widths.
const ctx = new Proxy({}, { get: (_, name) => name === "measureText" ? () => ({ width: 20 }) : (...args) => { for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), `${String(name)} has a nonfinite coordinate`); } });
for (const theta of [-1, 0, 1]) for (const width of [260, 320, 500]) {
  const q = M.state(theta); V.drawDensity(ctx, width, 220, q);
  for (const test of M.tests) V.drawFunction(ctx, width, 220, M.state(theta, test.key));
  for (const row of q.rows) V.drawResidualBar(ctx, 124, 24, row.residual);
}
V.drawSummary(ctx, 1200, 630, M.state(1));
const html = fs.readFileSync(path.join(folder, "index.html"), "utf8"), app = fs.readFileSync(path.join(folder, "app.js"), "utf8");
assert.match(html, /min="-1" max="1" step="0.01"/); assert.match(html, /not a characterization/); assert.match(app, /topic: "stein"/); assert.doesNotMatch(html, /site-analytics|https?:\/\//);
console.log(`Stein mixture tests passed: ${checks} mathematical checks, plus rendering and presentation guards.`);
