(function () {
  "use strict";
  const F = window.ResnetFlow, $ = id => document.getElementById(id);
  const canvas = $("flow-canvas"), context = canvas.getContext("2d");
  const fields = ["alpha", "omega", "shear", "strain", "speed"];
  const horizon = 2, step = 1 / 120;
  let params, samples, seeds, extent = 3, time = +$("flow-time").value;
  let running = false, frame = null, previousStamp = null, pendingRender = null;
  const format = value => Math.abs(value) < 0.0005 ? "0.000" : value.toFixed(3);
  const scientific = value => value === 0 ? "0" : value.toExponential(2).replace("e-", " × 10^−").replace("e+", " × 10^");
  function measure() {
    if (window.parent !== window) window.parent.postMessage({type: "ot-experiment-size", topic: "resnet-flow", height: Math.ceil($("flow-lab").getBoundingClientRect().height)}, location.protocol === "file:" ? "*" : location.origin);
  }
  function writeMatrix(id, matrix) {
    const node = $(id);
    if (!node.children.length) for (let i = 0; i < 4; i++) node.appendChild(document.createElement("span"));
    matrix.forEach((v, i) => { node.children[i].textContent = format(v); });
    node.setAttribute("aria-label", matrix.map(format).join(", "));
  }
  function changeScheduleText() {
    const titles = {constant: "A fixed generator", strain: "A rotating strain field", shears: "First one shear, then the other"};
    $("flow-schedule-title").textContent = titles[params.mode];
    if (params.mode === "constant") {
      $("flow-formula").textContent = "A = αI + ωJ + κH,     Φ(t) = exp(tA)";
      $("flow-description").textContent = "A is fixed: the fundamental matrix is exactly its exponential. Set κ = 0 to isolate growth and rotation, or set α = ω = 0 for a pure shear. The teal and amber ellipses coincide.";
    } else if (params.mode === "strain") {
      $("flow-formula").textContent = "A(t) = αI + ωJ + σR(νt)DR(−νt)";
      $("flow-description").textContent = "The instantaneous stretching axes turn in time. The matrices at different times generally do not commute, so the order of the small transformations matters. Set ν = 0 to recover a constant matrix, or σ = 0 to remove the strain.";
    } else {
      const first = params.reverse ? "V" : "H", second = params.reverse ? "H" : "V";
      $("flow-formula").textContent = "A = αI + κ" + first + " for 0 ≤ t < 1, then αI + κ" + second + ";     Φ(2) = e²ᵅ(I + κ" + second + ")(I + κ" + first + ")";
      $("flow-description").textContent = "Both schedules spend one unit of time in each shear and have the same integral at t = 2. Reversing them changes Φ(2), because HV ≠ VH. Read the product from right to left: the first shear acts first. Set time to 2, then reverse the order.";
    }
    document.querySelectorAll("[data-modes]").forEach(node => { node.hidden = !node.dataset.modes.split(" ").includes(params.mode); });
    $("flow-accuracy-title").textContent = params.mode === "strain" ? "RK4 step-halving difference" : "Solution method";
    $("flow-method").textContent = params.mode === "strain"
      ? "Smooth flow: fourth-order Runge–Kutta (RK4), maximum step Δt = 1/120. The displayed step-halving difference is ‖ΦΔt − ΦΔt/2‖F; it is a convergence diagnostic, not a rigorous error bound. Trajectories are sampled every 1/120 time unit."
      : params.mode === "shears"
        ? "Piecewise flow: exact ordered products of shear exponentials; the switch at t = 1 is handled exactly. Since H² = V² = 0, exp(sκH) = I + sκH and likewise for V. Trajectories are sampled every 1/120 time unit."
        : "Constant flow: an analytic 2 × 2 matrix exponential, including repeated-eigenvalue and pure-rotation cases. Trajectories are sampled every 1/120 time unit; the displayed map is evaluated directly at the selected time.";
  }
  function rebuild() {
    params = {mode: $("flow-mode").value, horizon, reverse: $("flow-reverse").checked};
    fields.forEach(key => {
      params[key] = +$("flow-" + key).value;
      $("flow-" + key + "-value").value = params[key].toFixed(2);
    });
    seeds = F.seedPoints($("flow-seeds").value);
    samples = F.history(params, 240);
    let bound = 1.25;
    samples.forEach((sample, index) => {
      seeds.forEach(seed => { const p = F.apply(sample.matrix, seed); bound = Math.max(bound, Math.abs(p[0]), Math.abs(p[1])); });
      if (index % 6 === 0) {
        // Row norms are the exact coordinate extrema of a transformed unit circle.
        const a = sample.matrix, b = F.expm2(F.integralMatrix(sample.time, params));
        bound = Math.max(bound, Math.hypot(a[0], a[1]), Math.hypot(a[2], a[3]), Math.hypot(b[0], b[1]), Math.hypot(b[2], b[3]));
      }
    });
    extent = bound * 1.13;
    changeScheduleText();
    render();
    measure();
  }
  function draw(diagnostic) {
    const rect = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const pad = 34, side = Math.max(10, Math.min(width, height) - 2 * pad);
    const cx = width / 2, cy = height / 2, factor = side / (2 * extent);
    const point = p => [cx + factor * p[0], cy - factor * p[1]];
    const move = p => { const q = point(p); context.moveTo(q[0], q[1]); };
    const line = p => { const q = point(p); context.lineTo(q[0], q[1]); };
    const circle = (m, color, dash, lineWidth) => {
      context.beginPath(); context.setLineDash(dash); context.strokeStyle = color; context.lineWidth = lineWidth;
      for (let i = 0; i <= 180; i++) {
        const angle = 2 * Math.PI * i / 180, p = F.apply(m, [Math.cos(angle), Math.sin(angle)]);
        if (i === 0) move(p); else line(p);
      }
      context.stroke(); context.setLineDash([]);
    };
    const rawTick = extent / 2.7, magnitude = 10 ** Math.floor(Math.log10(rawTick));
    const tick = [1, 2, 2.5, 5, 10].find(n => n * magnitude >= rawTick) * magnitude;
    context.font = "10px system-ui,sans-serif"; context.fillStyle = "#82939d";
    for (let v = -Math.floor(extent / tick) * tick; v <= extent + tick * 1e-8; v += tick) {
      if (Math.abs(v) < tick * 1e-7) v = 0;
      context.strokeStyle = v === 0 ? "#c0cfd6" : "#edf1f3"; context.lineWidth = 1;
      context.beginPath(); move([v, -extent]); line([v, extent]); move([-extent, v]); line([extent, v]); context.stroke();
      const label = +v.toFixed(3);
      context.textAlign = "center"; context.fillText(label, point([v, 0])[0], cy + side / 2 + 17);
      if (v !== 0) { context.textAlign = "right"; context.fillText(label, cx - side / 2 - 8, point([0, v])[1] + 3); }
    }
    context.fillStyle = "#687986"; context.textAlign = "left"; context.fillText("x₁", cx + side / 2 + 8, cy + 3);
    context.textAlign = "center"; context.fillText("x₂", cx, cy - side / 2 - 12);
    context.save(); context.beginPath(); context.rect(cx - side / 2, cy - side / 2, side, side); context.clip();
    circle(F.I, "#a9b7c1", [3, 4], 1.2);
    seeds.forEach((seed, index) => {
      const color = "hsl(" + (185 + index / Math.max(1, seeds.length - 1) * 65) + " 48% 46%)";
      context.beginPath(); context.lineWidth = 1.15; context.strokeStyle = color; context.globalAlpha = 0.52;
      move(seed);
      for (const sample of samples) {
        if (sample.time > time + 1e-12) break;
        line(F.apply(sample.matrix, seed));
      }
      line(F.apply(diagnostic.phi, seed)); context.stroke();
      context.globalAlpha = 1;
      const initial = point(seed); context.beginPath(); context.arc(initial[0], initial[1], 2, 0, 2 * Math.PI); context.fillStyle = "#b6c5cc"; context.fill();
      const endpoint = point(F.apply(diagnostic.phi, seed)); context.beginPath(); context.arc(endpoint[0], endpoint[1], 3.2, 0, 2 * Math.PI); context.fillStyle = color; context.fill();
    });
    circle(diagnostic.phi, "#087f89", [], 2.25);
    if ($("flow-naive").checked) circle(diagnostic.naive, "#b87820", [6, 5], 1.8);
    context.restore();
    $("flow-scale-note").textContent = "Equal axis scales, ±" + extent.toFixed(2) + "; fixed over 0 ≤ t ≤ 2 for these controls.";
  }
  function render() {
    const diagnostic = F.diagnostics(time, params, step);
    $("flow-time").value = time;
    $("flow-time-value").value = time.toFixed(2) + " / 2";
    $("flow-time-label").textContent = "t = " + time.toFixed(2);
    writeMatrix("flow-matrix-a", F.matrixAt(time, params));
    writeMatrix("flow-matrix-phi", diagnostic.phi);
    $("flow-determinant").textContent = diagnostic.determinant.toFixed(4);
    $("flow-liouville").textContent = diagnostic.liouville.toFixed(4);
    $("flow-gap").textContent = (100 * diagnostic.relativeNaiveGap).toFixed(2) + "%";
    $("flow-accuracy").textContent = params.mode === "strain" ? scientific(diagnostic.convergence) : "Analytic (exact formula)";
    $("flow-naive-key").hidden = !$("flow-naive").checked;
    canvas.setAttribute("aria-label", "Linear flow at time " + time.toFixed(2) + ". The area multiplier is " + diagnostic.determinant.toFixed(4) + ". Relative matrix gap to the exponential of the integral: " + (100 * diagnostic.relativeNaiveGap).toFixed(2) + " percent. All axes have equal scales.");
    draw(diagnostic);
  }
  function pause(status) {
    running = false; previousStamp = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    $("flow-play").textContent = time >= horizon ? "Replay" : "Play";
    $("flow-play").setAttribute("aria-pressed", "false");
    $("flow-status").textContent = status || "Paused";
  }
  function animate(stamp) {
    if (!running) return;
    if (previousStamp !== null) time = Math.min(horizon, time + Math.min((stamp - previousStamp) / 1000, 0.08) * horizon / 7);
    previousStamp = stamp;
    render();
    if (time >= horizon) pause("Complete");
    else frame = requestAnimationFrame(animate);
  }
  $("flow-play").addEventListener("click", function () {
    if (running) { pause(); return; }
    if (time >= horizon) time = 0;
    running = true; previousStamp = null;
    $("flow-play").textContent = "Pause"; $("flow-play").setAttribute("aria-pressed", "true"); $("flow-status").textContent = "Playing";
    frame = requestAnimationFrame(animate);
  });
  $("flow-reset").addEventListener("click", function () { pause(); time = 0; render(); $("flow-play").textContent = "Play"; });
  $("flow-time").addEventListener("input", function () { pause(); time = +this.value; render(); $("flow-play").textContent = time >= horizon ? "Replay" : "Play"; });
  fields.forEach(key => $("flow-" + key).addEventListener("input", function () { pause(); rebuild(); }));
  ["flow-mode", "flow-seeds", "flow-reverse"].forEach(id => $(id).addEventListener("change", function () { pause(); rebuild(); }));
  $("flow-naive").addEventListener("change", render);
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });
  window.addEventListener("pagehide", function () { pause(); });
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || (event.origin !== location.origin && event.origin !== "null")) return;
    if (event.data && event.data.type === "ot-experiment-measure") measure();
  });
  window.addEventListener("resize", function () {
    if (pendingRender !== null) cancelAnimationFrame(pendingRender);
    pendingRender = requestAnimationFrame(function () { pendingRender = null; render(); measure(); });
  });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(measure).observe($("flow-lab"));
  if (typeof IntersectionObserver !== "undefined") new IntersectionObserver(function (entries) { if (!entries[0].isIntersecting) pause(); }).observe($("flow-lab"));
  rebuild();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
