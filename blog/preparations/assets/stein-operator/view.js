/* DOM-free canvas routines shared by the browser and the summary export. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.SteinOperatorView = factory(root.SteinOperator);
}(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  const colors = { ink: "#243747", muted: "#63717a", grid: "#e7ecec", mixture: "#167d81", reference: "#737d8b", f: "#4166a5", positive: "#167d81", negative: "#b85c40" };
  function clear(ctx, width, height) { ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); }
  function axes(ctx, width, height) {
    const box = { left: 36, top: 15, right: width - 12, bottom: height - 29 };
    const px = x => box.left + (x + 5) / 10 * (box.right - box.left), py = y => box.bottom - y / .9 * (box.bottom - box.top);
    clear(ctx, width, height); ctx.font = "11px system-ui,sans-serif"; ctx.textBaseline = "middle";
    for (const x of [-4, -2, 0, 2, 4]) {
      ctx.beginPath(); ctx.moveTo(px(x), box.top); ctx.lineTo(px(x), box.bottom); ctx.strokeStyle = colors.grid; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = colors.muted; ctx.textAlign = "center"; ctx.fillText(String(x), px(x), box.bottom + 16);
    }
    for (const y of [0, .2, .4, .6, .8]) {
      ctx.beginPath(); ctx.moveTo(box.left, py(y)); ctx.lineTo(box.right, py(y)); ctx.strokeStyle = colors.grid; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = colors.muted; ctx.textAlign = "right"; ctx.fillText(String(y), box.left - 7, py(y));
    }
    return { ...box, px, py };
  }
  function curve(ctx, box, fun, color, dashed = false, fill = false, opacity = 1) {
    ctx.save(); ctx.globalAlpha = opacity; ctx.beginPath(); ctx.rect(box.left, box.top, box.right - box.left, box.bottom - box.top); ctx.clip(); ctx.beginPath();
    for (let i = 0; i <= 800; i++) { const x = -5 + 10 * i / 800, y = box.py(fun(x)); if (i) ctx.lineTo(box.px(x), y); else ctx.moveTo(box.px(x), y); }
    if (fill) { ctx.lineTo(box.right, box.py(0)); ctx.lineTo(box.left, box.py(0)); ctx.closePath(); ctx.fillStyle = "rgba(22,125,129,.10)"; ctx.fill(); }
    else { ctx.strokeStyle = color; ctx.lineWidth = opacity < 1 ? 1.25 : 2; ctx.setLineDash(dashed ? [5, 4] : []); ctx.stroke(); }
    ctx.restore();
  }
  function drawDensity(ctx, width, height, state) {
    const box = axes(ctx, width, height);
    curve(ctx, box, x => M.density(x, state), colors.mixture, false, true);
    state.means.forEach((mean, i) => curve(ctx, box, x => state.weights[i] * M.gaussian(x, mean, state.variance), colors.mixture, false, false, .4));
    curve(ctx, box, x => M.density(x, state), colors.mixture);
    curve(ctx, box, x => M.gaussian(x), colors.reference, true);
    return box;
  }
  function drawFunctionSketch(ctx, left, top, width, height, test) {
    const mid = top + height / 2, pad = 3;
    let bound = 0;
    for (let i = 0; i <= 100; i++) bound = Math.max(bound, Math.abs(test.f(-2 + 4 * i / 100)));
    bound = bound || 1;
    ctx.strokeStyle = "#dbe3e5"; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(left, mid); ctx.lineTo(left + width, mid); ctx.moveTo(left + width / 2, top); ctx.lineTo(left + width / 2, top + height); ctx.stroke();
    ctx.strokeStyle = colors.f; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = left + pad + (width - 2 * pad) * i / 100, y = mid - test.f(-2 + 4 * i / 100) / bound * (height / 2 - 3);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  function drawHistogram(ctx, width, height, state) {
    clear(ctx, width, height);
    const box = { left: width < 330 ? 20 : 27, right: width - 7, top: 31, bottom: height - 98 };
    box.center = (box.top + box.bottom) / 2; box.zeroY = box.center; box.half = (box.bottom - box.top) / 2;
    const slot = (box.right - box.left) / 6, barWidth = slot * .57, small = width < 360;
    ctx.font = (small ? "9" : "11") + "px system-ui,sans-serif"; ctx.textBaseline = "middle";
    for (const value of [-1, -.5, 0, .5, 1]) {
      const y = box.center - value * box.half; ctx.beginPath(); ctx.moveTo(box.left, y); ctx.lineTo(box.right, y); ctx.strokeStyle = value === 0 ? "#71838c" : colors.grid; ctx.lineWidth = value === 0 ? 1.4 : .8; ctx.stroke();
      if (value === 0 || Math.abs(value) === 1) { ctx.fillStyle = colors.muted; ctx.textAlign = "right"; ctx.fillText(value > 0 ? "+1" : String(value), box.left - 4, y); }
    }
    const centers = [], bars = [];
    state.rows.forEach((row, i) => {
      const x = box.left + (i + .5) * slot, y = box.center - row.normalized * box.half;
      const sketch = { left: x - slot * .4, top: box.bottom + 29, width: slot * .8, height: 35 };
      centers.push(x); bars.push({ key: row.key, x, y, normalized: row.normalized, raw: row.residual, scale: row.scale, sketch });
      ctx.fillStyle = row.residual < 0 ? colors.negative : colors.positive;
      ctx.fillRect(x - barWidth / 2, Math.min(y, box.center), barWidth, Math.abs(y - box.center));
      ctx.beginPath(); ctx.arc(x, y, 2, 0, 2 * Math.PI); ctx.fill();
      ctx.textAlign = "center"; ctx.fillStyle = colors.ink; ctx.font = (small ? "9" : "11") + "px system-ui,sans-serif";
      ctx.fillText(Math.abs(row.residual) < .0005 ? "0" : row.residual.toFixed(2), x, 13);
      ctx.fillText(row.label.replace(/ /g, "").replace(/−/g, "-"), x, box.bottom + 17);
      drawFunctionSketch(ctx, sketch.left, sketch.top, sketch.width, sketch.height, M.tests[i]);
      ctx.fillStyle = colors.muted; ctx.font = (small ? "8" : "10") + "px system-ui,sans-serif";
      ctx.fillText("÷" + row.scale, x, box.bottom + 80);
    });
    return { ...box, centers, scales: state.rows.map(row => row.scale), bars };
  }
  function drawSummary(ctx, width, height, state) {
    clear(ctx, width, height);
    const pad = 36, gap = 35, leftWidth = 530, right = pad + leftWidth + gap, rightWidth = width - right - pad;
    ctx.fillStyle = colors.ink; ctx.font = "600 25px system-ui,sans-serif"; ctx.fillText("Gaussian Stein identities", pad, 40);
    ctx.font = "17px system-ui,sans-serif"; ctx.fillStyle = colors.muted; ctx.fillText("Changing a mixture's shape and position", pad, 70);
    ctx.fillStyle = colors.ink; ctx.font = "600 18px system-ui,sans-serif"; ctx.fillText("Mixture and reference density", pad, 116); ctx.fillText("Signed residuals and their test functions", right, 116);
    ctx.save(); ctx.translate(pad, 137); drawDensity(ctx, leftWidth, 350, state); ctx.restore();
    ctx.save(); ctx.translate(right, 137); drawHistogram(ctx, rightWidth, 399, state); ctx.restore();
    ctx.font = "16px system-ui,sans-serif"; ctx.fillStyle = colors.mixture; ctx.fillText("Mixture", pad + 50, 519); ctx.fillStyle = colors.reference; ctx.fillText("N(0, 1): dashed", pad + 185, 519);
    ctx.fillStyle = colors.muted; ctx.fillText("θ = " + state.theta.toFixed(2) + "     b = " + state.position.toFixed(2), pad + 50, 554);
    ctx.font = "15px system-ui,sans-serif"; ctx.fillText("Raw residuals above; fixed per-test divisors below", right, 566);
  }
  return { colors, drawDensity, drawHistogram, drawFunctionSketch, drawSummary };
}));
