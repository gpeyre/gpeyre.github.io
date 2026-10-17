(function () {
  "use strict";
  const M = window.SpectralTransport, $ = id => document.getElementById(id);
  const colors = { blue: "#246da0", orange: "#c35e29", green: "#007b72", muted: "#617078", grid: "#edf1f2" };
  let result, cloud, edges = [], visibleEdges = [], visibleMass = 0, time = .5, redraw, pending, revision = 0;
  let scaleCount = 0, covarianceLimit = 1;
  const query = new URLSearchParams(location.search);
  if (query.has("p")) {
    if (query.get("p") === "infinity") $("infinite").checked = true;
    else if (Number.isFinite(Number(query.get("p")))) $("exponent").value = Math.max(.5, Math.min(8, Number(query.get("p"))));
  }
  if (query.has("n") && Number.isFinite(Number(query.get("n")))) $("points").value = Math.max(12, Math.min(100, Math.round(Number(query.get("n")))));
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
    const scale = Math.min(width - 44, height - 42) / (2 * limit), cx = width / 2, cy = (height - 10) / 2;
    const x = value => cx + scale * value, y = value => cy - scale * value;
    const rawStep = limit / 2, power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = [1, 2, 5, 10].find(v => v * power >= rawStep) * power;
    ctx.strokeStyle = colors.grid; ctx.lineWidth = 1;
    for (let i = -Math.floor(limit / step); i <= Math.floor(limit / step); i++) {
      const z = i * step;
      ctx.beginPath(); ctx.moveTo(x(z), y(-limit)); ctx.lineTo(x(z), y(limit)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x(-limit), y(z)); ctx.lineTo(x(limit), y(z)); ctx.stroke();
    }
    ctx.strokeStyle = "#dce5e7";
    ctx.beginPath(); ctx.moveTo(x(-limit), y(0)); ctx.lineTo(x(limit), y(0)); ctx.moveTo(x(0), y(-limit)); ctx.lineTo(x(0), y(limit)); ctx.stroke();
    return { ...panel, x, y, scale };
  }

  function circle(ctx, x, y, radius, color, border = true) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    if (border) { ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineWidth = 1.1; ctx.stroke(); }
  }

  function couplingPlot() {
    let extent = 0;
    for (const point of [...cloud.source, ...cloud.target]) extent = Math.max(extent, Math.abs(point[0]), Math.abs(point[1]));
    const { ctx, x, y } = spatial($("coupling-plot"), Math.max(.5, extent * 1.13));
    const n = cloud.source.length, pointRadius = n < 30 ? 4.4 : n < 70 ? 3.6 : 3.1;
    // Draw large flows last, so small components cannot obscure the main routes.
    for (let k = visibleEdges.length - 1; k >= 0; k--) {
      const { i, j, mass } = visibleEdges[k], a = cloud.source[i], b = cloud.target[j], fraction = Math.min(1, n * mass);
      ctx.strokeStyle = "rgba(68,89,98," + (.045 + .25 * Math.sqrt(fraction)) + ")";
      ctx.lineWidth = .45 + 1.25 * Math.sqrt(fraction);
      ctx.beginPath(); ctx.moveTo(x(a[0]), y(a[1])); ctx.lineTo(x(b[0]), y(b[1])); ctx.stroke();
    }
    for (const { i, j, mass } of visibleEdges) {
      const a = cloud.source[i], b = cloud.target[j];
      circle(ctx, x((1 - time) * a[0] + time * b[0]), y((1 - time) * a[1] + time * b[1]),
        pointRadius * Math.sqrt(n * mass), "rgba(0,123,114,.8)", false);
    }
    [cloud.source, cloud.target].forEach((points, side) => points.forEach(point =>
      circle(ctx, x(point[0]), y(point[1]), pointRadius, side ? colors.orange : colors.blue)));
    $("coupling-plot").setAttribute("aria-label", n + " source points in blue and " + n + " target points in orange. " + visibleEdges.length + " transport edges carry " + (100 * visibleMass).toFixed(1) + " percent of the mass. Green particles show displacement interpolation at time " + time.toFixed(2) + ".");
    $("edge-caption").textContent = "Edge opacity and thickness indicate mass; green particle area is proportional to mass. " + visibleEdges.length + " edges shown (" + Math.min(100, 100 * visibleMass).toFixed(1) + "% of transported mass).";
  }

  function covariancePlot() {
    const [first, second] = result.eigenvalues, radius = Math.sqrt(Math.max(0, first));
    const { ctx, x, y, scale, width, height } = spatial($("covariance-plot"), covarianceLimit);
    const [xx, xy, yy] = result.q, angle = Math.atan2(2 * xy, xx - yy) / 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const gradient = ctx.createRadialGradient(x(0), y(0), 0, x(0), y(0), Math.max(1, scale * radius));
    gradient.addColorStop(0, "rgba(0,111,126,.19)"); gradient.addColorStop(1, "rgba(0,111,126,.04)");
    ctx.fillStyle = gradient; ctx.strokeStyle = "#006f7e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x(0), y(0), scale * radius, scale * Math.sqrt(Math.max(0, second)), -angle, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    [[radius * ca, radius * sa], [-Math.sqrt(Math.max(0, second)) * sa, Math.sqrt(Math.max(0, second)) * ca]].forEach((v, i) => {
      ctx.strokeStyle = i ? "#79aeb5" : "#006f7e"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x(-v[0]), y(-v[1])); ctx.lineTo(x(v[0]), y(v[1])); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.textAlign = "center"; ctx.fillStyle = colors.muted;
    ctx.fillText("λ₁ = " + first.toFixed(3) + "     λ₂ = " + second.toFixed(3), width / 2, height - 4);
    $("covariance-plot").setAttribute("aria-label", "Displacement second moment ellipse with eigenvalues " + first.toFixed(4) + " and " + second.toFixed(4) + ". Each plot has its own spatial scale.");
  }

  function render() {
    // A lazy iframe can execute before it has a measurable width.
    if (!result || ["coupling-plot", "covariance-plot"].some(id => $(id).clientWidth < 80 || $(id).clientHeight < 60)) return;
    couplingPlot(); covariancePlot();
  }

  function updateTime() {
    time = Number($("time").value); $("time-value").textContent = time.toFixed(2);
    render();
  }

  function scheduleSolve() {
    clearTimeout(pending);
    const ticket = ++revision, p = $("infinite").checked ? Infinity : Number($("exponent").value), n = Number($("points").value);
    $("exponent").disabled = p === Infinity;
    $("exponent-value").textContent = p === Infinity ? "∞" : p.toFixed(2);
    $("exponent").setAttribute("aria-valuetext", p === Infinity ? "Infinity, the largest eigenvalue" : p.toFixed(3));
    $("points-value").textContent = n;
    $("points").setAttribute("aria-valuetext", n + " points in each marginal");
    $("regime").textContent = p < 1 ? "½ ≤ p < 1: the coupling objective is nonconvex. The solver returns a local numerical candidate, with no guarantee of a global minimum; smaller p favors anisotropic displacement." : p === 1 ? "p = 1: γ₁(S) = tr(S). This is ordinary quadratic optimal transport between the two point clouds." : p === Infinity ? "p = ∞: minimize the largest directional displacement cost. A smooth numerical approximation is used, with its approximation error included in the reported gap." : "p > 1: the coupling objective is convex. The solver can split mass to balance the directional displacement costs; a numerical optimality gap is reported below.";
    $("status").dataset.state = "busy";
    $("status").textContent = "Computing transport between " + n + " source points and " + n + " target points…";
    document.querySelector(".top-plots").setAttribute("aria-busy", "true");
    notifyHeight();
    // Let the status paint, and do not solve every intermediate slider position.
    pending = setTimeout(() => {
      if (ticket !== revision) return;
      try {
        cloud = M.clouds(n); result = M.solve(cloud.source, cloud.target, p);
        if (scaleCount !== n) {
          // Trace OT supplies a common viewing scale, without rescaling across p.
          const reference = p === 1 ? result : M.solve(cloud.source, cloud.target, 1);
          covarianceLimit = Math.max(.25, 1.15 * Math.sqrt(M.gamma(reference.q, .5)));
          scaleCount = n;
        }
        edges = [];
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const mass = result.coupling[i][j];
          if (mass > 1e-8 / n) edges.push({ i, j, mass });
        }
        edges.sort((a, b) => b.mass - a.mass);
        visibleEdges = []; visibleMass = 0;
        for (const edge of edges) {
          if (visibleEdges.length >= 8 * n || visibleMass >= .995) break;
          visibleEdges.push(edge); visibleMass += edge.mass;
        }
        $("distance-value").textContent = result.distance.toFixed(4);
        $("cost-value").textContent = result.cost.toFixed(4);
        $("eigenvalue-value").textContent = result.eigenvalues.map(x => x.toFixed(3)).join(", ");
        $("support-value").textContent = String(edges.length);
        let status = n + " × " + n + " coupling; p = " + (p === Infinity ? "∞" : p.toFixed(2)) + ". ";
        if (p < 1) status += "Nonconvex local candidate — not a certified optimum.";
        else if (Number.isFinite(result.gap)) status += "Numerical cost-gap bound γₚ(Sπ) − min γₚ(S) ≤ " + (result.gap < .001 ? result.gap.toExponential(2) : result.gap.toFixed(4)) + (p === Infinity ? " (including smoothing error)." : ".");
        else status += "Numerical candidate; no optimality certificate available.";
        if (Number.isFinite(result.iterations)) status += " " + result.iterations + " solver iterations.";
        $("status").textContent = status;
        $("status").dataset.state = "ready";
        updateTime();
      } catch (error) {
        $("status").textContent = "The computation could not finish. Try fewer points. " + error.message;
        $("status").dataset.state = "error";
        console.error(error);
      }
      document.querySelector(".top-plots").setAttribute("aria-busy", "false");
      notifyHeight();
    }, 100);
  }

  ["exponent", "infinite", "points"].forEach(id => $(id).addEventListener("input", scheduleSolve));
  $("time").addEventListener("input", updateTime);
  window.addEventListener("resize", () => { cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => { render(); notifyHeight(); }); });
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data && event.data.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new ResizeObserver(() => {
    cancelAnimationFrame(redraw);
    redraw = requestAnimationFrame(() => { render(); notifyHeight(); });
  }).observe(document.querySelector("main"));
  updateTime(); scheduleSolve();
})();
