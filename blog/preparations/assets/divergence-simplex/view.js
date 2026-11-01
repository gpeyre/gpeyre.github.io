/* A rasterized simplex and piecewise-linear contour tracing, no chart library. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.DivergenceSimplexView = factory(root.DivergenceSimplex);
})(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  const cap = 4, levels = [.02, .05, .1, .2, .5, 1, 2, 4];
  function layout(width, height) {
    const side = Math.max(10, Math.min(width - 82, (height - 122) * 2 / Math.sqrt(3)));
    const left = (width - side) / 2, top = 26, altitude = side * Math.sqrt(3) / 2;
    return { side, left, top, altitude, bottom: top + altitude };
  }
  function point(q, box) { return [box.left + box.side * (q[1] + q[2] / 2), box.bottom - box.altitude * q[2]]; }
  function probabilities(x, y, box) {
    const z = (box.bottom - y) / box.altitude, b = (x - box.left) / box.side - z / 2;
    return [1 - b - z, b, z];
  }
  function color(value) {
    const t = Number.isFinite(value) ? Math.sqrt(Math.min(1, Math.log1p(Math.max(0, value)) / Math.log1p(cap))) : 1;
    const stops = [[249, 246, 218], [118, 181, 172], [25, 67, 99]], s = t * 2, i = Math.min(1, Math.floor(s)), u = s - i;
    return stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * u));
  }
  function segment(ctx, a, av, b, bv, c, cv, level, box) {
    if (![av, bv, cv].every(Number.isFinite)) return;
    const hits = [];
    for (const [u, uv, v, vv] of [[a, av, b, bv], [b, bv, c, cv], [c, cv, a, av]]) {
      if ((uv < level) === (vv < level)) continue;
      const t = (level - uv) / (vv - uv), q = u.map((x, j) => x + t * (v[j] - x)); hits.push(point(q, box));
    }
    if (hits.length === 2) { ctx.moveTo(...hits[0]); ctx.lineTo(...hits[1]); }
  }
  function draw(ctx, width, height, state, createCanvas) {
    const box = layout(width, height), n = Math.min(540, Math.max(160, Math.round(box.side))), h = Math.max(1, Math.ceil(n * Math.sqrt(3) / 2));
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    const raster = createCanvas(n, h), rc = raster.getContext("2d"), pixels = rc.createImageData(n, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < n; x++) {
      const q2 = 1 - (y + .5) / h, q1 = (x + .5) / n - q2 / 2, q = [1 - q1 - q2, q1, q2], k = 4 * (y * n + x);
      if (Math.min(...q) < 0) continue;
      const rgb = color(M.divergence(q, state.p, state.lambda));
      pixels.data[k] = rgb[0]; pixels.data[k + 1] = rgb[1]; pixels.data[k + 2] = rgb[2]; pixels.data[k + 3] = 255;
    }
    rc.putImageData(pixels, 0, 0); ctx.drawImage(raster, box.left, box.top, box.side, box.altitude);
    const size = 72, samples = [], vector = (i, j) => [i / size, j / size, 1 - (i + j) / size];
    for (let i = 0; i <= size; i++) { samples[i] = []; for (let j = 0; j <= size - i; j++) samples[i][j] = M.divergence(vector(i, j), state.p, state.lambda); }
    ctx.lineWidth = .9; ctx.strokeStyle = "rgba(255,255,255,.62)";
    for (const level of levels) {
      ctx.beginPath();
      for (let i = 0; i < size; i++) for (let j = 0; j < size - i; j++) {
        const a = vector(i, j), b = vector(i + 1, j), c = vector(i, j + 1);
        segment(ctx, a, samples[i][j], b, samples[i + 1][j], c, samples[i][j + 1], level, box);
        if (i + j < size - 1) segment(ctx, b, samples[i + 1][j], vector(i + 1, j + 1), samples[i + 1][j + 1], c, samples[i][j + 1], level, box);
      }
      ctx.stroke();
    }
    const corners = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    ctx.beginPath(); corners.forEach((q, i) => { const p = point(q, box); if (i) ctx.lineTo(...p); else ctx.moveTo(...p); }); ctx.closePath(); ctx.strokeStyle = "#628589"; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.font = "12px sans-serif"; ctx.fillStyle = "#4b636c";
    ctx.textAlign = "center"; ctx.fillText("(0, 0, 1)", width / 2, box.top - 9);
    ctx.textAlign = "left"; ctx.fillText("(1, 0, 0)", box.left - 24, box.bottom + 21);
    ctx.textAlign = "right"; ctx.fillText("(0, 1, 0)", box.left + box.side + 24, box.bottom + 21);
    const target = point(state.p, box); ctx.beginPath(); ctx.arc(...target, 6, 0, Math.PI * 2); ctx.fillStyle = "#b55a40"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = "left"; ctx.font = "bold 13px sans-serif"; ctx.fillStyle = "#7d3e2e"; ctx.fillText("p", target[0] + 10, target[1] - 9);
    const lx = width / 2 - Math.min(210, box.side) / 2, ly = box.bottom + 44, lw = Math.min(210, box.side);
    for (let i = 0; i < 100; i++) { ctx.fillStyle = "rgb(" + color(cap * i / 99).join(",") + ")"; ctx.fillRect(lx + i * lw / 100, ly, lw / 100 + 1, 8); }
    ctx.fillStyle = "#4b636c"; ctx.font = "11px sans-serif"; ctx.textAlign = "left"; ctx.fillText("0", lx, ly + 24); ctx.textAlign = "right"; ctx.fillText("4 or larger", lx + lw, ly + 24); ctx.textAlign = "center"; ctx.fillText("Dφ(q | p) · fixed color scale", width / 2, ly + 42);
    return box;
  }
  return { layout, point, probabilities, color, draw, cap, levels };
});
