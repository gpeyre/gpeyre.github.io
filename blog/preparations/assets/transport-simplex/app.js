(function () {
  "use strict";
  const M = window.TransportSimplex, V = window.TransportSimplexView, $ = id => document.getElementById(id);
  const canvas = $("simplex"), handles = [$("vertex-0"), $("vertex-1"), $("vertex-2"), $("target")];
  let vertices = M.defaults.vertices.map(p => p.slice()), b = M.defaults.b.slice(), probe = null, box, queued = 0, mode = "target", colorCap = null, p = 1, exponentError = "";
  const minLog = Math.log10(.05), maxLog = Math.log10(20);
  const copy = () => ({ vertices: vertices.map(p => p.slice()), b: b.slice(), probe: probe && probe.slice(), mode, colorCap, p });
  function format(value) { return value === 0 ? "0" : value < .001 || value >= 1e4 ? value.toExponential(2) : value.toFixed(3); }
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
    $("scale-status").textContent = (colorCap === null ? "Automatic scale" : "Locked scale") + " · range 0–" + Number(box.colorCap.toPrecision(3)) + " · actual maximum " + format(box.maxCost) + (clipped ? " (darker values are saturated)." : ".");
    notifyHeight();
  }
  function update(message = "") {
    const model = M.model(vertices, p), distances = model.costs;
    $("exponent").value = Math.log10(p); $("exponent").setAttribute("aria-valuetext", "p = " + Number(p.toPrecision(4)));
    $("exponent-number").value = Number(p.toPrecision(12)); $("exponent-value").textContent = "p = " + Number(p.toPrecision(4));
    $("exponent-error").textContent = exponentError;
    for (const [id, power] of [["power-half", .5], ["power-one", 1], ["power-two", 2]]) $(id).setAttribute("aria-pressed", String(p === power));
    $("weights").textContent = "b = (" + b.map(v => v.toFixed(2)).join(", ") + ")";
    b.forEach((v, i) => { $("mass-" + i).style.width = (100 * v) + "%"; $("mass-value-" + i).textContent = (100 * v).toFixed(1) + "%"; });
    $("distances").textContent = ["c₁₂", "c₁₃", "c₂₃"].map((name, i) => name + " = " + format([distances[0][1], distances[0][2], distances[1][2]][i])).join(" · ");
    $("status").textContent = message;
    $("probe").textContent = probe ? "a = (" + probe.map(v => v.toFixed(3)).join(", ") + ")" + (mode === "inspect" ? " · pinned" : "") : "Hover to inspect; on touch, choose Inspect α and tap.";
    $("probe-cost").textContent = probe ? "Tₚ = " + format(M.value(probe, b, model)) : "Tₚ = —";
    $("mode-target").setAttribute("aria-pressed", String(mode === "target")); $("mode-inspect").setAttribute("aria-pressed", String(mode === "inspect"));
    $("lock-scale").checked = colorCap !== null;
    $("interaction-hint").textContent = mode === "inspect" ? "Tap inside to pin α and read its cost. Dragging β or a vertex still changes the problem." : "Drag β or click inside to move the target. All three vertices remain draggable.";
    handles.forEach((node, i) => node.setAttribute("aria-label", i < 3 ? "Support x" + (i + 1) + " at (" + vertices[i].map(v => v.toFixed(2)).join(", ") + "). Use arrow keys to move." : "Target beta, weights (" + b.map(v => v.toFixed(3)).join(", ") + "). Use arrow keys to move."));
    cancelAnimationFrame(queued); queued = requestAnimationFrame(draw);
  }
  function world(event) { const r = canvas.getBoundingClientRect(); return box.toWorld([event.clientX - r.left, event.clientY - r.top]); }
  function setVertices(candidate) {
    try { M.model(candidate, p); } catch (_) { update("These powered costs exceed floating-point range. Reduce p before moving the vertices further."); return; }
    vertices = candidate; update();
  }
  function move(index, p) {
    if (mode !== "inspect") probe = null;
    if (index === 3) b = M.projectProbability(M.barycentric(p, vertices));
    else if (M.validateVertexMove(vertices, index, p)) { setVertices(vertices.map((v, i) => i === index ? p : v)); return; }
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
  $("lock-scale").addEventListener("change", () => { colorCap = $("lock-scale").checked ? V.scaleFor(Math.max(...M.model(vertices, p).costs.map(row => row.reduce((s, d, j) => s + d * b[j], 0)))).cap : null; update(); });
  function setExponent(value, expand = false) {
    try { M.model(vertices, value); } catch (_) { exponentError = "Choose p > 0 with finite, nonzero off-diagonal costs. This value is outside the numerical range."; update(); return; }
    exponentError = ""; if (value !== p) colorCap = null; p = value;
    if (expand) { $("exponent").min = Math.min(Number($("exponent").min), Math.floor(Math.log10(p))); $("exponent").max = Math.max(Number($("exponent").max), Math.ceil(Math.log10(p))); }
    update();
  }
  $("exponent").addEventListener("input", () => setExponent(10 ** Number($("exponent").value)));
  $("exponent-number").addEventListener("change", () => setExponent(Number($("exponent-number").value), true));
  for (const [id, value] of [["power-half", .5], ["power-one", 1], ["power-two", 2]]) $(id).addEventListener("click", () => setExponent(value));
  $("reset").addEventListener("click", () => { vertices = M.defaults.vertices.map(p => p.slice()); b = M.defaults.b.slice(); probe = null; mode = "target"; colorCap = null; p = 1; exponentError = ""; $("exponent").min = minLog; $("exponent").max = maxLog; update(); });
  $("center").addEventListener("click", () => { b = M.defaults.b.slice(); if (mode !== "inspect") probe = null; update(); });
  $("equilateral").addEventListener("click", () => { if (mode !== "inspect") probe = null; setVertices([[.45, .4], [2.75, .4], [1.6, .4 + 2.3 * Math.sqrt(3) / 2]]); });
  $("thin").addEventListener("click", () => { if (mode !== "inspect") probe = null; setVertices([[.35, .6], [2.85, .6], [1.15, 1.02]]); });
  window.addEventListener("resize", () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); });
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(notifyHeight).observe(document.querySelector("main"));
  window.TransportSimplexApp = { getState: copy }; update();
})();
