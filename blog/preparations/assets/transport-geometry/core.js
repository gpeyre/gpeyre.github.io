(function(root){
"use strict";
const T=typeof module!=="undefined"&&module.exports?require("../ot-lab/core.js"):root.BlogMath;
const sum=a=>a.reduce((s,v)=>s+v,0),matrix=(n,m,fn=()=>0)=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>fn(i,j)));
const normalize=a=>{const s=sum(a);if(!(s>0))throw Error("A histogram must have positive mass");return a.map(v=>v/s);};
function transform(grid,f,p){return grid.map(y=>Math.min(...grid.map((x,i)=>Math.abs(x-y)**p-f[i])));}
function closure(grid,f,p){const dual=transform(grid,f,p),closed=transform(grid,dual,p);return{dual,closed,gap:Math.max(...closed.map((v,i)=>v-f[i]))};}
function preset(grid,p,name){if(name==="symmetric")return grid.map(x=>(Math.abs(x-1)**p+Math.abs(x+1)**p)/2);if(name==="asymmetric")return grid.map(x=>(Math.abs(x+1)**p+Math.abs(x+2)**p)/2);if(name==="wave")return grid.map(x=>.7*Math.sin(1.8*x)+.15*x*x);return grid.map(x=>Math.abs(x-1)**p);}
function data(mode,width=.1){
 if(mode==="circle"){
  const n=12;const x=Array.from({length:n},(_,i)=>i/n);
  // A wrapped Gaussian evaluated with enough images for roundoff accuracy.
  const bump=z=>sum([-2,-1,0,1,2].map(k=>Math.exp(-.5*((z+k)/width)**2)));
  const raw=matrix(n,n,(i,j)=>bump((i-j)/n)+1e-10);
  const rows=raw.map(normalize),cols=matrix(n,n,(j,i)=>raw[i][j]).map(normalize);
  const C=matrix(n,n,(i,j)=>Math.min(Math.abs(i-j)/n,1-Math.abs(i-j)/n));
  return{mode,rows,cols,x,labels:x.map(v=>v.toFixed(2)),C:scale(C),D:scale(C),parameters:x.map(v=>[v,1]),circulant:true};
 }
 const means=[-1.1,0,1.1],scales=[.45,.8,1.15],parameters=means.flatMap(m=>scales.map(s=>[m,s]));
 const x=Array.from({length:17},(_,j)=>-4.8+9.6*j/16);
 const raw=parameters.map(([m,s])=>x.map(z=>Math.exp(-.5*((z-m)/s)**2)/s+1e-12));
 const rows=raw.map(normalize),cols=x.map((_,j)=>normalize(raw.map(row=>row[j])));
 return{mode,rows,cols,x,labels:parameters.map(([m,s])=>`${m}, ${s}`),parameters,C:scale(matrix(x.length,x.length,(i,j)=>Math.abs(x[i]-x[j]))),D:scale(matrix(rows.length,rows.length,(i,j)=>Math.hypot(parameters[i][0]-parameters[j][0],parameters[i][1]-parameters[j][1]))),circulant:false};
}
function scale(a){const m=Math.max(...a.flat());if(!(m>1e-15))throw Error("The distance matrix collapsed");return a.map(row=>row.map(v=>v/m));}
const l1=(a,b)=>sum(a.map((v,i)=>Math.abs(v-b[i])));
function distanceMap(C,rows,tau=0,circulant=false){
 if(!T)throw Error("The min-cost-flow solver is unavailable");
 const n=rows.length,out=matrix(n,n),norm=Math.max(...C.flat());let residual=0;
 function pair(i,j){const plan=T.transport(C,rows[i],rows[j]);residual=Math.max(residual,T.feasibility(plan,rows[i],rows[j]));return sum(plan.map((row,k)=>sum(row.map((v,l)=>v*C[k][l]))))+tau*norm*l1(rows[i],rows[j]);}
 if(circulant){const first=Array(n).fill(0);for(let j=1;j<=Math.floor(n/2);j++)first[j]=first[n-j]=pair(0,j);for(let i=0;i<n;i++)for(let j=0;j<n;j++)out[i][j]=first[(j-i+n)%n];}
 else for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)out[i][j]=out[j][i]=pair(i,j);
 return{matrix:out,residual};
}
function hilbert(A,B){const ratios=[];for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++){if(!(A[i][j]>0&&B[i][j]>0))return null;ratios.push(Math.log(A[i][j]/B[i][j]));}return Math.max(...ratios)-Math.min(...ratios);}
function cycle(state,d,tau){const a=distanceMap(state.D,d.cols,tau,d.circulant),C=scale(a.matrix),b=distanceMap(C,d.rows,tau,d.circulant),D=scale(b.matrix);return{C,D,residual:Math.max(a.residual,b.residual),change:Math.max(hilbert(C,state.C),hilbert(D,state.D))};}
function triangleError(a){let r=0;for(let i=0;i<a.length;i++)for(let j=0;j<a.length;j++)for(let k=0;k<a.length;k++)r=Math.max(r,a[i][j]-a[i][k]-a[k][j]);return r;}
function benchmark(d,D,rooted){const pairs=[];for(let i=0;i<D.length;i++)for(let j=i+1;j<D.length;j++){const v=(d.parameters[i][0]-d.parameters[j][0])**2+(d.parameters[i][1]-d.parameters[j][1])**2;pairs.push([rooted?Math.sqrt(v):v,D[i][j]]);}const factor=sum(pairs.map(([x,y])=>x*y))/sum(pairs.map(([x])=>x*x));return{factor,pairs:pairs.map(([x,y])=>[factor*x,y]),relativeError:Math.sqrt(sum(pairs.map(([x,y])=>(factor*x-y)**2))/sum(pairs.map(([,y])=>y*y)))};}
const api={sum,matrix,normalize,transform,closure,preset,data,scale,distanceMap,hilbert,cycle,triangleError,benchmark};
if(typeof module!=="undefined"&&module.exports)module.exports=api;root.TransportGeometry=api;
})(typeof window!=="undefined"?window:globalThis);
