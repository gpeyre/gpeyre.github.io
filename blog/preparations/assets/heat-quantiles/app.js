(function () {
  "use strict";
  const M = window.HeatQuantiles, $ = id => document.getElementById(id);
  const horizon = 2, curveLevels = Array.from({ length: 181 }, (_, i) => .005 + .99 * i / 180);
  let mixture, paths, initialCurve, currentCurve, currentPositions, densityInitial, densityCurrent, n, separation, time = 0;
  let spatialMin, spatialMax, densityMax, playing = false, animation, animationTime = 0, previousStamp, redraw;

  function notifyHeight() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "heat-quantiles", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) }, location.protocol === "file:" ? "*" : location.origin);
  }
  function color(s, alpha = 1) {
    const stops = [[53, 108, 168], [0, 140, 139], [201, 111, 56]], side = s < .5 ? 0 : 1, t = side ? 2 * s - 1 : 2 * s;
    const rgb = stops[side].map((value, i) => Math.round(value * (1 - t) + stops[side + 1][i] * t));
    return "rgba(" + rgb.join(",") + "," + alpha + ")";
  }
  function setup(canvas, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const width = canvas.clientWidth, height = canvas.clientHeight, ratio = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.font = "11px system-ui,sans-serif"; ctx.lineJoin = "round"; ctx.lineCap = "round";
    const left = 43, right = width - 16, top = 18, bottom = height - 35;
    const x = value => left + (value - xMin) * (right - left) / (xMax - xMin);
    const y = value => bottom - (value - yMin) * (bottom - top) / (yMax - yMin);
    const label = value => Math.abs(value) < 1e-10 ? "0" : +value.toFixed(2) + "";
    ctx.strokeStyle = "#edf2f3"; ctx.lineWidth = 1; ctx.fillStyle = "#73848a";
    for (let i = 0; i <= 4; i++) {
      const xx = xMin + (xMax - xMin) * i / 4, yy = yMin + (yMax - yMin) * i / 4;
      ctx.beginPath(); ctx.moveTo(x(xx), top); ctx.lineTo(x(xx), bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(left, y(yy)); ctx.lineTo(right, y(yy)); ctx.stroke();
      ctx.textAlign = "center"; ctx.fillText(label(xx), x(xx), bottom + 16);
      ctx.textAlign = "right"; ctx.fillText(label(yy), left - 7, y(yy) + 4);
    }
    ctx.fillStyle = "#4e646d"; ctx.textAlign = "right"; ctx.fillText(xLabel, right, height - 1);
    ctx.textAlign = "left"; ctx.fillText(yLabel, left + 2, 10);
    return { ctx, x, y, left, right, top, bottom, width, height };
  }
  function line(panel, points, stroke, width = 1.8, fill) {
    const { ctx, x, y, bottom } = panel;
    ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(x(point[0]), y(point[1])) : ctx.moveTo(x(point[0]), y(point[1])));
    if (fill) {
      ctx.lineTo(x(points[points.length - 1][0]), bottom); ctx.lineTo(x(points[0][0]), bottom); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(x(point[0]), y(point[1])) : ctx.moveTo(x(point[0]), y(point[1])));
    }
    ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
  }
  function dot(panel, xx, yy, s, radius) {
    const { ctx, x, y } = panel;
    ctx.beginPath(); ctx.arc(x(xx), y(yy), radius, 0, 2 * Math.PI); ctx.fillStyle = color(s); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = .7; ctx.stroke();
  }
  function densityPlot() {
    const panel = setup($("density-plot"), spatialMin, spatialMax, 0, densityMax, "position x", "density ρ(x, t)");
    line(panel, densityInitial, "#aab5b9", 1.4, "rgba(174,187,191,.08)");
    line(panel, densityCurrent, "#007f83", 2.2, "rgba(0,127,131,.08)");
    paths.levels.forEach((s, i) => {
      const q = currentPositions[i], density = M.density(q, time, mixture);
      panel.ctx.strokeStyle = color(s, .13); panel.ctx.lineWidth = .7;
      panel.ctx.beginPath(); panel.ctx.moveTo(panel.x(q), panel.y(0)); panel.ctx.lineTo(panel.x(q), panel.y(density)); panel.ctx.stroke();
      dot(panel, q, density, s, n > 70 ? 2.4 : 3.2);
    });
    $("density-plot").setAttribute("aria-label", "Initial density in gray and heat density at time " + time.toFixed(3) + " in teal. " + n + " equal-rank markers follow the cumulative mass.");
  }
  function quantilePlot() {
    const panel = setup($("quantile-plot"), 0, 1, spatialMin, spatialMax, "mass rank s", "position q(s, t)");
    line(panel, curveLevels.map((s, i) => [s, initialCurve[i]]), "#acb7ba", 1.5);
    line(panel, curveLevels.map((s, i) => [s, currentCurve[i]]), "#008387", 2);
    paths.levels.forEach((s, i) => dot(panel, s, currentPositions[i], s, n > 70 ? 2 : 2.7));
    $("quantile-plot").setAttribute("aria-label", "Increasing quantile function at time " + time.toFixed(3) + ", compared with its initial value. " + n + " tracked interior ranks.");
  }
  function trajectoryPlot() {
    const panel = setup($("trajectory-plot"), 0, horizon, spatialMin, spatialMax, "heat time t", "position q(s, t)");
    paths.levels.forEach((s, i) => line(panel, paths.times.map((t, k) => [t, paths.positions[k][i]]), color(s, n > 70 ? .52 : .68), n > 70 ? .85 : 1.1));
    panel.ctx.strokeStyle = "#46656e"; panel.ctx.lineWidth = 1.2; panel.ctx.setLineDash([4, 4]);
    panel.ctx.beginPath(); panel.ctx.moveTo(panel.x(time), panel.top); panel.ctx.lineTo(panel.x(time), panel.bottom); panel.ctx.stroke(); panel.ctx.setLineDash([]);
    paths.levels.forEach((s, i) => dot(panel, time, currentPositions[i], s, n > 70 ? 2 : 2.8));
    $("trajectory-plot").setAttribute("aria-label", n + " noncrossing deterministic quantile trajectories from time zero to two. Cursor at time " + time.toFixed(3) + ".");
  }
  function render() {
    // A lazy iframe can run before layout gives its canvases a useful width.
    if (!paths || ["density-plot", "quantile-plot", "trajectory-plot"].some(id => $(id).clientWidth < 80 || $(id).clientHeight < 60)) return;
    densityPlot(); quantilePlot(); trajectoryPlot();
  }
  function updateTime() {
    time = Number($("time").value);
    currentCurve = curveLevels.map(s => M.quantile(s, time, mixture));
    currentPositions = paths.levels.map(s => M.quantile(s, time, mixture));
    densityCurrent = densityInitial.map(point => [point[0], M.density(point[0], time, mixture)]);
    const moments = M.moments(time, mixture);
    $("time-value").textContent = time.toFixed(2); $("time").setAttribute("aria-valuetext", "Heat time " + time.toFixed(3));
    $("mean-value").textContent = moments.mean.toFixed(3); $("variance-value").textContent = moments.variance.toFixed(3); $("increase-value").textContent = (2 * time).toFixed(3);
    $("status").textContent = (playing ? "Playing" : "Paused") + " at t = " + time.toFixed(2);
    render();
  }
  function pause() {
    playing = false; cancelAnimationFrame(animation); previousStamp = undefined;
    $("play").textContent = "Play heat flow"; $("play").setAttribute("aria-pressed", "false");
    $("status").setAttribute("aria-live", "polite");
  }
  function rebuild() {
    pause(); n = Number($("points").value); separation = Number($("separation").value);
    $("points-value").textContent = n; $("separation-value").textContent = separation.toFixed(2);
    $("points").setAttribute("aria-valuetext", n + " tracked interior quantiles");
    mixture = M.mixture(separation); paths = M.tracks(n, mixture, { tMax: horizon, steps: 120 });
    const first = M.quantile(.0005, horizon, mixture), last = M.quantile(.9995, horizon, mixture), padding = .015 * (last - first);
    spatialMin = first - padding; spatialMax = last + padding;
    densityInitial = Array.from({ length: 501 }, (_, i) => {
      const x = spatialMin + (spatialMax - spatialMin) * i / 500;
      return [x, M.density(x, 0, mixture)];
    });
    densityMax = 1.17 * Math.max(...densityInitial.map(point => point[1]));
    initialCurve = curveLevels.map(s => M.quantile(s, 0, mixture));
    updateTime(); notifyHeight();
  }
  function tick(stamp) {
    if (!playing) return;
    if (previousStamp !== undefined) animationTime = Math.min(horizon, animationTime + Math.min(80, stamp - previousStamp) / 6000);
    $("time").value = animationTime;
    previousStamp = stamp;
    if (Number($("time").value) >= horizon) pause();
    updateTime();
    if (playing) animation = requestAnimationFrame(tick);
  }
  $("play").addEventListener("click", () => {
    if (playing) { pause(); updateTime(); return; }
    if (time >= horizon) $("time").value = 0;
    animationTime = Number($("time").value); playing = true; previousStamp = undefined; $("play").textContent = "Pause"; $("play").setAttribute("aria-pressed", "true");
    $("status").setAttribute("aria-live", "off");
    updateTime(); animation = requestAnimationFrame(tick);
  });
  $("restart").addEventListener("click", () => { pause(); $("time").value = 0; updateTime(); });
  $("time").addEventListener("input", () => { pause(); updateTime(); });
  ["points", "separation"].forEach(id => $(id).addEventListener("input", rebuild));
  document.addEventListener("visibilitychange", () => { if (document.hidden) { pause(); updateTime(); } });
  window.addEventListener("pagehide", pause);
  window.addEventListener("resize", () => { cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => { render(); notifyHeight(); }); });
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(() => {
    cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => { render(); notifyHeight(); });
  }).observe(document.querySelector("main"));
  window.HeatQuantilesApp = { getState: () => ({ n, separation, time, playing, levels: paths.levels.slice(), positions: currentPositions.slice(), density: densityCurrent.map(point => point.slice()), trajectorySamples: paths.times.length }) };
  rebuild();
})();
