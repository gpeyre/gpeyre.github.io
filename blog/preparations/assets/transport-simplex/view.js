(function (root, factory) {
  "use strict";
  const api = factory(typeof module === "object" && module.exports ? require("./core.js") : root.TransportSimplex);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TransportSimplexView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  const palette = ["#fcf9e9", "#c4e4c9", "#65bcb9", "#367b99", "#3c4f83", "#422e63"];
  function layout(width, height) {
    const padding = width < 450 ? 24 : 38;
    const scale = Math.min((width - 2 * padding) / 3.2, (height - 85) / 2.6);
    const left = (width - 3.2 * scale) / 2, bottom = (height - 68 + 2.6 * scale) / 2;
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
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
    // An isotropic coordinate grid: moving a handle changes actual Euclidean lengths.
    ctx.strokeStyle = "#edf1f3"; ctx.lineWidth = 1;
    for (let x = 0; x <= 3.21; x += .4) { ctx.beginPath(); ctx.moveTo(...box.toScreen([x, 0])); ctx.lineTo(...box.toScreen([x, 2.6])); ctx.stroke(); }
    for (let y = 0; y <= 2.61; y += .4) { ctx.beginPath(); ctx.moveTo(...box.toScreen([0, y])); ctx.lineTo(...box.toScreen([3.2, y])); ctx.stroke(); }
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
      const fill = gradient(ctx, ...zero, zero[0] + maxCost * gx / g2, zero[1] + maxCost * gy / g2);
      polygon(ctx, cell.polygon.map(a => box.toScreen(M.point(a, vertices)))); ctx.fillStyle = fill; ctx.fill();
      // Cover subpixel seams between adjacent affine cells, without a visible mesh.
      ctx.strokeStyle = fill; ctx.lineWidth = .65; ctx.stroke();
    }
    const levels = [.1, .2, .3, .4, .5, .6, .7, .8, .9].map(t => t * maxCost);
    const contours = M.contours(vertices, b, levels);
    for (const [index, contour] of contours.entries()) {
      ctx.beginPath(); for (const segment of contour.segments) { ctx.moveTo(...box.toScreen(segment[0])); ctx.lineTo(...box.toScreen(segment[1])); }
      ctx.strokeStyle = index === 4 ? "#172f4ba6" : "#ffffffaf"; ctx.lineWidth = index === 4 ? 1.8 : 1.05; ctx.stroke();
    }
    polygon(ctx, points); ctx.strokeStyle = "#425c70"; ctx.lineWidth = 1.6; ctx.stroke();
    if (state.probe && Math.min(...state.probe) >= -1e-9) {
      const p = box.toScreen(M.point(state.probe, vertices));
      ctx.strokeStyle = "#243d4f"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p[0] - 6, p[1]); ctx.lineTo(p[0] + 6, p[1]); ctx.moveTo(p[0], p[1] - 6); ctx.lineTo(p[0], p[1] + 6); ctx.stroke();
    }
    points.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(...p, 13, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#35596c"; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, ["x₁", "x₂", "x₃"][i], p[0], p[1] + 4, 13, "#24475c", "center");
    });
    const target = box.toScreen(M.point(b, vertices));
    ctx.beginPath(); ctx.arc(...target, 10, 0, 2 * Math.PI); ctx.fillStyle = "#172c3b"; ctx.fill(); ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, "β", target[0], target[1] + 4, 12, "white", "center");
    const legendWidth = Math.min(260, width - 96), left = (width - legendWidth) / 2, top = height - 42;
    ctx.fillStyle = gradient(ctx, left, top, left + legendWidth, top); ctx.fillRect(left, top, legendWidth, 10);
    label(ctx, "0", left, top + 28, 11); label(ctx, maxCost.toFixed(3), left + legendWidth, top + 28, 11, undefined, "right");
    label(ctx, "transport cost W₁", width / 2, top + 28, 11, undefined, "center");
    return { ...box, maxCost, levels, points, target };
  }
  return { layout, draw, palette };
});
