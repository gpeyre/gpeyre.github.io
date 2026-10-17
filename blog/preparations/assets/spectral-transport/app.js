(function () {
  "use strict";
  const M = window.SpectralTransport, $ = id => document.getElementById(id);
  const colors = { blue: "#246da0", orange: "#c35e29", green: "#007b72", muted: "#617078", grid: "#e7eeee" };
  let result, p = 2, time = 0.5, redraw;
  const query = new URLSearchParams(location.search);
  if (query.has("p")) {
    if (query.get("p") === "infinity") $("infinite").checked = true;
    else if (Number.isFinite(Number(query.get("p")))) $("exponent").value = Math.max(.5, Math.min(8, Number(query.get("p"))));
  }
  if (query.has("t") && Number.isFinite(Number(query.get("t")))) $("time").value = Math.max(0, Math.min(1, Number(query.get("t"))));

  function notifyHeight() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "spectral-transport", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) }, location.protocol === "file:" ? "*" : location.origin);
  }

  function setup(canvas) {
    const width = canvas.clientWidth, height = canvas.clientHeight, ratio = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.font = "11px system-ui,sans-serif"; ctx.lineJoin = "round"; ctx.lineCap = "round";
    return { ctx, width, height };
  }

  function spatial(canvas, limit) {
    const panel = setup(canvas), { ctx, width, height } = panel;
    const scale = Math.min(width - 40, height - 32) / (2 * limit), cx = width / 2, cy = height / 2;
    const x = value => cx + scale * value, y = value => cy - scale * value;
    ctx.strokeStyle = colors.grid; ctx.lineWidth = 1;
    for (let i = -Math.floor(limit); i <= Math.floor(limit); i++) {
      ctx.beginPath(); ctx.moveTo(x(i), y(-limit)); ctx.lineTo(x(i), y(limit)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x(-limit), y(i)); ctx.lineTo(x(limit), y(i)); ctx.stroke();
    }
    ctx.strokeStyle = "#cbd9da";
    ctx.beginPath(); ctx.moveTo(x(-limit), y(0)); ctx.lineTo(x(limit), y(0)); ctx.moveTo(x(0), y(-limit)); ctx.lineTo(x(0), y(limit)); ctx.stroke();
    return { ...panel, x, y, scale };
  }

  function circle(ctx, x, y, radius, color, fill = true) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    if (fill) { ctx.fill(); ctx.stroke(); } else { ctx.strokeStyle = color; ctx.stroke(); }
  }

  function couplingPlot() {
    const { ctx, x, y } = spatial($("coupling-plot"), 1.6);
    const plan = result.coupling;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const mass = plan[i][j];
      ctx.strokeStyle = mass > 1e-8 ? "rgba(61,83,91," + (.18 + .65 * mass / .5) + ")" : "#e3e9e9";
      ctx.lineWidth = mass > 1e-8 ? 10 * mass : 1; ctx.setLineDash(mass > 1e-8 ? [] : [3, 5]);
      ctx.beginPath(); ctx.moveTo(x(M.source[i][0]), y(M.source[i][1])); ctx.lineTo(x(M.target[j][0]), y(M.target[j][1])); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const particle of M.interpolation(result.s, time)) circle(ctx, x(particle.point[0]), y(particle.point[1]), 14 * Math.sqrt(particle.mass), colors.green);
    [M.source, M.target].forEach((cloud, side) => cloud.forEach((point, i) => {
      circle(ctx, x(point[0]), y(point[1]), 7, side ? colors.orange : colors.blue);
      ctx.fillStyle = side ? colors.orange : colors.blue; ctx.textAlign = "center";
      const offset = side ? (i === 0 ? -15 : 23) : (i === 0 ? 24 : -15);
      ctx.fillText((side ? "y" : "x") + (i + 1), x(point[0]), y(point[1]) + offset);
    }));
    $("coupling-plot").setAttribute("aria-label", "Optimal coupling has diagonal entries " + (result.s / 2).toFixed(4) + " and off-diagonal entries " + ((1 - result.s) / 2).toFixed(4) + ". Intermediate particles are shown at time " + time.toFixed(2) + ".");
  }

  function covariancePlot() {
    const { ctx, x, y, scale, width, height } = spatial($("covariance-plot"), 1.75);
    const [xx, xy, yy] = result.q, angle = Math.atan2(2 * xy, xx - yy) / 2;
    const [first, second] = result.eigenvalues, ca = Math.cos(angle), sa = Math.sin(angle);
    ctx.fillStyle = "rgba(0,111,126,.1)"; ctx.strokeStyle = "#006f7e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x(0), y(0), scale * Math.sqrt(first), scale * Math.sqrt(second), -angle, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    [[Math.sqrt(first) * ca, Math.sqrt(first) * sa], [-Math.sqrt(second) * sa, Math.sqrt(second) * ca]].forEach((v, i) => {
      ctx.strokeStyle = i ? "#7baeb3" : "#006f7e"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x(-v[0]), y(-v[1])); ctx.lineTo(x(v[0]), y(v[1])); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.textAlign = "center"; ctx.fillStyle = colors.muted;
    ctx.fillText("λ₁ = " + first.toFixed(3) + "     λ₂ = " + second.toFixed(3), width / 2, height - 3);
    $("covariance-plot").setAttribute("aria-label", "Displacement second moment ellipse with eigenvalues " + first.toFixed(4) + " and " + second.toFixed(4) + ".");
  }

  function costPlot() {
    const { ctx, width, height } = setup($("cost-plot")), left = width < 360 ? 44 : 52, right = 15, top = 25, bottom = 35;
    const values = Array.from({ length: 401 }, (_, k) => M.value(k / 400, p));
    let low = Math.min(...values, result.cost), high = Math.max(...values);
    const pad = Math.max(.04, (high - low) * .12); low = Math.max(0, low - pad); high += pad;
    const x = s => left + s * (width - left - right), y = v => height - bottom - (v - low) / (high - low) * (height - top - bottom);
    ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.fillStyle = colors.muted;
    ctx.textAlign = "center";
    for (let k = 0; k <= 4; k++) {
      const s = k / 4; ctx.beginPath(); ctx.moveTo(x(s), top); ctx.lineTo(x(s), height - bottom); ctx.stroke();
      ctx.fillText(s.toFixed(k % 2 ? 2 : 1), x(s), height - bottom + 18);
    }
    ctx.textAlign = "right";
    for (let k = 0; k <= 3; k++) {
      const v = low + (high - low) * k / 3; ctx.beginPath(); ctx.moveTo(left, y(v)); ctx.lineTo(width - right, y(v)); ctx.stroke();
      ctx.fillText(v.toFixed(2), left - 7, y(v) + 4);
    }
    ctx.strokeStyle = "#26343a"; ctx.lineWidth = 2.3; ctx.beginPath();
    values.forEach((v, k) => k === 0 ? ctx.moveTo(x(0), y(v)) : ctx.lineTo(x(k / 400), y(v))); ctx.stroke();
    ctx.strokeStyle = "#c35e29"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x(result.s), y(result.cost)); ctx.lineTo(x(result.s), height - bottom); ctx.stroke(); ctx.setLineDash([]);
    circle(ctx, x(result.s), y(result.cost), 5, colors.orange);
    ctx.textAlign = "left"; ctx.fillStyle = colors.muted; ctx.fillText("γₚ(S(s))", left, 13);
    ctx.textAlign = "right"; ctx.fillText("coupling parameter s", width - right, height - 2);
    $("cost-plot").setAttribute("aria-label", "Full spectral objective on the coupling interval. Minimum at s = " + result.s.toFixed(5) + ", with squared distance " + result.cost.toFixed(5) + ".");
  }

  function render() {
    // A lazy iframe can run its script before the browser assigns its width.
    // ResizeObserver redraws it once the panels have measurable dimensions.
    if (["coupling-plot", "covariance-plot", "cost-plot"].some(id => $(id).clientWidth < 80 || $(id).clientHeight < 60)) return;
    couplingPlot(); covariancePlot(); costPlot();
  }

  function update() {
    p = $("infinite").checked ? Infinity : Number($("exponent").value);
    time = Number($("time").value); result = M.optimize(p);
    $("exponent").disabled = p === Infinity;
    $("exponent-value").textContent = p === Infinity ? "∞" : p.toFixed(2);
    $("exponent").setAttribute("aria-valuetext", p === Infinity ? "Infinity, the largest eigenvalue" : p.toFixed(3));
    $("time-value").textContent = time.toFixed(2);
    $("regime").textContent = p < 1 ? "½ ≤ p < 1: nonconvex coupling cost. Concavity places a global minimum at one of the two endpoint matchings; small p favors an anisotropic displacement second moment." : p === 1 ? "p = 1: γ₁(S) = tr(S). This is ordinary quadratic optimal transport; the shorter matching is optimal." : "p > 1: the matrix gauge is convex. Splitting transport can reduce its largest directional cost, even though the total squared displacement increases.";
    $("s-value").textContent = result.s.toFixed(4);
    $("distance-value").textContent = result.distance.toFixed(4);
    $("eigenvalue-value").textContent = result.eigenvalues.map(x => x.toFixed(3)).join(", ");
    $("matrix-value").textContent = result.coupling.map(row => row.map(x => x.toFixed(3)).join("  ")).join("\n");
    const matching = result.s < 1e-8 ? "Cross matching" : result.s > 1 - 1e-8 ? "Direct matching" : "Split coupling";
    $("status").textContent = matching + "; p = " + (p === Infinity ? "∞" : p.toFixed(2)) + "; s = " + result.s.toFixed(5) + ". " + (p > 1 ? "Numerical convex optimality gap: " + result.gap.toExponential(1) + "." : "Both endpoints checked; concavity certifies the global minimum.");
    render(); notifyHeight();
  }

  ["exponent", "infinite", "time"].forEach(id => $(id).addEventListener("input", update));
  window.addEventListener("resize", () => { cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => { render(); notifyHeight(); }); });
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data && event.data.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(() => {
    cancelAnimationFrame(redraw);
    redraw = requestAnimationFrame(() => { render(); notifyHeight(); });
  }).observe(document.querySelector("main"));
  update();
})();
