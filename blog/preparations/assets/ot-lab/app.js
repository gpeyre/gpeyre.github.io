"use strict";
const M=window.BlogMath, D=window.BLOG_DATA;
const RED="#c74b45", BLUE="#2673b5", TEAL="#207c76", GRAY="#a3aaa7", VIOLET="#8262a7";
const $=id=>document.getElementById(id);
const fmt=(x,k=4)=>Number.isFinite(x)?x.toPrecision(k):"--";
let cancel=()=>{}, active="";
const requestedTopic=new URLSearchParams(location.search).get("topic") || "weak";
function line(points,color=TEAL,width=1.8,opacity=1,dash="") {
  return `<polyline points="${points.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"${dash?` stroke-dasharray="${dash}"`:""}/>`;
}
function dot(p,color,r=3,extra=""){return `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${color}" ${extra}/>`;}
function text(p,s,anchor="middle"){return `<text x="${p[0]}" y="${p[1]}" text-anchor="${anchor}">${s}</text>`;}
function plot(title,xrange,yrange,axes=true,ticks={}) {
  const wrap=document.createElement("div");wrap.className="plot";
  const heading=document.createElement("h3");heading.textContent=title;wrap.appendChild(heading);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 380 290");svg.setAttribute("role","img");svg.setAttribute("aria-label",title);
  wrap.appendChild(svg);$("plots").appendChild(wrap);
  // Geometry panels use equal units on both axes, so circles stay circular.
  const unit=Math.min(320/(xrange[1]-xrange[0]),220/(yrange[1]-yrange[0]));
  let sx=axes?320/(xrange[1]-xrange[0]):unit, sy=axes?220/(yrange[1]-yrange[0]):unit;
  let mx=(xrange[0]+xrange[1])/2,my=(yrange[0]+yrange[1])/2;
  const project=p=>[200+sx*(p[0]-mx),140-sy*(p[1]-my)];
  const unproject=p=>[mx+(p[0]-200)/sx,my+(140-p[1])/sy];
  let base="";
  if(axes){
    base=line([[40,30],[40,250],[360,250]],GRAY,.8);
    const xticks=ticks.x||Array.from({length:5},(_,i)=>{const x=xrange[0]+(xrange[1]-xrange[0])*i/4;return [x,fmt(x,2)];});
    const yticks=ticks.y||Array.from({length:5},(_,i)=>{const y=yrange[0]+(yrange[1]-yrange[0])*i/4;return [y,fmt(y,2)];});
    for(const [x,label] of xticks)base+=text([project([x,yrange[0]])[0],269],label);
    for(const [y,label] of yticks){const py=project([xrange[0],y])[1];base+=line([[40,py],[360,py]],GRAY,.5,.2)+text([33,py+4],label,"end");}
  }
  return {svg,project,unproject,draw:s=>{svg.innerHTML=base+s;},
          fitGeometry:(xr,yr)=>{if(axes)throw Error("Only geometry panels can change their view bounds");sx=sy=Math.min(320/(xr[1]-xr[0]),220/(yr[1]-yr[0]));mx=(xr[0]+xr[1])/2;my=(yr[0]+yr[1])/2;},
          path:(points,c,w,o,dash)=>line(points.map(project),c,w,o,dash)};
}
function slider(label,min,max,value,step=1) {
  const box=document.createElement("label"),span=document.createElement("span"),out=document.createElement("output");
  span.textContent=label+": ";span.appendChild(out);box.appendChild(span);
  const input=document.createElement("input");input.type="range";
  Object.assign(input,{min,max,step});input.value=value;
  box.appendChild(input);$("controls").appendChild(box);
  const update=()=>{out.textContent=String(input.value);};input.addEventListener("input",update);update();return input;
}
function button(label,fn){const b=document.createElement("button");b.textContent=label;b.onclick=fn;$("controls").appendChild(b);return b;}
function select(label,options){const l=document.createElement("label");l.textContent=label;const s=document.createElement("select");
  options.forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;s.appendChild(o);});l.appendChild(s);$("controls").appendChild(l);return s;}
function setup(title,description,caveat,count=3){
  $("title").textContent=title.replace(/^\d+ \/ /, "");
  document.title=$("title").textContent+" — Interactive experiment";
  $("description").textContent=description;$("caveat").textContent=caveat;
  $("controls").replaceChildren();$("plots").replaceChildren();$("status").textContent="";
  $("plots").className="plots"+(count===2?" two":count===1?" one":"");
}

function weak() {
  setup("55 / Weak transport and conditional means",
    "Drag a red source or blue target in any panel. The left plan pays for every branch; the other two panels retain conditional means. Diamonds are barycenters.",
    "The weak problem is a convex quadratic program. Its Frank-Wolfe gap bounds the remaining objective error. More target points do not by themselves imply convex order. Counts change uniform atom weights; dragging never recenters either cloud.");
  const ns=slider("Source points",3,14,7),ms=slider("Target points",15,32,19);
  let x=D.weak.x.map(v=>[...v]),y=D.weak.y.map(v=>[...v]),p,
    q=D.weak.weak.map(row=>[...row]),state,a,b,token=0,drag=null;
  const panes=[plot("Quadratic OT multimap",[-2,2],[-1.5,1.5],false),
    plot("Barycentric projection of OT",[-2,2],[-1.5,1.5],false),
    plot("Weak-OT barycentric solution",[-2,2],[-1.5,1.5],false)];
  function render(gap=NaN,working=false) {
    if(!p || !q)return;
    const z=M.bary(p,y,a),w=M.bary(q,y,a),max=Math.max(...p.flat());
    panes.forEach((pane,k)=>{
      let s="";
      if(k===0) for(let i=0;i<x.length;i++)for(let j=0;j<y.length;j++)if(p[i][j]>1e-8)
        s+=pane.path([x[i],y[j]],GRAY,.4+2*p[i][j]/max,.65);
      else {}
      if(k>0){const zz=k===1?z:w,c=k===1?VIOLET:TEAL;
        zz.forEach((v,i)=>{s+=pane.path([x[i],v],c,1.7);const t=pane.project(v);s+=`<path d="M ${t[0]} ${t[1]-4} l 4 4 -4 4 -4 -4 Z" fill="${c}"/>`;});}
      y.forEach((v,j)=>{s+=dot(pane.project(v),BLUE,4.3,`data-cloud="y" data-index="${j}"`);});
      x.forEach((v,i)=>{s+=dot(pane.project(v),RED,5,`data-cloud="x" data-index="${i}"`);});
      pane.draw(s);
    });
    const strong=M.sum(p.map((row,i)=>M.sum(row.map((v,j)=>v*M.dist2(x[i],y[j])))));
    const meanx=[0,1].map(k=>M.sum(x.map((v,i)=>a[i]*v[k]))),meany=[0,1].map(k=>M.sum(y.map((v,j)=>b[j]*v[k])));
    $("status").textContent=`OT ${fmt(strong)} | weak ${fmt(M.objective(q,x,y,a))} | weak gap ${fmt(gap,3)} | RMS endpoint error ≤ ${fmt(Math.sqrt(Math.max(0,gap)),3)} | mass residual ${fmt(M.feasibility(q,a,b),2)} | mean lower bound ${fmt(M.dist2(meanx,meany),3)}${working?" | refining...":""}`;
  }
  function refine(budget=700) {
    const mine=++token;let count=0;
    function chunk(){if(mine!==token)return;
      let result;const start=performance.now();
      do {result=M.weakAwayStep(state,x,y,a,b);q=result.p;count++;}
      while(count<budget && result.gap>2e-7 && performance.now()-start<22);
      const gap=M.weakCertificate(q,x,y,a,b);render(gap,count<budget && gap>2e-7);
      if(count<budget && gap>2e-7)requestAnimationFrame(chunk);
    }requestAnimationFrame(chunk);
  }
  function recompute(budget=700) {
    token++;a=x.map(()=>1/x.length);b=y.map(()=>1/y.length);
    p=M.transport(x.map(v=>y.map(w=>M.dist2(v,w))),a,b);
    // Moving positions preserves feasibility of the old plan. Keep that warm
    // start; changing cardinalities requires a fresh feasible plan instead.
    if(!q || q.length!==a.length || q[0].length!==b.length)q=a.map(ai=>b.map(bj=>ai*bj));
    state={p:q,atoms:[q],weights:[1]};render();refine(budget);
  }
  button("Refine weak solution",()=>refine(3000));
  button("Reset clouds",()=>{
    x=D.weak.x.map(v=>[...v]);y=D.weak.y.map(v=>[...v]);q=D.weak.weak.map(v=>[...v]);
    ns.value=7;ms.value=19;
    ns.parentElement.querySelector("output").textContent="7";
    ms.parentElement.querySelector("output").textContent="19";
    recompute();
  });
  function counts(){const n=+ns.value,m=+ms.value,random=M.rng(55);
    x=Array.from({length:n},()=>[.38*M.gaussian(random),.25*M.gaussian(random)]);x[0]=[1.5,.35];
    y=Array.from({length:m},(_,j)=>[1.15*Math.cos(2*Math.PI*j/m),.9*Math.sin(2*Math.PI*j/m)]);recompute();}
  ns.addEventListener("input",counts);ms.addEventListener("input",counts);
  panes.forEach(pane=>{
    pane.svg.classList.add("draggable");
    const pointer=e=>{const r=pane.svg.getBoundingClientRect();return [(e.clientX-r.left)*380/r.width,(e.clientY-r.top)*290/r.height];};
    pane.svg.addEventListener("pointerdown",e=>{
      const t=pointer(e);let best=12;
      for(const [cloud,points] of [["x",x],["y",y]])points.forEach((v,i)=>{
        const d=Math.sqrt(M.dist2(t,pane.project(v)));if(d<best){best=d;drag={cloud,index:i};}
      });
      if(drag){token++;pane.svg.setPointerCapture(e.pointerId);e.preventDefault();}
    });
    pane.svg.addEventListener("pointermove",e=>{
      if(!drag)return;let v=pane.unproject(pointer(e));v=[Math.max(-1.9,Math.min(1.9,v[0])),Math.max(-1.4,Math.min(1.4,v[1]))];
      (drag.cloud==="x"?x:y)[drag.index]=v;recompute(60);
    });
    const release=()=>{if(drag){drag=null;refine(1200);}};
    pane.svg.addEventListener("pointerup",release);pane.svg.addEventListener("pointercancel",release);
  });
  cancel=()=>{token++;};recompute();
}

