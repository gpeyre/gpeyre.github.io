/* Independent checks for unequal-cardinality couplings and barycentric maps. */
"use strict";
const assert = require("node:assert/strict");
const M = require("../js/blog-barycentric-math.js");
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance,
    actual + " differs from " + expected + " by more than " + tolerance);
const average = points => [0, 1].map(d => points.reduce((s, p) => s + p[d] / points.length, 0));
const dot = (x, y) => x[0] * y[0] + x[1] * y[1];
const subtract = (x, y) => x.map((v, d) => v - y[d]);

function checkPlan(result) {
    const { source, target, coupling, barycenters } = result;
    const n = source.length, m = target.length;
    assert.equal(coupling.length, n); assert.equal(barycenters.length, n); assert.ok(result.converged);
    assert.ok(result.residual <= 1.1e-10);
    coupling.forEach((row, i) => {
        assert.equal(row.length, m); assert.ok(row.every(v => Number.isFinite(v) && v >= 0));
        const mass = row.reduce((s, v) => s + v, 0);
        near(mass, 1 / n, 1.1e-10);
        for (let d = 0; d < 2; d++) near(barycenters[i][d], row.reduce((s, v, j) => s + v * target[j][d], 0) / mass, 1e-12);
    });
    for (let j = 0; j < m; j++) near(coupling.reduce((s, row) => s + row[j], 0), 1 / m, 1.1e-10);
    const first = average(target), second = average(barycenters);
    first.forEach((v, d) => near(v, second[d], 5e-8));
    // Conditional Jensen: the projection loses, rather than creates, variance.
    const targetMoment = target.reduce((s, p) => s + dot(p, p) / m, 0);
    const projectedMoment = barycenters.reduce((s, p) => s + dot(p, p) / n, 0);
    assert.ok(projectedMoment <= targetMoment + 2e-8);
    const conditionalVariance = coupling.reduce((s, row, i) => s + row.reduce((r, mass, j) => {
        const difference = subtract(target[j], barycenters[i]);
        return r + mass * dot(difference, difference);
    }, 0), 0);
    near(targetMoment - projectedMoment, conditionalVariance, 1e-7);
    // Re-solve OT to the projected target as an independent cyclic-optimality
    // check: pairwise monotonicity alone would not prove the theorem in 2D.
    const projectedCost = source.reduce((s, x, i) => {
        const difference = subtract(x, barycenters[i]);
        return s + dot(difference, difference) / (2 * n);
    }, 0);
    const projectedOptimum = M.exact(source, barycenters);
    assert.ok(projectedOptimum.converged);
    near(projectedCost, projectedOptimum.cost, 1e-9);
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
        assert.ok(dot(subtract(source[i], source[k]), subtract(barycenters[i], barycenters[k])) >= -1e-8);
    }
    if (result.mode === "exact") {
        near(result.dualGap, 0, 1e-8); assert.ok(result.dualSlack >= -1e-9);
        const costs = M.costs(source, target);
        costs.forEach((row, i) => row.forEach((cost, j) => {
            const slack = cost - result.dualSource[i] - result.dualTarget[j];
            assert.ok(slack >= -1e-9);
            if (coupling[i][j] > 0) near(slack, 0, 1e-8);
        }));
    } else {
        source.forEach((x, i) => {
            const potential = M.entropicPotential(x, target, result.epsilon, result.logV);
            potential.gradient.forEach((v, d) => near(v, barycenters[i][d], 1e-10));
        });
    }
}

// Exhaustive integer transportation tables are an independent exact-cost oracle.
function exhaustiveCost(source, target) {
    const costs = M.costs(source, target), n = source.length, m = target.length;
    let divisor = n, next = m;
    while (next) { const rest = divisor % next; divisor = next; next = rest; }
    const supply = m / divisor, demand = n / divisor, total = n * m / divisor;
    let minimum = Infinity;
    function rows(i, remaining, objective) {
        if (i === n) { if (remaining.every(v => v === 0)) minimum = Math.min(minimum, objective / total); return; }
        const row = Array(m).fill(0);
        function allocate(j, left, value) {
            if (j === m) {
                if (left === 0) rows(i + 1, remaining.map((v, k) => v - row[k]), objective + value);
                return;
            }
            for (let mass = 0; mass <= Math.min(left, remaining[j]); mass++) {
                row[j] = mass; allocate(j + 1, left - mass, value + mass * costs[i][j]);
            }
        }
        allocate(0, supply, 0);
    }
    rows(0, Array(m).fill(demand), 0); return minimum;
}

