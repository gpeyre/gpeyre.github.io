/* Interactive comparison of actual fitted ICNNs with convex reference targets. */
(function () {
    "use strict";
    const M = window.BlogICNN, models = window.BlogICNNModels;
    if (!M || !models) return;
    document.querySelectorAll('[data-figure="icnn"]').forEach(init);

    function init(figure) {
        const slider = figure.querySelector('[data-param="width"]');
        const extra = figure.querySelector("[data-exact]"), status = figure.querySelector("[data-status]");
        const view = figure.querySelector('[data-param="view"]'), zoomControl = figure.querySelector("[data-zoom]");
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
        function residualColor(value, limit) {
            const fraction = Math.min(1, Math.abs(value) / limit), neutral = [247, 247, 244];
            const end = value < 0 ? [42, 104, 168] : [190, 63, 50];
            return neutral.map((channel, i) => Math.round(channel + fraction * (end[i] - channel)));
        }
        function drawTwo(key, index, exact, mode, zoom) {
            const canvas = canvases[key], width = canvas.getBoundingClientRect().width;
            const { ctx } = prepare(canvas, width + 17), side = width - 65;
            const box = { left: 45, top: 38, side };
            const residual = mode === "residual", close = key === "three" && residual && zoom;
            const bounds = close ? [-0.57, 0.07] : [-1, 1];
            const limit = key === "two" ? 0.30 : zoom ? 0.025 : 0.12;
            figure.dataset[key + "Scale"] = limit;
            const cacheKey = key + (exact ? "exact" : index) + (residual ? "residual" : "values") + close;
            if (!cache.has(cacheKey)) {
                const evaluate = exact ? key === "two" ? M.exactTwo : M.exactThree : M.evaluator(models[key][index]);
                const target = key === "two" ? M.targetTwo : M.targetThree;
                cache.set(cacheKey, residual ? exact ? M.grid(() => 0, 81, bounds) : M.residualGrid(evaluate, target, 81, bounds) : M.grid(evaluate));
            }
            const field = cache.get(cacheKey), n = field.count;
            const clipped = residual ? M.clipping(field.values, limit).count :
                Array.from(field.values).filter(value => value < -0.3 || value > 1.55).length;
            figure.dataset["clipped" + (key === "two" ? "Two" : "Three")] = clipped;
            const clippingNotice = figure.querySelector('[data-clipping="' + key + '"]');
            if (clippingNotice) clippingNotice.textContent = clipped ? clipped + " of " + field.values.length +
                " map samples exceed the fixed color scale; their colors are saturated." : "No map samples exceed the fixed color scale.";
            const heat = document.createElement("canvas"); heat.width = n; heat.height = n;
            const heatContext = heat.getContext("2d"), pixels = heatContext.createImageData(n, n);
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
                const offset = 4 * ((n - 1 - j) * n + i), value = field.values[j * n + i];
                const rgb = residual ? residualColor(value, limit) : color(value);
                pixels.data.set([...rgb, 255], offset);
            }
            heatContext.putImageData(pixels, 0, 0);
            ctx.imageSmoothingEnabled = true; ctx.drawImage(heat, box.left, box.top, side, side);
            ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, side, side); ctx.clip();
            const map = point => [box.left + (point[0] - bounds[0]) * side / (bounds[1] - bounds[0]),
                box.top + (bounds[1] - point[1]) * side / (bounds[1] - bounds[0])];
            if (residual) {
                const creases = key === "two" ? [[[0, -1], [0, 0]], [[-1, 0], [0, 0]], [[0, 0], [1, 1]]] :
                    [[[0, 0], [0, -0.5], [-0.5, 0], [0, 0]], [[0, 0], [1, 1]], [[0, -0.5], [0.25, -1]], [[-0.5, 0], [-1, 0.25]]];
                ctx.lineWidth = 1.5; ctx.strokeStyle = "#202827"; ctx.setLineDash([5, 4]);
                creases.forEach(line => { ctx.beginPath(); line.forEach((point, i) => i === 0 ? ctx.moveTo(...map(point)) : ctx.lineTo(...map(point))); ctx.stroke(); });
                ctx.setLineDash([]);
                const vertices = key === "two" ? [[0, 0]] : [[0, 0], [0, -0.5], [-0.5, 0]];
                vertices.forEach(point => { ctx.beginPath(); ctx.arc(...map(point), 3, 0, 2 * Math.PI); ctx.fillStyle = "#202827"; ctx.fill(); });
            } else {
                // White underlay keeps fitted contours visible on the full value scale.
                ctx.setLineDash([]); ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(255,255,255,.95)";
                levels.forEach(level => contour(ctx, field, level, box));
                ctx.lineWidth = 1.4; ctx.strokeStyle = "#007b91";
                levels.forEach(level => contour(ctx, field, level, box));
                ctx.lineWidth = 1.5; ctx.strokeStyle = "#242a29"; ctx.setLineDash([5, 4]);
                levels.forEach(level => contour(ctx, targetGrids[key], level, box));
            }
            if (key === "three") {
                ctx.setLineDash([]); ctx.lineWidth = 2.3; ctx.strokeStyle = "#7442a1";
                ctx.beginPath(); ctx.moveTo(...map([-0.25, -0.25])); ctx.lineTo(...map([0, 0])); ctx.stroke();
                for (const t of [-0.25, -1 / 6, 0]) {
                    ctx.beginPath(); ctx.arc(...map([t, t]), 3.2, 0, 2 * Math.PI); ctx.fillStyle = "#7442a1"; ctx.fill();
                    ctx.lineWidth = 1; ctx.strokeStyle = "#fff"; ctx.stroke();
                }
            }
            ctx.restore(); ctx.setLineDash([]); ctx.strokeStyle = "#698080"; ctx.lineWidth = 1; ctx.strokeRect(box.left, box.top, side, side);
            ctx.fillStyle = "#405958"; ctx.font = '11px "Open Sans", sans-serif';
            const ticks = close ? [-0.5, -0.25, 0] : [-1, 0, 1];
            for (const value of ticks) {
                ctx.textAlign = "center"; ctx.fillText(String(value), map([value, 0])[0], box.top + side + 17);
                ctx.textAlign = "right"; ctx.fillText(String(value), box.left - 7, map([0, value])[1] + 4);
            }
            ctx.textAlign = "center"; ctx.fillText("x", box.left + side / 2, box.top + side + 33);
            ctx.textAlign = "left"; ctx.fillText("y", box.left - 20, box.top - 4);
            const barWidth = side, barTop = 3, barLeft = box.left;
            for (let i = 0; i < 150; i++) {
                const value = residual ? -limit + 2 * limit * i / 149 : -0.3 + 1.85 * i / 149;
                ctx.fillStyle = "rgb(" + (residual ? residualColor(value, limit) : color(value)).join(",") + ")";
                ctx.fillRect(barLeft + barWidth * i / 150, barTop, barWidth / 150 + 0.5, 9);
            }
            ctx.font = '10px "Open Sans", sans-serif'; ctx.fillStyle = "#405958";
            ctx.textAlign = "left"; ctx.fillText(residual ? "−" + limit : "−0.30", barLeft, 26);
            ctx.textAlign = "center"; ctx.fillText("0", barLeft + barWidth * (residual ? 0.5 : 0.3 / 1.85), 26);
            ctx.textAlign = "right"; ctx.fillText(residual ? "+" + limit : "1.55", barLeft + barWidth, 26);
            canvas.setAttribute("aria-label", (key === "two" ? "Three-plane" : "Four-plane") + " convex target, " +
                (close ? "zoomed to the central triangle. " : "on the square minus one to one. ") +
                (residual ? "Color shows signed error: blue below the target, red above, fixed range plus or minus " + limit + ". Dashed lines mark target creases. " :
                    "Dashed target contours and solid fitted contours at the same levels. ") +
                (key === "three" ? "The purple segment marks the diagonal section shown below. " : "") +
                (exact ? "Exact representation with one additional hidden layer." : "Fitted ICNN of width " + models.widths[index] + "."));
        }
        function drawSlice(index, exact, zoom) {
            if (!canvases.slice) return;
            const canvas = canvases.slice, { ctx, width } = prepare(canvas, 240);
            const box = { left: 56, top: 22, side: width - 75, height: 166 }, limit = zoom ? 0.035 : 0.12;
            const slice = M.diagonalSlice(models.three[index], exact);
            const map = (t, value) => [box.left + (t + 0.25) * box.side / 0.25, box.top + box.height * (limit - value) / (2 * limit)];
            const clipped = M.clipping(slice.points.map(point => point.value), limit).count;
            figure.dataset.sliceMin = slice.minimum; figure.dataset.sliceMax = slice.maximum;
            figure.dataset.sliceScale = limit; figure.dataset.sliceClipped = clipped;
            ctx.fillStyle = "#faf8fc"; ctx.fillRect(box.left, box.top, box.side, box.height);
            ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, box.side, box.height); ctx.clip();
            ctx.beginPath(); ctx.moveTo(...map(-0.25, 0));
            slice.points.forEach(point => ctx.lineTo(...map(point.t, point.value))); ctx.lineTo(...map(0, 0)); ctx.closePath();
            ctx.fillStyle = "rgba(116,66,161,.15)"; ctx.fill();
            ctx.beginPath(); slice.points.forEach((point, i) => i === 0 ? ctx.moveTo(...map(point.t, point.value)) : ctx.lineTo(...map(point.t, point.value)));
            ctx.strokeStyle = "#7442a1"; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.setLineDash([6, 4]); ctx.lineWidth = 1.4; ctx.strokeStyle = "#202827";
            ctx.beginPath(); ctx.moveTo(...map(-0.25, 0)); ctx.lineTo(...map(0, 0)); ctx.stroke(); ctx.setLineDash([]);
            const evaluate = exact ? () => 0 : M.evaluator(models.three[index]), center = evaluate(-1 / 6, -1 / 6);
            ctx.beginPath(); ctx.arc(...map(-1 / 6, center), 3.6, 0, 2 * Math.PI); ctx.fillStyle = "#7442a1"; ctx.fill();
            ctx.restore(); ctx.strokeStyle = "#698080"; ctx.lineWidth = 1; ctx.strokeRect(box.left, box.top, box.side, box.height);
            ctx.font = '11px "Open Sans", sans-serif'; ctx.fillStyle = "#405958";
            for (const value of [-limit, 0, limit]) { ctx.textAlign = "right"; ctx.fillText(String(value), box.left - 7, map(-0.25, value)[1] + 4); }
            for (const t of [-0.25, -0.125, 0]) { ctx.textAlign = "center"; ctx.fillText(String(t), map(t, 0)[0], box.top + box.height + 18); }
            ctx.fillText("t, with (x, y) = (t, t)", box.left + box.side / 2, box.top + box.height + 37);
            ctx.textAlign = "left"; ctx.fillText("value", box.left - 32, 13);
            const sliceStatus = figure.querySelector("[data-slice-status]");
            if (sliceStatus) sliceStatus.textContent = "Restriction of the two-dimensional network to the purple segment. The target is zero throughout. " +
                "At its triangle-center marker, h(−1/6, −1/6) = " + center.toPrecision(3) + ". " +
                "Fixed vertical range ±" + limit + ". " + (clipped ? "The curve exceeds this range; turn off the error-detail zoom to see its full height." : "The full curve lies inside this range.");
            canvas.setAttribute("aria-label", "Diagonal restriction of the two-dimensional network: h(t,t), for minus one quarter to zero. " +
                "The target is zero. The fitted curve has minimum " + slice.minimum.toPrecision(3) + " and maximum " + slice.maximum.toPrecision(3) +
                ". Fixed vertical range plus or minus " + limit + (clipped ? "; some of the curve is clipped." : "."));
        }
        function render() {
            const index = Number(slider.value), neurons = models.widths[index], exact = !!(extra && extra.checked);
            const mode = view ? view.value : "residual", zoom = zoomControl ? zoomControl.checked : true;
            figure.querySelector('[data-value="width"]').textContent = neurons;
            slider.setAttribute("aria-valuetext", neurons + (neurons === 1 ? " neuron" : " neurons") + " per hidden layer");
            figure.dataset.width = neurons; figure.dataset.extraLayer = String(exact);
            figure.dataset.view = mode; figure.dataset.zoom = String(zoom);
            const titles = { two: "Target max(0, x, y)", three: "Target max(0, x, y, −x−y−½)" };
            for (const key of ["two", "three"]) {
                const title = figure.querySelector('[data-architecture="' + key + '"]');
                const depth = (key === "two" ? 2 : 3) + Number(exact);
                if (title) title.textContent = titles[key] + " · L = " + depth +
                    (exact ? " · exact, width 1" : " · " + (depth - 1) + " hidden " + (depth === 2 ? "layer" : "layers"));
            }
            drawOne(neurons); drawTwo("two", index, exact, mode, zoom); drawTwo("three", index, exact, mode, zoom); drawSlice(index, exact, zoom);
            const diagnostics = window.BlogICNNDiagnostics;
            const errors = { one: 1 / (neurons + 1) ** 2,
                two: exact ? 0 : diagnostics ? diagnostics.two[index].maxError : models.two[index].gridError,
                three: exact ? 0 : diagnostics ? diagnostics.three[index].maxError : models.three[index].gridError };
            for (const [key, value] of Object.entries(errors)) {
                const label = figure.querySelector('[data-error="' + key + '"]');
                if (label) label.textContent = (key === "one" ? "Exact uniform error: " : exact ? "Exact uniform error: " :
                    diagnostics ? "Numerical maximum error on the whole square: " : "Grid maximum error: ") + value.toPrecision(3);
                figure.dataset[key + "Error"] = value;
            }
            const legend = figure.querySelector("[data-icnn-legend]");
            if (legend) legend.textContent = mode === "residual" ? "Signed error = fitted value − target. Blue: below target; red: above; white: zero. " +
                "Dashed black lines mark target creases. Purple marks the L = 3 diagonal restriction below. Color scales stay fixed as width changes." :
                "Colors show fitted values on the fixed −0.30 to 1.55 scale. Solid teal contours: fit; dashed black contours: target, at identical levels. Purple marks the diagonal restriction below.";
            status.textContent = exact ? "The two planar targets are represented exactly, using one neuron per hidden layer: L = 3 and L = 4. Error colors and slice scales stay unchanged. The slider still controls the 1D spline." :
                "Width " + neurons + " per hidden layer. " + (diagnostics ? "Whole-square errors are computed numerically from target-cell vertices and convex linear programs. " : "Errors are measured on a 101 × 101 grid. ") +
                "These trained networks are not certified best approximations. " + (neurons === 64 ? "The width-64 L = 3 fit retains the width-32 network with additional inactive neurons." : "");
            figure.dataset.ready = "true";
        }
        slider.addEventListener("input", schedule);
        if (extra) extra.addEventListener("change", schedule);
        if (view) view.addEventListener("change", schedule);
        if (zoomControl) zoomControl.addEventListener("change", schedule);
        figure.classList.add("js-ready"); schedule();
        if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(figure);
        else window.addEventListener("resize", schedule);
    }
}());