function clt(){
  const C=window.CLTDistribution,data=D.clt,cache=new Map();
  setup("Gaussian approximation of normalized sums",
    "Blue: symmetric Bernoulli. Red: continuous uniform. Increase the number of summands to compare the normalized sums with the same dashed standard Gaussian. The lower panels retain the Wasserstein errors and rescaled CDF errors.",
    "Both inputs have mean zero and variance one; the displayed sum is (X₁ + ⋯ + Xₙ)/√n. Bar height is probability divided by bar width, not a fitted rescaling. Blue bars spread exact binomial masses over their lattice cells of width 2/√n. Red bars average the continuous Irwin–Hall density over bins of width 0.25; the uniform input has not been discretized. The density panels share fixed axes. Tails outside the window are clipped without renormalizing. The distance curves are computed from CDF errors, not from the bars.",2);
  document.body.classList.add("clt-lab");
  const s=slider("Number of summands n",0,data.n.length-1,0);s.id="clt-n";
  const legend=document.createElement("p");legend.className="clt-legend";
  legend.innerHTML='<span><i class="clt-swatch clt-blue"></i>Bernoulli</span><span><i class="clt-swatch clt-red"></i>Continuous uniform</span><span><i class="clt-swatch clt-dashed"></i>Standard Gaussian (top panels)</span>';
  $("plots").before(legend);
  const densityTicks={x:[-4,-2,0,2,4].map(x=>[x,String(x)]),y:[0,.1,.2,.3,.4].map(y=>[y,String(y)])};
  const bernoulli=plot("Bernoulli sum: lattice masses / cell width",[-4.5,4.5],[0,.45],true,densityTicks);
  const uniform=plot("Uniform sum: probability / bin width",[-4.5,4.5],[0,.45],true,densityTicks);
  bernoulli.svg.id="clt-bernoulli";uniform.svg.id="clt-uniform";
  for(const pane of [bernoulli,uniform]){
    pane.svg.dataset.xMin="-4.5";pane.svg.dataset.xMax="4.5";pane.svg.dataset.yMin="0";pane.svg.dataset.yMax="0.45";
  }
  const p=plot("W₁ error versus n (log scales)",[0,Math.log10(192)],[-4,0],true,{
    x:[1,2,5,10,20,50,192].map(n=>[Math.log10(n),String(n)]),
    y:[[-4,"10⁻⁴"],[-3,"10⁻³"],[-2,"10⁻²"],[-1,"10⁻¹"],[0,"1"]]});
  const e=plot("Rescaled CDF errors: √n blue, n red",[-4,4],[-.42,.42]);
  p.svg.id="clt-rates";e.svg.id="clt-errors";
  const edges=Array.from({length:37},(_,i)=>-4.5+i/4);
  const normal=Array.from({length:361},(_,i)=>{const x=-4.5+i/40;return [x,C.normalPdf(x)];});
  function distributions(n){
    if(!cache.has(n)){
      const saved=data.profiles.find(profile=>profile.n===n);
      const x=saved?saved.x:Array.from({length:401},(_,i)=>-4+i/50);
      cache.set(n,{n,bernoulli:C.bernoulli(n),uniform:C.uniform(n,edges),
        error:x.map((value,i)=>[value,n*(saved?saved.uniform[i]:C.uniformCdf(n,value)-M.gaussianCDF(value))])});
    }return cache.get(n);
  }
  function drawDensity(pane,distribution,color){
    const id=pane.svg.id+"-clip";
    let shapes=`<defs><clipPath id="${id}"><rect x="40" y="30" width="320" height="220"/></clipPath></defs><g clip-path="url(#${id})">`;
    for(const bar of distribution.bars){
      const left=pane.project([bar.left,bar.height]),right=pane.project([bar.right,0]);
      shapes+=`<rect class="clt-bar" x="${left[0]}" y="${left[1]}" width="${right[0]-left[0]}" height="${right[1]-left[1]}" fill="${color}" fill-opacity=".65" stroke="white" stroke-width=".55" data-left="${bar.left}" data-right="${bar.right}" data-center="${bar.center}" data-mass="${bar.mass}" data-height="${bar.height}"><title>Interval [${bar.left.toFixed(3)}, ${bar.right.toFixed(3)}]: probability ${bar.mass.toPrecision(4)}</title></rect>`;
    }
    shapes+=`<polyline class="clt-gaussian" points="${normal.map(point=>pane.project(point).join(',')).join(' ')}" fill="none" stroke="#374751" stroke-width="2" stroke-dasharray="6 4"/></g>`;
    pane.draw(shapes+text([200,286],"normalized sum")+text([42,20],"density scale","start"));
  }
  let current;
  const redraw=()=>{
    const index=+s.value,n=data.n[index];current=distributions(n);let a="";
    s.parentElement.querySelector("output").textContent=String(n);
    s.setAttribute("aria-valuetext",n+" summands");
    drawDensity(bernoulli,current.bernoulli,BLUE);drawDensity(uniform,current.uniform,RED);
    for(const [key,col] of [["bernoulli",BLUE],["uniform",RED]]){
      a+=p.path(data.n.map((n,i)=>[Math.log10(n),Math.log10(data[key][i])]),col);
      a+=p.path(data.n.map(n=>[Math.log10(n),Math.log10(key==="bernoulli"?.5/Math.sqrt(n):data.uniformConstant/n)]),col,1,.55,"4 3");
      a+=dot(p.project([Math.log10(n),Math.log10(data[key][index])]),col,3.5);
    }p.draw(a);
    e.draw(e.path(M.bernoulliErrorCurve(n),BLUE,1.3)+e.path(current.error,RED,1.6));
    $("status").textContent=`n = ${n} · blue bar width = ${fmt(current.bernoulli.width,3)} · red bin width = 0.25 · Bernoulli √n W₁ = ${fmt(Math.sqrt(n)*data.bernoulli[index],6)} → 0.5 · uniform n W₁ = ${fmt(n*data.uniform[index],6)} → ${fmt(data.uniformConstant,6)}. Lower-left dashed curves: leading asymptotics; dots: selected n.`;
  };s.addEventListener("input",redraw);redraw();
  window.CLTExperiment=Object.freeze({getState:()=>({n:current.n,axes:{x:[-4.5,4.5],y:[0,.45]},bernoulli:current.bernoulli,uniform:current.uniform})});
}

