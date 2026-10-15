(function () {
  "use strict";

  var Q = [1.5, 0.4, 0.8];
  var beta = (2.3 + Math.sqrt(0.7 * 0.7 + 0.8 * 0.8)) / 2;

  function target(x, y, dimension) {
    return dimension === 1 ? x * x / 2 :
      (Q[0] * x * x + 2 * Q[1] * x * y + Q[2] * y * y) / 2;
  }

  function planes(n, dimension) {
    var result = [];
    for (var i = 0; i < n; i++) {
      var x = -1 + 2 * i / (n - 1);
      var count = dimension === 1 ? 1 : n;
      for (var j = 0; j < count; j++) {
        var y = dimension === 1 ? 0 : -1 + 2 * j / (n - 1);
        result.push({
          x: x, y: y,
          a: dimension === 1 ? x : Q[0] * x + Q[1] * y,
          b: dimension === 1 ? 0 : Q[1] * x + Q[2] * y,
          c: -target(x, y, dimension)
        });
      }
    }
    return result;
  }

  function evaluate(x, y, bank, tau) {
    var largest = -Infinity;
    var i;
    for (i = 0; i < bank.length; i++) {
      largest = Math.max(largest, bank[i].a * x + bank[i].b * y + bank[i].c);
    }
    var sum = 0;
    for (i = 0; i < bank.length; i++) {
      sum += Math.exp((bank[i].a * x + bank[i].b * y + bank[i].c - largest) / tau);
    }
    return { max: largest, soft: largest + tau * Math.log(sum) };
  }

  function automaticTemperature(n) {
    return beta / (2 * (n - 1) * (n - 1) * Math.log(n * n));
  }

  function compute(n, tau, resolution) {
    var bank1 = planes(n, 1), bank2 = planes(n, 2);
    var curve = [], grid = [], errors1 = [0, 0], errors2 = [0, 0], valueMax = 0;
    var i, j, x, y, f, v;
    for (i = 0; i <= 400; i++) {
      x = -1 + 2 * i / 400;
      f = target(x, 0, 1);
      v = evaluate(x, 0, bank1, tau);
      curve.push({ x: x, f: f, max: v.max, soft: v.soft });
      errors1[0] = Math.max(errors1[0], Math.abs(v.max - f));
      errors1[1] = Math.max(errors1[1], Math.abs(v.soft - f));
    }
    for (j = 0; j < resolution; j++) {
      y = 1 - 2 * j / (resolution - 1);
      for (i = 0; i < resolution; i++) {
        x = -1 + 2 * i / (resolution - 1);
        f = target(x, y, 2);
        v = evaluate(x, y, bank2, tau);
        grid.push({ f: f, max: v.max, soft: v.soft });
        errors2[0] = Math.max(errors2[0], Math.abs(v.max - f));
        errors2[1] = Math.max(errors2[1], Math.abs(v.soft - f));
        valueMax = Math.max(valueMax, f, v.soft);
      }
    }
    return {
      n: n, tau: tau, resolution: resolution,
      bank1: bank1, bank2: bank2, curve: curve, grid: grid,
      errors1: errors1, errors2: errors2, valueMax: valueMax
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      target: target, planes: planes, evaluate: evaluate, compute: compute,
      automaticTemperature: automaticTemperature, beta: beta
    };
  }
  if (typeof document === "undefined") return;

  function byId(id) { return document.getElementById(id); }
  if (!byId("max-experiment")) return;
  var widthInput = byId("max-width"), autoInput = byId("max-auto");
  var temperatureInput = byId("max-temperature"), viewInput = byId("max-view");
  var data, pending = false;
  var ink = "#24333b", teal = "#007d85", orange = "#d16b2f";

  function number(x) {
    return x === 0 ? "0" : (Math.abs(x) < 0.001 ? x.toExponential(2) : x.toPrecision(3));
  }
  function setup(canvas) {
    var rect = canvas.getBoundingClientRect();
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var width = rect.width, height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = "11px system-ui, sans-serif";
    ctx.lineJoin = "round";
    return { ctx: ctx, width: width, height: height };
  }
  function line(ctx, points, color, width, dashed) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed || []);
    ctx.beginPath();
    points.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function drawCurve() {
    var drawing = setup(byId("max-1d")), ctx = drawing.ctx;
    var left = 44, right = drawing.width - 15;
    var top = 23, bottom = drawing.height * 0.59;
    var rtop = drawing.height * 0.72, rbottom = drawing.height - 27;
    var maxY = 0.55, minY = -0.04;
    data.curve.forEach(function (v) {
      maxY = Math.max(maxY, v.soft * 1.06);
      minY = Math.min(minY, v.max - 0.025);
    });
    var residualScale = Math.max(data.errors1[0], data.errors1[1], 1e-5) * 1.08;
    function px(x) { return left + (x + 1) * (right - left) / 2; }
    function py(y) { return bottom - (y - minY) * (bottom - top) / (maxY - minY); }
    function ry(y) { return (rtop + rbottom) / 2 - y * (rbottom - rtop) / (2 * residualScale); }
    ctx.fillStyle = "#617078";
    ctx.textAlign = "left";
    ctx.fillText("Function values", left, 14);
    ctx.fillText("Signed error", left, rtop - 9);
    [0, 0.25, 0.5].forEach(function (y) {
      line(ctx, [[left, py(y)], [right, py(y)]], "#e4ebeb", 1);
      ctx.textAlign = "right"; ctx.fillText(String(y), left - 6, py(y) + 4);
    });
    line(ctx, [[left, ry(0)], [right, ry(0)]], "#b6c7c9", 1);
    [-1, 0, 1].forEach(function (x) {
      ctx.textAlign = "center";
      ctx.fillText(String(x), px(x), drawing.height - 8);
    });
    ["f", "max", "soft"].forEach(function (key, i) {
      line(ctx, data.curve.map(function (v) { return [px(v.x), py(v[key])]; }),
        [ink, teal, orange][i], i === 0 ? 2.5 : 1.8);
    });
    ["max", "soft"].forEach(function (key, i) {
      line(ctx, data.curve.map(function (v) { return [px(v.x), ry(v[key] - v.f)]; }),
        [teal, orange][i], 1.7);
    });
    ctx.fillStyle = ink;
    data.bank1.forEach(function (z) {
      ctx.beginPath(); ctx.arc(px(z.x), py(target(z.x, 0, 1)), 2.4, 0, 2 * Math.PI); ctx.fill();
    });
    ctx.textAlign = "right"; ctx.fillStyle = "#617078";
    ctx.fillText("±" + number(residualScale), right, rtop - 9);
    byId("max-stats-1d").textContent = "1D · " + data.n + " planes · sampled max error: " +
      number(data.errors1[0]) + " · sampled softmax error: " + number(data.errors1[1]);
  }

  function blend(a, b, t) {
    return a.map(function (v, i) { return Math.round(v + t * (b[i] - v)); });
  }
  function heatColor(value, scale, errorMode) {
    if (!errorMode) return blend([237, 247, 245], [0, 106, 118], Math.max(0, Math.min(1, value / scale)));
    var t = Math.max(-1, Math.min(1, value / scale));
    return t < 0 ? blend([251, 251, 249], [23, 107, 156], -t) :
      blend([251, 251, 249], [182, 78, 54], t);
  }
  function contours(ctx, key, levels, left, top, size, color, dashed) {
    var r = data.resolution;
    ctx.strokeStyle = color; ctx.lineWidth = 1.1; ctx.setLineDash(dashed ? [4, 3] : []);
    levels.forEach(function (level) {
      ctx.beginPath();
      for (var j = 0; j < r - 1; j++) {
        for (var i = 0; i < r - 1; i++) {
          var corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
          var values = corners.map(function (c) { return data.grid[c[1] * r + c[0]][key]; });
          var hits = [];
          for (var e = 0; e < 4; e++) {
            var next = (e + 1) % 4;
            if ((values[e] < level) === (values[next] < level)) continue;
            var t = (level - values[e]) / (values[next] - values[e]);
            hits.push([
              left + (corners[e][0] + t * (corners[next][0] - corners[e][0])) * size / (r - 1),
              top + (corners[e][1] + t * (corners[next][1] - corners[e][1])) * size / (r - 1)
            ]);
          }
          for (var k = 0; k + 1 < hits.length; k += 2) {
            ctx.moveTo(hits[k][0], hits[k][1]); ctx.lineTo(hits[k + 1][0], hits[k + 1][1]);
          }
        }
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }
  function drawSurface(canvasId, key, scale, errorMode) {
    var drawing = setup(byId(canvasId)), ctx = drawing.ctx;
    var left = 31, top = 10;
    var size = Math.min(drawing.width - left - 12, drawing.height - top - 29);
    var r = data.resolution;
    var buffer = document.createElement("canvas");
    buffer.width = r; buffer.height = r;
    var bctx = buffer.getContext("2d"), pixels = bctx.createImageData(r, r);
    data.grid.forEach(function (v, i) {
      var c = heatColor(errorMode ? v[key] - v.f : v[key], scale, errorMode);
      pixels.data[4 * i] = c[0]; pixels.data[4 * i + 1] = c[1];
      pixels.data[4 * i + 2] = c[2]; pixels.data[4 * i + 3] = 255;
    });
    bctx.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buffer, left, top, size, size);
    if (!errorMode) {
      var levels = [0.08, 0.2, 0.4, 0.65, 1, 1.35];
      contours(ctx, "f", levels, left, top, size, "#1c3039", false);
      contours(ctx, key, levels, left, top, size, "#ffffff", true);
    }
    ctx.fillStyle = "rgba(22,40,48,0.48)";
    data.bank2.forEach(function (z) {
      ctx.beginPath(); ctx.arc(left + (z.x + 1) * size / 2,
        top + (1 - z.y) * size / 2, data.n > 12 ? 1.2 : 1.8, 0, 2 * Math.PI); ctx.fill();
    });
    ctx.strokeStyle = "#819b9e"; ctx.lineWidth = 1; ctx.strokeRect(left, top, size, size);
    ctx.fillStyle = "#617078";
    [-1, 0, 1].forEach(function (v) {
      ctx.textAlign = "center"; ctx.fillText(String(v), left + (v + 1) * size / 2, top + size + 17);
      ctx.textAlign = "right"; ctx.fillText(String(v), left - 7, top + (1 - v) * size / 2 + 4);
    });
  }
  function render() {
    if (!data) return;
    drawCurve();
    var errorMode = viewInput.value === "error";
    var scale = errorMode ? Math.max(data.errors2[0], data.errors2[1], 1e-5) : data.valueMax;
    drawSurface("max-2d", "max", scale, errorMode);
    drawSurface("softmax-2d", "soft", scale, errorMode);
    byId("max-color-low").textContent = errorMode ? "−" + number(scale) : "0";
    byId("max-color-mid").textContent = errorMode ? "0" : "Value";
    byId("max-color-high").textContent = "+" + number(scale);
    byId("max-colorbar").querySelector(".ramp").style.background = errorMode ?
      "linear-gradient(90deg,#176b9c,#fbfbf9,#b64e36)" : "linear-gradient(90deg,#edf7f5,#006a76)";
    byId("max-stats-2d").textContent = "2D · " + data.n * data.n +
      " planes · sampled max error: " + number(data.errors2[0]) +
      " · sampled softmax error: " + number(data.errors2[1]);
    var tangentBound = beta / ((data.n - 1) * (data.n - 1));
    var smoothingBound = data.tau * Math.log(data.n * data.n);
    byId("max-bound").textContent = "Certified 2D bounds · tangent error ≤ " +
      number(tangentBound) + " · smoothing shift ≤ " + number(smoothingBound) +
      " · total softmax error ≤ " + number(Math.max(tangentBound, smoothingBound));
  }
  function update() {
    var n = Number(widthInput.value);
    var tau = autoInput.checked ? automaticTemperature(n) : Math.pow(10, Number(temperatureInput.value));
    temperatureInput.disabled = autoInput.checked;
    byId("max-width-value").textContent = n + " per axis · " + n + " / " + n * n + " neurons in 1D / 2D";
    byId("max-temperature-value").textContent = "τ = " + number(tau) + (autoInput.checked ? " (automatic)" : " (manual)");
    data = compute(n, tau, 81);
    render();
  }
  function scheduleUpdate() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () { pending = false; update(); });
  }
  widthInput.addEventListener("input", scheduleUpdate);
  temperatureInput.addEventListener("input", scheduleUpdate);
  autoInput.addEventListener("change", scheduleUpdate);
  viewInput.addEventListener("change", render);
  byId("max-reset").addEventListener("click", function () {
    widthInput.value = "6"; autoInput.checked = true;
    temperatureInput.value = "-2"; viewInput.value = "error"; update();
  });
  var resizePending = false;
  window.addEventListener("resize", function () {
    if (resizePending) return;
    resizePending = true;
    window.requestAnimationFrame(function () { resizePending = false; render(); });
  });
  update();
})();
