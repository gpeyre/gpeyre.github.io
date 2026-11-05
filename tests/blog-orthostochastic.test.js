"use strict";
const assert = require("node:assert/strict");
const O = require("../blog/preparations/assets/orthostochastic-ot/core.js");
let assertions = 0;
function close(actual, expected, tolerance = 1e-10, message = "") { assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} versus ${expected}`); assertions++; }
function check(value, message) { assert.ok(value, message); assertions++; }
function brute(cost, n) {
  let best = Infinity;
  function visit(row, taken, value) {
    if (row === n) { best = Math.min(best, value / n); return; }
    for (let j = 0; j < n; j++) if (!(taken & (1 << j))) visit(row + 1, taken | (1 << j), value + cost[row * n + j]);
  }
  visit(0, 0, 0); return best;
}
for (let n = 1; n <= 6; n++) for (let trial = 0; trial < 5; trial++) {
  const cost = Float64Array.from({length:n*n}, (_, i) => Math.sin(13 * i + 7 * trial) * 3 + (i % 3));
  const h = O.hungarian(cost, n);
  close(h.primal, brute(cost, n), 2e-12, "Hungarian agrees with brute-force permutations");
  check(new Set(h.assignment).size === n, "Assignment is a permutation");
  check(h.dualityGap < 1e-11 && h.maxDualViolation < 1e-11, "Primal/dual assignment certificate");
}
for (const n of [3, 6, 12, 32]) {
  const q = O.initialOrthogonal(n), cost = O.prepare({n, motion:0.37}).cost, g = O.gradient(q, cost, n);
  check(O.orthogonalityError(q, n) < 2e-14, "Dense initial Q is orthogonal");
  check(O.marginalError(q, n) < 2e-14, "Squared Q has uniform coupling marginals");
  const qtT = O.transposeMultiply(q, g.tangent, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) close(qtT[i*n+j] + qtT[j*n+i], 0, 2e-13, "Projected gradient is tangent");
  const step = 1e-6, plus = O.cayleyStep(q, g.skew, step, n), minus = O.cayleyStep(q, g.skew, -step, n);
  close((O.energy(plus,cost,n)-O.energy(minus,cost,n))/(2*step), -g.normSquared, 2e-7, "Directional derivative equals negative squared normalized gradient");
  check(O.orthogonalityError(plus,n) < 3e-14, "Cayley step preserves orthogonality");
  const shifted = Float64Array.from(cost, (c, ij) => c + 0.31 * Math.floor(ij/n) - 0.27 * (ij%n));
  const shiftedGradient = O.gradient(q, shifted, n);
  for (let i = 0; i < n*n; i++) close(g.skew[i], shiftedGradient.skew[i], 5e-13, "Row/column cost potentials do not change the flow");
}
const a = O.prepare({n:12,motion:0.2}), b = O.prepare({n:12,motion:0.8}), repeat = O.prepare({n:12,motion:0.2});
assert.deepEqual(a.source,b.source); assert.deepEqual(a.source,repeat.source); assert.deepEqual(a.target,repeat.target); assertions+=3;
check(a.target.some((p,i)=>Math.hypot(p[0]-b.target[i][0],p[1]-b.target[i][1])>0.1),"Motion genuinely moves targets");
// An independent two-dimensional exact flow checks the integration clock:
// E(theta)=const+(delta/2) sin²(theta), hence tan(theta(t))=tan(theta0)e^(-delta t).
const theta0=0.7, binaryCost=new Float64Array([0.1,1.2,0.4,0.3]), delta=1.2;
const exactTheta=Math.atan(Math.tan(theta0)*Math.exp(-delta));
const integrationErrors=[];
for(const dt of [0.04,0.02,0.01]) {
  let q=new Float64Array([Math.cos(theta0),-Math.sin(theta0),Math.sin(theta0),Math.cos(theta0)]);
  for(let t=0;t<1-1e-12;t+=dt)q=O.cayleyStep(q,O.gradient(q,binaryCost,2).skew,dt,2);
  integrationErrors.push(Math.abs(Math.atan2(q[2],q[0])-exactTheta));
}
check(integrationErrors[1]<0.6*integrationErrors[0]&&integrationErrors[2]<0.6*integrationErrors[1],"Cayley scheme converges to the exact gradient flow under step halving");
check(integrationErrors[2]<0.002,"Small-step flow agrees with the analytic clock");
for (const options of [{n:3,motion:0},{n:8,motion:0.5},{n:20,motion:1},{n:32,motion:0.7}]) {
  const r=O.run(Object.assign({tMax:4,snapshotCount:25},options));
  close(r.times[0],0);close(r.times.at(-1),4);
  for(let i=1;i<r.energies.length;i++)check(r.energies[i]<=r.energies[i-1]+2e-12,"Saved energy is nonincreasing");
  check(r.diagnostics.orthogonalityError<1e-10,"Orthogonality remains accurate throughout descent");
  check(r.diagnostics.marginalError<1e-10,"Uniform marginals remain accurate throughout descent");
  check(r.energies.at(-1)>=r.optimalEnergy-1e-10,"Nonconvex coupling cannot beat certified Kantorovich energy");
  check(r.energies.at(-1)<r.energies[0]-1e-3,"Nontrivial flow decreases transport energy");
  const snapshot=O.sample(r,12);
  close(snapshot.energy,O.energy(snapshot.Q,r.cost,r.n),1e-12);
  for(let i=0;i<r.n;i++) {
    let row=0,column=0;
    for(let j=0;j<r.n;j++){row+=snapshot.coupling[i*r.n+j];column+=snapshot.coupling[j*r.n+i];}
    close(row,1/r.n,1e-11); close(column,1/r.n,1e-11);
  }
}
// A genuine squared-Euclidean local minimum is not an optimal assignment.
const trap=O.prepare({preset:"trap",n:3,motion:0.5}), I=O.identity(3), atIdentity=O.energy(I,trap.cost,3);
close(atIdentity,2-2*Math.cos(75*Math.PI/180),1e-12);
check(atIdentity>trap.optimalEnergy+0.8,"The identity matching is suboptimal for rotated equilateral triangles");
close(O.gradient(I,trap.cost,3).normSquared,0,1e-20,"Every signed permutation is stationary");
for(let i=0;i<3;i++)for(let j=i+1;j<3;j++) {
  const k=new Float64Array(9);k[i*3+j]=1;k[j*3+i]=-1;
  check(O.energy(O.cayleyStep(I,k,0.01,3),trap.cost,3)>atIdentity,"Each pairwise rotation increases the energy at the strict local minimum");
}
const trapped=O.run({preset:"trap",initial:"nearIdentity",motion:0.5,tMax:30,snapshotCount:61});
check(trapped.energies[0]>atIdentity,"Trap starts near, not exactly at, the stationary permutation");
close(trapped.energies.at(-1),atIdentity,1e-8,"Nearby descent approaches the suboptimal local minimum");
check(trapped.diagnostics.finalEnergyGap>0.8,"The displayed failure is not replaced by a global optimum");
for(const options of [{n:2},{n:33},{motion:2},{motion:NaN}])assert.throws(()=>O.prepare(options),RangeError);
assert.throws(()=>O.sample(trapped,0.5),RangeError);
console.log(`Orthostochastic OT: ${assertions} checks passed (assignment certificates, Riemannian derivatives, Cayley constraints, energy descent, cloud motion, and a genuine suboptimal local minimum).`);
