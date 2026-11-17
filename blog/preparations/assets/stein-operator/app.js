(function () {
  "use strict";
  const M = window.SteinOperator, V = window.SteinOperatorView, $ = id => document.getElementById(id);
  let theta = 1, selected = "cubic", current = M.state(theta, selected), frame = 0;
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
    paint($("function"), (ctx, w, h) => V.drawFunction(ctx, w, h, current));
    for (const row of current.rows) paint($("bar-" + row.key), (ctx, w, h) => V.drawResidualBar(ctx, w, h, row.residual));
    notifyHeight();
  }
  for (const test of M.tests) {
    const tr = document.createElement("tr"); tr.id = "row-" + test.key;
    const labelCell = document.createElement("td"), label = document.createElement("label"); label.className = "test-choice";
    const radio = document.createElement("input"); radio.type = "radio"; radio.name = "test-function"; radio.value = test.key; radio.id = "choose-" + test.key; radio.checked = test.key === selected;
    const text = document.createElement("span"); text.textContent = test.label; label.append(radio, text); labelCell.append(label); tr.append(labelCell);
    for (const field of ["expectation", "derivative", "xTimesF", "residual"]) { const cell = document.createElement("td"); cell.id = field + "-" + test.key; if (field === "residual") cell.className = "residual"; tr.append(cell); }
    const barCell = document.createElement("td"); barCell.className = "bar-cell";
    const canvas = document.createElement("canvas"); canvas.id = "bar-" + test.key; canvas.setAttribute("aria-hidden", "true"); barCell.append(canvas); tr.append(barCell);
    $("test-rows").append(tr);
    radio.addEventListener("change", () => { if (radio.checked) { selected = test.key; update(); } });
  }
  function update() {
    current = M.state(theta, selected); $("deformation").value = String(theta);
    $("deformation-value").textContent = theta.toFixed(2).replace("-", "−"); $("deformation").setAttribute("aria-valuetext", theta.toFixed(2) + (theta === 0 ? ", standard Gaussian" : ", Gaussian mixture"));
    $("function-label").textContent = M.tests.find(test => test.key === selected).label;
    for (const row of current.rows) {
      $("row-" + row.key).classList.toggle("selected", row.key === selected); $("choose-" + row.key).checked = row.key === selected;
      for (const field of ["expectation", "derivative", "xTimesF", "residual"]) $(field + "-" + row.key).textContent = format(row[field]);
      $("residual-" + row.key).className = "residual" + (Math.abs(row.residual) < .000005 ? "" : row.residual > 0 ? " positive" : " negative");
    }
    $("density").setAttribute("aria-label", "Mixture density at theta " + theta.toFixed(2) + " in teal, with dashed standard Gaussian. Both have mean zero and variance one.");
    const row = current.rows.find(item => item.key === selected);
    $("function").setAttribute("aria-label", "Test f(x) = " + row.label + " in blue; f prime minus x times f in rust. Its expectation under this mixture is " + format(row.residual) + ".");
    $("status").textContent = theta === 0 ? "At θ = 0 the mixture is exactly N(0, 1): all six Stein residuals vanish." : "The tests f = 1 and f = x stay at zero because the mean and variance are fixed. Higher-order and trigonometric tests detect the change in shape. Small residuals may round to zero in this table.";
    draw();
  }
  $("deformation").addEventListener("input", () => { const value = Number($("deformation").value); if (Number.isFinite(value)) { theta = Math.max(-1, Math.min(1, value)); update(); } });
  $("reset").addEventListener("click", () => { theta = 0; update(); });
  function resize() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }
  window.addEventListener("resize", resize);
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new window.ResizeObserver(resize).observe(document.querySelector("main"));
  for (const details of document.querySelectorAll("details")) details.addEventListener("toggle", notifyHeight);
  window.SteinOperatorApp = { getState: () => M.state(theta, selected) };
  update();
}());
