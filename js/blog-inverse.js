/* Inverse OT: exact pairings and a certified piecewise-affine cost gap. */
(function () {
    "use strict";
    const M = window.BlogMath;
    if (!M) return;
    const workerURL = new URL("blog-inverse-worker.js", document.currentScript.src);
    document.querySelectorAll('[data-figure="inverse"]').forEach(init);

    function init(figure) {
        const panels = Array.from(figure.querySelectorAll("canvas"), canvas => ({ canvas, ctx: canvas.getContext("2d") }));
        if (panels.some(p => !p.ctx)) return;
        const points = figure.querySelector('[data-param="points"]'), theta = figure.querySelector('[data-param="theta"]');
        const compare = figure.querySelector("[data-compare]"), observed = figure.querySelector("[data-observed]");
        const status = figure.querySelector("[data-status]");
        const sizes = [30, 100, 300, 400], palette = ["#7b8587", "#b67837", "#3982b6", "#8467ae"], pairLimit = 120;
        const minimumPoints = Number(points.dataset.minPoints), maximumPoints = Number(points.dataset.maxPoints);
        const pointCount = () => M.inverseOTPointCount(Number(points.value), minimumPoints, maximumPoints);
        const teal = "#00778b", blue = "#2885b1", orange = "#c67c3a", ink = "#47625d";
        const curves = new Map();
        let seed = 17, fullSample, sample, scene, worker = null, sceneWorker = null;
        let job = 0, sceneJob = 0, timer = null, sceneTimer = null, frame = null, failure = "";

        function makeSample() {
            // Bounds need only raw points; reference assignments run in a worker.
            fullSample = M.inverseOTSample(maximumPoints, seed, { reference: false });
            setCount();
        }
        function setCount() {
            const n = pointCount();
            sample = { source: fullSample.source.slice(0, n), target: fullSample.target.slice(0, n),
                model: fullSample.model, seed };
            scene = null;
            figure.dataset.curveReady = "false";
            requestScene();
        }
        function receiveScene(message) {
            if (message.job !== sceneJob) return;
            if (message.error) { failure = message.error; schedule(); return; }
            if (message.seed !== seed || message.count !== pointCount() || message.scene.theta !== Number(theta.value)) return;
            sample = message.sample; scene = message.scene; schedule();
        }
        function receive(message) {
            if (message.job !== job) return;
            if (message.error) { failure = message.error; schedule(); return; }
            if (message.seed !== seed) return;
            curves.set(message.count, message.curve);
            schedule();
        }
        try {
            worker = new Worker(workerURL);
            worker.onmessage = event => receive(event.data);
            worker.onerror = () => {
                // Local computation keeps the controls useful if workers are unavailable.
                worker.terminate(); worker = null; requestCurves();
            };
        } catch (_) { /* The same numerical routine also runs without worker support. */ }
        try {
            // Pairings have their own worker, so scrubbing never waits for a
            // large comparison curve to finish on the background worker.
            sceneWorker = new Worker(workerURL);
            sceneWorker.onmessage = event => receiveScene(event.data);
            sceneWorker.onerror = () => {
                sceneWorker.terminate(); sceneWorker = null; requestScene();
            };
        } catch (_) { /* Fall back to the same exact assignment solver. */ }

        function requestScene() {
            clearTimeout(sceneTimer);
            const request = { type: "scene", job: ++sceneJob, seed, count: pointCount(), theta: Number(theta.value) };
            const previous = scene;
            scene = null;
            if (sceneWorker) sceneWorker.postMessage(request);
            else sceneTimer = setTimeout(() => {
                if (request.job !== sceneJob) return;
                try {
                    if (!sample.observedPermutation) sample = M.inverseOTSample(request.count, request.seed);
                    const next = M.inverseOTGap(sample, request.theta, previous ? previous.matching : sample.referenceMatching);
                    receiveScene({ ...request, sample, scene: next });
                } catch (error) { receiveScene({ job: request.job, error: error.message }); }
            }, 0);
            schedule();
        }

        function requestCurves() {
            clearTimeout(timer); failure = "";
            const n = pointCount(), counts = Array.from(new Set([n, ...sizes]));
            const request = { type: "curve", job: ++job, seed, counts };
            if (worker) worker.postMessage(request);
            else {
                const next = (index, steps = null) => {
                    if (request.job !== job || index === counts.length) return;
                    timer = setTimeout(() => {
                        try {
                            const count = counts[index];
                            if (curves.has(count)) {
                                receive({ ...request, count, curve: curves.get(count) }); next(index + 1); return;
                            }
                            steps = steps || M.inverseOTCurveSteps(M.inverseOTSample(count, request.seed), 0.2, 2.6,
                                count > 200 ? 1e-3 : 1e-10);
                            const step = steps.next();
                            if (step.done) { receive({ ...request, count, curve: step.value }); next(index + 1); }
                            else next(index, steps);
                        } catch (error) { receive({ job: request.job, error: error.message }); }
                    }, 0);
                };
                next(0);
            }
            schedule();
        }
        function schedule() {
            if (frame === null) frame = requestAnimationFrame(() => { frame = null; render(); });
        }
        function prepare(panel) {
            const { canvas, ctx } = panel, width = canvas.getBoundingClientRect().width;
            const height = Math.max(290, Math.min(390, width * 0.88)), ratio = window.devicePixelRatio || 1;
            const w = Math.round(width * ratio), h = Math.round(height * ratio);
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
            canvas.style.height = height + "px";
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, width, height);
            ctx.font = '11px "Open Sans", sans-serif'; ctx.fillStyle = ink; ctx.lineWidth = 1;
            return { ctx, width, height };
        }
        function drawMarginals(panel) {
            const { ctx, width, height } = prepare(panel), pad = 24;
            // Fix the spatial scale across sample sizes within the same draw.
            const all = fullSample.source.concat(fullSample.target);
            const xmin = Math.min(...all.map(p => p[0])), xmax = Math.max(...all.map(p => p[0]));
            const ymin = Math.min(...all.map(p => p[1])), ymax = Math.max(...all.map(p => p[1]));
            const scale = Math.min((width - 2 * pad) / (xmax - xmin), (height - 2 * pad) / (ymax - ymin));
            const map = p => [width / 2 + scale * (p[0] - (xmin + xmax) / 2),
                height / 2 - scale * (p[1] - (ymin + ymax) / 2)];
            const origin = map([0, 0]);
            ctx.strokeStyle = "#e8eeeb"; ctx.beginPath();
            ctx.moveTo(pad, origin[1]); ctx.lineTo(width - pad, origin[1]);
            ctx.moveTo(origin[0], pad); ctx.lineTo(origin[0], height - pad); ctx.stroke();
            ctx.textAlign = "right"; ctx.fillText("x₁", width - 8, origin[1] - 6);
            ctx.textAlign = "left"; ctx.fillText("x₂", origin[0] + 6, 15);
            const n = sample.source.length, shown = Math.min(pairLimit, n);
            const indices = Array.from({ length: shown }, (_, k) => Math.floor(k * n / shown));
            function pairing(permutation, color, dashed) {
                ctx.strokeStyle = color; ctx.lineWidth = dashed ? 0.9 : 1;
                ctx.globalAlpha = n <= 30 ? 0.6 : dashed ? 0.3 : 0.38; ctx.setLineDash(dashed ? [4, 4] : []);
                ctx.beginPath();
                indices.forEach(i => { ctx.moveTo(...map(sample.source[i])); ctx.lineTo(...map(sample.target[permutation[i]])); });
                ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
            }
            if (sample.observedPermutation && observed.getAttribute("aria-pressed") === "true") pairing(sample.observedPermutation, "#747b7b", true);
            if (scene) pairing(scene.matching.permutation, teal, false);
            const radius = n > 300 ? 1.8 : 2.4;
            sample.source.forEach(p => {
                ctx.beginPath(); ctx.arc(...map(p), radius, 0, 2 * Math.PI); ctx.fillStyle = blue; ctx.fill();
            });
            sample.target.forEach(p => {
                const q = map(p); ctx.fillStyle = orange; ctx.fillRect(q[0] - radius, q[1] - radius, 2 * radius, 2 * radius);
            });
            panel.canvas.setAttribute("aria-label", n + " blue source points and " + n + " orange target points; " +
                (scene ? shown + " of " + n + " optimal pairs shown at cost weight " + theta.value + "." : "Computing the optimal pairs."));
            figure.dataset.pairingsShown = scene ? shown : 0;
        }
        function drawLoss(panel) {
            const { ctx, width, height } = prepare(panel);
            const n = sample.source.length, active = curves.get(n), comparisons = compare.getAttribute("aria-pressed") === "true";
            const visible = comparisons ? sizes.filter(count => count !== n && curves.has(count)) : [];
            const maximum = Math.max(0.025, scene ? scene.gap : 0, ...[active, ...visible.map(count => curves.get(count))]
                .filter(Boolean).flatMap(curve => curve.points.map(p => p.gap))) * 1.18;
            const legend = comparisons ? sizes.slice() : [];
            if (!legend.includes(n)) legend.push(n);
            const left = 51, right = width - 17, columns = Math.max(1, Math.floor((right - left) / 53));
            const top = 38 + 15 * (Math.ceil(legend.length / columns) - 1), bottom = height - 42;
            const map = p => [left + (p.theta - 0.2) / 2.4 * (right - left), bottom - p.gap / maximum * (bottom - top)];
            ctx.textAlign = "right";
            for (let k = 0; k <= 4; k++) {
                const y = maximum * k / 4, q = map({ theta: 0.2, gap: y });
                ctx.strokeStyle = "#e8eeeb"; ctx.beginPath(); ctx.moveTo(left, q[1]); ctx.lineTo(right, q[1]); ctx.stroke();
                ctx.fillStyle = ink; ctx.fillText(y.toFixed(3), left - 7, q[1] + 4);
            }
            ctx.textAlign = "center";
            for (const t of [0.2, 0.6, 1, 1.4, 1.8, 2.2, 2.6]) {
                const q = map({ theta: t, gap: 0 }); ctx.fillText(t.toFixed(1), q[0], bottom + 19);
            }
            ctx.strokeStyle = "#abb9b3"; ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
            const truth = map({ theta: 1, gap: 0 });
            ctx.setLineDash([4, 4]); ctx.strokeStyle = "#a7b2ad";
            ctx.beginPath(); ctx.moveTo(truth[0], top); ctx.lineTo(truth[0], bottom); ctx.stroke(); ctx.setLineDash([]);
            ctx.textAlign = "left"; ctx.fillStyle = ink; ctx.fillText("Mean gap loss", left, 17);
            ctx.textAlign = "right"; ctx.fillText("θ", right, height - 7);
            function line(curve, color, weight) {
                ctx.beginPath();
                curve.points.forEach((p, i) => { if (i) ctx.lineTo(...map(p)); else ctx.moveTo(...map(p)); });
                ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
            }
            visible.forEach(count => line(curves.get(count), palette[sizes.indexOf(count)], 1.4));
            if (active) {
                if (active.zeroInterval) {
                    ctx.strokeStyle = teal; ctx.lineWidth = 5;
                    ctx.beginPath(); ctx.moveTo(map({ theta: active.zeroInterval[0], gap: 0 })[0], bottom + 2);
                    ctx.lineTo(map({ theta: active.zeroInterval[1], gap: 0 })[0], bottom + 2); ctx.stroke();
                }
                line(active, teal, 2.6);
            }
            if (scene) {
                const current = map(scene);
                ctx.strokeStyle = teal; ctx.globalAlpha = 0.25; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(current[0], bottom); ctx.lineTo(current[0], current[1]); ctx.stroke(); ctx.globalAlpha = 1;
                ctx.beginPath(); ctx.arc(...current, 4.5, 0, 2 * Math.PI); ctx.fillStyle = teal; ctx.fill();
                ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
            }
            legend.forEach((count, index) => {
                const x = left + 53 * (index % columns), y = 29 + 15 * Math.floor(index / columns);
                const color = count === n ? teal : palette[sizes.indexOf(count)];
                ctx.strokeStyle = color; ctx.lineWidth = count === n ? 2.6 : 1.4;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y); ctx.stroke();
                ctx.textAlign = "left"; ctx.fillStyle = color; ctx.fillText(String(count), x + 16, y + 4);
            });
            if (!active) {
                ctx.textAlign = "center"; ctx.fillStyle = ink;
                ctx.fillText(failure ? "Curve unavailable" : "Computing loss curve…", (left + right) / 2, top + 27);
            }
            panel.canvas.setAttribute("aria-label", "Mean gap loss at n = " + n + " and θ = " + theta.value + ": " +
                (scene ? scene.gap.toFixed(6) : "computing the exact value") +
                ". The reference parameter is one." + (active && active.zeroInterval ?
                " Zero-loss interval: " + active.zeroInterval.map(x => x.toFixed(5)).join(" to ") + "." : ""));
        }
        function render() {
            const n = pointCount();
            figure.querySelector('[data-value="points"]').textContent = n;
            points.setAttribute("aria-valuetext", n + " points in each marginal");
            figure.querySelector('[data-value="theta"]').textContent = Number(theta.value).toFixed(2);
            drawMarginals(panels[0]); drawLoss(panels[1]);
            const curve = curves.get(sample.source.length);
            figure.dataset.points = n; figure.dataset.theta = theta.value; figure.dataset.seed = seed;
            for (const key of ["gap", "observedCost", "optimalCost"]) {
                if (scene) figure.dataset[key] = scene[key]; else delete figure.dataset[key];
            }
            figure.dataset.sceneReady = String(Boolean(scene));
            figure.dataset.curveReady = String(Boolean(curve && scene));
            figure.dataset.curvesReady = String(curves.size);
            const missing = compare.getAttribute("aria-pressed") === "true" ? sizes.filter(n => !curves.has(n)) : [];
            const summary = scene ? "n = " + n + " · observed mean cost " + scene.observedCost.toFixed(4) +
                " · optimal mean cost " + scene.optimalCost.toFixed(4) + " · gap " + scene.gap.toFixed(5) +
                ". " + Math.min(pairLimit, sample.source.length) + "/" + n + " pairings shown. " :
                "n = " + n + " · Computing the exact OT pairing… ";
            status.textContent = summary +
                (curve ? "Zero-loss interval in this slice: [" + curve.zeroInterval.map(x => x.toFixed(5)).join(", ") + "]. " :
                    "Computing the loss curve… ") + "Seed " + seed + "." +
                (curve && curve.maxError > 1e-10 ? " Certified curve error ≤ " + curve.maxError.toFixed(3) + "." : "") +
                (curve && missing.length ? " Computing comparison curves for n = " + missing.join(", ") + "." : "") +
                (failure ? " Could not compute the curve: " + failure + "." : "");
        }

        points.addEventListener("input", () => {
            // Several adjacent log positions can round to the same integer n.
            if (pointCount() === sample.source.length) { schedule(); return; }
            setCount(); schedule(); clearTimeout(timer);
            // Invalidate outstanding messages immediately, then debounce expensive work.
            ++job; timer = setTimeout(requestCurves, 120);
        });
        theta.addEventListener("input", requestScene);
        [compare, observed].forEach(button => button.addEventListener("click", () => {
            button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true")); schedule();
        }));
        figure.querySelector("[data-resample]").addEventListener("click", () => {
            seed = (seed + 1) >>> 0; curves.clear(); makeSample(); requestCurves();
        });
        figure.querySelector("[data-reset]").addEventListener("click", () => {
            points.value = points.defaultValue; theta.value = theta.defaultValue;
            compare.setAttribute("aria-pressed", "true"); observed.setAttribute("aria-pressed", "false");
            if (seed !== 17) curves.clear(); seed = 17; makeSample(); requestCurves();
        });
        figure.classList.add("js-ready");
        makeSample(); requestCurves();
        if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(figure.querySelector(".inverse-panels"));
        else window.addEventListener("resize", schedule);
        window.addEventListener("pagehide", event => {
            if (!event.persisted) {
                clearTimeout(timer); clearTimeout(sceneTimer);
                if (worker) worker.terminate(); if (sceneWorker) sceneWorker.terminate();
            }
        });
    }
}());
