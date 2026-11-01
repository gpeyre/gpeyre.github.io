"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const directory=path.join(__dirname,'../blog/preparations/assets/pinsker-simplex'),M=require(path.join(directory,'core.js')),V=require(path.join(directory,'view.js'));
const close=(x,y,t=1e-11)=>assert.ok(Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y)),`${x} != ${y}`);
let seed=1024;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;};
for(let j=0;j<5000;j++){
  const raw=[random(),random(),random()],sum=raw.reduce((a,b)=>a+b),q=raw.map(x=>x/sum),p=M.interior([random(),random(),random()]);
  const r=M.quantities(q,p),direct=q.reduce((s,x,i)=>s+x*Math.log(x/p[i]),0);
  close(r.kl,direct);close(r.tv,q.reduce((s,x,i)=>s+Math.abs(x-p[i]),0)/2);close(r.gap,r.kl-2*r.tv*r.tv);
  assert.ok(r.kl+1e-13>=2*r.tv*r.tv);assert.ok(r.gap>=0);close(p.reduce((a,b)=>a+b),1);assert.ok(p.every(x=>x>=M.FLOOR-1e-14));
  const xy=M.point(q);M.barycentric(xy.x,xy.y).forEach((v,i)=>close(v,q[i]));
  M.interior(p).forEach((v,i)=>close(v,p[i]));
  close(M.quantities(p,p).kl,0);close(M.quantities(p,p).tv,0);close(M.quantities(p,p).gap,0);
}
for(const epsilon of [1e-3,1e-5,1e-7]){
  const r=M.quantities([.5+epsilon,.5-epsilon,0],[.5,.5,0]);
  close(r.kl/(2*r.tv*r.tv),1,2e-6);
}
close(M.quantities([1,0,0],[.2,.45,.35]).kl,Math.log(5));assert.equal(M.quantities([1,0,0],[0,.5,.5]).kl,Infinity);
assert.throws(()=>M.quantities([.5,.5,.1],[.2,.4,.4]),RangeError);assert.throws(()=>M.sampleFields([1,0,0]),RangeError);
const fields=M.sampleFields([.12,.58,.30],121);assert.ok(Number.isNaN(fields.kl[0]));
for(let k=0;k<fields.kl.length;k++)if(Number.isFinite(fields.kl[k])){assert.ok(fields.kl[k]>=-1e-12);assert.ok(fields.tv[k]>=0&&fields.tv[k]<=1);assert.ok(fields.gap[k]>=0);}
let calls=0;
function context(){const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})};for(const method of ['clearRect','scale','beginPath','moveTo','lineTo','closePath','clip','drawImage','save','restore','stroke','fill','arc','fillRect','fillText','putImageData'])ctx[method]=(...args)=>{for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x),method);calls++;};return ctx;}
function node(id){const events={},attrs={};return{id,value:'',clientWidth:300,width:300,height:339,textContent:'',addEventListener:(key,fn)=>{events[key]=fn;},dispatch:(key,e={})=>events[key]?.(e),getContext:context,setAttribute:(key,v)=>{attrs[key]=v;},getAttribute:key=>attrs[key],getBoundingClientRect:()=>({left:0,top:0,width:300,height:339}),setPointerCapture(){}};}
const html=fs.readFileSync(path.join(directory,'index.html'),'utf8'),nodes={};for(const m of html.matchAll(/\bid="([^"]+)"/g))nodes[m[1]]=node(m[1]);
const pending=new Map(),events={},messages=[];let next=0;const parent={postMessage:(m,origin)=>messages.push({m,origin})};
const window={PinskerSimplex:M,PinskerSimplexView:V,parent,devicePixelRatio:1,addEventListener:(key,fn)=>{events[key]=fn;}};
const sandbox={window,document:{getElementById:id=>nodes[id],querySelector:()=>({getBoundingClientRect:()=>({height:1150})}),createElement:tag=>node(tag)},location:{protocol:'https:',origin:'https://example.test'},requestAnimationFrame:fn=>{pending.set(++next,fn);return next;}};
vm.runInNewContext(fs.readFileSync(path.join(directory,'app.js'),'utf8'),sandbox);
const flush=()=>{const all=[...pending.values()];pending.clear();all.forEach(fn=>fn());};
assert.ok(calls>1000);assert.equal(messages[0].m.topic,'pinsker-simplex');assert.equal(messages[0].origin,'https://example.test');
nodes.skew.dispatch('click');flush();window.PinskerSimplexApp.getState().p.forEach((v,i)=>close(v,[.12,.58,.30][i]));
nodes.kl.dispatch('keydown',{key:'ArrowRight',preventDefault(){}});flush();let p=window.PinskerSimplexApp.getState().p;close(p[0],.13);close(p[2],.29);
nodes.tv.dispatch('keydown',{key:'Home',preventDefault(){}});flush();window.PinskerSimplexApp.getState().p.forEach(v=>close(v,1/3));
const box=V.layout(300,300*1.13),xy=M.point([.25,.5,.25]);nodes.gap.dispatch('pointerdown',{pointerId:1,clientX:box.left+box.side*xy.x,clientY:box.bottom-box.side*xy.y});flush();window.PinskerSimplexApp.getState().p.forEach((v,i)=>close(v,[.25,.5,.25][i]));
for(const key of ['kl','tv','gap'])assert.ok(nodes[key].getAttribute('aria-label').includes('0.250, 0.500, 0.250'));
nodes.p1.value='NaN';nodes.p1.dispatch('change');assert.ok(window.PinskerSimplexApp.getState().p.every(Number.isFinite));
const before=messages.length;events.message({source:parent,data:{type:'ot-experiment-measure'}});assert.ok(messages.length>before);
const article=fs.readFileSync(path.join(directory,'../../quantum-pinsker-sign-observable.html'),'utf8');assert.ok(article.includes('data-experiment="pinsker-simplex"'));assert.ok(article.includes('KL}-\\operatorname{TV}'));assert.ok(article.includes('CC BY-SA 2.0 Germany'));
console.log('Pinsker simplex: KL/TV/Pinsker gap identities, sharp constant, simplex projection, shared renderer, synchronized pointer/keyboard/numeric controls and iframe measurement pass.');
