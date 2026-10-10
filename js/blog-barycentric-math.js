/* Unequal-cardinality quadratic OT and its conditional barycenters. */
(function (root) {
    "use strict";

    function validatePoints(points, name) {
        if (!Array.isArray(points) || !points.length || points.some(p =>
            !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v)))) {
            throw new Error(name + " must be a nonempty array of finite two-dimensional points.");
        }
    }
    function costs(source, target) {
        validatePoints(source, "Source"); validatePoints(target, "Target");
        return source.map(x => target.map(y => ((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2) / 2));
    }
    function sample(n = 12, m = 240, motion = 0) {
        if (!Number.isInteger(n) || n < 1 || !Number.isInteger(m) || m < 1 || !Number.isFinite(motion)) {
            throw new Error("Positive integer counts and finite target motion are required.");
        }
        // A fixed low-discrepancy spiral avoids random jumps while counts change.
        const spiral = (count, shift) => Array.from({ length: count }, (_, k) => {
            const angle = (k + shift) * Math.PI * (3 - Math.sqrt(5));
            const radius = Math.sqrt((k + 0.5) / count);
            return [radius * Math.cos(angle), radius * Math.sin(angle)];
        });
        const source = spiral(n, 0).map(p => [-1.65 + 0.9 * p[0], 1.15 * p[1]]);
        const angle = motion * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
        const target = spiral(m, 0.6).map(p => {
            const x = 1.15 * p[0] + 0.28 * Math.sin(3 * p[1] + angle), y = 0.82 * p[1];
            return [1.65 + c * x - s * y, s * x + c * y];
        });
        return { source, target };
    }
    function logsum(values) {
        const maximum = Math.max(...values);
        let sum = 0;
        for (const value of values) sum += Math.exp(value - maximum);
        return maximum + Math.log(sum);
    }
    function projection(coupling, target) {
        return coupling.map(row => {
            const mass = row.reduce((s, v) => s + v, 0);
            if (!(mass > 0)) throw new Error("The coupling must have positive row masses.");
            return [0, 1].map(d => row.reduce((s, v, j) => s + v * target[j][d], 0) / mass);
        });
    }
    function finish(source, target, coupling, extra) {
        const n = source.length, m = target.length, a = Array(n).fill(1 / n), b = Array(m).fill(1 / m);
        // Repeated coordinates represent one atom of alpha, not distinct inputs
        // to a map. Uniform source masses allow us to symmetrize their rows:
        // this preserves both marginals, every cost, and the exact dual certificate.
        const repeatedSources = new Map();
        source.forEach((point, i) => {
            const key = JSON.stringify(point);
            if (!repeatedSources.has(key)) repeatedSources.set(key, []);
            repeatedSources.get(key).push(i);
        });
        repeatedSources.forEach(indices => {
            if (indices.length < 2) return;
            const row = Array(m).fill(0);
            indices.forEach(i => coupling[i].forEach((mass, j) => { row[j] += mass / indices.length; }));
            indices.forEach(i => { coupling[i] = row.slice(); });
        });
        const rows = coupling.map(row => row.reduce((s, v) => s + v, 0));
        const columns = Array(m).fill(0);
        let cost = 0, edges = 0;
        coupling.forEach((row, i) => row.forEach((mass, j) => {
            columns[j] += mass; cost += mass * ((source[i][0] - target[j][0]) ** 2 +
                (source[i][1] - target[j][1]) ** 2) / 2;
            if (mass > 0) edges++;
        }));
        const residual = Math.max(...rows.map((v, i) => Math.abs(v - a[i])),
            ...columns.map((v, j) => Math.abs(v - b[j])));
        return { source, target, a, b, coupling, barycenters: projection(coupling, target),
            residual, cost, edges, ...extra };
    }

    function* sinkhornSteps(source, target, epsilon = 0.2, options = {}) {
        if (!Number.isFinite(epsilon) || epsilon <= 0) throw new Error("Epsilon must be positive.");
        const cost = costs(source, target), n = source.length, m = target.length;
        const tolerance = options.tolerance === undefined ? 1e-10 : options.tolerance;
        const limit = options.maxIterations || 10000;
        const kernel = cost.map(row => row.map(c => -c / epsilon));
        const loga = -Math.log(n), logb = -Math.log(m);
        const u = Array(n).fill(0), v = Array(m).fill(0);
        let residual = Infinity, iteration = 0;
        for (; iteration < limit; iteration++) {
            for (let i = 0; i < n; i++) u[i] = loga - logsum(kernel[i].map((k, j) => k + v[j]));
            for (let j = 0; j < m; j++) {
                const column = Array(n);
                for (let i = 0; i < n; i++) column[i] = kernel[i][j] + u[i];
                v[j] = logb - logsum(column);
            }
            if ((iteration + 1) % 5 === 0 || iteration === limit - 1) {
                residual = 0;
                for (let i = 0; i < n; i++) {
                    const rowMass = Math.exp(u[i] + logsum(kernel[i].map((k, j) => k + v[j])));
                    residual = Math.max(residual, Math.abs(rowMass - 1 / n));
                }
                if (residual <= tolerance) { iteration++; break; }
                yield { iterations: iteration + 1, residual, mode: "entropic" };
            }
        }
        const coupling = kernel.map((row, i) => row.map((k, j) => Math.exp(k + u[i] + v[j])));
        return finish(source, target, coupling, { mode: "entropic", epsilon, logV: v,
            iterations: iteration, converged: residual <= tolerance });
    }

    class MinHeap {
        constructor() { this.values = []; }
        push(distance, node) {
            const item = [distance, node], values = this.values;
            let index = values.length; values.push(item);
            while (index > 0) {
                const parent = (index - 1) >> 1;
                if (values[parent][0] <= distance) break;
                values[index] = values[parent]; index = parent;
            }
            values[index] = item;
        }
        pop() {
            const values = this.values, first = values[0], last = values.pop();
            if (values.length) {
                let index = 0;
                while (true) {
                    let child = index * 2 + 1;
                    if (child >= values.length) break;
                    if (child + 1 < values.length && values[child + 1][0] < values[child][0]) child++;
                    if (values[child][0] >= last[0]) break;
                    values[index] = values[child]; index = child;
                }
                values[index] = last;
            }
            return first;
        }
    }
    function gcd(a, b) { while (b) { const next = a % b; a = b; b = next; } return a; }
    function* exactSteps(source, target) {
        const cost = costs(source, target), n = source.length, m = target.length;
        const divisor = gcd(n, m), total = n * m / divisor;
        const start = n + m, end = start + 1, size = end + 1;
        const graph = Array.from({ length: size }, () => []), transport = [];
        function edge(from, to, capacity, value) {
            const forward = { to, capacity, cost: value, reverse: graph[to].length };
            const backward = { to: from, capacity: 0, cost: -value, reverse: graph[from].length };
            graph[from].push(forward); graph[to].push(backward); return forward;
        }
        for (let i = 0; i < n; i++) edge(start, i, m / divisor, 0);
        for (let i = 0; i < n; i++) {
            transport[i] = [];
            for (let j = 0; j < m; j++) transport[i][j] = edge(i, n + j, total + 1, cost[i][j]);
        }
        for (let j = 0; j < m; j++) edge(n + j, end, n / divisor, 0);
        const potentials = Array(size).fill(0);
        let flow = 0, iteration = 0;
        while (flow < total) {
            const distances = Array(size).fill(Infinity), previousNode = Array(size).fill(-1), previousEdge = Array(size).fill(-1);
            const heap = new MinHeap(); distances[start] = 0; heap.push(0, start);
            while (heap.values.length) {
                const [distance, node] = heap.pop();
                if (distance > distances[node]) continue;
                graph[node].forEach((link, index) => {
                    if (link.capacity <= 0) return;
                    // Roundoff may make an otherwise nonnegative reduced cost tiny and negative.
                    const rawReduced = link.cost + potentials[node] - potentials[link.to];
                    if (rawReduced < -1e-9) throw new Error("The min-cost-flow dual feasibility check failed.");
                    const reduced = Math.max(0, rawReduced);
                    const next = distance + reduced;
                    if (next + 1e-13 < distances[link.to]) {
                        distances[link.to] = next; previousNode[link.to] = node; previousEdge[link.to] = index;
                        heap.push(next, link.to);
                    }
                });
            }
            if (!Number.isFinite(distances[end])) throw new Error("The transport flow is infeasible.");
            distances.forEach((distance, node) => { if (Number.isFinite(distance)) potentials[node] += distance; });
            let amount = total - flow;
            for (let node = end; node !== start; node = previousNode[node]) {
                amount = Math.min(amount, graph[previousNode[node]][previousEdge[node]].capacity);
            }
            for (let node = end; node !== start; node = previousNode[node]) {
                const link = graph[previousNode[node]][previousEdge[node]];
                link.capacity -= amount; graph[node][link.reverse].capacity += amount;
            }
            flow += amount; iteration++;
            yield { iterations: iteration, progress: flow / total, mode: "exact" };
        }
        const coupling = transport.map(row => row.map(link => graph[link.to][link.reverse].capacity / total));
        const dualSource = potentials.slice(0, n).map(v => -v), dualTarget = potentials.slice(n, n + m);
        const result = finish(source, target, coupling, { mode: "exact", epsilon: 0, iterations: iteration,
            converged: true, dualSource, dualTarget });
        result.dualGap = result.cost - dualSource.reduce((s, v) => s + v / n, 0) - dualTarget.reduce((s, v) => s + v / m, 0);
        result.dualSlack = Math.min(...cost.flatMap((row, i) => row.map((value, j) => value - dualSource[i] - dualTarget[j])));
        result.converged = result.residual < 1e-12 && Math.abs(result.dualGap) < 1e-8 && result.dualSlack > -1e-9;
        return result;
    }
    function complete(steps) { let state; do { state = steps.next(); } while (!state.done); return state.value; }
    function sinkhorn(source, target, epsilon, options) { return complete(sinkhornSteps(source, target, epsilon, options)); }
    function exact(source, target) { return complete(exactSteps(source, target)); }

    function entropicPotential(point, target, epsilon, logV) {
        validatePoints([point], "Point"); validatePoints(target, "Target");
        if (!(epsilon > 0) || !Array.isArray(logV) || logV.length !== target.length || logV.some(v => !Number.isFinite(v))) {
            throw new Error("A positive epsilon and finite target log-scalings are required.");
        }
        // Sinkhorn logV already includes the reference masses b_j. Thus g_j
        // in the article's b_j exp(g_j/epsilon) convention is epsilon(logV_j-log b_j).
        const values = target.map((y, j) => (point[0] * y[0] + point[1] * y[1] -
            (y[0] ** 2 + y[1] ** 2) / 2) / epsilon + logV[j]);
        const total = logsum(values), weights = values.map(v => Math.exp(v - total));
        const gradient = [0, 1].map(d => weights.reduce((s, w, j) => s + w * target[j][d], 0));
        const hessian = [0, 1].map(d => [0, 1].map(e => weights.reduce((s, w, j) =>
            s + w * (target[j][d] - gradient[d]) * (target[j][e] - gradient[e]), 0) / epsilon));
        return { value: epsilon * total, gradient, hessian, weights };
    }

    const api = { sample, costs, projection, sinkhornSteps, exactSteps, sinkhorn, exact, entropicPotential };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.BlogBarycentric = api;
}(typeof globalThis !== "undefined" ? globalThis : this));
