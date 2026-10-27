"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const directory = path.join(__dirname, "../blog/preparations/assets/deep-resnet");
const G = require(path.join(directory, "landscape-core.js"));
const close = (a, b, eps = 1e-10) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
const samePoint = (a, b, eps) => { close(a.x, b.x, eps); close(a.y, b.y, eps); };
const defaultBounds = G.cameraBounds(G.INITIAL_CAMERA, 875, 600);
const browserCore = {};
vm.runInNewContext(fs.readFileSync(path.join(directory, "landscape-core.js"), "utf8"), browserCore);
assert.equal(browserCore.ResNetLandscape.loss(1, 0, 0), 4);
assert.deepEqual(G.DEPTHS, Array.from({length: 40}, (_, k) => k + 1).concat([50, 75, 100, 200, 500, 1000, Infinity]));
assert.deepEqual(G.LEVELS, [.1, .5, 1, 2, 5, 10, 25]);

// Independent complex exponentiation, rather than the polar formula in core.
const multiply = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
function directLoss(L, x, y) {
  if (L === Infinity) return (Math.exp(x) * Math.cos(y) + 1) ** 2 + (Math.exp(x) * Math.sin(y)) ** 2;
  let result = [1, 0], base = [1 + x / L, y / L], n = L;
  while (n) { if (n % 2) result = multiply(result, base); n = Math.floor(n / 2); if (n) base = multiply(base, base); }
  return (result[0] + 1) ** 2 + result[1] ** 2;
}
for (const L of G.DEPTHS) {
  close(G.loss(L, 0, 0), 4);
  for (const [x, y] of [[-.2, .7], [-1, -2], [.03, .02], [-4, 6], [.2, -1.5]]) close(G.loss(L, x, y), directLoss(L, x, y), 2e-11);
  const points = G.minima(L, L === Infinity ? defaultBounds : undefined);
  if (L !== Infinity) assert.equal(points.length, L);
  assert.equal(new Set(points.map(p => p.x.toFixed(10) + "/" + p.y.toFixed(10))).size, points.length);
  for (const p of points) { assert.ok(G.loss(L, p.x, p.y) < 1e-22); assert.ok(directLoss(L, p.x, p.y) < 1e-21); }
  const s = G.saddle(L);
  if (L === 1 || L === Infinity) assert.equal(s, null);
  else { assert.equal(s.x, -L); assert.equal(s.y, 0); assert.equal(s.loss, 1); assert.equal(G.loss(L, s.x, s.y), 1); assert.equal(s.kind, L === 2 ? "ordinary" : "degenerate"); assert.equal(s.order, L); }
}
for (const [x, y] of [[-.4, 2], [1, -2], [-2, Math.PI]]) {
  const limit = G.loss(Infinity, x, y), a = Math.abs(G.loss(500, x, y) - limit), b = Math.abs(G.loss(1000, x, y) - limit);
  assert.ok(b < .53 * a); close(G.loss(Infinity, x, y + 4 * Math.PI), limit);
}
assert.equal(G.loss(Infinity, 1000, 2), Infinity);
assert.equal(G.loss(Infinity, -1000, 2), 1);
assert.deepEqual(G.minima(Infinity, {xmin: 1, xmax: 2, ymin: -100, ymax: 100}), []);

