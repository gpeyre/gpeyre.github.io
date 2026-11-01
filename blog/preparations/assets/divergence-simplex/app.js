(function () {
  "use strict";
  const M = window.DivergenceSimplex, V = window.DivergenceSimplexView, $ = id => document.getElementById(id);
  let p = M.defaultTarget.slice(), lambda = 1, box, queued = 0, dragging = false;
  const canvas = $("simplex"), createCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  function notifyHeight() { if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "divergence-simplex", height: document.querySelector("main").getBoundingClientRect().height + 2 }, location.protocol === "file:" ? "*" : location.origin); }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2); if (w < 80 || h < 80) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    box = V.draw(ctx, w, h, { p, lambda }, createCanvas); notifyHeight();
  }
  function update() {
    $("power").value = lambda; $("power-value").textContent = lambda.toFixed(2) + " · " + M.name(lambda);
    $("target-first").value = p[0]; $("target-second").max = 1 - p[0] - M.floor; $("target-second").value = p[1];
    $("first-value").textContent = p[0].toFixed(3); $("second-value").textContent = p[1].toFixed(3);
    for (const [id, value] of [["reverse", 0], ["hellinger", .5], ["kl", 1], ["pearson", 2]]) $("preset-" + id).setAttribute("aria-pressed", lambda === value ? "true" : "false");
    $("status").textContent = "p = (" + p.map(v => v.toFixed(3)).join(", ") + ") · " + M.name(lambda) + " · minimum Dφ(p | p) = 0.";
    canvas.setAttribute("aria-label", "Power f-divergence on three probabilities, lambda " + lambda.toFixed(2) + ". Target " + p.map(v => v.toFixed(3)).join(", ") + ". Click or use arrow keys to move the target.");
    cancelAnimationFrame(queued); queued = requestAnimationFrame(draw);
  }
  $("power").addEventListener("input", () => { const value = Number($("power").value); if (Number.isFinite(value)) lambda = Math.max(0, Math.min(2, value)); update(); });
  $("target-first").addEventListener("input", () => { const v = Number($("target-first").value); if (Number.isFinite(v)) { const a = Math.max(M.floor, Math.min(1 - 2 * M.floor, v)), b = Math.min(p[1], 1 - a - M.floor); p = [a, b, 1 - a - b]; } update(); });
  $("target-second").addEventListener("input", () => { const v = Number($("target-second").value); if (Number.isFinite(v)) { const b = Math.max(M.floor, Math.min(1 - p[0] - M.floor, v)); p = [p[0], b, 1 - p[0] - b]; } update(); });
  for (const [id, value] of [["reverse", 0], ["hellinger", .5], ["kl", 1], ["pearson", 2]]) $("preset-" + id).addEventListener("click", () => { lambda = value; update(); });
  function move(event) {
    if (!box) return; const r = canvas.getBoundingClientRect(), q = V.probabilities(event.clientX - r.left, event.clientY - r.top, box);
    if (!dragging && Math.min(...q) < 0) return;
    p = M.projectTarget(q); update();
  }
  canvas.addEventListener("pointerdown", event => { if (!box) return; const r = canvas.getBoundingClientRect(), q = V.probabilities(event.clientX - r.left, event.clientY - r.top, box); if (Math.min(...q) < -1e-10) return; dragging = true; canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); move(event); });
  canvas.addEventListener("pointermove", event => { if (dragging) move(event); });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(type, () => { dragging = false; });
  canvas.addEventListener("keydown", event => {
    if (!["Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault();
    const s = event.shiftKey ? .05 : .01, q = p.slice();
    if (event.key === "Home") p = M.defaultTarget.slice();
    else { if (event.key === "ArrowLeft") { q[0] -= s; q[2] += s; } if (event.key === "ArrowRight") { q[0] += s; q[2] -= s; } if (event.key === "ArrowUp") { q[1] += s; q[2] -= s; } if (event.key === "ArrowDown") { q[1] -= s; q[2] += s; } p = M.projectTarget(q); } update();
  });
  window.addEventListener("resize", () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); });
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(notifyHeight).observe(document.querySelector("main"));
  window.DivergenceSimplexApp = { getState: () => ({ p: p.slice(), lambda, colorCap: V.cap }) };
  update();
})();
