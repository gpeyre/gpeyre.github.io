"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/perspective-powers");
const M = require(path.join(directory, "core.js")), V = require(path.join(directory, "view.js"));
const close = (x, y, tolerance = 2e-12) => assert.ok(Math.abs(x - y) <= tolerance * Math.max(1, Math.abs(x), Math.abs(y)), `${x} != ${y}`);
for (const p of [1, 1.001, 1.5, 2, 3, 4]) {
  for (const z of [-2.1, -.2, 0, .7, 2]) for (const r of [.001, .2, 1, 2.3]) {
    const v = M.value(z, r, p);
    assert.ok(v >= 0 && Number.isFinite(v)); close(M.value(-z, r, p), v);
    for (const s of [.01, .7, 10]) close(M.value(s * z, s * r, p), s * v);
    close(M.value(z, 1, p), Math.abs(z) ** p / p);
    if (p === 2) close(v, z * z / (2 * r));
  }
  for (const c of M.levels) for (const r of [.0001, .3, 1, 2.4]) close(M.value(M.levelRadius(r, c, p), r, p), c);
  for (let k = 0; k < 100; k++) {
    const z = Math.sin(k * 1.7), w = Math.cos(k * .41), r = .02 + (k % 13) / 9, s = .04 + (k % 17) / 11, t = .37;
    assert.ok(M.value((1 - t) * z + t * w, (1 - t) * r + t * s, p) <= (1 - t) * M.value(z, r, p) + t * M.value(w, s, p) + 2e-11);
  }
  assert.equal(M.value(0, 0, p), 0); assert.equal(M.value(1, -1, p), Infinity);
  assert.equal(M.value(2, 0, p), p === 1 ? 2 : Infinity);
}
for (const p of [0, .9, 4.1, NaN, Infinity]) assert.throws(() => M.value(1, 1, p), RangeError);
assert.throws(() => M.value(NaN, 1, 2), RangeError);
assert.throws(() => M.levelRadius(-1, 1, 2), RangeError);
assert.equal(M.color(0), "rgb(246,250,235)"); assert.equal(M.color(Infinity), M.color(6));
let drawings = 0;
function context() {
  const ctx = {};
  for (const method of ["fillRect", "save", "restore", "beginPath", "rect", "clip", "moveTo", "lineTo", "stroke", "setLineDash", "fillText", "arc", "fill", "strokeRect", "scale"]) ctx[method] = (...args) => {
    args.forEach(x => { if (typeof x === "number") assert.ok(Number.isFinite(x), method + " finite coordinate"); }); drawings++;
  };
  return ctx;
}
for (const width of [220, 360, 800]) for (const p of [1, 2, 4]) V.draw(context(), width, 360, { p, point: { z: .8, r: .6 } });
const html = fs.readFileSync(path.join(directory, "index.html"), "utf8"), nodes = {}, handlers = {}, pending = new Map(); let frame = 0;
for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
  const events = {};
  nodes[match[1]] = { value: "", textContent: "", clientWidth: 360, clientHeight: 360,
    addEventListener(type, fn) { events[type] = fn; }, dispatch(type, event = {}) { events[type]?.(event); },
    setAttribute() {}, getContext: context, getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }) };
}
const window = { PerspectivePowers: M, PerspectivePowersView: V, devicePixelRatio: 1, addEventListener(type, fn) { handlers[type] = fn; } }; window.parent = window;
vm.runInNewContext(fs.readFileSync(path.join(directory, "app.js"), "utf8"), { window, document: { getElementById: id => nodes[id], querySelector: () => ({ getBoundingClientRect: () => ({ height: 850 }) }) },
  requestAnimationFrame(fn) { pending.set(++frame, fn); return frame; }, cancelAnimationFrame(id) { pending.delete(id); } });
let state = window.PerspectivePowersApp.getState(); assert.equal(state.p, 2); close(state.value, .8 ** 2 / 1.2);
nodes["preset-linear"].dispatch("click"); assert.equal(window.PerspectivePowersApp.getState().p, 1); assert.match(nodes.boundary.textContent, /finite recession/);
nodes.power.value = "3.5"; nodes.power.dispatch("input"); for (const fn of pending.values()) fn(); pending.clear(); assert.equal(window.PerspectivePowersApp.getState().p, 3.5);
nodes["perspective-plot"].dispatch("keydown", { key: "ArrowRight", preventDefault() {} }); close(window.PerspectivePowersApp.getState().point.z, .85);
nodes["perspective-plot"].dispatch("keydown", { key: "Home", preventDefault() {} }); close(window.PerspectivePowersApp.getState().point.z, .8);
nodes["perspective-plot"].dispatch("pointermove", { clientX: 100, clientY: 100 }); state = window.PerspectivePowersApp.getState(); assert.ok(state.point.r > 0 && Number.isFinite(state.value));
assert.ok(drawings > 10000); assert.equal(state.playing, false);
assert.match(html, /<label[^>]*for="power"/); assert.equal((html.match(/type="range"/g) || []).length, 1);
console.log("Power perspectives: convexity, one-homogeneity, exact analytic contours, recession boundary, shared renderer, slider/presets and pointer/keyboard probe pass.");