// Local calculus independently checks the theorem, not just the marker labels.
for (const L of [1, 2, 3, 8, 1000, Infinity]) {
  const p = G.minima(L, defaultBounds)[0], h = 1e-4;
  const value = (dx, dy) => G.loss(L, p.x + dx, p.y + dy);
  close((value(h, 0) - 2 * value(0, 0) + value(-h, 0)) / h ** 2, 2, 2e-6);
  close((value(0, h) - 2 * value(0, 0) + value(0, -h)) / h ** 2, 2, 2e-6);
  close((value(h, h) - value(h, -h) - value(-h, h) + value(-h, -h)) / (4 * h ** 2), 0, 2e-6);
}
for (const L of [2, 3, 4, 5]) {
  const r = 0.65, angle = 0.37, x = -L + r * Math.cos(angle), y = r * Math.sin(angle), h = 1e-4;
  const gx = (directLoss(L, x + h, y) - directLoss(L, x - h, y)) / (2 * h);
  const gy = (directLoss(L, x, y + h) - directLoss(L, x, y - h)) / (2 * h);
  const predicted = 2 * Math.sqrt(directLoss(L, x, y)) * (r / L) ** (L - 1);
  assert.ok(Math.abs(Math.hypot(gx, gy) / predicted - 1) < 2e-7, "saddle gradient order");
}
for (const L of [1, 2, 3, 4, 9, 10]) {
  close(G.loss(L, -2 * L, 0), L % 2 ? 0 : 4);
  if (L % 2 === 0) for (const x of [-4 * L, -1.4 * L, -L, 0, L]) {
    assert.ok(G.loss(L, x, 0) >= 1, "even-depth real restriction has minimum one");
  }
}
// On the real-axis limit flow, u=e^(-x) solves u'=2+2/u.
// Its implicit solution u-log(1+u)=2s+C verifies both asymptotic rates.
for (const u of [1e4, 1e5, 1e6]) {
  const s = (u - Math.log1p(u) - (1 - Math.log(2))) / 2, x = -Math.log(u);
  assert.ok(Math.abs(x + Math.log(2 * s)) < 0.001);
  close(s * (G.loss(Infinity, x, 0) - 1), 1, 0.001);
  close(-(2 + 2 / u) / u, -2 * Math.exp(x) * (Math.exp(x) + 1));
}

// Contour vertices have the requested loss on every root sheet, including the
// critical origin and all depth choices. Verify against an independent power.
for (const L of G.DEPTHS) for (const level of G.LEVELS) {
  const curves = G.contourCurves(L, level, L === Infinity ? defaultBounds : undefined);
  if (L !== Infinity) assert.equal(curves.length, L);
  for (const curve of curves) for (const t of [0, .031, .237, .5, .823, .969, 1]) {
    const p = curve.point(t);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    close(G.loss(L, p.x, p.y), level, 4e-11);
    close(directLoss(L, p.x, p.y), level, 5e-11);
    assert.ok(G.inside(p, curve.bounds, 1e-9));
  }
  if (L !== Infinity) for (const [i, curve] of curves.entries()) {
    if (level <= 1) { assert.ok(curve.closed); samePoint(curve.point(0), curve.point(1)); }
    else { assert.equal(curve.closed, false); samePoint(curve.point(1), curves[(i + 1) % L].point(0)); }
  }
}

// f=1 has exactly 2L saddle rays, uniformly spaced by pi/L. The radial
// parameter resolves points arbitrarily near -L even at L=1000.
for (const L of [2, 3, 10, 40, 1000]) {
  const curves = G.contourCurves(L, 1), rays = [];
  for (const curve of curves) {
    assert.deepEqual(curve.point(0), {x: -L, y: 0}); assert.deepEqual(curve.point(1), {x: -L, y: 0});
    for (const t of [1e-5, 1 - 1e-5]) {
      const p = curve.point(t), angle = Math.atan2(p.y, p.x + L);
      rays.push((angle + 2 * Math.PI) % (2 * Math.PI));
      close(Math.hypot(p.x + L, p.y), L * 2 ** (1 / L) * Math.sin(Math.PI * 1e-5), 2e-10);
    }
  }
  rays.sort((a, b) => a - b);
  for (let i = 0; i < rays.length; i++) close((rays[(i + 1) % rays.length] - rays[i] + 2 * Math.PI) % (2 * Math.PI), Math.PI / L, L === 2 ? 3e-9 : 1e-9);
}
const infiniteCritical = G.contourCurves(Infinity, 1, defaultBounds);
for (const curve of infiniteCritical) {
  assert.equal(curve.closed, false);
  close(curve.point(0).x, defaultBounds.xmin); close(curve.point(1).x, defaultBounds.xmin);
  close(curve.point(.5).x, Math.log(2)); close(curve.point(.5).y, Math.PI + 2 * Math.PI * curve.sheet);
  assert.ok(curve.point(0).y < curve.point(1).y);
}