assert.deepEqual(M.costs([[0, 0]], [[2, 2]]), [[4]]);
assert.throws(() => M.sample(1.5, 20)); assert.throws(() => M.costs([], [[0, 0]]));
assert.throws(() => M.sinkhorn([[0, 0]], [[1, 0]], 0));
assert.throws(() => M.entropicPotential([0, 0], [[1, 0]], 0.1, []));
const firstSample = M.sample(12, 240, 0), secondSample = M.sample(12, 240, 45);
assert.deepEqual(firstSample.source, secondSample.source);
assert.notDeepEqual(firstSample.target, secondSample.target);
assert.deepEqual(firstSample, M.sample(12, 240, 0));

for (const solver of [M.exact, (x, y) => M.sinkhorn(x, y, 0.2)]) {
    const one = solver([[0, 0]], [[-1, 0], [1, 0], [0, 3]]);
    checkPlan(one); near(one.barycenters[0][0], 0); near(one.barycenters[0][1], 1);
    const singleton = solver([[-1, 0], [0, 1], [1, 0]], [[2, 3]]);
    checkPlan(singleton); singleton.barycenters.forEach(p => { near(p[0], 2); near(p[1], 3); });
    const identical = solver([[0, 0], [0, 0]], [[-1, 0], [1, 0], [0, 0]]);
    checkPlan(identical);
    identical.barycenters.forEach(point => point.forEach(v => near(v, 0, 1e-12)));
    identical.coupling[0].forEach((mass, j) => near(mass, identical.coupling[1][j], 1e-12));
}
const simple = M.exact([[0, 0], [10, 0]], [[0, 0], [1, 0], [9, 0]]);
checkPlan(simple); near(simple.barycenters[0][0], 1 / 3); near(simple.barycenters[1][0], 19 / 3);
near(simple.coupling[0][1], 1 / 6); near(simple.coupling[1][1], 1 / 6);
for (const [n, m] of [[2, 3], [3, 2], [3, 4], [3, 3]]) for (const motion of [-95, 0, 72]) {
    const cloud = M.sample(n, m, motion), exact = M.exact(cloud.source, cloud.target);
    checkPlan(exact); near(exact.cost, exhaustiveCost(cloud.source, cloud.target), 1e-9);
}

const cloud = M.sample(7, 53, 31), exact = M.exact(cloud.source, cloud.target);
checkPlan(exact);
for (const epsilon of [0.05, 0.2, 1]) {
    const regularized = M.sinkhorn(cloud.source, cloud.target, epsilon);
    checkPlan(regularized); assert.ok(regularized.cost >= exact.cost - 1e-8);
}
const shiftedSource = cloud.source.map(p => [p[0] + 7, p[1] - 4]);
const shiftedTarget = cloud.target.map(p => [p[0] + 7, p[1] - 4]);
const translated = M.exact(shiftedSource, shiftedTarget);
near(translated.cost, exact.cost, 1e-9);
translated.coupling.forEach((row, i) => row.forEach((v, j) => near(v, exact.coupling[i][j], 1e-12)));

// The log-sum-exp potential has the advertised gradient and PSD covariance Hessian.
const entropic = M.sinkhorn(cloud.source, cloud.target, 0.2), point = [0.3, -0.4], h = 1e-5;
const phi = M.entropicPotential(point, cloud.target, 0.2, entropic.logV);
for (let d = 0; d < 2; d++) {
    const plus = point.slice(), minus = point.slice(); plus[d] += h; minus[d] -= h;
    const high = M.entropicPotential(plus, cloud.target, 0.2, entropic.logV);
    const low = M.entropicPotential(minus, cloud.target, 0.2, entropic.logV);
    near((high.value - low.value) / (2 * h), phi.gradient[d], 1e-8);
    for (let e = 0; e < 2; e++) near((high.gradient[e] - low.gradient[e]) / (2 * h), phi.hessian[e][d], 2e-7);
}
near(phi.hessian[0][1], phi.hessian[1][0], 1e-12);
assert.ok(phi.hessian[0][0] >= 0 && phi.hessian[1][1] >= 0);
assert.ok(phi.hessian[0][0] * phi.hessian[1][1] - phi.hessian[0][1] ** 2 >= -1e-12);

const timings = [];
for (const [n, m, motion] of [[12, 240, 0], [3, 600, -180], [40, 30, 180], [40, 600, 73], [37, 600, -131]]) {
    const points = M.sample(n, m, motion);
    for (const [name, solver] of [["exact", M.exact], ["entropic", (x, y) => M.sinkhorn(x, y, 0.05)]]) {
        const start = performance.now(), result = solver(points.source, points.target);
        checkPlan(result); timings.push(name + " " + n + "×" + m + ": " + Math.round(performance.now() - start) + " ms");
    }
}
// A deliberately interrupted solve must never claim convergence.
const limited = M.sinkhorn(cloud.source, cloud.target, 0.05, { maxIterations: 1 });
assert.equal(limited.converged, false);
console.log("Barycentric OT: analytic plans, exhaustive unequal-cardinality optima, dual certificates, marginal constraints, Jensen, means, and log-sum-exp derivatives passed.");
console.log(timings.join("; "));
