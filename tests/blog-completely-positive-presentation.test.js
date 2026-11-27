"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {articleSource,localAsset}=require("./blog-article-source.js");
const root=path.resolve(__dirname,".."),article=articleSource("doubly-nonnegative-completely-positive"),html=article.body;
assert.equal(article.title,"Doubly nonnegative and completely positive matrices");
if(article.published){
  assert.match(article.source,/^proofs: true$/m);
  assert.match(article.source,/^embedded_experiment: true$/m);
  assert.ok(!html.includes("blog-ai-disclosure"),"The published layout supplies the disclosure");
}else{
  assert.match(html,/noindex,follow/);assert.match(html,/Alpha preview/);
  assert.match(html,/assets\/idea-experiments.js/);
}
const first=html.match(/<p>[\s\S]*?<\/p>/)[0];
assert.match(first,/Meyer Scetbon/);assert.match(first,/https:\/\/meyerscetbon\.github\.io\//);assert.match(first,/grateful/);assert.match(first,/Marco Cuturi/);
assert.match(first,/#ref-lowrank/);
assert.equal((html.match(/class="blog-proof"/g)||[]).length,5);
assert.match(html,/<details class="blog-proof">[\s\S]*<details class="blog-proof">/);
for(const kind of ["theorem","proposition","ref"]){const ids=[...html.matchAll(new RegExp('id="('+kind+'-[^"]+)"','g'))].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);}
assert.equal((html.match(/<li id="ref-/g)||[]).length,11);
assert.match(html,/CC ShareAlike 1.0/);assert.match(html,/licenses\/sa\/1\.0/);
assert.ok(fs.statSync(path.join(root,"blog/imgs/schoenberg-1971.jpg")).size>1000);
for(const match of html.matchAll(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g))assert.ok(!/<[A-Za-z!]/.test(match[1]||match[2]),"Escape less-than signs in mathematics");
const keywords=article.keywords;assert.ok(keywords.length>=25);assert.equal(new Set(keywords).size,keywords.length);
assert.match(html,/same<\/em> factor/);assert.match(html,/every<\/em> nonnegative Gram factorization/);
assert.match(html,/Monte Carlo summands/);assert.match(html,/Laplace transform/);assert.match(html,/Poisson jumps/);
assert.equal((html.match(/<iframe\b/g)||[]).length,1);
assert.match(html,/data-experiment="kernel-sketches"/);
const experiment=html.match(/<iframe\b[^>]*\bsrc="([^"]+)"/)[1];
assert.equal(localAsset(experiment,article).file,path.join(root,"blog/preparations/assets/kernel-sketches/index.html"));
assert.match(html,/same number.*scalar features/);
assert.match(html,/saturation is reported/);
assert.match(html,/need not improve either realization monotonically/);
const heads=[...html.matchAll(/<h2(?: [^>]+)?>(.*?)<\/h2>/g)].map(m=>m[1]);assert.equal(heads.at(-3),"Completely positive kernels");assert.equal(heads.at(-2),"Numerical experiment: positive and Fourier sketches");assert.equal(heads.at(-1),"Bibliography");
const picture=fs.readFileSync(path.join(root,"blog/preparations/assets/cp-matrices/five-cycle.svg"),"utf8");assert.match(picture,/aria-labelledby="title desc"/);assert.equal((picture.match(/<circle /g)||[]).length,5);assert.match(picture,/10t/);
for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes('id="'+link[1]+'"'),"Missing reference "+link[1]);
console.log("Complete positivity presentation: acknowledgment, folded proofs, kernel section, sketch comparison, bibliography, escaped math, licensed portrait and five-cycle diagram pass.");
