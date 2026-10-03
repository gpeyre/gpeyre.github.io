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
        // A near-diagonal kernel with balanced marginals keeps several curved
        // simplex images visible before convergence. These are ordinary,
        // undamped Sinkhorn updates for this explicitly stated OT problem.
        const a = [1 / 3, 1 / 3, 1 / 3], b = a.slice();
        const cost = [[0, 1, 1], [1, 0, 1], [1, 1, 0]];
        const kernel = cost.map(row => row.map(c => Math.exp(-c / epsilon)));
        return { a, b, kernel };
    }
    function simplexBoundary(segments = 96) {
        const vertices = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], boundary = [];
        for (let edge = 0; edge < 3; edge++) {
            for (let j = 0; j < segments; j++) {
                // Resolve the high curvature near corners without undersampling
                // the middle of an edge. All points, not just vertices, are mapped.
                const t = (1 - Math.cos(Math.PI * j / segments)) / 2;
                boundary.push(vertices[edge].map((x, i) =>
                    (1 - t) * x + t * vertices[(edge + 1) % 3][i]));
            }
        }
        boundary.push(boundary[0].slice());
        return boundary;
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
    const multiply2 = (a, b) => a.map(row => [0, 1].map(j => row[0] * b[0][j] + row[1] * b[1][j]));
    const determinant2 = a => a[0][0] * a[1][1] - a[0][1] * a[1][0];
    function gaussianKL(alpha, beta) {
        const precision = inverse2(beta.covariance);
        const delta = alpha.mean.map((x, i) => x - beta.mean[i]);
        const product = multiply2(precision, alpha.covariance), h = matvec(precision, delta);
        const value = (product[0][0] + product[1][1] - 2 + sum(delta.map((x, i) => x * h[i])) +
            Math.log(determinant2(beta.covariance)) - Math.log(determinant2(alpha.covariance))) / 2;
        return Math.max(0, value); // Only removes roundoff at the zero-energy equilibrium.
    }
    function gaussianKLFlow(initial, target, time) {
        if (!(time >= 0) || !Number.isFinite(time)) throw new RangeError("Flow time must be finite and nonnegative");
        const b = target.covariance, mid = (b[0][0] + b[1][1]) / 2;
        const radius = Math.hypot((b[0][0] - b[1][1]) / 2, b[0][1]);
        const major = mid + radius, minor = determinant2(b) / major;
        if (!(major > 0 && minor > 0)) throw new RangeError("The target covariance must be positive definite");
        const angle = Math.atan2(2 * b[0][1], b[0][0] - b[1][1]) / 2;
        const transition = covariance(angle, Math.exp(-time / major), Math.exp(-time / minor));
        // E Sigma_0 E + B(I-E^2) is a positive-sum evaluation of
        // B + E(Sigma_0-B)E. The sandwich is essential when B and Sigma_0 do not commute.
        const noise = covariance(angle, -major * Math.expm1(-2 * time / major),
            -minor * Math.expm1(-2 * time / minor));
        const evolved = multiply2(multiply2(transition, initial.covariance), transition);
        const sigma = evolved.map((row, i) => row.map((x, j) => x + noise[i][j]));
        sigma[0][1] = sigma[1][0] = (sigma[0][1] + sigma[1][0]) / 2;
        const delta = matvec(transition, initial.mean.map((x, i) => x - target.mean[i]));
        const result = { mean: target.mean.map((x, i) => x + delta[i]), covariance: sigma };
        return { ...result, transition, kl: gaussianKL(result, target) };
    }
    function gaussianKLExample(angle, anisotropy) {
        return {
            initial: { mean: [-2, 0.7], covariance: covariance(0.25, 1.3, 0.25) },
            target: { mean: [1.5, -0.3], covariance: covariance(angle, anisotropy, 1 / anisotropy) }
        };
    }
    function eulerExample(bend, n) {
        const h = 1 / n, points = [[0, 0]], errors = [0];
        for (let k = 0; k < n; k++) {
            points.push([(k + 1) * h, points[k][1] + h * bend * Math.PI * Math.cos(Math.PI * k * h)]);
            errors.push(Math.abs(points[k + 1][1] - bend * Math.sin(Math.PI * (k + 1) * h)));
        }
        return { points, errors, bound: bend * Math.PI ** 2 / (2 * n), maxError: Math.max(...errors) };
    }
    function diffusionMixture() {
        return { means: [[-3, -2.3], [0, 2], [5, -0.3]], weights: [0.3, 0.4, 0.3] };
    }
    function gaussianCloud(count = 240) {
        // Equal-weight, deterministic polar quadrature for N(0, I_2).
        // The radial quantiles sample the Gaussian, not a uniform disk.
        const angle = Math.PI * (3 - Math.sqrt(5));
        return Array.from({ length: count }, (_, i) => {
            const radius = Math.sqrt(-2 * Math.log(1 - (i + 0.5) / count));
            return [radius * Math.cos(i * angle), radius * Math.sin(i * angle)];
        });
    }
    function mixturePosterior(point, r, sigma, model = diffusionMixture()) {
        const variance = 1 - r * r + sigma * sigma * r * r;
        if (!(variance > 0)) throw new RangeError("A score requires a positive mixture variance");
        const logits = model.means.map((m, j) => Math.log(model.weights[j]) -
            ((point[0] - r * m[0]) ** 2 + (point[1] - r * m[1]) ** 2) / (2 * variance));
        const maximum = Math.max(...logits), exp = logits.map(x => Math.exp(x - maximum));
        const total = sum(exp), weights = exp.map(x => x / total);
        const mean = [0, 1].map(k => sum(model.means.map((m, j) => weights[j] * m[k])));
        return { mean, weights, variance, logDensity: maximum + Math.log(total) - Math.log(2 * Math.PI * variance) };
    }
    function mixtureScore(point, r, sigma, model = diffusionMixture()) {
        const p = mixturePosterior(point, r, sigma, model);
        return point.map((x, k) => (r * p.mean[k] - x) / p.variance);
    }
    function diffusionVelocity(point, r, sigma, model = diffusionMixture()) {
        const p = mixturePosterior(point, r, sigma, model);
        // (x + score_r(x)) / r, analytically cancelled to remain regular at r=0.
        return point.map((x, k) => (r * (sigma * sigma - 1) * x + p.mean[k]) / p.variance);
    }
    function diffusionPaths(sigma, options = {}) {
        const model = options.model || diffusionMixture(), steps = options.steps || 320;
        const source = options.source || gaussianCloud(options.count || 240);
        if (sigma < 0) throw new RangeError("Gaussian width must be nonnegative");
        // r=sin(theta) resolves the sharp final denoising stage. At sigma=0,
        // stop short of the singular endpoint and take its nearest-center limit.
        const end = Math.PI / 2 - (sigma === 0 ? 1e-4 : 0), h = end / steps;
        const velocity = state => {
            const theta = state[0], scale = Math.cos(theta);
            const v = diffusionVelocity(state.slice(1), Math.sin(theta), sigma, model);
            return [1, scale * v[0], scale * v[1]];
        };
        return source.map(point => {
            let state = [0, ...point];
            const path = [point.slice()];
            for (let k = 0; k < steps; k++) {
                state = rk4(state, h, velocity);
                state[0] = (k + 1) * h;
                path.push(state.slice(1));
            }
            if (sigma === 0) {
                const last = path[path.length - 1];
                const distances = model.means.map(m => (m[0] - last[0]) ** 2 + (m[1] - last[1]) ** 2);
                path[path.length - 1] = model.means[distances.indexOf(Math.min(...distances))].slice();
            }
            return path;
        });
    }
    function optimalAssignment(source, target, weights = [1, 1], warmStart = null) {
        const n = source.length;
        if (!n || target.length !== n) throw new RangeError("Matching needs equal, nonempty point clouds");
        if (weights.length !== 2 || weights.some(w => !Number.isFinite(w) || w <= 0)) {
            throw new RangeError("Matching weights must be two positive, finite numbers");
        }
        // Center each cloud before solving: independent translations add only
        // row/column terms to a quadratic cost and do not change its assignment.
        const sourceCenter = [0, 1].map(d => sum(source.map(x => x[d])) / n);
        const targetCenter = [0, 1].map(d => sum(target.map(y => y[d])) / n);
        const shift = sourceCenter.map((x, d) => x - targetCenter[d]);
        const centeredSource = source.map(x => x.map((z, d) => z - sourceCenter[d]));
        const centeredTarget = target.map(y => y.map((z, d) => z - targetCenter[d]));
        const rowTerms = centeredSource.map(x => sum(weights.map((w, d) => w * (2 * shift[d] * x[d] + shift[d] ** 2))));
        const columnTerms = centeredTarget.map(y => -2 * sum(weights.map((w, d) => w * shift[d] * y[d])));
        const costs = centeredSource.map(x => Float64Array.from(centeredTarget, y =>
            weights[0] * (x[0] - y[0]) ** 2 + weights[1] * (x[1] - y[1]) ** 2));
        // Hungarian primal-dual algorithm: unregularized one-to-one matching.
        const u = new Float64Array(n + 1), v = new Float64Array(n + 1);
        const p = new Int32Array(n + 1), way = new Int32Array(n + 1);
        const matched = new Uint8Array(n);
        if (warmStart && warmStart.permutation.length === n && warmStart.dualTarget.length === n) {
            // Rebuild feasible row potentials for the new cost. Retain only
            // tight edges of the previous assignment, then augment the rest.
            v.set(warmStart.centeredDualTarget || warmStart.dualTarget.map((value, j) => value - columnTerms[j]), 1);
            for (let i = 0; i < n; i++) {
                let minimum = Infinity;
                for (let j = 0; j < n; j++) minimum = Math.min(minimum, costs[i][j] - v[j + 1]);
                u[i + 1] = minimum;
                const j = warmStart.permutation[i];
                if (Math.abs(costs[i][j] - minimum - v[j + 1]) < 1e-11) {
                    p[j + 1] = i + 1; matched[i] = 1;
                }
            }
        } else {
            // Row/column reduction supplies feasible duals and an inexpensive
            // partial matching before the augmenting-path phase.
            for (let i = 0; i < n; i++) u[i + 1] = Math.min(...costs[i]);
            for (let j = 0; j < n; j++) {
                let minimum = Infinity;
                for (let i = 0; i < n; i++) minimum = Math.min(minimum, costs[i][j] - u[i + 1]);
                v[j + 1] = minimum;
            }
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                if (!p[j + 1] && Math.abs(costs[i][j] - u[i + 1] - v[j + 1]) < 1e-11) {
                    p[j + 1] = i + 1; matched[i] = 1; break;
                }
            }
        }
        for (let i = 1; i <= n; i++) {
            if (matched[i - 1]) continue;
            p[0] = i;
            let j0 = 0;
            const minv = new Float64Array(n + 1).fill(Infinity), used = new Uint8Array(n + 1);
            do {
                used[j0] = 1;
                const i0 = p[j0];
                let delta = Infinity, j1 = 0;
                for (let j = 1; j <= n; j++) if (!used[j]) {
                    const cur = costs[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
                    if (minv[j] < delta) { delta = minv[j]; j1 = j; }
                }
                for (let j = 0; j <= n; j++) {
                    if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
                    else minv[j] -= delta;
                }
                j0 = j1;
            } while (p[j0] !== 0);
            do {
                const j1 = way[j0]; p[j0] = p[j1]; j0 = j1;
            } while (j0 !== 0);
        }
        const permutation = new Array(n);
        for (let j = 1; j <= n; j++) permutation[p[j] - 1] = j - 1;
        return { permutation, cost: sum(permutation.map((j, i) =>
            weights[0] * (source[i][0] - target[j][0]) ** 2 + weights[1] * (source[i][1] - target[j][1]) ** 2)) / n,
            dualSource: Array.from(u.slice(1), (value, i) => value + rowTerms[i]),
            dualTarget: Array.from(v.slice(1), (value, j) => value + columnTerms[j]),
            centeredDualTarget: Array.from(v.slice(1)) };
    }
    function inverseOTMixtures() {
        return { sourceMeans: [[-7.8, -1.6], [-2.2, 1.6]],
            targetMeans: [[3.4, 2.8], [6.6, -2.8]], sigma: 0.7 };
    }
    function inverseOTSample(count = 200, seed = 17, options = {}) {
        if (!Number.isInteger(count) || count < 1 || !Number.isInteger(seed)) {
            throw new RangeError("Sampling needs a positive integer count and an integer seed");
        }
        let state = seed >>> 0;
        // Independent mixture draws in each marginal. Counts share raw prefixes,
        // but their reference OT pairing must be recomputed for each count.
        function random() {
            let t = state = (state + 0x6D2B79F5) >>> 0;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return (((t ^ t >>> 14) >>> 0) + 0.5) / 4294967296;
        }
        const model = inverseOTMixtures(), source = [], target = [];
        function draw(means) {
            const mean = means[random() < 0.5 ? 0 : 1];
            const radius = Math.sqrt(-2 * Math.log(random())), angle = 2 * Math.PI * random();
            return [mean[0] + model.sigma * radius * Math.cos(angle),
                mean[1] + model.sigma * radius * Math.sin(angle)];
        }
        for (let i = 0; i < count; i++) {
            source.push(draw(model.sourceMeans)); target.push(draw(model.targetMeans));
        }
        if (options.reference === false) return { source, target, model, seed: seed >>> 0 };
        const referenceMatching = optimalAssignment(source, target);
        return { source, target, observedPermutation: referenceMatching.permutation,
            referenceMatching, model, seed: seed >>> 0 };
    }
    function inverseOTGap(sample, theta, warmStart = null) {
        if (!Number.isFinite(theta) || theta <= 0) throw new RangeError("The cost parameter must be positive and finite");
        const { source, target } = sample, n = source.length;
        const matching = optimalAssignment(source, target, [theta, 1], warmStart);
        const sourceCenter = [0, 1].map(d => sum(source.map(x => x[d])) / n);
        const targetCenter = [0, 1].map(d => sum(target.map(y => y[d])) / n);
        let slope = 0, intercept = 0, observedCost = 0;
        source.forEach((x, i) => {
            const y = target[sample.observedPermutation ? sample.observedPermutation[i] : i];
            const z = target[matching.permutation[i]];
            const a = (x[0] - y[0]) ** 2 / (2 * n), b = (x[1] - y[1]) ** 2 / (2 * n);
            observedCost += theta * a + b;
            // Translation terms cancel between permutations. Removing them
            // before subtraction avoids losing precision for far-apart clouds.
            const centered = [0, 1].map(d => {
                const xi = x[d] - sourceCenter[d];
                return ((xi - (y[d] - targetCenter[d])) ** 2 - (xi - (z[d] - targetCenter[d])) ** 2) / (2 * n);
            });
            slope += centered[0]; intercept += centered[1];
        });
        const optimalCost = matching.cost / 2;
        return { theta, gap: Math.max(0, theta * slope + intercept), observedCost, optimalCost,
            slope, intercept, matching };
    }
    function* inverseOTCurveSteps(sample, left = 0.2, right = 2.6, maxError = 1e-10) {
        if (!(left > 0 && right > left && Number.isFinite(right))) throw new RangeError("Invalid cost slice");
        if (!(maxError >= 1e-10 && Number.isFinite(maxError))) throw new RangeError("Invalid curve error bound");
        const cache = new Map(), tolerance = 1e-10;
        function* oracle(theta) {
            if (!cache.has(theta)) {
                let nearest = { theta: 1, matching: sample.referenceMatching };
                for (const previous of cache.values()) {
                    if (Math.abs(previous.theta - theta) < Math.abs(nearest.theta - theta)) nearest = previous;
                }
                const { gap, slope, intercept, matching } = inverseOTGap(sample, theta, nearest.matching);
                cache.set(theta, { theta, gap, slope, intercept, matching });
                yield { solves: cache.size };
            }
            return cache.get(theta);
        }
        // The gap is a maximum of assignment lines. At the intersection of
        // two active lines, one OT solve either certifies the envelope between
        // them or finds another active line. No entropy or spline smoothing.
        function* trace(a, b, depth = 0) {
            if (Math.abs(b.slope - a.slope) < tolerance || b.theta - a.theta < tolerance) return [a, b];
            if (depth > 52) throw new Error("Could not resolve the assignment envelope");
            let theta = (a.intercept - b.intercept) / (b.slope - a.slope);
            if (!(theta > a.theta + 1e-12 && theta < b.theta - 1e-12)) theta = (a.theta + b.theta) / 2;
            const middle = yield* oracle(theta);
            const lower = Math.max(a.slope * theta + a.intercept, b.slope * theta + b.intercept, 0);
            // The two supporting lines give a lower bound, while the chords
            // through these exact evaluations give an upper bound. Their gap
            // is largest at this intersection, certifying the curve error.
            // Resolve the edges of the zero-loss interval to numerical precision.
            const allowedError = a.gap < tolerance || b.gap < tolerance ? tolerance : maxError;
            if (middle.gap <= lower + allowedError) return [a, middle, b];
            const first = yield* trace(a, middle, depth + 1), second = yield* trace(middle, b, depth + 1);
            return first.concat(second.slice(1));
        }
        const a = yield* oracle(left), b = yield* oracle(right);
        let nodes;
        if (left < 1 && right > 1) {
            const reference = yield* oracle(1), first = yield* trace(a, reference), second = yield* trace(reference, b);
            nodes = first.concat(second.slice(1));
        } else nodes = yield* trace(a, b);
        const points = nodes.map(({ theta, gap }) => ({ theta, gap }));
        const zeros = points.filter(p => p.gap < tolerance);
        return { points, zeroInterval: zeros.length ? [zeros[0].theta, zeros[zeros.length - 1].theta] : null,
            solves: cache.size, maxError };
    }
    function inverseOTCurve(sample, left = 0.2, right = 2.6, maxError = 1e-10) {
        const steps = inverseOTCurveSteps(sample, left, right, maxError);
        let step;
        do { step = steps.next(); } while (!step.done);
        return step.value;
    }
    function diffusionComparison(sigma, options = {}) {
        const model = options.model || diffusionMixture();
        const paths = diffusionPaths(sigma, { ...options, model });
        const source = paths.map(p => p[0]), target = paths.map(p => p[p.length - 1]);
        const labels = target.map(y => {
            const scores = model.means.map((m, j) => (y[0] - m[0]) ** 2 + (y[1] - m[1]) ** 2 -
                2 * sigma * sigma * Math.log(model.weights[j]));
            return scores.indexOf(Math.min(...scores));
        });
        const matching = optimalAssignment(source, target);
        const diffusionCost = sum(source.map((x, i) => (x[0] - target[i][0]) ** 2 + (x[1] - target[i][1]) ** 2)) / source.length;
        const changed = sum(matching.permutation.map((j, i) => Number(labels[j] !== labels[i])));
        return { sigma, model, paths, source, target, labels, matching, diffusionCost, changed };
    }
    const api = { sum, normalize, matvec, transpose, l1, iterate, banana, rk4, bananaPaths,
        markovMatrix, sinkhornSystem, simplexBoundary, sinkhornStep, sinkhornResidual, covariance, inverse2,
        gaussianBarycenter, ellipsePoints, gaussianKL, gaussianKLFlow, gaussianKLExample,
        multiply2, determinant2, eulerExample, diffusionMixture, gaussianCloud,
        mixturePosterior, mixtureScore, diffusionVelocity, diffusionPaths, optimalAssignment, diffusionComparison,
        inverseOTMixtures, inverseOTSample, inverseOTGap, inverseOTCurve, inverseOTCurveSteps };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.BlogMath = api;
}(typeof globalThis !== "undefined" ? globalThis : this));
