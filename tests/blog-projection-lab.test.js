"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const filename=path.join(__dirname,"../blog/preparations/assets/projection-lab/core.js"),P=require(filename);
const sandbox={};vm.runInNewContext(fs.readFileSync(filename,"utf8"),sandbox);assert.equal(sandbox.ProjectionLab.SIZE,P.SIZE);
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),a+" != "+b);
// All 81 one-hot groups partition the entire tensor, in each of the four projections.
for(let kind=0;kind<4;kind++){const groups=P.groups(kind),seen=new Set(groups.flat());assert.equal(groups.length,81);assert.equal(seen.size,729);assert.ok(groups.every(g=>g.length===9));assert.equal(Math.min(...seen),0);assert.equal(Math.max(...seen),728);}
const clues=P.parseClues(P.puzzles[0].clues),rng=P.random(29),x=Float64Array.from({length:729},()=>4*rng()-2);
for(let kind=0;kind<5;kind++){
 const y=P.project(x,kind,clues),yy=P.project(y,kind,clues);assert.deepEqual(y,yy,"orthogonal projections are idempotent");assert.notDeepEqual(y,x);
 if(kind<4)for(const g of P.groups(kind)){assert.equal(g.reduce((a,i)=>a+y[i],0),1);const chosen=g.find(i=>y[i]===1);assert.ok(g.every(i=>x[chosen]>=x[i]));const chosenDistance=g.reduce((s,i)=>s+(x[i]-y[i])**2,0);for(const j of g)close(chosenDistance,Math.min(chosenDistance,g.reduce((s,i)=>s+(x[i]-+(i===j))**2,0)));}
 else for(let c=0;c<81;c++)for(let k=0;k<9;k++)assert.equal(y[c*9+k],clues[c]?+(k===clues[c]-1):x[c*9+k]);
}
for(let kind=0;kind<4;kind++){const tied=P.project(new Float64Array(729),kind,clues);for(const g of P.groups(kind))assert.equal(tied[g[0]],1,"the smallest index breaks an exact tie");}
// Product-space DR is checked against a separately written reflected-consensus formula.
const state=P.create(P.puzzles[0].clues,12),before=state.z.map(a=>Array.from(a));
const shadow=before.map((a,k)=>P.project(a,k,clues)),expected=before.map(a=>a.slice());
for(let i=0;i<729;i++){let average=0;for(let k=0;k<5;k++)average+=2*shadow[k][i]-before[k][i];average/=5;for(let k=0;k<5;k++)expected[k][i]+=average-shadow[k][i];}
P.step(state);for(let k=0;k<5;k++)for(let i=0;i<729;i++)close(state.z[k][i],expected[k][i]);
const rawBefore=state.z.map(a=>Array.from(a));P.diagnostic(state);assert.deepEqual(state.z.map(a=>Array.from(a)),rawBefore,"rounded diagnostics never feed back into the state");
// An independent backtracking solver verifies the puzzle data and the result's units.
function solveSudoku(clueString){
 const b=Array.from(clueString,Number);
 function legal(i,d){const r=Math.floor(i/9),c=i%9;for(let q=0;q<9;q++)if(b[r*9+q]===d||b[q*9+c]===d||b[(3*Math.floor(r/3)+Math.floor(q/3))*9+3*Math.floor(c/3)+q%3]===d)return false;return true;}
 function solve(){let chosen=-1,candidates=null;for(let i=0;i<81;i++)if(!b[i]){const options=[];for(let d=1;d<=9;d++)if(legal(i,d))options.push(d);if(!options.length)return false;if(!candidates||options.length<candidates.length){chosen=i;candidates=options;}}if(chosen<0)return true;for(const d of candidates){b[chosen]=d;if(solve())return true;}b[chosen]=0;return false;}
 assert.ok(solve());return b;
}
for(const puzzle of P.puzzles){
 const reference=solveSudoku(puzzle.clues),c=P.parseClues(puzzle.clues);assert.ok(P.valid(reference,c));if(puzzle.solution)assert.deepEqual(reference,Array.from(puzzle.solution,Number));
 for(const seed of [1,2,3]){const a=P.create(puzzle.clues,seed),b=P.create(puzzle.clues,seed);let d=P.diagnostic(a);while(!d.solved&&a.iteration<5000){P.step(a);P.step(b);d=P.diagnostic(a);assert.ok(Number.isFinite(d.consensus)&&Number.isFinite(d.clue));}assert.ok(d.solved,puzzle.name+", seed "+seed+" did not solve");assert.deepEqual(a.z,b.z,"initialization and updates are reproducible");assert.equal(d.violations,0);assert.ok(P.valid(d.board,c));for(let r=0;r<9;r++)assert.deepEqual(d.board.slice(r*9,r*9+9).sort(),[1,2,3,4,5,6,7,8,9]);}
}
const invalid=Array.from(P.puzzles[0].solution,Number);invalid[0]=invalid[1];assert.ok(!P.valid(invalid,clues));assert.ok(P.boardViolations(invalid).violations>0);assert.ok(!P.valid(new Array(81).fill(0),clues));
const paths=P.halfplanePaths(2);assert.deepEqual(paths.pocs.at(-1),[1,1]);assert.deepEqual(paths.dykstra.at(-1),[.5,.5]);assert.deepEqual(P.halfplaneB([2,-1]),[.5,.5]);assert.deepEqual(paths.dr.at(-1),[1,1]);close((2-.5)**2+(-1-.5)**2,4.5);
// Independent analytic checks of the other two articles' formulas.
for(const e of [-.4,-.01,.01,.2,.7]){const a=[1,e],T=[];for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(let k=0;k<2;k++){const w=+(i+j+k===1),value=(a[i]*a[j]*a[k]-+(i+j+k===0))/e;T.push((value-w)**2);}close(Math.sqrt(T.reduce((s,v)=>s+v,0)),Math.sqrt(3*e*e+e**4));}
for(const a of [-2,-.3,0,1,3])for(const b of [-1,0,1])close(b*0-a*a,-a*a);
function kl(a,b){return a.reduce((s,p,i)=>s+(p?p*Math.log(p/b[i]):0),0);}
for(let trial=0;trial<300;trial++){const a=[rng(),rng(),rng(),rng()],b=[rng(),rng(),rng(),rng()];const sa=a.reduce((s,v)=>s+v,0),sb=b.reduce((s,v)=>s+v,0);a.forEach((v,i)=>a[i]=v/sa);b.forEach((v,i)=>b[i]=v/sb);const l1=a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0);assert.ok(kl(a,b)+1e-12>=l1*l1/2);}
// Density matrices of a qubit: Bloch vectors give an independent noncommuting benchmark.
function entropyQubit(v){const r=Math.hypot(...v),p=(1+r)/2,q=(1-r)/2;return (p?p*Math.log(p):0)+(q?q*Math.log(q):0);}
function relativeQubit(r,s){const a=Math.hypot(...s),lo=(1-a)/2,hi=(1+a)/2,c=(Math.log(hi)+Math.log(lo))/2,d=(Math.log(hi)-Math.log(lo))/2;return entropyQubit(r)-c-(a?d*r.reduce((sum,v,i)=>sum+v*s[i],0)/a:0);}
for(let trial=0;trial<300;trial++){const r=[rng()-.5,rng()-.5,rng()-.5],s=[rng()-.5,rng()-.5,rng()-.5],traceNorm=Math.hypot(...r.map((v,i)=>v-s[i]));assert.ok(relativeQubit(r,s)+1e-12>=traceNorm**2/2);}
for(const slug of ["projections-corrections-reflections","quantum-pinsker-sign-observable","tensor-rank-without-best-approximation"]){const html=fs.readFileSync(path.join(__dirname,"../blog/preparations",slug+".html"),"utf8");assert.match(html,/<meta name="robots" content="noindex,follow">/);assert.match(html,/Alpha preview · Work in progress/);assert.ok(html.match(/<meta name="keywords" content="([^"]+)"/)[1].split(",").length>=22);assert.match(html,/details class="blog-proof"/);assert.match(html,/id="theorem-1"/);assert.ok(!html.includes("(square)"));}
console.log("Projection lab: exact group projections, affine clues, product-space DR, independent Sudoku solutions, deterministic seeds, halfplanes, tensor limits, and classical/quantum Pinsker benchmarks passed.");
