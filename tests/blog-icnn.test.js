/* Independent checks of the ICNN construction, numerical models and certificates. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const M = require("../js/blog-icnn-math.js");
const models = require("../js/blog-icnn-models.js");
const diagnostics = require("../js/blog-icnn-diagnostics.js");
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance,
    actual + " differs from " + expected + " by more than " + tolerance);

assert.deepEqual(models.widths, M.widths);
assert.deepEqual(diagnostics.widths, M.widths);
assert.equal(diagnostics.modelSha256, createHash("sha256").update(
    fs.readFileSync(require.resolve("../js/blog-icnn-models.js"))).digest("hex"), "Recompute diagnostics after changing model weights");
near(M.certificate(M.targetTwo), -1);
near(M.certificate((x, y) => 2 * x - 3 * y + 7), 0);

// Residuals retain their sign and the requested domain. Fixed color clipping
// counts samples beyond the scale; it never rescales away a small defect.
const residualProbe = M.residualGrid((x, y) => x + y, () => 0, 3, [-0.5, 0]);
assert.deepEqual(residualProbe.bounds, [-0.5, 0]);
assert.deepEqual(Array.from(residualProbe.values), [-1, -0.75, -0.5, -0.75, -0.5, -0.25, -0.5, -0.25, 0]);
assert.deepEqual(M.clipping([-0.2, -0.1, 0, 0.1, 0.3], 0.1),
    { below: 1, above: 1, count: 2, minimum: -0.2, maximum: 0.3 });
assert.equal(M.clipping([-0.1, 0.1], 0.1).count, 0);
for (const [target, exact] of [[M.targetTwo, M.exactTwo], [M.targetThree, M.exactThree]]) {
    const field = M.residualGrid(exact, target, 81, [-0.57, 0.07]);
    assert.ok(field.values.every(value => Number.isFinite(value) && Math.abs(value) < 1e-12));
    assert.equal(M.clipping(field.values, 0.025).count, 0);
}

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
        const diagnostic = diagnostics[key][index];
        assert.equal(diagnostic.width, n);
        near(diagnostic.maxError, Math.max(diagnostic.overError, diagnostic.underError), 2e-12);
        // Independent JavaScript evaluations attain both LP extremal witnesses.
        near(evaluate(...diagnostic.overPoint) - target(...diagnostic.overPoint), diagnostic.overError, 2e-8);
        near(target(...diagnostic.underPoint) - evaluate(...diagnostic.underPoint), diagnostic.underError, 2e-8);
        const slice = M.diagonalSlice(model);
        assert.equal(slice.points[0].t, -0.25);
        assert.equal(slice.points.at(-1).t, 0);
        slice.points.forEach(point => near(point.value, evaluate(point.t, point.t)));
        // All first- and second-layer crossings must be included: the network
        // is exactly affine between each two returned knots. Check independent
        // interior positions, not merely the stored knot values.
        for (let j = 1; j < slice.points.length; j++) {
            const left = slice.points[j - 1], right = slice.points[j];
            assert.ok(right.t > left.t);
            for (const weight of [0.17, 0.63]) {
                const t = (1 - weight) * left.t + weight * right.t;
                near(evaluate(t, t), (1 - weight) * left.value + weight * right.value, 2e-9);
            }
        }
        const exactSlice = M.diagonalSlice(model, true);
        assert.equal(exactSlice.minimum, 0); assert.equal(exactSlice.maximum, 0);
        assert.ok(exactSlice.points.every(point => point.value === 0));
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
        assert.ok(maxError <= diagnostic.maxError + 2e-8);
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
            assert.ok(Math.abs(evaluate(...p) - target(...p)) <= diagnostic.maxError + 2e-8);
        }
    });
}
const smallest = M.evaluator(models.three[0]), largest = M.evaluator(models.three.at(-1));
assert.ok(diagnostics.three[0].maxError > models.three[0].gridError + 0.01,
    "The continuous-domain check must retain the width-one minimum missed by the old grid");
assert.ok(M.clipping(M.residualGrid(smallest, M.targetThree, 81, [-0.57, 0.07]).values, 0.025).count > 0);
assert.equal(M.clipping(M.residualGrid(largest, M.targetThree, 81, [-0.57, 0.07]).values, 0.025).count, 0);
near(largest(-1 / 6, -1 / 6), -0.015432599661354046, 1e-12);
const largeSlice = M.diagonalSlice(models.three.at(-1));
assert.ok(largeSlice.minimum < -0.0154 && largeSlice.minimum > -0.0156);
assert.ok(M.clipping(M.diagonalSlice(models.three[0]).points.map(point => point.value), 0.035).count > 0);
for (const model of models.three) assert.equal(M.clipping(M.diagonalSlice(model).points.map(point => point.value), 0.12).count, 0);
console.log("ICNN: model hash, LP witnesses, nonnegative weights, Python/JavaScript agreement, convexity, residuals, fixed clipping scales, exact diagonal restrictions, 1D interpolation, certificates, and extra-layer representations passed.");
