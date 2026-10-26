(function () {
  "use strict";
  var core = window.DCDecomposition;
  var view = window.DCDecompositionView, colors = view.colors;
  var controls = ["amplitude", "phase", "lambda"].map(function (id) { return document.getElementById(id); });
  var points, model, pending = false;
  var number = view.number;
  function resizeParent() {
    if (window.parent !== window) window.parent.postMessage({
      type: "ot-experiment-size", topic: "dc-decomposition",
      height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) + 2
    }, location.protocol === "file:" ? "*" : location.origin);
  }
  function plot(id, series, showRoots) {
    view.draw(document.getElementById(id), points, model.roots, series, { showRoots: showRoots });
  }
  function render() {
    plot("target", [{ key: "phi", color: colors.phi }]);
    plot("pieces", [{ key: "F", color: colors.F }, { key: "G", color: colors.G }]);
    plot("curvature", [
      { key: "ddF", color: colors.F }, { key: "ddG", color: colors.G },
      { key: "ddphi", color: colors.phi, dashed: true, width: 1.8 }
    ], true);
    resizeParent();
  }
  function update() {
    var parameters = {};
    controls.forEach(function (control) { parameters[control.id] = Number(control.value); });
    model = core.build(parameters); points = [];
    var residual = 0;
    for (var i = 0; i <= 800; i++) {
      var point = model.evaluate(core.LEFT + (core.RIGHT - core.LEFT) * i / 800);
      residual = Math.max(residual, Math.abs(point.F - point.G - point.phi)); points.push(point);
    }
    document.getElementById("amplitude-value").textContent = parameters.amplitude.toFixed(2);
    document.getElementById("phase-value").textContent = number(parameters.phase / Math.PI) + "π";
    document.getElementById("lambda-value").textContent = parameters.lambda.toFixed(2);
    document.getElementById("convexity").textContent = parameters.amplitude * Math.PI * Math.PI <= 1 ? "Convex target" : "Nonconvex target";
    document.getElementById("identity").textContent = "Sampled identity residual |F − G − Φ|: " + residual.toExponential(1);
    document.getElementById("curvature-budget").textContent = "Integrated curvature F″ + G″: " + number(model.minimalCurvature + model.addedCurvature) +
      " = " + number(model.minimalCurvature) + " minimal + " + number(model.addedCurvature) + " common addition";
    document.querySelector("main").dataset.ready = "true";
    render();
  }
  function schedule() {
    if (pending) return;
    pending = true; requestAnimationFrame(function () { pending = false; update(); });
  }
  controls.forEach(function (control) { control.addEventListener("input", schedule); });
  document.getElementById("convex-case").addEventListener("click", function () { controls[0].value = "0.05"; controls[2].value = "0"; update(); });
  document.getElementById("reset").addEventListener("click", function () { controls[0].value = "0.35"; controls[1].value = "0"; controls[2].value = "0"; update(); });
  document.querySelector("details").addEventListener("toggle", resizeParent);
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || (event.origin !== location.origin && event.origin !== "null")) return;
    if (event.data && event.data.type === "ot-experiment-measure") resizeParent();
  });
  window.DCDecompositionApp = {
    getState: function () { return { parameters: model.parameters, roots: model.roots, points: points,
      minimalCurvature: model.minimalCurvature, addedCurvature: model.addedCurvature }; }
  };
  window.addEventListener("resize", render);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resizeParent).observe(document.querySelector("main"));
  update();
})();