function energy(){
  setup("9 / Energy-distance flows in 1D and 2D",
    "Move time forward along saved, energy-checked iterates. One dimension uses an implicit quantile update; the plane uses a mollified finite-particle flow.",
    "The planar experiment uses sqrt(|x-y|^2 + eta^2), eta = 0.002, and energy backtracking. The exact displacement-convexity theorem is one-dimensional. A fixed finite particle system is not a general representation of a nonsmooth measure-valued flow.");
  const s=slider("Time frame",0,100,0);
  const p=plot("1D quantiles and target quantiles",[0,1],[-3.2,2]);
  const q=plot("2D source (red), target (gray)",[-2.6,1.5],[-1.3,1.3],false);
  const e=plot("Energy / initial energy",[0,1],[0,1]);
  function redraw(){const a=D.energy.one,b=D.energy.two,k=+s.value;
    const i=Math.round(k*(a.q.length-1)/100),j=Math.round(k*(b.points.length-1)/100);
    const inv=r=>{let t=0;while(t<a.targetCDF.length-1 && a.targetCDF[t]<r)t++;
      if(t===0)return a.x[0];
      const weight=(r-a.targetCDF[t-1])/(a.targetCDF[t]-a.targetCDF[t-1]);
      return a.x[t-1]+weight*(a.x[t]-a.x[t-1]);};
    p.draw(p.path(a.q[i].map((v,z)=>[(z+.5)/a.q[i].length,v]),RED)+p.path(a.q[i].map((_,z)=>[(z+.5)/a.q[i].length,inv((z+.5)/a.q[i].length)]),BLUE,1.5));
    let ss=b.target.map(v=>dot(q.project(v),GRAY,1.5)).join("");
    b.points[j].forEach((v,z)=>{if(z%3===0)ss+=q.path(b.points.slice(0,j+1).map(row=>row[z]),TEAL,.8,.5);ss+=dot(q.project(v),RED,2.4);});q.draw(ss);
    e.draw(e.path(a.energy.map((v,z)=>[z/(a.energy.length-1),v/a.energy[0]]),TEAL)+e.path(b.energy.map((v,z)=>[z/(b.energy.length-1),v/b.energy[0]]),BLUE)
      +dot(e.project([i/(a.energy.length-1),a.energy[i]/a.energy[0]]),TEAL,3.5)+dot(e.project([j/(b.energy.length-1),b.energy[j]/b.energy[0]]),BLUE,3.5));
    $("status").textContent=`1D time ${fmt(a.times[i])}, energy ${fmt(a.energy[i])} | 2D time ${fmt(b.times[j])}, mollified energy ${fmt(b.energy[j])} | energy plot: normalized experiment time, teal 1D / blue 2D`;
  }s.addEventListener("input",redraw);redraw();
}

function composition(){
  setup("13 / Composition of Gaussian optimal transport maps",
    "Rotate the eigenbasis of the second symmetric positive-definite matrix. Each factor is a Brenier map, but their product need not be a gradient.",
    "The first two panels share the same continuous Gaussian target law. Their plotted endpoints need not coincide: these are different couplings, not permutations of a fixed target cloud. The last panel shows the exact expected excess cost, which is small but strictly positive away from the commuting angles.");
  const s=slider("Eigenbasis angle (degrees)",0,90,35);
  const random=M.rng(13),xs=Array.from({length:36},()=>[M.gaussian(random),M.gaussian(random)]);
  function matrices(degrees){const t=degrees*Math.PI/180,c=Math.cos(t),d=Math.sin(t);
    const B=[[3*c*c+d*d,2*c*d],[2*c*d,3*d*d+c*c]],A=[[2,0],[0,1]],BA=M.matmul(B,A);
    return [BA,M.sqrtSPD(M.matmul(BA,M.transpose(BA)))];
  }
  const cost=mat=>M.sum(mat.flatMap((r,i)=>r.map((v,j)=>(v-(i===j?1:0))**2)));
  const p=plot("Composition BA",[-1,1],[-1,1],false),q=plot("Direct Brenier map C",[-1,1],[-1,1],false);
  const gapplot=plot("Exact excess cost versus angle",[0,90],[0,.18]);
  const gapcurve=Array.from({length:181},(_,i)=>{const [BA,C]=matrices(i/2);return [i/2,Math.max(0,cost(BA)-cost(C))];});
  function redraw(){const [BA,C]=matrices(+s.value);
    const points=xs.concat(xs.map(x=>BA.map(row=>M.dot(row,x))),xs.map(x=>C.map(row=>M.dot(row,x))));
    const xr=[Math.min(...points.map(x=>x[0])),Math.max(...points.map(x=>x[0]))],yr=[Math.min(...points.map(x=>x[1])),Math.max(...points.map(x=>x[1]))];
    const margin=.12*Math.max(xr[1]-xr[0],yr[1]-yr[0]);
    for(const panel of [p,q])panel.fitGeometry([xr[0]-margin,xr[1]+margin],[yr[0]-margin,yr[1]+margin]);
    for(const [pane,mat] of [[p,BA],[q,C]]){let ss="";
      xs.forEach(x=>{const y=mat.map(row=>M.dot(row,x));ss+=pane.path([x,y],GRAY,1,.65)+dot(pane.project(x),RED,2.6)+dot(pane.project(y),BLUE,2.6);});pane.draw(ss);}
    gapplot.draw(gapplot.path(gapcurve,TEAL,2)+dot(gapplot.project([+s.value,Math.max(0,cost(BA)-cost(C))]),RED,4));
    $("status").textContent=`skew defect ${fmt(Math.SQRT2*Math.abs(BA[0][1]-BA[1][0]))} | exact Gaussian composition cost ${fmt(cost(BA))} | exact optimal cost ${fmt(cost(C))} | excess ${fmt(Math.max(0,cost(BA)-cost(C)))}`;
  }s.addEventListener("input",redraw);redraw();
}

