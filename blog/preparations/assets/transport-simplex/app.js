(function () {
  "use strict";
  const M = window.TransportSimplex, V = window.TransportSimplexView, $ = id => document.getElementById(id);
  const canvas = $("simplex"), handles = [$("vertex-0"), $("vertex-1"), $("vertex-2"), $("target")];
  let vertices = M.defaults.vertices.map(p => p.slice()), b = M.defaults.b.slice(), probe = null, box, queued = 0, mode = "target", colorCap = null;
  const copy = () => ({ vertices: vertices.map(p => p.slice()), b: b.slice(), probe: probe && probe.slice(), mode, colorCap });
  function notifyHeight() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "transport-simplex", height: document.querySelector("main").getBoundingClientRect().height + 2 }, location.protocol === "file:" ? "*" : location.origin);
  }
  function draw() {
    const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2); if (width < 80) return;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    box = V.draw(ctx, width, height, copy());
    [...box.points, box.target].forEach((p, i) => { handles[i].style.left = p[0] + "px"; handles[i].style.top = p[1] + "px"; });
    $("spacing").textContent = Number(box.step.toPrecision(3)).toString();
    const clipped = box.maxCost > box.colorCap + 1e-10;
    $("scale-status").textContent = (colorCap === null ? "Automatic scale" : "Locked scale") + " · range 0–" + Number(box.colorCap.toPrecision(3)) + " · actual maximum " + box.maxCost.toFixed(3) + (clipped ? " (darker values are saturated)." : ".");
    notifyHeight();
  }
  function update(message = "") {
    const { distances } = M.geometry(vertices);
    $("weights").textContent = "b = (" + b.map(v => v.toFixed(2)).join(", ") + ")";
    b.forEach((v, i) => { $("mass-" + i).style.width = (100 * v) + "%"; $("mass-value-" + i).textContent = (100 * v).toFixed(1) + "%"; });
    $("distances").textContent = ["c₁₂", "c₁₃", "c₂₃"].map((name, i) => name + " = " + [distances[0][1], distances[0][2], distances[1][2]][i].toFixed(3)).join(" · ");
    $("status").textContent = message;
    $("probe").textContent = probe ? "a = (" + probe.map(v => v.toFixed(3)).join(", ") + ")" + (mode === "inspect" ? " · pinned" : "") : "Hover to inspect; on touch, choose Inspect α and tap.";
    $("probe-cost").textContent = probe ? "W₁ = " + M.cost(probe, b, vertices).toFixed(4) : "W₁ = —";
    $("mode-target").setAttribute("aria-pressed", String(mode === "target")); $("mode-inspect").setAttribute("aria-pressed", String(mode === "inspect"));
    $("lock-scale").checked = colorCap !== null;
    $("interaction-hint").textContent = mode === "inspect" ? "Tap inside to pin α and read its cost. Dragging β or a vertex still changes the problem." : "Drag β or click inside to move the target. All three vertices remain draggable.";
    handles.forEach((node, i) => node.setAttribute("aria-label", i < 3 ? "Support x" + (i + 1) + " at (" + vertices[i].map(v => v.toFixed(2)).join(", ") + "). Use arrow keys to move." : "Target beta, weights (" + b.map(v => v.toFixed(3)).join(", ") + "). Use arrow keys to move."));
    cancelAnimationFrame(queued); queued = requestAnimationFrame(draw);
  }
  function world(event) { const r = canvas.getBoundingClientRect(); return box.toWorld([event.clientX - r.left, event.clientY - r.top]); }
  function move(index, p) {
    if (mode !== "inspect") probe = null;
    if (index === 3) b = M.projectProbability(M.barycentric(p, vertices));
    else if (M.validateVertexMove(vertices, index, p)) vertices[index] = p;
    else { update("Keep the vertices separated and the triangle non-flat, inside the drawing area."); return; }
    update();
  }
  handles.forEach((node, i) => {
    let pointer = null, offset = [0, 0], dragged = false, start = [0, 0];
    node.addEventListener("pointerdown", event => {
      if (!box || (event.button !== undefined && event.button !== 0)) return;
      event.preventDefault(); node.focus({ preventScroll: true }); pointer = event.pointerId; node.setPointerCapture(pointer); dragged = false; start = [event.clientX, event.clientY];
      const p = world(event), current = i < 3 ? vertices[i] : M.point(b, vertices); offset = current.map((v, k) => v - p[k]);
    });
    node.addEventListener("pointermove", event => { if (pointer === event.pointerId && box && (dragged || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 3)) { dragged = true; move(i, world(event).map((v, k) => v + offset[k])); } });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) node.addEventListener(type, () => { pointer = null; });
    node.addEventListener("click", () => { if (mode === "inspect" && !dragged) { probe = i < 3 ? [0, 1, 2].map(j => +(j === i)) : b.slice(); update(); } dragged = false; });
    node.addEventListener("keydown", event => {
      if (!["Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); const step = event.shiftKey ? .12 : .035;
      if (event.key === "Home") { if (i === 3) { b = M.defaults.b.slice(); update(); } else move(i, M.defaults.vertices[i].slice()); return; }
      const p = i < 3 ? vertices[i].slice() : M.point(b, vertices);
      if (event.key === "ArrowLeft") p[0] -= step; if (event.key === "ArrowRight") p[0] += step;
      if (event.key === "ArrowUp") p[1] += step; if (event.key === "ArrowDown") p[1] -= step; move(i, p);
    });
  });
  canvas.addEventListener("click", event => { if (!box) return; const p = world(event), a = M.barycentric(p, vertices); if (Math.min(...a) < -1e-10) return; if (mode === "inspect") { probe = M.projectProbability(a); update(); } else move(3, p); });
  canvas.addEventListener("pointermove", event => { if (!box || mode === "inspect" || event.pointerType === "touch") return; const a = M.barycentric(world(event), vertices); probe = Math.min(...a) >= -1e-10 ? M.projectProbability(a) : null; update(); });
  canvas.addEventListener("pointerleave", () => { if (mode !== "inspect") { probe = null; update(); } });
  canvas.addEventListener("keydown", event => {
    if (mode !== "inspect" || !["Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); const step = event.shiftKey ? .12 : .035, p = M.point(probe || b, vertices);
    if (event.key === "Home") probe = b.slice();
    else { if (event.key === "ArrowLeft") p[0] -= step; if (event.key === "ArrowRight") p[0] += step; if (event.key === "ArrowUp") p[1] += step; if (event.key === "ArrowDown") p[1] -= step; probe = M.projectProbability(M.barycentric(p, vertices)); } update();
  });
  $("mode-target").addEventListener("click", () => { mode = "target"; probe = null; update(); });
  $("mode-inspect").addEventListener("click", () => { mode = "inspect"; probe = probe || b.slice(); update(); });
  $("lock-scale").addEventListener("change", () => { colorCap = $("lock-scale").checked ? V.scaleFor(Math.max(...M.geometry(vertices).distances.map(row => row.reduce((s, d, j) => s + d * b[j], 0)))).cap : null; update(); });
  $("reset").addEventListener("click", () => { vertices = M.defaults.vertices.map(p => p.slice()); b = M.defaults.b.slice(); probe = null; mode = "target"; colorCap = null; update(); });
  $("center").addEventListener("click", () => { b = M.defaults.b.slice(); if (mode !== "inspect") probe = null; update(); });
  $("equilateral").addEventListener("click", () => { vertices = [[.45, .4], [2.75, .4], [1.6, .4 + 2.3 * Math.sqrt(3) / 2]]; if (mode !== "inspect") probe = null; update(); });
  $("thin").addEventListener("click", () => { vertices = [[.35, .6], [2.85, .6], [1.15, 1.02]]; if (mode !== "inspect") probe = null; update(); });
  window.addEventListener("resize", () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); });
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(notifyHeight).observe(document.querySelector("main"));
  window.TransportSimplexApp = { getState: copy }; update();
})();
