(function () {
  "use strict";
  const M = window.HumpAlgebra, $ = id => document.getElementById(id);
  const names = ["first", "second", "product"];
  const stops = [[0, 250, 249, 242], [.12, 225, 239, 224], [.32, 161, 213, 193], [.56, 79, 170, 166], [.78, 33, 118, 142], [1, 31, 57, 91]];
  const palette = Array.from({ length: 256 }, (_, k) => {
    const t = k / 255;
    let j = 0;
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const a = stops[j], b = stops[j + 1], s = (t - a[0]) / (b[0] - a[0]);
    return [1, 2, 3].map(c => Math.round(a[c] + s * (b[c] - a[c])));
  });
  let scene, playing = false, animation = 0, redraw = 0, lastStamp, phase = .18, n = 5;
  const raster = document.createElement("canvas"), rasterContext = raster.getContext("2d");
  function notifyHeight() {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "ot-experiment-size", topic: "hump-algebra", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) + 2 }, location.protocol === "file:" ? "*" : location.origin);
  }
  function format(value) { return value >= .01 ? value.toFixed(3) : value.toExponential(2); }
  function contours(ctx, data, grid, level, left, top, side) {
    const step = side / (grid - 1);
    ctx.beginPath();
    // Marching triangles avoid saddle ambiguities in marching squares.
    function triangle(ax, ay, av, bx, by, bv, cx, cy, cv) {
      const points = [];
      function edge(x0, y0, v0, x1, y1, v1) {
        if ((v0 < level) === (v1 < level)) return;
        const w = (level - v0) / (v1 - v0);
        points.push([left + (x0 + w * (x1 - x0)) * step, top + (y0 + w * (y1 - y0)) * step]);
      }
      edge(ax, ay, av, bx, by, bv); edge(bx, by, bv, cx, cy, cv); edge(cx, cy, cv, ax, ay, av);
      if (points.length === 2) { ctx.moveTo(points[0][0], points[0][1]); ctx.lineTo(points[1][0], points[1][1]); }
    }
    for (let row = 0; row < grid - 1; row++) for (let col = 0; col < grid - 1; col++) {
      const k = row * grid + col, a = data[k], b = data[k + 1], c = data[k + grid + 1], d = data[k + grid];
      if (Math.min(a, b, c, d) > level || Math.max(a, b, c, d) < level) continue;
      triangle(col, row, a, col + 1, row, b, col + 1, row + 1, c);
      triangle(col, row, a, col + 1, row + 1, c, col, row + 1, d);
    }
    ctx.stroke();
  }
  function draw(j) {
    const canvas = $(names[j] + "-plot"), width = canvas.clientWidth, height = canvas.clientHeight;
    if (width < 80 || height < 80) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    const left = 27, right = 7, top = 9, side = Math.min(width - left - right, height - 73), bottom = top + side;
    const max = $("separate-scales").checked ? scene.maxima[j] : 1;
    const data = scene.fields[j], size = scene.size;
    raster.width = size; raster.height = size;
    const pixels = rasterContext.createImageData(size, size);
    for (let k = 0; k < data.length; k++) {
      const color = palette[Math.min(255, Math.max(0, Math.round(255 * data[k] / max)))];
      pixels.data[4 * k] = color[0]; pixels.data[4 * k + 1] = color[1]; pixels.data[4 * k + 2] = color[2]; pixels.data[4 * k + 3] = 255;
    }
    rasterContext.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(raster, left, top, side, side);
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, side, side); ctx.clip();
    ctx.lineWidth = .65; ctx.strokeStyle = "rgba(23,65,77,.42)";
    for (const fraction of [.2, .4, .6, .8]) contours(ctx, data, size, fraction * max, left, top, side);
    ctx.restore();
    ctx.strokeStyle = "#bbcecf"; ctx.lineWidth = .7; ctx.strokeRect(left, top, side, side);
    ctx.font = "9px system-ui,sans-serif"; ctx.fillStyle = "#637d83";
    for (const tick of [-2, 0, 2]) {
      const u = (tick - scene.min) / (scene.max - scene.min);
      const x = left + side * u, y = top + side * (1 - u);
      ctx.textAlign = "center"; ctx.fillText(String(tick), x, bottom + 12);
      ctx.textAlign = "right"; ctx.fillText(String(tick), left - 6, y + 3);
    }
    ctx.fillStyle = "#789095"; ctx.textAlign = "right"; ctx.fillText("x₁", left + side, bottom + 12);
    ctx.textAlign = "left"; ctx.fillText("x₂", 4, top + 1);
    const barTop = bottom + 26, gradient = ctx.createLinearGradient(left, 0, left + side, 0);
    stops.forEach(stop => gradient.addColorStop(stop[0], "rgb(" + stop.slice(1).join(",") + ")"));
    ctx.fillStyle = gradient; ctx.fillRect(left, barTop, side, 7);
    ctx.strokeStyle = "#d1dedb"; ctx.strokeRect(left, barTop, side, 7);
    ctx.fillStyle = "#526e76"; ctx.textAlign = "left"; ctx.fillText("0", left, barTop + 19);
    ctx.textAlign = "center"; ctx.fillText(format(max / 2), left + side / 2, barTop + 19);
    ctx.textAlign = "right"; ctx.fillText(format(max), left + side, barTop + 19);
    canvas.setAttribute("aria-label", ["First Gaussian mixture", "Second Gaussian mixture", "Product of the Gaussian mixtures"][j] + ", " + (j === 2 ? n * n : n) + " humps. Sampled maximum " + format(scene.maxima[j]) + ". Color scale zero to " + format(max) + ". Same spatial coordinates in every panel.");
  }
  function render() { if (scene) names.forEach((_, j) => draw(j)); }
  function update() {
    n = Number($("bumps").value); phase = Number($("phase").value);
    scene = M.sampleScene(n, phase);
    $("bumps-value").textContent = n; $("phase-value").textContent = phase.toFixed(2);
    $("bumps").setAttribute("aria-valuetext", n + " humps in each mixture");
    $("phase").setAttribute("aria-valuetext", "Motion phase " + phase.toFixed(2));
    names.forEach((name, j) => { $(name + "-max").textContent = format(scene.maxima[j]); $(name + "-terms").textContent = (j === 2 ? n * n : n) + (n === 1 ? " hump" : " humps"); });
    $("term-count").textContent = n + " × " + n + " = " + n * n;
    $("weight-sum").textContent = scene.productWeight.toFixed(4);
    $("residual").textContent = scene.residual === 0 ? "0" : scene.residual.toExponential(1);
    $("status").textContent = playing ? "Playing" : "Paused";
    render();
  }
  function pause() {
    playing = false; cancelAnimationFrame(animation); lastStamp = undefined;
    $("play").textContent = "Animate bumps"; $("play").setAttribute("aria-pressed", "false");
    $("status").textContent = "Paused";
  }
  function tick(stamp) {
    if (!playing) return;
    if (lastStamp === undefined) lastStamp = stamp;
    if (stamp - lastStamp >= 80) {
      const next = (phase + Math.min(200, stamp - lastStamp) / 20000) % 1;
      $("phase").value = next; lastStamp = stamp; update();
    }
    animation = requestAnimationFrame(tick);
  }
  $("play").addEventListener("click", () => {
    if (playing) { pause(); return; }
    playing = true; lastStamp = undefined;
    $("play").textContent = "Pause"; $("play").setAttribute("aria-pressed", "true");
    $("status").textContent = "Playing"; animation = requestAnimationFrame(tick);
  });
  ["phase", "bumps"].forEach(id => $(id).addEventListener("input", () => { pause(); update(); }));
  $("separate-scales").addEventListener("change", () => {
    $("scale-note").textContent = $("separate-scales").checked ? "Each colorbar has its own scale; compare its numbers to see the product’s smaller amplitude." : "All three colorbars now share the raw scale [0, 1]. No function values have been rescaled.";
    render(); notifyHeight();
  });
  function scheduleRender() { cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => { render(); notifyHeight(); }); }
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  window.addEventListener("pagehide", pause);
  window.addEventListener("resize", scheduleRender);
  window.addEventListener("message", event => {
    if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight();
  });
  if (window.ResizeObserver) new ResizeObserver(scheduleRender).observe(document.querySelector("main"));
  window.HumpAlgebraApp = { getState: () => ({ n, phase, playing, separateScales: $("separate-scales").checked,
    size: scene.size, maxima: scene.maxima.slice(), residual: scene.residual, productTerms: scene.product.length,
    productWeight: scene.productWeight, bounds: [scene.min, scene.max] }) };
  update(); notifyHeight();
})();
