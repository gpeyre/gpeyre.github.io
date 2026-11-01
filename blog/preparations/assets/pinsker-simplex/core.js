/* Classical three-outcome probabilities, with natural logarithms. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PinskerSimplex=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const FLOOR=.015, HEIGHT=Math.sqrt(3)/2;
  function probability(p){if(!p||p.length!==3||!Array.from(p).every(x=>Number.isFinite(x)&&x>=0)||Math.abs(p[0]+p[1]+p[2]-1)>1e-10)throw new RangeError('Expected three probabilities adding to one.');return Array.from(p);}
  function interior(p){
    if(!p||p.length!==3||!Array.from(p).every(Number.isFinite))throw new RangeError('Invalid target.');
    const v=Array.from(p,x=>x-FLOOR),sorted=v.slice().sort((a,b)=>b-a),mass=1-3*FLOOR;
    let sum=0,theta=0;
    for(let j=0;j<3;j++){sum+=sorted[j];const t=(sum-mass)/(j+1);if(sorted[j]>t)theta=t;}
    const q=v.map(x=>Math.max(0,x-theta)+FLOOR),s=q.reduce((a,b)=>a+b,0);
    return q.map(x=>x/s);
  }
  function point(q){return{x:q[1]+q[2]/2,y:HEIGHT*q[2]};}
  function barycentric(x,y){const c=y/HEIGHT;return[1-x-c/2,x-c/2,c];}
  function entropyTerm(q,p){
    if(q===0)return p;if(p===0)return Infinity;
    const u=(q-p)/p;
    if(Math.abs(u)<1e-4)return p*u*u*(.5+u*(-1/6+u*(1/12+u*(-1/20+u/30))));
    return q*Math.log(q/p)-q+p;
  }
  function quantities(q,p){
    q=probability(q);p=probability(p);
    const kl=q.reduce((s,x,i)=>s+entropyTerm(x,p[i]),0),tv=q.reduce((s,x,i)=>s+Math.abs(x-p[i]),0)/2;
    return{kl,tv,gap:Math.max(0,kl-2*tv*tv)};
  }
  function sampleFields(p,size=181){
    p=probability(p);if(p.some(x=>x<=0))throw new RangeError('The target must be interior.');
    if(!Number.isInteger(size)||size<9||size>801)throw new RangeError('Invalid sampling grid.');
    const fields={p:p.slice(),size,kl:new Float64Array(size*size),tv:new Float64Array(size*size),gap:new Float64Array(size*size),max:{kl:0,tv:0,gap:0}};
    for(let row=0;row<size;row++)for(let col=0;col<size;col++){
      const q=barycentric(col/(size-1),HEIGHT*(1-row/(size-1))),k=row*size+col;
      if(q.some(x=>x< -1e-12)){fields.kl[k]=fields.tv[k]=fields.gap[k]=NaN;continue;}
      const clean=q.map(x=>Math.max(0,x)),sum=clean.reduce((a,b)=>a+b,0),v=quantities(clean.map(x=>x/sum),p);
      for(const key of ['kl','tv','gap']){fields[key][k]=v[key];fields.max[key]=Math.max(fields.max[key],v[key]);}
    }
    return fields;
  }
  return{FLOOR,HEIGHT,probability,interior,point,barycentric,quantities,sampleFields};
});
