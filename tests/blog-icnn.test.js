/* Independent checks of the ICNN construction, numerical models and certificates. */
"use strict";
const assert = require("node:assert/strict");
const M = require("../js/blog-icnn-math.js");
const models = require("../js/blog-icnn-models.js");
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance,
    actual + " differs from " + expected + " by more than " + tolerance);

assert.deepEqual(models.widths, M.widths);
near(M.certificate(M.targetTwo), -1);
near(M.certificate((x, y) => 2 * x - 3 * y + 7), 0);

// Popoviciu's seven-point expression is nonnegative for every affine hinge.
for (let i = 0; i < 500; i++) {
    const a = Math.sin(1.3 * i), b = Math.cos(2.7 * i), c = 2 * Math.sin(0.3 * i);
    assert.ok(M.certificate((x, y) => M.relu(a * x + b * y + c)) >= -1e-12);
}

for (const neurons of M.widths) {
    const step = 2 / (neurons + 1), error = 1 / (neurons + 1) ** 2;
    // Linear interpolation is exact at its knots and attains the known maximum
    // error at the midpoint of every interval, not just on a sampling grid.
    for (let j = 0; j <= neurons + 1; j++) {
        const x = -1 + j * step;
        near(M.squareSpline(x, neurons), x * x);
    }
    for (let j = 0; j <= neurons; j++) {
        const x = -1 + (j + 0.5) * step;
        near(M.squareSpline(x, neurons) - x * x, error);
    }
}

for (const key of ["two", "three"]) {
    let previousError = Infinity;
    const target = key === "two" ? M.targetTwo : M.targetThree;
    const exact = key === "two" ? M.exactTwo : M.exactThree;
    models[key].forEach((model, index) => {
        const n = models.widths[index];
        assert.equal(model.width, n); assert.equal(model.depth, key === "two" ? 2 : 3);
        for (const matrix of [model.a1, ...(model.depth === 3 ? [model.a2] : [])]) {
            assert.equal(matrix.length, n);
            matrix.forEach(row => { assert.equal(row.length, 2); assert.ok(row.every(Number.isFinite)); });
        }
        assert.equal(model.c.length, n); assert.ok(model.c.every(v => v >= 0 && Number.isFinite(v)));
        assert.equal(model.b1.length, n);
        if (model.depth === 3) {
            assert.equal(model.b2.length, n); assert.equal(model.w2.length, n);
            model.w2.forEach(row => { assert.equal(row.length, n); assert.ok(row.every(v => v >= 0 && Number.isFinite(v))); });
        }
        const evaluate = M.evaluator(model);
        let maxError = 0;
        for (let j = 0; j <= 100; j++) for (let i = 0; i <= 100; i++) {
            const x = -1 + i / 50, y = -1 + j / 50, value = evaluate(x, y);
            assert.ok(Number.isFinite(value));
            near(exact(x, y), target(x, y));
            maxError = Math.max(maxError, Math.abs(value - target(x, y)));
        }
        // Published errors were computed independently by the Python/PyTorch
        // model, before the JavaScript forward implementation and rounding.
        near(maxError, model.gridError, 3e-7);
        assert.ok(model.gridError <= previousError + 1e-12); previousError = model.gridError;
        if (key === "two") {
            const certificate = M.certificate(evaluate);
            assert.ok(certificate >= -1e-8);
            assert.ok(maxError >= 1 / 12 - 1e-8);
        }
        // Check convexity for non-grid points and nonsymmetric interpolations.
        for (let k = 0; k < 200; k++) {
            const p = [Math.sin(k * 1.1), Math.cos(k * 0.7)], q = [Math.cos(k * 2.3), Math.sin(k * 1.9)];
            const t = (k % 23) / 23;
            const inside = evaluate(t * p[0] + (1 - t) * q[0], t * p[1] + (1 - t) * q[1]);
            assert.ok(inside <= t * evaluate(...p) + (1 - t) * evaluate(...q) + 1e-9);
        }
    });
}
console.log("ICNN: nonnegative weights, Python/JavaScript forward agreement, sampled errors, convexity, 1D interpolation, seven-point certificate, and exact extra-layer representations passed.");
