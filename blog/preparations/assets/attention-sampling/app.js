(function () {
  "use strict";
  const M = window.AttentionSampling;
  const $ = id => document.getElementById(id);
  const palette = ["#2563a4", "#bd4b25", "#008376", "#9252a3", "#9c7411"];
  const rule = M.simpsonRule(-8, 8, 256);
  const query = new URLSearchParams(location.search);
  const requestedSeed = Number(query.get("seed"));
  let seed = query.has("seed") && Number.isInteger(requestedSeed) && requestedSeed >= 0 && requestedSeed <= 0xffffffff ? requestedSeed : 20261016;
  if (query.has("n") && Number.isFinite(Number(query.get("n"))) && Number(query.get("n")) > 0) $("sample-size").value = Math.log2(M.nFromExponent(Math.log2(Number(query.get("n")))));
  if (query.has("tau") && Number.isFinite(Number(query.get("tau")))) $("strength").value = Math.max(0.25, Math.min(2, Number(query.get("tau"))));
  let bank = M.sampleBank(seed), generation = 0, completed = null;
  let activeTimer = null, redrawFrame = null;

  function notifyHeight() {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "ot-experiment-size", topic: "attention-sampling", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) }, location.protocol === "file:" ? "*" : location.origin);
  }

  function startComputation() {
    const version = ++generation;
    clearTimeout(activeTimer);
    const n = M.nFromExponent(Number($("sample-size").value)), tau = Number($("strength").value);
    $("sample-size-value").textContent = n.toLocaleString("en-US");
    $("sample-size").setAttribute("aria-valuetext", n + " tokens in each draw");
    $("strength-value").textContent = tau.toFixed(2);
    $("strength").setAttribute("aria-valuetext", tau.toFixed(2));
    $("seed-note").textContent = "Seed " + seed + ". Reproduce with ?seed=" + seed + "&n=" + n + "&tau=" + tau + ".";
    $("results").setAttribute("aria-busy", "true");
    $("status").textContent = "Updating five draws for n = " + n.toLocaleString("en-US") + ", τ = " + tau.toFixed(2) + "…";
    const samples = bank.map(values => M.prepareSample(values, n));
    const curves = samples.map(() => new Float64Array(rule.nodes.length));
    let draw = 0, node = 0;
    // Work in short cancellable slices. Even the largest sample keeps controls responsive.
    function slice() {
      if (version !== generation) return;
      const stop = performance.now() + 7;
      do {
        curves[draw][node] = M.evaluatePrepared(samples[draw], rule.nodes[node], tau);
        node++;
        if (node === rule.nodes.length) { node = 0; draw++; }
      } while (draw < samples.length && performance.now() < stop);
      if (draw < samples.length) { activeTimer = setTimeout(slice, 0); return; }
      if (version !== generation) return;
      completed = { n, tau, seed, samples, curves, errors: curves.map(values => M.l2FromValues(values, tau, rule)) };
      render();
      $("results").setAttribute("aria-busy", "false");
      $("status").textContent = "Showing five draws with " + n.toLocaleString("en-US") + " tokens each; τ = " + tau.toFixed(2) + ". Black line: population attention. Colored curves: empirical attention.";
      notifyHeight();
    }
    activeTimer = setTimeout(slice, 0);
  }

  function setupCanvas(canvas) {
    const ratio = Math.min(3, window.devicePixelRatio || 1);
    const width = canvas.clientWidth, height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.font = "11px system-ui, sans-serif";
    return { ctx, width, height, left: 51, right: 14, top: 16, bottom: 36 };
  }

  function plotFrame(canvas, low, high, isError) {
    const p = setupCanvas(canvas), { ctx, width, height, left, right, top, bottom } = p;
    const x = value => left + (value + 4) / 8 * (width - left - right);
    const y = value => height - bottom - (value - low) / (high - low) * (height - top - bottom);
    ctx.strokeStyle = "#e8eeee"; ctx.lineWidth = 1;
    ctx.fillStyle = "#617078"; ctx.textAlign = "center";
    for (let tick = -4; tick <= 4; tick += width < 400 ? 2 : 1) {
      ctx.beginPath(); ctx.moveTo(x(tick), top); ctx.lineTo(x(tick), height - bottom); ctx.stroke();
      ctx.fillText(tick.toString().replace("-", "−"), x(tick), height - bottom + 18);
    }
    ctx.textAlign = "right";
    for (let j = 0; j <= 4; j++) {
      const value = low + (high - low) * j / 4;
      ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(width - right, y(value)); ctx.stroke();
      const label = Math.abs(value) < 1e-14 ? "0" : (high - low < 0.1 ? value.toExponential(1) : value.toFixed(high - low < 2 ? 2 : 1)).replace("-", "−");
      ctx.fillText(label, left - 7, y(value) + 4);
    }
    ctx.strokeStyle = "#bacbcd";
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, height - bottom); ctx.lineTo(width - right, height - bottom); ctx.stroke();
    ctx.fillStyle = "#617078"; ctx.textAlign = "right";
    ctx.fillText("query x", width - right, height - 3);
    ctx.textAlign = "left";
    ctx.fillText(isError ? "weighted squared error" : "output", left + 5, 11);
    return { ...p, x, y };
  }

  function path(ctx, x, y, values, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < rule.nodes.length; i++) {
      const queryValue = rule.nodes[i];
      if (queryValue < -4 || queryValue > 4) continue;
      if (first) { ctx.moveTo(x(queryValue), y(values[i])); first = false; }
      else ctx.lineTo(x(queryValue), y(values[i]));
    }
    ctx.stroke();
  }

  function render() {
    if (!completed) return;
    const { tau, n, curves, samples, errors } = completed;
    let limit = Math.max(1, tau * 4), errorMax = 0;
    const residuals = curves.map(curve => Float64Array.from(curve, (value, i) => {
      const error = value - M.population(rule.nodes[i], tau);
      return M.gaussianDensity(rule.nodes[i]) * error * error;
    }));
    for (let k = 0; k < curves.length; k++) for (let i = 0; i < rule.nodes.length; i++) {
      if (Math.abs(rule.nodes[i]) <= 4) {
        limit = Math.max(limit, Math.abs(curves[k][i]));
        errorMax = Math.max(errorMax, residuals[k][i]);
      }
    }
    limit = Math.ceil(limit * 1.05 * 2) / 2;
    const top = plotFrame($("attention-plot"), -limit, limit, false);
    const { ctx, x, y, height, bottom, left, width, right } = top;
    ctx.save(); ctx.beginPath(); ctx.rect(left, top.top, width - left - right, height - top.top - bottom); ctx.clip();
    // Density is deliberately decorative, scaled independently from attention output.
    ctx.fillStyle = "rgba(143, 173, 178, 0.15)";
    ctx.beginPath(); ctx.moveTo(x(-4), height - bottom);
    for (let i = 0; i <= 128; i++) {
      const q = -4 + i / 16;
      ctx.lineTo(x(q), height - bottom - Math.exp(-q * q / 2) * (height - top.top - bottom) * 0.3);
    }
    ctx.lineTo(x(4), height - bottom); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(37, 99, 164, " + Math.max(0.025, Math.min(0.3, 14 / Math.sqrt(n))).toFixed(3) + ")";
    ctx.lineWidth = 0.8; ctx.beginPath();
    for (let i = 0; i < n; i++) if (Math.abs(samples[0].values[i]) <= 4) {
      const pos = x(samples[0].values[i]); ctx.moveTo(pos, height - bottom); ctx.lineTo(pos, height - bottom - 8);
    }
    ctx.stroke();
    curves.forEach((curve, k) => path(ctx, x, y, curve, palette[k], 1.8));
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2.3; ctx.beginPath(); ctx.moveTo(x(-4), y(-4 * tau)); ctx.lineTo(x(4), y(4 * tau)); ctx.stroke();
    ctx.restore();
    const lower = plotFrame($("error-plot"), 0, Math.max(1e-12, errorMax * 1.12), true);
    residuals.forEach((curve, k) => path(lower.ctx, lower.x, lower.y, curve, palette[k], 1.7));
    const outputs = document.querySelectorAll("#norms output");
    errors.forEach((value, k) => { outputs[k].textContent = value < 0.001 ? value.toExponential(2) : value.toFixed(3); });
    $("attention-plot").setAttribute("aria-label", "Population attention is the black line with slope " + tau.toFixed(2) + ". Five empirical curves use " + n + " independent Gaussian tokens each. The density is faintly shaded and draw 1 tokens form a rug.");
    $("error-plot").setAttribute("aria-label", "Query-density-weighted squared errors for five independent draws, for queries from minus 4 to 4. Largest value on this displayed query grid: " + errorMax.toPrecision(3) + ". Query-weighted L2 errors are listed below.");
  }

  $("sample-size").addEventListener("input", startComputation);
  $("strength").addEventListener("input", startComputation);
  $("resample").addEventListener("click", () => {
    seed = M.mixSeed(seed + 0x9e3779b9); bank = M.sampleBank(seed); startComputation();
  });
  window.addEventListener("resize", () => {
    if (redrawFrame !== null) cancelAnimationFrame(redrawFrame);
    redrawFrame = requestAnimationFrame(() => { redrawFrame = null; render(); notifyHeight(); });
  });
  window.addEventListener("message", event => {
    if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data && event.data.type === "ot-experiment-measure") notifyHeight();
  });
  if (window.ResizeObserver) new ResizeObserver(notifyHeight).observe(document.querySelector("main"));
  startComputation(); notifyHeight();
})();
