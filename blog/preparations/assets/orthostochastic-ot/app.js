(function () {
  "use strict";
  const M = window.OrthostochasticOT, V = window.OrthostochasticView;
  const $ = id => document.getElementById(id), time = $("time"), points = $("points"), motion = $("motion"), play = $("play");
  let result = null, preview = null, worker = null, timer = 0, request = 0, playing = false, animation = 0, startedAt = null, startedIndex = 0, preset = "clouds";
  const cache = new Map();
  function notifyHeight() {
    parent.postMessage({type:"ot-experiment-size",topic:"orthostochastic-ot",height:Math.ceil(document.querySelector("main").getBoundingClientRect().height)}, location.protocol === "file:" ? "*" : location.origin);
  }
  function number(x) { return Number.isFinite(x) ? (Math.abs(x) < .0001 && x !== 0 ? x.toExponential(2) : x.toFixed(4)) : "—"; }
  function draw() {
    const scene = result || preview; if (!scene) return;
    const index = result ? Math.min(result.times.length - 1, Number(time.value)) : 0;
    $("time-value").textContent = result ? result.times[index].toFixed(2) : "0.00";
    time.setAttribute("aria-valuetext", "Flow time " + $("time-value").textContent);
    $("points-value").textContent = points.value; $("motion-value").textContent = preset === "trap" ? (65+20*Number(motion.value)).toFixed(1)+"°" : Number(motion.value).toFixed(2);
    motion.setAttribute("aria-valuetext", preset === "trap" ? "Target rotation " + $("motion-value").textContent : "Configuration " + $("motion-value").textContent);
    const canvas = $("transport"), box = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (canvas.width !== w) canvas.width = w; if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); V.draw(ctx, box.width, box.height, scene, index);
    const energy = result ? result.energies[index] : null;
    $("energy").textContent = number(energy); $("optimum").textContent = number(scene.optimalEnergy);
    $("gap").textContent = result ? number(Math.max(0, energy - scene.optimalEnergy)) : "—";
    $("orthogonality").textContent = result ? number(result.diagnostics.orthogonalityError) : "—";
    canvas.setAttribute("aria-label", "Two transport clouds of " + scene.n + " points each. " + (result ? "At flow time " + result.times[index].toFixed(2) + ", energy " + energy.toFixed(5) + ", exact optimum " + scene.optimalEnergy.toFixed(5) + "." : "Updated geometry; computing gradient flow.") + " Dashed lines show the exact assignment and its energy.");
  }
  function stop() { playing = false; cancelAnimationFrame(animation); play.textContent = "Play flow"; play.setAttribute("aria-pressed","false"); }
  function receive(data) {
    if (data.id !== request) return;
    $("results").setAttribute("aria-busy","false");
    if (data.error) { $("status").textContent = "Cloud preview available; the flow could not be computed: " + data.error; return; }
    result = data.result; preview = null; $("results").dataset.phase = "ready";
    time.max = String(result.times.length - 1); time.value = "0"; time.disabled = false; play.disabled = false;
    $("time-end").textContent = "t = " + result.times[result.times.length - 1].toFixed(1);
    cache.set(preset+":"+result.n+":"+Number(motion.value), result); if (cache.size > 4) cache.delete(cache.keys().next().value);
    $("status").textContent = preset === "trap" ? "A genuine nonglobal local minimum: descent can stop above the exact optimum." : "One deterministic initialization · exact marginals · no guarantee of global convergence";
    draw(); notifyHeight();
  }
  function solve() {
    stop(); request++; clearTimeout(timer); if (worker) { worker.terminate(); worker = null; }
    const options = {n:Number(points.value),motion:Number(motion.value),preset,initial:preset === "trap" ? "nearIdentity" : "dense"};
    const key = preset+":"+options.n+":"+options.motion;
    result = null; time.value = "0"; time.disabled = true; play.disabled = true;
    $("results").setAttribute("aria-busy","true"); $("results").dataset.phase = "preview"; $("results").dataset.preset = preset;
    try { preview = M.prepare(options); draw(); } catch (error) { $("status").textContent = error.message; $("results").setAttribute("aria-busy","false"); return; }
    $("status").textContent = "Geometry updated · computing projected gradient flow…"; notifyHeight();
    if (cache.has(key)) { receive({id:request,result:cache.get(key)}); return; }
    const current = request;
    timer = setTimeout(() => {
      if (current !== request) return;
      try {
        const instance = new Worker("worker.js?v=orthostochastic-v1"); worker = instance;
        instance.onmessage = event => receive(event.data);
        instance.onerror = event => { if (current !== request || worker !== instance) {event.preventDefault();return;} $("results").setAttribute("aria-busy","false"); $("status").textContent = "The numerical worker could not start. Open this figure over HTTP and reload."; };
        instance.postMessage({id:current,options});
      } catch (_) { $("results").setAttribute("aria-busy","false"); $("status").textContent = "This browser cannot start the numerical worker. The article gives the flow and the exact benchmark."; }
    },130);
  }
  function animate(now) {
    if (!playing || !result) return;
    if (startedAt === null) startedAt = now;
    const index = Math.min(result.times.length - 1, startedIndex + Math.floor((now - startedAt) * .012));
    if (Number(time.value) !== index) {time.value = String(index);draw();}
    if (index === result.times.length - 1) stop(); else animation = requestAnimationFrame(animate);
  }
  time.addEventListener("input",() => {stop();draw();});
  points.addEventListener("input",solve); motion.addEventListener("input",solve);
  play.addEventListener("click",() => {if (!result) return;if (playing) {stop();return;} if (Number(time.value) >= result.times.length - 1) time.value = "0"; startedIndex = Number(time.value);startedAt = null;playing = true;play.textContent = "Pause";play.setAttribute("aria-pressed","true");animation = requestAnimationFrame(animate);});
  function setPreset(value) {
    preset = value; $("clouds").setAttribute("aria-pressed",String(value === "clouds")); $("trap").setAttribute("aria-pressed",String(value === "trap"));
    points.disabled = value === "trap"; motion.disabled = false;
    $("motion-start").textContent = value === "trap" ? "Rotation 65°" : "First configuration"; $("motion-end").textContent = value === "trap" ? "Rotation 85°" : "Rotated and deformed";
    points.value = value === "trap" ? "3" : "12"; motion.value = value === "trap" ? ".5" : ".35"; solve();
  }
  $("clouds").addEventListener("click",() => setPreset("clouds")); $("trap").addEventListener("click",() => setPreset("trap"));
  document.addEventListener("visibilitychange",() => {if (document.hidden) stop();});
  new IntersectionObserver(entries => {if (!entries[0].isIntersecting) stop();}).observe($("transport"));
  new ResizeObserver(() => {draw();notifyHeight();}).observe(document.querySelector("main"));
  window.addEventListener("message",event => {if (event.source === parent && (event.origin === location.origin || event.origin === "null") && event.data?.type === "ot-experiment-measure") notifyHeight();});
  document.querySelector("details").addEventListener("toggle",notifyHeight); solve();
}());
