/* Shared, dependency-free numerical kernels for the blog figures and tests. */
(function (root) {
    "use strict";
    const sum = a => a.reduce((s, x) => s + x, 0);
    const normalize = a => { const s = sum(a); return a.map(x => x / s); };
    const matvec = (a, x) => a.map(row => sum(row.map((v, i) => v * x[i])));
    const transpose = a => a[0].map((_, j) => a.map(row => row[j]));
    const l1 = (a, b) => sum(a.map((v, i) => Math.abs(v - b[i])));
    const iterate = (f, x, n) => { let y = x.slice(); for (let k = 0; k < n; k++) y = f(y); return y; };

    function banana(x, y, bend) {
        const r = x - Math.min(1, Math.max(0, x));
        const z = y + bend * (x - 0.5) ** 2;
        return { value: r * r + z * z, gradient: [2 * r + 4 * bend * (x - 0.5) * z, 2 * z] };
    }
    function rk4(point, h, velocity) {
        const add = (p, v, s) => p.map((x, i) => x + s * v[i]);
        const k1 = velocity(point);
        const k2 = velocity(add(point, k1, h / 2));
        const k3 = velocity(add(point, k2, h / 2));
        const k4 = velocity(add(point, k3, h));
        return point.map((x, i) => x + h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
    }
    function bananaPaths(bend, steps = 600, dt = 0.01) {
        const paths = [];
        // Fixed seeds make parameter comparisons deterministic.
        for (let i = 0; i < 16; i++) {
            const theta = 2 * Math.PI * (i + 0.25) / 16;
            const seed = [0.5 + 1.03 * Math.cos(theta), -0.5 + 1.12 * Math.sin(theta)];
            const path = [seed];
            for (let k = 0; k < steps; k++) {
                path.push(rk4(path[k], dt, p => banana(p[0], p[1], bend).gradient.map(v => -v)));
            }
            paths.push(path);
        }
        return paths;
    }
    function markovMatrix() {
        const q = [0.22, 0.48, 0.3], mix = 0.22;
        return q.map((qi, i) => q.map((_, j) =>
            mix * qi + (1 - mix) * (i === j ? 0.72 : i === (j + 1) % 3 ? 0.28 : 0)));
    }
    function sinkhornSystem(epsilon) {
        const a = [0.25, 0.45, 0.3], b = [0.45, 0.2, 0.35];
        const cost = [[0, 0.9, 0.5], [0.7, 0.05, 0.8], [0.9, 0.4, 0]];
        const kernel = cost.map(row => row.map(c => Math.exp(-c / epsilon)));
        return { a, b, kernel };
    }
    function sinkhornStep(v, system) {
        const u = matvec(system.kernel, v).map((x, i) => system.a[i] / x);
        return normalize(matvec(transpose(system.kernel), u).map((x, j) => system.b[j] / x));
    }
    function sinkhornResidual(v, system) {
        const u = matvec(system.kernel, v).map((x, i) => system.a[i] / x);
        const columns = matvec(transpose(system.kernel), u).map((x, j) => x * v[j]);
        return l1(columns, system.b);
    }
    function covariance(angle, major, minor) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [[major * c * c + minor * s * s, (major - minor) * c * s],
                [(major - minor) * c * s, major * s * s + minor * c * c]];
    }
    function inverse2(a) {
        const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
        return [[a[1][1] / det, -a[0][1] / det], [-a[1][0] / det, a[0][0] / det]];
    }
    function gaussianBarycenter(means, covariances, weights) {
        const precisions = covariances.map(inverse2);
        const precision = [[0, 0], [0, 0]], h = [0, 0];
        precisions.forEach((p, k) => {
            const pm = matvec(p, means[k]);
            for (let i = 0; i < 2; i++) {
                h[i] += weights[k] * pm[i];
                for (let j = 0; j < 2; j++) precision[i][j] += weights[k] * p[i][j];
            }
        });
        const sigma = inverse2(precision);
        return { mean: matvec(sigma, h), covariance: sigma, precision };
    }
    function ellipsePoints(mean, sigma, radius = 2, samples = 100) {
        // Cholesky factor; no eigenvector orientation discontinuity while animating.
        const a = Math.sqrt(sigma[0][0]), b = sigma[1][0] / a;
        const c = Math.sqrt(Math.max(0, sigma[1][1] - b * b));
        return Array.from({ length: samples + 1 }, (_, i) => {
            const t = i * 2 * Math.PI / samples;
            return [mean[0] + radius * a * Math.cos(t),
                    mean[1] + radius * (b * Math.cos(t) + c * Math.sin(t))];
        });
    }
    function eulerExample(bend, n) {
        const h = 1 / n, points = [[0, 0]], errors = [0];
        for (let k = 0; k < n; k++) {
            points.push([(k + 1) * h, points[k][1] + h * bend * Math.PI * Math.cos(Math.PI * k * h)]);
            errors.push(Math.abs(points[k + 1][1] - bend * Math.sin(Math.PI * (k + 1) * h)));
        }
        return { points, errors, bound: bend * Math.PI ** 2 / (2 * n), maxError: Math.max(...errors) };
    }
    const api = { sum, normalize, matvec, transpose, l1, iterate, banana, rk4, bananaPaths,
        markovMatrix, sinkhornSystem, sinkhornStep, sinkhornResidual, covariance, inverse2,
        gaussianBarycenter, ellipsePoints, eulerExample };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.BlogMath = api;
}(typeof globalThis !== "undefined" ? globalThis : this));
