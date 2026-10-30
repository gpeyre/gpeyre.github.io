"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/positive-matrix-means");
const M = require(path.join(directory, "core.js")), V = require(path.join(directory, "view.js"));
function close(a, b, tolerance = 2e-10) { assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`); }
function matrixClose(A, B, tolerance = 2e-10) { A.forEach((v, i) => close(v, B[i], tolerance)); }
function difference(A, B) { return A.map((v, i) => v - B[i]); }
function inverse(A) { const d = A[0] * A[3] - A[1] * A[2]; return [A[3] / d, -A[1] / d, -A[2] / d, A[0] / d]; }
function conjugate(S, A) { return M.multiply(M.multiply(S, A), M.transpose(S)); }
function nonnegative(A, tolerance = 2e-9) {
  const minimum = (A[0] + A[3] - Math.hypot(A[0] - A[3], A[1] + A[2])) / 2;
  assert.ok(minimum >= -tolerance * Math.max(1, M.norm(A)), "Loewner inequality failed: " + minimum);
}
// This independent 2 × 2 expression uses Cayley–Hamilton, rather than the
// implementation's whitening/eigendecomposition.
function independentGeometric(A, B, t) {
  const C = M.multiply(inverse(A), B), trace = C[0] + C[3], determinant = (B[0] * B[3] - B[1] * B[2]) / (A[0] * A[3] - A[1] * A[2]);
  const high = (trace + Math.sqrt(Math.max(0, trace * trace - 4 * determinant))) / 2, low = determinant / high;
  if (Math.abs(high - low) < 1e-12 * high) return M.scale(A, high ** t);
  const alpha = (high ** t - low ** t) / (high - low), beta = (high * low ** t - low * high ** t) / (high - low);
  return M.add(M.scale(B, alpha), M.scale(A, beta));
}
function independentLog(A) {
  const trace = A[0] + A[3], r = Math.hypot(A[0] - A[3], A[1] + A[2]);
  if (r < 1e-14 * trace) return [Math.log(trace / 2), 0, 0, Math.log(trace / 2)];
  const high = (trace + r) / 2, low = (A[0] * A[3] - A[1] * A[2]) / high;
  const alpha = (Math.log(high) - Math.log(low)) / r, beta = (high * Math.log(low) - low * Math.log(high)) / r;
  return M.add(M.scale(A, alpha), M.scale(M.I, beta));
}
function independentExp(H) {
  const center = (H[0] + H[3]) / 2, radius = Math.hypot((H[0] - H[3]) / 2, H[1]);
  const odd = radius ? Math.sinh(radius) / radius : 1;
  return M.scale(M.add(M.scale(M.I, Math.cosh(radius)), M.scale(difference(H, M.scale(M.I, center)), odd)), Math.exp(center));
}
const browser = {};
vm.runInNewContext(fs.readFileSync(path.join(directory, "../bures-covariances/core.js"), "utf8"), browser);
vm.runInNewContext(fs.readFileSync(path.join(directory, "core.js"), "utf8"), browser);
matrixClose(browser.PositiveMatrixMeans.logEuclidean(M.I, [4, 0, 0, 4], .5), [2, 0, 0, 2]);
for (const A of [M.I, [3, 0, 0, 3], [1, 1e-13, 1e-13, 1], M.covariance(32, 25, .4)]) {
  matrixClose(M.exp(M.log(A)), A);
  matrixClose(M.power(A, 0), M.I); matrixClose(M.power(A, 1), A);
  matrixClose(M.power(A, -1), inverse(A)); matrixClose(M.multiply(M.power(A, .5), M.power(A, .5)), A);
  matrixClose(M.log(A), independentLog(A)); close(M.logDet(A), Math.log(M.determinant(A)));
}
for (const H of [[0, 0, 0, 0], [-2, 0, 0, -2], [-1, 2, 2, 3], [1, 1e-14, 1e-14, 1]]) matrixClose(M.exp(H), independentExp(H));
for (const bad of [[0, 0, 0, 0], [1, 0, 0, 0], [1, 2, 2, 1], [1, .1, .2, 1], [1, 2, 3], [NaN, 0, 0, 1]]) {
  assert.throws(() => M.log(bad), RangeError); assert.throws(() => M.geometric(bad, M.I, 0), RangeError);
}
assert.throws(() => M.exp([0, 1, 0, 1]), RangeError); assert.throws(() => M.power(M.I, NaN), RangeError);
assert.throws(() => M.interpolate(M.I, M.I, .5, "unknown"), RangeError);
let seed = 824775;
function random() { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 2 ** 32; }
const cases = Object.values(M.presets).map(p => [M.covariance(0, p.anisotropy, 1), M.covariance(p.rotation, p.anisotropy, p.bSize)]);
for (let k = 0; k < 120; k++) cases.push([M.covariance(180 * random() - 90, 1 + 12 * random(), .4 + random()), M.covariance(180 * random() - 90, 1 + 12 * random(), .4 + random())]);
for (const [A, B] of cases) {
  const logarithmic = M.logarithmic(A, B), arithmetic = M.scale(M.add(A, B), .5), midpoint = M.geometric(A, B, .5);
  matrixClose(M.logarithmic(B, A), logarithmic, 2e-8);
  nonnegative(difference(logarithmic, midpoint)); nonnegative(difference(arithmetic, logarithmic));
  const commuting = M.relativeCommutator(A, B) < 1e-12;
  for (const t of [0, .13, .5, .83, 1]) {
    const log = M.logEuclidean(A, B, t), ka = M.geometric(A, B, t), linear = M.add(M.scale(A, 1 - t), M.scale(B, t));
    assert.ok(M.eigen(log).values[1] > 0); assert.ok(M.eigen(ka).values[1] > 0);
    matrixClose(ka, independentGeometric(A, B, t), 3e-8);
    matrixClose(log, independentExp(M.add(M.scale(independentLog(A), 1 - t), M.scale(independentLog(B), t))), 3e-8);
    close(M.logDet(log), (1 - t) * M.logDet(A) + t * M.logDet(B), 3e-9);
    close(M.logDet(ka), (1 - t) * M.logDet(A) + t * M.logDet(B), 3e-9);
    nonnegative(difference(linear, ka));
    const harmonic = inverse(M.add(M.scale(inverse(A), 1 - t), M.scale(inverse(B), t)));
    nonnegative(difference(ka, harmonic));
    if (commuting) matrixClose(log, ka);
    const maxEigen = Math.max(M.eigen(A).values[0], M.eigen(B).values[0]);
    assert.ok(M.eigen(log).values[0] <= maxEigen + 1e-8); assert.ok(M.eigen(ka).values[0] <= maxEigen + 1e-8);
    for (const kind of ["log", "ka"]) {
      const C = M.interpolate(A, B, t, kind);
      matrixClose(M.interpolate(B, A, 1 - t, kind), C, 2e-8);
      matrixClose(M.interpolate(inverse(A), inverse(B), t, kind), inverse(C), 2e-8);
      matrixClose(M.interpolate(A, A, t, kind), A);
    }
    // General congruence for KA, orthogonal congruence for both. A nonorthogonal
    // congruence for log-Euclidean is deliberately not asserted.
    const S = [1.2, .27, -.18, .8];
    matrixClose(M.geometric(conjugate(S, A), conjugate(S, B), t), conjugate(S, ka), 2e-8);
  }
  for (const kind of ["log", "ka"]) {
    assert.deepEqual(M.interpolate(A, B, 0, kind), A); assert.deepEqual(M.interpolate(A, B, 1, kind), B);
    assert.throws(() => M.interpolate(A, B, -.1, kind), RangeError); assert.throws(() => M.interpolate(A, B, Infinity, kind), RangeError);
  }
}
// The time-average is the operator logarithmic mean, NOT the geometric midpoint.
{
  const A = M.I, B = [4, 0, 0, 4];
  matrixClose(M.logarithmic(A, B), M.scale(M.I, 3 / Math.log(4)));
  matrixClose(M.logEuclidean(A, B, .5), M.scale(M.I, 2));
  assert.ok(M.norm(difference(M.logarithmic(A, B), M.logEuclidean(A, B, .5))) > .2);
  matrixClose(M.logarithmic(A, A), A);
  for (const u of [1 - 1e-12, 1 + 1e-12]) matrixClose(M.logarithmic(A, M.scale(M.I, u)), M.scale(M.I, (u - 1) / Math.log(u)));
  // Composite Simpson integration independently checks the entire KA path.
  for (const [X, Y] of cases.slice(0, 3)) {
    let integral = [0, 0, 0, 0]; const steps = 800;
    for (let k = 0; k <= steps; k++) integral = M.add(integral, M.scale(M.geometric(X, Y, k / steps), k === 0 || k === steps ? 1 : k % 2 ? 4 : 2));
    matrixClose(M.scale(integral, 1 / (3 * steps)), M.logarithmic(X, Y), 2e-9);
  }
}
// Extreme common scales and isotropic/repeated eigenvalues.
for (const s of [1e-200, 1e200]) for (const [A, B] of cases.slice(0, 3)) {
  matrixClose(M.scale(M.geometric(M.scale(A, s), M.scale(B, s), .37), 1 / s), M.geometric(A, B, .37), 3e-8);
  matrixClose(M.scale(M.logEuclidean(M.scale(A, s), M.scale(B, s), .37), 1 / s), M.logEuclidean(A, B, .37), 3e-8);
  matrixClose(M.scale(M.logarithmic(M.scale(A, s), M.scale(B, s)), 1 / s), M.logarithmic(A, B), 3e-8);
}
// Renderer and real event handlers: all coordinates must remain finite.
let drawCalls = 0;
function context() {
  const ctx = {};
  for (const method of ["clearRect", "scale", "beginPath", "moveTo", "lineTo", "arc", "rect", "clip", "closePath", "stroke", "fill", "save", "restore", "setLineDash", "fillRect", "strokeRect", "fillText"]) ctx[method] = (...args) => {
    for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), method + " nonfinite coordinate"); drawCalls++;
  };
  return ctx;
}
const html = fs.readFileSync(path.join(directory, "index.html"), "utf8"), nodes = {}, events = {}, frames = new Map(); let nextFrame = 0;
function node(id) {
  const handlers = {}, attrs = {};
  return { id, value: "", checked: true, textContent: "", clientWidth: 360, clientHeight: 330,
    addEventListener(type, fn) { handlers[type] = fn; }, dispatch(type, event = {}) { if (handlers[type]) handlers[type](event); },
    setAttribute(key, value) { attrs[key] = value; }, getAttribute(key) { return attrs[key]; }, getContext: context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 1180 }) };
}
for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes[match[1]] = node(match[1]);
const messages = [], location = { protocol: "https:", origin: "https://www.gpeyre.com" };
const parent = { postMessage(message, target) { messages.push({ message, target }); } };
const window = { PositiveMatrixMeans: M, PositiveMatrixMeansView: V, parent, devicePixelRatio: 1, addEventListener(type, fn) { events[type] = fn; } };
const sandbox = { window, location, document: { getElementById: id => { assert.ok(nodes[id], "Missing node " + id); return nodes[id]; }, querySelector: () => node("main") },
  requestAnimationFrame(fn) { const id = ++nextFrame; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
vm.runInNewContext(fs.readFileSync(path.join(directory, "app.js"), "utf8"), sandbox);
let state = window.PositiveMatrixMeansApp.getState();
assert.equal(state.strictlyPositive, true); assert.equal(state.playing, false); assert.equal(state.t, .5); assert.equal(state.showLogarithmic, true);
assert.equal(nodes["preset-noncommuting"].getAttribute("aria-pressed"), "true"); assert.ok(drawCalls > 1000); assert.ok(M.relativeDifference(state.log, state.ka) > .01);
const bound = state.extent;
nodes["log-plot"].dispatch("keydown", { key: "ArrowLeft", preventDefault() {} }); close(window.PositiveMatrixMeansApp.getState().t, .49);
nodes["ka-plot"].dispatch("keydown", { key: "ArrowUp", shiftKey: true, preventDefault() {} }); close(window.PositiveMatrixMeansApp.getState().t, .59);
nodes["log-plot"].dispatch("keydown", { key: "Home", preventDefault() {} }); assert.equal(window.PositiveMatrixMeansApp.getState().t, 0);
nodes["ka-plot"].dispatch("keydown", { key: "End", preventDefault() {} }); assert.equal(window.PositiveMatrixMeansApp.getState().t, 1);
close(window.PositiveMatrixMeansApp.getState().extent, bound);
nodes["time"].value = ".37"; nodes["time"].dispatch("input"); close(window.PositiveMatrixMeansApp.getState().t, .37); close(window.PositiveMatrixMeansApp.getState().extent, bound);
nodes["preset-commuting"].dispatch("click"); state = window.PositiveMatrixMeansApp.getState(); matrixClose(state.log, state.ka); assert.match(nodes.status.textContent, /endpoints commute/);
nodes["preset-thin"].dispatch("click"); state = window.PositiveMatrixMeansApp.getState(); assert.equal(state.strictlyPositive, true); assert.ok(M.relativeDifference(state.log, state.ka) > .1);
nodes["time"].value = ".37"; nodes["time"].dispatch("input"); state = window.PositiveMatrixMeansApp.getState();
const unrotatedA = state.A.slice(), beforeRotation = M.eigen(state.B).values.slice(), determinantA = M.determinant(state.A), determinantB = M.determinant(state.B);
nodes.rotation.value = "-25"; nodes.rotation.dispatch("input"); state = window.PositiveMatrixMeansApp.getState();
assert.equal(state.rotation, -25); matrixClose(state.A, unrotatedA); matrixClose(M.eigen(state.B).values, beforeRotation);
matrixClose(state.B, M.covariance(-25, 25, 1.08)); close(state.t, .37); close(state.anisotropy, 25);
nodes.anisotropy.value = "3.2"; nodes.anisotropy.dispatch("input"); state = window.PositiveMatrixMeansApp.getState();
assert.equal(state.anisotropy, 3.2); assert.equal(state.rotation, -25); close(state.t, .37);
matrixClose(state.A, M.covariance(0, 3.2, 1)); matrixClose(state.B, M.covariance(-25, 3.2, 1.08));
for (const C of [state.A, state.B]) { const values = M.eigen(C).values; close(Math.sqrt(values[0] / values[1]), 3.2); }
close(M.determinant(state.A), determinantA); close(M.determinant(state.B), determinantB);
nodes.anisotropy.value = "NaN"; nodes.anisotropy.dispatch("input"); assert.equal(window.PositiveMatrixMeansApp.getState().anisotropy, 3.2);
nodes.anisotropy.value = "30"; nodes.anisotropy.dispatch("input"); assert.equal(window.PositiveMatrixMeansApp.getState().anisotropy, 25);
nodes.rotation.value = "100"; nodes.rotation.dispatch("input"); assert.equal(window.PositiveMatrixMeansApp.getState().rotation, 90);
nodes.anisotropy.value = "0"; nodes.anisotropy.dispatch("input"); state = window.PositiveMatrixMeansApp.getState();
assert.equal(state.anisotropy, 1); matrixClose(state.A, M.I); matrixClose(state.B, M.scale(M.I, 1.08 ** 2));
nodes["preset-scalar"].dispatch("click"); state = window.PositiveMatrixMeansApp.getState();
matrixClose(state.log, [2, 0, 0, 2]); matrixClose(state.ka, state.log); matrixClose(state.logarithmic, M.scale(M.I, 3 / Math.log(4)));
const timeAverage = state.logarithmic.slice(); nodes["time"].value = ".1"; nodes["time"].dispatch("input"); matrixClose(window.PositiveMatrixMeansApp.getState().logarithmic, timeAverage);
nodes["show-logarithmic"].checked = false; nodes["show-logarithmic"].dispatch("change"); assert.equal(window.PositiveMatrixMeansApp.getState().showLogarithmic, false);
assert.match(nodes["log-plot"].getAttribute("aria-label"), /Arrow keys/);
assert.ok(messages.length > 0); assert.equal(messages.at(-1).message.topic, "positive-matrix-means"); assert.equal(messages.at(-1).target, location.origin);
const count = messages.length; events.message({ source: parent, origin: location.origin, data: { type: "ot-experiment-measure" } }); assert.equal(messages.length, count + 1);
events.message({ source: {}, origin: location.origin, data: { type: "ot-experiment-measure" } }); assert.equal(messages.length, count + 1);
events.message({ source: parent, origin: "https://untrusted.example", data: { type: "ot-experiment-measure" } }); assert.equal(messages.length, count + 1);
events.resize(); for (const fn of frames.values()) fn(); frames.clear();
for (const width of [220, 300, 600]) for (const kind of ["log", "ka"]) {
  const box = V.layout(width, 330); assert.ok(box.side > 0 && box.side <= width - box.left);
  V.drawPanel(context(), width, 330, { A: state.A, B: state.B, t: state.t, kind, extent: state.extent, showLogarithmic: true });
}
assert.equal(V.color(0), "rgb(37,99,201)"); assert.equal(V.color(1), "rgb(220,75,76)"); assert.equal(V.color(.5), "rgb(129,87,139)");
for (const id of ["time", "rotation", "anisotropy"]) assert.ok(html.includes('for="' + id + '"'));
assert.equal((html.match(/<input\b[^>]*type="range"[^>]*>/g) || []).length, 3, "Exactly time, relative rotation, and anisotropy sliders");
for (const [id, key] of [["rotation", "rotation"], ["anisotropy", "anisotropy"]]) {
  const input = html.match(new RegExp('<input\\b[^>]*id="' + id + '"[^>]*>'))[0];
  assert.equal(Number(input.match(/\bvalue="([^"]+)"/)[1]), M.presets.noncommuting[key], "Initial HTML agrees with the live preset");
}
assert.equal((html.match(/tabindex="0"/g) || []).length, 2);
const article = fs.readFileSync(path.join(__dirname, "../blog/preparations/averaging-positive-symmetric-matrices.html"), "utf8");
assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(article), "No corrupted LaTeX control characters");
assert.equal((article.match(/class="blog-proof"/g) || []).length, 7);
for (const id of ["theorem-1", "theorem-2", "theorem-3", "proposition-1", "proposition-2"]) assert.ok(article.includes('id="' + id + '"'));
assert.ok(article.includes("Logarithmic mean</em> means integrate the relative geometric interpolation"));
assert.ok(article.includes("T&amp;=A^{-1}\\#B"));
assert.ok(article.includes('data-experiment="positive-matrix-means"'));
assert.ok(article.includes('src="../../js/site-analytics.js"'));
assert.ok(!html.includes("L<sub>t</sub>"), "Use E_t consistently for log-Euclidean geometry");
for (const [, id] of article.matchAll(/href="#(ref-[^"]+)"/g)) assert.ok(article.includes('id="' + id + '"'), "Reference " + id + " resolves");
console.log("Positive matrix means: spectral calculus, independent interpolation formulas, AM–GM–HM, determinant law, congruence, inverses, logarithmic time-average, scalar distinction, responsive renderer, real UI handlers, article proofs and citations pass.");
