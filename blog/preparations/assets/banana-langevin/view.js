/* Shared density/contour renderer used by the live figure and video export. */
(function(root,factory){"use strict";const api=factory(typeof module==="object"&&module.exports?require("./core.js"):root.BananaLangevin);if(typeof module==="object"&&module.exports)module.exports=api;else root.BananaLangevinView=api;}(typeof globalThis!=="undefined"?globalThis:this,function(M){
"use strict";
const domain=Object.freeze({xMin:-4.5,xMax:4.5,yMin:-4,yMax:11.5}), peak=1/(2*Math.PI), levels=[.01,.025,.05,.09,.13];
const stops=[[242,245,243],[169,206,208],[56,141,155],[24,75,103],[244,179,92]];
function color(value){const u=Math.max(0,Math.min(1,Math.sqrt(value/peak)))*(stops.length-1),i=Math.min(stops.length-2,Math.floor(u)),a=u-i;return stops[i].map((c,k)=>Math.round(c*(1-a)+stops[i+1][k]*a));}
const colors=Array.from({length:1025},(_,i)=>color(peak*i/1024));
function number(x){return x>=.01?x.toFixed(3):x>=1e-9?x.toExponential(1):"< 10⁻⁹";}
function interpolate(grid,density,x,y){const gx=(x-grid.xMin)/grid.dx-.5,gy=(y-grid.yMin)/grid.dy-.5,i=Math.max(0,Math.min(grid.nx-2,Math.floor(gx))),j=Math.max(0,Math.min(grid.ny-2,Math.floor(gy))),u=Math.max(0,Math.min(1,gx-i)),v=Math.max(0,Math.min(1,gy-j)),k=j*grid.nx+i;return(1-v)*((1-u)*density[k]+u*density[k+1])+v*((1-u)*density[k+grid.nx]+u*density[k+grid.nx+1]);}
function frame(w,h){const margin={left:38,right:12,top:9,bottom:33},availableW=w-margin.left-margin.right,availableH=h-margin.top-margin.bottom,scale=Math.min(availableW/(domain.xMax-domain.xMin),availableH/(domain.yMax-domain.yMin)),width=scale*(domain.xMax-domain.xMin),height=scale*(domain.yMax-domain.yMin);return{left:margin.left+(availableW-width)/2,top:margin.top+(availableH-height)/2,width,height,scale};}
function drawDensity(ctx,w,h,grid,density,options={}){
  ctx.clearRect(0,0,w,h);const f=frame(w,h),X=x=>f.left+(x-domain.xMin)*f.scale,Y=y=>f.top+(domain.yMax-y)*f.scale;
  const factory=options.createCanvas||((rw,rh)=>{const c=document.createElement("canvas");c.width=rw;c.height=rh;return c;}),rw=Math.max(2,Math.round(f.width)),rh=Math.max(2,Math.round(f.height)),raster=factory(rw,rh),rc=raster.getContext("2d"),image=rc.createImageData(rw,rh);
  for(let py=0;py<rh;py++){const y=domain.yMax-(py+.5)*(domain.yMax-domain.yMin)/rh;for(let px=0;px<rw;px++){const x=domain.xMin+(px+.5)*(domain.xMax-domain.xMin)/rw,value=interpolate(grid,density,x,y),c=colors[Math.max(0,Math.min(1024,Math.round(value/peak*1024)))],k=4*(py*rw+px);image.data[k]=c[0];image.data[k+1]=c[1];image.data[k+2]=c[2];image.data[k+3]=255;}}
  rc.putImageData(image,0,0);ctx.drawImage(raster,f.left,f.top,f.width,f.height);
  ctx.save();ctx.beginPath();ctx.rect(f.left,f.top,f.width,f.height);ctx.clip();
  // Bilinear edge crossings: marching squares on actual numerical densities.
  if(!options.targetOnly){ctx.strokeStyle="rgba(255,255,255,.85)";ctx.lineWidth=.9;ctx.setLineDash([]);
    for(const level of levels){ctx.beginPath();for(let j=0;j<grid.ny-1;j++){if(grid.y[j+1]<domain.yMin||grid.y[j]>domain.yMax)continue;for(let i=0;i<grid.nx-1;i++){if(grid.x[i+1]<domain.xMin||grid.x[i]>domain.xMax)continue;const k=j*grid.nx+i,values=[density[k],density[k+1],density[k+grid.nx+1],density[k+grid.nx]],points=[[grid.x[i],grid.y[j]],[grid.x[i+1],grid.y[j]],[grid.x[i+1],grid.y[j+1]],[grid.x[i],grid.y[j+1]]],cross=[];for(let e=0;e<4;e++){const n=(e+1)%4;if((values[e]>=level)===(values[n]>=level))continue;const u=(level-values[e])/(values[n]-values[e]);cross.push([points[e][0]+u*(points[n][0]-points[e][0]),points[e][1]+u*(points[n][1]-points[e][1])]);}for(let e=0;e+1<cross.length;e+=2){ctx.moveTo(X(cross[e][0]),Y(cross[e][1]));ctx.lineTo(X(cross[e+1][0]),Y(cross[e+1][1]));}}}ctx.stroke();}}
  // Exact level sets of pi_b: determinant-one image of Gaussian circles.
  if(options.targetContours){ctx.strokeStyle="#233f4c";ctx.lineWidth=options.targetOnly?1.1:1;ctx.setLineDash([4,4]);for(const level of levels){const r=Math.sqrt(-2*Math.log(level/peak));ctx.beginPath();for(let i=0;i<=480;i++){const a=2*Math.PI*i/480,p=M.bendMap(r*Math.cos(a),r*Math.sin(a),options.bend||0);if(i===0)ctx.moveTo(X(p[0]),Y(p[1]));else ctx.lineTo(X(p[0]),Y(p[1]));}ctx.stroke();}}
  ctx.restore();ctx.strokeStyle="#cbd6d8";ctx.lineWidth=1;ctx.setLineDash([]);ctx.strokeRect(f.left,f.top,f.width,f.height);
  ctx.fillStyle="#5d7480";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.textBaseline="top";for(const x of[-4,-2,0,2,4]){ctx.fillText(String(x),X(x),f.top+f.height+6);}ctx.fillText("x",f.left+f.width+8,f.top+f.height+6);
  ctx.textAlign="right";ctx.textBaseline="middle";for(const y of[-4,0,4,8])ctx.fillText(String(y),f.left-7,Y(y));ctx.fillText("y",f.left-7,f.top+3);
  return f;
}
function drawEntropy(ctx,w,h,results,t,options={}){
  ctx.clearRect(0,0,w,h);const left=43,right=13,top=12,bottom=40,pw=w-left-right,ph=h-top-bottom,X=t=>left+pw*t/20,Y=e=>top+ph*(Math.log10(1.5)-Math.log10(Math.max(1e-9,e)))/(Math.log10(1.5)+9),lineColors=options.colors||["#127d86","#c55e39"];
  ctx.strokeStyle="#e0e7e8";ctx.lineWidth=1;ctx.font="10px sans-serif";ctx.fillStyle="#617782";
  for(const e of[1,1e-3,1e-6,1e-9]){ctx.beginPath();ctx.moveTo(left,Y(e));ctx.lineTo(w-right,Y(e));ctx.stroke();ctx.textAlign="right";ctx.fillText(e===1?"1":e.toExponential(0),left-8,Y(e)+3);}
  ctx.textAlign="center";for(const x of[0,5,10,15,20])ctx.fillText(String(x),X(x),h-23);ctx.fillText("physical time",left+pw/2,h-5);
  ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();
  ctx.strokeStyle="#899aa0";ctx.setLineDash([4,4]);ctx.beginPath();for(let i=0;i<=200;i++){const s=i/10,e=1.125*Math.exp(-2*s);if(i)ctx.lineTo(X(s),Y(e));else ctx.moveTo(X(s),Y(e));}ctx.stroke();ctx.setLineDash([]);
  results.forEach((result,k)=>{ctx.strokeStyle=lineColors[k%lineColors.length];ctx.lineWidth=1.8;ctx.beginPath();for(let i=0;i<result.times.length;i++){if(i)ctx.lineTo(X(result.times[i]),Y(result.entropies[i]));else ctx.moveTo(X(result.times[i]),Y(result.entropies[i]));}ctx.stroke();const state=M.sample(result,t);ctx.beginPath();ctx.arc(X(t),Y(state.entropy),3.5,0,2*Math.PI);ctx.fillStyle=lineColors[k%lineColors.length];ctx.fill();});
  ctx.strokeStyle="#8b9aa0";ctx.lineWidth=1;ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(X(t),top);ctx.lineTo(X(t),top+ph);ctx.stroke();ctx.restore();ctx.setLineDash([]);
}
return{domain,peak,levels,number,color,interpolate,frame,drawDensity,drawEntropy};
}));
