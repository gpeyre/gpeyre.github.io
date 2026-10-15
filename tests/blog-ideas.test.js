"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const vm = require("node:vm");
const fs = require("node:fs");
const directory = path.join(__dirname, "../blog/preparations/assets/ot-lab");
const M = require(path.join(directory, "core.js"));
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(directory, "data.js"), "utf8"), context);
const D = context.window.BLOG_DATA;
const close = (a,b,tolerance=1e-10) => assert.ok(Math.abs(a-b)<tolerance, `${a} != ${b}`);

// Independent SciPy transport references, including rectangular/nonuniform plans.
for (const fixture of D.transportFixtures) {
  const plan = M.transport(fixture.cost, fixture.a, fixture.b);
  const value = M.sum(plan.map((row,i)=>M.dot(row,fixture.cost[i])));
  close(value,fixture.optimum,1e-8);
  assert.ok(M.feasibility(plan,fixture.a,fixture.b)<1e-9);
}

// Convex weak transport: feasible descent and a valid objective certificate.
const f = D.weak;
let plan=f.a.map(a=>f.b.map(b=>a*b));
const state={p:plan,atoms:[plan],weights:[1]};
let previous=M.objective(plan,f.x,f.y,f.a),gap=Infinity;
for(let i=0;i<6000;i++) {
  plan=M.weakAwayStep(state,f.x,f.y,f.a,f.b).p;
  const value=M.objective(plan,f.x,f.y,f.a);
  assert.ok(value<=previous+1e-10);previous=value;
  if(i%20===0 && (gap=M.weakCertificate(plan,f.x,f.y,f.a,f.b))<2e-7)break;
}
gap=M.weakCertificate(plan,f.x,f.y,f.a,f.b);
assert.ok(gap<5e-6);
close(previous,M.objective(f.weak,f.x,f.y,f.a),gap+2e-7);
assert.ok(M.feasibility(plan,f.a,f.b)<1e-9);

// The Monge identity is checked independently from its pairwise formula.
const random=M.rng(15);
for(const n of [2,3,7,24,50]) for(let trial=0;trial<50;trial++) {
  const values=Array.from({length:n},()=>3*random()-1),sorted=[...values].sort((a,b)=>a-b);
  const direct=M.sum(values.map((v,i)=>(i/(n-1)-v)**2-(i/(n-1)-sorted[i])**2))/n;
  close(M.uniformMongeGap(values),direct);
}

// The smoothed Monge regression now solves the displayed convex objective,
// not an uncontrolled iteration budget. Check both derivatives independently.
const mongeRandom=M.rng(1),observations=Array.from({length:24},(_,i)=>{
  const x=i/23;return x+.45*Math.sin(3*Math.PI*x)+.12*M.gaussian(mongeRandom);
});
const regression=M.mongeRegression(observations),probe=observations.map(v=>.7*v),h=1e-6;
const stateAtProbe=regression.evaluate(probe,1,true);
for(let j=0;j<probe.length;j++) {
  const plus=[...probe],minus=[...probe];plus[j]+=h;minus[j]-=h;
  const a=regression.evaluate(plus,1),b=regression.evaluate(minus,1);
  close((a.value-b.value)/(2*h),stateAtProbe.gradient[j],2e-6);
  for(let i=0;i<probe.length;i++)close((a.gradient[i]-b.gradient[i])/(2*h),stateAtProbe.hessian[i][j],2e-5);
}
for(const gamma of [.001,.01,.1,1,10,100]) {
  const fit=regression.fit(gamma);
  assert.ok(fit.gradientNorm<1e-7 && fit.errorBound<1e-12);
  assert.ok(fit.iterations<30);
  fit.values.forEach((v,i)=>close(fit.predict(i/23),v,2e-10));
  assert.deepEqual(regression.fit(gamma).values,fit.values,"Fits must not depend on the slider's history");
}

// True lattice jumps, rather than a straight segment spanning each jump.
for(const [x,cdf] of [[0,.5],[1,.8413447460685429],[2,.9772498680518208],[4,.9999683287581669]]) {
  close(M.gaussianCDF(x),cdf,3e-15);close(M.gaussianCDF(-x),1-cdf,3e-15);
}
for(const n of [1,2,3,4,64,192]) {
  const curve=M.bernoulliErrorCurve(n),jumps=curve.slice(1).map((p,i)=>p[0]===curve[i][0]?p[1]-curve[i][1]:0).filter(v=>v>1e-12);
  const expected=Array.from({length:n+1},(_,i)=>(2*i-n)/Math.sqrt(n)).filter(x=>Math.abs(x)<=4).length;
  assert.equal(jumps.length,expected);
  assert.ok(curve.every(p=>p.every(Number.isFinite)));
}

// Triangle integration: exact extreme point masses, symmetry, and convergence.
for(const n of [20,50,100,400]) {
  const F=x=>x+.6*(1-Math.cos(2*Math.PI*x))/(2*Math.PI),G=x=>x;
  close(M.cdfSquaredDistance(()=>1,()=>0,n),1);
  close(M.cdfSquaredDistance(F,F,n),0);
  close(M.cdfSquaredDistance(F,G,n),M.cdfSquaredDistance(G,F,n));
  assert.ok(Math.abs(M.cdfSquaredDistance(F,G,n)-.135/Math.PI**2)<.18/(n*n));
}

