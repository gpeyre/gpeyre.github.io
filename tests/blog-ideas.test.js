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
