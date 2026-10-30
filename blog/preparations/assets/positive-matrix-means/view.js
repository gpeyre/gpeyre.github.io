/* The same DOM-free ellipse renderer powers the live panels and summary image. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.PositiveMatrixMeansView = factory(root.PositiveMatrixMeans);
})(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  function color(t, alpha) {
    const a = [37, 99, 201], b = [220, 75, 76], channels = a.map((v, i) => Math.round((1 - t) * v + t * b[i]));
    return alpha === undefined ? "rgb(" + channels.join(",") + ")" : "rgba(" + channels.join(",") + "," + alpha + ")";
  }
  // Both paths stay below max(λmax(A),λmax(B)) I. Hence the common endpoint
  // extent contains every intermediate ellipse and does not change with t.
  function extent(A, B) { return 1.2 * Math.sqrt(Math.max(M.eigen(A).values[0], M.eigen(B).values[0], .01)); }
  function layout(width, height) {
    const left = 32, top = 14, side = Math.max(1, Math.min(width - 45, height - 41));
    const x = left + Math.max(0, width - 45 - side) / 2;
    return { left: x, top, side, cx: x + side / 2, cy: top + side / 2 };
  }
  function drawEllipse(ctx, A, box, bound) {
    const S = M.sqrt(A), scale = box.side / (2 * bound);
    ctx.beginPath();
    for (let k = 0; k <= 200; k++) {
      const angle = 2 * Math.PI * k / 200, c = Math.cos(angle), s = Math.sin(angle);
      const x = box.cx + scale * (S[0] * c + S[1] * s), y = box.cy - scale * (S[2] * c + S[3] * s);
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function niceStep(bound) { const power = 10 ** Math.floor(Math.log10(bound / 2)), n = bound / (2 * power); return (n < 2 ? 1 : n < 5 ? 2 : 5) * power; }
  function drawPanel(ctx, width, height, state) {
    const { A, B, t, kind } = state, bound = state.extent || extent(A, B), box = layout(width, height);
    const interpolate = time => M.interpolate(A, B, time, kind);
    const px = x => box.cx + x * box.side / (2 * bound), py = y => box.cy - y * box.side / (2 * bound);
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#fcfcff"; ctx.fillRect(box.left, box.top, box.side, box.side);
    ctx.font = "10px system-ui,sans-serif"; ctx.textBaseline = "middle"; const step = niceStep(bound);
    for (let j = -Math.floor(bound / step); j <= Math.floor(bound / step); j++) {
      const value = j * step; ctx.beginPath();
      ctx.moveTo(px(value), box.top); ctx.lineTo(px(value), box.top + box.side);
      ctx.moveTo(box.left, py(value)); ctx.lineTo(box.left + box.side, py(value));
      ctx.strokeStyle = j ? "#e9ecf3" : "#cbd3df"; ctx.lineWidth = j ? .65 : 1; ctx.stroke();
      ctx.fillStyle = "#718093"; ctx.textAlign = "center"; ctx.fillText(String(Number(value.toPrecision(3))), px(value), box.top + box.side + 15);
      if (j) { ctx.textAlign = "right"; ctx.fillText(String(Number(value.toPrecision(3))), box.left - 6, py(value)); }
    }
    ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, box.side, box.side); ctx.clip();
    for (let k = 1; k < 10; k++) {
      const time = k / 10; drawEllipse(ctx, interpolate(time), box, bound); ctx.strokeStyle = color(time, .19); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.setLineDash([4, 4]);
    for (const [C, time] of [[A, 0], [B, 1]]) { drawEllipse(ctx, C, box, bound); ctx.strokeStyle = color(time, .7); ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.setLineDash([]);
    if (state.showLogarithmic && kind === "ka") {
      drawEllipse(ctx, M.logarithmic(A, B), box, bound); ctx.strokeStyle = "#087f8c"; ctx.lineWidth = 2; ctx.setLineDash([2, 5]); ctx.stroke(); ctx.setLineDash([]);
    }
    const current = interpolate(t); drawEllipse(ctx, current, box, bound); ctx.fillStyle = color(t, .09); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = color(t); ctx.lineWidth = 2.7; ctx.stroke();
    ctx.beginPath(); ctx.arc(box.cx, box.cy, 2.1, 0, Math.PI * 2); ctx.fillStyle = "#26364b"; ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#dbe1e9"; ctx.lineWidth = .8; ctx.strokeRect(box.left, box.top, box.side, box.side);
    return { ...box, extent: bound, current };
  }
  return { color, extent, layout, drawEllipse, drawPanel };
});