// Exact binomial identities, including numerically difficult endpoint values.
for(const n of [1,2,10,100,250]) for(const a of [0,1e-12,.01,.2,.5,.9,1-1e-12,1]) {
  close(M.bernstein(n,()=>1,a),1);
  close(M.bernstein(n,x=>x,a),a);
  close(M.bernstein(n,x=>x*x,a),a*a+a*(1-a)/n);
}

// A two-point transport LP agrees with the full solver at boundary probabilities.
for(const a of [0,.1,.5,.7,1])for(const b of [0,.2,.5,.8,1]) {
  for(const costs of [[[0,1],[1,0]],[[4,1],[2,3]],[[-1,2],[4,-5]]]) {
    const exact=M.twoPointTransport(a,b,costs),plan=M.transport(costs,[a,1-a],[b,1-b]);
    close(exact.value,M.sum(plan.map((row,i)=>M.dot(row,costs[i]))));
    assert.ok(M.feasibility(exact.plan,[a,1-a],[b,1-b])<1e-10);
  }
  close(M.twoPointTransport(a,b,[[0,1],[1,0]]).value,M.convexEnvelope(a,b));
}
for(let i=0;i<500;i++) {
  const a=random(),b=random(),u=random(),v=random(),t=random();
  for(const epsilon of [0,.6]) {
    const lhs=M.convexEnvelope((1-t)*a+t*u,(1-t)*b+t*v,epsilon);
    const rhs=(1-t)*M.convexEnvelope(a,b,epsilon)+t*M.convexEnvelope(u,v,epsilon);
    assert.ok(lhs<=rhs+1e-12,"The displayed smaller extension must remain jointly convex");
  }
  assert.ok(M.convexEnvelope(a,b,.6)<=M.convexEnvelope(a,b));
}
for(const n of [1,2,10,150])close(M.uniformQuantization(Array.from({length:n},(_,i)=>(i+.5)/n)),1/(12*n*n));

for(let n=1;n<=16;n++) {
  const vertices=Array.from({length:2*n},(_,i)=>[1.6*Math.cos(i*Math.PI/n),Math.sin(i*Math.PI/n)]);
  const x=vertices.filter((_,i)=>i%2===0),y=vertices.filter((_,i)=>i%2===1);
  for(let j=0;j<100;j++) {
    const matching=M.sampleMatching(n,random);
    assert.equal(new Set(matching).size,n);
    assert.ok(!M.crossing(x,y,matching));
  }
}
// The advertised six-point trap is locally optimal for every pair swap,
// but a three-cycle reaches a shorter noncrossing matching.
const hexagon=[1/12,1/3,2/3,1,4/3,5/3].map(t=>[Math.cos(Math.PI*t),Math.sin(Math.PI*t)]);
const red=hexagon.filter((_,i)=>i%2===0),blue=hexagon.filter((_,i)=>i%2===1),trap=[2,0,1];
const length=p=>M.sum(red.map((v,i)=>Math.sqrt(M.dist2(v,blue[p[i]]))));
assert.ok(!M.crossing(red,blue,trap));
close(length(trap),2+2*Math.sin(5*Math.PI/24));
close(length([0,1,2]),2+2*Math.sin(Math.PI/8));
assert.ok(length([0,1,2])<length(trap));
for(let i=0;i<3;i++)for(let j=0;j<i;j++) {
  const swapped=[...trap];[swapped[i],swapped[j]]=[swapped[j],swapped[i]];
  assert.ok(length(swapped)>length(trap));
}
// Stored trajectory data must agree with the captions about descending energies.
for(const flow of [D.energy.one,D.energy.two]) {
  assert.ok(flow.energy.every(Number.isFinite));
  flow.energy.slice(1).forEach((value,i)=>assert.ok(value<=flow.energy[i]+1e-10));
}
const last=D.clt.n.length-1,n=D.clt.n[last];
close(Math.sqrt(n)*D.clt.bernoulli[last],.5,.002);
close(n*D.clt.uniform[last],D.clt.uniformConstant,.0002);
// Check the entire saved curve, not only its asymptotic endpoint. These
// reference values use continuous-CDF absolute-error quadrature; a missed
// symmetry zero in signed integration used to create spurious downward dips.
for(const [count,reference] of [[1,.154279512181],[2,.0454032505853],[4,.0202985915194]]) {
  close(D.clt.uniform[D.clt.n.indexOf(count)],reference,2e-10);
}
for(let i=1;i<D.clt.n.length;i++)assert.ok(D.clt.uniform[i]<D.clt.uniform[i-1]);
for(let i=0;i<D.clt.n.length;i++)if(D.clt.n[i]>=5) {
  assert.ok(Math.abs(D.clt.n[i]*D.clt.uniform[i]-D.clt.uniformConstant)<.006);
}
console.log("Passed: transport references, weak certificates, inversion identity, Bernstein endpoint stability, convex envelopes, quantization, noncrossing matchings, and stored trajectories.");
