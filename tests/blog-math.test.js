"use strict";
const assert = require("node:assert/strict");
const M = require("../js/blog-math.js");
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, a + " != " + b);
const finite = x => x.flat(Infinity).forEach(v => assert.ok(Number.isFinite(v)));

// The banana gradient and integration are checked over the full slider range.
for (const bend of [0, 0.5, 1, 2]) {
    for (const [x, y] of [[-0.4, 0.3], [0.4, -0.7], [1.4, -0.3]]) {
        const h = 1e-6, g = M.banana(x, y, bend).gradient;
        close(g[0], (M.banana(x + h, y, bend).value - M.banana(x - h, y, bend).value) / (2 * h), 1e-7);
        close(g[1], (M.banana(x, y + h, bend).value - M.banana(x, y - h, bend).value) / (2 * h), 1e-7);
    }
    for (const path of M.bananaPaths(bend)) {
        finite(path);
        const R = M.banana(...path[0], bend).value;
        const mu = 2 / (1 + 2 * bend * (0.5 + Math.sqrt(R))) ** 2;
        let previous = Infinity;
        path.forEach(point => {
            const { value, gradient } = M.banana(...point, bend);
            assert.ok(value <= previous + 1e-9, "Gradient flow must decrease energy");
            assert.ok(M.sum(gradient.map(v => v * v)) / 2 + 1e-9 >= mu * value);
            previous = value;
        });
        assert.ok(previous <= R * Math.exp(-12 * mu) + 1e-8, "Energy must obey the sublevel P–L rate");
    }
}

const P = M.markovMatrix();
M.transpose(P).forEach(column => { close(M.sum(column), 1); column.forEach(x => assert.ok(x > 0)); });
const fixed = M.iterate(x => M.matvec(P, x), [0.2, 0.3, 0.5], 300);
close(M.l1(M.matvec(P, fixed), fixed), 0);
for (const epsilon of [0.15, 0.5, 1.5]) {
    const system = M.sinkhornSystem(epsilon);
    for (const seed of [[0.97, 0.015, 0.015], [0.015, 0.97, 0.015], [0.015, 0.015, 0.97]]) {
        const step = x => M.sinkhornStep(x, system);
        close(M.l1(step(seed), step(seed.map(x => 4 * x))), 0);
        const result = M.iterate(step, seed, 1000);
        finite(result); close(M.sum(result), 1);
        assert.ok(M.sinkhornResidual(result, system) < 1e-10);
    }
}

const means = [[-1.35, 0.25], [1.25, -0.1]];
for (const angle of [0, 45, 110, 180]) {
    const sigmas = [M.covariance(0.35, 0.95, 0.16), M.covariance(angle * Math.PI / 180, 0.85, 0.12)];
    for (const weight of [0, 0.01, 0.5, 0.99, 1]) {
        const result = M.gaussianBarycenter(means, sigmas, [1 - weight, weight]);
        finite([result.mean, result.covariance, M.ellipsePoints(result.mean, result.covariance)]);
        assert.ok(result.covariance[0][0] > 0);
        assert.ok(result.covariance[0][0] * result.covariance[1][1] - result.covariance[0][1] ** 2 > 0);
        const expected = [0, 1].map(i => {
            const p0 = M.matvec(M.inverse2(sigmas[0]), means[0]);
            const p1 = M.matvec(M.inverse2(sigmas[1]), means[1]);
            return (1 - weight) * p0[i] + weight * p1[i];
        });
        M.matvec(result.precision, result.mean).forEach((x, i) => close(x, expected[i]));
        if (weight === 0 || weight === 1) {
            result.mean.forEach((x, i) => close(x, means[weight][i]));
            result.covariance.forEach((row, i) => row.forEach((x, j) => close(x, sigmas[weight][i][j])));
        }
    }
}

for (const bend of [0, 0.05, 0.7, 1.2]) {
    for (let n = 2; n <= 80; n++) {
        const result = M.eulerExample(bend, n);
        finite(result.points);
        assert.ok(result.maxError <= result.bound + 1e-12);
        result.errors.forEach((error, k) => assert.ok(error <= (k / n) * result.bound + 1e-12));
        if (!bend) close(result.maxError, 0);
    }
}

// Verify the explicit five-cycle spectrum and the trace obstruction.
const a = (Math.sqrt(5) - 1) / 2;
for (let k = 0; k < 5; k++) assert.ok(1 + 2 * a * Math.cos(2 * Math.PI * k / 5) >= -1e-12);
assert.ok(10 * a > 5);
console.log("Blog mathematics: gradient flow, Markov/Sinkhorn, Gaussian barycenters, Euler bounds, and five-cycle checks passed.");
