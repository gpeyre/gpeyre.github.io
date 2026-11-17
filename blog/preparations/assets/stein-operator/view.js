/* DOM-free canvas routines shared by the browser and the summary export. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.SteinOperatorView = factory(root.SteinOperator);
}(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  const colors = { ink: "#243747", muted: "#63717a", grid: "#e7ecec", mixture: "#167d81", reference: "#737d8b", f: "#4166a5", stein: "#b85c40", positive: "#167d81", negative: "#b85c40" };
  function axes(ctx, width, height, ymin, ymax, yTicks) {
    const box = { left: 43, top: 12, right: width - 14, bottom: height - 31 };
    const px = x => box.left + (x + 4) / 8 * (box.right - box.left), py = y => box.bottom - (y - ymin) / (ymax - ymin) * (box.bottom - box.top);
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    ctx.font = "11px system-ui,sans-serif"; ctx.textBaseline = "middle";
    for (const x of [-4, -2, 0, 2, 4]) {
      ctx.beginPath(); ctx.moveTo(px(x), box.top); ctx.lineTo(px(x), box.bottom); ctx.strokeStyle = colors.grid; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = colors.muted; ctx.textAlign = "center"; ctx.fillText(String(x), px(x), box.bottom + 16);
    }
    for (const y of yTicks) {
      ctx.beginPath(); ctx.moveTo(box.left, py(y)); ctx.lineTo(box.right, py(y)); ctx.strokeStyle = y === 0 ? "#b9c5c8" : colors.grid; ctx.lineWidth = y === 0 ? 1 : .8; ctx.stroke();
      ctx.fillStyle = colors.muted; ctx.textAlign = "right"; ctx.fillText(String(Number(y.toPrecision(3))), box.left - 7, py(y));
    }
    return { ...box, px, py };
  }
  function curve(ctx, box, fun, color, dashed = false, fill = false) {
    ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, box.right - box.left, box.bottom - box.top); ctx.clip();
    ctx.beginPath();
    for (let i = 0; i <= 640; i++) { const x = -4 + 8 * i / 640, y = box.py(fun(x)); if (i) ctx.lineTo(box.px(x), y); else ctx.moveTo(box.px(x), y); }
    if (fill) { ctx.lineTo(box.right, box.py(0)); ctx.lineTo(box.left, box.py(0)); ctx.closePath(); ctx.fillStyle = "rgba(22,125,129,.10)"; ctx.fill(); }
    else { ctx.strokeStyle = color; ctx.lineWidth = 2.1; ctx.setLineDash(dashed ? [5, 4] : []); ctx.stroke(); }
    ctx.restore();
  }
  function drawDensity(ctx, width, height, state) {
    const box = axes(ctx, width, height, 0, .72, [0, .2, .4, .6]);
    curve(ctx, box, x => M.density(x, state), colors.mixture, false, true);
    curve(ctx, box, x => M.density(x, state), colors.mixture);
    curve(ctx, box, x => M.gaussian(x), colors.reference, true);
    return box;
  }
  function drawFunction(ctx, width, height, state) {
    const test = M.tests.find(row => row.key === state.selected), ranges = { constant: 4.4, linear: 16, quadratic: 55, cubic: 175, sine: 5, cosine: 5 }, bound = ranges[test.key];
    const box = axes(ctx, width, height, -bound, bound, [-bound, 0, bound]);
    curve(ctx, box, test.f, colors.f); curve(ctx, box, x => M.steinValue(test, x), colors.stein);
    return { ...box, bound };
  }
  function drawResidualBar(ctx, width, height, value, bound = .8) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    const center = width / 2, scale = (width / 2 - 2) / bound;
    ctx.fillStyle = "#edf2f2"; ctx.fillRect(1, height / 2 - 2, width - 2, 4);
    ctx.fillStyle = value < 0 ? colors.negative : colors.positive;
    const endpoint = center + Math.max(-bound, Math.min(bound, value)) * scale;
    ctx.fillRect(Math.min(center, endpoint), height / 2 - 4, Math.abs(endpoint - center), 8);
    ctx.beginPath(); ctx.moveTo(center, height / 2 - 7); ctx.lineTo(center, height / 2 + 7); ctx.strokeStyle = "#aebac0"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(endpoint, height / 2, 2.5, 0, 2 * Math.PI); ctx.fillStyle = Math.abs(value) < 1e-14 ? "#aebac0" : value < 0 ? colors.negative : colors.positive; ctx.fill();
  }
  function drawSummary(ctx, width, height, state) {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    const gap = 40, pad = 36, leftWidth = Math.round(width * .53) - pad, right = pad + leftWidth + gap, rightWidth = width - right - pad;
    ctx.fillStyle = colors.ink; ctx.font = "600 25px system-ui,sans-serif"; ctx.fillText("Gaussian Stein identity", pad, 40);
    ctx.font = "17px system-ui,sans-serif"; ctx.fillStyle = colors.muted; ctx.fillText("Same mean and variance; different test-function expectations", pad, 70);
    ctx.font = "600 18px system-ui,sans-serif"; ctx.fillStyle = colors.ink; ctx.fillText("A mixture and the reference Gaussian", pad, 118);
    ctx.save(); ctx.translate(pad, 133); drawDensity(ctx, leftWidth, 365, state); ctx.restore();
    ctx.font = "17px system-ui,sans-serif"; ctx.fillStyle = colors.mixture; ctx.fillText("qθ: mixture", pad + 50, 533); ctx.fillStyle = colors.reference; ctx.fillText("N(0, 1): dashed", pad + 220, 533);
    ctx.font = "16px system-ui,sans-serif"; ctx.fillStyle = colors.muted; ctx.fillText("θ = " + state.theta.toFixed(2) + "    E[X] = 0    E[X²] = 1", pad + 50, 567);
    ctx.fillStyle = colors.ink; ctx.font = "600 18px system-ui,sans-serif"; ctx.fillText("Residual  E[f′(X) - X f(X)]", right, 118);
    ctx.font = "15px system-ui,sans-serif"; ctx.fillStyle = colors.muted; ctx.fillText("f", right, 154); ctx.textAlign = "right"; ctx.fillText("value", width - pad, 154); ctx.textAlign = "left";
    for (let i = 0; i < state.rows.length; i++) {
      const row = state.rows[i], y = 192 + i * 57;
      ctx.fillStyle = colors.ink; ctx.font = "18px system-ui,sans-serif"; ctx.fillText(row.label.replace(/−/g, "-"), right, y + 6);
      ctx.save(); ctx.translate(right + 115, y - 11); drawResidualBar(ctx, rightWidth - 200, 28, row.residual); ctx.restore();
      ctx.textAlign = "right"; ctx.fillStyle = Math.abs(row.residual) < 1e-14 ? colors.muted : row.residual < 0 ? colors.negative : colors.positive;
      ctx.fillText(Math.abs(row.residual) < 1e-14 ? "0" : row.residual.toFixed(3), width - pad, y + 6); ctx.textAlign = "left";
    }
    ctx.font = "15px system-ui,sans-serif"; ctx.fillStyle = colors.muted; ctx.fillText("Exact mixture expectations · bars share one scale", right, 567);
  }
  return { colors, drawDensity, drawFunction, drawResidualBar, drawSummary };
}));
