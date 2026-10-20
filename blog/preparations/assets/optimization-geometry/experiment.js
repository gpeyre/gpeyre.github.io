(function () {
  "use strict";
  const G = window.OptimizationGeometry, topic = new URLSearchParams(location.search).get("topic") || "intrinsic";
  const root = document.getElementById("experiment");
  const colors = ["#146c78", "#a9671c", "#b64d69"], gray = "#7a8588";
  const $ = id => document.getElementById(id);
  const fmt = x => x === 0 ? "0" : Math.abs(x) < .0001 ? x.toExponential(2) : Number(x.toPrecision(4)).toString();
  let render = function () {}, running = false, raf = null, previous = 0;
  function size() { if (parent !== window) parent.postMessage({type:"ot-experiment-size",topic,height:Math.ceil(root.getBoundingClientRect().height)}, location.protocol === "file:" ? "*" : location.origin); }
  window.addEventListener("message", e => { if (e.source === parent && e.data && e.data.type === "ot-experiment-measure") size(); });
  function axes(id, xmin, xmax, ymin, ymax, xlabel, ylabel, options = {}) {
    const canvas = $(id), rect = canvas.getBoundingClientRect(), width = Math.max(250,rect.width), height = width / (innerWidth <= 650 ? 1.2 : 1.25), ratio = Math.min(2,devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const c = canvas.getContext("2d"); c.scale(ratio,ratio); c.clearRect(0,0,width,height);
    const right=14,bottom=47;let left=52,top=20,w=width-left-right,h=height-top-bottom;
    if(options.equal){const scale=Math.min(w/(xmax-xmin),h/(ymax-ymin)),usedW=scale*(xmax-xmin),usedH=scale*(ymax-ymin);left+=(w-usedW)/2;top+=(h-usedH)/2;w=usedW;h=usedH;}
    const X = x => left+(x-xmin)*w/(xmax-xmin), Y = y => top+h-(y-ymin)*h/(ymax-ymin);
    c.font="11px system-ui";c.fillStyle="#526a6d";c.strokeStyle="#e5ecec";c.lineWidth=1;
    const xticks=options.xticks || Array.from({length:5},(_,i)=>xmin+(xmax-xmin)*i/4);
    const yticks=options.yticks || Array.from({length:5},(_,i)=>ymin+(ymax-ymin)*i/4);
    for(const x of xticks){c.beginPath();c.moveTo(X(x),top);c.lineTo(X(x),top+h);c.stroke();c.textAlign="center";c.fillText(options.xformat?options.xformat(x):fmt(x),X(x),top+h+18);}
    for(const y of yticks){c.beginPath();c.moveTo(left,Y(y));c.lineTo(left+w,Y(y));c.stroke();c.textAlign="right";c.fillText(options.yformat?options.yformat(y):fmt(y),left-7,Y(y)+4);}
    c.strokeStyle="#9eb6b9";c.strokeRect(left,top,w,h);c.fillStyle="#36565b";c.textAlign="center";c.fillText(xlabel,left+w/2,height-7);
    c.save();c.translate(13,top+h/2);c.rotate(-Math.PI/2);c.fillText(ylabel,0,0);c.restore();
    function line(points,color,dash=[],lineWidth=2){c.save();c.beginPath();c.rect(left,top,w,h);c.clip();c.strokeStyle=color;c.lineWidth=lineWidth;c.setLineDash(dash);c.beginPath();let started=false;for(const p of points){if(!Number.isFinite(p[0])||!Number.isFinite(p[1])){started=false;continue;}if(started)c.lineTo(X(p[0]),Y(p[1]));else{c.moveTo(X(p[0]),Y(p[1]));started=true;}}c.stroke();c.restore();}
    function point(x,y,color){c.fillStyle=color;c.strokeStyle="white";c.lineWidth=2;c.beginPath();c.arc(X(x),Y(y),5,0,2*Math.PI);c.fill();c.stroke();}
    return {line,point,X,Y,c};
  }
  function legend(items){return '<div class="legend">'+items.map(x=>'<span style="--c:'+x[1]+'"'+(x[2]?' class="dash"':'')+'>'+x[0]+'</span>').join('')+'</div>';}
  function panel(id,title,label){return '<section class="panel"><h3>'+title+'</h3><canvas id="'+id+'" role="img" aria-label="'+label+'"></canvas></section>';}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;if($("play")){$("play").textContent="Play";$("play").setAttribute("aria-pressed","false");}}
  if(topic === "intrinsic") {
    root.innerHTML='<h2>One product, different clocks</h2><p class="intro">Each curve solves the factor gradient flow for ½(ab − 1.3)². All three start at the same product; only their conserved imbalance differs.</p><div class="controls"><label for="product">Initial product z₀<input id="product" type="range" min="0.01" max="0.5" step="0.01" value="0.06"><output id="product-value" for="product"></output></label><label for="imbalance">Largest imbalance λ<input id="imbalance" type="range" min="0.2" max="4" step="0.1" value="2"><output id="imbalance-value" for="imbalance"></output></label><div class="wide"><label for="time">Time<input id="time" type="range" min="0" max="5" step="0.01" value="0"><output id="time-value" for="time"></output></label><div class="playback"><button id="play" type="button" aria-pressed="false">Play</button><button id="reset" type="button">Reset time</button></div></div></div><div class="panels">'+panel("factors","Paths in factor space","Factor paths on invariant hyperbolas; current positions are marked")+panel("products","The represented product","Product versus time for three conserved imbalances")+'</div><div id="legend"></div><div class="metrics" id="metrics" aria-live="polite"></div><p class="footnote">Fourth-order Runge–Kutta integration of ż = √(λ² + 4z²)(1.3 − z); factors are reconstructed from z and λ. Thin gray curves are the invariant hyperbolas, not extra trajectories. The time control starts paused. This is a continuous-time flow, not finite-step GD.</p>';
    let paths=[],key="";
    render=()=>{
      const z=+$("product").value,L=+$("imbalance").value,t=+$("time").value,newKey=[z,L].join();
      if(key!==newKey){paths=[0,L/2,L].map(l=>G.scalarTrajectory(z,l));key=newKey;}
      $("product-value").textContent=fmt(z);$("imbalance-value").textContent=fmt(L);$("time-value").textContent=t.toFixed(2);
      const max=Math.sqrt((Math.hypot(L,2*1.3)+L)/2)+.25;
      const a=axes("factors",0,max,0,max,"a","b",{equal:true}),b=axes("products",0,5,0,1.42,"time t","product z = ab",{yticks:[0,.35,.7,1.05,1.3]});
      b.line([[0,1.3],[5,1.3]],gray,[4,4],1);
      paths.forEach((p,i)=>{
        const lambda=p[0].lambda,step=Math.round(t*200),current=p[step];
        const hyper=Array.from({length:301},(_,j)=>{const x=max*j/300;return [x,x*x>=lambda?Math.sqrt(x*x-lambda):NaN];});
        a.line(hyper,"#c8d4d5",[3,4],1);a.line(p.map(v=>[v.a,v.b]),colors[i],[],1.5);a.line(p.slice(0,step+1).map(v=>[v.a,v.b]),colors[i],[],3);a.point(p[0].a,p[0].b,gray);a.point(current.a,current.b,colors[i]);
        b.line(p.map(v=>[v.t,v.z]),colors[i]);b.point(current.t,current.z,colors[i]);
      });
      b.line([[t,0],[t,1.42]],"#a6b9bc",[2,4],1);
      $("legend").innerHTML=legend(paths.map((p,i)=>["λ = "+fmt(p[0].lambda)+(i===0?" (balanced)":""),colors[i]]));
      $("metrics").textContent="At t = "+t.toFixed(2)+": "+paths.map(p=>"λ = "+fmt(p[0].lambda)+" → z = "+fmt(p[Math.round(t*200)].z)).join("; ")+". Target z★ = 1.3.";
      size();
    };
    $("play").addEventListener("click",()=>{if(running){stop();return;}if(+$("time").value>=5)$("time").value=0;running=true;previous=performance.now();$("play").textContent="Pause";$("play").setAttribute("aria-pressed","true");const tick=now=>{if(!running)return;const dt=Math.min(.08,(now-previous)/1000);previous=now;$("time").value=Math.min(5,+$("time").value+dt);render();if(+$("time").value>=5)stop();else raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);});
    $("reset").addEventListener("click",()=>{stop();$("time").value=0;render();});
    for(const id of ["product","imbalance","time"])$(id).addEventListener("input",()=>{stop();render();});
  } else if(topic === "lowrank") {
    root.innerHTML='<h2>A fixed rank-two target, many parameterizations</h2><p class="intro">Y = diag(4, 1, 0) stays fixed. Change the scale of Aₛ and its inverse scale in Bₛ; compare local GD with the balanced reference.</p><div class="controls"><label for="scale">Factor scale s (logarithmic)<input id="scale" type="range" min="-2" max="2" step="0.05" value="1"><output id="scale-value" for="scale"></output></label><label for="iterations">Iteration horizon<input id="iterations" type="range" min="200" max="5000" step="100" value="1800"><output id="iterations-value" for="iterations"></output></label></div><div class="panels">'+panel("condition","Exact positive Hessian condition number","Condition number versus factor scaling, with the selected scale marked")+panel("loss","Actual local training and its linearization","Normalized loss of gradient descent near balanced and rescaled minimizers")+'</div>'+legend([["selected scale",colors[0]],["balanced s = 1",colors[1]],["Hessian linearization",gray,true]])+'<div class="metrics" id="metrics" aria-live="polite"></div><p class="footnote">Solid curves: actual simultaneous factor GD. Dashed: the quadratic Hessian model, not fitted data. Each run starts with the same factor-space perturbation norm δ = 0.001, split between A₃₂ and B₂₃, and uses its own step η = 0.8/Lₛ. Losses are divided by their own initial loss. The graph stops at 10⁻¹² for readability; this is a local experiment, not a global convergence comparison.</p>';
    let cache=new Map();
    render=()=>{
      const log=+$("scale").value,s=2**log,n=+$("iterations").value,c=G.lowRankCondition(s);
      const get=q=>{const key=q+":"+n;if(!cache.has(key)){cache.set(key,G.lowRankTrajectory(q,n));if(cache.size>8)cache.delete(cache.keys().next().value);}return cache.get(key);};
      const selected=get(s),balanced=get(1);
      $("scale-value").textContent="s = "+fmt(s);$("iterations-value").textContent=n;
      const a=axes("condition",-2,2,.8,3.2,"log₂ scale s","κ₊ (log scale)",{xticks:[-2,-1,0,1,2],yticks:[1,2,3],yformat:x=>fmt(10**x)});
      a.line(Array.from({length:201},(_,j)=>{const x=-2+4*j/200;return [x,Math.log10(G.lowRankCondition(2**x).kappa)];}),colors[0]);a.line([[-2,Math.log10(8)],[2,Math.log10(8)]],colors[1],[4,4],1);a.point(log,Math.log10(c.kappa),colors[0]);
      const b=axes("loss",0,n,-12,0,"GD iteration k","loss / initial loss",{yticks:[0,-3,-6,-9,-12],yformat:y=>y===0?"1":"10^"+y});
      [selected,balanced].forEach((tr,i)=>{b.line(tr.result.map(p=>[p.k,Math.log10(Math.max(1e-12,p.relative))]),colors[i]);b.line(tr.result.map(p=>[p.k,Math.log10(Math.max(1e-12,p.linearized))]),colors[i],[5,5],1);});
      $("metrics").textContent="Selected: κ₊ = "+fmt(c.kappa)+", L = "+fmt(c.L)+", μ₊ = "+fmt(c.mu)+", η = "+fmt(selected.eta)+". At k = "+n+", relative loss = "+fmt(selected.result[n].relative)+". Balanced: κ₊ = 8, relative loss = "+fmt(balanced.result[n].relative)+".";
      size();
    };
    for(const id of ["scale","iterations"])$(id).addEventListener("input",render);
  } else if(topic === "sign") {
    root.innerHTML='<h2>The same spectrum, a different coordinate geometry</h2><p class="intro">Dimension d = 20, ε = 0.01. Initial vectors are matched by an orthogonal rotation Q: x₀,spread = Q x₀,axis. Ordinary GD therefore has identical loss in both panels.</p><div class="controls"><label for="direction">Matched initial direction<select id="direction"><option value="mixed">Mixed: soft + hard eigenspaces</option><option value="soft">Soft eigenvector</option><option value="hard">Hard eigenspace</option></select></label><label for="iterations">Iteration horizon<input id="iterations" type="range" min="100" max="2500" step="100" value="1200"><output id="iterations-value" for="iterations"></output></label></div><div class="panels">'+panel("axis","Soft direction aligned with a coordinate","Ordinary and scaled sign gradient descent on the axis-aligned quadratic")+panel("spread","Soft direction spread over coordinates","Ordinary and scaled sign gradient descent on the rotated quadratic")+'</div>'+legend([["ordinary GD",gray],["scaled sign-GD",colors[0]],["theorem bound (matching color)",gray,true]])+'<div class="metrics"><table><caption class="sr-only">Exact geometry-dependent constants</caption><thead><tr><th>Geometry</th><th>L∞</th><th>μ∞</th><th>κ∞</th></tr></thead><tbody><tr><th>Axis</th><td>19.01</td><td>0.01</td><td>1901</td></tr><tr><th>Spread</th><td>20</td><td>20/119</td><td>119</td></tr></tbody></table><p id="metrics" aria-live="polite"></p></div><p class="footnote">Solid lines are recomputed iterates, not exponential fits. Every method uses η = 1/L in its own geometry. Dashed curves are the rigorous bound (1 − μ/L)ᵏ, not predicted equalities. Values below 10⁻¹² are clipped. Changing the initial direction can reverse individual-trajectory comparisons; a worst-case condition number does not order every run. The update is −η‖g‖₁ sign(g), not unscaled sign descent.</p>';
    render=()=>{
      const n=+$("iterations").value,mode=$("direction").value;$("iterations-value").textContent=n;
      const data=[false,true].map(spread=>[G.signTrajectory({spread,method:"gd",mode,iterations:n}),G.signTrajectory({spread,method:"sign",mode,iterations:n})]);
      data.forEach((methods,i)=>{const a=axes(i?"spread":"axis",0,n,-12,0,"iteration k","loss / initial loss",{yticks:[0,-3,-6,-9,-12],yformat:y=>y===0?"1":"10^"+y});methods.forEach((tr,j)=>{const col=j?colors[0]:gray;a.line(tr.result.map(p=>[p.k,Math.log10(Math.max(1e-12,p.relative))]),col);a.line(tr.result.map(p=>[p.k,Math.log10(Math.max(1e-12,p.bound))]),col,[5,5],1);});});
      $("metrics").textContent="At k = "+n+": ordinary GD "+fmt(data[0][0].result[n].relative)+" (both); scaled sign-GD axis "+fmt(data[0][1].result[n].relative)+", spread "+fmt(data[1][1].result[n].relative)+". Euclidean κ₂ = 100 for both matrices.";size();
    };
    $("direction").addEventListener("change",render);$("iterations").addEventListener("input",render);
  } else {root.innerHTML='<p class="error">Unknown experiment. Choose intrinsic, lowrank, or sign.</p>';}
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();});
  if(typeof IntersectionObserver!=="undefined")new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(root);
  window.addEventListener("resize",()=>{render();size();});
  if(typeof ResizeObserver!=="undefined")new ResizeObserver(size).observe(root);
  render();size();
})();
