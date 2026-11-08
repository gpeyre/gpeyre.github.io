"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/transport-simplex");
const M = require(path.join(directory, "core.js")), V = require(path.join(directory, "view.js"));
let assertions = 0;
function close(a, b, tolerance = 2e-11) { assertions++; assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`); }
function same(a, b) { assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))); assertions++; }
function finite(values, name) { for (const value of values) if (typeof value === "number") { assert.ok(Number.isFinite(value), `${name} received ${value}`); assertions++; } }
function context() {
  const ctx = { fills: [], gradients: [], marks: 0, currentPath: [] };
  for (const name of ["clearRect", "fillRect", "stroke", "scale", "fillText", "arc"]) ctx[name] = (...values) => { finite(values, name); ctx.marks++; };
  ctx.beginPath = () => { ctx.currentPath = []; };
  ctx.moveTo = ctx.lineTo = (...xy) => { finite(xy, "path"); ctx.currentPath.push(xy); ctx.marks++; };
  ctx.closePath = () => {};
  ctx.fill = () => { ctx.fills.push({ points: ctx.currentPath.map(p => p.slice()), style: ctx.fillStyle }); ctx.marks++; };
  ctx.createLinearGradient = (...axis) => {
    finite(axis, "gradient");
    const result = { axis, stops: [], addColorStop(t, color) { close(t, Math.max(0, Math.min(1, t))); assert.match(color, /^#[a-f0-9]{6}$/i); this.stops.push([t, color]); } };
    ctx.gradients.push(result); return result;
  };
  return ctx;
}

const shapes = [M.defaults.vertices, [[.45, .4], [2.75, .4], [1.6, .4 + 2.3 * Math.sqrt(3) / 2]], [[.35, .6], [2.85, .6], [1.15, 1.02]]];
const targets = [M.defaults.b, [.1, .2, .7], [0, .6, .4], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1e-9, .3, .7 - 1e-9]];
for (const width of [280, 375, 800, 1200]) {
  const height = width * 7 / 8, box = V.layout(width, height);
  assert.ok(box.scale > 0);
  for (const xy of [[0, 0], [3.2, 2.6], [1.2, 1.7]]) box.toWorld(box.toScreen(xy)).forEach((v, i) => close(v, xy[i]));
  const xstep = box.toScreen([1, 0])[0] - box.toScreen([0, 0])[0], ystep = box.toScreen([0, 0])[1] - box.toScreen([0, 1])[1]; close(xstep, ystep);
  for (const vertices of shapes) for (const b of targets) {
    const ctx = context(), draw = V.draw(ctx, width, height, { vertices, b, probe: [.2, .3, .5] });
    close(draw.maxCost, Math.max(...vertices.map((_, i) => M.cost([0, 1, 2].map(j => +(i === j)), b, vertices))));
    assert.ok(ctx.marks > 100); assert.equal(draw.levels.length, 9);
    const polygons = ctx.fills.filter(fill => fill.style && fill.style.axis);
    assert.equal(polygons.length, M.signCells(b).length);
    // Each sign-cell fill must encode the exact affine scalar field: projecting
    // a point on its gradient axis yields W1/maxCost, not a triangulation surrogate.
    for (const fill of polygons) {
      assert.ok(fill.points.length >= 3); assert.equal(fill.style.stops.length, V.palette.length);
      const [x0, y0, x1, y1] = fill.style.axis, dx = x1 - x0, dy = y1 - y0;
      const centroid = [0, 1].map(k => fill.points.reduce((s, p) => s + p[k], 0) / fill.points.length);
      for (const pixel of [...fill.points, centroid]) {
        const fraction = ((pixel[0] - x0) * dx + (pixel[1] - y0) * dy) / (dx * dx + dy * dy);
        const a = M.barycentric(box.toWorld(pixel), vertices);
        close(fraction, M.cost(a, b, vertices) / draw.maxCost, 1e-9);
      }
    }
  }
}

const html = fs.readFileSync(path.join(directory, "index.html"), "utf8"), css = fs.readFileSync(path.join(directory, "style.css"), "utf8");
const nodes = {}, windowEvents = {}, frames = new Map(), messages = []; let frameId = 0;
function node(id) {
  const handlers = {}, attributes = {};
  return { id, style: {}, textContent: "", clientWidth: 800, clientHeight: 700, context: context(), focused: false,
    getContext() { return this.context; }, setAttribute(k, v) { attributes[k] = v; }, getAttribute(k) { return attributes[k]; },
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); }, dispatch(type, event = {}) { for (const fn of handlers[type] || []) fn({ preventDefault() {}, ...event }); },
    getBoundingClientRect() { return { left: 17, top: 31, width: this.clientWidth, height: this.clientHeight }; },
    focus() { this.focused = true; }, setPointerCapture(pointer) { this.captured = pointer; }
  };
}
for (const hit of html.matchAll(/id="([^"]+)"/g)) nodes[hit[1]] = node(hit[1]);
const main = node("main"); main.clientHeight = 1060;
const parent = { postMessage(message, origin) { messages.push({ message, origin }); } };
const window = { TransportSimplex: M, TransportSimplexView: V, devicePixelRatio: 3, parent,
  addEventListener(type, fn) { windowEvents[type] = fn; }, ResizeObserver: class { constructor(fn) { this.fn = fn; } observe(target) { assert.equal(target, main); this.fn(); } } };
const sandbox = { window, ResizeObserver: window.ResizeObserver, document: { getElementById: id => nodes[id], querySelector: selector => { assert.equal(selector, "main"); return main; } },
  location: { protocol: "http:", origin: "http://127.0.0.1:4240" }, requestAnimationFrame(fn) { const id = ++frameId; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
vm.runInNewContext(fs.readFileSync(path.join(directory, "app.js"), "utf8"), sandbox);
function flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); }
function state() { return window.TransportSimplexApp.getState(); }
function eventAt(xy, extra = {}) { const box = V.layout(nodes.simplex.clientWidth, nodes.simplex.clientHeight), pixel = box.toScreen(xy), r = nodes.simplex.getBoundingClientRect(); return { clientX: pixel[0] + r.left, clientY: pixel[1] + r.top, ...extra }; }
function press(id, key, extra = {}) { nodes[id].dispatch("keydown", { key, ...extra }); flush(); }
function drag(id, from, to, pointerId = 1) { nodes[id].dispatch("pointerdown", eventAt(from, { pointerId, button: 0 })); nodes[id].dispatch("pointermove", eventAt(to, { pointerId })); nodes[id].dispatch("pointerup", { pointerId }); flush(); }
flush(); same(state().b, M.defaults.b); same(state().vertices, M.defaults.vertices);
assert.equal(nodes.simplex.width, 1600); assert.equal(nodes.simplex.height, 1400); // DPR cap.
for (const id of ["vertex-0", "vertex-1", "vertex-2", "target"]) { assert.match(nodes[id].getAttribute("aria-label"), /arrow keys/); assert.ok(Number.isFinite(parseFloat(nodes[id].style.left))); }
assert.match(html, /class="handle/); assert.match(css, /touch-action:none/); assert.match(css, /focus-visible/); assert.match(html, /aria-live="polite"/);

// Target clicks, interior and exterior hover, direct drag, and exact centering.
const chosen = [.15, .55, .3]; nodes.simplex.dispatch("click", eventAt(M.point(chosen, state().vertices))); flush(); state().b.forEach((v, i) => close(v, chosen[i]));
const outsideBefore = state().b; nodes.simplex.dispatch("click", eventAt([.01, 2.59])); flush(); same(state().b, outsideBefore);
nodes.simplex.dispatch("pointermove", eventAt(M.point([.2, .2, .6], state().vertices))); flush(); assert.match(nodes.probe.textContent, /W₁\(α, β\)/); close(state().probe[2], .6);
nodes.simplex.dispatch("pointerleave"); flush(); assert.equal(state().probe, null);
drag("target", M.point(state().b, state().vertices), M.point([.4, .2, .4], state().vertices)); state().b.forEach((v, i) => close(v, [.4, .2, .4][i]));
drag("target", M.point(state().b, state().vertices), [-2, -2]); assert.ok(state().b.every(v => v >= 0)); close(state().b.reduce((s, v) => s + v, 0), 1);
nodes.center.dispatch("click"); flush(); same(state().b, M.defaults.b);

// Moving a support changes costs but preserves target weights, not its drawn position.
const before = state(), beforeTarget = M.point(before.b, before.vertices), moved = [.6, .48];
drag("vertex-0", before.vertices[0], moved); same(state().b, before.b); state().vertices[0].forEach((v, i) => close(v, moved[i]));
assert.ok(Math.hypot(...M.point(state().b, state().vertices).map((v, i) => v - beforeTarget[i])) > .01);
assert.notEqual(M.cost([1, 0, 0], before.b, before.vertices), M.cost([1, 0, 0], state().b, state().vertices));
const valid = state().vertices; drag("vertex-0", valid[0], valid[1]); same(state().vertices, valid); assert.match(nodes.status.textContent, /non-flat/);
drag("vertex-0", valid[0], [-3, .4]); same(state().vertices, valid);
const previous = state().vertices[0].slice(); nodes["vertex-0"].dispatch("pointerdown", eventAt(previous, { pointerId: 2, button: 0 })); nodes["vertex-0"].dispatch("pointercancel", { pointerId: 2 }); nodes["vertex-0"].dispatch("pointermove", eventAt([.7, .5], { pointerId: 2 })); flush(); same(state().vertices[0], previous);

press("vertex-0", "ArrowRight"); close(state().vertices[0][0], previous[0] + .035); same(state().b, M.defaults.b);
press("vertex-0", "Home"); same(state().vertices[0], M.defaults.vertices[0]);
const targetBefore = M.point(state().b, state().vertices); press("target", "ArrowUp", { shiftKey: true }); close(M.point(state().b, state().vertices)[1], targetBefore[1] + .12);
press("target", "Home"); same(state().b, M.defaults.b);
nodes.equilateral.dispatch("click"); flush(); const d = M.geometry(state().vertices).distances; close(d[0][1], d[0][2]); close(d[0][1], d[1][2]);
nodes.thin.dispatch("click"); flush(); close(state().vertices[2][1], 1.02); assert.ok(M.signedDoubleArea(state().vertices) > .15);
nodes.reset.dispatch("click"); flush(); same(state().vertices, M.defaults.vertices); same(state().b, M.defaults.b);
const exported = state(); exported.b[0] = 999; exported.vertices[0][0] = 999; same(state().b, M.defaults.b); same(state().vertices, M.defaults.vertices);

// Mobile resize, finite handle positions, and iframe-height message filtering.
nodes.simplex.clientWidth = 320; nodes.simplex.clientHeight = 280; windowEvents.resize(); flush(); assert.equal(nodes.simplex.width, 640);
for (const id of ["vertex-0", "vertex-1", "vertex-2", "target"]) { assert.ok(parseFloat(nodes[id].style.left) > 0 && parseFloat(nodes[id].style.left) < 320); assert.ok(parseFloat(nodes[id].style.top) > 0 && parseFloat(nodes[id].style.top) < 280); }
assert.ok(messages.length > 0); for (const { message, origin } of messages) { assert.equal(message.type, "ot-experiment-size"); assert.equal(message.topic, "transport-simplex"); assert.equal(message.height, 1062); assert.equal(origin, sandbox.location.origin); }
let count = messages.length; windowEvents.message({ source: parent, origin: "https://unrelated.example", data: { type: "ot-experiment-measure" } }); assert.equal(messages.length, count);
windowEvents.message({ source: {}, origin: sandbox.location.origin, data: { type: "ot-experiment-measure" } }); assert.equal(messages.length, count);
windowEvents.message({ source: parent, origin: sandbox.location.origin, data: { type: "ot-experiment-measure" } }); assert.equal(messages.length, count + 1);
console.log(`Transport simplex UI: ${assertions} finite-coordinate/affine-gradient checks; exact fills, boundary targets, presets, mouse/keyboard drags, geometry guards, preserved weights, mobile layout and safe frame sizing pass.`);
