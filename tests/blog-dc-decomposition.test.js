"use strict";
const assert = require("node:assert/strict");
const core = require("../blog/preparations/assets/dc-decomposition/core.js");
function close(a, b, tolerance = 3e-11) { assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`); }
let checked = 0;
for (const amplitude of [0, 0.05, 1 / Math.PI ** 2, 0.15, 0.35, 1]) {
  for (const phase of [-Math.PI, -2.3, -0.03, 0, 0.73, Math.PI]) {
    const base = core.build({ amplitude, phase, lambda: 0 });
    assert.ok(base.minimalCurvature >= 0);
    for (const root of base.roots) { assert.ok(root > core.LEFT && root < core.RIGHT); close(core.curvature(root, base.parameters), 0); }
    for (let i = 1; i < base.roots.length; i++) assert.ok(base.roots[i] > base.roots[i - 1]);
    for (let x = -1.83; x < 1.9; x += 0.27317) {
      const h = 1e-5, left = base.evaluate(x - h), right = base.evaluate(x + h), center = base.evaluate(x);
      close((right.F - left.F) / (2 * h), center.dF, 2e-8);
      close((right.G - left.G) / (2 * h), center.dG, 2e-8);
    }
    for (const lambda of [0, 0.3, 3]) {
      const model = core.build({ amplitude, phase, lambda });
      const start = model.evaluate(core.LEFT);
      close(start.F, start.phi); close(start.dF, start.dphi); close(start.G, 0); close(start.dG, 0);
      for (let i = 0; i <= 400; i++) {
        const x = core.LEFT + (core.RIGHT - core.LEFT) * i / 400;
        const p = model.evaluate(x), q = base.evaluate(x);
        assert.ok(p.ddF >= 0 && p.ddG >= 0);
        close(p.F - p.G, p.phi); close(p.dF - p.dG, p.dphi); close(p.ddF - p.ddG, p.ddphi);
        close(p.F - q.F, lambda * (x - core.LEFT) ** 2 / 2);
        close(p.G - q.G, lambda * (x - core.LEFT) ** 2 / 2);
        close(q.ddF * q.ddG, 0);
        checked++;
      }
      close(model.addedCurvature, 2 * lambda * (core.RIGHT - core.LEFT));
    }
    // An independent midpoint quadrature validates each analytic curvature
    // primitive, including signs, roots, and the weighted double integration.
    const count = 20000, step = (core.RIGHT - core.LEFT) / count;
    let positive = 0, negative = 0, mass = 0;
    for (let i = 0; i < count; i++) {
      const x = core.LEFT + (i + 0.5) * step;
      const h = core.curvature(x, base.parameters);
      positive += step * (core.RIGHT - x) * Math.max(h, 0);
      negative += step * (core.RIGHT - x) * Math.max(-h, 0);
      mass += step * Math.abs(h);
    }
    const end = base.evaluate(core.RIGHT);
    close(end.G, negative, 2e-6);
    close(end.F - startAffine(base), positive, 2e-6);
    close(base.minimalCurvature, mass, 2e-6);
    if (amplitude * Math.PI ** 2 <= 1) {
      assert.equal(base.roots.length, 0);
      for (let i = 0; i <= 20; i++) close(base.evaluate(-2 + i / 5).G, 0);
    }
  }
}
function startAffine(model) {
  return core.target(core.LEFT, model.parameters) + core.derivative(core.LEFT, model.parameters) * (core.RIGHT - core.LEFT);
}
console.log(`DC curvature decomposition: ${checked.toLocaleString()} pointwise checks passed.`);