// Equal scale, pan direction, anchored wheel/pinch zoom, limits, and inversion.
close(defaultBounds.xmin, -25); close(defaultBounds.xmax, 10); close(defaultBounds.ymin, -12); close(defaultBounds.ymax, 12);
for (const [w, h] of [[875, 600], [270, 360], [1600, 710]]) for (const zoom of [1 / 256, 1, 64]) {
  const camera = {cx: -7.5, cy: 3, zoom}, b = G.cameraBounds(camera, w, h);
  close(w / (b.xmax - b.xmin), h / (b.ymax - b.ymin));
  for (const [px, py] of [[0, 0], [w / 2, h / 2], [.77 * w, .19 * h]]) {
    const q = G.toWorld(camera, w, h, px, py), screen = G.toScreen(camera, w, h, q.x, q.y);
    samePoint(screen, {x: px, y: py});
    const changed = G.zoomCamera(camera, w, h, zoom * 1.5, px, py);
    samePoint(G.toWorld(changed, w, h, px, py), q);
  }
  const shifted = G.panCamera(camera, w, h, 30, -20), point = G.toScreen(shifted, w, h, camera.cx, camera.cy);
  close(point.x, w / 2 + 30); close(point.y, h / 2 - 20);
}
assert.equal(G.zoomCamera(G.INITIAL_CAMERA, 875, 600, 1e-10).zoom, 1 / 256);
assert.equal(G.zoomCamera(G.INITIAL_CAMERA, 875, 600, 1e10).zoom, 64);
assert.deepEqual(G.INITIAL_CAMERA, {cx: -7.5, cy: 0, zoom: 1});

// Conservative annular-sector culling must never discard a sampled visible
// sheet, including far-left lobes, tightly zoomed saddles, and mobile views.
for (const L of [1, 3, 40, 1000]) for (const camera of [G.INITIAL_CAMERA, {cx: -L, cy: 0, zoom: 64}, {cx: -2 * L, cy: 2, zoom: 2}, {cx: -7.5, cy: 0, zoom: 1 / 256}]) {
  const b = G.cameraBounds(camera, 875, 600);
  for (const level of G.LEVELS) {
    const visible = new Set(G.contourCurves(L, level, b).map(c => c.sheet));
    for (const curve of G.contourCurves(L, level)) for (let j = 0; j <= 20; j++) if (G.inside(curve.point(j / 20), b)) assert.ok(visible.has(curve.sheet));
  }
}

