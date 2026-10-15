"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const filename = path.join(__dirname, "../js/blog-search-core.js");
const B = require(filename);
const post = (id,title,keywords=[],extra={}) => ({
  id, url:"/blog/"+id+"/", title, description:"", keywords,
  status:"published", date:"2026-10-01", ...extra
});
const records = [
  post("fenchel","Pertes de Fenchel–Young et géométrie convexe",
    ["Fenchel–Young","Optimisation","Convexité"]),
  post("gaussian","Gaussian optimal transport",
    ["OT","Gaussians","W2","Optimal transport"],{date:"2026-10-02"}),
  post("entropy","Entropy and geometry",
    ["KL","Optimal transport","OT","ot"],{description:"Gaussian covariance and gradient flows."}),
  post("sgd","Fixed-step SGD for least squares",
    ["SGD","Covariance","Stochastic gradient descent"],{status:"forthcoming",date:null}),
  post("other","Other stories about Kleinian groups and SGDTools",
    ["W20","Prototypes"],{description:"These tokens are not the short acronyms."}),
  post("relu","Universality of ReLU networks",["Neural networks","Approximation"]),
  post("matrix","A matrix viewpoint",["Matrix","Density","Class","Analysis"]),
  post("alpha","Alpha preview",[],{status:"forthcoming",date:null}),
  post("zeta","Zeta preview",[],{status:"forthcoming",date:null}),
  post("descr","A different title",[],{description:"Gaussian measures and kernels."})
];
const prepared = B.prepare(records);
const ids = (query,options) => B.search(prepared,query,options).map(r=>r.post.id);

assert.equal(B.normalize("  ÉQUATIONS — d’Été / W₂  "),"equations d ete w2");
assert.equal(B.normalize("École e\u0301cole Œuvre Æther Straße"),"ecole ecole oeuvre aether strasse");
assert.equal(B.normalize("Fenchel–Young"),B.normalize("FENCHEL - YOUNG"));
assert.equal(B.normalize(null),"");
assert.equal(B.normalize(".* [a-z]+ (x)? $^"),"a z x");
assert.deepEqual(ids("fenchel young"),["fenchel"]);
assert.deepEqual(ids("FENCHEL-YOUNG géométrie"),["fenchel"]);
assert.deepEqual(ids("geometrie convexite"),["fenchel"]);
assert.deepEqual(ids("GAUSSIAN ot"),["gaussian","entropy"]);
assert.deepEqual(ids("SGD"),["sgd"]);
assert.deepEqual(ids("kl"),["entropy"]);
assert.deepEqual(ids("W₂"),["gaussian"]);
assert.ok(!ids("ot").includes("other"));
assert.ok(!ids("kl").includes("other"));
assert.ok(!ids("sgd").includes("other"));
assert.ok(!ids("w2").includes("other"));
assert.ok(ids("sg").includes("sgd"),"partial typing can reach an acronym before it is complete");
assert.deepEqual(ids("gradient KL"),["entropy"]);
assert.deepEqual(ids("gradient covariance"),["sgd","entropy"]);
assert.deepEqual(ids("gauss"),["gaussian","descr","entropy"]);
assert.deepEqual(ids("gauss missingword"),[]);
assert.deepEqual(ids("univer approx"),["relu"]);
assert.deepEqual(ids("neural network"),["relu"]);
assert.deepEqual(ids("neural networks"),["relu"]);
assert.deepEqual(ids("matrices densities"),["matrix"]);
assert.deepEqual(ids("classes analyses"),["matrix"]);
assert.deepEqual(ids("lysis"),[],"matching is a word prefix, never an internal substring");
assert.deepEqual(ids("gauss",{status:"forthcoming"}),[]);
assert.deepEqual(ids("sgd",{status:"forthcoming"}),["sgd"]);
assert.deepEqual(ids("sgd",{status:"published"}),[]);

// All words must match, even when they occur in three distinct fields.
const across = B.prepare([post("across","A Gaussian example",["OT"],
  {description:"This example uses entropy."})]);
assert.equal(B.search(across,"gaussian OT entropy").length,1);
assert.equal(B.search(across,"gaussian OT entropy absent").length,0);
assert.equal(B.search(across,"transport").length,0,"no invented OT/transport alias");