function cdf(){
  setup("19 / A CDF-only formula for W2 squared",
    "Change either sinusoidal density on [0,1]. Red is α; dashed blue is β. Their cumulative distributions determine the colored integrand on the triangle x < y.",
    "The estimate is twice the integral of H over the colored triangle. Quadrature samples square cells at their midpoints and diagonal triangles at their centroids. The displayed heatmap uses at most 80 cells per axis and a fixed scale from 0 to 0.6. No inverse CDF is used.");
  document.body.classList.add("cdf-lab");
  const a=slider("Alpha amplitude λₐ",-.9,.9,.6,.05),b=slider("Beta amplitude λᵦ",-.9,.9,-.45,.05);
  const s=slider("Quadrature cells per axis",20,400,100,10);
  a.id="cdf-alpha";b.id="cdf-beta";s.id="cdf-resolution";
  const ticks=[0,.25,.5,.75,1].map(x=>[x,String(x)]);
  const p=plot("Densities ρₐ and ρᵦ",[0,1],[0,2],true,{x:ticks,y:[0,.5,1,1.5,2].map(y=>[y,String(y)])});
  const q=plot("Cumulative distributions",[0,1],[0,1],true,{x:ticks,y:ticks});
  const h=plot("CDF integrand H(x,y)",[0,1],[0,1],false);
  p.svg.id="cdf-density";q.svg.id="cdf-curves";h.svg.id="cdf-integrand";
  p.svg.setAttribute("aria-label","Densities on [0,1]: alpha in solid red, beta in dashed blue.");
  q.svg.setAttribute("aria-label","Cumulative distribution functions on [0,1]: alpha in solid red, beta in dashed blue.");
  h.svg.setAttribute("aria-label","CDF integrand H on the upper triangle x less than y, with color scale from zero to 0.6. The lower triangle is excluded.");
  const xs=Array.from({length:201},(_,i)=>i/200),integrandMax=.6,bins=48;
  const rgb=index=>{
    const t=index/(bins-1),lo=[245,251,250],hi=[0,98,106];
    return "rgb("+lo.map((value,i)=>Math.round(value+t*(hi[i]-value))).join(",")+")";
  };
  const palette=Array.from({length:bins},(_,i)=>rgb(i));
  const from=h.project([0,1]),to=h.project([1,0]),diagonalStart=h.project([0,0]),diagonalEnd=h.project([1,1]);
  const triangle=`${from.join(",")} ${diagonalEnd.join(",")} ${diagonalStart.join(",")}`;
  const formatPoint=point=>h.project(point).map(v=>v.toFixed(2)).join(" ");
  let integrandFrame= `<defs>
    <clipPath id="cdf-upper"><polygon points="${triangle}"/></clipPath>
    <pattern id="cdf-excluded-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#e6ebec"/><path d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6" stroke="#d6dedf" stroke-width="1"/>
    </pattern>
    <linearGradient id="cdf-scale" x1="0" y1="100%" x2="0" y2="0">
      <stop offset="0%" stop-color="${palette[0]}"/><stop offset="100%" stop-color="${palette[bins-1]}"/>
    </linearGradient>
  </defs>
  <rect x="${from[0]}" y="${from[1]}" width="${to[0]-from[0]}" height="${to[1]-from[1]}" fill="none" stroke="#95aaae" stroke-width="1"/>
  <rect x="329" y="70" width="13" height="130" rx="2" fill="url(#cdf-scale)" stroke="#9aafb0" stroke-width=".75"/>
  ${text([335,58],"H")}
  ${text([350,74],"0.6","start")}
  ${text([350,139],"0.3","start")}
  ${text([350,204],"0","start")}
  ${text(h.project([.69,.22]),"Excluded")}
  ${line([diagonalStart,diagonalEnd],"#698387",1,.9,"4 3")}`;
  for(const tick of [0,.5,1]){
    integrandFrame+=text([h.project([tick,0])[0],268],String(tick))
      +text([from[0]-8,h.project([0,tick])[1]+4],String(tick),"end");
  }
  integrandFrame+=text([200,286],"x")+text([53,145],"y");
  const integrandBackdrop=`<rect x="${from[0]}" y="${from[1]}" width="${to[0]-from[0]}" height="${to[1]-from[1]}" fill="url(#cdf-excluded-pattern)"/>
    <polygon points="${triangle}" fill="${palette[0]}"/>`;
  const drawCurves=(pane,alpha,beta)=>{
    const curve=(fn,name,color,width,dash="")=>pane.path(xs.map(x=>[x,fn(x)]),color,width,1,dash)
      .replace("<polyline ",`<polyline data-law="${name}" `);
    pane.draw(curve(alpha,"alpha",RED,3.2)+curve(beta,"beta",BLUE,2.4,"7 4")+text([200,286],"x"));
  };
  let current, pending=0;
  function redraw(){
    pending=0;
    const alpha=+a.value,beta=+b.value,n=+s.value;
    const lawA=M.sinusoidalLaw(alpha),lawB=M.sinusoidalLaw(beta);
    const F=lawA.cdf,G=lawB.cdf;
    drawCurves(p,lawA.density,lawB.density);drawCurves(q,F,G);
    const size=Math.min(n,80),shapes=Array(bins).fill("");
    let maxRenderedValue=0;
    for(let i=0;i<size;i++)for(let j=i;j<size;j++){
      const same=i===j, x=(i+(same?1/3:.5))/size, y=(j+(same?2/3:.5))/size;
      const value=M.cdfIntegrand(F,G,x,y);
      maxRenderedValue=Math.max(maxRenderedValue,value);
      const band=Math.min(bins-1,Math.round(value/integrandMax*(bins-1)));
      if(!band)continue;
      const corners=[[i/size,j/size],[i/size,(j+1)/size],[(i+1)/size,(j+1)/size]];
      if(!same)corners.push([(i+1)/size,j/size]);
      shapes[band]+="M "+corners.map(formatPoint).join(" L ")+" Z ";
    }
    const marks=shapes.map((d,i)=>d?`<path data-level="${i}" d="${d}" fill="${palette[i]}"/>`:"").join("");
    h.draw(integrandBackdrop+`<g id="cdf-heat" clip-path="url(#cdf-upper)" shape-rendering="crispEdges">${marks}</g>`+integrandFrame);
    const estimate=M.cdfSquaredDistance(F,G,n);
    const exact=alpha===beta?0:alpha===0||beta===0?3*(alpha+beta)**2/(8*Math.PI**2):null;
    current={alpha,beta,resolution:n,estimate,exact,integrandMax,meshSize:size,maxRenderedValue};
    const benchmark=exact===null?"":` · Exact benchmark ${fmt(exact,7)} · Absolute error ${fmt(Math.abs(estimate-exact),3)}`;
    $("status").textContent=`W₂² (CDF quadrature): ${fmt(estimate,8)}${benchmark} · ${n*(n+1)/2} integration cells`;
  }
  const schedule=()=>{if(!pending)pending=requestAnimationFrame(redraw);};
  [a,b,s].forEach(control=>control.addEventListener("input",schedule));
  cancel=()=>cancelAnimationFrame(pending);
  redraw();
  window.CDFExperiment=Object.freeze({getState:()=>({...current})});
}

function matchings(){
  setup("21 / Sampling and local descent for noncrossing matchings",
    "Alternate red and blue vertices on a convex ellipse. Explore the Catalan family uniformly, or take feasible pair swaps that decrease mean Euclidean length.",
    "The uncrossing theorem and this experiment use Euclidean length, not arbitrary powers of it. Greedy feasible swaps have no global-optimality guarantee. Uniform global proposals visit the entire noncrossing family; each displayed configuration is checked.",2);
  const s=slider("Pairs",3,16,10);const random=M.rng(21);let x,y,p,best,opt,current,history=[];
  const panel=plot("Current noncrossing matching",[-1.85,1.85],[-1.3,1.3],false);
  const curve=plot("Visited cost (teal), exact optimum (blue)",[0,100],[0,3]);
  const cost=pp=>M.sum(x.map((v,i)=>Math.sqrt(M.dist2(v,y[pp[i]]))))/x.length;
  function draw(){let ss="";x.forEach((v,i)=>ss+=panel.path([v,y[p[i]]],GRAY,1.2));
    x.forEach(v=>ss+=dot(panel.project(v),RED,4));y.forEach(v=>ss+=dot(panel.project(v),BLUE,4));panel.draw(ss);
    const hh=history.slice(-101);curve.draw(curve.path(hh.map((v,i)=>[i,v]),TEAL)+curve.path([[0,opt],[100,opt]],BLUE));
    $("status").textContent=`Catalan count ${Math.round(M.catalan(x.length)).toLocaleString()} | current ${fmt(cost(p))} | best visited ${fmt(best)} | global optimum ${fmt(opt)} | proper crossings ${M.crossing(x,y,p)?"ERROR":"none"}`;
  }
  function record(){current=cost(p);best=Math.min(best,current);history.push(current);draw();}
  function setCloud(all,matching){const n=all.length/2;
    x=all.filter((_,i)=>i%2===0);y=all.filter((_,i)=>i%2===1);p=matching||M.sampleMatching(n,random);
    const c=x.map(v=>y.map(w=>Math.sqrt(M.dist2(v,w))));const z=M.transport(c,x.map(()=>1/n),y.map(()=>1/n));
    opt=M.sum(z.map((row,i)=>M.sum(row.map((v,j)=>v*c[i][j]))));best=Infinity;history=[];record();
  }
  function reset(){const n=+s.value,rr=M.rng(21);
    setCloud(Array.from({length:2*n},(_,i)=>{const a=i*Math.PI/n+(rr()-.5)*.08;return [1.6*Math.cos(a),Math.sin(a)];}));
  }
  button("Uniform random matching",()=>{p=M.sampleMatching(x.length,random);record();});
  button("Try 500 downhill swaps",()=>{
    for(let z=0;z<500;z++){const n=x.length,i=Math.floor(random()*n);let j=Math.floor(random()*(n-1));if(j>=i)j++;
      const q=[...p];[q[i],q[j]]=[q[j],q[i]];
      if(!M.crossing(x,y,q) && cost(q)<cost(p)-1e-12)p=q;
    }record();
  });
  button("Explore 100 random matchings",()=>{for(let z=0;z<100;z++){p=M.sampleMatching(x.length,random);current=cost(p);best=Math.min(best,current);history.push(current);}draw();});
  button("Load three-pair trap",()=>{
    s.value=3;s.parentElement.querySelector("output").textContent="3";
    setCloud([1/12,1/3,2/3,1,4/3,5/3].map(t=>[Math.cos(Math.PI*t),Math.sin(Math.PI*t)]),[2,0,1]);
  });
  s.addEventListener("input",reset);reset();
}

