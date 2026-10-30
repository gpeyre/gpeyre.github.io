/* Shared, DOM-free renderer: used unchanged by the live experiment and summary. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.BuresCovariancesView = factory(root.BuresCovariances);
})(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  const colors = { start: "#2563c9", end: "#dc4b4c", ink: "#21344d" };
  function color(t, alpha) {
    const a = [37, 99, 201], b = [220, 75, 76], channels = a.map((v, i) => Math.round((1 - t) * v + t * b[i]));
    return alpha === undefined ? "rgb(" + channels.join(",") + ")" : "rgba(" + channels.join(",") + "," + alpha + ")";
  }
  function extent(A, B) { return 1.2 * Math.sqrt(Math.max(M.eigen(A).values[0], M.eigen(B).values[0], .01)); }
  function layout(width, height) {
    const left = 32, top = 14, side = Math.max(1, Math.min(width - 45, height - 41));
    return { left: left + Math.max(0, width - 45 - side) / 2, top, side, cx: left + Math.max(0, width - 45 - side) / 2 + side / 2, cy: top + side / 2 };
  }
  function niceStep(range) { const raw = range / 2, power = 10 ** Math.floor(Math.log10(raw)), n = raw / power; return (n < 2 ? 1 : n < 5 ? 2 : 5) * power; }
  function drawEllipse(ctx, A, box, bound) {
    const X = M.sqrt(A), s = box.side / (2 * bound), n = 160;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = 2 * Math.PI * i / n, a = Math.cos(angle), b = Math.sin(angle);
      const x = box.cx + s * (X[0] * a + X[1] * b), y = box.cy - s * (X[2] * a + X[3] * b);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function drawPanel(ctx, width, height, state) {
    const { A, B, t, kind } = state, bound = state.extent || extent(A, B), box = layout(width, height);
    const interpolate = kind === "root" ? M.rootGeodesic : M.buresGeodesic;
    const px = x => box.cx + x * box.side / (2 * bound), py = y => box.cy - y * box.side / (2 * bound);
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#fcfcff"; ctx.fillRect(box.left, box.top, box.side, box.side);
    ctx.font = "10px system-ui,sans-serif"; ctx.textBaseline = "middle"; const step = niceStep(bound);
    for (let j = -Math.floor(bound / step); j <= Math.floor(bound / step); j++) {
      const v = j * step, x = px(v), y = py(v); ctx.beginPath();
      ctx.moveTo(x, box.top); ctx.lineTo(x, box.top + box.side); ctx.moveTo(box.left, y); ctx.lineTo(box.left + box.side, y);
      ctx.strokeStyle = j ? "#e9ecf3" : "#cbd3df"; ctx.lineWidth = j ? .65 : 1; ctx.stroke();
      ctx.fillStyle = "#718093"; ctx.textAlign = "center"; ctx.fillText(String(Number(v.toPrecision(3))), x, box.top + box.side + 15);
      if (j) { ctx.textAlign = "right"; ctx.fillText(String(Number(v.toPrecision(3))), box.left - 6, y); }
    }
    ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, box.side, box.side); ctx.clip();
    for (let i = 1; i < 10; i++) {
      const time = i / 10; drawEllipse(ctx, interpolate(A, B, time), box, bound); ctx.strokeStyle = color(time, .16); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.setLineDash([4, 4]);
    for (const [C, time] of [[A, 0], [B, 1]]) { drawEllipse(ctx, C, box, bound); ctx.strokeStyle = color(time, .62); ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.setLineDash([]);
    const current = interpolate(A, B, t); drawEllipse(ctx, current, box, bound); ctx.fillStyle = color(t, .075); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = color(t); ctx.lineWidth = 2.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(box.cx, box.cy, 2.1, 0, 2 * Math.PI); ctx.fillStyle = colors.ink; ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#dbe1e9"; ctx.lineWidth = .8; ctx.strokeRect(box.left, box.top, box.side, box.side);
    return { ...box, extent: bound, current };
  }
  return { colors, color, extent, layout, drawEllipse, drawPanel };
});
