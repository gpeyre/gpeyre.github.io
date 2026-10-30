"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const filename = path.join(__dirname, "../blog/preparations/assets/generalized-means/core.js");
const M = require(filename);
const V = require("../blog/preparations/assets/generalized-means/view.js");
function close(a, b, tolerance = 3e-13) { assert.ok(Math.abs(a - b) <= tolerance * Math.max(Math.abs(a), Math.abs(b)), `${a} != ${b}`); }
const browser = {};
vm.runInNewContext(fs.readFileSync(filename, "utf8"), browser);
close(browser.GeneralizedMeans.powerMean(0, 1, 4), 2);
for (const [x, y] of [[1, 2], [.08, 2], [.6, 1.5], [1e-100, 1e100], [1e-300, 1e300]]) {
  let previous = 0;
  for (const p of [-2, -1, -.5, -1e-8, -1e-14, 0, 1e-14, 1e-8, .5, 1, 2]) {
    const v = M.powerMean(p, x, y);
    assert.ok(Number.isFinite(v) && v >= Math.min(x, y) && v <= Math.max(x, y));
    close(v, M.powerMean(p, y, x));
    assert.ok(v >= previous * (1 - 1e-12), `power ordering failed at ${p}`); previous = v;
    close(M.powerMean(p, x * 1.25, y * 1.25), v * 1.25, 5e-13);
    close(M.powerMean(p, x, x), x);
  }
  close(M.powerMean(1, x, y), x / 2 + y / 2);
  close(M.powerMean(-1, x, y), Math.min(x, y) / (.5 + .5 * (Math.min(x, y) / Math.max(x, y))));
  close(M.powerMean(0, x, y), Math.sqrt(x) * Math.sqrt(y));
}
// The expansion at zero avoids cancellation in log(cosh(p*d))/p.
for (const p of [-1e-12, -1e-8, 1e-12, 1e-8]) {
  const x = .08, y = 2, center = (Math.log(x) + Math.log(y)) / 2, d = (Math.log(x) - Math.log(y)) / 2;
  close(M.powerMean(p, x, y), Math.exp(center + .5 * p * d * d), 2e-15);
}
close(M.logCosh(0), 0); close(M.logCosh(1000), 1000 - Math.LN2);
for (const p of [-2, -1, 0, .5, 1, 2]) for (const q of [-2, -1, 0, 1, 2]) for (const [x, y] of [[.08, 2], [.45, 1.8], [1, 2], [1, 1]]) {
  const result = M.gaussMean(p, q, x, y);
  assert.notEqual(result.stopReason, "max-iterations");
  close(result.value, M.gaussMean(q, p, x, y).value);
  close(result.value, M.gaussMean(p, q, y, x).value);
  close(M.gaussMean(p, q, 1.5 * x, 1.5 * y).value, 1.5 * result.value);
  assert.ok(result.value >= Math.min(x, y) && result.value <= Math.max(x, y));
  for (let n = 1; n < result.trace.length; n++) {
    const old = result.trace[n - 1], now = result.trace[n];
    assert.ok(now.lower >= old.lower && now.upper <= old.upper);
    close(now.x, M.powerMean(p, old.x, old.y)); close(now.y, M.powerMean(q, old.x, old.y));
    assert.equal(now.radius, now.width / 2);
  }
  if (p === q) close(result.value, M.powerMean(p, x, y));
  // Opposite powers preserve xy at every exact-arithmetic step, so their
  // common limit is G. This includes the arithmetic/harmonic pair.
  if (p + q === 0) {
    const geometric = Math.sqrt(x * y);
    close(result.value, geometric, 2e-12);
    assert.ok(geometric >= result.lower - 3e-15 && geometric <= result.upper + 3e-15);
  }
}
close(M.gaussMean(1, 0, 1, 2).value, 1.4567910310469068, 2e-13);
close(M.gaussMean(1, -1, .45, 1.8).value, .9, 2e-13);
// Independent check of the fractional-linear example from the classification:
// f(t)=t, g(t)=(2t+3)/(t+2); the invariant coordinate is log(t+2).
for (const [initialX, initialY] of [[.08, 2], [.45, 1.8], [1, 2]]) {
  let x = initialX, y = initialY;
  const g = t => (2 * t + 3) / (t + 2);
  const inverseG = u => (3 - 2 * u) / (u - 2);
  for (let n = 0; n < 12; n++) {
    const u = (x + y) / 2, v = inverseG((g(x) + g(y)) / 2);
    close((u + 2) * (v + 2), (x + 2) * (y + 2), 2e-14);
    x = u; y = v;
  }
  close((x + y) / 2, Math.sqrt((initialX + 2) * (initialY + 2)) - 2, 2e-13);
}
// The fourth-order Taylor formula gives m_{t^3}(t+s,t-s)
// = t + s^2/t - s^4/t^3 + O(s^6), checked with a direct cubic-root formula.
for (const t of [.7, 1, 2]) {
  const s = .01 * t;
  const exact = Math.cbrt(((t + s) ** 3 + (t - s) ** 3) / 2);
  const expansion = t + s * s / t - s ** 4 / t ** 3;
  assert.ok(Math.abs(exact - expansion) < 2e-12 * t);
}
const article = fs.readFileSync(path.join(__dirname, "../blog/preparations/arithmetico-geometric-means.html"), "utf8");
assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(article), "No control-character-corrupted LaTeX");
assert.equal((article.match(/class="blog-proof"/g) || []).length, 8);
assert.ok(article.includes("No differentiability is assumed."));
assert.ok(article.includes("This non-elementary regularity-and-extension step is quoted here"));
assert.ok(article.includes("Monotonicity of the limit additionally uses monotonicity of the input means"));
assert.ok(article.includes("src=\"assets/generalized-means/index.html\""));
assert.ok(article.includes("ad-bc\\ne0"));
assert.ok(article.includes("h(x)=\\log|cf(x)+d|"));
// A tiny change in midpoint does not certify a tight bracket.
const capped = M.gaussMean(-2, 2, .08, 2, { maxIterations: 1, relativeTolerance: 1e-15 });
assert.equal(capped.stopReason, "max-iterations"); assert.equal(capped.converged, false); assert.ok(capped.radius > 1e-4);
const noUpdates = M.gaussMean(1, -1, 1, 2, { maxIterations: 0 });
assert.equal(noUpdates.iterations, 0); assert.equal(noUpdates.stopReason, "max-iterations");
const collapsed = M.gaussMean(1, 1, 1, 2, { relativeTolerance: 0 });
assert.equal(collapsed.stopReason, "roundoff"); assert.equal(collapsed.converged, false); assert.equal(collapsed.radius, 0);
const equal = M.gaussMean(-2, 2, 1.5, 1.5);
assert.equal(equal.stopReason, "equal-inputs"); assert.equal(equal.iterations, 0); assert.equal(equal.value, 1.5);
const fields = M.sampleFields(1, -1, 19);
assert.equal(fields.single.length, 361); assert.equal(fields.composed.length, 361); assert.equal(fields.capped, 0);
for (let row = 0; row < fields.size; row++) for (let col = 0; col < fields.size; col++) {
  const x = fields.min + (fields.max - fields.min) * col / (fields.size - 1), y = fields.max - (fields.max - fields.min) * row / (fields.size - 1), k = row * fields.size + col;
  close(fields.single[k], (x + y) / 2); close(fields.composed[k], Math.sqrt(x * y), 2e-9);
}
for (const bad of [0, -1, NaN, Infinity]) assert.throws(() => M.powerMean(1, bad, 1), RangeError);
assert.throws(() => M.powerMean(NaN, 1, 2), RangeError);
assert.throws(() => M.gaussMean(1, 0, 1, 2, { maxIterations: -1 }), RangeError);
assert.throws(() => M.gaussMean(1, 0, 1, 2, { relativeTolerance: NaN }), RangeError);
assert.throws(() => M.sampleFields(1, 0, 2), RangeError);

