(function () {
  "use strict";
  const M = window.BananaLangevin, V = window.BananaLangevinView;
  const $ = id => document.getElementById(id), time = $("time"), bend = $("bend"), play = $("play");
  const cache = new Map(); let result = null, request = 0, worker = null, playing = false, lastFrame = 0, wantedTime = 0;
  function notifyHeight() { parent.postMessage({ type: "ot-experiment-size", topic: "banana-langevin", height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) }, location.protocol === "file:" ? "*" : location.origin); }
  function drawCanvas(id, draw) {
    const c = $(id), box = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(box.width * dpr); c.height = Math.round(box.height * dpr);
    const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(ctx, box.width, box.height);
  }
  function draw() {
    const t = Number(time.value); $("time-value").textContent = t.toFixed(2); $("bend-value").textContent = Number(bend.value).toFixed(2);
    if (!result) return;
    const state = M.sample(result, t), bounds = M.lsiBounds(result.bend);
    drawCanvas("density", (ctx,w,h) => V.drawDensity(ctx,w,h,result.grid,state.density,{bend:result.bend,targetContours:true}));
    drawCanvas("target", (ctx,w,h) => V.drawDensity(ctx,w,h,result.grid,result.target,{bend:result.bend,targetContours:true,targetOnly:true}));
    drawCanvas("entropy", (ctx,w,h) => V.drawEntropy(ctx,w,h,[result],t));
    $("entropy-label").textContent = "KL = " + V.number(state.entropy);
    $("bound-label").textContent = result.bend === 0 ? "LSI constant λ = 1" : bounds.lower.toFixed(3) + " ≤ λ ≤ " + bounds.upper.toFixed(3);
    $("mass-label").textContent = "Left-half probability: " + (100*state.leftMass).toFixed(1) + "% · target 50%";
  }
  function stop() { playing = false; play.textContent = "Play evolution"; play.setAttribute("aria-pressed","false"); }
  function receive(data) {
    if (data.id !== request) return;
    if (data.error) { $("status").textContent = "This run could not be computed: " + data.error; $("results").setAttribute("aria-busy","false"); return; }
    result = data.result; cache.set(result.bend, result); if(cache.size>3) cache.delete(cache.keys().next().value);
    play.disabled = false; $("results").setAttribute("aria-busy","false");
    $("status").textContent = "Deterministic density evolution · same initial KL = 1.125 · no time rescaling";
    draw(); notifyHeight();
  }
  function solve() {
    stop(); const b = Number(bend.value); request++; $("bend-value").textContent = b.toFixed(2);
    if(worker) { worker.terminate(); worker = null; }
    if(cache.has(b)) { receive({id:request,result:cache.get(b)}); return; }
    play.disabled = true; result = null; $("results").setAttribute("aria-busy","true");
    for(const id of ["density","target","entropy"]){const canvas=$(id);canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);}
    $("entropy-label").textContent="KL = —";$("bound-label").textContent="LSI constant: computing…";$("mass-label").textContent="Probability in the left half-plane: —";
    $("status").textContent = "Solving the Fokker–Planck equation for bending " + b.toFixed(2) + "…";
    try {
      worker = new Worker("worker.js"); worker.onmessage = e => receive(e.data);
      worker.onerror = () => { play.disabled = true; $("results").setAttribute("aria-busy","false"); $("status").textContent = "The numerical worker could not start. Please reload this figure over HTTP."; };
      worker.postMessage({id:request,bend:b});
    } catch (_) { $("results").setAttribute("aria-busy","false"); $("status").textContent = "This browser cannot run the numerical worker. The article states the exact Gaussian solution and log-Sobolev bounds."; }
  }
  function animate(now) {
    if (!playing) return;
    const elapsed = lastFrame ? Math.min(.1,(now-lastFrame)/1000) : 0; lastFrame = now;
    wantedTime = Math.min(20,wantedTime+elapsed*1.6); time.value = wantedTime.toFixed(2); draw();
    if(wantedTime>=20) stop(); else requestAnimationFrame(animate);
  }
  time.addEventListener("input",()=>{stop();draw();}); bend.addEventListener("input",solve);
  play.addEventListener("click",()=>{if(playing){stop();return;} if(Number(time.value)>=20)time.value="0";wantedTime=Number(time.value);playing=true;lastFrame=0;play.textContent="Pause";play.setAttribute("aria-pressed","true");requestAnimationFrame(animate);});
  new ResizeObserver(()=>{draw();notifyHeight();}).observe(document.querySelector("main"));
  window.addEventListener("message",event=>{if(event.source===parent&&event.data?.type==="ot-experiment-measure")notifyHeight();});
  document.querySelector("details").addEventListener("toggle",notifyHeight); solve();
}());