function bernstein(){
  setup("Bernstein approximation of quantiles",
    "Move the slider to change the locations and weights of a two-Gaussian mixture. Five population quantiles on the left match the five Bernstein bias curves on the right.",
    "The right plot takes the absolute value after averaging the sample quantile, not the average of absolute sampling errors. Sample sizes are multiples of 20, so nt is an integer for each displayed level and the empirical rank ⌈nt⌉ equals nt. The expectations are computed by quadrature, without sampling or smoothing. The gray dashed 1/n guide is a reference slope, not a fit. Only interior levels are shown, and errors below 10⁻⁶ would be drawn at 10⁻⁶.",2);
  document.body.classList.add("bernstein-lab");
  const s=slider("Mixture shape", -1,1,.2,.05);s.id="bernstein-mixture";
  const colors=["#225f98","#087468","#b84d28","#795293","#88620c"];
  const dashes=["","5 3","","7 3 2 3","3 3"];
  const densityDomain={x:[-4,4],y:[0,.7]},sampleSizes=M.bernsteinQuantileRateSizes,errorFloor=1e-6;
  const minN=sampleSizes[0],maxN=sampleSizes.at(-1),errorDomain={x:[minN,maxN],y:[errorFloor,1]};
  const density=plot("Mixture density and population quantiles",densityDomain.x,densityDomain.y,true,{
    x:[-4,-2,0,2,4].map(v=>[v,String(v)]),y:[0,.2,.4,.6].map(v=>[v,String(v)])});
  const errors=plot("Absolute quantile bias (log–log)",errorDomain.x.map(Math.log10),errorDomain.y.map(Math.log10),true,{
    x:[[20,"20"],[100,"100"],[1000,"1k"],[10000,"10k"],[20000,"20k"]].map(([n,label])=>[Math.log10(n),label]),
    y:[[-6,"10⁻⁶"],[-4,"10⁻⁴"],[-2,"10⁻²"],[0,"1"]]});
  density.svg.id="bernstein-density";errors.svg.id="bernstein-errors";
  density.svg.setAttribute("aria-label","Density of the two-Gaussian mixture with five colored population quantiles.");
  errors.svg.setAttribute("aria-label","Absolute bias of Bernstein quantile estimates on logarithmic axes, with sample sizes 20 through 20,000 and a dashed slope-minus-one guide.");
  const legend=document.createElement("p");legend.className="bernstein-legend";$("plots").before(legend);
  const coordinates=Array.from({length:301},(_,i)=>-4+8*i/300);
  const guideColor="#59686e",guideDash="6 4";
  const guide=errors.path([minN,maxN].map(n=>[Math.log10(n),Math.log10(.25/n)]),guideColor,1.65,.85,guideDash)
    .replace("<polyline ","<polyline class=\"bernstein-rate-guide\" ");
  const swatch=(color,dash)=>`<svg viewBox="0 0 24 9" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" stroke="${color}" stroke-width="2.2"${dash?` stroke-dasharray="${dash}"`:""}/></svg>`;
  const models=new Map();let current=null,pending=0;
  function redraw(){
    pending=0;
    const shape=+s.value;
    if(!models.has(shape))models.set(shape,M.bernsteinQuantileExperiment(shape,{sampleSizes,intervals:4800}));
    const {law,levels,curves}=models.get(shape);
    const profile=coordinates.map(x=>[x,law.density(x)]);
    const area=[[densityDomain.x[0],0],...profile,[densityDomain.x[1],0]];
    const areaPath=area.map((xy,i)=>(i===0?"M ":"L ")+density.project(xy).join(" ")).join(" ");
    let left=`<path d="${areaPath} Z" fill="#e6f3f1"/>`+
      density.path(profile,"#27716f",2.4).replace("<polyline ","<polyline class=\"bernstein-density-curve\" ");
    let right=guide;
    curves.forEach(({t,quantile,points},i)=>{
      const color=colors[i],p0=density.project([quantile,0]),p1=density.project([quantile,law.density(quantile)]);
      left+=`<line class="bernstein-quantile-guide" data-t="${t}" x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}"
        stroke="${color}" stroke-width="1.7" stroke-dasharray="4 3"/>`
        +dot(p1,color,4.2,`class="bernstein-quantile" data-t="${t}" stroke="white" stroke-width="1"`);
      right+=errors.path(points.map(({n,error})=>[Math.log10(n),Math.log10(Math.max(errorFloor,error))]),color,1.65,1,dashes[i])
        .replace("<polyline ",`<polyline class="bernstein-error-curve" data-t="${t}" `);
    });
    density.draw(left+text([200,286],"Location x"));
    errors.draw(right+text([200,286],"Sample size n"));
    legend.innerHTML=levels.map((t,i)=>`<span>${swatch(colors[i],dashes[i])}t = ${t.toFixed(2)}${t===.5?" (median)":""}</span>`).join("")
      +`<span>${swatch(guideColor,guideDash)}1/n guide</span>`;
    const list=values=>values.map(x=>x.toFixed(2)).join(", ");
    const median=curves.find(curve=>curve.t===.5).points.at(-1);
    $("status").textContent=`Component means: ${list(law.means)} · weights: ${list(law.weights)} · common standard deviation: ${law.sigma.toFixed(2)} · signed median bias at n = ${maxN.toLocaleString("en-US")}: ${fmt(median.signedError,4)}`;
    current={shape,law:{means:law.means,weights:law.weights,sigma:law.sigma},levels,curves,sampleSizes,densityDomain,errorDomain,errorFloor};
  }
  s.addEventListener("input",()=>{if(!pending)pending=requestAnimationFrame(redraw);});
  cancel=()=>cancelAnimationFrame(pending);
  redraw();
  window.BernsteinQuantileApp=Object.freeze({getState:()=>current});
}

function quantization(){
  setup("34 / Optimal particle placement and independent sampling",
    "The target is uniform on [0,1]. Deterministic equal-weight optimizers are interval midpoints. The blue empirical law uses i.i.d. uniform points.",
    "The blue error is one realization, not its expectation. The exact expected squared error is 1/(6n); the optimal deterministic error is 1/(12n^2). The power comparison is for this regular one-dimensional setting.",2);
  const s=slider("Particle count n",2,150,18);let seed=34;
  const p=plot("CDFs: random (blue), optimal (teal)",[0,1],[0,1]);
  const q=plot("Squared W₂ error (log scales)",[Math.log10(2),Math.log10(256)],[-7,-.7],true,{
    x:[2,10,50,256].map(n=>[Math.log10(n),String(n)]),
    y:[[-7,"10⁻⁷"],[-5,"10⁻⁵"],[-3,"10⁻³"],[-1,"10⁻¹"]]});
  function redraw(){const n=+s.value,rr=M.rng(seed),xs=Array.from({length:n},()=>rr()).sort((a,b)=>a-b),zs=xs.map((_,i)=>(i+.5)/n);
    const stairs=arr=>{const v=[[0,0]];arr.forEach((x,i)=>v.push([x,i/n],[x,(i+1)/n]));v.push([1,1]);return v;};
    p.draw(p.path([[0,0],[1,1]],GRAY,.8)+p.path(stairs(xs),BLUE,1.5)+p.path(stairs(zs),TEAL,1.5));
    const er=M.uniformQuantization(xs),opt=1/(12*n*n);
    const nn=Array.from({length:100},(_,i)=>2*Math.exp(i*Math.log(128)/99));
    q.draw(q.path(nn.map(n=>[Math.log10(n),Math.log10(1/(6*n))]),BLUE)+q.path(nn.map(n=>[Math.log10(n),Math.log10(1/(12*n*n))]),TEAL)
      +dot(q.project([Math.log10(n),Math.log10(er)]),BLUE,4));
    $("status").textContent=`random realization ${fmt(er)} | random expectation ${fmt(1/(6*n))} | optimal ${fmt(opt)} | seed ${seed} | right: lines are exact rates, blue dot is one realization`;
  }button("Resample random particles",()=>{seed++;redraw();});s.addEventListener("input",redraw);redraw();
}

