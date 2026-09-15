(function () {
    "use strict";
    const M = window.BlogMath;
    if (!M) return;
    const colors = { teal: "#007c83", blue: "#397cc2", orange: "#c56732", grid: "#e3ebe7", ink: "#354c4b" };
    const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

    document.querySelectorAll("[data-figure]").forEach(initFigure);

    function initFigure(figure) {
        const kind = figure.dataset.figure, canvas = figure.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const W = canvas.width, H = canvas.height;
        const inputs = Array.from(figure.querySelectorAll("[data-param]"));
        const play = figure.querySelector("[data-play]"), status = figure.querySelector("[data-status]");
        let running = false, frame = null, last = null, accumulator = 0;
        let paths = null, pathsBend = null;
        let simplexScene = null;
        let gaussianFlowScene = null;
        const params = () => Object.fromEntries(inputs.map(input => [input.dataset.param, Number(input.value)]));
        const put = (name, value) => { figure.querySelector('[data-param="' + name + '"]').value = value; };
        const fontSize = size => Math.max(size, 11 * W / Math.max(280, canvas.getBoundingClientRect().width));

        function label(text, x, y, size = 17, color = colors.ink, align = "left") {
            ctx.font = fontSize(size) + 'px "Open Sans", sans-serif';
            ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
        }
        function line(points, color, width = 2, dash = []) {
            if (!points.length) return;
            ctx.beginPath(); ctx.moveTo(...points[0]);
            points.slice(1).forEach(p => ctx.lineTo(...p));
            ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
        }
        function dot(p, color, radius = 5, outline = null) {
            ctx.beginPath(); ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI);
            ctx.fillStyle = color; ctx.fill();
            if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke(); }
        }
        function plot(xmin, xmax, ymin, ymax) {
            const box = { x: 60, y: 34, w: W - 90, h: H - 88 };
            const map = p => [box.x + (p[0] - xmin) * box.w / (xmax - xmin),
                box.y + (ymax - p[1]) * box.h / (ymax - ymin)];
            for (const x of linspace(xmin, xmax, 6)) {
                line([map([x, ymin]), map([x, ymax])], colors.grid, 1);
                label(x.toFixed(1), map([x, ymin])[0], H - 22, 13, "#788780", "center");
            }
            for (const y of linspace(ymin, ymax, 5)) {
                line([map([xmin, y]), map([xmax, y])], colors.grid, 1);
                label(y.toFixed(1), box.x - 10, map([xmin, y])[1] + 5, 13, "#788780", "right");
            }
            ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
            return { map, done: () => ctx.restore() };
        }
        function drawPL(p) {
            if (!paths || pathsBend !== p.bend) {
                paths = M.bananaPaths(p.bend); pathsBend = p.bend;
            }
            const chart = plot(-0.85, 1.85, -2, 1.4), map = chart.map;
            [0.05, 0.2, 0.45, 0.85, 1.5, 2.5, 4].forEach(energy => {
                [-1, 1].forEach(sign => {
                    let segment = [];
                    linspace(-0.85, 1.85, 280).forEach(x => {
                        const r = x - Math.min(1, Math.max(0, x)), z2 = energy - r * r;
                        if (z2 >= 0) segment.push(map([x, sign * Math.sqrt(z2) - p.bend * (x - 0.5) ** 2]));
                        else { line(segment, "#d0e2ed", 1.5); segment = []; }
                    });
                    line(segment, "#d0e2ed", 1.5);
                });
            });
            line(linspace(0, 1, 100).map(x => map([x, -p.bend * (x - 0.5) ** 2])), colors.teal, 5);
            const k = Math.min(600, Math.round(p.time / 0.01));
            let energy = 0, initial = 0;
            paths.forEach(path => {
                line(path.slice(0, k + 1).map(map), "rgba(197,103,50,0.45)", 2);
                dot(map(path[0]), "#fff", 3.5, "#b3bcb4");
                dot(map(path[k]), colors.orange, 5);
                energy += M.banana(...path[k], p.bend).value;
                initial += M.banana(...path[0], p.bend).value;
            });
            chart.done();
            status.textContent = "Mean energy: " + (energy / paths.length).toExponential(3) +
                "   ·   Fraction of initial energy: " + (energy / initial).toExponential(2);
        }
        function drawSinkhorn(p) {
            const maxIteration = Number(figure.querySelector('[data-param="iteration"]').max);
            if (!simplexScene || simplexScene.epsilon !== p.epsilon) {
                const P = M.markovMatrix(), system = M.sinkhornSystem(p.epsilon);
                const maps = [x => M.matvec(P, x), x => M.sinkhornStep(x, system)];
                const seeds = [];
                for (let i = 0; i <= 7; i++) for (let j = 0; j <= 7 - i; j++)
                    seeds.push([i / 7, j / 7, (7 - i - j) / 7]);
                const panels = maps.map(f => {
                    const rings = [M.simplexBoundary()], points = [seeds];
                    for (let k = 0; k < maxIteration; k++) {
                        rings.push(rings[k].map(f));
                        points.push(points[k].map(f));
                    }
                    return { rings, points, fixed: M.iterate(f, [1 / 3, 1 / 3, 1 / 3], 2000) };
                });
                simplexScene = { epsilon: p.epsilon, system, panels };
            }
            const { system, panels } = simplexScene;
            panels.forEach((scene, panel) => {
                const offset = panel * 400;
                const tri = [[420, 70 + offset], [220, 340 + offset], [620, 340 + offset]];
                const map = q => [M.sum(q.map((x, i) => x * tri[i][0])), M.sum(q.map((x, i) => x * tri[i][1]))];
                label(panel ? "SINKHORN · normalized scaling vectors" : "MARKOV · probability vectors", 30, 31 + offset, 18);
                line([...tri, tri[0]], "#b9c8c0", 2);
                label("1", 420, 56 + offset, 14, "#788780", "center");
                label("2", 199, 350 + offset, 14, "#788780", "center");
                label("3", 641, 350 + offset, 14, "#788780", "center");
                for (let k = 0; k <= p.iteration; k++) {
                    const t = p.iteration ? k / p.iteration : 1;
                    const current = k === p.iteration, shape = scene.rings[k].map(map);
                    if (current) {
                        ctx.beginPath(); ctx.moveTo(...shape[0]); shape.slice(1).forEach(q => ctx.lineTo(...q));
                        ctx.fillStyle = "rgba(0,119,162,0.06)"; ctx.fill();
                    }
                    line(shape, "rgba(" + Math.round(200 * (1 - t)) + "," + Math.round(94 + 27 * t) + "," +
                        Math.round(85 + 77 * t) + "," + (current ? 1 : 0.65) + ")", current ? 3.5 : 1.5);
                }
                scene.points[p.iteration].forEach(point => dot(map(point), colors.teal, 2.5));
                dot(map(scene.fixed), "#fff", 7, colors.ink);
                label(panel ? "v / Σv" : "p", 733, 349 + offset, 17, colors.ink, "right");
            });
            line([[30, 393], [W - 30, 393]], "#e3ebe7", 1);
            const maxDistance = Math.max(...panels[0].points[p.iteration].map(x => M.l1(x, panels[0].fixed)));
            const residual = Math.max(...panels[1].points[p.iteration].map(x => M.sinkhornResidual(x, system)));
            status.textContent = "Iteration " + p.iteration + "   ·   Max. Markov distance ‖p − π‖₁: " + maxDistance.toExponential(2) +
                "   ·   Max. Sinkhorn marginal residual: " + residual.toExponential(2);
        }
        function drawGaussian(p) {
            const means = [[-1.35, 0.25], [1.25, -0.1]];
            const sigmas = [M.covariance(0.35, 0.95, 0.16), M.covariance(p.angle * Math.PI / 180, 0.85, 0.12)];
            const bary = w => M.gaussianBarycenter(means, sigmas, [1 - w, w]);
            const result = bary(p.weight);
            const chart = plot(-3.6, 3.6, -2.7, 2.7), map = chart.map;
            line(means.map(map), "#a2afa8", 2, [7, 7]);
            line(linspace(0, 1, 120).map(w => map(bary(w).mean)), "#78aead", 2.5, [3, 5]);
            sigmas.forEach((sigma, i) => {
                line(M.ellipsePoints(means[i], sigma).map(map), i ? colors.orange : colors.blue, 2.5, [8, 5]);
                dot(map(means[i]), i ? colors.orange : colors.blue, 5);
            });
            const shape = M.ellipsePoints(result.mean, result.covariance).map(map);
            ctx.beginPath(); ctx.moveTo(...shape[0]); shape.slice(1).forEach(point => ctx.lineTo(...point));
            ctx.fillStyle = "rgba(0,124,131,0.12)"; ctx.fill();
            line(shape, colors.teal, 4);
            dot(map(result.mean), colors.teal, 7, "#fff");
            chart.done();
            status.textContent = "Mean = (" + result.mean.map(x => x.toFixed(3)).join(", ") +
                ")   ·   Covariance = [" + result.covariance.map(row => row.map(x => x.toFixed(3)).join(", ")).join("; ") + "]";
        }
        function drawODE(p) {
            const model = M.eulerExample(p.bend, p.steps), chart = plot(0, 1, -0.12, 2.1), map = chart.map;
            const exact = t => [t, p.bend * Math.sin(Math.PI * t)];
            line(linspace(0, p.time, 160).map(t => map(exact(t))), colors.teal, 4);
            const k = Math.min(p.steps, Math.floor(p.time * p.steps));
            const points = model.points.slice(0, k + 1);
            if (k < p.steps) {
                const u = p.time * p.steps - k;
                points.push(model.points[k].map((x, i) => (1 - u) * x + u * model.points[k + 1][i]));
            }
            line(points.map(map), colors.orange, 3);
            model.points.slice(0, k + 1).forEach(point => dot(map(point), colors.orange, 4));
            dot(map(exact(p.time)), colors.teal, 6);
            chart.done();
            status.textContent = "Max. grid-point error: " + model.maxError.toFixed(5) +
                "   ·   Bound bπ²/(2n): " + model.bound.toFixed(5) + "   ·   L = 0";
        }
        function drawGaussianFlow(p) {
            if (!gaussianFlowScene || gaussianFlowScene.angle !== p.angle || gaussianFlowScene.anisotropy !== p.anisotropy) {
                const model = M.gaussianKLExample(p.angle * Math.PI / 180, p.anisotropy);
                const flow = t => M.gaussianKLFlow(model.initial, model.target, t);
                const times = linspace(0, Math.log(21), 90).map(Math.expm1);
                const states = times.map(flow);
                const all = [...states, model.target].flatMap(s => M.ellipsePoints(s.mean, s.covariance));
                const xs = all.map(x => x[0]), ys = all.map(x => x[1]);
                const xmin = Math.min(...xs) - 0.4, xmax = Math.max(...xs) + 0.4;
                const ymin = Math.min(...ys) - 0.4, ymax = Math.max(...ys) + 0.4;
                // Equal spatial units on both axes, fixed throughout playback.
                const scale = Math.max((xmax - xmin) / (W - 90), (ymax - ymin) / (H - 88));
                const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2;
                gaussianFlowScene = { ...model, angle: p.angle, anisotropy: p.anisotropy, flow, states,
                    bounds: [cx - scale * (W - 90) / 2, cx + scale * (W - 90) / 2,
                        cy - scale * (H - 88) / 2, cy + scale * (H - 88) / 2] };
            }
            const scene = gaussianFlowScene, result = scene.flow(p.time), chart = plot(...scene.bounds), map = chart.map;
            const outline = state => M.ellipsePoints(state.mean, state.covariance).map(map);
            const initialShape = outline(scene.initial);
            line(initialShape, "#a2aaa6", 2, [3, 5]);
            for (const fraction of [0.12, 0.3, 0.55, 0.8]) {
                if (p.time > 0.02) line(outline(scene.flow(p.time * fraction)), "rgba(0,124,131,0.16)", 1.6);
            }
            line(scene.states.map(s => map(s.mean)), "#78aead", 2.2, [3, 5]);
            const shape = outline(result);
            ctx.beginPath(); ctx.moveTo(...shape[0]); shape.slice(1).forEach(q => ctx.lineTo(...q));
            ctx.fillStyle = "rgba(0,124,131,0.12)"; ctx.fill();
            line(shape, colors.teal, 4);
            line(outline(scene.target), colors.blue, 3, [9, 6]);
            dot(map(scene.initial.mean), "#a2aaa6", 4);
            dot(map(result.mean), colors.teal, 6, "#fff");
            dot(map(scene.target.mean), colors.blue, 5);
            chart.done();
            figure.dataset.kl = result.kl;
            figure.dataset.mean = JSON.stringify(result.mean);
            figure.dataset.covariance = JSON.stringify(result.covariance);
            figure.dataset.initialKl = M.gaussianKL(scene.initial, scene.target);
            figure.dataset.targetCovariance = JSON.stringify(scene.target.covariance);
            status.textContent = "KL(αₜ | β) = " + result.kl.toExponential(3) +
                " · Initial KL = " + Number(figure.dataset.initialKl).toFixed(3) +
                " · Mean = (" + result.mean.map(x => x.toFixed(3)).join(", ") + ")";
        }
        const renderers = { pl: drawPL, sinkhorn: drawSinkhorn, gaussian: drawGaussian, ode: drawODE, "gaussian-flow": drawGaussianFlow };
        function render() {
            const p = params();
            inputs.forEach(input => {
                const name = input.dataset.param, value = Number(input.value);
                figure.querySelector('[data-value="' + name + '"]').textContent =
                    name === "angle" ? value + "°" : ["steps", "iteration"].includes(name) ? value : value.toFixed(2);
            });
            figure.querySelectorAll("[data-step]").forEach(button => {
                const slider = figure.querySelector('[data-param="iteration"]');
                button.disabled = Number(button.dataset.step) < 0 ? p.iteration <= 0 : p.iteration >= Number(slider.max);
            });
            ctx.clearRect(0, 0, W, H);
            renderers[kind](p);
        }
        function stop() {
            running = false; cancelAnimationFrame(frame); frame = null; last = null; accumulator = 0;
            play.textContent = "Play"; play.setAttribute("aria-pressed", "false");
        }
        // Keep continuous animation time separate from the quantized range values.
        let animationValue = 0;
        function tick(now) {
            if (!running) return;
            const dt = last === null ? 0 : Math.min(0.08, (now - last) / 1000);
            last = now;
            const p = params();
            if (kind === "sinkhorn") {
                accumulator += dt;
                if (accumulator >= p.duration) {
                    const max = Number(figure.querySelector('[data-param="iteration"]').max);
                    put("iteration", Math.min(max, p.iteration + 1)); accumulator -= p.duration; render();
                    if (p.iteration + 1 >= max) { stop(); return; }
                }
            } else {
                const key = kind === "gaussian" ? "weight" : "time";
                const max = Number(figure.querySelector('[data-param="' + key + '"]').max), speed = kind === "pl" ? 1 : 0.16;
                animationValue = Math.min(max, kind === "gaussian-flow" ?
                    Math.expm1(Math.log1p(animationValue) + dt * Math.log1p(max) / 12) : animationValue + dt * speed);
                put(key, animationValue); render();
                if (animationValue >= max) { stop(); return; }
            }
            frame = requestAnimationFrame(tick);
        }
        play.addEventListener("click", () => {
            if (running) { stop(); return; }
            const key = kind === "sinkhorn" ? "iteration" : kind === "gaussian" ? "weight" : "time";
            const max = Number(figure.querySelector('[data-param="' + key + '"]').max);
            if (params()[key] >= max) put(key, 0);
            animationValue = params()[key]; running = true; last = null;
            play.textContent = "Pause"; play.setAttribute("aria-pressed", "true");
            render(); frame = requestAnimationFrame(tick);
        });
        inputs.forEach(input => input.addEventListener("input", () => { stop(); render(); }));
        figure.querySelectorAll("[data-step]").forEach(button => button.addEventListener("click", () => {
            stop();
            const slider = figure.querySelector('[data-param="iteration"]');
            put("iteration", Math.max(0, Math.min(Number(slider.max), params().iteration + Number(button.dataset.step))));
            render();
        }));
        figure.querySelector("[data-reset]").addEventListener("click", () => {
            stop(); inputs.forEach(input => { input.value = input.defaultValue; }); render();
        });
        document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }).observe(figure);
        }
        function resize() {
            const width = canvas.getBoundingClientRect().width, ratio = window.devicePixelRatio || 1;
            canvas.width = Math.round(width * ratio); canvas.height = Math.round(width * H / W * ratio);
            ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); render();
        }
        figure.classList.add("js-ready");
        if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
        else window.addEventListener("resize", resize);
        resize();
        // No autoplay, including for readers who prefer reduced motion.
    }
}());
