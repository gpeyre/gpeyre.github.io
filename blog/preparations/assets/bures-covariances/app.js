(function () {
  "use strict";
  const M = window.BuresCovariances, V = window.BuresCovariancesView, $ = id => document.getElementById(id);
  const controls = { t: "time", aAngle: "a-angle", bAngle: "b-angle", aAspect: "a-aspect", bAspect: "b-aspect", bSize: "b-size" };
  const limits = { t: [0, 1], aAngle: [-90, 90], bAngle: [-90, 90], aAspect: [1, 25], bAspect: [1, 25], bSize: [.4, 1.8] };
  let parameters = { ...M.presets.noncommuting }, A, B, bound, dRoot, dBures, commutator, frame = 0;
  function notifyHeight() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "bures-covariances", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) + 2 }, location.protocol === "file:" ? "*" : location.origin);
  }
  function number(v) { return v.toFixed(4); }
  function matrix(C) { return "[" + C[0].toFixed(3) + ", " + C[1].toFixed(3) + "; " + C[2].toFixed(3) + ", " + C[3].toFixed(3) + "]"; }
  function renderPanel(kind) {
    const canvas = $(kind + "-plot"), width = canvas.clientWidth, height = canvas.clientHeight;
    if (width < 50 || height < 50) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    const result = V.drawPanel(ctx, width, height, { A, B, t: parameters.t, kind, extent: bound });
    $(kind + "-matrix").textContent = matrix(result.current);
    canvas.setAttribute("aria-label", (kind === "root" ? "Square-root Frobenius" : "Bures–Wasserstein") + " covariance ellipse at t " + parameters.t.toFixed(2) + ". Covariance " + matrix(result.current) + ". Equal axes from " + (-bound).toFixed(2) + " to " + bound.toFixed(2) + ". Arrow keys adjust time, Shift for larger steps, Home and End select endpoints.");
  }
  function render() { if (A) { renderPanel("root"); renderPanel("bures"); notifyHeight(); } }
  function update() {
    A = M.covariance(parameters.aAngle, parameters.aAspect, 1); B = M.covariance(parameters.bAngle, parameters.bAspect, parameters.bSize); bound = V.extent(A, B);
    dRoot = M.rootDistance(A, B); dBures = M.buresDistance(A, B); commutator = M.relativeCommutator(A, B);
    for (const [key, id] of Object.entries(controls)) {
      $(id).value = String(parameters[key]);
      const label = key === "t" ? parameters[key].toFixed(2) : key.endsWith("Angle") ? parameters[key].toFixed(0) + "°" : key.endsWith("Aspect") ? parameters[key].toFixed(1) + " : 1" : parameters[key].toFixed(2) + "×";
      $(id + "-value").textContent = label; $(id).setAttribute("aria-valuetext", label);
    }
    $("root-distance").textContent = number(dRoot); $("bures-distance").textContent = number(dBures);
    $("distance-ratio").textContent = dBures < 1e-13 ? "— (equal)" : (dRoot / dBures).toFixed(4);
    $("commutator").textContent = commutator < 1e-12 ? "0" : number(commutator);
    $("status").textContent = commutator < 1e-12 ? "The endpoints commute: the distances and both interpolation paths agree (up to rounding)." : "The endpoints do not commute: Bures can align their factors. dB ≤ droot ≤ √2 dB; the two interpolation paths generally differ.";
    for (const [name, preset] of Object.entries(M.presets)) $("preset-" + name).setAttribute("aria-pressed", Object.keys(preset).filter(key => key !== "t").every(key => Math.abs(parameters[key] - preset[key]) < 1e-10) ? "true" : "false");
    render();
  }
  for (const [key, id] of Object.entries(controls)) $(id).addEventListener("input", () => {
    const value = Number($(id).value), range = limits[key];
    if (Number.isFinite(value)) parameters[key] = Math.max(range[0], Math.min(range[1], value));
    update();
  });
  for (const [name, preset] of Object.entries(M.presets)) $("preset-" + name).addEventListener("click", () => { parameters = { ...preset }; update(); });
  for (const kind of ["root", "bures"]) $(kind + "-plot").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const step = event.shiftKey ? .1 : .01;
    parameters.t = event.key === "Home" ? 0 : event.key === "End" ? 1 : Math.max(0, Math.min(1, Math.round((parameters.t + (["ArrowLeft", "ArrowDown"].includes(event.key) ? -step : step)) * 100) / 100)); update();
  });
  function scheduleRender() { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); }
  window.addEventListener("resize", scheduleRender);
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight(); });
  if (window.ResizeObserver) new window.ResizeObserver(scheduleRender).observe(document.querySelector("main"));
  window.BuresCovariancesApp = { getState: () => ({ ...parameters, A: A.slice(), B: B.slice(), root: M.rootGeodesic(A, B, parameters.t), bures: M.buresGeodesic(A, B, parameters.t), extent: bound, rootDistance: dRoot, buresDistance: dBures, relativeCommutator: commutator, strictlyPositive: M.eigen(A).values[1] > 0 && M.eigen(B).values[1] > 0, playing: false }) };
  update();
})();
