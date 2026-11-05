"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.resolve(__dirname,".."), folder = path.join(root,"blog/preparations/assets/orthostochastic-ot");
const M = require(path.join(folder,"core.js"));
const article = fs.readFileSync(path.join(root,"blog/preparations/orthostochastic-matrices.html"),"utf8");
assert.match(article, /I learned about orthostochastic matrices from <strong>Peyman Milanfar<\/strong>/);
assert.match(article, /noindex,follow/);
assert.match(article, /Alpha preview/);
assert.match(article, /data-experiment="orthostochastic-ot"/);
assert.equal((article.match(/class="blog-proof"/g)||[]).length,7);
assert.equal((article.match(/<li id="ref-/g)||[]).length,8);
assert.match(article, /CC BY-SA 2.0 Germany/);
assert.ok(fs.statSync(path.join(root,"blog/imgs/garrett-birkhoff.jpg")).size > 1000);
const keywords=article.match(/<meta name="keywords" content="([^"]+)"/)[1].split(", ");
assert.ok(keywords.length>=30);assert.equal(new Set(keywords).size,keywords.length);
for(const match of article.matchAll(/\\\[([\s\S]*?)\\\]/g))assert.ok(!/<[A-Za-z!]/.test(match[1]),"No accidental HTML inside display mathematics");
assert.match(article,/same value, fewer feasible couplings/);
assert.match(article,/strict suboptimal local minima/);
assert.match(article,/metric.*only rescales time/);
// Independent scalar form of the three-by-three theorem, including boundaries.
function lengths(p){return [0,1,2].map(j=>Math.sqrt(p[j]*p[3+j]));}
function defect(p){const a=lengths(p);return Math.abs(2*Math.max(...a)-a.reduce((s,x)=>s+x,0));}
for(let seed=1;seed<=30;seed++){
 const q=M.initialOrthogonal(3,"dense",seed),p=Array.from(q,x=>x*x);
 assert.ok(defect(p)<2e-13);
 const [a,b,c]=lengths(p).map(x=>x*x);
 assert.ok(Math.abs((a+b-c)**2-4*a*b)<2e-14);
}
assert.ok(defect([0,.5,.5,.5,0,.5,.5,.5,0])>.4);
assert.ok(defect(Array(9).fill(1/3))>.3);
assert.equal(defect([1,0,0,0,1,0,0,0,1]),0);
// Worker returns the genuine flow, not the assignment substituted at the end.
let response;
const context={importScripts:()=>{},OrthostochasticOT:M,self:{postMessage:data=>{response=data;}}};
vm.runInNewContext(fs.readFileSync(path.join(folder,"worker.js"),"utf8"),context);
context.self.onmessage({data:{id:42,options:{preset:"trap",motion:.5,tMax:4,snapshotCount:9}}});
assert.equal(response.id,42);assert.ok(!response.error);assert.ok(response.result.energies.at(-1)>response.result.optimalEnergy+.8);
const html=fs.readFileSync(path.join(folder,"index.html"),"utf8"),app=fs.readFileSync(path.join(folder,"app.js"),"utf8"),view=fs.readFileSync(path.join(folder,"view.js"),"utf8");
assert.equal((html.match(/type="range"/g)||[]).length,3);
assert.match(html,/five largest masses/);assert.match(html,/All n² entries/);
assert.match(app,/worker\.terminate\(\)/);assert.match(app,/data\.id !== request/);
assert.match(app,/M\.prepare\(options\)/);assert.match(app,/visibilitychange/);
assert.match(app,/aria-valuetext/);assert.match(app,/IntersectionObserver/);
assert.match(app,/ot-experiment-size/);assert.match(app,/orthostochastic-ot/);
assert.match(view,/\[4,4\]/);assert.match(view,/\[5,4\]/);
assert.match(view,/result\.snapshots\[index\]/);
console.log("Orthostochastic presentation: attribution, theorem boundaries, nested proofs, bibliography, three controls, true worker flow, saved orthogonal iterates, and dashed exact references pass.");
