"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const G=require("../blog/preparations/assets/optimization-geometry/core.js");
const close=(x,y,tol=2e-10)=>assert.ok(Math.abs(x-y)<=tol*Math.max(1,Math.abs(x),Math.abs(y)),`${x} != ${y}`);

// Direct Jacobian rows for vec(A B), with A=(a,0)^T, B=(b,0).
// Parameters are (da,du,db,dv); three nonzero rows are orthogonal.
for(const a of [.02,.1,.8,1,2.3])for(const b of [.03,.5,1,3]){
  const J=[[b,0,a,0],[0,0,0,a],[0,b,0,0],[0,0,0,0]];
  const rowNorms=J.map(row=>row.reduce((s,x)=>s+x*x,0)).filter(x=>x>0).sort((x,y)=>x-y);
  const s=G.rankOneSpectrum(a,b);
  s.singularValues.forEach((v,i)=>close(v*v,rowNorms[i]));
  s.gaussNewtonEigenvalues.forEach((v,i)=>close(v,2*rowNorms[i]));
  close(s.kappa,rowNorms[2]/rowNorms[0]);
  close(s.kappa,G.rankOneSpectrum(b,a).kappa);
  assert.ok(s.kappa>=2-1e-12);
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)close(J[i].reduce((v,x,k)=>v+x*J[j][k],0),0);
}
for(const lambda of [-4,-.2,0,.2,1.5,4])for(const z0 of [.02,.08,.8,1.4]){
  const path=G.rankOneTrainingTrajectory(z0,lambda,1,3,1200);
  close(path[0].t,0);close(path.at(-1).t,3);close(path[0].z,z0);
  for(let i=0;i<path.length;i++){
    const p=path[i];close(p.a*p.b,p.z);close(p.a*p.a-p.b*p.b,lambda);
    close(p.loss,(p.z-1)**2);close(p.kappa,(p.a*p.a+p.b*p.b)/Math.min(p.a*p.a,p.b*p.b));
    assert.ok(Number.isFinite(p.kappa)&&p.sigmaMin>0);
    if(i)assert.ok(p.loss<=path[i-1].loss+1e-14);
    if(lambda===0)close(p.kappa,2);
  }
  // Independent RK4 on the ORIGINAL factor equations for unhalved loss.
  let {a,b}=path[0];const h=.0005,f=(x,y)=>[2*(1-x*y)*y,2*(1-x*y)*x];
  for(let i=0;i<6000;i++){
    const p=f(a,b),q=f(a+h*p[0]/2,b+h*p[1]/2),r=f(a+h*q[0]/2,b+h*q[1]/2),s=f(a+h*r[0],b+h*r[1]);
    a+=h*(p[0]+2*q[0]+2*r[0]+s[0])/6;b+=h*(p[1]+2*q[1]+2*r[1]+s[1])/6;
  }
  close(a,path.at(-1).a,3e-9);close(b,path.at(-1).b,3e-9);
  const refined=G.rankOneTrainingTrajectory(z0,lambda,1,3,2400);
  close(path.at(-1).z,refined.at(-1).z,3e-9);
}
// The exact scalar Hessian can be indefinite BEFORE fit and has only one
// positive eigenvalue AT fit. No false imbalance-dependent scalar κ is used.
for(const a of [.25,.5,1,2]){
  const b=1/a,H=[[2*b*b,2*a*b],[2*a*b,2*a*a]];
  close(H[0][0]*H[1][1]-H[0][1]*H[1][0],0);
  close(H[0][0]+H[1][1],2*(a*a+b*b));
}
assert.throws(()=>G.rankOneSpectrum(0,1),RangeError);
assert.throws(()=>G.rankOneSpectrum(Infinity,1),RangeError);
assert.throws(()=>G.rankOneTrainingTrajectory(0,1),RangeError);
const article=fs.readFileSync(require("node:path").join(__dirname,"../blog/preparations/balanced-low-rank-conditioning.html"),"utf8");
assert.match(article,/literal scalar product/);assert.match(article,/Gauss–Newton/);assert.match(article,/can be indefinite/);
console.log("Scalar rank-one training: conserved imbalance, unhalved-loss factor ODE, refinement, ambient Jacobian spectrum, and scalar-Hessian caveat passed.");
