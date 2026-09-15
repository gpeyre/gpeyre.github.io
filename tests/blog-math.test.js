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
for (const epsilon of [0.18, 0.22, 0.5]) {
    const system = M.sinkhornSystem(epsilon);
    for (const seed of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.2, 0.3, 0.5]]) {
        const step = x => M.sinkhornStep(x, system);
        close(M.l1(step(seed), step(seed.map(x => 4 * x))), 0);
        const result = M.iterate(step, seed, 2000);
        finite(result); close(M.sum(result), 1);
        assert.ok(M.sinkhornResidual(result, system) < 1e-10);
    }
}

// Guard the actual pedagogical requirement: a large, visibly curved image
// persists for multiple true Sinkhorn iterations at the default setting.
const boundary = M.simplexBoundary();
assert.equal(boundary.length, 289);
assert.deepEqual(boundary[0], boundary.at(-1));
boundary.forEach(p => { close(M.sum(p), 1); p.forEach(x => assert.ok(x >= 0)); });
const area = points => Math.abs(points.slice(1).reduce((s, q, i) =>
    s + points[i][1] * q[2] - q[1] * points[i][2], 0)) / 2;
const initialArea = area(boundary);
const example = M.sinkhornSystem(0.22);
let ring = boundary, previousArea = initialArea;
for (let k = 1; k <= 80; k++) {
    ring = ring.map(v => M.sinkhornStep(v, example));
    finite(ring);
    const currentArea = area(ring);
    assert.ok(currentArea <= previousArea + 1e-12, "Successive simplex images must contract");
    if (k === 1) assert.ok(currentArea / initialArea > 0.8, "The triangle collapses on its first step");
    if (k === 8) {
        assert.ok(currentArea / initialArea > 0.3, "The curved triangle should still be clearly visible");
        const bow = Math.abs(ring[48][2] - (ring[0][2] + ring[96][2]) / 2);
        assert.ok(bow > 0.04, "Sinkhorn must visibly bend the edge, not just map its corners");
    }
    previousArea = currentArea;
}
assert.ok(previousArea / initialArea < 0.001, "The default example must eventually converge");
const linearRing = boundary.map(v => M.iterate(x => M.matvec(P, x), v, 8));
close(linearRing[48][2], (linearRing[0][2] + linearRing[96][2]) / 2);

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
// The diffusion score is analytic, including the regular Gaussian endpoint.
const mixture = M.diffusionMixture();
for (const sigma of [0.02, 0.16, 0.6]) {
    for (const r of [0, 0.3, 0.9, 1]) {
        for (const x of [[0.2, -0.3], [1, -2], [30, -25]]) {
            const p = M.mixturePosterior(x, r, sigma), score = M.mixtureScore(x, r, sigma);
            finite([p.mean, p.weights, score, M.diffusionVelocity(x, r, sigma)]);
            close(M.sum(p.weights), 1);
            for (let k = 0; k < 2; k++) {
                const a = x.slice(), b = x.slice(), h = 1e-5;
                a[k] += h; b[k] -= h;
                const numerical = (M.mixturePosterior(a, r, sigma).logDensity -
                    M.mixturePosterior(b, r, sigma).logDensity) / (2 * h);
                close(score[k], numerical, 1e-4);
            }
            if (r === 0) {
                score.forEach((v, k) => close(v, -x[k]));
                M.diffusionVelocity(x, r, sigma).forEach((v, k) =>
                    close(v, M.sum(mixture.means.map((m, j) => m[k] * mixture.weights[j]))));
            } else {
                M.diffusionVelocity(x, r, sigma).forEach((v, k) => close(v, (x[k] + score[k]) / r, 1e-8));
            }
        }
    }
}
// A local continuity-equation check guards the direction and score coefficient.
for (const r of [0.1, 0.5, 0.85]) {
    const x = [0.2, -0.3], h = 1e-5, sigma = 0.16;
    const density = (x, r) => Math.exp(M.mixturePosterior(x, r, sigma).logDensity);
    const dr = (density(x, r + h) - density(x, r - h)) / (2 * h);
    let divergence = 0;
    for (let k = 0; k < 2; k++) {
        const a = x.slice(), b = x.slice(); a[k] += h; b[k] -= h;
        divergence += (density(a, r) * M.diffusionVelocity(a, r, sigma)[k] -
            density(b, r) * M.diffusionVelocity(b, r, sigma)[k]) / (2 * h);
    }
    close(dr + divergence, 0, 1e-7);
}
// For a single isotropic Gaussian the complete flow is known in closed form.
const single = { means: [[-0.7, 0.9]], weights: [1] };
const seeds = [[0.2, 1.3], [-2, 0.4], [0, 0]];
for (const sigma of [0, 0.02, 0.16, 0.6, 1]) {
    const paths = M.diffusionPaths(sigma, { model: single, source: seeds, steps: 320 });
    paths.forEach((path, i) => {
        finite(path);
        for (const k of [0, 80, 160, 240, 319, 320]) {
            const theta = k / 320 * (Math.PI / 2 - (sigma === 0 ? 1e-4 : 0));
            const r = Math.sin(theta), sd = Math.sqrt(1 - r * r + sigma * sigma * r * r);
            path[k].forEach((value, d) => {
                const exact = sigma === 0 && k === 320 ? single.means[0][d] : r * single.means[0][d] + sd * seeds[i][d];
                close(value, exact, 2e-6);
            });
        }
    });
}
const cloud = M.gaussianCloud();
assert.equal(cloud.length, 240);
for (let k = 0; k < 2; k++) {
    close(M.sum(cloud.map(x => x[k])) / cloud.length, 0, 0.02);
    close(M.sum(cloud.map(x => x[k] ** 2)) / cloud.length, 1, 0.025);
}
// Brute force small assignments, including coincident target atoms.
function exhaustiveCost(source, target) {
    let minimum = Infinity;
    function visit(i, used, cost) {
        if (i === source.length) { minimum = Math.min(minimum, cost); return; }
        for (let j = 0; j < target.length; j++) if (!used.has(j)) {
            used.add(j);
            visit(i + 1, used, cost + (source[i][0] - target[j][0]) ** 2 + (source[i][1] - target[j][1]) ** 2);
            used.delete(j);
        }
    }
    visit(0, new Set(), 0);
    return minimum / source.length;
}
for (const n of [1, 3, 6]) {
    const x = M.gaussianCloud(n), y = x.map((p, i) => [Math.sin(i), Math.cos(2 * i)]);
    close(M.optimalAssignment(x, y).cost, exhaustiveCost(x, y));
    const atoms = x.map((_, i) => mixture.means[i % 3]);
    close(M.optimalAssignment(x, atoms).cost, exhaustiveCost(x, atoms));
}
// The same endpoint set is used in both panels. Certify assignment optimality
// by dual feasibility and complementary slackness, not just a lower cost.
for (const sigma of [0, 0.02, 0.16, 0.6]) {
    const scene = M.diffusionComparison(sigma);
    const { permutation, cost, dualSource, dualTarget } = scene.matching;
    finite(scene.paths);
    assert.equal(new Set(permutation).size, scene.source.length);
    assert.ok(cost <= scene.diffusionCost + 1e-10);
    close((M.sum(dualSource) + M.sum(dualTarget)) / scene.source.length, cost, 1e-9);
    scene.source.forEach((x, i) => scene.target.forEach((y, j) => {
        const c = (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2, dual = dualSource[i] + dualTarget[j];
        assert.ok(dual <= c + 1e-9, "Assignment dual feasibility");
        if (permutation[i] === j) close(c, dual, 1e-9);
    }));
    const counts = [0, 1, 2].map(k => scene.labels.filter(j => j === k).length);
    assert.deepEqual([0, 1, 2].map(k => permutation.filter(j => scene.labels[j] === k).length), counts);
    counts.forEach((count, j) => close(count / scene.source.length, mixture.weights[j], 0.04));
    if (sigma === 0) scene.target.forEach((y, i) => assert.deepEqual(y, mixture.means[scene.labels[i]]));
    if (sigma === 0.16) {
        assert.ok(scene.changed >= 5, "The example must display genuine changes of destination");
        assert.ok(scene.diffusionCost - cost > 0.01, "Endpoint assignment, not path curvature, must distinguish the maps");
        const coarse = M.diffusionPaths(sigma, { source: scene.source.slice(0, 32), steps: 160 });
        coarse.forEach((p, i) => p.at(-1).forEach((v, d) => close(v, scene.target[i][d], 2e-5)));
        const bow = Math.max(...scene.paths.map(path => {
            const a = path[0], b = path.at(-1), mid = path[160];
            return Math.abs((b[0] - a[0]) * (a[1] - mid[1]) - (a[0] - mid[0]) * (b[1] - a[1])) /
                Math.hypot(b[0] - a[0], b[1] - a[1]);
        }));
        assert.ok(bow > 0.2, "The integrated diffusion trajectories should be visibly curved");
    }
}
console.log("Blog mathematics: existing figures, analytic diffusion flow, and certified optimal assignments passed.");
