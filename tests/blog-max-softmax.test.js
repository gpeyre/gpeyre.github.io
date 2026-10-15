"use strict";

const assert = require("node:assert/strict");
const training = require("../blog/preparations/assets/max-softmax-train.js");
const surfaces = require("../blog/preparations/assets/max-softmax-3d.js");

const model = training.createModel(2, { seed: 73 });
const points = [[-0.81, 0.37], [0.13, -0.62], [0.77, 0.28], [-0.24, -0.19]]
    .map(([x, y]) => [x, y, training.target(x, y)]);

// Check the actual gradients supplied to Adam, including a very small temperature.
for (const [kind, tau] of [["max", 0.1], ["softmax", 1e-4], ["softmax", 0.08], ["softmax", 1]]) {
    const { gradient } = training.lossAndGradient(model, points, kind, tau);
    for (let j = 0; j < model.weights.length; j++) {
        const value = model.weights[j], h = 1e-6;
        model.weights[j] = value + h;
        const plus = training.validationLoss(model, points, kind, tau);
        model.weights[j] = value - h;
        const minus = training.validationLoss(model, points, kind, tau);
        model.weights[j] = value;
        assert.ok(Math.abs(gradient[j] - (plus - minus) / (2 * h)) < 1e-6,
            kind + " parameter gradient " + j);
    }
}

const options = { n: 2, tau: 0.25, steps: 400, resolution: 31 };
const fit = training.trainNetworks(options);
const repeat = training.trainNetworks(options);
assert.deepEqual(fit.max.planes, repeat.max.planes, "seeded fits are reproducible");
assert.deepEqual(fit.softmax.planes, repeat.softmax.planes);
assert.equal(fit.grid.length, 31 * 31);
for (const network of [fit.max, fit.softmax]) {
    assert.equal(network.planes.length, 4);
    assert.ok(network.validationLoss < network.initialLoss / 2, "Adam improves the sampled fit");
    assert.ok(network.planes.every(p => Object.values(p).every(Number.isFinite)));
}
assert.notDeepEqual(fit.max.planes, fit.softmax.planes, "networks have independently trained parameters");

const initial = training.serializeModel(training.createModel(2));
assert.ok(fit.max.planes.some((p, i) => Math.abs(p.a - initial[i].a) > 1e-3 ||
    Math.abs(p.b - initial[i].b) > 1e-3), "slopes move during training");
assert.ok(fit.max.planes.some(p => {
    const px = (0.8 * p.a - 0.4 * p.b) / 1.04;
    const py = (1.5 * p.b - 0.4 * p.a) / 1.04;
    return Math.abs(p.c + training.target(px, py)) > 1e-3;
}), "learned intercepts are not constrained to tangent planes");

function asModel(planes) {
    return { count: planes.length, weights: new Float64Array(planes.flatMap(p => [p.a, p.b, p.c])) };
}
const learnedMax = asModel(fit.max.planes), learnedSoft = asModel(fit.softmax.planes);
const h = 1e-6, r = fit.resolution;
for (const [i, j] of [[3, 5], [13, 19], [26, 21]]) {
    const x = -1 + 2 * i / (r - 1), y = 1 - 2 * j / (r - 1);
    const v = fit.grid[j * r + i];
    assert.equal(v.max, training.evaluateModel(learnedMax, x, y, "max", fit.tau));
    assert.equal(v.soft, training.evaluateModel(learnedSoft, x, y, "softmax", fit.tau));
    const dx = (training.evaluateModel(learnedSoft, x + h, y, "softmax", fit.tau) -
        training.evaluateModel(learnedSoft, x - h, y, "softmax", fit.tau)) / (2 * h);
    const dy = (training.evaluateModel(learnedSoft, x, y + h, "softmax", fit.tau) -
        training.evaluateModel(learnedSoft, x, y - h, "softmax", fit.tau)) / (2 * h);
    assert.ok(Math.abs(v.softDx - dx) < 1e-6, "analytic x normal");
    assert.ok(Math.abs(v.softDy - dy) < 1e-6, "analytic y normal");
}
const range = surfaces.bounds(fit);
assert.ok(fit.grid.every(v => [v.f, v.max, v.soft].every(z => z >= range.low && z <= range.high)),
    "shared surface scale contains both learned functions");
assert.ok(fit.grid.every(v => Object.values(v).every(Number.isFinite)));

// Exact active faces must tile the domain and agree with the actual max network.
const duplicate = { a: 0.2, b: -0.1, c: 0.3 };
for (const bank of [fit.max.planes, training.serializeModel(training.createModel(6, { seed: 19 })),
    [duplicate, { ...duplicate }, { a: 0.2, b: -0.1, c: -1 }]]) {
    const original = JSON.stringify(bank), cells = surfaces.maxCells(bank);
    assert.strictEqual(cells, surfaces.maxCells(bank), "camera redraw reuses clipped faces");
    let area = 0;
    for (const cell of cells) {
        const polygon = cell.polygon;
        let twiceArea = 0;
        for (let j = 0; j < polygon.length; j++) {
            const p = polygon[j], q = polygon[(j + 1) % polygon.length];
            twiceArea += p.x * q.y - q.x * p.y;
            assert.ok(Math.abs(p.x) <= 1 + 1e-9 && Math.abs(p.y) <= 1 + 1e-9);
            const z = cell.a * p.x + cell.b * p.y + cell.c;
            assert.ok(bank.every(plane => z >= plane.a * p.x + plane.b * p.y + plane.c - 1e-8),
                "face vertices lie on the max envelope");
        }
        area += Math.abs(twiceArea) / 2;
    }
    assert.ok(Math.abs(area - 4) < 1e-8, "exact faces cover the square once");
    assert.equal(JSON.stringify(bank), original, "clipping never changes learned weights");
}
console.log("Max/softmax gradients, Adam fits, free parameters, analytic normals and exact surface faces passed.");