function monge(){
  setup("1 / Inversions as a convex regression penalty",
    "Increase the Monge-gap weight. Red observations are fitted by a Gaussian-kernel regressor; the gray line sorts the fitted values without changing their empirical law.",
    "Damped Newton minimizes a smooth hinge with delta = 0.015. Strong convexity bounds its remaining objective error (reported with a 10⁻¹² roundoff floor). The displayed Monge gap uses the exact nonsmooth inversion formula; the bound concerns the smooth objective only. Sorting and monotone regression differ.",1);
  const s=slider("Penalty exponent (gamma = 10^value)",-3,2,-3,.1);
  const p=plot("Kernel fit (teal), sorted evaluations (gray)",[0,1],[-.6,1.8]);
  const n=24,x=Array.from({length:n},(_,i)=>i/(n-1)),rr=M.rng(1);
  const y=x.map(t=>t+.45*Math.sin(3*Math.PI*t)+.12*M.gaussian(rr));
  const model=M.mongeRegression(y);
  function redraw(){const gamma=10**(+s.value),solution=model.fit(gamma),t=solution.values;
    const sorted=[...t].sort((a,b)=>a-b);
    let ss=p.path(Array.from({length:301},(_,i)=>[i/300,solution.predict(i/300)]),TEAL,2)+p.path(x.map((v,i)=>[v,sorted[i]]),GRAY,1.3);
    x.forEach((v,i)=>ss+=dot(p.project([v,y[i]]),RED,3));p.draw(ss);
    const gap=M.uniformMongeGap(t);
    const direct=M.sum(x.map((v,i)=>(v-t[i])**2-(v-sorted[i])**2))/n;
    $("status").textContent=`gamma ${fmt(gamma)} | exact Monge gap ${fmt(gap)} | cost-difference check ${fmt(Math.abs(gap-direct),2)} | smooth objective error bound ≤ ${fmt(Math.max(1e-12,solution.errorBound),3)} | Newton steps ${solution.iterations}`;
  }s.addEventListener("input",redraw);redraw();
}

function moments(){
  setup("2 / Autonomous signed-distance moments",
    "The observable is signed distance to the unit circle, phi(x) = |x| - 1. Both clouds have initial mean signed distance 0.2. Their shapes differ but their moment follows the same scalar equation.",
    "For f(alpha) = (integral phi d alpha)^2 / 2, the exact velocity is minus the moment times the radial unit vector. Here m(t) = 0.2 exp(-t). These analytic trajectories stay inside a smooth annulus; no global signed-distance regularity is assumed.");
  const s=slider("Time",0,5,0,.025);
  const a=plot("Cloud A",[-1.5,1.5],[-1.5,1.5],false),b=plot("Cloud B",[-1.5,1.5],[-1.5,1.5],false),c=plot("Common signed-distance moment",[0,5],[0,.22]);
  const n=40,angles=Array.from({length:n},(_,i)=>2*Math.PI*i/n);
  const r0=[angles.map(t=>.2+.05*Math.cos(3*t)),angles.map(t=>.2+.14*Math.cos(5*t))];
  function redraw(){const t=+s.value,shift=.2*(1-Math.exp(-t));
    for(const [k,pane] of [[0,a],[1,b]]){
      let ss=pane.path(Array.from({length:101},(_,i)=>[Math.cos(2*Math.PI*i/100),Math.sin(2*Math.PI*i/100)]),GRAY,1);
      angles.forEach((v,i)=>{const x=[(1+r0[k][i])*Math.cos(v),(1+r0[k][i])*Math.sin(v)],y=[(1+r0[k][i]-shift)*Math.cos(v),(1+r0[k][i]-shift)*Math.sin(v)];
        ss+=pane.path([x,y],GRAY,1)+dot(pane.project(y),k?BLUE:TEAL,3);});pane.draw(ss);
    }
    c.draw(c.path(Array.from({length:101},(_,i)=>[i/20,.2*Math.exp(-i/20)]),TEAL,2)+dot(c.project([t,.2*Math.exp(-t)]),RED,4));
    const ma=M.sum(r0[0].map(r=>r-shift))/n,mb=M.sum(r0[1].map(r=>r-shift))/n;
    $("status").textContent=`cloud A moment ${fmt(ma,7)} | cloud B moment ${fmt(mb,7)} | exact ODE ${fmt(.2*Math.exp(-t),7)} | difference ${fmt(Math.abs(ma-mb),2)}`;
  }s.addEventListener("input",redraw);redraw();
}

function caps(){
  setup("5 / Density bounds along Wasserstein geodesics",
    "Choose the number of Gaussian components in the red source and blue target independently. Teal is their quadratic Wasserstein interpolation. The dashed line is a common endpoint density cap; the vertical scale follows the density values.",
    "Each mixture is normalized on the whole real line. Gaussian CDFs are inverted by bisection; the intermediate density is the harmonic interpolation of endpoint densities at matched quantiles. The graph omits at most 2 × 10⁻⁹ of mass, without truncating or renormalizing either law. No density cap is imposed by the computation.",2);
  $("controls").classList.add("mixture-count-controls");
  const s=slider("Geodesic time",0,1,.5,.01),bandwidth=slider("Gaussian bandwidth σ",.1,.32,.22,.005);
  const sourceCount=slider("Source components k₀",1,8,2,1),targetCount=slider("Target components k₁",1,8,2,1);
  let scene=M.gaussianDensityCapScene(+bandwidth.value,501,+sourceCount.value,+targetCount.value);
  function redraw(){const t=+s.value,current=M.gaussianDensityCapGeodesic(scene,t),cap=scene.cap;
    $("plots").replaceChildren();
    const p=plot("Densities: red ρ₀ · teal ρₜ · blue ρ₁",[scene.xmin,scene.xmax],[0,1.025*cap]);
    const q=plot("Quantiles: red Q₀ · teal Qₜ · blue Q₁",[0,1],[scene.xmin,scene.xmax]);
    p.svg.dataset.yMin="0";p.svg.dataset.yMax=String(1.025*cap);p.svg.dataset.cap=String(cap);
    let density="",quantiles="";
    for(const [law,qq,col] of [[scene.source,scene.q0,RED],[scene.target,scene.q1,BLUE]]){
      density+=p.path(scene.x.map(x=>[x,law.density(x)]),col,1.65,.65);
      quantiles+=q.path(scene.r.map((r,i)=>[r,qq[i]]),col,1.65,.65);
    }
    density+=p.path([[scene.xmin,cap],[scene.xmax,cap]],GRAY,1,1,"5 4");
    density+=p.path(current.points,TEAL,2.3);
    quantiles+=q.path(current.quantiles,TEAL,2.3);p.draw(density);q.draw(quantiles);
    $("status").textContent=`source ${scene.sourceCount} components | target ${scene.targetCount} components | time ${t.toFixed(2)} | bandwidth ${scene.sigma.toFixed(3)} | sampled intermediate peak ${fmt(current.peak,5)} ≤ certified cap ${fmt(cap,5)} | total mass 1`;
    window.DensityCapsExperiment={getState:()=>({time:t,bandwidth:scene.sigma,sourceCount:scene.sourceCount,targetCount:scene.targetCount,cap,peak:current.peak,yMax:1.025*cap,rankSamples:scene.r.length,omittedTailMass:2*scene.tail})};
  }
  s.addEventListener("input",redraw);
  for(const control of [bandwidth,sourceCount,targetCount])control.addEventListener("input",()=>{scene=M.gaussianDensityCapScene(+bandwidth.value,501,+sourceCount.value,+targetCount.value);redraw();});redraw();
}

