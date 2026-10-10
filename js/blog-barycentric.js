/* Conditional-mean maps for exact and entropically regularized discrete OT. */
(function () {
    "use strict";
    const M = window.BlogBarycentric;
    if (!M) return;
    document.querySelectorAll('[data-figure="barycentric"]').forEach(init);

    function init(figure) {
        const canvas = figure.querySelector("canvas"), ctx = canvas.getContext("2d");
        if (!ctx) return;
        const controls = Object.fromEntries(Array.from(figure.querySelectorAll("[data-param]"),
            control => [control.dataset.param, control]));
        const status = figure.querySelector("[data-status]"), mode = figure.querySelector("[data-exact]");
        const mean = points => points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0]);
        let cloud, result = null, progress = null, failure = "", timer = null, frame = null, job = 0;
        const isExact = () => mode.getAttribute("aria-pressed") === "true";
        function values() {
            return Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, Number(input.value)]));
        }
        function labels() {
            const v = values();
            for (const [key, value] of Object.entries(v)) {
                figure.querySelector('[data-value="' + key + '"]').textContent =
                    key === "epsilon" ? value.toFixed(2) : key === "motion" ? value + "°" : value;
            }
            controls.epsilon.disabled = isExact();
            mode.textContent = isExact() ? "Use entropic OT" : "Use unregularized OT";
            figure.dataset.sourcePoints = v.source; figure.dataset.targetPoints = v.target;
            figure.dataset.motion = v.motion;
            figure.dataset.mode = isExact() ? "exact" : "entropic";
            figure.dataset.epsilon = isExact() ? 0 : v.epsilon;
        }
        function schedule() {
            if (frame === null) frame = requestAnimationFrame(() => { frame = null; render(); });
        }
        function solve(delay = 90) {
            clearTimeout(timer);
            const currentJob = ++job, v = values();
            cloud = M.sample(v.source, v.target, v.motion);
            result = null; progress = null; failure = ""; figure.dataset.ready = "false";
            figure.dataset.residual = ""; figure.dataset.cost = "";
            figure.dataset.barycenters = ""; figure.dataset.meanError = ""; labels(); schedule();
            timer = setTimeout(() => {
                const steps = isExact() ? M.exactSteps(cloud.source, cloud.target) :
                    M.sinkhornSteps(cloud.source, cloud.target, v.epsilon);
                function chunk() {
                    if (currentJob !== job) return;
                    try {
                        const began = performance.now();
                        do {
                            const state = steps.next();
                            if (state.done) {
                                result = state.value;
                                figure.dataset.ready = String(result.converged);
                                figure.dataset.residual = result.residual;
                                figure.dataset.cost = result.cost;
                                const targetMean = mean(result.target), projectedMean = mean(result.barycenters);
                                figure.dataset.meanError = Math.hypot(targetMean[0] - projectedMean[0], targetMean[1] - projectedMean[1]);
                                figure.dataset.iterations = result.iterations;
                                figure.dataset.barycenters = result.barycenters.length;
                                if (!result.converged) failure = isExact() ? "The exact OT numerical certificate failed; try another point count." :
                                    "The iteration limit was reached; increase ε for a better-conditioned solve.";
                                schedule(); return;
                            }
                            progress = state.value;
                        } while (performance.now() - began < 8);
                        schedule(); timer = setTimeout(chunk, 0);
                    } catch (error) { failure = error.message; schedule(); }
                }
                chunk();
            }, delay);
        }
        function arrow(from, to, map) {
            const a = map(from), b = map(to), angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
            ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(...b);
            ctx.lineTo(b[0] - 7 * Math.cos(angle - 0.4), b[1] - 7 * Math.sin(angle - 0.4));
            ctx.lineTo(b[0] - 7 * Math.cos(angle + 0.4), b[1] - 7 * Math.sin(angle + 0.4));
            ctx.closePath(); ctx.fill();
        }
        function render() {
            const width = canvas.getBoundingClientRect().width;
            const height = Math.max(320, Math.min(540, width * 0.57)), ratio = window.devicePixelRatio || 1;
            const w = Math.round(width * ratio), h = Math.round(height * ratio);
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
            canvas.style.height = height + "px";
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
            // Fixed bounds and equal axis scales keep rotations geometrically honest.
            const pad = width < 420 ? 16 : 30, scale = Math.min((width - 2 * pad) / 6.25, (height - 2 * pad - 30) / 3.35);
            const map = p => [width / 2 + scale * (p[0] - 0.15), height / 2 + 8 - scale * p[1]];
            ctx.font = '12px "Open Sans", sans-serif'; ctx.fillStyle = "#47625d"; ctx.textAlign = "center";
            ctx.fillText("Source α · n = " + cloud.source.length, map([-1.65, 0])[0], 23);
            ctx.fillText("Target β · m = " + cloud.target.length, map([1.65, 0])[0], 23);
            ctx.strokeStyle = "#e8eeeb"; ctx.lineWidth = 1; ctx.beginPath();
            ctx.moveTo(pad, map([0, 0])[1]); ctx.lineTo(width - pad, map([0, 0])[1]); ctx.stroke();
            let shown = 0;
            if (result) {
                const maximum = Math.max(...result.coupling.flat());
                ctx.strokeStyle = "#737c79";
                result.coupling.forEach((row, i) => row.forEach((mass, j) => {
                    // Numerical tails are invisible. Opacity encodes mass, rather
                    // than making tiny entropic connections look equally strong.
                    if (mass < maximum * 0.005) return;
                    const relative = Math.sqrt(mass / maximum);
                    ctx.globalAlpha = 0.025 + 0.11 * relative; ctx.lineWidth = 0.35 + 0.5 * relative;
                    ctx.beginPath(); ctx.moveTo(...map(cloud.source[i])); ctx.lineTo(...map(cloud.target[j])); ctx.stroke(); shown++;
                }));
                ctx.globalAlpha = 1;
            }
            const targetRadius = cloud.target.length > 300 ? 1.65 : 2.2;
            ctx.fillStyle = "#c67c3a";
            cloud.target.forEach(point => {
                const p = map(point); ctx.fillRect(p[0] - targetRadius, p[1] - targetRadius, 2 * targetRadius, 2 * targetRadius);
            });
            if (result) {
                ctx.strokeStyle = "#161a19"; ctx.fillStyle = "#161a19"; ctx.lineWidth = 1.6;
                result.barycenters.forEach((point, i) => arrow(cloud.source[i], point, map));
                result.barycenters.forEach(point => {
                    const p = map(point); ctx.beginPath(); ctx.arc(...p, 3.3, 0, 2 * Math.PI); ctx.fill();
                });
            }
            ctx.fillStyle = "#2885b1"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
            cloud.source.forEach(point => { ctx.beginPath(); ctx.arc(...map(point), 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); });
            figure.dataset.couplingsShown = shown;
            const v = values(), description = v.source + " source and " + v.target + " target points. ";
            canvas.setAttribute("aria-label", description + (result ? shown + " faint mass-weighted coupling segments; " +
                result.barycenters.length + " solid black barycentric-projection arrows. " + (isExact() ? "Unregularized" : "Entropic") + " quadratic OT." : "Computing the transport coupling."));
            if (failure) status.textContent = failure;
            else if (result) {
                const targetMean = mean(cloud.target), projectedMean = mean(result.barycenters);
                const meanError = Math.hypot(targetMean[0] - projectedMean[0], targetMean[1] - projectedMean[1]);
                figure.dataset.meanError = meanError;
                status.textContent = description + (isExact() ? "Exact min-cost flow" : "Log-domain Sinkhorn, ε = " + v.epsilon.toFixed(2)) +
                    " · marginal error " + result.residual.toExponential(1) + " · mean error " + meanError.toExponential(1) +
                    (isExact() ? " · dual gap " + Math.abs(result.dualGap).toExponential(1) : " · " + result.iterations + " iterations") + ".";
            } else status.textContent = description + "Computing " + (isExact() ? "unregularized OT" : "entropic OT") +
                (progress ? isExact() ? " · " + Math.round(progress.progress * 100) + "% of mass transported" :
                    " · " + progress.iterations + " iterations, marginal error " + progress.residual.toExponential(1) : "") + "…";
        }
        Object.values(controls).forEach(input => input.addEventListener("input", () => solve()));
        mode.addEventListener("click", () => { mode.setAttribute("aria-pressed", String(!isExact())); solve(0); });
        figure.querySelector("[data-reset]").addEventListener("click", () => {
            Object.values(controls).forEach(input => { input.value = input.defaultValue; });
            mode.setAttribute("aria-pressed", "false"); solve(0);
        });
        figure.classList.add("js-ready"); solve(0);
        if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(canvas);
        else window.addEventListener("resize", schedule);
        window.addEventListener("pagehide", event => { if (!event.persisted) { clearTimeout(timer); job++; } });
    }
}());
