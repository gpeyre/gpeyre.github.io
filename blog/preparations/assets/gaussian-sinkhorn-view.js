/* SVG views of the exact Gaussian coupling and its marginal error.
 * Spatial and marginal-density scales never depend on epsilon or the iterate.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GaussianSinkhornView = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const TEAL = "#167d81", INK = "#53616d", GRID = "#e5ecef";
  const bounds = Object.freeze([-4.5, 4.5]);
  const number = v => Number(v.toFixed(4));
  const points = a => a.map(p => p.map(number).join(",")).join(" ");
  const path = (a, color, width, extra = "") =>
    `<polyline points="${points(a)}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  const label = (x, y, value, extra = "") =>
    `<text x="${x}" y="${y}" text-anchor="middle" ${extra}>${value}</text>`;
  const pdf = (x, variance) => Math.exp(-x*x/(2*variance))/Math.sqrt(2*Math.PI*variance);

  function coupling(state, target) {
    const left = 122, top = 128, side = 340;
    const px = x => left + side*(x+4.5)/9;
    const py = y => top + side*(4.5-y)/9;
    const grid = Array.from({length: 361}, (_, i) => -4.5+9*i/360);
    // X = sqrt(s) Z + (Cov(X,Y)/sqrt(b)) W; Y = sqrt(b) W.
    // This conditional factorization stays accurate for very thin ellipses.
    const ellipse = t => Array.from({length: 361}, (_, i) => {
      const a = 2*Math.PI*i/360;
      return [px(2*(Math.sqrt(t.s)*Math.cos(a)+t.crossCov/Math.sqrt(t.yVariance)*Math.sin(a))),
        py(2*Math.sqrt(t.yVariance)*Math.sin(a))];
    });
    const xDensity = t => grid.map(x => [px(x), 102-70*pdf(x,t.xVariance)/.44]);
    const yDensity = t => grid.map(y => [92-70*pdf(y,t.yVariance)/.44, py(y)]);
    let svg = `<title>Joint Gaussian and its two marginals</title><desc>Solid teal is the current coupling; dashed gray is the exact solution. The x marginal is above the coupling, and the y marginal is on its left. Both spatial axes remain between minus 4.5 and 4.5.</desc>`;
    svg += `<rect x="${left}" y="${top}" width="${side}" height="${side}" fill="#fff" stroke="#ccd9de"/>`;
    for (const value of [-4,-2,0,2,4]) {
      const color = value === 0 ? "#c7d4d9" : GRID;
      svg += path([[px(value),top],[px(value),top+side]],color,1);
      svg += path([[left,py(value)],[left+side,py(value)]],color,1);
      svg += label(px(value),491,value,'class="gs-tick"');
      svg += label(130,py(value)+5,value,'class="gs-tick" style="text-anchor:start"');
    }
    const current = ellipse(state), optimum = ellipse(target);
    svg += `<polygon points="${points(current)}" fill="${TEAL}" fill-opacity=".09"/>`;
    svg += path(current,TEAL,2.6,'class="gs-current-ellipse"');
    svg += path(optimum,INK,2.2,'class="gs-target-ellipse" stroke-dasharray="7 5"');
    svg += path([[left,102],[left+side,102]],"#cbd7dc",1);
    svg += path([[92,top],[92,top+side]],"#cbd7dc",1);
    svg += `<polygon points="${points([[px(-4.5),102],...xDensity(state),[px(4.5),102]])}" fill="${TEAL}" fill-opacity=".08"/>`;
    svg += path(xDensity(state),TEAL,2.6,'class="gs-x-current"');
    svg += path(xDensity(target),INK,2.2,'class="gs-x-target" stroke-dasharray="7 5"');
    svg += path(yDensity(state),TEAL,3.2,'class="gs-y-current"');
    svg += path(yDensity(target),INK,1.8,'class="gs-y-target" stroke-dasharray="7 5"');
    svg += label(292,22,"x marginal",'class="gs-axis-label"');
    svg += label(17,298,"y marginal",'class="gs-axis-label" transform="rotate(-90 17 298)"');
    svg += label(292,515,"x",'class="gs-axis-label"');
    svg += label(116,117,"y",'class="gs-axis-label"');
    return svg;
  }

  function error(curve, state, horizon) {
    const left=76,top=64,width=330,height=404;
    const ymin=Math.min(-6,Math.floor(curve[curve.length-1].logMarginalError/Math.LN10))-.35;
    const ymax=1;
    const px=k=>left+width*k/horizon;
    const py=v=>top+height*(ymax-v)/(ymax-ymin);
    let svg='<title>First-marginal variance error versus complete Sinkhorn cycles</title><desc>The vertical axis is logarithmic. The highlighted dot marks the currently selected integer cycle.</desc>';
    svg+=label(241,24,"|Var(Xₖ) − 1|",'class="gs-axis-label"');
    svg+=label(241,46,"logarithmic error scale",'class="gs-scale-label"');
    for(const exponent of [0,-2,-4,-6,-8,-10].filter(e=>e>=ymin)){
      svg+=path([[left,py(exponent)],[left+width,py(exponent)]],GRID,1);
      const tick=exponent===0?"1":`10<tspan baseline-shift="super" font-size=".75em">${exponent}</tspan>`;
      svg+=label(left-10,py(exponent)+5,tick,'class="gs-tick" style="text-anchor:end"');
    }
    const ticks=[...new Set(Array.from({length:5},(_,i)=>Math.round(horizon*i/4)))];
    for(const k of ticks){
      svg+=path([[px(k),top],[px(k),top+height]],GRID,1);
      svg+=label(px(k),491,k,'class="gs-tick"');
    }
    svg+=path([[left,top],[left,top+height],[left+width,top+height]],"#aabdc6",1);
    svg+=path(curve.map(t=>[px(t.k),py(t.logMarginalError/Math.LN10)]),TEAL,2.5,'class="gs-error-curve"');
    if(horizon<=25)for(const t of curve)svg+=`<circle cx="${px(t.k)}" cy="${py(t.logMarginalError/Math.LN10)}" r="2.5" fill="${TEAL}"/>`;
    const logError=state.logMarginalError/Math.LN10, x=px(state.k),y=py(logError);
    svg+=path([[x,y],[x,top+height]],TEAL,1.2,'stroke-dasharray="3 4" opacity=".5"');
    svg+=`<circle id="gs-error-dot" data-k="${state.k}" data-log-error="${logError}" cx="${x}" cy="${y}" r="6" fill="${TEAL}" stroke="white" stroke-width="2"><title>Cycle ${state.k}: marginal variance error ${Math.abs(state.relativeMarginalError).toExponential(3)}</title></circle>`;
    svg+=label(241,515,"full cycles k",'class="gs-axis-label"');
    return svg;
  }

  return Object.freeze({bounds,pdf,coupling,error});
});
