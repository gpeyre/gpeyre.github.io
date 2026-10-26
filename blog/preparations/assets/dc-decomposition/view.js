(function (root) {
  "use strict";
  var COLORS = { phi: "#243640", F: "#087d86", G: "#c6652f" };
  function number(value) {
    if (Math.abs(value) < 5e-13) return "0";
    if (Math.abs(value) < 0.001 || Math.abs(value) >= 1e4) return value.toExponential(2);
    return Number(value.toPrecision(4)).toString();
  }
  function ticks(low, high, count) {
    var raw = (high - low) / count, power = Math.pow(10, Math.floor(Math.log10(raw)));
    var fraction = raw / power;
    var step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
    var values = [];
    for (var value = Math.ceil(low / step) * step; value <= high + 1e-10; value += step) values.push(value);
    return values;
  }
  // The browser and summary-image renderer share this exact drawing routine.
  // A Node canvas can supply width/height without any document or DOM objects.
  function draw(canvas, points, roots, series, options) {
    options = options || {};
    var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.width, height: canvas.height };
    var ratio = options.ratio || Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    var ctx = canvas.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    var left = 48, right = rect.width - 16, top = 23, bottom = rect.height - 34;
    var low = 0, high = 0;
    points.forEach(function (p) { series.forEach(function (s) { low = Math.min(low, p[s.key]); high = Math.max(high, p[s.key]); }); });
    var span = Math.max(high - low, 0.1); low -= span * 0.08; high += span * 0.09;
    function px(x) { return left + (x + 2) * (right - left) / 4; }
    function py(y) { return bottom - (y - low) * (bottom - top) / (high - low); }
    function line(x0, y0, x1, y1, color, width, dash) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.font = "11px system-ui,sans-serif"; ctx.fillStyle = "#61727a"; ctx.textAlign = "right";
    ticks(low, high, 4).forEach(function (value) {
      line(left, py(value), right, py(value), "#e5ecee", 1);
      ctx.fillText(number(value), left - 8, py(value) + 4);
    });
    [-2, -1, 0, 1, 2].forEach(function (value) {
      line(px(value), top, px(value), bottom, "#f0f4f5", 1);
      ctx.textAlign = "center"; ctx.fillText(String(value), px(value), bottom + 19);
    });
    line(left, py(0), right, py(0), "#b3c4c9", 1);
    if (options.showRoots) roots.forEach(function (x) { line(px(x), top, px(x), bottom, "#cbd8dc", 1, [2, 4]); });
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
    series.forEach(function (s) {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2.3; ctx.setLineDash(s.dashed ? [5, 4] : []); ctx.lineJoin = "round";
      ctx.beginPath(); points.forEach(function (p, index) { if (index) ctx.lineTo(px(p.x), py(p[s.key])); else ctx.moveTo(px(p.x), py(p[s.key])); }); ctx.stroke();
    });
    ctx.restore(); ctx.setLineDash([]); ctx.fillStyle = "#61727a"; ctx.textAlign = "left";
    ctx.fillText(options.showRoots ? "Curvature" : "Value", left, 12);
    ctx.textAlign = "right"; ctx.fillText("x", right + 11, bottom + 4);
  }
  var api = { draw: draw, colors: COLORS, number: number };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DCDecompositionView = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