// The renderer and UI also run without external browser/testing dependencies.
// This smoke fixture exercises the real event handlers, not a rewritten model.
let drawCalls = 0;
function context() {
  const ctx = { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createLinearGradient: () => ({ addColorStop() {} }) };
  for (const method of ["scale", "beginPath", "moveTo", "lineTo", "arc", "rect", "clip", "closePath", "stroke", "fill", "save", "restore", "setLineDash", "fillRect", "strokeRect", "fillText", "drawImage", "putImageData"]) ctx[method] = (...args) => {
    for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), method + " received a nonfinite coordinate");
    drawCalls++;
  };
  return ctx;
}
const nodes = {}, events = {}, frameQueue = new Map(); let nextFrame = 0;
function node(id) {
  const handlers = {}, attrs = {};
  return { id, value: "", textContent: "", children: [], clientWidth: 300, clientHeight: 351,
    addEventListener(type, fn) { handlers[type] = fn; },
    dispatch(type, event = {}) { if (handlers[type]) handlers[type](event); },
    setAttribute(key, value) { attrs[key] = value; }, getAttribute(key) { return attrs[key]; },
    getContext: () => context(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 351 }),
    replaceChildren(...children) { this.children = children; }, appendChild(child) { this.children.push(child); },
    closest: () => nodes.details, focus() {}, setPointerCapture() {}
  };
}
for (const id of ["power-p", "power-q", "p-value", "q-value", "point-x", "point-y", "single-plot", "composed-plot", "trace-plot", "single-value", "composed-value", "single-formula", "composed-formula", "bracket-value", "radius-value", "iteration-count", "identity-value", "status", "trace-rows", "details", "preset-ah", "preset-ag", "preset-equal"]) nodes[id] = node(id);
nodes["power-p"].value = "1"; nodes["power-q"].value = "-1";
const window = { GeneralizedMeans: M, GeneralizedMeansView: V, devicePixelRatio: 1, addEventListener(type, fn) { events[type] = fn; } }; window.parent = window;
const sandbox = { window, document: { getElementById: id => nodes[id], createElement: tag => node(tag) },
  requestAnimationFrame(fn) { const id = ++nextFrame; frameQueue.set(id, fn); return id; }, cancelAnimationFrame(id) { frameQueue.delete(id); } };
