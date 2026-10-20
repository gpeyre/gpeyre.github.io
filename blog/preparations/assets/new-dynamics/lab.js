(function () {
  "use strict";
  const D = window.NewDynamics, topic = new URLSearchParams(location.search).get("topic") || "langevin";
  const $ = id => document.getElementById(id);
  let running = false, animation = null, frameTime = 0, tick, reset, draw, state, measureTimer;
  const canvases = [];
  function measure() {
    // Measure content, not documentElement.scrollHeight: the latter includes the
    // iframe viewport and feeds its old height back, preventing later shrinking.
    const height = Math.ceil($("lab").getBoundingClientRect().height) + 8;
    parent.postMessage({type: "ot-experiment-size", topic, height}, location.protocol === "file:" ? "*" : location.origin);
  }
  function changedSize() { clearTimeout(measureTimer); measureTimer = setTimeout(measure, 50); }
  window.addEventListener("message", event => { if (event.source === parent && event.data?.type === "ot-experiment-measure") measure(); });
  function slider(id, label, min, max, step, value, format, callback) {
    const wrapper = document.createElement("label"); wrapper.htmlFor = id;
    wrapper.append(document.createTextNode(label + " "));
    const output = document.createElement("output"); output.htmlFor = id; output.id = id + "-value";
    const input = document.createElement("input"); Object.assign(input, {type: "range", id, min, max, step, value});
    function update() { output.textContent = format(Number(input.value)); input.setAttribute("aria-valuetext", output.textContent); }
    input.addEventListener("input", () => { update(); callback(Number(input.value)); }); update();
    wrapper.append(output, input); $("controls").append(wrapper); return input;
  }
  function checkbox(id, label, value, callback) {
    const wrapper = document.createElement("label"); wrapper.className = "check";
    const input = document.createElement("input"); Object.assign(input, {type: "checkbox", id, checked: value});
    input.addEventListener("change", () => callback(input.checked)); wrapper.append(input, document.createTextNode(label)); $("controls").append(wrapper); return input;
  }
  function panel(title, className, caption) {
    const box = document.createElement("section"); box.className = "panel";
    const h = document.createElement("h3"); h.textContent = title;
    const canvas = document.createElement("canvas"); canvas.className = className || ""; canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", title + ". " + caption);
    canvas.textContent = title + ". " + caption;
    const text = document.createElement("p"); text.textContent = caption;
    box.append(h, canvas, text); $("plots").append(box); canvases.push(canvas); return canvas;
  }
  function context(canvas) {
    const rect = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    }
    const ctx = canvas.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
    return {ctx, width: rect.width, height: rect.height};
  }
  function arrow(ctx, x, y, dx, dy, color, opacity = 1) {
    const norm = Math.hypot(dx, dy); if (norm < 1e-8) return;
    ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    const angle = Math.atan2(dy, dx), size = Math.min(4, norm * 0.35);
    ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx - size * Math.cos(angle - 0.5), y + dy - size * Math.sin(angle - 0.5));
    ctx.lineTo(x + dx - size * Math.cos(angle + 0.5), y + dy - size * Math.sin(angle + 0.5)); ctx.fill(); ctx.restore();
  }
  const densityColor = t => { t = Math.max(0, Math.min(1, t)); return [Math.round(247 - 230 * t), Math.round(251 - 112 * t), Math.round(251 - 98 * t)]; };
  const speedColor = t => { t = Math.max(0, Math.min(1, t)); return [Math.round(251 - 26 * t), Math.round(249 - 134 * t), Math.round(239 - 187 * t)]; };
  function heatmap(ctx, width, height, values, n, scale, color) {
    const small = document.createElement("canvas"); small.width = small.height = n;
    const s = small.getContext("2d"), image = s.createImageData(n, n);
    for (let j = 0; j < n * n; j++) {
      const c = color(values[j] / scale), q = ((n - 1 - Math.floor(j / n)) * n + j % n) * 4;
      image.data[q] = c[0]; image.data[q + 1] = c[1]; image.data[q + 2] = c[2]; image.data[q + 3] = 255;
    }
    s.putImageData(image, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(small, 0, 0, width, height);
  }
  function metrics(values) {
    $("metrics").replaceChildren();
    for (const [label, value] of values) {
      const div = document.createElement("div"); div.className = "metric";
      const strong = document.createElement("strong"); strong.textContent = value; div.append(strong, document.createTextNode(label)); $("metrics").append(div);
    }
  }
  function pause(message) {
    running = false; if (animation !== null) cancelAnimationFrame(animation); animation = null;
    $("play").textContent = "Play"; $("play").setAttribute("aria-pressed", "false");
    if (message) $("status").textContent = message;
  }
  function loop(now) {
    if (!running) return;
    if (now - frameTime >= 35) { frameTime = now; tick(); draw(); }
    if (running) animation = requestAnimationFrame(loop);
  }
  function restart() { pause("Paused. Parameters changed; the deterministic initial state was restored."); reset(); draw(); }
  $("play").addEventListener("click", () => {
    if (running) pause("Paused.");
    else { running = true; $("play").textContent = "Pause"; $("play").setAttribute("aria-pressed", "true"); $("status").textContent = "Running. Playback also stops when this tab is hidden."; frameTime = 0; animation = requestAnimationFrame(loop); }
  });
  $("step").addEventListener("click", () => { pause("Paused after one numerical step."); tick(); draw(); });
  $("reset").addEventListener("click", () => { pause("Paused. Initial state restored."); reset(); draw(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause("Paused because this tab was hidden."); });
  window.addEventListener("pagehide", () => pause());
  if (topic === "langevin") {
    $("title").textContent = "A stationary cloud can circulate";
    $("intro").textContent = "Follow 180 particles from a square on the left towards a Gaussian centered at (2, 0). Circulation changes the motion, while noise changes the equilibrium cloud itself.";
    let circulation = 1.4, epsilon = 0.55; const h = 0.025, count = 180;
    slider("circulation", "Circulation a", -3, 3, 0.05, circulation, x => x.toFixed(2), x => { circulation = x; restart(); });
    slider("noise", "Noise ε", 0, 1.6, 0.025, epsilon, x => x.toFixed(3), x => { epsilon = x; restart(); });
    const time = slider("time", "Time t", 0, 8, h, 0, x => x.toFixed(2), x => {
      pause("Paused at the selected time; replay uses the same random stream."); reset(false);
      for (let k = 0; k < Math.round(x / h); k++) advance(); draw();
    });
    $("plots").classList.add("one");
    const canvas = panel("Exact Ornstein–Uhlenbeck transitions", "wide", "Gray arrows: deterministic drift direction, with capped lengths. Dashed ellipse: two stationary standard deviations. Trails connect sampled positions; they do not resolve Brownian paths between them.");
    function advance() {
      state.particles = state.particles.map(p => D.ouStep(p, state.parameters, state.rng));
      state.trails.push(state.particles); if (state.trails.length > 19) state.trails.shift(); state.steps++;
    }
    reset = function (update = true) {
      const rng = D.random(12093), particles = Array.from({length: count}, () => [-4 + 2 * rng(), -1 + 2 * rng()]);
      state = {rng, particles, trails: [particles], steps: 0, parameters: D.ouParameters(circulation, epsilon, h)};
      if (update) { time.value = 0; $("time-value").textContent = "0.00"; }
    };
    tick = () => { if (state.steps * h >= 8) { pause("End of the displayed time interval. Reset to replay."); return; } advance(); };
    draw = function () {
      const {ctx, width: w, height: ht} = context(canvas);
      if (w < 40 || ht < 36) return; // A lazy iframe can initialize before layout.
      const scale = Math.min((w - 40) / 10.5, (ht - 36) / 6.1), ox = w / 2 + 0.35 * scale, oy = ht / 2;
      const px = x => ox + scale * x, py = y => oy - scale * y;
      ctx.save(); ctx.beginPath(); ctx.rect(1, 1, w - 2, ht - 2); ctx.clip();
      ctx.strokeStyle = "#edf1f2"; ctx.lineWidth = 1;
      for (let x = -5; x <= 5; x++) { ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), ht); ctx.stroke(); }
      for (let y = -3; y <= 3; y++) { ctx.beginPath(); ctx.moveTo(0, py(y)); ctx.lineTo(w, py(y)); ctx.stroke(); }
      const A = state.parameters.A;
      for (let x = -4.5; x <= 4.5; x += 0.65) for (let y = -2.5; y <= 2.5; y += 0.65) {
        const dx = -A[0] * (x - 2) - A[1] * y, dy = -A[2] * (x - 2) - A[3] * y;
        const norm = Math.hypot(dx, dy), factor = scale * 0.31 / Math.max(2, norm);
        arrow(ctx, px(x), py(y), dx * factor, -dy * factor, "#a6b3b8", 0.6);
      }
      if (epsilon > 0) {
        ctx.fillStyle = "#e6f2f170"; ctx.strokeStyle = "#007986"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.ellipse(px(2), py(0), 2 * Math.sqrt(epsilon) * scale, Math.sqrt(epsilon) * scale, 0, 0, D.TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.strokeStyle = "#b77541"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.strokeRect(px(-4), py(1), 2 * scale, 2 * scale); ctx.setLineDash([]);
      for (let i = 0; i < count; i++) {
        ctx.beginPath(); state.trails.forEach((cloud, j) => { const p = cloud[i]; if (!j) ctx.moveTo(px(p[0]), py(p[1])); else ctx.lineTo(px(p[0]), py(p[1])); });
        ctx.strokeStyle = "#00798624"; ctx.lineWidth = 0.8; ctx.stroke();
        const p = state.particles[i]; ctx.fillStyle = "#006f7cc4"; ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 1.9, 0, D.TAU); ctx.fill();
      }
      ctx.fillStyle = "#263d44"; ctx.beginPath(); ctx.arc(px(2), py(0), 3, 0, D.TAU); ctx.fill();
      ctx.font = "12px system-ui"; ctx.fillStyle = "#64767b"; ctx.fillText("initial square", Math.max(8, px(-4)), Math.max(17, py(1) - 10)); ctx.fillText("target", px(2) + 8, py(0) - 9); ctx.restore();
      const mean = [0, 0]; for (const p of state.particles) { mean[0] += p[0] / count; mean[1] += p[1] / count; }
      const covariance = [0, 0, 0]; for (const p of state.particles) { covariance[0] += (p[0] - mean[0]) ** 2 / count; covariance[1] += (p[0] - mean[0]) * (p[1] - mean[1]) / count; covariance[2] += (p[1] - mean[1]) ** 2 / count; }
      const err = Math.sqrt((covariance[0] - epsilon) ** 2 + 2 * covariance[1] ** 2 + (covariance[2] - epsilon / 4) ** 2);
      metrics([["distance of empirical mean to target", Math.hypot(mean[0] - 2, mean[1]).toFixed(3)], ["empirical covariance error (Frobenius)", err.toFixed(3)], ["stationary covariance diagonal", `${epsilon.toFixed(3)}, ${(epsilon / 4).toFixed(3)}`]]);
      time.value = state.steps * h; $("time-value").textContent = (state.steps * h).toFixed(2); $("clock").textContent = `t = ${(state.steps * h).toFixed(2)} · 180 particles`;
    };
    $("method").textContent = "Exact linear transitions with h = 0.025, not Euler–Maruyama. Every reset restores the same uniform square and random stream. Finite-sample mean/covariance errors need not decrease monotonically and do not vanish at equilibrium. The initial uniform law is not Gaussian at finite time. At ε = 0, the target is a point.";
  } else if (topic === "moser") {
    $("title").textContent = "Choose the densities; recover the trajectories";
    $("intro").textContent = "A fixed flux transports one periodic three-bump density into another. The prescribed density changes linearly; individual particle paths usually do not. Lower the positive background to see the velocity rise in nearly empty regions.";
    let background = 0.14; const count = 420, h = 1 / 240;
    slider("background", "Uniform background", 0.025, 0.5, 0.005, background, x => `${(100 * x).toFixed(1)}%`, x => { background = x; restart(); });
    // Integer mass-time ticks avoid HTML's decimal step rounding, which would
    // otherwise prevent the range input from reaching the exact endpoint t=1.
    const time = slider("time", "Interpolation t", 0, 240, 1, 0, x => (x / 240).toFixed(3), index => {
      pause("Paused at the selected time. The flow is recomputed from its initial sample."); reset(false);
      for (let k = 0; k < index; k++) advance(); draw();
    });
    const densityCanvas = panel("Prescribed density and moving particles", "", "Darker teal means higher density (fixed scale 0–12). Dots follow the numerical flow. Opposite edges are identified; a particle may wrap around the square.");
    const speedCanvas = panel("Speed and flux direction", "", "Amber intensity shows speed with a fixed scale 0–2.5. Arrow directions show vₜ; their lengths are capped. The actual maximum speed is reported below.");
    function advance() {
      const t = state.steps * h;
      state.particles = state.particles.map(p => D.moserStep(state.setup, p, t, h)); state.steps++;
    }
    reset = function (update = true) {
      const setup = D.moserSetup(background);
      state = {setup, particles: D.moserParticles(background, count), steps: 0};
      if (update) { time.value = 0; $("time-value").textContent = "0.000"; }
    };
    tick = () => { if (state.steps >= 240) { pause("Endpoint reached. The target density is now prescribed; reset to replay."); return; } advance(); };
    draw = function () {
      const t = state.steps * h, s = state.setup, values = Float64Array.from(s.rho0, (r, j) => (1 - t) * r + t * s.rho1[j]);
      const speeds = Float64Array.from(values, (r, j) => Math.hypot(s.jx[j], s.jy[j]) / r);
      const a = context(densityCanvas); heatmap(a.ctx, a.width, a.height, values, s.n, 12, densityColor);
      a.ctx.fillStyle = "#183c45b5";
      for (const p of state.particles) { a.ctx.beginPath(); a.ctx.arc(p[0] * a.width, (1 - p[1]) * a.height, 1.6, 0, D.TAU); a.ctx.fill(); }
      const b = context(speedCanvas); heatmap(b.ctx, b.width, b.height, speeds, s.n, 2.5, speedColor);
      for (let y = 0.06; y < 1; y += 0.105) for (let x = 0.06; x < 1; x += 0.105) {
        const v = D.moserVelocity(s, x, y, t), norm = Math.hypot(...v), factor = 0.055 * b.width / Math.max(0.15, norm);
        arrow(b.ctx, x * b.width, (1 - y) * b.height, v[0] * factor, -v[1] * factor, "#71582c", 0.8);
      }
      const mass = values.reduce((sum, x) => sum + x, 0) / values.length;
      metrics([["periodic grid mass", mass.toFixed(12)], ["maximum grid speed", Math.max(...speeds).toFixed(3)], ["positive density lower bound", background.toFixed(3)]]);
      time.value = state.steps; $("time-value").textContent = t.toFixed(3); time.setAttribute("aria-valuetext", `t = ${t.toFixed(3)}`); $("clock").textContent = `t = ${t.toFixed(3)} · 420 tracked particles`;
    };
    $("method").textContent = "A 63 × 63 odd periodic grid, one mixed-radix Fourier Poisson solve for sampled wrapped-Gaussian densities, bilinear flux/density interpolation, and fourth-order Runge–Kutta particle steps h = 1/240. The grid continuity equation is solved to roundoff; particle transport additionally has spatial/ODE discretization and sampling error. Colors saturate at their stated fixed scales. This is a Moser interpolation, not an optimal-transport geodesic.";
  } else if (topic === "fluids") {
    $("title").textContent = "Stir, diffuse, project";
    $("intro").textContent = "Drag on the dye panel to inject dye and push the fluid. Play to let it evolve, or take one step at a time. The neighboring panel exposes vorticity and the velocity field rather than hiding the incompressibility constraint.";
    let viscosity = 0.0008, diffusivity = 0.00015, h = 0.035, radius = 0.042, force = 1, project = true, steps = 0;
    slider("viscosity", "Viscosity ν", 0, 0.006, 0.0001, viscosity, x => x.toFixed(4), x => { viscosity = x; });
    slider("diffusivity", "Dye diffusion κ", 0, 0.002, 0.00005, diffusivity, x => x.toFixed(5), x => { diffusivity = x; });
    slider("time-step", "Time step h", 0.005, 0.12, 0.005, h, x => x.toFixed(3), x => { h = x; });
    slider("radius", "Brush radius", 0.02, 0.12, 0.002, radius, x => x.toFixed(3), x => { radius = x; draw(); });
    slider("force", "Stirring strength", 0, 3, 0.05, force, x => x.toFixed(2) + "×", x => { force = x; });
    checkbox("project", "Incompressibility projection", project, x => { project = x; draw(); });
    const dyeCanvas = panel("Dye: drag to paint and stir", "fluid", "Teal dye is a passive scalar. Pointer input adds a positive periodic bump and a localized velocity impulse. While paused, use One step to project the edited velocity.");
    dyeCanvas.tabIndex = 0; dyeCanvas.setAttribute("role", "application"); dyeCanvas.setAttribute("aria-label", "Fluid stirring canvas. Arrow keys move the source, Enter adds dye, and Shift plus an arrow adds dye and a force in that direction. Use Play or One step to evolve.");
    const velocityCanvas = panel("Vorticity and velocity", "fluid", "Amber/blue show opposite signs of spectral vorticity, with saturation at ±8. Gray arrows show the current velocity. Both panels are the same periodic domain.");
    let marker = [0.5, 0.5], pointer = null;
    function paint(x, y, dx = 0, dy = 0, amount = 0.25) {
      return D.inject(state, x, y, force * dx, force * dy, amount, radius);
    }
    function position(event) { const r = dyeCanvas.getBoundingClientRect(); return [D.mod((event.clientX - r.left) / r.width), D.mod(1 - (event.clientY - r.top) / r.height)]; }
    dyeCanvas.addEventListener("pointerdown", event => { event.preventDefault(); dyeCanvas.setPointerCapture(event.pointerId); pointer = position(event); marker = pointer; paint(...pointer, 0, 0, 0.3); draw(); });
    dyeCanvas.addEventListener("pointermove", event => {
      if (!pointer) return; event.preventDefault(); const p = position(event);
      const dx = Math.max(-0.7, Math.min(0.7, 10 * (p[0] - pointer[0]))), dy = Math.max(-0.7, Math.min(0.7, 10 * (p[1] - pointer[1])));
      paint(...p, dx, dy, 0.12); pointer = p; marker = p; draw();
    });
    dyeCanvas.addEventListener("pointerup", () => { pointer = null; }); dyeCanvas.addEventListener("pointercancel", () => { pointer = null; });
    dyeCanvas.addEventListener("keydown", event => {
      const directions = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]};
      const d = directions[event.key];
      if (d) {
        event.preventDefault(); marker = [D.mod(marker[0] + 0.035 * d[0]), D.mod(marker[1] + 0.035 * d[1])];
        if (event.shiftKey) paint(...marker, 0.35 * d[0], 0.35 * d[1]); draw();
      } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); paint(...marker); draw(); }
    });
    reset = function () { state = D.fluidInitial(); steps = 0; state.time = 0; marker = [0.5, 0.5]; };
    tick = function () { const time = state.time + h; state = D.fluidStep(state, {h, viscosity, diffusivity, project}); state.time = time; steps++; };
    draw = function () {
      const n = state.n, a = context(dyeCanvas);
      heatmap(a.ctx, a.width, a.height, state.dye, n, 1.4, densityColor);
      a.ctx.strokeStyle = "#7d8748"; a.ctx.lineWidth = 1; a.ctx.beginPath(); a.ctx.ellipse(marker[0] * a.width, (1 - marker[1]) * a.height, radius * a.width, radius * a.height, 0, 0, D.TAU); a.ctx.stroke();
      const U = D.fft2(state.u, null, n), V = D.fft2(state.v, null, n), rr = new Float64Array(n * n), ii = new Float64Array(n * n);
      let divergenceSquared = 0;
      for (let j = 0; j < n * n; j++) {
        const kx = D.TAU * D.wave(j % n, n), ky = D.TAU * D.wave(Math.floor(j / n), n);
        rr[j] = -kx * V.im[j] + ky * U.im[j]; ii[j] = kx * V.re[j] - ky * U.re[j];
        divergenceSquared += (kx * U.re[j] + ky * V.re[j]) ** 2 + (kx * U.im[j] + ky * V.im[j]) ** 2;
      }
      const vorticity = D.fft2(rr, ii, n, true).re, b = context(velocityCanvas);
      heatmap(b.ctx, b.width, b.height, Float64Array.from(vorticity, x => 0.5 + x / 16), n, 1, t => {
        const a = Math.min(1, Math.abs(2 * t - 1)); return t >= 0.5 ? [Math.round(249 - 29 * a), Math.round(249 - 127 * a), Math.round(244 - 193 * a)] : [Math.round(249 - 215 * a), Math.round(249 - 107 * a), Math.round(244 - 65 * a)];
      });
      for (let y = 0.06; y < 1; y += 0.105) for (let x = 0.06; x < 1; x += 0.105) {
        const u = D.interpolate(state.u, n, x, y), v = D.interpolate(state.v, n, x, y), factor = 0.065 * b.width / Math.max(0.32, Math.hypot(u, v));
        arrow(b.ctx, x * b.width, (1 - y) * b.height, u * factor, -v * factor, "#435b60", 0.8);
      }
      const diagnostic = Math.sqrt(divergenceSquared) / (n * n);
      const mass = state.dye.reduce((sum, x) => sum + x, 0) / (n * n);
      const energy = state.u.reduce((sum, x, j) => sum + x * x + state.v[j] ** 2, 0) / (2 * n * n);
      const referenceMass = state.initialDyeMass + state.injectedDyeMass, massError = mass - referenceMass;
      const signedError = (massError >= 0 ? "+" : "") + massError.toExponential(3);
      metrics([["spectral divergence RMS", diagnostic.toExponential(2)], ["grid kinetic energy", energy.toFixed(5)], ["dye mass (not artificially normalized)", mass.toFixed(5)],
        ["accumulated injected dye mass", state.injectedDyeMass.toFixed(6)], ["initial + injected reference mass", referenceMass.toFixed(6)], ["signed mass error: current − reference", signedError]]);
      $("clock").textContent = `t = ${state.time.toFixed(3)} · ${steps} steps · 45 × 45 grid`;
    };
    $("method").textContent = "Periodic bilinear semi-Lagrangian advection; genuine mixed-radix FFTs on an odd 45 × 45 grid; spectral implicit velocity diffusion and orthogonal pressure projection. Dye diffusion uses the positive five-point Laplacian resolvent, diagonalized by the same FFT. Each pointer/key event adds a discrete dye/velocity impulse, not a continuous per-second source; the exact grid-integrated dye increment is accumulated. Stirring strength scales only the velocity impulse (zero means paint without pushing); radius affects both bump widths. Reference mass is initial mass plus all injected mass, with no renormalization. Its signed error reveals nonconservative advection. Larger steps remain bounded but are less accurate. Keyboard: arrows move the circular source; Enter paints; Shift + arrows paints and stirs.";
  } else {
    $("intro").textContent = "Unknown experiment topic."; $("controls").hidden = true; $("plots").hidden = true; $("play").disabled = $("step").disabled = $("reset").disabled = true; measure(); return;
  }
  reset();
  if (typeof IntersectionObserver !== "undefined") new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) pause("Paused because the figure is out of view.");
  }).observe($("lab"));
  const resize = new ResizeObserver(() => { draw(); changedSize(); }); resize.observe($("lab"));
  draw(); changedSize();
}());
