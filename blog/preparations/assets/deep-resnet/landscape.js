(function () {
  "use strict";
  const G = window.ResNetLandscape, $ = id => document.getElementById(id);
  const canvas = $("landscape"), context = canvas.getContext("2d"), root = $("experiment");
  if (!context || !G) { $("metrics").textContent = "The interactive canvas could not start; all formulas remain available in the article."; return; }
  const palette = ["#526db4", "#2d84a2", "#163c45", "#45977a", "#a79337", "#c17735", "#b74d69"];
  const pointers = new Map();
  let camera = {...G.INITIAL_CAMERA}, L = 10, frame = null, plot = null, cacheKey = "", cachedPaths = [];
  const fmt = x => Math.abs(x) < 1e-12 ? "0" : Math.abs(x) >= 1e5 || Math.abs(x) < .001 ? x.toExponential(2) : Number(x.toPrecision(5)).toString();
  const depthText = () => L === Infinity ? "∞" : String(L);
  function measure() {
    if (parent !== window) parent.postMessage({type: "ot-experiment-size", topic: "resnet-landscape", height: Math.ceil(root.getBoundingClientRect().height)}, location.protocol === "file:" ? "*" : location.origin);
  }
  window.addEventListener("message", event => {
    if (event.source === parent && (event.origin === location.origin || event.origin === "null") && event.data && event.data.type === "ot-experiment-measure") measure();
  });
  function requestDraw() { if (frame === null) frame = requestAnimationFrame(() => { frame = null; draw(); }); }
  function tickStep(span, pixels) {
    const wanted = span / Math.max(2, pixels / 85), power = 10 ** Math.floor(Math.log10(wanted));
    return [1, 2, 5, 10].find(x => x * power >= wanted) * power;
  }
  function draw() {
    const rect = canvas.getBoundingClientRect(), width = canvas.clientWidth || rect.width, height = canvas.clientHeight || rect.height, dpr = Math.min(2, devicePixelRatio || 1);
    if (!(width > 0 && height > 0)) return;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
    plot = {left: width < 500 ? 49 : 57, top: 26, width: width - (width < 500 ? 65 : 76), height: height - 70};
    const p = plot, b = G.cameraBounds(camera, p.width, p.height);
    const X = x => p.left + (x - b.xmin) * b.scale, Y = y => p.top + (b.ymax - y) * b.scale;
    context.font = "11px system-ui"; context.lineWidth = 1;
    const sx = tickStep(b.xmax - b.xmin, p.width), sy = tickStep(b.ymax - b.ymin, p.height);
    function grid(axis, step, lo, hi) {
      const count = Math.floor(hi / step) - Math.ceil(lo / step);
      if (count > 100 || count < 0) return;
      for (let i = Math.ceil(lo / step); i <= Math.floor(hi / step); i++) {
        const value = i * step, q = axis === "x" ? X(value) : Y(value);
        if ($("show-grid").checked || i === 0) {
          context.strokeStyle = i === 0 ? "#9bb2b5" : "#e8eeee";
          context.beginPath(); context.moveTo(axis === "x" ? q : p.left, axis === "x" ? p.top : q);
          context.lineTo(axis === "x" ? q : p.left + p.width, axis === "x" ? p.top + p.height : q); context.stroke();
        }
        context.fillStyle = "#536c70"; context.textAlign = axis === "x" ? "center" : "right";
        context.fillText(fmt(value), axis === "x" ? q : p.left - 7, axis === "x" ? p.top + p.height + 18 : q + 4);
      }
    }
    grid("x", sx, b.xmin, b.xmax); grid("y", sy, b.ymin, b.ymax);
    context.save(); context.beginPath(); context.rect(p.left, p.top, p.width, p.height); context.clip();
    if ($("show-contours").checked) {
      const key = [L, camera.cx, camera.cy, camera.zoom, p.width, p.height].join("/");
      if (key !== cacheKey) {
        // Include a small margin so a stroked curve just outside the boundary
        // is not discarded by the exact sector/strip visibility test.
        const pad = 2 / b.scale, visible = {...b, xmin: b.xmin - pad, xmax: b.xmax + pad, ymin: b.ymin - pad, ymax: b.ymax + pad};
        cachedPaths = G.contours(L, visible, b.scale).sort((a, z) => (a.level === 1) - (z.level === 1)); cacheKey = key;
      }
      for (const path of cachedPaths) {
        context.strokeStyle = palette[G.LEVELS.indexOf(path.level)]; context.lineWidth = path.level === 1 ? 1.65 : 1.3;
        context.setLineDash(path.level === 1 ? [5, 4] : []); context.beginPath();
        path.points.forEach((q, i) => i ? context.lineTo(X(q.x), Y(q.y)) : context.moveTo(X(q.x), Y(q.y)));
        if (path.closed) context.closePath(); context.stroke();
      }
    }
    context.setLineDash([]);
    const minima = G.minima(L, b), saddle = G.saddle(L), saddleVisible = saddle && G.inside(saddle, b);
    if ($("show-minima").checked) for (const q of minima) {
      context.fillStyle = "#126b72"; context.strokeStyle = "white"; context.lineWidth = 1.5;
      context.beginPath(); context.arc(X(q.x), Y(q.y), 3.6, 0, 2 * Math.PI); context.fill(); context.stroke();
    }
    if ($("show-saddle").checked && saddleVisible) {
      const x = X(saddle.x), y = Y(saddle.y), r = 5;
      context.fillStyle = "#b34e4a"; context.strokeStyle = "white"; context.lineWidth = 1.5;
      context.beginPath(); context.moveTo(x, y - r); context.lineTo(x + r, y); context.lineTo(x, y + r); context.lineTo(x - r, y); context.closePath(); context.fill(); context.stroke();
    }
    context.restore(); context.strokeStyle = "#b2c5c7"; context.lineWidth = 1; context.strokeRect(p.left, p.top, p.width, p.height);
    context.fillStyle = "#36565b"; context.textAlign = "left"; context.fillText("L = " + depthText(), p.left, 16);
    context.textAlign = "right"; context.fillText("equal axis scales", p.left + p.width, 16);
    context.textAlign = "center"; context.fillText("Re z", p.left + p.width / 2, height - 8);
    context.save(); context.translate(13, p.top + p.height / 2); context.rotate(-Math.PI / 2); context.fillText("Im z", 0, 0); context.restore();
    $("depth-value").textContent = depthText(); $("depth").setAttribute("aria-valuetext", L === Infinity ? "Infinite depth, exact exponential" : L + " layers");
    $("zoom").value = Math.log2(camera.zoom); $("zoom-value").textContent = fmt(camera.zoom) + "×";
    $("zoom").setAttribute("aria-valuetext", fmt(camera.zoom) + " times magnification");
    $("formula").innerHTML = L === Infinity ? "f<sub>∞</sub>(z) = |e<sup>z</sup> + 1|²" : "f<sub>L</sub>(z) = |(1 + z/L)<sup>L</sup> + 1|²";
    const minimumInfo = minima.length + (minima.length === 1 ? " minimum" : " minima") + " in view" + (L === Infinity ? " (infinitely many in total). " : " out of " + L + ". ");
    const saddleInfo = saddle ? (saddle.kind === "ordinary" ? "Ordinary saddle" : "Degenerate saddle (order " + L + ")") + " at (" + (-L) + ", 0), " + (saddleVisible ? "in view" : "outside view") + ". " : "No finite saddle. ";
    const summary = minimumInfo + saddleInfo + "Re z: [" + fmt(b.xmin) + ", " + fmt(b.xmax) + "], Im z: [" + fmt(b.ymin) + ", " + fmt(b.ymax) + "].";
    if ($("metrics").textContent !== summary) $("metrics").textContent = summary;
    canvas.setAttribute("aria-label", "Loss contour plot, L = " + depthText() + ". " + minimumInfo + saddleInfo);
    measure();
  }
  function position(event) { const r = canvas.getBoundingClientRect(); return {x: event.clientX - r.left - (canvas.clientLeft || 0) - plot.left, y: event.clientY - r.top - (canvas.clientTop || 0) - plot.top}; }
  function tooltip(event) {
    const tip = $("tooltip");
    if (!plot || pointers.size) { tip.hidden = true; return; }
    const p = position(event);
    if (p.x < 0 || p.x > plot.width || p.y < 0 || p.y > plot.height) { tip.hidden = true; return; }
    const q = G.toWorld(camera, plot.width, plot.height, p.x, p.y), value = G.loss(L, q.x, q.y);
    tip.textContent = "Re z = " + fmt(q.x) + ", Im z = " + fmt(q.y) + "\nf" + (L === Infinity ? "∞" : "L") + "(z) = " + (value === Infinity ? "overflow (> 10³⁰⁸)" : fmt(value));
    tip.hidden = false;
    tip.style.left = Math.max(4, Math.min(p.x + plot.left + 13, canvas.clientWidth - tip.offsetWidth - 6)) + "px";
    tip.style.top = Math.max(4, Math.min(p.y + plot.top + 13, canvas.clientHeight - tip.offsetHeight - 6)) + "px";
  }
  function reset() { camera = {...G.INITIAL_CAMERA}; $("tooltip").hidden = true; requestDraw(); }
  $("depth").addEventListener("input", () => { L = G.DEPTHS[+$("depth").value]; $("tooltip").hidden = true; requestDraw(); });
  $("zoom").addEventListener("input", () => { if (!plot) return; camera = G.zoomCamera(camera, plot.width, plot.height, 2 ** +$("zoom").value); requestDraw(); });
  $("reset-view").addEventListener("click", reset);
  for (const id of ["show-contours", "show-minima", "show-saddle", "show-grid"]) $(id).addEventListener("change", requestDraw);
  canvas.addEventListener("wheel", event => {
    if (!plot) return;
    event.preventDefault(); const p = position(event), delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? plot.height : 1);
    camera = G.zoomCamera(camera, plot.width, plot.height, camera.zoom * Math.exp(-Math.max(-1000, Math.min(1000, delta)) * .002), p.x, p.y);
    $("tooltip").hidden = true; requestDraw();
  }, {passive: false});
  canvas.addEventListener("pointerdown", event => {
    if (!plot || event.button !== 0) return;
    canvas.focus({preventScroll: true}); canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, position(event));
    canvas.classList.add("dragging"); $("tooltip").hidden = true;
  });
  canvas.addEventListener("pointermove", event => {
    if (!plot) return;
    if (!pointers.has(event.pointerId)) { tooltip(event); return; }
    const before = Array.from(pointers.values()), old = pointers.get(event.pointerId), p = position(event);
    pointers.set(event.pointerId, p);
    if (pointers.size === 1) camera = G.panCamera(camera, plot.width, plot.height, p.x - old.x, p.y - old.y);
    else {
      const after = Array.from(pointers.values()), mid = a => ({x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2});
      const a = mid(before), b = mid(after), d0 = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y), d1 = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y);
      if (d0 > 0 && d1 > 0) camera = G.zoomCamera(camera, plot.width, plot.height, camera.zoom * d1 / d0, a.x, a.y);
      camera = G.panCamera(camera, plot.width, plot.height, b.x - a.x, b.y - a.y);
    }
    requestDraw();
  });
  function release(event) { pointers.delete(event.pointerId); if (!pointers.size) canvas.classList.remove("dragging"); }
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release); canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener("pointerleave", () => { $("tooltip").hidden = true; });
  canvas.addEventListener("keydown", event => {
    if (!plot) return;
    const step = event.shiftKey ? .3 : .1;
    if (event.key === "Home") reset();
    else if (["+", "=", "-", "_"].includes(event.key)) camera = G.zoomCamera(camera, plot.width, plot.height, camera.zoom * (["+", "="].includes(event.key) ? 1.25 : .8));
    else if (event.key === "ArrowLeft") camera = G.panCamera(camera, plot.width, plot.height, plot.width * step, 0);
    else if (event.key === "ArrowRight") camera = G.panCamera(camera, plot.width, plot.height, -plot.width * step, 0);
    else if (event.key === "ArrowUp") camera = G.panCamera(camera, plot.width, plot.height, 0, plot.height * step);
    else if (event.key === "ArrowDown") camera = G.panCamera(camera, plot.width, plot.height, 0, -plot.height * step);
    else return;
    event.preventDefault(); $("tooltip").hidden = true; requestDraw();
  });
  window.addEventListener("resize", requestDraw);
  if (typeof ResizeObserver !== "undefined") { new ResizeObserver(requestDraw).observe(canvas); new ResizeObserver(measure).observe(root); }
  requestDraw();
})();
