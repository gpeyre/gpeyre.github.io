(function () {
  "use strict";
  const core = window.SignGeometryCore;
  const selected = "#b84622", reference = "#204f71", rotated = "#784289";
  const runColors = Object.freeze([selected, "#295b9b", rotated, "#26714f", "#846003"]);
  const muted = "#455e65", frame = "#9cb1b4", floor = 1e-8;

  function context(canvas) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (width < 1 || height < 1) return null;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return {ctx, width, height};
  }

  function line(ctx, x0, y0, x1, y1) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function dot(ctx, x, y, radius, fill, stroke, strokeWidth = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.stroke(); }
  }

  function contourColor(index) {
    const t = index / (core.levels.length - 1);
    const rgb = [249 - 57*t, 251 - 42*t, 250 - 39*t].map(Math.round);
    return "rgb(" + rgb.join(",") + ")";
  }

  function orbit(ctx, path, k, X, Y, color, dashed) {
    ctx.strokeStyle = color;
    ctx.lineWidth = dashed ? 1.85 : 2.1;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    for (let j = 0; j <= k; ++j) {
      const point = path[j];
      if (j === 0) ctx.moveTo(X(point.x), Y(point.y));
      else ctx.lineTo(X(point.x), Y(point.y));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (let j = 1; !dashed && j < k; ++j) {
      const point = path[j];
      dot(ctx, X(point.x), Y(point.y), 2.1, color, color);
    }
  }

  function contour(canvas, trajectory, k, visibleRuns, showReference) {
    const setup = context(canvas);
    if (!setup) return;
    const {ctx, width, height} = setup;
    const side = Math.min(width - 48, height - 44);
    const left = (width - side + 15) / 2, top = (height - side - 19) / 2;
    const right = left + side, bottom = top + side, extent = core.extent;
    const X = x => left + side*(x + extent)/(2*extent);
    const Y = y => top + side*(extent - y)/(2*extent);
    const labelSize = width < 270 ? 10 : 11;
    ctx.save();
    ctx.beginPath(); ctx.rect(left, top, side, side); ctx.clip();
    ctx.fillStyle = "#b7ceca"; ctx.fillRect(left, top, side, side);
    for (let i = core.levels.length - 1; i >= 0; --i) {
      ctx.beginPath();
      for (let j = 0; j < 160; ++j) {
        const {x, y} = core.contourPoint(trajectory.angle, core.levels[i], j * Math.PI / 80);
        if (j === 0) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y));
      }
      ctx.closePath();
      ctx.fillStyle = contourColor(i); ctx.fill();
      ctx.strokeStyle = "#6c9898"; ctx.lineWidth = .7; ctx.stroke();
    }
    ctx.strokeStyle = "#8aa4a6"; ctx.lineWidth = .7; ctx.setLineDash([2, 4]);
    line(ctx, X(0), top, X(0), bottom);
    line(ctx, left, Y(0), right, Y(0));
    ctx.setLineDash([]);

    // Label a fixed subset along a ray in the lower-right quadrant.
    const ray = [.28, -1], rayEnergy = core.energy(trajectory.hessian, ...ray);
    ctx.font = `${labelSize - 1}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const energy of [.09, .24, .52]) {
      const radius = Math.sqrt(energy / rayEnergy), x = radius * ray[0], y = radius * ray[1];
      if (Math.abs(y) >= extent - .08) continue;
      ctx.strokeStyle = "#eff6f5"; ctx.lineWidth = 3;
      ctx.strokeText(energy.toString(), X(x), Y(y));
      ctx.fillStyle = "#466e73"; ctx.fillText(energy.toString(), X(x), Y(y));
    }

    ctx.strokeStyle = "#526c71"; ctx.lineWidth = 1.1;
    line(ctx, X(0) - 4, Y(0), X(0) + 4, Y(0));
    line(ctx, X(0), Y(0) - 4, X(0), Y(0) + 4);
    if (showReference) {
      ctx.globalAlpha = .63;
      for (const i of visibleRuns) orbit(ctx, trajectory.runs[i].euclidean, k, X, Y, runColors[i], true);
      ctx.globalAlpha = 1;
    }
    for (const i of visibleRuns) orbit(ctx, trajectory.runs[i].selected, k, X, Y, runColors[i], false);
    for (const i of visibleRuns) {
      const {selected: path} = trajectory.runs[i], color = runColors[i];
      const start = path[0], end = path[k], x = X(start.x), y = Y(start.y);
      if (k > 0) dot(ctx, x, y, 3.5, "#fff", color, 1.55);
      dot(ctx, X(end.x), Y(end.y), 4.8, "#fff", color, 2);
      const sx = x + (start.x < 0 ? -8 : 8), sy = y + (start.y < 0 ? 8 : -8);
      ctx.font = `700 ${labelSize + 1}px system-ui, sans-serif`;
      ctx.textAlign = start.x < 0 ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "#f7faf9"; ctx.lineWidth = 3;
      ctx.strokeText(String.fromCharCode(65 + i), sx, sy);
      ctx.fillStyle = color; ctx.fillText(String.fromCharCode(65 + i), sx, sy);
    }
    ctx.restore();

    ctx.strokeStyle = frame; ctx.lineWidth = .9; ctx.strokeRect(left, top, side, side);
    ctx.font = `${labelSize}px system-ui, sans-serif`;
    ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const tick of [-1, 0, 1]) {
      line(ctx, X(tick), bottom, X(tick), bottom + 3);
      ctx.fillText(tick, X(tick), bottom + 5);
    }
    ctx.fillText("x₁", left + side/2, bottom + 20);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const tick of [-1, 0, 1]) {
      line(ctx, left - 3, Y(tick), left, Y(tick));
      ctx.fillText(tick, left - 6, Y(tick));
    }
    ctx.textAlign = "center";
    ctx.save(); ctx.translate(left - 27, top + side/2); ctx.rotate(-Math.PI / 2); ctx.fillText("x₂", 0, 0); ctx.restore();
  }

  function loss(canvas, curves, p, k, showReference) {
    const setup = context(canvas);
    if (!setup) return;
    const {ctx, width, height} = setup;
    const left = 40, top = 12, right = width - 15, bottom = height - 32;
    const X = index => left + (right-left)*index/core.horizon;
    const Y = ratio => top + (bottom-top)*(-Math.log10(Math.max(floor, Math.min(1, ratio))))/8;
    const series = p === 2 ? [[curves.aligned, selected, false]]
      : [[curves.rotated, rotated, false], [curves.aligned, selected, false]];
    if (showReference) series.unshift([curves.reference, reference, true]);
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = muted;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const [decade, label] of [[0,"1"],[2,"10⁻²"],[4,"10⁻⁴"],[6,"10⁻⁶"],[8,"10⁻⁸"]]) {
      const y = Y(10 ** -decade);
      ctx.strokeStyle = "#e2e9e8"; ctx.lineWidth = 1; line(ctx, left, y, right, y);
      ctx.fillText(label, left - 7, y);
    }
    ctx.strokeStyle = frame;
    line(ctx, left, top, left, bottom);
    line(ctx, left, bottom, right, bottom);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const tick of [0, 12, 24, 36, 48]) {
      line(ctx, X(tick), bottom, X(tick), bottom + 3);
      ctx.fillText(tick, X(tick), bottom + 5);
    }
    ctx.fillText("Iteration k", (left + right)/2, bottom + 19);
    ctx.strokeStyle = "#6c7779"; ctx.setLineDash([2, 3]); ctx.lineWidth = 1.2;
    line(ctx, X(k), top, X(k), bottom);
    ctx.setLineDash([]);
    for (const [curve, color, dashed] of series) {
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.beginPath();
      curve.forEach((value, i) => {
        const x = X(i), y = Y(value);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, X(k), Y(curve[k]), 3.15, "#fff", color, 1.6);
    }
  }

  window.SignGeometryView = Object.freeze({contour, loss, runColors});
})();
