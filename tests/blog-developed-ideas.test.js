"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'blog/preparations');
const slugs=['langevin-without-a-potential','projections-corrections-reflections','logarithmic-sobolev-wasserstein-pl','lagrangian-density-interpolation','quantum-pinsker-sign-observable','intrinsic-factor-training-dynamics','balanced-low-rank-conditioning','sign-gradient-descent-geometry','wasserstein-singular-vectors','tensor-rank-without-best-approximation','c-transforms-and-averaging','stable-fluids'];
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/blog-search-index.js'),'utf8'),ctx);const records=Array.from(ctx.window.BLOG_SEARCH_RECORDS),index=fs.readFileSync(path.join(dir,'index.html'),'utf8'),queue=fs.readFileSync(path.join(root,'blog/announcement-queue.md'),'utf8');
for(const slug of slugs){const file=path.join(dir,slug+'.html'),html=fs.readFileSync(file,'utf8');
 assert.match(html,/<meta name="robots" content="noindex,follow">/);assert.match(html,/<p class="draft-status">Alpha preview/);assert.ok(!html.startsWith('---'),'previews are standalone undated pages');assert.ok(!/<time\b/.test(html));
 assert.ok(html.includes('href="https://www.gpeyre.com/blog/preparations/'+slug+'.html"'));assert.equal((html.match(/<h1\b/g)||[]).length,1);
 const keywords=html.match(/<meta name="keywords" content="([^"]+)"/)[1].split(',').map(s=>s.trim().toLocaleLowerCase());assert.ok(keywords.length>=22);assert.equal(new Set(keywords).size,keywords.length);
 assert.match(html,/<details class="blog-proof">/);assert.ok(!/<details[^>]*\bopen(?:[\s=>])/.test(html));assert.match(html,/<(?:p|span) id="(?:theorem|proposition)-1"/);assert.match(html,/<ol class="references">/);assert.ok((html.match(/<li id="ref-/g)||[]).length>=4);
 const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(new Set(ids).size,ids.length,slug+' duplicate ids');for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]),slug+' missing '+m[1]);
 for(const m of html.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g))assert.ok(!(m[1]||m[2]).includes('<'),slug+' raw less-than sign in HTML mathematics');
 assert.ok(!/\bTODO\b|not yet implemented|placeholder text/.test(html));
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const link=m[1].split('#')[0].split('?')[0];if(/^(https?:|data:|mailto:)/.test(link))continue;const target=link.startsWith('/')?path.join(root,link):path.resolve(dir,link);assert.ok(fs.existsSync(target)||link.endsWith('/'),slug+' missing local asset '+link);}
 const match=records.filter(r=>r.url==='/blog/preparations/'+slug+'.html');assert.equal(match.length,1);assert.equal(match[0].status,'forthcoming');assert.ok(!match[0].date);assert.ok(index.includes('href="'+slug+'.html"'));
 assert.equal(match[0].title,html.match(/<h1[^>]*>(.*?)<\/h1>/)[1]);
 const queued=queue.split(/^## /m).slice(1).filter(block=>block.includes('/'+slug+'.html'));
 assert.equal(queued.length,1,'every preview must have one editorial queue entry');
 assert.equal((queued[0].match(/^- \[(?: |x)\] Ready to publish\s*$/gm)||[]).length,1,'readiness remains an explicit editorial choice');
}
console.log('Twelve developed ideas: alpha metadata, unique keywords, numbered folded proofs, references, escaped mathematics, local assets, search titles/cards, and explicit readiness boxes passed.');
