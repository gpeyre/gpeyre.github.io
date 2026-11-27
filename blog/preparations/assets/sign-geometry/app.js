(function () {
  "use strict";
  const topic = "sign-geometry";
  const core = window.SignGeometryCore, view = window.SignGeometryView;
  const $ = id => document.getElementById(id);
  const main = document.querySelector("main");
  const presets = Array.from(document.querySelectorAll("button[data-exponent]"));
  const exponent = $("exponent"), iteration = $("iteration"), baseline = $("show-euclidean");
  const stepSize = $("step-size"), stepConfig = core.stepMultipliers;
  const runIds = core.seeds.map((_, i) => i);
  const letter = i => String.fromCharCode(65 + i);
  const colors = view.runColors;
  const colorLabel = (node, i) => {
    node.style.setProperty("--run-color", colors[i]);
    node.textContent = letter(i);
    return node;
  };
  const keyLabels = runIds.map(i => {
    const button = colorLabel(document.createElement("button"), i);
    button.type = "button";
    button.dataset.start = String(i);
    button.setAttribute("aria-label", "Start " + letter(i));
    $("start-controls").append(button);
    const label = colorLabel(document.createElement("span"), i);
    $("start-key").append(label);
    return label;
  });
  const startButtons = Array.from(document.querySelectorAll("button[data-start]"));
  exponent.max = String(core.exponents.length - 1);
  iteration.max = String(core.horizon);
  stepSize.min = String(stepConfig.min);
  stepSize.max = String(stepConfig.max);
  stepSize.step = String(stepConfig.step);
  stepSize.defaultValue = String(stepConfig.default);
  let state = core.compute(core.exponents[Number(exponent.value)], Number(stepSize.value)), k = Number(iteration.value);
  let animationFrame = 0, focus = null, curves;

  function label(p) { return p === Infinity ? "∞" : String(p); }
  function method(p) {
    if (p === Infinity) return "Scaled sign descent";
    if (p === 1) return "Greedy coordinate descent";
    if (p === 2) return "Euclidean descent";
    return "Norm-steepest descent";
  }
  function format(value) {
    if (value === 0) return "0";
    return Math.abs(value) >= .001 ? Number(value.toPrecision(3)).toString() : value.toExponential(2);
  }
  const visibleRuns = () => focus === null ? runIds : [focus];
  const showReference = () => baseline.checked && state.p !== 2;

  function relativeLossCurve(trajectory, key) {
    const runs = visibleRuns();
    return Array.from({length: core.horizon + 1}, (_, n) => {
      let total = 0;
      for (const i of runs) {
        const path = trajectory.runs[i][key];
        total += path[n].loss / path[0].loss;
      }
      return total / runs.length;
    });
  }

  function updateText() {
    const {p, trajectories, multiplier, eta} = state, comparison = showReference();
    const [axis, rotated] = trajectories;
    curves = {
      aligned: relativeLossCurve(axis, "selected"),
      rotated: relativeLossCurve(rotated, "selected"),
      reference: comparison ? relativeLossCurve(axis, "euclidean") : null
    };
    $("exponent-value").textContent = label(p);
    exponent.setAttribute("aria-valuetext", "p = " + (p === Infinity ? "infinity" : p) + ", " + method(p));
    $("step-size-value").textContent = multiplier.toFixed(2) + "× · η = " + format(eta);
    stepSize.setAttribute("aria-valuetext", multiplier.toFixed(2) + " times default, step size " + format(eta));
    $("iteration-value").textContent = k + " / " + core.horizon;
    iteration.setAttribute("aria-valuetext", "Iteration " + k + " of " + core.horizon);
    presets.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.exponent) === p)));
    startButtons.forEach(button => button.setAttribute("aria-pressed",
      String(button.dataset.start === (focus === null ? "all" : String(focus)))));
    keyLabels.forEach((node, i) => { node.hidden = focus !== null && focus !== i; });
    $("shown-starts").textContent = focus === null ? "Starts" : "Start";
    baseline.disabled = p === 2;
    $("selected-key").textContent = method(p) + " (p = " + label(p) + ")";
    $("current-key").textContent = "Current iterate (k = " + k + ")";
    $("reference-key").hidden = !comparison;
    $("axis-loss-key").textContent = p === 2 ? "Euclidean · both" : "Aligned";
    $("rotated-loss-key").hidden = p === 2;
    $("reference-loss-key").hidden = !comparison;
    const lossName = focus === null ? "Mean relative loss" : "Relative loss for start " + letter(focus);
    $("loss-title").textContent = lossName + " by iteration";
    $("metrics").textContent = lossName + " at k = " + k + " — " +
      (p === 2 ? "both: " + format(curves.aligned[k]) :
        "aligned: " + format(curves.aligned[k]) + " · rotated: " + format(curves.rotated[k])) +
      (comparison ? " · Euclidean (both): " + format(curves.reference[k]) : "") + ".";
    [["axis-plot", axis, "Axis-aligned"], ["rotated-plot", rotated, "Rotated"]].forEach(([id, t, name]) => {
      const starts = focus === null ? "starting points A through E." : (() => {
        const x = t.runs[focus].selected[k];
        return "start " + letter(focus) + ". Current point (" + format(x.x) + ", " + format(x.y) + ").";
      })();
      $(id).setAttribute("aria-label", name + " quadratic: filled level sets and " + method(p) +
        " through iteration " + k + " from " + starts +
        (comparison ? " Euclidean reference paths are dashed." : ""));
    });
    $("loss-plot").setAttribute("aria-label", "Relative losses over all " + core.horizon + " iterations. " + $("metrics").textContent);
  }

  function reportHeight() {
    if (window.parent === window) return;
    const height = Math.ceil(main.getBoundingClientRect().height) + 2;
    window.parent.postMessage({type: "ot-experiment-size", topic, height}, location.protocol === "file:" ? "*" : location.origin);
  }
  function draw() {
    const [axis, rotated] = state.trajectories;
    const runs = visibleRuns(), comparison = showReference();
    view.contour($("axis-plot"), axis, k, runs, comparison);
    view.contour($("rotated-plot"), rotated, k, runs, comparison);
    view.loss($("loss-plot"), curves, state.p, k, comparison);
    reportHeight();
  }
  function scheduleDraw() {
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(draw);
  }
  function update() {
    const p = core.exponents[Number(exponent.value)];
    const multiplier = Number(stepSize.value);
    if (p !== state.p || multiplier !== state.multiplier) state = core.compute(p, multiplier);
    k = Number(iteration.value);
    updateText();
    scheduleDraw();
  }
  exponent.addEventListener("input", update);
  stepSize.addEventListener("input", update);
  iteration.addEventListener("input", update);
  baseline.addEventListener("change", update);
  startButtons.forEach(button => button.addEventListener("click", () => {
    focus = button.dataset.start === "all" ? null : Number(button.dataset.start);
    update();
  }));
  presets.forEach(button => button.addEventListener("click", () => {
    exponent.value = String(core.exponents.indexOf(Number(button.dataset.exponent)));
    update();
  }));
  window.addEventListener("resize", scheduleDraw);
  window.addEventListener("message", event => {
    if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") &&
        event.data?.type === "ot-experiment-measure") reportHeight();
  });
  if (window.ResizeObserver) new ResizeObserver(scheduleDraw).observe(main);
  window.SignGeometryApp = Object.freeze({
    getState: () => ({...state, iteration: k, focus, showReference: showReference()})
  });
  update();
})();
