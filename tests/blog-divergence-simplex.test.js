"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/divergence-simplex"), M = require(path.join(directory, "core.js")), V = require(path.join(directory, "view.js"));
function close(a, b, tolerance = 2e-12) { assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`); }
for (const r of [1e-10, .01, .2, .9, 1, 1.00000001, 1.2, 3, 1e4]) {
  close(M.phi(r, 0), -Math.log(r) + r - 1);
  close(M.phi(r, 1), r * Math.log(r) - r + 1);
  close(M.phi(r, .5), 2 * (Math.sqrt(r) - 1) ** 2);
  close(M.phi(r, 2), (r - 1) ** 2 / 2);
  for (const lambda of [0, .2, .5, 1, 1.7, 2]) {
    assert.ok(M.phi(r, lambda) >= 0); close(M.phi(1, lambda), 0);
    close(M.phi(r, lambda), M.phi(r, Math.max(0, Math.min(2, lambda + 1e-11))), 2e-9);
  }
}
assert.equal(M.phi(0, 0), Infinity); for (const lambda of [.02, .5, 1, 2]) close(M.phi(0, lambda), 1 / lambda);
for (const [q, p] of [[[.2, .3, .5], [.16, .58, .26]], [[1, 0, 0], [.5, .2, .3]], [[.05, .9, .05], [.5, .25, .25]]]) {
  close(M.divergence(q, p, 1), q.reduce((s, v, i) => s + (v ? v * Math.log(v / p[i]) : 0), 0));
  close(M.divergence(q, p, .5), 2 * q.reduce((s, v, i) => s + (Math.sqrt(v) - Math.sqrt(p[i])) ** 2, 0));
  close(M.divergence(q, p, 2), .5 * q.reduce((s, v, i) => s + (v - p[i]) ** 2 / p[i], 0));
  for (const lambda of [0, .5, 1, 2]) close(M.divergence(p, p, lambda), 0);
}
for (const q of [[1, 0, 0], [-1, 2, 0], [.1, .2, .7], [.9, .9, -.8]]) {
  const p = M.projectTarget(q); close(p.reduce((s, v) => s + v, 0), 1); assert.ok(p.every(v => v >= M.floor - 1e-14));
  close(M.projectTarget(p)[0], p[0]); close(M.projectTarget(p)[1], p[1]);
}
for (const invalid of [-.1, NaN]) assert.throws(() => M.phi(invalid, 1), RangeError);
assert.throws(() => M.divergence([1, 1, 1], [.3, .3, .4], 1), RangeError);
assert.throws(() => M.divergence([1, 0, 0], [0, .5, .5], 1), RangeError);
for (const w of [250, 375, 840]) { const b = V.layout(w, w / 1.09); for (const q of [[1, 0, 0], [0, 1, 0], [0, 0, 1], M.defaultTarget]) { const x = V.point(q, b), back = V.probabilities(...x, b); back.forEach((v, i) => close(v, q[i])); } assert.ok(b.bottom + 86 < w / 1.09); }
let draws = 0;
function context() {
  const ctx = { createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; } };
  for (const name of ["clearRect", "fillRect", "putImageData", "drawImage", "scale", "beginPath", "moveTo", "lineTo", "closePath", "stroke", "arc", "fill", "fillText"]) ctx[name] = (...args) => { for (const v of args) if (typeof v === "number") assert.ok(Number.isFinite(v), name); draws++; };
  return ctx;
}
const nodes = {}, html = fs.readFileSync(path.join(directory, "index.html"), "utf8"), events = {}, queue = new Map(); let next = 0;
function node(id) { const handlers = {}, attributes = {}; return { id, value: "", max: "", clientWidth: 340, clientHeight: 312,
  getContext: context, setAttribute(k, v) { attributes[k] = v; }, getAttribute(k) { return attributes[k]; }, addEventListener(t, fn) { handlers[t] = fn; }, dispatch(t, e = {}) { handlers[t]?.(e); },
  getBoundingClientRect() { return { left: 0, top: 0, width: 340, height: 312 }; }, focus() {}, setPointerCapture() {} }; }
for (const hit of html.matchAll(/id="([^"]+)"/g)) nodes[hit[1]] = node(hit[1]);
const window = { DivergenceSimplex: M, DivergenceSimplexView: V, devicePixelRatio: 1, addEventListener(t, fn) { events[t] = fn; } }; window.parent = window;
const sandbox = { window, document: { getElementById: id => nodes[id], createElement: () => node("temporary"), querySelector: () => node("main") }, requestAnimationFrame(fn) { const id = ++next; queue.set(id, fn); return id; }, cancelAnimationFrame(id) { queue.delete(id); } };
vm.runInNewContext(fs.readFileSync(path.join(directory, "app.js"), "utf8"), sandbox);
function flush() { const tasks = [...queue.values()]; queue.clear(); tasks.forEach(fn => fn()); }
flush(); assert.ok(draws > 500); close(window.DivergenceSimplexApp.getState().lambda, 1);
nodes["preset-hellinger"].dispatch("click"); flush(); close(window.DivergenceSimplexApp.getState().lambda, .5);
nodes["power"].value = "2"; nodes["power"].dispatch("input"); flush(); close(window.DivergenceSimplexApp.getState().lambda, 2);
nodes["target-first"].value = ".9"; nodes["target-first"].dispatch("input"); flush(); let state = window.DivergenceSimplexApp.getState(); close(state.p[0], .9); close(state.p[2], .04);
nodes.simplex.dispatch("keydown", { key: "Home", preventDefault() {} }); flush(); state = window.DivergenceSimplexApp.getState(); state.p.forEach((v, i) => close(v, M.defaultTarget[i]));
nodes.simplex.dispatch("keydown", { key: "ArrowRight", preventDefault() {} }); flush(); close(window.DivergenceSimplexApp.getState().p[0], M.defaultTarget[0] + .01);
const b = V.layout(340, 312), hit = V.point([.2, .3, .5], b); nodes.simplex.dispatch("pointerdown", { clientX: hit[0], clientY: hit[1], pointerId: 1 }); flush(); state = window.DivergenceSimplexApp.getState(); state.p.forEach((v, i) => close(v, [.2, .3, .5][i]));
assert.match(nodes.simplex.getAttribute("aria-label"), /arrow keys/); assert.match(html, /infinite boundary values/);
console.log("Power-divergence simplex: normalized generators, KL/Pearson/Hellinger identities, boundary extensions, target projection, actual heatmap renderer and accessible controls pass.");
