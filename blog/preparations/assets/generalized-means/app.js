(function () {
  "use strict";
  const M = window.GeneralizedMeans, V = window.GeneralizedMeansView, $ = id => document.getElementById(id);
  const min = .08, max = 2, span = max - min;
  let p = 1, q = -1, x = .45, y = 1.8, fields, result, queued = 0, redraw = 0;
  const layouts = {};
  function createCanvas(width, height) { const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; return canvas; }
  function notifyHeight() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "generalized-means", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) + 2 }, location.protocol === "file:" ? "*" : location.origin);
  }
  function number(v, digits) { return v.toFixed(digits === undefined ? 8 : digits); }
  function signed(v) { return String(Number(v.toFixed(2))).replace("-", "−"); }
  function name(v) { return v === -1 ? "harmonic" : v === 0 ? "geometric" : v === 1 ? "arithmetic" : "power mean"; }
  function radius(v) { return v === 0 ? "0 (floating-point)" : v.toExponential(2); }
  function setup(id) {
    const canvas = $(id), width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width < 70 || height < 70) return null;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    const layout = { canvas, ctx, width, height, ...V.layout(width, height) };
    layouts[id] = layout; return layout;
  }
  function drawMap(id, composed) {
    const box = setup(id); if (!box) return;
    V.drawMap(box.ctx, box.width, box.height, { fields, result, p, x, y, composed }, createCanvas);
    box.canvas.setAttribute("aria-label", (composed ? "Gauss composition with iteration trace" : "Power mean of power " + p) + ". Selected x " + number(x, 3) + ", y " + number(y, 3) + "; value " + number(composed ? result.value : M.powerMean(p, x, y)) + ". Arrow keys move the selected point.");
  }
  function drawTrace() {
    const box = setup("trace-plot"); if (!box) return;
    V.drawTrace(box.ctx, box.width, box.height, result);
    const trace = result.trace;
    box.canvas.setAttribute("aria-label", "Bracket convergence over " + result.iterations + " simultaneous updates. Initial bracket " + number(trace[0].lower, 3) + " to " + number(trace[0].upper, 3) + ". Final floating-point bracket " + number(result.lower, 12) + " to " + number(result.upper, 12) + ". Half-width " + radius(result.radius) + ". The numerical trace is available below.");
  }
  function render() { if (fields && result) { drawMap("single-plot", false); drawMap("composed-plot", true); drawTrace(); } }
  function updatePoint() {
    result = M.gaussMean(p, q, x, y);
    $("point-x").value = number(x, 3); $("point-y").value = number(y, 3);
    $("single-value").textContent = number(M.powerMean(p, x, y)); $("composed-value").textContent = number(result.value);
    $("bracket-value").textContent = "[" + number(result.lower, 12) + ", " + number(result.upper, 12) + "]";
    $("radius-value").textContent = radius(result.radius); $("iteration-count").textContent = result.iterations + " updates";
    $("identity-value").textContent = p === q ? "Power mean P" + signed(p) : p + q === 0 ? "Geometric mean" : (p === 1 && q === 0) || (p === 0 && q === 1) ? "Arithmetic–geometric" : "A new invariant mean";
    $("status").textContent = result.stopReason === "tolerance" ? "Bracket criterion met: half-width / midpoint ≤ 10⁻¹². This does not include rounding error." : result.stopReason === "max-iterations" ? "64-update cap reached; the displayed bracket has not met the requested tolerance." : result.stopReason === "equal-inputs" ? "The inputs already agree; every mean fixes the diagonal." : "Floating-point endpoints have collapsed or stalled; no zero-error claim is made.";
    $("trace-rows").replaceChildren(...result.trace.map(s => {
      const row = document.createElement("tr");
      for (const value of [String(s.iteration), number(s.x, 12), number(s.y, 12), radius(s.radius)]) { const td = document.createElement("td"); td.textContent = value; row.appendChild(td); }
      return row;
    }));
    render(); notifyHeight();
  }
  function updateParameters() {
    p = Number($("power-p").value); q = Number($("power-q").value);
    $("p-value").textContent = signed(p) + " · " + name(p); $("q-value").textContent = signed(q) + " · " + name(q);
    $("power-p").setAttribute("aria-valuetext", signed(p) + ", " + name(p)); $("power-q").setAttribute("aria-valuetext", signed(q) + ", " + name(q));
    $("single-formula").textContent = "P" + signed(p) + "(x, y)"; $("composed-formula").textContent = "M" + signed(p) + "," + signed(q) + "(x, y)";
    $("preset-ah").setAttribute("aria-pressed", p === 1 && q === -1 ? "true" : "false"); $("preset-ag").setAttribute("aria-pressed", p === 1 && q === 0 ? "true" : "false"); $("preset-equal").setAttribute("aria-pressed", p === q ? "true" : "false");
    fields = M.sampleFields(p, q); updatePoint();
  }
  function scheduleParameters() { cancelAnimationFrame(queued); queued = requestAnimationFrame(updateParameters); }
  ["power-p", "power-q"].forEach(id => $(id).addEventListener("input", scheduleParameters));
  for (const [id, first, second] of [["preset-ah", 1, -1], ["preset-ag", 1, 0]]) $(id).addEventListener("click", () => { $("power-p").value = first; $("power-q").value = second; updateParameters(); });
  $("preset-equal").addEventListener("click", () => { $("power-q").value = $("power-p").value; updateParameters(); });
  ["point-x", "point-y"].forEach(id => $(id).addEventListener("change", () => {
    const v = Number($(id).value);
    if (!Number.isFinite(v) || v < min || v > max) { $(id).value = number(id === "point-x" ? x : y, 3); return; }
    if (id === "point-x") x = v; else y = v; updatePoint();
  }));
  function movePoint(canvas, event) {
    const box = layouts[canvas.id]; if (!box) return;
    const rect = canvas.getBoundingClientRect();
    x = Math.max(min, Math.min(max, min + (event.clientX - rect.left - box.left) / box.side * span));
    y = Math.max(min, Math.min(max, max - (event.clientY - rect.top - box.top) / box.side * span));
    updatePoint();
  }
  ["single-plot", "composed-plot"].forEach(id => {
    const canvas = $(id); let dragging = false;
    canvas.addEventListener("pointerdown", event => {
      const box = layouts[id], rect = canvas.getBoundingClientRect(); if (!box || event.clientX < rect.left + box.left || event.clientX > rect.left + box.left + box.side || event.clientY < rect.top + box.top || event.clientY > rect.top + box.top + box.side) return;
      dragging = true; canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); movePoint(canvas, event);
    });
    canvas.addEventListener("pointermove", event => { if (dragging) movePoint(canvas, event); });
    canvas.addEventListener("pointerup", () => { dragging = false; }); canvas.addEventListener("pointercancel", () => { dragging = false; }); canvas.addEventListener("lostpointercapture", () => { dragging = false; });
    canvas.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
      event.preventDefault(); const step = event.shiftKey ? .1 : .01;
      if (event.key === "Home") { x = .45; y = 1.8; }
      else if (event.key === "ArrowLeft") x -= step; else if (event.key === "ArrowRight") x += step; else if (event.key === "ArrowUp") y += step; else y -= step;
      x = Math.max(min, Math.min(max, x)); y = Math.max(min, Math.min(max, y)); updatePoint();
    });
  });
  function scheduleRender() { cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => { render(); notifyHeight(); }); }
  window.addEventListener("resize", scheduleRender); $("trace-rows").closest("details").addEventListener("toggle", notifyHeight);
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(scheduleRender).observe(document.querySelector("main"));
  window.GeneralizedMeansApp = { getState: () => ({ p, q, x, y, power: M.powerMean(p, x, y), composition: result.value, lower: result.lower, upper: result.upper, radius: result.radius, iterations: result.iterations, stopReason: result.stopReason, converged: result.converged, trace: result.trace.map(s => ({ ...s })), gridSize: fields.size, bounds: [min, max], heatmapLargestRadius: fields.largestRadius, heatmapCapped: fields.capped, playing: false }) };
  updateParameters(); notifyHeight();
})();
