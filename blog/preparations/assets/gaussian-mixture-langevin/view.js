/* One physical density plot, shared by the interactive figure and GIF renderer. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MixtureLangevinView = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const domain = Object.freeze({ xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 });
  const peak = 1 / (2 * Math.PI * .3 * .3), colorOffset = .005, logPeak = Math.log1p(peak / colorOffset);
  const levels = [.004, .015, .04, .1, .25, .6, 1.2];
  const stops = [[242,245,243],[169,206,208],[56,141,155],[24,75,103],[244,179,92]];
  const contourCache = new WeakMap();
  function color(value) {
    const u = Math.max(0, Math.min(1, Math.log1p(Math.max(0, value) / colorOffset) / logPeak)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(u)), a = u - i;
    return stops[i].map((c,k) => Math.round(c * (1-a) + stops[i+1][k] * a));
  }
  const palette = Array.from({ length: 1025 }, (_,i) => color(colorOffset * Math.expm1(logPeak * i / 1024)));
  function number(x) { return x >= .01 ? x.toFixed(3) : x >= 1e-8 ? x.toExponential(1) : "< 1e-8"; }
  function interpolate(grid, density, x, y) {
    const gx = (x-grid.xMin)/grid.dx-.5, gy = (y-grid.yMin)/grid.dy-.5;
    const i = Math.max(0,Math.min(grid.nx-2,Math.floor(gx))), j = Math.max(0,Math.min(grid.ny-2,Math.floor(gy)));
    const u = Math.max(0,Math.min(1,gx-i)), v = Math.max(0,Math.min(1,gy-j)), k = j*grid.nx+i;
    return (1-v)*((1-u)*density[k]+u*density[k+1])+v*((1-u)*density[k+grid.nx]+u*density[k+grid.nx+1]);
  }
  function frame(w,h) {
    const availableW = Math.max(1,w-52), availableH = Math.max(1,h-42), scale = Math.min(availableW/9,availableH/9), size=9*scale;
    return { left:38+(availableW-size)/2, top:9+(availableH-size)/2, width:size, height:size, scale };
  }
  function contours(grid, density, thresholds) {
    const all = [];
    for (const level of thresholds) {
      const segments = [];
      for (let j=0; j<grid.ny-1; j++) {
        if (grid.y[j+1]<domain.yMin || grid.y[j]>domain.yMax) continue;
        for (let i=0; i<grid.nx-1; i++) {
          if (grid.x[i+1]<domain.xMin || grid.x[i]>domain.xMax) continue;
          const k=j*grid.nx+i, values=[density[k],density[k+1],density[k+grid.nx+1],density[k+grid.nx]];
          if (level<Math.min(...values) || level>Math.max(...values)) continue;
          const points=[[grid.x[i],grid.y[j]],[grid.x[i+1],grid.y[j]],[grid.x[i+1],grid.y[j+1]],[grid.x[i],grid.y[j+1]]], crossing=[];
          for (let e=0;e<4;e++) {
            const n=(e+1)%4; if ((values[e]>=level)===(values[n]>=level)) continue;
            const u=(level-values[e])/(values[n]-values[e]);
            crossing.push([points[e][0]+u*(points[n][0]-points[e][0]),points[e][1]+u*(points[n][1]-points[e][1])]);
          }
          for(let e=0;e+1<crossing.length;e+=2) segments.push([crossing[e],crossing[e+1]]);
        }
      }
      all.push(segments);
    }
    return all;
  }
  function targetContours(grid,target) {
    let cached=contourCache.get(target);
    if (!cached) { let maximum=0; for(const value of target) maximum=Math.max(maximum,value); cached=contours(grid,target,[.2,.5,.8].map(q=>q*maximum)).map(stitchSegments); contourCache.set(target,cached); }
    return cached;
  }
  // Neighboring marching-square cells share endpoints. Join them before
  // stroking, so a dash continues around a contour instead of restarting on
  // every sub-pixel segment. Rounding only identifies shared grid-edge points.
  function stitchSegments(segments) {
    const key=p=>Math.round(p[0]*1e10)+","+Math.round(p[1]*1e10), endpoints=new Map(), used=new Uint8Array(segments.length);
    segments.forEach((segment,i)=>segment.forEach((point,end)=>{const k=key(point);if(!endpoints.has(k))endpoints.set(k,[]);endpoints.get(k).push([i,end]);}));
    function extend(line,prepend) {
      for(;;) {
        const point=prepend?line[0]:line[line.length-1],next=(endpoints.get(key(point))||[]).find(([i])=>!used[i]);
        if(!next)return;
        const [i,end]=next;used[i]=1;const other=segments[i][1-end];
        if(prepend)line.unshift(other);else line.push(other);
      }
    }
    const lines=[];
    segments.forEach((segment,i)=>{if(used[i])return;used[i]=1;const line=segment.slice();extend(line,false);extend(line,true);lines.push(line);});
    return lines;
  }
  function drawDensity(ctx,w,h,grid,density,options={}) {
    ctx.clearRect(0,0,w,h); const f=frame(w,h), X=x=>f.left+(x-domain.xMin)*f.scale, Y=y=>f.top+(domain.yMax-y)*f.scale;
    const create=options.createCanvas||((width,height)=>{const c=document.createElement("canvas");c.width=width;c.height=height;return c;});
    const resolution=options.preview?260:480;
    const rw=Math.max(2,Math.min(resolution,Math.round(f.width))),rh=Math.max(2,Math.min(resolution,Math.round(f.height))),raster=create(rw,rh),rc=raster.getContext("2d"),image=rc.createImageData(rw,rh);
    for(let py=0;py<rh;py++) { const y=domain.yMax-(py+.5)*9/rh; for(let px=0;px<rw;px++) {
      const x=domain.xMin+(px+.5)*9/rw,value=interpolate(grid,density,x,y),q=Math.max(0,Math.min(1024,Math.round(1024*Math.log1p(Math.max(0,value)/colorOffset)/logPeak))),c=palette[q],k=4*(py*rw+px);
      image.data[k]=c[0];image.data[k+1]=c[1];image.data[k+2]=c[2];image.data[k+3]=255;
    }}
    rc.putImageData(image,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,f.left,f.top,f.width,f.height);
    ctx.save();ctx.beginPath();ctx.rect(f.left,f.top,f.width,f.height);ctx.clip();
    function trace(curves) { for(const segments of curves) { ctx.beginPath();for(const [a,b] of segments) { ctx.moveTo(X(a[0]),Y(a[1]));ctx.lineTo(X(b[0]),Y(b[1])); }ctx.stroke(); } }
    ctx.strokeStyle="rgba(255,255,255,.85)";ctx.lineWidth=.9;ctx.setLineDash([]);trace(contours(grid,density,levels));
    if(options.target) {
      ctx.strokeStyle="#233f4c";ctx.lineWidth=1.1;ctx.setLineDash([4,4]);
      for(const lines of targetContours(grid,options.target)) {
        ctx.beginPath();for(const line of lines){ctx.moveTo(X(line[0][0]),Y(line[0][1]));for(let i=1;i<line.length;i++)ctx.lineTo(X(line[i][0]),Y(line[i][1]));}ctx.stroke();
      }
    }
    ctx.setLineDash([]);ctx.strokeStyle="#b96943";ctx.lineWidth=1.3;
    for(const center of options.centers||[]) { const x=X(center[0]),y=Y(center[1]);ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke(); }
    ctx.restore();ctx.setLineDash([]);ctx.strokeStyle="#cbd6d8";ctx.lineWidth=1;ctx.strokeRect(f.left,f.top,f.width,f.height);
    ctx.fillStyle="#5d7480";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.textBaseline="top";
    for(const x of[-4,-2,0,2,4])ctx.fillText(String(x),X(x),f.top+f.height+6);ctx.fillText("x",f.left+f.width+9,f.top+f.height+6);
    ctx.textAlign="right";ctx.textBaseline="middle";for(const y of[-4,-2,0,2,4])ctx.fillText(String(y),f.left-7,Y(y));ctx.fillText("y",f.left-7,f.top+2);
    return f;
  }
  return { domain,peak,colorOffset,levels,number,color,interpolate,frame,contours,stitchSegments,drawDensity };
}));