function independence(){
  setup("When independence is optimal",
    "Rotate the blue support toward the vertical axis, then move mass around the 2 × 2 coupling. Line thickness shows mass. Red marks the independent plan; teal marks the selected plan.",
    "Both marginals have two atoms of mass 1/2. Write t = π₁₁ = π₂₂ and π₁₂ = π₂₁ = 1/2 − t. Independence is t = 1/4. At 90°, the two support directions are orthogonal: every coupling has exactly the same cost.",2);
  const angle=slider("Support angle (degrees)",0,90,35,1),mass=slider("Diagonal mass t",0,.5,.25,.005);
  const geometry=plot("Coupling: red sources, blue targets",[-1.35,1.35],[-1.35,1.35],false);
  const costplot=plot("Squared transport cost versus t",[0,.5],[0,4.2]);
  function redraw(){
    const theta=+angle.value*Math.PI/180,c=Math.abs(Math.cos(theta))<1e-14?0:Math.cos(theta),s=Math.sin(theta),t=+mass.value;
    const x=[[-1,0],[1,0]],y=[[-c,-s],[c,s]],plan=M.twoPointPlan(.5,.5,t);
    const costs=x.map(v=>y.map(w=>M.dist2(v,w))),optimal=M.twoPointTransport(.5,.5,costs);
    const value=u=>2+2*c-8*u*c;let drawing="";
    for(let i=0;i<2;i++)for(let j=0;j<2;j++)if(plan[i][j]>1e-12)drawing+=geometry.path([x[i],y[j]],TEAL,1+9*plan[i][j],.65);
    x.forEach((v,i)=>{drawing+=dot(geometry.project(v),RED,6)+text(geometry.project([v[0],v[1]-.18]),"x"+(i+1));});
    y.forEach((v,i)=>{drawing+=dot(geometry.project(v),BLUE,4)+text(geometry.project([v[0],v[1]+.18]),"y"+(i+1));});geometry.draw(drawing);
    costplot.draw(costplot.path([[0,value(0)],[.5,value(.5)]],TEAL,2)+dot(costplot.project([.25,value(.25)]),RED,5)+dot(costplot.project([optimal.t,optimal.value]),BLUE,5)+dot(costplot.project([t,value(t)]),TEAL,4));
    $("status").textContent=`selected cost ${fmt(value(t))} | independent cost 2 | optimal cost ${fmt(optimal.value)} | cross-difference ${fmt(optimal.slope)} | independent excess ${fmt(2-optimal.value)}`;
  }
  button("Return to independence",()=>{mass.value=.25;mass.dispatchEvent(new Event("input"));});
  angle.addEventListener("input",redraw);mass.addEventListener("input",redraw);redraw();
}

function envelope(){
  setup("The convex envelope of four pointwise costs",
    "A law on {0, 1} is specified by its mass at 1. Move the two probabilities to explore the exact transport surface |a − b|. The blue curve shows a smaller convex extension that still agrees at all four Dirac pairs.",
    "Teal: the largest convex extension, W₂² = |a − b|. Blue: max(0, |a − b| − 0.6[a(1 − a) + b(1 − b)]). The four corners represent pairs of Dirac measures; their costs are 0, 1, 1, 0. Everything shown here is evaluated exactly.",2);
  const sa=slider("Source probability a",0,1,.7,.01),sb=slider("Target probability b",0,1,.3,.01);
  const surface=plot("Largest convex extension",[0,1],[0,1],false);
  const slice=plot("Slice at the selected b",[0,1],[0,1.05]);
  const project=(a,b,z)=>[190+140*(a-b),170+50*(a+b)-135*z];
  const poly=(points,color,opacity)=>`<polygon points="${points.map(p=>project(...p).join(",")).join(" ")}" fill="${color}" opacity="${opacity}"/>`;
  function redraw(){const a=+sa.value,b=+sb.value,z=M.convexEnvelope(a,b);
    let drawing=poly([[0,0,0],[1,0,0],[1,1,0],[0,1,0]],"#dce7e7",.6);
    drawing+=poly([[0,0,0],[1,0,1],[1,1,0]],TEAL,.83)+poly([[0,0,0],[1,1,0],[0,1,1]],"#55a6a0",.9);
    for(const side of [[[0,0,0],[1,0,1]],[[1,0,1],[1,1,0]],[[1,1,0],[0,1,1]],[[0,1,1],[0,0,0]],[[0,0,0],[1,1,0]]])drawing+=line(side.map(v=>project(...v)),"#356369",.7,.5);
    const curve=Array.from({length:101},(_,i)=>[i/100,b,Math.abs(i/100-b)]);
    drawing+=line(curve.map(v=>project(...v)),"#f2e2a2",2);
    drawing+=line([project(a,b,0),project(a,b,z)],RED,1.1,.8)+dot(project(a,b,z),RED,4.5);
    for(const [x,y,value] of [[0,0,0],[1,0,1],[1,1,0],[0,1,1]])drawing+=dot(project(x,y,value),"#24474c",3);
    drawing+=text([273,258],"a = 1")+text([92,258],"b = 1")+text([190,159],"(0, 0)")+text([339,79],"cost 1","end")+text([39,79],"cost 1","start");
    surface.draw(drawing);
    const grid=Array.from({length:301},(_,i)=>i/300);
    slice.draw(slice.path(grid.map(x=>[x,M.convexEnvelope(x,b)]),TEAL,2)+slice.path(grid.map(x=>[x,M.convexEnvelope(x,b,.6)]),BLUE,1.7)+dot(slice.project([a,z]),RED,4.5));
    $("status").textContent=`a ${fmt(a,3)} | b ${fmt(b,3)} | transport value ${fmt(z)} | smaller convex extension ${fmt(M.convexEnvelope(a,b,.6))} | common mass on the diagonal ${fmt(1-z)}`;
  }
  sa.addEventListener("input",redraw);sb.addEventListener("input",redraw);redraw();
}

