"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const F = require("../blog/preparations/assets/deep-resnet/flow-core.js");
const assets = path.join(__dirname, "../blog/preparations/assets/deep-resnet");
let checks = 0;
function test(name, run) { run(); checks++; console.log("✓ " + name); }
function close(a, b, tol = 1e-11) { assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tolerance ${tol})`); }
function arrayClose(a, b, tol = 1e-11) { assert.equal(a.length, b.length); a.forEach((x, i) => close(x, b[i], tol)); }
function taylorExponential(a) {
  let sum = F.I.slice(), term = F.I.slice();
  for (let k = 1; k < 100; k++) { term = F.scale(F.multiply(term, a), 1 / k); sum = F.add(sum, term); }
  return sum;
}
test("matrix exponential covers identity, isotropic decay, rotation, Jordan shear, and strain", () => {
  arrayClose(F.expm2([0, 0, 0, 0]), F.I);
  arrayClose(F.expm2([-2, 0, 0, -2]), [Math.exp(-2), 0, 0, Math.exp(-2)]);
  arrayClose(F.expm2(F.scale(F.J, 1.7)), F.rotation(1.7));
  arrayClose(F.expm2([0, 2.3, 0, 0]), [1, 2.3, 0, 1]);
  arrayClose(F.expm2([0.6, 2.3, 0, 0.6]), F.scale([1, 2.3, 0, 1], Math.exp(0.6)));
  arrayClose(F.expm2([1.2, 0, 0, -1.2]), [Math.exp(1.2), 0, 0, Math.exp(-1.2)]);
});
test("closed-form matrix exponential matches an independent Taylor series", () => {
  for (let i = 0; i < 90; i++) {
    const a = Array.from({length: 4}, (_, j) => 2 * Math.sin(i * 1.17 + j * 0.83));
    arrayClose(F.expm2(a), taylorExponential(a), 2e-13);
    arrayClose(F.multiply(F.expm2(a), F.expm2(F.scale(a, -1))), F.I, 2e-12);
    close(F.determinant(F.expm2(a)), Math.exp(a[0] + a[3]), 3e-12);
  }
  for (const epsilon of [0, 1e-14, -1e-14, 1e-8, -1e-8]) arrayClose(F.expm2([0, 1, epsilon, 0]), taylorExponential([0, 1, epsilon, 0]), 3e-15);
});
test("constant solutions obey the semigroup law and preserve stationary null vectors", () => {
  const p = {mode: "constant", alpha: -0.3, omega: 1.1, shear: 0.8};
  arrayClose(F.multiply(F.fundamental(1.3, p), F.fundamental(0.7, p)), F.fundamental(2, p), 1e-14);
  arrayClose(F.apply(F.fundamental(2, {mode: "constant", alpha: 0, omega: 0, shear: 1.5}), [3, 0]), [3, 0]);
  for (const mode of ["constant", "strain", "shears"]) {
    arrayClose(F.fundamental(0, {mode}), F.I);
    arrayClose(F.apply(F.fundamental(1.7, {mode}), [0, 0]), [0, 0]);
  }
});
test("smooth rotating-frame solution has derivative A(t)Φ(t), including zero turning rate", () => {
  const h = 1e-6;
  for (const speed of [0, 1e-9, 1.25, 2.5]) for (const t of [0.3, 0.8, 1.8]) {
    const p = {mode: "strain", alpha: 0.23, omega: -1.2, strain: 0.9, speed};
    const derivative = F.scale(F.add(F.exactFundamental(t + h, p), F.scale(F.exactFundamental(t - h, p), -1)), 1 / (2 * h));
    arrayClose(derivative, F.multiply(F.matrixAt(t, p), F.exactFundamental(t, p)), 4e-9);
  }
});
test("RK4 converges at fourth order against the independently exact rotating-frame formula", () => {
  const p = {mode: "strain", alpha: 0.2, omega: -0.7, strain: 1.2, speed: 2.2}, t = 2;
  const exact = F.exactFundamental(t, p);
  const errors = [1 / 20, 1 / 40, 1 / 80].map(h => F.distance(F.fundamental(t, p, h), exact));
  assert.ok(errors[0] / errors[1] > 14 && errors[0] / errors[1] < 18, errors.join(","));
  assert.ok(errors[1] / errors[2] > 14 && errors[1] / errors[2] < 18, errors.join(","));
  assert.ok(F.distance(F.fundamental(t, p), exact) < 2e-8);
  const result = F.integrate(s => F.matrixAt(s, p), 0.731, 1 / 120);
  assert.ok(result.step <= 1 / 120); close(result.steps * result.step, 0.731);
});
test("Liouville determinant holds in every schedule across the full control range", () => {
  for (const mode of ["constant", "strain", "shears"]) for (const alpha of [-0.45, 0, 0.45]) for (const t of [0, 0.4, 1, 1.3, 2]) {
    const p = {mode, alpha, omega: -2, strain: 1.2, speed: 2.5, shear: 1.5};
    const d = F.diagnostics(t, p);
    close(d.determinant, Math.exp(2 * alpha * t), mode === "strain" ? 8e-8 : 3e-13);
    assert.ok(d.determinant > 0);
    assert.ok(d.exactError < 1e-7);
  }
  for (const alpha of [-0.45, 0, 0.45]) for (const omega of [-2, 0, 2]) for (const strain of [0, 0.6, 1.2]) for (const speed of [0, 1.25, 2.5]) {
    const d = F.diagnostics(2, {mode: "strain", alpha, omega, strain, speed});
    assert.ok(d.determinantError < 8e-8);
    assert.ok(d.exactError < 1e-6);
  }
});
test("two shears compose in chronological order, with an exact switch and common integral", () => {
  const p = {mode: "shears", shear: 1, alpha: 0, horizon: 2}, reversed = {...p, reverse: true};
  arrayClose(F.fundamental(0.5, p), [1, 0.5, 0, 1]);
  arrayClose(F.fundamental(1, p), [1, 1, 0, 1]);
  arrayClose(F.fundamental(2, p), [1, 1, 1, 2]);
  arrayClose(F.fundamental(2, reversed), [2, 1, 1, 1]);
  arrayClose(F.integralMatrix(2, p), F.integralMatrix(2, reversed));
  arrayClose(F.expm2(F.integralMatrix(2, p)), [Math.cosh(1), Math.sinh(1), Math.sinh(1), Math.cosh(1)]);
  arrayClose(F.commutator(F.H, F.V), [1, 0, 0, -1]);
  assert.ok(F.diagnostics(2, p).relativeNaiveGap > 0.25);
  assert.ok(F.distance(F.fundamental(1 - 1e-9, p), F.fundamental(1 + 1e-9, p)) < 4e-9);
  arrayClose(F.fundamental(2, {...p, alpha: 0.4}), F.scale([1, 1, 1, 2], Math.exp(0.8)));
});
test("integrated generators differentiate correctly and commuting limits recover exp(integral)", () => {
  for (const speed of [0, 1e-12, 0.6, 2.5]) {
    const p = {mode: "strain", alpha: -0.2, omega: 1.4, strain: 0.7, speed}, t = 0.9, h = 1e-6;
    const derivative = F.scale(F.add(F.integralMatrix(t + h, p), F.scale(F.integralMatrix(t - h, p), -1)), 1 / (2 * h));
    arrayClose(derivative, F.matrixAt(t, p), 3e-10);
  }
  for (const p of [{mode: "constant"}, {mode: "strain", speed: 0}, {mode: "strain", strain: 0}]) {
    assert.ok(F.distance(F.exactFundamental(1.8, p), F.expm2(F.integralMatrix(1.8, p))) < 2e-14);
  }
  const p = {...F.defaults};
  assert.ok(F.norm(F.commutator(F.matrixAt(0, p), F.matrixAt(0.7, p))) > 0.1);
  assert.ok(F.diagnostics(2, p).relativeNaiveGap > 0.1);
});
test("trajectory samples match direct endpoint solves and circles have predicted area", () => {
  for (const mode of ["constant", "strain", "shears"]) {
    const p = {mode}, history = F.history(p, 240);
    assert.equal(history.length, 241); close(history.at(-1).time, 2);
    arrayClose(history.at(-1).matrix, F.fundamental(2, p), 2e-13);
    const m = F.fundamental(1.3, p), points = Array.from({length: 4000}, (_, i) => F.apply(m, [Math.cos(i * Math.PI / 2000), Math.sin(i * Math.PI / 2000)]));
    let area = 0;
    points.forEach((x, i) => { const y = points[(i + 1) % points.length]; area += (x[0] * y[1] - x[1] * y[0]) / 2; });
    close(area / Math.PI, F.determinant(m), 1e-6);
  }
  assert.equal(F.seedPoints("circle").length, 20);
  F.seedPoints("circle").forEach(p => close(Math.hypot(...p), 1));
  assert.equal(F.seedPoints("grid").length, 25);
});
test("invalid inputs fail explicitly instead of creating an unbounded integration", () => {
  assert.throws(() => F.expm2([Infinity, 0, 0, 1]), /finite/);
  assert.throws(() => F.integrate(() => F.I, 1, 0), /positive/);
  assert.throws(() => F.fundamental(-1, {}), /nonnegative/);
  assert.throws(() => F.parameters({mode: "unknown"}), /mode/);
  assert.throws(() => F.parameters({horizon: 0}), /positive/);
  assert.throws(() => F.parameters({alpha: NaN}), /finite/);
  assert.throws(() => F.history({}, 0.5), /positive integer/);
  assert.throws(() => F.history({}, 0), /positive integer/);
  assert.throws(() => F.fundamental(1, {mode: "strain"}, 0), /positive/);
});

function mountApp() {
  const elements = {}, documentEvents = {}, windowEvents = {}, frames = new Map(), messages = [], observations = [];
  let nextFrame = 1;
  function element(id) {
    if (!elements[id]) elements[id] = {id, value: "", checked: false, hidden: false, textContent: "", children: [], attrs: {}, events: {}, dataset: {},
      appendChild(child) { this.children.push(child); },
      setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(name, callback) { this.events[name] = callback; },
      getBoundingClientRect() { return {width: 500, height: id === "flow-lab" ? 1260 : 500}; },
      dispatch(name) { this.events[name].call(this, {target: this}); }
    };
    return elements[id];
  }
  for (const [id, value] of Object.entries({"flow-mode": "strain", "flow-seeds": "circle", "flow-alpha": "0", "flow-omega": "0.35", "flow-shear": "1", "flow-strain": "0.75", "flow-speed": "1.25", "flow-time": "1.2"})) element(id).value = value;
  element("flow-naive").checked = true;
  const ctx = new Proxy({}, {get(target, property) { return property in target ? target[property] : () => {}; }});
  element("flow-canvas").getContext = () => ctx;
  const modeLabels = ["constant strain", "constant shears", "strain", "shears"].map(modes => ({dataset: {modes}, hidden: false}));
  const document = {getElementById: element, createElement: () => ({textContent: ""}), querySelectorAll: () => modeLabels,
    addEventListener: (name, callback) => { documentEvents[name] = callback; }, hidden: false};
  const parent = {postMessage: message => messages.push(message)};
  const window = {ResnetFlow: F, parent, devicePixelRatio: 1, addEventListener: (name, callback) => { windowEvents[name] = callback; }};
  const requestAnimationFrame = callback => { const id = nextFrame++; frames.set(id, callback); return id; };
  const sandbox = {window, document, location: {protocol: "https:", origin: "https://example.test"}, requestAnimationFrame,
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
    IntersectionObserver: class { constructor(callback) { observations.push(callback); } observe() {} }};
  vm.runInNewContext(fs.readFileSync(path.join(assets, "flow.js"), "utf8"), sandbox);
  return {element, document, documentEvents, windowEvents, frames, messages, observations, parent,
    tick(stamp) { const current = [...frames.values()]; frames.clear(); current.forEach(callback => callback(stamp)); }};
}
test("UI starts paused, reacts to every schedule, and sends the iframe height protocol", () => {
  const app = mountApp();
  assert.equal(app.frames.size, 0);
  assert.ok(app.messages.some(message => message.type === "ot-experiment-size" && message.topic === "resnet-flow" && message.height === 1260));
  assert.equal(app.element("flow-matrix-phi").children.length, 4);
  app.element("flow-mode").value = "shears"; app.element("flow-mode").dispatch("change");
  app.element("flow-time").value = "2"; app.element("flow-time").dispatch("input");
  const phi = app.element("flow-matrix-phi").children.map(n => n.textContent);
  assert.deepEqual(phi, ["1.000", "1.000", "1.000", "2.000"]);
  app.element("flow-reverse").checked = true; app.element("flow-reverse").dispatch("change");
  assert.deepEqual(app.element("flow-matrix-phi").children.map(n => n.textContent), ["2.000", "1.000", "1.000", "1.000"]);
  app.element("flow-mode").value = "constant"; app.element("flow-mode").dispatch("change");
  assert.equal(app.element("flow-gap").textContent, "0.00%");
  app.element("flow-naive").checked = false; app.element("flow-naive").dispatch("change");
  assert.equal(app.element("flow-naive-key").hidden, true);
});
test("playback progresses, resets, completes, and stops on hidden or offscreen documents", () => {
  const app = mountApp();
  app.element("flow-play").dispatch("click");
  assert.equal(app.element("flow-play").attrs["aria-pressed"], "true");
  app.tick(0); app.tick(60);
  assert.ok(+app.element("flow-time").value > 1.2);
  app.document.hidden = true; app.documentEvents.visibilitychange();
  assert.equal(app.frames.size, 0); assert.equal(app.element("flow-play").attrs["aria-pressed"], "false");
  app.document.hidden = false; app.element("flow-play").dispatch("click");
  app.observations[0]([{isIntersecting: false}]); assert.equal(app.frames.size, 0);
  app.element("flow-reset").dispatch("click"); close(+app.element("flow-time").value, 0);
  app.element("flow-time").value = "1.999"; app.element("flow-time").dispatch("input");
  app.element("flow-play").dispatch("click"); app.tick(0); app.tick(80);
  close(+app.element("flow-time").value, 2); assert.equal(app.frames.size, 0);
  assert.equal(app.element("flow-status").textContent, "Complete");
  app.element("flow-play").dispatch("click"); app.tick(100); close(+app.element("flow-time").value, 0);
  app.windowEvents.pagehide(); assert.equal(app.frames.size, 0);
});
test("experiment stays local, labels its controls, and explains numerical versus exact maps", () => {
  const html = fs.readFileSync(path.join(assets, "flow.html"), "utf8");
  assert.ok(!/https?:\/\//.test(html));
  for (const id of [...html.matchAll(/<input id="([^"]+)"[^>]*type="range"/g)].map(m => m[1])) assert.ok(html.includes(`for="${id}"`), id);
  assert.ok(html.includes('role="img"')); assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes("not a rigorous error bound")); assert.ok(html.includes("not in general"));
  assert.ok(fs.readFileSync(path.join(assets, "flow.css"), "utf8").includes("@media(max-width:560px)"));
});
console.log(`${checks} linear-flow checks passed.`);
