(function (root, factory) {
  "use strict";
  const api = factory(); if (typeof module === "object" && module.exports) module.exports = api; else root.OrthostochasticView = api;
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ink = "#243d49", muted = "#617782", teal = "#127d86", rust = "#b96943", grid = "#e0e7e5";
  function text(ctx, value, x, y, size, color, align) {ctx.fillStyle = color || ink;ctx.font = (size || 12)+"px system-ui, sans-serif";ctx.textAlign = align || "left";ctx.fillText(value,x,y);}
  function number(x) {if (!Number.isFinite(x)) return "—";if (Math.abs(x)<1e-3 && x!==0) return x.toExponential(1);return x.toFixed(Math.abs(x)>10?1:2);}
  function line(ctx,a,b,color,width,dash) {ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash||[]);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.setLineDash([]);}
  function circle(ctx,p,color,r) {ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[0],p[1],r,0,2*Math.PI);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.stroke();}
  function geometry(ctx,box,result,index) {
    const {n,source,target}=result, solved=!!result.snapshots, t=solved?result.times[index]:0;
    text(ctx,"Coupling at t = "+t.toFixed(2),box.x+5,box.y+16,13,ink);
    const top=box.y+34, usable=Math.min(box.w-42,box.h-62), left=box.x+(box.w-usable)/2;
    let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
    for (const p of source.concat(target)) {xmin=Math.min(xmin,p[0]);xmax=Math.max(xmax,p[0]);ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);}
    const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2,span=Math.max(xmax-xmin,ymax-ymin,.5)*1.2;
    const map=p=>[left+usable*(.5+(p[0]-cx)/span),top+usable*(.5-(p[1]-cy)/span)];
    const xs=source.map(map),ys=target.map(map);
    for (let k=0;k<=2;k++) {const f=k/2,x=left+usable*f,y=top+usable*(1-f);line(ctx,[x,top],[x,top+usable],grid,.7);line(ctx,[left,y],[left+usable,y],grid,.7);text(ctx,number(cx+(f-.5)*span),x,top+usable+16,9,muted,"center");text(ctx,number(cy+(f-.5)*span),left-6,y+3,9,muted,"right");}
    if (solved) {
      const Q=result.snapshots[index];
      for (let i=0;i<n;i++) {
        const row=[];for (let j=0;j<n;j++) row.push({j,mass:Q[i*n+j]*Q[i*n+j]});row.sort((a,b)=>b.mass-a.mass);
        for (const item of row.slice(0,5)) {if (item.mass<1e-14) continue;ctx.globalAlpha=.12+.65*Math.sqrt(item.mass);line(ctx,xs[i],ys[item.j],teal,.4+2.5*Math.sqrt(item.mass));}
      }
      ctx.globalAlpha=1;
    }
    if (result.assignment) for(let i=0;i<n;i++) {ctx.globalAlpha=.65;line(ctx,xs[i],ys[result.assignment[i]],ink,1.1,[4,4]);}
    ctx.globalAlpha=1;for (const p of xs) circle(ctx,p,teal,n>22?3:3.8);for(const p of ys)circle(ctx,p,rust,n>22?3:3.8);
    text(ctx,"equal spatial scales",left+usable/2,top+usable+32,9,muted,"center");
  }
  function energy(ctx,box,result,index) {
    text(ctx,"Transport energy",box.x+5,box.y+16,13,ink);
    if (!result.energies) {text(ctx,"Computing the full trajectory…",box.x+box.w/2,box.y+box.h/2,11,muted,"center");return;}
    const x=box.x+50,y=box.y+36,w=box.w-65,h=box.h-84,opt=result.optimalEnergy,energies=result.energies,times=result.times;
    const high=Math.max(energies[0],opt+1e-5),range=Math.max(high-opt,1e-4),lo=Math.max(0,opt-range*.08),hi=high+range*.08,last=times[times.length-1];
    const X=t=>x+w*t/last,Y=e=>y+h*(hi-e)/(hi-lo);
    for(let k=0;k<=4;k++){const e=lo+(hi-lo)*k/4,yy=Y(e);line(ctx,[x,yy],[x+w,yy],grid,.7);text(ctx,number(e),x-8,yy+3,9,muted,"right");const tt=last*k/4;line(ctx,[X(tt),y],[X(tt),y+h],grid,.7);text(ctx,number(tt),X(tt),y+h+17,9,muted,"center");}
    function curve(end,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(let i=0;i<=end;i++){const xx=X(times[i]),yy=Y(energies[i]);if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.stroke();}
    curve(energies.length-1,"#aec8c8",1.6);curve(index,teal,2.5);line(ctx,[x,Y(opt)],[x+w,Y(opt)],ink,1.25,[5,4]);
    const xx=X(times[index]),yy=Y(energies[index]);line(ctx,[xx,y],[xx,y+h],"#b9694377",1,[2,3]);circle(ctx,[xx,yy],teal,4);
    text(ctx,"flow time",x+w/2,y+h+35,10,muted,"center");
    text(ctx,"exact = "+number(opt),x+w-3,Y(opt)-7,9,ink,"right");
  }
  function draw(ctx,width,height,result,index) {
    ctx.save();ctx.clearRect(0,0,width,height);ctx.fillStyle="#fafbf9";ctx.fillRect(0,0,width,height);
    index=result.snapshots?Math.max(0,Math.min(result.snapshots.length-1,index||0)):0;
    if(width>=600){const gap=25,left=width*.53;geometry(ctx,{x:0,y:4,w:left,h:height-8},result,index);energy(ctx,{x:left+gap,y:4,w:width-left-gap,h:height-8},result,index);}
    else{const top=Math.min(width+18,height*.55);geometry(ctx,{x:0,y:3,w:width,h:top},result,index);energy(ctx,{x:0,y:top+12,w:width,h:height-top-14},result,index);}
    ctx.restore();
  }
  return {draw,geometry,energy,number};
}));
