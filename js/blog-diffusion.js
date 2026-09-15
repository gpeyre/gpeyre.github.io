/* Deterministic score flow versus unregularized empirical optimal transport. */
(function () {
    "use strict";
    const M = window.BlogMath;
    if (!M) return;
    document.querySelectorAll('[data-figure="diffusion"]').forEach(init);

    function init(figure) {
        const panels = Array.from(figure.querySelectorAll("canvas"), canvas => ({ canvas, ctx: canvas.getContext("2d") }));
        if (panels.some(p => !p.ctx)) return;
        const inputs = Array.from(figure.querySelectorAll("[data-param]"));
        const time = figure.querySelector('[data-param="time"]'), sigma = figure.querySelector('[data-param="sigma"]');
        const play = figure.querySelector("[data-play]"), highlight = figure.querySelector("[data-highlight]");
        const status = figure.querySelector("[data-status]");
        const colors = ["#2885b1", "#25bfc8", "#98685c"];
        let scene = null, running = false, frame = null, previous = null, progress = 0, changedOnly = false;

        function updateScene() {
            const width = Number(sigma.value);
            if (scene && scene.sigma === width) return;
            scene = M.diffusionComparison(width);
            // Both panels share an equal-aspect domain containing every trajectory.
            let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
            scene.paths.forEach(path => path.forEach(([x, y]) => {
                xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
                ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
            }));
            scene.model.means.forEach(([x, y]) => {
                xmin = Math.min(xmin, x - 2 * width); xmax = Math.max(xmax, x + 2 * width);
                ymin = Math.min(ymin, y - 2 * width); ymax = Math.max(ymax, y + 2 * width);
            });
            scene.bounds = { xmin, xmax, ymin, ymax };
            scene.changedIndices = scene.labels.map((label, i) => label !== scene.labels[scene.matching.permutation[i]]);
            figure.dataset.diffusionCost = scene.diffusionCost;
            figure.dataset.otCost = scene.matching.cost;
            figure.dataset.changed = scene.changed;
            figure.dataset.particles = scene.source.length;
        }

        function draw(panel) {
            const { canvas, ctx } = panel, width = canvas.getBoundingClientRect().width;
            const height = width * 470 / 600, ratio = window.devicePixelRatio || 1;
            const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
            if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
                canvas.width = pixelWidth; canvas.height = pixelHeight;
            }
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, width, height);
            const b = scene.bounds, pad = 25;
            const scale = Math.min((width - 2 * pad) / (b.xmax - b.xmin), (height - 2 * pad) / (b.ymax - b.ymin));
            const center = [(b.xmin + b.xmax) / 2, (b.ymin + b.ymax) / 2];
            const map = p => [width / 2 + scale * (p[0] - center[0]), height / 2 - scale * (p[1] - center[1])];
            const isOT = canvas.dataset.panel === "ot", t = Number(time.value), steps = scene.paths[0].length - 1;
            const step = Math.min(steps - 1, Math.floor(t * steps)), fraction = t * steps - step;
            const interpolate = (a, z, s) => a.map((x, k) => x + s * (z[k] - x));
            function stroke(points, color, alpha, thickness) {
                ctx.beginPath();
                points.forEach((p, k) => { const q = map(p); if (k) ctx.lineTo(...q); else ctx.moveTo(...q); });
                ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = thickness; ctx.stroke(); ctx.globalAlpha = 1;
            }
            function dot(point, color, radius, outline) {
                ctx.beginPath(); ctx.arc(...map(point), radius, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
                if (outline) { ctx.strokeStyle = "#253039"; ctx.lineWidth = 1.2; ctx.stroke(); }
            }
            // Light two-standard-deviation circles describe the target components.
            if (scene.sigma > 0) scene.model.means.forEach((m, j) => {
                ctx.beginPath(); ctx.arc(...map(m), 2 * scene.sigma * scale, 0, 2 * Math.PI);
                ctx.fillStyle = colors[j]; ctx.globalAlpha = 0.06; ctx.fill();
                ctx.globalAlpha = 0.4; ctx.lineWidth = 0.8; ctx.strokeStyle = colors[j]; ctx.stroke(); ctx.globalAlpha = 1;
            });
            const positions = [];
            scene.paths.forEach((path, i) => {
                const j = isOT ? scene.matching.permutation[i] : i, color = colors[scene.labels[j]];
                const active = !changedOnly || scene.changedIndices[i];
                const full = isOT ? [scene.source[i], scene.target[j]] : path;
                const current = isOT ? interpolate(scene.source[i], scene.target[j], t) : interpolate(path[step], path[step + 1], fraction);
                stroke(full, color, active ? (changedOnly ? 0.65 : 0.22) : 0.018, active ? (changedOnly ? 1.4 : 0.9) : 0.6);
                if (t > 0) stroke(isOT ? [scene.source[i], current] : [...path.slice(0, step + 1), current],
                    color, active ? (changedOnly ? 0.85 : 0.4) : 0.035, active ? 1.1 : 0.7);
                positions.push({ current, color, active, changed: scene.changedIndices[i] });
            });
            // Draw highlighted particles last, so they remain visible in dense clouds.
            positions.sort((a, b) => Number(a.active) - Number(b.active)).forEach(p => {
                ctx.globalAlpha = p.active ? 0.95 : 0.12;
                dot(p.current, p.color, changedOnly && p.active ? 3.4 : 2.2, changedOnly && p.changed);
                ctx.globalAlpha = 1;
            });
            scene.model.means.forEach((m, j) => {
                dot(m, "#151c20", 3.6);
                const q = map(m);
                ctx.font = '600 12px "Open Sans", sans-serif'; ctx.fillStyle = "#253039";
                ctx.textAlign = j === 2 ? "right" : "left";
                ctx.fillText("ABC"[j], q[0] + (j === 2 ? -9 : 9), q[1] - 8);
            });
        }

        function render() {
            updateScene();
            inputs.forEach(input => {
                figure.querySelector('[data-value="' + input.dataset.param + '"]').textContent = Number(input.value).toFixed(2);
            });
            panels.forEach(draw);
            figure.dataset.progress = time.value;
            status.textContent = "Endpoint cost (mean squared displacement): diffusion " + scene.diffusionCost.toFixed(4) +
                " · OT " + scene.matching.cost.toFixed(4) + ". " + scene.changed + "/" + scene.source.length + " particles switch destination mode." +
                (changedOnly && !scene.changed ? " No mode changes at this width; within-mode endpoint assignments may still differ." : "");
        }
        function stop() {
            running = false; cancelAnimationFrame(frame); frame = null; previous = null;
            play.textContent = "Play"; play.setAttribute("aria-pressed", "false");
        }
        function tick(now) {
            if (!running) return;
            const elapsed = previous === null ? 0 : Math.min(0.1, (now - previous) / 1000);
            previous = now; progress = Math.min(1, progress + elapsed / 10); time.value = progress;
            render();
            if (progress >= 1) stop();
            else frame = requestAnimationFrame(tick);
        }
        play.addEventListener("click", () => {
            if (running) { stop(); return; }
            if (Number(time.value) >= 1) time.value = 0;
            progress = Number(time.value); running = true; previous = null;
            play.textContent = "Pause"; play.setAttribute("aria-pressed", "true");
            render(); frame = requestAnimationFrame(tick);
        });
        inputs.forEach(input => input.addEventListener("input", () => { stop(); render(); }));
        highlight.addEventListener("click", () => {
            changedOnly = !changedOnly; highlight.setAttribute("aria-pressed", String(changedOnly)); render();
        });
        figure.querySelector("[data-reset]").addEventListener("click", () => {
            stop(); inputs.forEach(input => { input.value = input.defaultValue; });
            changedOnly = false; highlight.setAttribute("aria-pressed", "false"); render();
        });
        document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
        if ("IntersectionObserver" in window) new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) stop();
        }).observe(figure);
        figure.classList.add("js-ready");
        if ("ResizeObserver" in window) new ResizeObserver(render).observe(figure.querySelector(".diffusion-panels"));
        else window.addEventListener("resize", render);
        render(); // Deliberately paused on load, also for reduced-motion readers.
    }
}());