// Title matches dominate keyword-only results even for the longest valid query.
const words = Array.from({length:16},(_,i)=>"term"+i);
const ranking = B.prepare([
  post("keyword","Unrelated",words),
  post("title","term0",[],{description:words.slice(1).join(" ")}),
  post("description","Elsewhere",[],{description:words.join(" ")})
]);
assert.deepEqual(B.search(ranking,words.join(" ")).map(r=>r.post.id),
  ["title","keyword","description"]);
const exact = B.prepare([
  post("prefix","Gaussianity",[]),
  post("exact","Gaussian",[]),
  post("longer","Gaussian examples",[])
]);
assert.deepEqual(B.search(exact,"Gaussian").map(r=>r.post.id),["exact","longer","prefix"]);
assert.equal(B.search(prepared,"OT OT OT")[0].score,B.search(prepared,"OT")[0].score,
  "repeated query words do not inflate relevance");
const acronymTitle=B.prepare([post("acronym","OT")]);
assert.equal(B.search(acronymTitle,"OT OT")[0].score,B.search(acronymTitle,"OT")[0].score);

// Stable, deduplicated labels, in the original keyword order.
const labels = B.search(prepared,"OT KL").find(r=>r.post.id==="entropy");
assert.deepEqual(labels.matchedKeywords,["KL","OT"]);
assert.equal(labels.post,records[2],"results retain the original record object");
assert.deepEqual(B.search(prepared,"optimal gauss").find(r=>r.post.id==="gaussian").matchedKeywords,
  ["Gaussians","Optimal transport"]);
assert.ok(B.search(prepared,"").every(r=>r.score===0 && r.matchedKeywords.length===0));

// Empty queries: published newest first, title ties, then forthcoming alphabetically.
const ordering = [
  post("z","Zebra",[],{date:"2026-10-02"}),
  post("old","Ancient",[],{date:"2025-01-01"}),
  post("future-z","Zeta",[],{status:"forthcoming",date:null}),
  post("a","Álgebra",[],{date:"2026-10-02"}),
  post("future-a","Alpha",[],{status:"forthcoming",date:null})
];
const sorted=["a","z","old","future-a","future-z"];
assert.deepEqual(B.search(B.prepare(ordering),"").map(r=>r.post.id),sorted);
assert.deepEqual(B.search(B.prepare([...ordering].reverse())," -- ").map(r=>r.post.id),sorted);
assert.deepEqual(B.search(B.prepare(ordering),"",{status:"forthcoming"}).map(r=>r.post.id),
  ["future-a","future-z"]);
const ties = [post("b","Same",["term"]),post("a","Same",["term"])];
assert.deepEqual(B.search(B.prepare(ties),"term").map(r=>r.post.id),["a","b"]);

// Huge queries are rejected before tokenization; no AND constraints are discarded.
assert.deepEqual(B.search(prepared,"a".repeat(1000000)),[]);
assert.deepEqual(B.search(ranking,words.concat("seventeenth").join(" ")),[]);
assert.equal(B.search(ranking,words.join(" ")).length,3);
assert.equal(B.limits.queryCharacters,256);
assert.equal(B.limits.queryTokens,16);
assert.deepEqual(B.search(prepared,"[.*]+?(^$)"),B.search(prepared,""));

// HTML is opaque source text; the engine neither evaluates nor generates it.
const literal=post("literal","<script>danger()</script>",["<b>Gaussian</b>"]);
const literalResult=B.search(B.prepare([literal]),"Gaussian");
assert.equal(literalResult[0].post,literal);
assert.deepEqual(literalResult[0].matchedKeywords,["<b>Gaussian</b>"]);
assert.equal(global.danger,undefined);

const browser={window:{}};
vm.runInNewContext(fs.readFileSync(filename,"utf8"),browser);
assert.equal(browser.window.BlogSearch.normalize("ÉTÉ"),"ete");
assert.equal(browser.window.BlogSearch.search(browser.window.BlogSearch.prepare(records),"SGD")[0].post.id,"sgd");
assert.throws(()=>B.prepare(null),TypeError);
assert.throws(()=>B.prepare([post("bad","Bad",[],{status:"unknown"})]),TypeError);
assert.throws(()=>B.search(prepared,"",{status:"unknown"}),RangeError);
assert.deepEqual(B.search(B.prepare([]),"anything"),[]);
console.log("Blog search: normalization, exact acronyms, prefixes/plurals, AND matching, ranking, filters, deterministic order, query limits, and text safety passed.");
