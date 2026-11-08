(function (root, factory) {
  "use strict";
  const api = factory(typeof module === "object" && module.exports ? require("./core.js") : root.TransportSimplex);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TransportSimplexView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  const palette = ["#fffbed", "#c5e7d2", "#72c5bd", "#3a92a5", "#3c648c", "#343a68"];
  function scaleFor(maxCost) {
    if (!Number.isFinite(maxCost) || maxCost < 0) throw new RangeError("A finite nonnegative maximum is required.");
    if (maxCost === 0) return { cap: 1, step: .1 };
    const rough = maxCost / 8, power = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / power;
    const nearest = [1, 2, 2.5, 5, 10].reduce((best, v) => Math.abs(Math.log(v / normalized)) < Math.abs(Math.log(best / normalized)) ? v : best, 1);
    const step = nearest * power;
    return { cap: Math.max(maxCost, Math.ceil(maxCost / step - 1e-12) * step), step };
  }
  function number(value) {
    return Number(value.toPrecision(4)).toString();
  }
  function layout(width, height) {
    const padding = width < 450 ? 18 : 30;
    const scale = Math.min((width - 2 * padding) / 3.2, (height - 114) / 2.6);
    const left = (width - 3.2 * scale) / 2, bottom = (height - 98 + 2.6 * scale) / 2;
    return { scale, left, bottom, toScreen: p => [left + p[0] * scale, bottom - p[1] * scale],
      toWorld: p => [(p[0] - left) / scale, (bottom - p[1]) / scale] };
  }
  function polygon(ctx, points) {
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
  }
  function gradient(ctx, x0, y0, x1, y1) {
    const fill = ctx.createLinearGradient(x0, y0, x1, y1);
    palette.forEach((c, i) => fill.addColorStop(i / (palette.length - 1), c)); return fill;
  }
  function label(ctx, text, x, y, size, color = "#334d5a", align = "left") {
    ctx.font = "500 " + size + "px system-ui, sans-serif"; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
  }
  function draw(ctx, width, height, state) {
    const { vertices, b } = state, box = layout(width, height), points = vertices.map(box.toScreen);
    const { weights, distances } = M.geometry(vertices);
    const maxCost = Math.max(...distances.map(row => row.reduce((s, d, j) => s + d * b[j], 0)));
    const colorCap = Number.isFinite(state.colorCap) && state.colorCap > 0 ? state.colorCap : scaleFor(maxCost).cap;
    const step = scaleFor(colorCap).step;
    const target = box.toScreen(M.point(b, vertices));
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
    // An isotropic coordinate grid: moving a handle changes actual Euclidean lengths.
    ctx.strokeStyle = "#f0f4f5"; ctx.lineWidth = 1;
    for (let x = 0; x <= 3.21; x += .5) { ctx.beginPath(); ctx.moveTo(...box.toScreen([x, 0])); ctx.lineTo(...box.toScreen([x, 2.6])); ctx.stroke(); }
    for (let y = 0; y <= 2.61; y += .5) { ctx.beginPath(); ctx.moveTo(...box.toScreen([0, y])); ctx.lineTo(...box.toScreen([3.2, y])); ctx.stroke(); }
    // On each sign cell the cost is affine. Canvas gradients therefore render
    // the exact scalar field (with a piecewise-linear color map), not a mesh.
    for (const cell of M.signCells(b)) {
      const values = cell.signs.map((s, i) => s * weights[i]);
      const offset = -values.reduce((s, v, i) => s + v * b[i], 0);
      const [p0, p1, p2] = points, dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1], dx2 = p2[0] - p0[0], dy2 = p2[1] - p0[1];
      const det = dx1 * dy2 - dx2 * dy1, dv1 = values[1] - values[0], dv2 = values[2] - values[0];
      const gx = (dv1 * dy2 - dv2 * dy1) / det, gy = (dx1 * dv2 - dx2 * dv1) / det, g2 = gx * gx + gy * gy;
      if (g2 < 1e-20) continue;
      const zero = [p0[0] - (values[0] + offset) * gx / g2, p0[1] - (values[0] + offset) * gy / g2];
      const fill = gradient(ctx, ...zero, zero[0] + colorCap * gx / g2, zero[1] + colorCap * gy / g2);
      polygon(ctx, cell.polygon.map(a => box.toScreen(M.point(a, vertices)))); ctx.fillStyle = fill; ctx.fill();
      // Cover subpixel seams between adjacent affine cells, without a visible mesh.
      ctx.strokeStyle = fill; ctx.lineWidth = .65; ctx.stroke();
    }
    const levels = [];
    for (let i = 1; i * step < colorCap * (1 - 1e-12); i++) levels.push(i * step);
    const contours = M.contours(vertices, b, levels);
    const selected = new Set([.25, .5, .75].map(t => Math.max(0, Math.round((contours.length - 1) * t))));
    const contourLabels = [];
    for (const [index, contour] of contours.entries()) {
      ctx.beginPath(); for (const segment of contour.segments) { ctx.moveTo(...box.toScreen(segment[0])); ctx.lineTo(...box.toScreen(segment[1])); }
      const major = selected.has(index);
      ctx.strokeStyle = major ? "#315b708c" : "#ffffffe0"; ctx.lineWidth = major ? 1.35 : 1; ctx.stroke();
      if (major) {
        const candidates = contour.segments.map(segment => segment.map(box.toScreen)).map(([p, q]) => ({
          p: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], length: Math.hypot(p[0] - q[0], p[1] - q[1])
        })).sort((a, b) => b.length - a.length);
        const chosen = candidates.find(candidate => candidate.length > (width < 450 ? 34 : 48) &&
          [...points, target].every(p => Math.hypot(p[0] - candidate.p[0], p[1] - candidate.p[1]) > 27) &&
          contourLabels.every(previous => Math.hypot(previous.p[0] - candidate.p[0], previous.p[1] - candidate.p[1]) > 35));
        if (chosen) contourLabels.push({ p: chosen.p, text: number(contour.level) });
      }
    }
    polygon(ctx, points); ctx.strokeStyle = "#425c70"; ctx.lineWidth = 1.6; ctx.stroke();
    for (const { p, text } of contourLabels) {
      const textWidth = text.length * 6 + 10;
      ctx.fillStyle = "#fffffff2"; ctx.fillRect(p[0] - textWidth / 2, p[1] - 8, textWidth, 16);
      label(ctx, text, p[0], p[1] + 3.5, 10, "#315367", "center");
    }
    if (state.probe && Math.min(...state.probe) >= -1e-9) {
      const p = box.toScreen(M.point(state.probe, vertices));
      ctx.beginPath(); ctx.arc(...p, 5, 0, 2 * Math.PI); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.strokeStyle = "#af5b26"; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, "α", p[0] + 10, p[1] - 9, 14, "#884317");
    }
    points.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(...p, 13, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#35596c"; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, ["x₁", "x₂", "x₃"][i], p[0], p[1] + 4, 13, "#24475c", "center");
    });
    ctx.beginPath(); ctx.arc(...target, 12, 0, 2 * Math.PI); ctx.fillStyle = "#172f40"; ctx.fill(); ctx.strokeStyle = "white"; ctx.lineWidth = 2.5; ctx.stroke();
    label(ctx, "β", target[0], target[1] + 4.5, 14, "white", "center");
    const legendWidth = Math.min(320, width - 60), left = (width - legendWidth) / 2, top = height - 43;
    const barX = width < 450 ? 20 : 30, barY = height - 77, barLength = .5 * box.scale;
    ctx.strokeStyle = "#73909e"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(barX, barY - 3); ctx.lineTo(barX, barY + 3); ctx.moveTo(barX, barY); ctx.lineTo(barX + barLength, barY); ctx.moveTo(barX + barLength, barY - 3); ctx.lineTo(barX + barLength, barY + 3); ctx.stroke();
    label(ctx, "0.5 units", barX + barLength + 7, barY + 3.5, 10, "#617d8b");
    label(ctx, "transport cost W₁", width - (width < 450 ? 20 : 30), barY + 3.5, 10, "#476574", "right");
    ctx.fillStyle = gradient(ctx, left, top, left + legendWidth, top); ctx.fillRect(left, top, legendWidth, 10);
    label(ctx, "0", left, top + 28, 11);
    label(ctx, number(colorCap / 2), width / 2, top + 28, 11, undefined, "center");
    label(ctx, (maxCost > colorCap * (1 + 1e-10) ? "≥ " : "") + number(colorCap), left + legendWidth, top + 28, 11, undefined, "right");
    return { ...box, maxCost, colorCap, step, levels, points, target };
  }
  return { layout, draw, palette, scaleFor };
});