function gaussian(){
  const G=window.GaussianSinkhorn,V=window.GaussianSinkhornView;
  setup("Gaussian Sinkhorn coupling",
    "Change ε, then move through complete Sinkhorn cycles. The joint ellipse is shown with its x marginal above and its y marginal on the left.",
    "Both target marginals are N(0,1). Each ellipse has Mahalanobis radius 2 (about 86.5% joint probability). All spatial axes stay fixed at [−4.5,4.5], with equal units in x and y. The density scales also stay fixed; Gaussian tails outside the window are omitted, not renormalized. One full cycle corrects both marginals, ending with y, so its marginal is already exact.",2);
  document.body.classList.add("gaussian-lab");
  const temperature=slider("Regularization ε (log scale)",-3,1,-1,.02);
  const cycle=slider("Full cycles k",0,70,0,1);
  temperature.id="gs-epsilon";cycle.id="gs-cycle";
  let running=false,frame=0,last=0,horizon=1,curve=[],state,target,epsilon=.1;
  const legend=document.createElement("p");legend.className="gs-legend";
  legend.innerHTML='<span><i class="gs-swatch"></i>Current iterate</span><span><i class="gs-swatch gs-dashed"></i>Exact solution</span>';
  $("plots").before(legend);
  function panel(title,id,viewBox,note){
    const wrap=document.createElement("div");wrap.className="plot";
    const h=document.createElement("h3");h.textContent=title;wrap.appendChild(h);
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.id=id;svg.setAttribute("viewBox",viewBox);svg.setAttribute("role","img");svg.setAttribute("aria-label",title);
    wrap.appendChild(svg);
    const caption=document.createElement("p");caption.className="gs-panel-note";caption.textContent=note;wrap.appendChild(caption);
    $("plots").appendChild(wrap);return svg;
  }
  const joint=panel("Joint coupling and marginals","gs-coupling","0 0 500 530","The y marginal already equals its target; the solid and dashed curves coincide.");
  const decay=panel("First-marginal error","gs-error","0 0 430 530","The dot marks the selected cycle. Lines connect errors at integer cycles.");
  for(const dimension of ["x","y"]){joint.dataset[dimension+"Min"]="-4.5";joint.dataset[dimension+"Max"]="4.5";}
  const play=button("Play cycles",()=>{
    if(running){stop();return;}
    if(+cycle.value>=horizon)cycle.value=0;
    running=true;play.textContent="Pause";last=0;frame=requestAnimationFrame(animate);
  });
  button("Restart",()=>{stop();cycle.value=0;render();});
  function stop(){running=false;cancelAnimationFrame(frame);play.textContent="Play cycles";}
  function animate(now){
    if(!running)return;
    if(now-last>85){cycle.value=Math.min(horizon,+cycle.value+Math.max(1,Math.ceil(horizon/220)));last=now;render();}
    if(+cycle.value>=horizon)stop();else frame=requestAnimationFrame(animate);
  }
  function rebuild(){
    stop();epsilon=10**+temperature.value;
    const p=G.parameters(1,1,epsilon);
    horizon=Math.ceil(Math.log(1e-6)/p.logq);
    cycle.max=horizon;cycle.value=Math.min(+cycle.value,horizon);
    curve=G.trajectory(1,1,epsilon,2,horizon);
    target=G.state(1,1,epsilon,1,0);
    temperature.parentElement.querySelector("output").textContent=fmt(epsilon,3);
    temperature.setAttribute("aria-valuetext","epsilon "+fmt(epsilon,3));
    render();
  }
  function render(){
    const k=+cycle.value;
    state=curve[k];
    cycle.parentElement.querySelector("output").textContent=k+" / "+horizon;
    cycle.setAttribute("aria-valuetext",k+" complete cycles out of "+horizon);
    joint.innerHTML=V.coupling(state,target);
    decay.innerHTML=V.error(curve,state,horizon);
    $("status").textContent=`ε = ${fmt(epsilon,3)} · k = ${k} · Var(Xₖ) = ${fmt(state.xVariance,5)} → 1 · Var(Yₖ) = 1 · marginal variance error = ${fmt(Math.abs(state.relativeMarginalError),3)}`;
  }
  temperature.addEventListener("input",rebuild);
  cycle.addEventListener("input",()=>{stop();render();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(document.querySelector("main"));
  window.GaussianSinkhornExperiment=Object.freeze({getState:()=>({
    epsilon,k:+cycle.value,horizon,axes:{x:[...V.bounds],y:[...V.bounds]},state,target,playing:running
  })});
  cancel=stop;rebuild();
}

function sgd(){
  const S=window.SGDCovariance,ORANGE="#ba7b25";
  setup("The covariance of constant-step SGD",
    "Red: steep direction (λ₁ = 1). Blue: flat direction (λ₂ = 1/κ). Solid curves show exact moments. Dashed curves show the leading transient in the middle panel and the second-order stationary expansion on the right.",
    "Gaussian features, observation-noise variance 1, squared loss without 1/2, and initialization at the minimizer. Covariance ellipses: current (teal), exact stationary (gray dashed), first-order stationary unit circle (orange dotted). They share an automatically fitted, equal-axis view, and are not density contours. The sufficient stability bound is R = λ₁ + λ₂ + 2 max(λ₁,λ₂); the sliders stay strictly below ηR = 1. No Monte Carlo estimation is used.");
  const fraction=slider("Safe step fraction ηR",.01,.9,.25,.01);
  const anisotropy=slider("Curvature ratio κ",1,20,5,1);
  const iteration=slider("Iteration k",0,100,0,1);
  let model,panes=[],eta=0,lambda2=0,horizon=1,extent=1,frame=0,last=0,running=false;
  const play=button("Play iterations",()=>{
    if(running){stop();return;}
    if(+iteration.value>=horizon)iteration.value=0;
    running=true;play.textContent="Pause";last=0;frame=requestAnimationFrame(animate);
  });
  button("Restart",()=>{stop();iteration.value=0;render();});
  function stop(){running=false;cancelAnimationFrame(frame);play.textContent="Play iterations";}
  function animate(now){
    if(!running)return;
    if(now-last>65){iteration.value=Math.min(horizon,+iteration.value+Math.max(1,Math.ceil(horizon/180)));last=now;render();}
    if(+iteration.value>=horizon)stop();else frame=requestAnimationFrame(animate);
  }
  function rebuild(){
    stop();lambda2=1/+anisotropy.value;eta=+fraction.value/(3+lambda2);
    model=S.parameters(1,lambda2,eta);
    horizon=Math.max(Math.ceil(2/(lambda2*eta)),Math.ceil(Math.log(.001)/model.logSpectralRadius));
    iteration.max=horizon;iteration.value=Math.round(.08*horizon);
    $("plots").replaceChildren();
    const maxVariance=1.1*Math.max(...model.stationary.map(v=>v/eta),1);
    extent=1.3*Math.sqrt(maxVariance/1.1);
    panes=[plot("Covariance ellipses, scaled by 1/√η",[-extent,extent],[-extent,extent],false),
      plot("Variance / η versus time t = kη",[0,horizon*eta],[0,maxVariance]),
      plot("Stationary variance / η versus ηR",[0,.9],[0,10.5],true,{x:[[0,"0"],[.3,"0.3"],[.6,"0.6"],[.9,"0.9"]],y:[0,2,4,6,8,10].map(v=>[v,String(v)])})];
    render();
  }
  function render(){
    const k=+iteration.value,state=S.state(1,lambda2,eta,1,k),[ellipses,transient,stationary]=panes;
    iteration.parentElement.querySelector("output").textContent=k+" / "+horizon;
    const ellipse=(variances,color,width,dash="")=>ellipses.path(Array.from({length:161},(_,i)=>{
      const t=2*Math.PI*i/160;
      return [Math.sqrt(Math.max(0,variances[0]/eta))*Math.cos(t),Math.sqrt(Math.max(0,variances[1]/eta))*Math.sin(t)];
    }),color,width,1,dash);
    ellipses.draw(ellipses.path([[-.92*extent,0],[.92*extent,0]],GRAY,.6,.4)+ellipses.path([[0,-.92*extent],[0,.92*extent]],GRAY,.6,.4)
      +text(ellipses.project([.92*extent,-.12*extent]),"e₁")+text(ellipses.project([.12*extent,.92*extent]),"e₂")
      +ellipse(model.stationary,GRAY,2.4,"5 3")+ellipse(model.firstOrder,ORANGE,1.5,"2 3")
      +ellipse(state.variances,TEAL,2)+dot(ellipses.project([0,0]),TEAL,2));
    const ks=Array.from(new Set(Array.from({length:241},(_,i)=>Math.round(horizon*i/240))));
    const states=ks.map(j=>S.state(1,lambda2,eta,1,j));
    let curves="",comparison=stationary.path([[0,1],[.9,1]],GRAY,1,.7,"2 3");
    const steps=Array.from({length:181},(_,i)=>.001+.899*i/180);
    const models=steps.map(h=>S.parameters(1,lambda2,h/model.R));
    [RED,BLUE].forEach((color,i)=>{
      curves+=transient.path(states.map(t=>[t.time,t.leadingTransient[i]/eta]),color,1.4,.7,"5 3")
        +transient.path(states.map(t=>[t.time,t.variances[i]/eta]),color,2)
        +dot(transient.project([state.time,state.variances[i]/eta]),color,4);
      comparison+=stationary.path(models.map((m,j)=>[steps[j],m.secondOrder[i]/(steps[j]/model.R)]),color,1.4,.7,"5 3")
        +stationary.path(models.map((m,j)=>[steps[j],m.stationary[i]/(steps[j]/model.R)]),color,2)
        +dot(stationary.project([+fraction.value,model.stationary[i]/eta]),color,4);
    });
    transient.draw(curves);stationary.draw(comparison);
    const relativeError=v=>Math.hypot(...v.map((x,i)=>x-model.stationary[i]))/Math.hypot(...model.stationary);
    $("status").textContent=`η ${fmt(eta,4)} | t = kη ${fmt(state.time,4)} | λ₂ ${fmt(lambda2,3)} | stationary variances / η (${model.stationary.map(v=>fmt(v/eta,4)).join(", ")}) | first-order relative error ${fmt(relativeError(model.firstOrder),3)} | second-order relative error ${fmt(relativeError(model.secondOrder),3)}`;
  }
  fraction.addEventListener("input",rebuild);anisotropy.addEventListener("input",rebuild);
  iteration.addEventListener("input",()=>{stop();render();});
  cancel=stop;rebuild();
}

const experiments=[
  ["monge","1 Inversions",monge],["moments","2 Moment closure",moments],["caps","5 Density caps",caps],
  ["clt","6 CLT rates",clt],["energy","9 Energy flows",energy],
  ["composition","13 Composition",composition],["cdf","19 CDF formula",cdf],
  ["matchings","21 Noncrossing",matchings],["bernstein","27 Bernstein",bernstein],
  ["quantization","34 Particles",quantization],["weak","55 Weak transport",weak],
  ["independence","Independence",independence],["envelope","Convex envelope",envelope],
  ["gaussian","Gaussian Sinkhorn",gaussian],["sgd","SGD covariance",sgd]
];
function activate(){const exp=experiments.find(e=>e[0]===requestedTopic)||experiments.find(e=>e[0]==="weak");
  if(active===exp[0])return;cancel();cancel=()=>{};active=exp[0];
  try{exp[2]();}catch(error){$("status").textContent="Numerical error: "+error.message;console.error(error);}
}
activate();
let resizePending=false;
function reportHeight(){
  if(resizePending)return;resizePending=true;
  requestAnimationFrame(()=>{resizePending=false;
    if(parent!==window)parent.postMessage({type:"ot-experiment-size",topic:active,height:Math.ceil(document.querySelector("main").getBoundingClientRect().height)+2},location.protocol==="file:"?"*":location.origin);
  });
}
new ResizeObserver(reportHeight).observe(document.querySelector("main"));
window.addEventListener("message",event=>{if(event.source===parent && event.data?.type==="ot-experiment-measure")reportHeight();});
window.addEventListener("pagehide",()=>cancel());
reportHeight();
