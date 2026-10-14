/* Finite-width convex-network models and independent reference constructions. */
(function (root) {
    "use strict";
    const relu = x => Math.max(0, x);
    const widths = [1, 2, 4, 8, 16, 32, 64];
    function targetTwo(x, y) { return Math.max(0, x, y); }
    function targetThree(x, y) { return Math.max(0, x, y, -x - y - 0.5); }
    function exactTwo(x, y) { return relu(relu(x - y) + y); }
    function exactThree(x, y) {
        return relu(relu(relu(x - y) + x + 2 * y + 0.5) - x - y - 0.5);
    }
    function squareSpline(x, neurons) {
        const step = 2 / (neurons + 1);
        let value = 1 + (-2 + step) * (x + 1);
        for (let j = 1; j <= neurons; j++) value += 2 * step * relu(x + 1 - j * step);
        return value;
    }
    function evaluator(model) {
        const width = model.width, z = new Float64Array(width);
        return function (x, y) {
            let result = model.a[0] * x + model.a[1] * y + model.b;
            for (let i = 0; i < width; i++) z[i] = relu(model.a1[i][0] * x + model.a1[i][1] * y + model.b1[i]);
            if (model.depth === 2) {
                for (let i = 0; i < width; i++) result += model.c[i] * z[i];
            } else {
                for (let i = 0; i < width; i++) {
                    let activation = model.a2[i][0] * x + model.a2[i][1] * y + model.b2[i];
                    for (let j = 0; j < width; j++) activation += model.w2[i][j] * z[j];
                    result += model.c[i] * relu(activation);
                }
            }
            return result;
        };
    }
    function grid(evaluate, count = 81, bounds = [-1, 1]) {
        const values = new Float64Array(count * count);
        for (let j = 0; j < count; j++) for (let i = 0; i < count; i++) {
            values[j * count + i] = evaluate(bounds[0] + (bounds[1] - bounds[0]) * i / (count - 1),
                bounds[0] + (bounds[1] - bounds[0]) * j / (count - 1));
        }
        return { count, values, bounds: bounds.slice() };
    }
    function residualGrid(evaluate, target, count = 81, bounds = [-1, 1]) {
        return grid((x, y) => evaluate(x, y) - target(x, y), count, bounds);
    }
    function clipping(values, limit) {
        let below = 0, above = 0, minimum = Infinity, maximum = -Infinity;
        for (const value of values) {
            if (value < -limit - 1e-12) below++;
            if (value > limit + 1e-12) above++;
            minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
        }
        return { below, above, count: below + above, minimum, maximum };
    }
    function diagonalSlice(model, exact = false) {
        const lower = -0.25, upper = 0;
        if (exact) return { lower, upper, points: [{ t: lower, value: 0 }, { t: upper, value: 0 }], minimum: 0, maximum: 0 };
        const slopes = model.a1.map(row => row[0] + row[1]);
        const first = [lower, upper];
        slopes.forEach((slope, i) => {
            const root = -model.b1[i] / slope;
            if (Math.abs(slope) > 1e-14 && root > lower && root < upper) first.push(root);
        });
        first.sort((a, b) => a - b);
        const knots = first.slice();
        if (model.depth === 3) for (let interval = 0; interval < first.length - 1; interval++) {
            const left = first[interval], right = first[interval + 1], middle = (left + right) / 2;
            for (let i = 0; i < model.width; i++) {
                let slope = model.a2[i][0] + model.a2[i][1], bias = model.b2[i];
                for (let j = 0; j < model.width; j++) if (slopes[j] * middle + model.b1[j] > 0) {
                    slope += model.w2[i][j] * slopes[j]; bias += model.w2[i][j] * model.b1[j];
                }
                const root = -bias / slope;
                if (Math.abs(slope) > 1e-14 && root > left && root < right) knots.push(root);
            }
        }
        knots.sort((a, b) => a - b);
        const evaluate = evaluator(model), points = knots.filter((t, i) => i === 0 || t - knots[i - 1] > 1e-12)
            .map(t => ({ t, value: evaluate(t, t) }));
        return { lower, upper, points, minimum: Math.min(...points.map(point => point.value)),
            maximum: Math.max(...points.map(point => point.value)) };
    }
    function certificate(evaluate) {
        return evaluate(-1, 0) + evaluate(0, -1) + evaluate(1, 1) + 3 * evaluate(0, 0) -
            2 * (evaluate(-0.5, -0.5) + evaluate(0, 0.5) + evaluate(0.5, 0));
    }
    const api = { widths, relu, targetTwo, targetThree, exactTwo, exactThree, squareSpline, evaluator,
        grid, residualGrid, clipping, diagonalSlice, certificate };
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.BlogICNN = api;
}(typeof window !== "undefined" ? window : globalThis));
