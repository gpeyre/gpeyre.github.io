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
    function grid(evaluate, count = 81) {
        const values = new Float64Array(count * count);
        for (let j = 0; j < count; j++) for (let i = 0; i < count; i++) {
            values[j * count + i] = evaluate(-1 + 2 * i / (count - 1), -1 + 2 * j / (count - 1));
        }
        return { count, values };
    }
    function certificate(evaluate) {
        return evaluate(-1, 0) + evaluate(0, -1) + evaluate(1, 1) + 3 * evaluate(0, 0) -
            2 * (evaluate(-0.5, -0.5) + evaluate(0, 0.5) + evaluate(0.5, 0));
    }
    const api = { widths, relu, targetTwo, targetThree, exactTwo, exactThree, squareSpline, evaluator, grid, certificate };
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.BlogICNN = api;
}(typeof window !== "undefined" ? window : globalThis));
