(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.ProjectionLab=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const N=9,SIZE=729;
const puzzles=[
 {name:"Classic · 30 clues",clues:"530070000600195000098000060800060003400803001700020006060000280000419005000080079",solution:"534678912672195348198342567859761423426853791713924856961537284287419635345286179"},
 {name:"Denser · 36 clues",clues:"000260701680070090190004500820100040004602900050003028009300074040050036703018000",solution:"435269781682571493197834562826195347374682915951743628519326874248957136763418259"},
 {name:"Sparse · 17 clues",clues:"400000805030000000000700000020000060000080400000010000000603070500200000104000000"}
];
function index(r,c,k){return (r*9+c)*9+k;}
function groups(kind){const out=[];for(let a=0;a<9;a++)for(let b=0;b<9;b++){
 const g=[];for(let q=0;q<9;q++){
  if(kind===0)g.push(index(a,b,q));
  else if(kind===1)g.push(index(a,q,b));
  else if(kind===2)g.push(index(q,a,b));
  else if(kind===3)g.push(index(3*Math.floor(a/3)+Math.floor(q/3),3*(a%3)+q%3,b));
  else throw new RangeError("Unknown constraint");
 }out.push(g);
}return out;}
const GROUPS=[0,1,2,3].map(groups);
function parseClues(clues){if(typeof clues!=="string"||!/^\d{81}$/.test(clues))throw new RangeError("A puzzle needs 81 digits");return Array.from(clues,Number);}
function project(x,kind,clues){
 if(x.length!==SIZE||kind<0||kind>4)throw new RangeError("Invalid projection");
 if(kind===4){const y=Float64Array.from(x);for(let cell=0;cell<81;cell++)if(clues[cell])for(let k=0;k<9;k++)y[cell*9+k]=+(k===clues[cell]-1);return y;}
 const y=new Float64Array(SIZE);for(const group of GROUPS[kind]){let best=group[0];for(let j=1;j<9;j++)if(x[group[j]]>x[best])best=group[j];y[best]=1;}return y;
}
function random(seed){let s=seed>>>0;return function(){s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function create(clueString,seed=1){const clues=parseClues(clueString),rng=random(seed),x=Float64Array.from({length:SIZE},()=>rng());return {clues,seed,iteration:0,z:Array.from({length:5},()=>Float64Array.from(x))};}
function step(state){const shadow=state.z.map((x,s)=>project(x,s,state.clues)),reflectionMean=new Float64Array(SIZE);for(let i=0;i<SIZE;i++)for(let s=0;s<5;s++)reflectionMean[i]+=(2*shadow[s][i]-state.z[s][i])/5;for(let s=0;s<5;s++)for(let i=0;i<SIZE;i++)state.z[s][i]+=reflectionMean[i]-shadow[s][i];state.iteration++;return state;}
const UNITS=[];for(let r=0;r<9;r++)UNITS.push(Array.from({length:9},(_,c)=>r*9+c));for(let c=0;c<9;c++)UNITS.push(Array.from({length:9},(_,r)=>r*9+c));for(let b=0;b<9;b++)UNITS.push(Array.from({length:9},(_,q)=>(3*Math.floor(b/3)+Math.floor(q/3))*9+3*(b%3)+q%3));
function boardViolations(board){if(board.length!==81)return {violations:Infinity,conflicts:new Set()};let violations=0;const conflicts=new Set();for(const unit of UNITS){const counts=new Int16Array(10);for(const cell of unit)if(board[cell]>=1&&board[cell]<=9&&Number.isInteger(board[cell]))counts[board[cell]]++;for(let k=1;k<=9;k++)violations+=Math.abs(counts[k]-1);for(const cell of unit)if(counts[board[cell]]>1)conflicts.add(cell);}return {violations,conflicts};}
function valid(board,clues){if(board.length!==81||board.some(v=>!Number.isInteger(v)||v<1||v>9))return false;return boardViolations(board).violations===0&&clues.every((v,i)=>!v||v===board[i]);}
function diagnostic(state){const shadow=state.z.map((x,s)=>project(x,s,state.clues)),scores=new Float64Array(SIZE);for(let i=0;i<SIZE;i++)for(let s=0;s<5;s++)scores[i]+=shadow[s][i]/5;let consensus2=0,clue2=0;for(let i=0;i<SIZE;i++)for(let s=0;s<5;s++)consensus2+=(shadow[s][i]-scores[i])**2;const board=[],gaps=[];for(let cell=0;cell<81;cell++){let first=-Infinity,second=-Infinity,best=0;for(let k=0;k<9;k++){const v=scores[cell*9+k];if(v>first){second=first;first=v;best=k;}else if(v>second)second=v;if(state.clues[cell])clue2+=(v-+(k===state.clues[cell]-1))**2;}board.push(state.clues[cell]||best+1);gaps.push(first-second);}const bv=boardViolations(board);return {board,gaps,scores,shadow,violations:bv.violations,conflicts:bv.conflicts,consensus:Math.sqrt(consensus2),clue:Math.sqrt(clue2),solved:valid(board,state.clues)};}
function halfplaneA(z){return [z[0],Math.max(0,z[1])];}
function halfplaneB(z){return z[1]>=z[0]?z.slice():[(z[0]+z[1])/2,(z[0]+z[1])/2];}
function halfplanePaths(cycles=6){const start=[2,-1],pocs=[start],dykstra=[start],dr=[halfplaneA(start)];let z=start.slice(),d=start.slice(),p=[0,0],q=[0,0],w=start.slice();for(let i=0;i<cycles;i++){
 const y=halfplaneA(z);z=halfplaneB(y);pocs.push(y,z);
 const a=d.map((v,j)=>v+p[j]),e=halfplaneA(a);p=a.map((v,j)=>v-e[j]);const b=e.map((v,j)=>v+q[j]);d=halfplaneB(b);q=b.map((v,j)=>v-d[j]);dykstra.push(e,d);
 const c=halfplaneA(w),ref=c.map((v,j)=>2*v-w[j]),bref=halfplaneB(ref);w=w.map((v,j)=>v+bref[j]-c[j]);dr.push(halfplaneA(w));
}return {pocs,dykstra,dr,nearest:[.5,.5]};}
return {N,SIZE,puzzles,index,groups,project,parseClues,random,create,step,diagnostic,valid,boardViolations,halfplaneA,halfplaneB,halfplanePaths};
});
