"use strict";
const assert=require("node:assert/strict");
const M=require("../blog/preparations/assets/transport-geometry/core.js");
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b}`);
const grid=Array.from({length:241},(_,i)=>-3+6*i/240);
for(const p of [.5,1,1.5,2,3,4])for(const name of ["symmetric","asymmetric","wave","profile"]){
 const f=M.preset(grid,p,name),{dual,closed}=M.closure(grid,f,p),triple=M.transform(grid,closed,p);
 closed.forEach((v,i)=>assert.ok(v>=f[i]-1e-11));triple.forEach((v,i)=>close(v,dual[i],1e-11));
 const twice=M.closure(grid,closed,p).closed;twice.forEach((v,i)=>close(v,closed[i],1e-11));
 if(name==='profile')closed.forEach((v,i)=>close(v,f[i],1e-11));
}
// Explicit continuum curvature contradictions, checked independently of transforms.
for(const p of [1.2,1.5,1.8]){const r=((1+2**(p-1))/2)**(1/(p-1));assert.ok((1+2**(p-2))/2>r**(p-2));}
assert.ok(M.closure(grid,M.preset(grid,3,'symmetric'),3).gap>.5);
assert.ok(M.closure(grid,M.preset(grid,1.5,'asymmetric'),1.5).gap>1e-4);
close(M.closure(grid,M.preset(grid,2,'symmetric'),2).gap,0,1e-10);
// Raw cost-map properties use independently varied matrices, not only fixed points.
const d=M.data('circle',.105),C=d.C,C2=C.map(row=>row.map(v=>v*1.3)),raw=M.distanceMap(C,d.rows,0,true),up=M.distanceMap(C2,d.rows,0,true);
for(let i=0;i<C.length;i++)for(let j=0;j<C.length;j++)close(up.matrix[i][j],1.3*raw.matrix[i][j],1e-10);
assert.ok(M.triangleError(raw.matrix)<1e-10);assert.ok(raw.residual<1e-10);
const pert=C.map((row,i)=>row.map((v,j)=>v+(i===j?0:.07))),a=M.distanceMap(pert,d.rows,0,true).matrix;
for(let i=0;i<C.length;i++)for(let j=0;j<C.length;j++){assert.ok(a[i][j]>=raw.matrix[i][j]-1e-12);assert.ok(a[i][j]-raw.matrix[i][j]<=.07+1e-10);}
assert.ok(M.hilbert(a,raw.matrix)<=M.hilbert(pert,C)+1e-10);
for(const tau of [0,.1,3]){
 let state={C:d.C,D:d.D};for(let i=0;i<16;i++){state=M.cycle(state,d,tau);assert.ok(state.residual<1e-9);assert.ok(M.triangleError(state.C)<1e-10);assert.ok(M.triangleError(state.D)<1e-10);assert.ok(Number.isFinite(state.change));close(Math.max(...state.C.flat()),1);}
 assert.ok(state.change<1e-3,`observed periodic iterate residual at tau=${tau}`);
 // The optimization takes advantage of exact circulant symmetry; compare to full solves.
 const full=M.distanceMap(state.C,d.rows,tau,false).matrix,fast=M.distanceMap(state.C,d.rows,tau,true).matrix;
 full.forEach((row,i)=>row.forEach((v,j)=>close(v,fast[i][j],1e-9)));
}
const family=M.data('location-scale');let state={C:family.C,D:family.D};
for(let i=0;i<5;i++){state=M.cycle(state,family,.1);assert.ok(state.residual<1e-9);assert.ok(M.triangleError(state.D)<1e-10);}
for(const rooted of [false,true]){const b=M.benchmark(family,state.D,rooted);assert.ok(b.factor>0&&b.relativeError>=0&&Number.isFinite(b.relativeError));}
// Independent 2-bin OT formula, including a zero-cost diagonal and additive regularizer.
for(const tau of [0,.3]){const a=[[.2,.8],[.65,.35]],out=M.distanceMap([[0,2],[2,0]],a,tau).matrix;close(out[0][1],2*.45+tau*2*.9);}
console.log("Transport geometry: cost-transform closure/triple identity, explicit counterexamples, exact LP properties, circulant/full agreement, metric invariants, and coupled iterations passed.");
