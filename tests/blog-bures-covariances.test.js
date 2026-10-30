"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/bures-covariances");
const M = require(path.join(directory, "core.js"));
const V = require(path.join(directory, "view.js"));
function close(a, b, tolerance = 3e-11) { assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`); }
function matrixClose(A, B, tolerance = 3e-11) { A.forEach((a, i) => close(a, B[i], tolerance)); }
function difference(A, B) { return A.map((v, i) => v - B[i]); }
function rotation(a) { return [Math.cos(a), -Math.sin(a), Math.sin(a), Math.cos(a)]; }
function conjugate(Q, A) { return M.multiply(M.multiply(Q, A), M.transpose(Q)); }
function independentRoot(A) {
  const angle = Math.atan2(2 * A[1], A[0] - A[3]) / 2;
  const d = Math.hypot(A[0] - A[3], 2 * A[1]), trace = A[0] + A[3];
  return conjugate(rotation(angle), [Math.sqrt(Math.max(0, (trace + d) / 2)), 0, 0, Math.sqrt(Math.max(0, (trace - d) / 2))]);
}
function independentBures(A, B) {
  const trAB = A[0] * B[0] + 2 * A[1] * B[1] + A[3] * B[3];
  const detA = Math.max(0, A[0] * A[3] - A[1] * A[1]), detB = Math.max(0, B[0] * B[3] - B[1] * B[1]);
  return Math.sqrt(Math.max(0, M.trace(A) + M.trace(B) - 2 * Math.sqrt(trAB + 2 * Math.sqrt(detA * detB))));
}
const browser = {};
vm.runInNewContext(fs.readFileSync(path.join(directory, "core.js"), "utf8"), browser);
close(browser.BuresCovariances.buresDistance([1, 0, 0, 1], [4, 0, 0, 4]), Math.sqrt(2));

// Principal square roots: zero, rank one, repeated eigenvalues, and scales
// spanning 560 orders of magnitude. Reconstruction is checked after scaling.
for (const A of [[0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1], [2, -2, -2, 2], [3, 0, 0, 3], M.covariance(41, 25, .7)]) {
  for (const s of [1e-280, 1, 1e280]) {
    const C = M.scale(A, s), X = M.sqrt(C), square = M.multiply(X, X);
    matrixClose(M.scale(square, 1 / s), A, 2e-12);
    const E = M.eigen(C); assert.ok(E.values.every(v => v >= 0));
    matrixClose(M.scale(conjugate(E.vectors, [E.values[0], 0, 0, E.values[1]]), 1 / s), A, 2e-12);
  }
  matrixClose(M.sqrt(A), independentRoot(A), 2e-12);
}
const nearRankOne = [1, 1 - 1e-13, 1 - 1e-13, 1];
assert.ok(M.determinant(nearRankOne) > 0); assert.ok(M.eigen(nearRankOne).values[1] > 0);
matrixClose(M.multiply(M.sqrt(nearRankOne), M.sqrt(nearRankOne)), nearRankOne);
for (const A of [[1, 2, 2, 1], [-1, 0, 0, 1], [1, .1, .2, 1], [Infinity, 0, 0, 1], [1, 2, 3]]) assert.throws(() => M.sqrt(A), RangeError);
assert.throws(() => M.inverseSqrt([1, 0, 0, 0]), RangeError);

const cases = [
  [M.covariance(10, 4, 1), M.covariance(75, 3, 1.08)],
  [M.covariance(20, 3.8, 1), M.covariance(20, 1.7, 1.2)],
  [M.covariance(0, 25, 1), M.covariance(78, 25, .85)],
  [[1, 0, 0, 0], [.5, .5, .5, .5]],
  [[1, 0, 0, 0], [0, 0, 0, 3]],
  [[0, 0, 0, 0], [2, 1, 1, 2]]
];
for (const [A, B] of cases) {
  const dR = M.rootDistance(A, B), dB = M.buresDistance(A, B);
  // Rounded conjugation/scaling of rank-one matrices can create an O(eps)
  // positive eigenvalue; the square root is only 1/2-Hölder at that boundary.
  const tolerance = Math.min(M.eigen(A).values[1], M.eigen(B).values[1]) === 0 ? 3e-8 : 2e-10;
  close(dB, independentBures(A, B)); close(dR, M.rootDistance(B, A)); close(dB, M.buresDistance(B, A));
  close(M.rootDistance(A, A), 0); close(M.buresDistance(A, A), 0);
  assert.ok(dB <= dR + 1e-12); assert.ok(dR <= Math.SQRT2 * dB + 1e-12);
  const commuting = M.relativeCommutator(A, B) < 1e-12;
  if (commuting) close(dR, dB); else assert.ok(dR > dB + 1e-5);
  for (const Q of [rotation(.472), [1, 0, 0, -1]]) {
    close(M.rootDistance(conjugate(Q, A), conjugate(Q, B)), dR, tolerance);
    close(M.buresDistance(conjugate(Q, A), conjugate(Q, B)), dB, tolerance);
    for (const geometry of ["root", "bures"]) {
      const geodesic = geometry === "root" ? M.rootGeodesic : M.buresGeodesic;
      matrixClose(geodesic(conjugate(Q, A), conjugate(Q, B), .37), conjugate(Q, geodesic(A, B, .37)), tolerance);
    }
  }
  for (const s of [.001, 4, 1e6]) { close(M.rootDistance(M.scale(A, s), M.scale(B, s)), Math.sqrt(s) * dR, tolerance); close(M.buresDistance(M.scale(A, s), M.scale(B, s)), Math.sqrt(s) * dB, tolerance); }
  for (const [geodesic, distance, full] of [[M.rootGeodesic, M.rootDistance, dR], [M.buresGeodesic, M.buresDistance, dB]]) {
    assert.deepEqual(geodesic(A, B, 0), A); assert.deepEqual(geodesic(A, B, 1), B);
    for (const t of [.1, .37, .5, .9]) {
      const C = geodesic(A, B, t);
      assert.ok(M.eigen(C).values[1] >= 0);
      close(distance(A, C), t * full, tolerance); close(distance(C, B), (1 - t) * full, tolerance);
      close((1 - t) * distance(A, C) ** 2 + t * distance(B, C) ** 2, t * (1 - t) * full ** 2, tolerance);
      if (commuting) matrixClose(C, M.rootGeodesic(A, B, t));
    }
    close(distance(geodesic(A, B, .21), geodesic(A, B, .64)), .43 * full, tolerance);
    assert.throws(() => geodesic(A, B, -.01), RangeError); assert.throws(() => geodesic(A, B, NaN), RangeError);
  }
}
// Independently minimize over all planar orthogonal alignments, with both
// rotations and reflections. The 20,000-angle grid brackets the exact answer.
{
  const [A, B] = cases[0], X = independentRoot(A), Y = independentRoot(B);
  let best = Infinity;
  for (let k = 0; k < 20000; k++) {
    const Q = rotation(k * 2 * Math.PI / 20000);
    for (const U of [Q, M.multiply(Q, [1, 0, 0, -1])]) best = Math.min(best, M.norm(difference(X, M.multiply(Y, U))));
  }
  assert.ok(best >= M.buresDistance(A, B) - 1e-12); close(best, M.buresDistance(A, B), 2e-8);
}
// Sharpness: slightly rotating a rank-one covariance makes droot/dB approach √2.
{
  const A = [1, 0, 0, 0], B = conjugate(rotation(.001), A);
  close(M.rootDistance(A, B) / M.buresDistance(A, B), Math.SQRT2, 2e-7);
}
// Transport representation, independent Bures barycenter fixed-point identity,
// and numerical local speeds using the two different Riemannian tensors.
for (const [A, B] of cases.slice(0, 3)) {
  const T = M.transport(A, B); matrixClose(M.multiply(M.multiply(T, A), T), B, 2e-10);
  for (const s of [1e-280, 1e280]) {
    const scaledA = M.scale(A, s), scaledB = M.scale(B, s);
    matrixClose(M.transport(scaledA, scaledB), T, 3e-10);
    close(M.buresDistance(scaledA, scaledB) / Math.sqrt(s), M.buresDistance(A, B), 3e-10);
    close(M.rootDistance(scaledA, scaledB) / Math.sqrt(s), M.rootDistance(A, B), 3e-10);
    close(M.relativeCommutator(scaledA, scaledB), M.relativeCommutator(A, B));
    matrixClose(M.scale(M.buresGeodesic(scaledA, scaledB, .37), 1 / s), M.buresGeodesic(A, B, .37), 3e-10);
  }
  const t = .37, C = M.buresGeodesic(A, B, t), S = M.sqrt(C);
  const fixed = M.add(M.scale(M.sqrt(M.symmetric(M.multiply(M.multiply(S, A), S))), 1 - t), M.scale(M.sqrt(M.symmetric(M.multiply(M.multiply(S, B), S))), t));
  matrixClose(fixed, C, 3e-10);
  for (const [geodesic, distance, kind] of [[M.rootGeodesic, M.rootDistance, "root"], [M.buresGeodesic, M.buresDistance, "bures"]]) {
    const L = M.add(M.scale(M.I, 1 - t), M.scale(T, t));
    if (kind === "bures") matrixClose(geodesic(A, B, t), M.multiply(M.multiply(L, A), L), 2e-10);
    const here = geodesic(A, B, t), h = 1e-5, derivative = M.scale(difference(geodesic(A, B, t + h), geodesic(A, B, t - h)), 1 / (2 * h));
    const E = M.eigen(here), D = conjugate(M.transpose(E.vectors), derivative), l = E.values;
    let speed2 = 0;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) speed2 += kind === "bures" ? .5 * D[2 * i + j] ** 2 / (l[i] + l[j]) : D[2 * i + j] ** 2 / (Math.sqrt(l[i]) + Math.sqrt(l[j])) ** 2;
    close(speed2, distance(A, B) ** 2, 3e-8);
    // A local perturbation cannot lower the claimed weighted barycenter cost.
    const objective = X => (1 - t) * distance(A, X) ** 2 + t * distance(B, X) ** 2;
    const cost = objective(here);
    for (const D of [[1, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 1]]) for (const sign of [-1, 1]) {
      const perturbation = M.add(here, M.scale(D, sign * 1e-4));
      assert.ok(objective(perturbation) >= cost - 1e-12);
    }
  }
}

// One-Mahalanobis-radius means xᵀ C⁻¹ x = 1, not radii equal to eigenvalues.
{
  const A = cases[0][0], X = M.sqrt(A), det = A[0] * A[3] - A[1] * A[2], inverse = [A[3] / det, -A[1] / det, -A[2] / det, A[0] / det];
  for (let k = 0; k < 40; k++) {
    const a = k * 2 * Math.PI / 40, x = X[0] * Math.cos(a) + X[1] * Math.sin(a), y = X[2] * Math.cos(a) + X[3] * Math.sin(a);
    close(x * (inverse[0] * x + inverse[1] * y) + y * (inverse[2] * x + inverse[3] * y), 1);
  }
}

// Exercise the shared renderer and the real DOM handlers without a browser or
// dependencies; every drawn coordinate must be finite, including thin ellipses.
let drawCalls = 0;
function context() {
  const ctx = {};
  for (const method of ["clearRect", "scale", "beginPath", "moveTo", "lineTo", "arc", "rect", "clip", "closePath", "stroke", "fill", "save", "restore", "setLineDash", "fillRect", "strokeRect", "fillText"]) ctx[method] = (...args) => {
    for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), method + " received a nonfinite coordinate"); drawCalls++;
  };
  return ctx;
}
const html = fs.readFileSync(path.join(directory, "index.html"), "utf8"), nodes = {}, events = {}, frames = new Map(); let nextFrame = 0;
function node(id) {
  const handlers = {}, attrs = {};
  return { id, value: "", textContent: "", clientWidth: 360, clientHeight: 330, width: 360, height: 330,
    addEventListener(type, fn) { handlers[type] = fn; }, dispatch(type, event = {}) { if (handlers[type]) handlers[type](event); },
    setAttribute(key, value) { attrs[key] = value; }, getAttribute(key) { return attrs[key]; }, getContext: context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 1040 }) };
}
for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes[match[1]] = node(match[1]);
const window = { BuresCovariances: M, BuresCovariancesView: V, devicePixelRatio: 1, addEventListener(type, fn) { events[type] = fn; } }; window.parent = window;
const sandbox = { window, document: { getElementById: id => { assert.ok(nodes[id], "Missing DOM node " + id); return nodes[id]; }, querySelector: () => node("main") },
  requestAnimationFrame(fn) { const id = ++nextFrame; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
vm.runInNewContext(fs.readFileSync(path.join(directory, "app.js"), "utf8"), sandbox);
let state = window.BuresCovariancesApp.getState();
assert.equal(state.strictlyPositive, true); assert.equal(state.playing, false); assert.equal(state.t, .5);
assert.equal(nodes["preset-noncommuting"].getAttribute("aria-pressed"), "true"); assert.ok(drawCalls > 1000);
assert.match(nodes["bures-plot"].getAttribute("aria-label"), /Arrow keys/);
const bound = state.extent;
nodes["root-plot"].dispatch("keydown", { key: "ArrowLeft", preventDefault() {} }); close(window.BuresCovariancesApp.getState().t, .49);
nodes["bures-plot"].dispatch("keydown", { key: "ArrowUp", shiftKey: true, preventDefault() {} }); close(window.BuresCovariancesApp.getState().t, .59);
nodes["root-plot"].dispatch("keydown", { key: "Home", preventDefault() {} }); assert.equal(window.BuresCovariancesApp.getState().t, 0);
nodes["bures-plot"].dispatch("keydown", { key: "End", preventDefault() {} }); assert.equal(window.BuresCovariancesApp.getState().t, 1);
close(window.BuresCovariancesApp.getState().extent, bound);
nodes["time"].value = ".37"; nodes["time"].dispatch("input"); close(window.BuresCovariancesApp.getState().t, .37); close(window.BuresCovariancesApp.getState().extent, bound);
nodes["preset-commuting"].dispatch("click"); state = window.BuresCovariancesApp.getState();
assert.ok(state.relativeCommutator < 1e-12); close(state.rootDistance, state.buresDistance); matrixClose(state.root, state.bures); assert.match(nodes.status.textContent, /endpoints commute/);
nodes["preset-thin"].dispatch("click"); state = window.BuresCovariancesApp.getState();
assert.equal(state.anisotropy, 25); assert.equal(state.strictlyPositive, true); assert.ok(M.norm(difference(state.root, state.bures)) > 1);
// Rotation affects only B's orientation, never its eigenvalues, size, or A.
const beforeRotation = state;
nodes.rotation.value = "-25"; nodes.rotation.dispatch("input"); state = window.BuresCovariancesApp.getState();
assert.equal(state.rotation, -25); assert.equal(nodes["preset-thin"].getAttribute("aria-pressed"), "false");
matrixClose(state.A, beforeRotation.A); matrixClose(M.eigen(state.B).values, M.eigen(beforeRotation.B).values);
assert.ok(M.norm(difference(state.B, beforeRotation.B)) > 1); assert.equal(state.t, beforeRotation.t);
// Anisotropy affects both radius ratios, independently of angle and area.
const beforeAnisotropy = state;
nodes.anisotropy.value = "3.2"; nodes.anisotropy.dispatch("input"); state = window.BuresCovariancesApp.getState();
assert.equal(state.rotation, -25); assert.equal(state.anisotropy, 3.2); assert.equal(state.t, beforeAnisotropy.t);
for (const key of ["A", "B"]) {
  const E = M.eigen(state[key]); close(E.values[0] / E.values[1], 3.2 ** 2);
  close(M.determinant(state[key]), M.determinant(beforeAnisotropy[key]));
}
close(M.eigen(state.A).angle, 0); close(M.eigen(state.B).angle, -25 * Math.PI / 180);
nodes.anisotropy.value = "NaN"; nodes.anisotropy.dispatch("input"); assert.equal(window.BuresCovariancesApp.getState().anisotropy, 3.2);
nodes.anisotropy.value = "0"; nodes.anisotropy.dispatch("input"); state = window.BuresCovariancesApp.getState();
assert.equal(state.anisotropy, 1); assert.equal(state.bSize, 1.08); assert.equal(state.strictlyPositive, true);
matrixClose(state.A, M.I); matrixClose(state.B, M.scale(M.I, 1.08 ** 2));
assert.equal(nodes["distance-ratio"].textContent, "1.0000");
const circle = state.B;
nodes.rotation.value = "90"; nodes.rotation.dispatch("input"); state = window.BuresCovariancesApp.getState(); matrixClose(state.B, circle);
events.resize(); for (const fn of frames.values()) fn(); frames.clear();
for (const width of [220, 300, 600]) {
  const box = V.layout(width, 330); assert.ok(box.side > 0 && box.side <= width - box.left);
  for (const kind of ["root", "bures"]) V.drawPanel(context(), width, 330, { A: state.A, B: state.B, t: state.t, kind, extent: state.extent });
}
assert.equal(V.color(0), "rgb(37,99,201)"); assert.equal(V.color(1), "rgb(220,75,76)"); assert.equal(V.color(.5), "rgb(129,87,139)");
for (const id of ["time", "rotation", "anisotropy"]) assert.ok(html.includes('for="' + id + '"'), id + " needs a visible label");
assert.equal((html.match(/type="range"/g) || []).length, 3, "Exactly time, rotation and anisotropy sliders");
for (const id of ["a-angle", "a-aspect", "b-angle", "b-aspect", "b-size"]) assert.ok(!nodes[id], "Old per-endpoint control removed: " + id);
assert.match(html, /<input id="time" type="range" min="0" max="1" step="0.01" value="0.5">/, "Time control is unchanged");
assert.equal((html.match(/tabindex="0"/g) || []).length, 2);
const article = fs.readFileSync(path.join(directory, "../../bures-distance-square-root-covariances.html"), "utf8");
assert.match(article, /data-experiment="bures-covariances"/, "Parent and child resize topics must match");
assert.match(article, /noindex,follow/);
assert.equal((article.match(/<details class="blog-proof">/g) || []).length, 8);
for (const id of ["theorem-1", "theorem-2", "theorem-3", "proposition-1", "proposition-2"]) assert.ok(article.includes('id="' + id + '"'));
for (const ref of article.matchAll(/href="#(ref-[^"]+)"/g)) assert.ok(article.includes('id="' + ref[1] + '"'), "Missing reference " + ref[1]);
assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(article), "No escaped-control-character corruption");
assert.match(article, /<h3>From Gaussian transport to FID<\/h3>/);
assert.match(article, /\\operatorname\{FID\}\s*=\s*\\\|m_r-m_g\\\|\^2\+d_\{\\mathrm B\}\(C_r,C_g\)\^2/);
assert.match(article, /id="ref-fid"/);
assert.match(article, /fitted feature Gaussians—not between the original image distributions/);
// Keep the credited historical portrait local, accessible, and portable to
// the later dated post; it is not the experiment's social-summary image.
assert.match(article, /<figure class="portrait-single"><img src="\.\.\/imgs\/donald-bures\.jpg" alt="Portrait of Donald John Charles Bures" width="261" height="334" loading="lazy">/);
assert.match(article, /Photograph credited to the University of British Columbia/);
assert.match(article, /Witte-BAF22\.pdf#page=16/);
const portrait = fs.readFileSync(path.join(directory, "../../../imgs/donald-bures.jpg"));
assert.equal(portrait.subarray(0, 2).toString("hex"), "ffd8");
assert.equal(portrait.subarray(-2).toString("hex"), "ffd9");

// Run the actual parent loader and child app in connected VM contexts. The
// fixtures model message source/origin, load and ResizeObserver, not the sizing
// logic itself; this also guards the article's real data-experiment attribute.
{
  const loader = fs.readFileSync(path.join(directory, "../idea-experiments.js"), "utf8");
  const app = fs.readFileSync(path.join(directory, "app.js"), "utf8");
  const iframeTag = article.match(/<iframe\b[^>]*src="assets\/bures-covariances\/index\.html"[^>]*>/)[0];
  const topic = iframeTag.match(/\bdata-experiment="([^"]+)"/)[1];
  for (const protocol of ["https:", "file:"]) {
    const location = { protocol, origin: protocol === "file:" ? "null" : "https://example.test" };
    const targetOrigin = protocol === "file:" ? "*" : location.origin;
    const parentEvents = {}, childEvents = {}, loadEvents = {}, queue = new Map(), embeddedNodes = {};
    let measuredHeight = 1040, observer, next = 0, heightMessages = 0;
    const main = { getBoundingClientRect: () => ({ height: measuredHeight }) };
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) embeddedNodes[match[1]] = node(match[1]);
    const parent = { addEventListener(type, fn) { parentEvents[type] = fn; } };
    const child = { BuresCovariances: M, BuresCovariancesView: V, devicePixelRatio: 1,
      addEventListener(type, fn) { childEvents[type] = fn; }, parent,
      ResizeObserver: class { constructor(fn) { observer = fn; } observe(target) { assert.equal(target, main); } } };
    const frame = { dataset: { experiment: topic }, style: { height: "1200px" }, contentWindow: child,
      addEventListener(type, fn) { loadEvents[type] = fn; } };
    parent.postMessage = (data, target) => {
      assert.equal(target, targetOrigin); heightMessages++;
      parentEvents.message({ data, source: child, origin: location.origin });
    };
    child.postMessage = (data, target) => {
      assert.equal(target, targetOrigin);
      childEvents.message({ data, source: parent, origin: location.origin });
    };
    vm.runInNewContext(loader, { window: parent, document: { querySelectorAll: selector => {
      assert.equal(selector, "iframe.idea-experiment"); return [frame];
    } }, location });
    vm.runInNewContext(app, { window: child, document: {
      getElementById: id => { assert.ok(embeddedNodes[id], "Missing embedded node " + id); return embeddedNodes[id]; },
      querySelector: selector => { assert.equal(selector, "main"); return main; }
    }, location, requestAnimationFrame(fn) { const id = ++next; queue.set(id, fn); return id; }, cancelAnimationFrame(id) { queue.delete(id); } });
    assert.equal(frame.style.height, "1042px", protocol + " initial child measurement");
    assert.equal(frame.dataset.ready, "true");
    const initialMessages = heightMessages;
    loadEvents.load(); assert.ok(heightMessages > initialMessages, "Parent load requests a fresh measurement");
    assert.equal(frame.style.height, "1042px");
    function flushResize() { const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn()); }
    measuredHeight = 1630; observer(); flushResize();
    assert.equal(frame.style.height, "1632px", "Observed mobile reflow resizes the iframe");
    measuredHeight = 980; childEvents.resize(); flushResize();
    assert.equal(frame.style.height, "982px", "Window resize can shrink an initially taller iframe");
    const correctTopic = frame.dataset.experiment; delete frame.dataset.experiment;
    measuredHeight = 1100; loadEvents.load();
    assert.equal(frame.style.height, "982px", "Missing topic must not silently accept a size message");
    frame.dataset.experiment = correctTopic;
    const message = { type: "ot-experiment-size", topic: correctTopic, height: 1400 };
    parentEvents.message({ data: message, source: {}, origin: location.origin });
    parentEvents.message({ data: message, source: child, origin: "https://unrelated.test" });
    parentEvents.message({ data: { ...message, topic: "another-experiment" }, source: child, origin: location.origin });
    parentEvents.message({ data: { ...message, height: NaN }, source: child, origin: location.origin });
    assert.equal(frame.style.height, "982px", "Unrelated, wrong-origin, wrong-topic and nonfinite messages are ignored");
    loadEvents.load(); assert.equal(frame.style.height, "1102px", "Restoring the matching topic restores measurement");
  }
  for (const [id, key] of [["rotation", "rotation"], ["anisotropy", "anisotropy"]]) {
    const input = html.match(new RegExp('<input\\b[^>]*id="' + id + '"[^>]*>'))[0];
    assert.equal(Number(input.match(/\bvalue="([^"]+)"/)[1]), M.presets.noncommuting[key], "Initial HTML agrees with the live default preset");
  }
}
console.log("Bures covariances: PSD square roots, singular metrics, invariances, sharp distance bounds, commuting equality, both geodesics and barycenters, independent Procrustes/local-speed checks, shared renderer, independent rotation/anisotropy sliders, unchanged time and keyboard controls pass.");
