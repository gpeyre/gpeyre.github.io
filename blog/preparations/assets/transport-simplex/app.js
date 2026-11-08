(function () {
  "use strict";
  const M = window.TransportSimplex, V = window.TransportSimplexView, $ = id => document.getElementById(id);
  const canvas = $("simplex"), handles = [$("vertex-0"), $("vertex-1"), $("vertex-2"), $("target")];
  let vertices = M.defaults.vertices.map(p => p.slice()), b = M.defaults.b.slice(), probe = null, box, queued = 0;
  const copy = () => ({ vertices: vertices.map(p => p.slice()), b: b.slice(), probe: probe && probe.slice() });
  function notifyHeight() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "transport-simplex", height: document.querySelector("main").getBoundingClientRect().height + 2 }, location.protocol === "file:" ? "*" : location.origin);
  }
  function draw() {
    const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2); if (width < 80) return;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    box = V.draw(ctx, width, height, copy());
    [...box.points, box.target].forEach((p, i) => { handles[i].style.left = p[0] + "px"; handles[i].style.top = p[1] + "px"; });
    $("spacing").textContent = (box.maxCost / 10).toFixed(3);
    notifyHeight();
  }
  function update(message = "") {
    const { distances } = M.geometry(vertices);
    $("weights").textContent = "(" + b.map(v => v.toFixed(3)).join(", ") + ")";
    $("distances").textContent = "(" + [distances[0][1], distances[0][2], distances[1][2]].map(v => v.toFixed(3)).join(", ") + ")";
    $("status").textContent = message;
    $("probe").textContent = probe ? "α weights = (" + probe.map(v => v.toFixed(3)).join(", ") + ") · W₁(α, β) = " + M.cost(probe, b, vertices).toFixed(4) : "Hover over the triangle to inspect α and its transport cost.";
    handles.forEach((node, i) => node.setAttribute("aria-label", i < 3 ? "Support x" + (i + 1) + " at (" + vertices[i].map(v => v.toFixed(2)).join(", ") + "). Use arrow keys to move." : "Target beta, weights (" + b.map(v => v.toFixed(3)).join(", ") + "). Use arrow keys to move."));
    cancelAnimationFrame(queued); queued = requestAnimationFrame(draw);
  }
  function world(event) { const r = canvas.getBoundingClientRect(); return box.toWorld([event.clientX - r.left, event.clientY - r.top]); }
  function move(index, p) {
    probe = null;
    if (index === 3) b = M.projectProbability(M.barycentric(p, vertices));
    else if (M.validateVertexMove(vertices, index, p)) vertices[index] = p;
    else { update("Keep the vertices separated and the triangle non-flat, inside the drawing area."); return; }
    update();
  }
  handles.forEach((node, i) => {
    let pointer = null, offset = [0, 0];
    node.addEventListener("pointerdown", event => {
      if (!box || (event.button !== undefined && event.button !== 0)) return;
      event.preventDefault(); node.focus({ preventScroll: true }); pointer = event.pointerId; node.setPointerCapture(pointer);
      const p = world(event), current = i < 3 ? vertices[i] : M.point(b, vertices); offset = current.map((v, k) => v - p[k]);
    });
    node.addEventListener("pointermove", event => { if (pointer === event.pointerId && box) move(i, world(event).map((v, k) => v + offset[k])); });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) node.addEventListener(type, () => { pointer = null; });
    node.addEventListener("keydown", event => {
      if (!["Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); const step = event.shiftKey ? .12 : .035;
      if (event.key === "Home") { if (i === 3) { b = M.defaults.b.slice(); update(); } else move(i, M.defaults.vertices[i].slice()); return; }
      const p = i < 3 ? vertices[i].slice() : M.point(b, vertices);
      if (event.key === "ArrowLeft") p[0] -= step; if (event.key === "ArrowRight") p[0] += step;
      if (event.key === "ArrowUp") p[1] += step; if (event.key === "ArrowDown") p[1] -= step; move(i, p);
    });
  });
  canvas.addEventListener("click", event => { if (!box) return; const p = world(event), a = M.barycentric(p, vertices); if (Math.min(...a) >= -1e-10) move(3, p); });
  canvas.addEventListener("pointermove", event => { if (!box) return; const a = M.barycentric(world(event), vertices); probe = Math.min(...a) >= -1e-10 ? M.projectProbability(a) : null; update(); });
  canvas.addEventListener("pointerleave", () => { probe = null; update(); });
  $("reset").addEventListener("click", () => { vertices = M.defaults.vertices.map(p => p.slice()); b = M.defaults.b.slice(); probe = null; update(); });
  $("center").addEventListener("click", () => { b = M.defaults.b.slice(); probe = null; update(); });
  $("equilateral").addEventListener("click", () => { vertices = [[.45, .4], [2.75, .4], [1.6, .4 + 2.3 * Math.sqrt(3) / 2]]; probe = null; update(); });
  $("thin").addEventListener("click", () => { vertices = [[.35, .6], [2.85, .6], [1.15, 1.02]]; probe = null; update(); });
  window.addEventListener("resize", () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); });
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(notifyHeight).observe(document.querySelector("main"));
  window.TransportSimplexApp = { getState: copy }; update();
})();