vm.runInNewContext(fs.readFileSync(path.join(path.dirname(filename), "app.js"), "utf8"), sandbox);
function flush() { const pending = [...frameQueue.values()]; frameQueue.clear(); pending.forEach(fn => fn()); }
let state = window.GeneralizedMeansApp.getState();
close(state.composition, .9); assert.equal(state.playing, false); assert.equal(state.heatmapCapped, 0); assert.equal(state.gridSize, 111);
assert.ok(drawCalls > 1000); assert.equal(nodes["preset-ah"].getAttribute("aria-pressed"), "true");
nodes["preset-ag"].dispatch("click"); nodes["point-x"].value = "1"; nodes["point-x"].dispatch("change"); nodes["point-y"].value = "2"; nodes["point-y"].dispatch("change");
state = window.GeneralizedMeansApp.getState(); close(state.composition, 1.4567910310469068); assert.equal(state.q, 0);
nodes["single-plot"].dispatch("keydown", { key: "ArrowLeft", preventDefault() {} }); close(window.GeneralizedMeansApp.getState().x, .99);
nodes["composed-plot"].dispatch("keydown", { key: "Home", preventDefault() {} }); close(window.GeneralizedMeansApp.getState().x, .45);
nodes["power-p"].value = "-0.5"; nodes["power-p"].dispatch("input"); flush(); assert.equal(window.GeneralizedMeansApp.getState().p, -.5);
nodes["preset-equal"].dispatch("click"); state = window.GeneralizedMeansApp.getState(); assert.equal(state.p, state.q); close(state.composition, state.power); assert.equal(state.stopReason, "roundoff");
assert.match(nodes.status.textContent, /no zero-error claim/); assert.ok(nodes["trace-rows"].children.length > 1);
nodes["point-x"].value = "-1"; nodes["point-x"].dispatch("change"); close(window.GeneralizedMeansApp.getState().x, .45);
nodes["composed-plot"].dispatch("pointerdown", { clientX: 162, clientY: 138, pointerId: 1 });
state = window.GeneralizedMeansApp.getState(); close(state.x, 1.04); close(state.y, 1.04);
nodes["composed-plot"].dispatch("pointerup");
assert.match(nodes["composed-plot"].getAttribute("aria-label"), /Arrow keys/);
for (const width of [300, 220, 500]) { const box = V.layout(width, width * 1.17); assert.ok(box.side > 0 && box.side <= width - box.left); }
console.log("Generalized means: stable p→0 limit, mean identities, simultaneous nested brackets, honest stopping, shared renderer, presets, coordinate inputs, pointer and keyboard controls pass.");
