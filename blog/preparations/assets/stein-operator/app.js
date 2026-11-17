(function () {
  "use strict";
  const M = window.SteinOperator, V = window.SteinOperatorView, $ = id => document.getElementById(id);
  let theta = 1, position = -.4, current = M.state(theta, position), frame = 0;
  function format(value) { return Math.abs(value) < .000005 ? "0.00000" : value.toFixed(5).replace("-", "−"); }
  function notifyHeight() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "stein", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) + 2 }, location.protocol === "file:" ? "*" : location.origin);
  }
  function paint(canvas, draw) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr); draw(ctx, width, height);
  }
  function draw() {
    paint($("density"), (ctx, w, h) => V.drawDensity(ctx, w, h, current));
    paint($("residuals"), (ctx, w, h) => V.drawHistogram(ctx, w, h, current));
    notifyHeight();
  }
  for (const test of M.tests) {
    const tr = document.createElement("tr"); tr.id = "row-" + test.key;
    const label = document.createElement("th"); label.scope = "row"; label.textContent = test.label; tr.append(label);
    for (const field of ["expectation", "derivative", "xTimesF", "residual", "scale"]) { const cell = document.createElement("td"); cell.id = field + "-" + test.key; if (field === "residual") cell.className = "residual"; tr.append(cell); }
    $("test-rows").append(tr);
  }
  function update() {
    current = M.state(theta, position);
    for (const [id, value] of [["deformation", theta], ["position", position]]) {
      $(id).value = String(value); $(id + "-value").textContent = value.toFixed(2).replace("-", "−"); $(id).setAttribute("aria-valuetext", value.toFixed(2) + (id === "position" ? ", translation " + current.shift.toFixed(2) : ", component standard deviation " + current.sigma.toFixed(2)));
    }
    for (const row of current.rows) {
      for (const field of ["expectation", "derivative", "xTimesF", "residual"]) $(field + "-" + row.key).textContent = format(row[field]);
      $("scale-" + row.key).textContent = String(row.scale);
      $("residual-" + row.key).className = "residual" + (Math.abs(row.residual) < .000005 ? "" : row.residual > 0 ? " positive" : " negative");
    }
    $("density").setAttribute("aria-label", "Mixture density for shape " + theta.toFixed(2) + " and position " + position.toFixed(2) + ", with dashed standard Gaussian. Mean " + current.mean.toFixed(2) + ", variance " + current.totalVariance.toFixed(2) + ".");
    $("residuals").setAttribute("aria-label", "Signed Gaussian Stein residuals; zero at the center. " + current.rows.map(row => "Test " + row.label + ": raw value " + format(row.residual) + ", divided by " + row.scale).join(". "));
    $("moments").textContent = "Mean = " + current.mean.toFixed(2).replace("-", "−") + " · variance = " + current.totalVariance.toFixed(2) + " · component width σ = " + current.sigma.toFixed(2);
    $("status").textContent = theta === 0 && position === 0 ? "Both controls are zero: the density is exactly N(0, 1), and every Stein residual vanishes." : theta === 0 ? "The components coincide into a single translated Gaussian. It is not the reference N(0, 1), so its Stein residuals need not vanish." : "The shape control separates and narrows the bumps. The position control moves all of them together. These changes affect the mean, variance, and higher-order tests.";
    draw();
  }
  for (const id of ["deformation", "position"]) $(id).addEventListener("input", () => {
    const value = Number($(id).value); if (!Number.isFinite(value)) return;
    if (id === "deformation") theta = Math.max(-1, Math.min(1, value)); else position = Math.max(-1, Math.min(1, value)); update();
  });
  $("reset").addEventListener("click", () => { theta = 0; position = 0; update(); });
  function resize() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }
  window.addEventListener("resize", resize);
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new window.ResizeObserver(resize).observe(document.querySelector("main"));
  for (const details of document.querySelectorAll("details")) details.addEventListener("toggle", notifyHeight);
  window.SteinOperatorApp = { getState: () => M.state(theta, position) };
  update();
}());