// Screen-space geometric error is checked between vertices, not just at them.
// In particular, the critical high-L shape cannot be validated by f≈1 alone.
let largestError = 0, totalVertices = 0;
for (const L of [1, 2, 3, 10, 1000, Infinity]) for (const zoom of [1 / 256, 1, 64]) {
  const b = G.cameraBounds({...G.INITIAL_CAMERA, zoom}, 875, 600);
  for (const level of G.LEVELS) for (const curve of G.contourCurves(L, level, b)) {
    const points = G.sampleCurve(curve, b.scale, .35); totalVertices += points.length;
    for (let i = 1; i < points.length; i++) for (const alpha of [.13, .39, .68, .91]) {
      const p = curve.point(points[i - 1].t * (1 - alpha) + points[i].t * alpha);
      const error = G.distanceToSegment(p, points[i - 1], points[i]) * b.scale;
      largestError = Math.max(largestError, error); assert.ok(error < .39, `Contour geometry error ${error}px at L=${L}, level=${level}, zoom=${zoom}`);
    }
  }
}
for (const L of [3, 40, 1000]) for (const cx of [-L, 0]) {
  const b = G.cameraBounds({cx, cy: cx === 0 ? Math.PI : 0, zoom: 64}, 875, 600);
  const curves = G.contourCurves(L, 1, b);
  for (const curve of curves.filter((_, i) => i % Math.max(1, Math.floor(curves.length / 12)) === 0)) {
    const points = G.sampleCurve(curve, b.scale, .35);
    for (let i = 1; i < points.length; i++) for (const alpha of [.17, .38, .61, .86]) {
      const p = curve.point(points[i - 1].t * (1 - alpha) + points[i].t * alpha);
      const error = G.distanceToSegment(p, points[i - 1], points[i]) * b.scale;
      largestError = Math.max(largestError, error); assert.ok(error < .39, `High-zoom critical contour error ${error}px`);
    }
    const clipped = G.sampleCurve(curve, b.scale, .35, b);
    for (let i = 1; i < clipped.length; i++) {
      const start = clipped[i - 1], end = clipped[i], enclosure = curve.boundsBetween(start.t, end.t);
      for (const alpha of [.01, .13, .38, .61, .86, .99]) {
        const q = curve.point(start.t * (1 - alpha) + end.t * alpha);
        assert.ok(G.inside(q, enclosure, 1e-9));
        if (G.inside(q, b)) assert.ok(G.distanceToSegment(q, start, end) * b.scale < .39);
      }
    }
  }
}
const closeSaddleBounds = G.cameraBounds({cx: -1000, cy: 0, zoom: 64}, 875, 600);
const efficientSaddle = G.contours(1000, closeSaddleBounds, closeSaddleBounds.scale, [1]);
assert.equal(efficientSaddle.length, 1000);
assert.ok(efficientSaddle.reduce((n, curve) => n + curve.points.length, 0) < 20000, "Offscreen lobes should not consume high-zoom refinement work.");
for (const bad of [0, -1, 1.5, NaN]) assert.throws(() => G.loss(bad, 0, 0), RangeError);
assert.throws(() => G.contourCurves(2, 0), RangeError);
assert.throws(() => G.contourCurves(Infinity, 1), RangeError);
assert.throws(() => G.minima(Infinity), RangeError);

