(function () {
  "use strict";
  const M = window.PerspectivePowers, V = window.PerspectivePowersView, $ = id => document.getElementById(id);
  const canvas = $("perspective-plot"), slider = $("power");
  let p = 2, point = { z: .8, r: .6 }, frame = 0;
  function height() {
    if (window.parent !== window) window.parent.postMessage({ type: "ot-experiment-size", topic: "perspective-powers", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) + 2 }, location.protocol === "file:" ? "*" : location.origin);
  }
  function render() {
    const width = canvas.clientWidth, h = canvas.clientHeight;
    if (width < 80 || h < 80) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(h * ratio);
    const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio); V.draw(ctx, width, h, { p, point });
    slider.value = String(p); $("power-value").textContent = p.toFixed(2); slider.setAttribute("aria-valuetext", "p = " + p.toFixed(2));
    const cost = M.value(point.z, point.r, p), text = "z = " + point.z.toFixed(2) + " · r = " + point.r.toFixed(2) + " · perspective = " + (Number.isFinite(cost) ? Number(cost.toPrecision(6)) : "+∞");
    $("probe").textContent = text; canvas.setAttribute("aria-label", text + ". Arrow keys move the probe; Home resets it.");
    $("boundary").textContent = p === 1 ? "At r = 0 the closed perspective is |z|: linear growth has a finite recession cost." : "At r = 0 the closed perspective is 0 at z = 0 and +∞ otherwise: superlinear growth forbids nonzero flux at vacuum.";
    for (const [name, value] of [["linear", 1], ["quadratic", 2], ["cubic", 3]]) $("preset-" + name).setAttribute("aria-pressed", String(Math.abs(p - value) < 1e-10));
    height();
  }
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); }
  slider.addEventListener("input", () => { const value = Number(slider.value); if (Number.isFinite(value)) p = Math.min(4, Math.max(1, value)); schedule(); });
  for (const [name, value] of [["linear", 1], ["quadratic", 2], ["cubic", 3]]) $("preset-" + name).addEventListener("click", () => { p = value; render(); });
  canvas.addEventListener("pointermove", event => {
    const rect = canvas.getBoundingClientRect(), box = V.layout(rect.width, rect.height), x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) return;
    point = { z: M.domain.zMin + (x - box.left) / box.width * (M.domain.zMax - M.domain.zMin), r: (box.bottom - y) / box.height * M.domain.rMax }; schedule();
  });
  canvas.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
    event.preventDefault(); const step = event.shiftKey ? .2 : .05;
    if (event.key === "Home") point = { z: .8, r: .6 };
    else { if (event.key === "ArrowLeft") point.z -= step; if (event.key === "ArrowRight") point.z += step; if (event.key === "ArrowUp") point.r += step; if (event.key === "ArrowDown") point.r -= step; point.z = Math.max(M.domain.zMin, Math.min(M.domain.zMax, point.z)); point.r = Math.max(0, Math.min(M.domain.rMax, point.r)); }
    render();
  });
  window.addEventListener("resize", schedule);
  window.addEventListener("message", event => { if (event.source === window.parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") height(); });
  if (window.ResizeObserver) new window.ResizeObserver(schedule).observe(document.querySelector("main"));
  window.PerspectivePowersApp = { getState: () => ({ p, point: { ...point }, value: M.value(point.z, point.r, p), playing: false }) };
  render();
})();
