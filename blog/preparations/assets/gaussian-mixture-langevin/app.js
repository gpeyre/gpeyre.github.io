(function () {
  "use strict";
  const M = window.MixtureLangevin, V = window.MixtureLangevinView;
  const $ = id => document.getElementById(id), time = $("time"), components = $("components"), spread = $("spread"), play = $("play");
  const cache = new Map();
  let result = null, previewScene = null, worker = null, pendingTimer = 0, request = 0, playing = false, animationFrame = 0, startTimestamp = null, startTime = 0, lastDraw = 0;
  function notifyHeight() {
    parent.postMessage({ type: "ot-experiment-size", topic: "gaussian-mixture-langevin",
      height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) }, location.protocol === "file:" ? "*" : location.origin);
  }
  function readouts() {
    $("time-value").textContent = Number(time.value).toFixed(2);
    $("components-value").textContent = components.value;
    $("spread-value").textContent = "R = " + Number(spread.value).toFixed(2);
  }
  function draw() {
    readouts(); const scene = result || previewScene; if (!scene) return;
    const state = result ? M.sample(result, Number(time.value)) : { density: scene.initialDensity };
    const canvas = $("density"), box = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1), width = Math.round(box.width * dpr), height = Math.round(box.height * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    V.drawDensity(ctx, box.width, box.height, scene.grid, state.density,
      { target: scene.target, centers: scene.centers, preview: !result });
    $("entropy-value").textContent = result ? V.number(state.entropy) : "—";
    $("tv-value").textContent = result ? state.totalVariation.toFixed(3) : "—";
  }
  function stop() { playing = false; cancelAnimationFrame(animationFrame); play.textContent = "Play evolution"; play.setAttribute("aria-pressed", "false"); }
  function receive(data) {
    if (data.id !== request) return;
    $("results").setAttribute("aria-busy", "false");
    if (data.error) { play.disabled = true; time.disabled = true; $("status").textContent = "Target preview available; this diffusion could not be computed: " + data.error; return; }
    result = data.result; const key = result.k + ":" + result.spread;
    previewScene = null; $("results").dataset.phase = "ready";
    cache.delete(key); cache.set(key, result); if (cache.size > 3) cache.delete(cache.keys().next().value);
    play.disabled = false; time.disabled = false;
    $("status").textContent = "Same narrow initial Gaussian · same isotropic noise · no time rescaling";
    draw(); notifyHeight();
  }
  function startWorker(currentId, k, radius) {
    if (currentId !== request) return;
    pendingTimer = 0;
    try {
      const currentWorker = new Worker("worker.js?v=left-preview-v2");
      worker = currentWorker; currentWorker.onmessage = event => receive(event.data);
      currentWorker.onerror = event => {
        if (currentId !== request || worker !== currentWorker) { event.preventDefault(); return; }
        play.disabled = true; $("results").setAttribute("aria-busy", "false");
        $("status").textContent = "The numerical worker could not start. Please reload this figure over HTTP.";
      };
      currentWorker.postMessage({ id: currentId, k, spread: radius });
    } catch (_) { $("results").setAttribute("aria-busy", "false"); $("status").textContent = "This browser cannot run the numerical worker. The article describes the model and the Gaussian benchmark."; }
  }
  function solve() {
    stop(); request++; clearTimeout(pendingTimer); pendingTimer = 0;
    if (worker) { worker.terminate(); worker = null; }
    const k = Number(components.value), radius = Number(spread.value), key = k + ":" + radius;
    result = null; time.value = "0"; time.disabled = true; play.disabled = true;
    const results = $("results"); results.setAttribute("aria-busy", "true");
    results.dataset.phase = "preview"; results.dataset.components = String(k); results.dataset.spread = String(radius);
    // Geometry and the fixed initial cloud update synchronously on every input.
    // Debounce only the expensive evolution, never the target contour feedback.
    previewScene = M.preview(k, radius, { nx: 101, ny: 101 });
    draw(); notifyHeight();
    $("status").textContent = "Target updated · computing diffusion for k = " + k + ", R = " + radius.toFixed(2) + "…";
    if (cache.has(key)) { receive({ id: request, result: cache.get(key) }); return; }
    const currentId = request;
    pendingTimer = setTimeout(() => startWorker(currentId, k, radius), 140);
  }
  function animate(now) {
    if (!playing) return;
    if (startTimestamp === null) startTimestamp = now;
    const t = Math.min(20, startTime + (now - startTimestamp) * .00125);
    if (now - lastDraw >= 33 || t === 20) { time.value = t.toFixed(2); draw(); lastDraw = now; }
    if (t === 20) stop(); else animationFrame = requestAnimationFrame(animate);
  }
  time.addEventListener("input", () => { stop(); draw(); });
  components.addEventListener("input", solve); spread.addEventListener("input", solve);
  play.addEventListener("click", () => {
    if (!result) return;
    if (playing) { stop(); return; }
    if (Number(time.value) >= 20) time.value = "0";
    startTime = Number(time.value); startTimestamp = null; lastDraw = 0; playing = true;
    play.textContent = "Pause"; play.setAttribute("aria-pressed", "true"); animationFrame = requestAnimationFrame(animate);
  });
  new ResizeObserver(() => { draw(); notifyHeight(); }).observe(document.querySelector("main"));
  window.addEventListener("message", event => {
    if (event.source === parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight();
  });
  document.querySelector("details").addEventListener("toggle", notifyHeight); solve();
}());