// Dependency-free DOM harness exercises the actual UI event handlers without
// a browser or network. Rendering receives only finite screen coordinates.
function element(id) {
  return {id, value: "", textContent: "", innerHTML: "", checked: true, hidden: false, attributes: {}, listeners: {}, style: {}, offsetWidth: 210, offsetHeight: 50,
    addEventListener(type, callback) { this.listeners[type] = callback; }, setAttribute(key, value) { this.attributes[key] = value; },
    getBoundingClientRect() { return {left: 0, top: 0, width: 940, height: id === "experiment" ? 1000 : 645}; },
    classList: {add() {}, remove() {}}, focus() {}, setPointerCapture() {}};
}
const html = fs.readFileSync(path.join(directory, "landscape.html"), "utf8"), nodes = {};
for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes[match[1]] = element(match[1]);
nodes.depth.value = "9"; nodes.zoom.value = "0";
const commands = [];
const ctx = new Proxy({}, {get: (_, name) => (...args) => { if (["moveTo", "lineTo", "arc", "strokeRect"].includes(name)) { assert.ok(args.every(Number.isFinite)); commands.push(name); } }, set: () => true});
nodes.landscape.getContext = () => ctx; nodes.landscape.clientWidth = 940; nodes.landscape.clientHeight = 645;
const pending = [], messages = [], win = {ResNetLandscape: G, addEventListener() {}};
const sandbox = {window: win, document: {getElementById: id => nodes[id]}, parent: {postMessage: message => messages.push(message)}, location: {protocol: "file:", origin: "null"}, devicePixelRatio: 1, requestAnimationFrame: callback => {pending.push(callback); return pending.length;}, ResizeObserver: class {observe() {}}};
vm.runInNewContext(fs.readFileSync(path.join(directory, "landscape.js"), "utf8"), sandbox);
const flush = () => { while (pending.length) pending.shift()(); };
const event = (id, type, values = {}) => { nodes[id].listeners[type]({preventDefault() {}, ...values}); flush(); };
const rangeText = () => nodes.metrics.textContent.match(/Re z: .+/)[0];
flush(); assert.ok(commands.length > 0); assert.equal(nodes["depth-value"].textContent, "10");
const initialRange = rangeText();
event("landscape", "wheel", {clientX: 450, clientY: 320, deltaY: -160, deltaMode: 0});
assert.ok(Number(nodes.zoom.value) > 0); assert.notEqual(rangeText(), initialRange);
const zoomRange = rangeText(); nodes.depth.value = "45"; event("depth", "input");
assert.equal(nodes["depth-value"].textContent, "1000"); assert.equal(rangeText(), zoomRange);
event("landscape", "pointerdown", {pointerId: 1, button: 0, clientX: 450, clientY: 320});
event("landscape", "pointermove", {pointerId: 1, clientX: 500, clientY: 350});
event("landscape", "pointerup", {pointerId: 1}); assert.notEqual(rangeText(), zoomRange);
const beforePinch = Number(nodes.zoom.value);
event("landscape", "pointerdown", {pointerId: 3, button: 0, clientX: 350, clientY: 320});
event("landscape", "pointerdown", {pointerId: 4, button: 0, clientX: 550, clientY: 320});
event("landscape", "pointermove", {pointerId: 4, clientX: 650, clientY: 320});
event("landscape", "pointerup", {pointerId: 3}); event("landscape", "pointerup", {pointerId: 4});
assert.ok(Number(nodes.zoom.value) > beforePinch);
const panRange = rangeText(); nodes.depth.value = "46"; event("depth", "input");
assert.equal(nodes["depth-value"].textContent, "∞"); assert.equal(rangeText(), panRange); assert.match(nodes.metrics.textContent, /No finite saddle/);
event("landscape", "pointermove", {pointerId: 2, clientX: 420, clientY: 300});
assert.equal(nodes.tooltip.hidden, false); assert.match(nodes.tooltip.textContent, /Re z.*Im z/); assert.match(nodes.tooltip.textContent, /f∞/);
event("landscape", "keydown", {key: "+"}); assert.notEqual(rangeText(), panRange);
event("reset-view", "click"); assert.equal(rangeText(), initialRange); assert.equal(nodes.zoom.value, 0);
for (const id of ["show-contours", "show-minima", "show-saddle", "show-grid"]) {nodes[id].checked = false; event(id, "change");}
nodes.depth.value = "0"; event("depth", "input"); assert.match(nodes.metrics.textContent, /No finite saddle/);
nodes.depth.value = "1"; event("depth", "input"); assert.match(nodes.metrics.textContent, /Ordinary saddle/);
nodes.depth.value = "2"; event("depth", "input"); assert.match(nodes.metrics.textContent, /Degenerate saddle/);
assert.ok(messages.length > 0); assert.ok(messages.every(m => m.type === "ot-experiment-size" && m.topic === "resnet-landscape" && Number.isFinite(m.height)));
assert.match(html, /aria-describedby="interaction-help metrics"/); assert.match(html, /min="-8" max="6"/); assert.match(html, /max="46"/);
assert.ok(!/https?:\/\//.test(html + fs.readFileSync(path.join(directory, "landscape.js"), "utf8")));
console.log(`ResNet landscape: all depth/level roots, minima and saddle classification; topology and 2L critical rays; conservative visibility; ${totalVertices} adaptive vertices (worst checked error ${largestError.toFixed(3)}px); camera, UI controls, tooltips and iframe sizing pass.`);
