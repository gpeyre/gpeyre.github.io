/* Interactive comparison of actual fitted ICNNs with convex reference targets. */
(function () {
    "use strict";
    const M = window.BlogICNN, models = window.BlogICNNModels;
    if (!M || !models) return;
    document.querySelectorAll('[data-figure="icnn"]').forEach(init);

    function init(figure) {
        const slider = figure.querySelector('[data-param="width"]');
        const extra = figure.querySelector("[data-exact]"), status = figure.querySelector("[data-status]");
        const canvases = Object.fromEntries(Array.from(figure.querySelectorAll("canvas[data-panel]"), canvas => [canvas.dataset.panel, canvas]));
        const cache = new Map(), targetGrids = { two: M.grid(M.targetTwo), three: M.grid(M.targetThree) };
        const levels = [0.15, 0.35, 0.55, 0.75, 0.95, 1.15, 1.35];
        let frame = null;
        function schedule() {
            if (frame === null) frame = requestAnimationFrame(() => { frame = null; render(); });
        }
        function prepare(canvas, height) {
            const width = canvas.getBoundingClientRect().width, ratio = window.devicePixelRatio || 1;
            const pixels = [Math.round(width * ratio), Math.round(height * ratio)];
            if (canvas.width !== pixels[0] || canvas.height !== pixels[1]) { canvas.width = pixels[0]; canvas.height = pixels[1]; }
            canvas.style.height = height + "px";
            const ctx = canvas.getContext("2d");
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
            ctx.font = '12px "Open Sans", sans-serif'; ctx.lineWidth = 1;
            return { ctx, width, height };
        }
        function axes(ctx, box, oneDimensional) {
            const { left, top, side } = box;
            ctx.setLineDash([]); ctx.strokeStyle = "#698080"; ctx.lineWidth = 1;
            ctx.strokeRect(left, top, side, box.height || side);
            ctx.fillStyle = "#405958"; ctx.textAlign = "center";
            for (const value of [-1, 0, 1]) {
                const x = left + (value + 1) * side / 2;
                ctx.fillText(String(value), x, top + (box.height || side) + 18);
            }
            ctx.fillText("x", left + side / 2, top + (box.height || side) + 35);
            ctx.textAlign = "right";
            for (const value of oneDimensional ? [0, 0.5, 1] : [-1, 0, 1]) {
                const y = oneDimensional ? top + box.height * (1.08 - value) / 1.16 : top + (1 - value) * side / 2;
                ctx.fillText(String(value), left - 7, y + 4);
            }
            ctx.textAlign = "left"; ctx.fillText(oneDimensional ? "value" : "y", left - 21, top - 9);
        }
        function drawOne(neurons) {
            const canvas = canvases.one, { ctx, width } = prepare(canvas, 230);
            const box = { left: 43, top: 22, side: width - 60, height: 160 };
            const map = (x, y) => [box.left + (x + 1) * box.side / 2, box.top + box.height * (1.08 - y) / 1.16];
            ctx.fillStyle = "#f4f8f7"; ctx.fillRect(box.left, box.top, box.side, box.height);
            ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, box.side, box.height); ctx.clip();
            ctx.strokeStyle = "#008e9d"; ctx.lineWidth = 2.8; ctx.beginPath();
            for (let i = 0; i <= 500; i++) {
                const x = -1 + i / 250, point = map(x, M.squareSpline(x, neurons));
                if (i === 0) ctx.moveTo(...point); else ctx.lineTo(...point);
            }
            ctx.stroke(); ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = "#202929"; ctx.beginPath();
            for (let i = 0; i <= 500; i++) {
                const x = -1 + i / 250, point = map(x, x * x);
                if (i === 0) ctx.moveTo(...point); else ctx.lineTo(...point);
            }
            ctx.stroke(); ctx.restore(); axes(ctx, box, true);
            canvas.setAttribute("aria-label", "The target x squared is dashed black; its convex linear interpolant with " + neurons +
                " ReLU neurons is solid teal. Exact uniform error " + (1 / (neurons + 1) ** 2).toPrecision(3) + ".");
        }
        function contour(ctx, grid, level, box) {
            const n = grid.count, values = grid.values, scale = box.side / (n - 1);
            const corner = (i, j) => [box.left + i * scale, box.top + (n - 1 - j) * scale];
            const nodes = new Map(), segments = [];
            for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
                const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
                const v = corners.map(([x, y]) => values[y * n + x]), hits = [];
                const keys = ["h" + i + "," + j, "v" + (i + 1) + "," + j,
                    "h" + i + "," + (j + 1), "v" + i + "," + j];
                for (let edge = 0; edge < 4; edge++) {
                    const next = (edge + 1) % 4;
                    if ((v[edge] < level) === (v[next] < level)) continue;
                    const weight = (level - v[edge]) / (v[next] - v[edge]);
                    const a = corner(...corners[edge]), b = corner(...corners[next]);
                    const key = keys[edge];
                    if (!nodes.has(key)) nodes.set(key, { point: [a[0] + weight * (b[0] - a[0]), a[1] + weight * (b[1] - a[1])], edges: [] });
                    hits.push(key);
                }
                for (let k = 0; k + 1 < hits.length; k += 2) {
                    const id = segments.length;
                    segments.push({ ends: [hits[k], hits[k + 1]], used: false });
                    nodes.get(hits[k]).edges.push(id); nodes.get(hits[k + 1]).edges.push(id);
                }
            }
            // Stitch grid-cell segments into paths so the target's dash pattern
            // continues around corners instead of restarting in every tiny cell.
            ctx.beginPath();
            function trace(start) {
                let key = start;
                ctx.moveTo(...nodes.get(key).point);
                while (true) {
                    const edge = nodes.get(key).edges.find(id => !segments[id].used);
                    if (edge === undefined) break;
                    const segment = segments[edge]; segment.used = true;
                    key = segment.ends[0] === key ? segment.ends[1] : segment.ends[0];
                    ctx.lineTo(...nodes.get(key).point);
                }
            }
            nodes.forEach((node, key) => { if (node.edges.length === 1) trace(key); });
            segments.forEach(segment => { if (!segment.used) trace(segment.ends[0]); });
            ctx.stroke();
        }
        function color(value) {
            if (value < 0) {
                const t = Math.min(1, -value / 0.3);
                return [Math.round(236 + 12 * t), Math.round(246 - 66 * t), Math.round(240 - 112 * t)];
            }
            const t = Math.min(1, value / 1.55);
            return [Math.round(236 - 211 * t), Math.round(246 - 111 * t), Math.round(240 - 94 * t)];
        }
        function drawTwo(key, index, exact) {
            const canvas = canvases[key], width = canvas.getBoundingClientRect().width;
            const { ctx } = prepare(canvas, width + 5), side = width - 59;
            const box = { left: 39, top: 20, side };
            const cacheKey = key + (exact ? "exact" : index);
            if (!cache.has(cacheKey)) {
                const evaluate = exact ? key === "two" ? M.exactTwo : M.exactThree : M.evaluator(models[key][index]);
                cache.set(cacheKey, M.grid(evaluate));
            }
            const field = cache.get(cacheKey), n = field.count;
            const heat = document.createElement("canvas"); heat.width = n; heat.height = n;
            const heatContext = heat.getContext("2d"), pixels = heatContext.createImageData(n, n);
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
                const offset = 4 * ((n - 1 - j) * n + i), rgb = color(field.values[j * n + i]);
                pixels.data.set([...rgb, 255], offset);
            }
            heatContext.putImageData(pixels, 0, 0);
            ctx.imageSmoothingEnabled = true; ctx.drawImage(heat, box.left, box.top, side, side);
            ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, side, side); ctx.clip();
            // White underlay keeps the fitted contours visible on the full color scale.
            ctx.setLineDash([]); ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(255,255,255,.95)";
            levels.forEach(level => contour(ctx, field, level, box));
            ctx.lineWidth = 1.4; ctx.strokeStyle = "#007b91";
            levels.forEach(level => contour(ctx, field, level, box));
            ctx.lineWidth = 1.5; ctx.strokeStyle = "#242a29"; ctx.setLineDash([5, 4]);
            levels.forEach(level => contour(ctx, targetGrids[key], level, box));
            ctx.restore(); axes(ctx, box, false);
            const barLeft = box.left + side - 119, barTop = 3;
            for (let i = 0; i < 90; i++) { ctx.fillStyle = "rgb(" + color(-0.3 + 1.85 * i / 89).join(",") + ")"; ctx.fillRect(barLeft + i, barTop, 1.2, 7); }
            ctx.font = '9px "Open Sans", sans-serif'; ctx.fillStyle = "#405958"; ctx.textAlign = "right"; ctx.fillText("−0.3", barLeft - 3, barTop + 7);
            ctx.textAlign = "left"; ctx.fillText("1.55", barLeft + 93, barTop + 7);
            canvas.setAttribute("aria-label", (key === "two" ? "Three-plane" : "Four-plane") + " convex target on the square minus one to one. " +
                "Dashed black contours show the target; solid teal contours and colors show " +
                (exact ? "the exact representation with one extra hidden layer." : "the fitted depth " + models[key][index].depth + " ICNN of width " + models.widths[index] + "."));
        }
        function render() {
            const index = Number(slider.value), neurons = models.widths[index], exact = !!(extra && extra.checked);
            figure.querySelector('[data-value="width"]').textContent = neurons;
            slider.setAttribute("aria-valuetext", neurons + (neurons === 1 ? " neuron" : " neurons") + " per hidden layer");
            figure.dataset.width = neurons; figure.dataset.extraLayer = String(exact);
            const titles = { two: "Target max(0, x, y)", three: "Target max(0, x, y, −x−y−½)" };
            for (const key of ["two", "three"]) {
                const title = figure.querySelector('[data-architecture="' + key + '"]');
                const depth = (key === "two" ? 2 : 3) + Number(exact);
                if (title) title.textContent = titles[key] + " · L = " + depth +
                    (exact ? " · exact, width 1" : " · " + (depth - 1) + " hidden " + (depth === 2 ? "layer" : "layers"));
            }
            drawOne(neurons); drawTwo("two", index, exact); drawTwo("three", index, exact);
            const errors = { one: 1 / (neurons + 1) ** 2, two: exact ? 0 : models.two[index].gridError, three: exact ? 0 : models.three[index].gridError };
            for (const [key, value] of Object.entries(errors)) {
                const label = figure.querySelector('[data-error="' + key + '"]');
                if (label) label.textContent = (key === "one" ? "Exact uniform error: " : "Grid maximum error: ") + value.toPrecision(3);
                figure.dataset[key + "Error"] = value;
            }
            status.textContent = exact ? "The two planar targets are now represented exactly, using one neuron per hidden layer: L = 3 and L = 4. The slider still controls the 1D spline." :
                "Width " + neurons + " per hidden layer. The planar fits use projected Adam; errors are measured on a 101 × 101 grid. These are numerical fits, not certified best approximations.";
            figure.dataset.ready = "true";
        }
        slider.addEventListener("input", schedule);
        if (extra) extra.addEventListener("change", schedule);
        figure.classList.add("js-ready"); schedule();
        if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(figure);
        else window.addEventListener("resize", schedule);
    }
}());
