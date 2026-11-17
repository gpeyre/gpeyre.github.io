"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { articleSource } = require("./blog-article-source.js");
const root = path.resolve(__dirname, ".."), slug = "stein-operators-discrepancies";
const record = articleSource(slug), article = record.body;
const title = "Stein operators and probability discrepancies";
assert.equal(record.title, title);
assert.ok(record.keywords.length >= 18);
if (!record.published) {
  assert.ok(article.includes("<title>" + title + " — Alpha preview"));
  assert.match(article, /name="robots" content="noindex,follow"/);
  assert.match(article, /class="blog-ai-disclosure"/);
  assert.match(article, /site-analytics\.js/);
} else {
  assert.match(record.source, /^proofs: true$/m);
  assert.match(record.source, /^embedded_experiment: true$/m);
}
assert.match(article, /data-experiment="stein"/);
assert.match(article, /assets\/stein-operator\/index\.html/);
assert.match(article, /charles-stein-LICENSE\.txt/);
assert.match(article, /connected open set/);
assert.match(article, /No moment assumption/);
assert.match(article, /first-order Stein operator acts on a vector field/);
assert.match(article, /square<\/em> of this Stein discrepancy/);
assert.match(article, /off-diagonal unbiased estimator/);
assert.match(article, /not a certificate/);
const ids = [...article.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, "No duplicate anchors");
for (const [, id] of article.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), "Missing anchor " + id);
const blocks = [...article.matchAll(record.published ? /^\$\$\s*\n([\s\S]*?)\n\$\$\s*$/gm : /\\\[([\s\S]*?)\\\]/g)].map(m => m[1]);
assert.ok(blocks.length >= 30);
assert.equal((article.match(/\\\[/g) || []).length, (article.match(/\\\]/g) || []).length);
assert.equal((article.match(/\\\(/g) || []).length, (article.match(/\\\)/g) || []).length);
for (const tex of blocks) {
  assert.doesNotMatch(tex, /&(?:[A-Za-z][A-Za-z0-9]*|#\d+|#x[0-9a-f]+);/i, "Use TeX operators in display math for safe future promotion");
  assert.doesNotMatch(tex, /<(?=[A-Za-z/!])/);
}
assert.equal((article.match(/<details class="blog-proof">/g) || []).length, 5);
assert.equal((article.match(/<li id="ref-/g) || []).length, 7);
const queue = ["blog/announcement-queue.md", "blog/published.md"].map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
const entry = queue.split(/^## /m).find(block => /^\d+\. /.test(block) && block.includes(slug + ".html"));
assert.ok(entry); assert.match(entry, /^- \[[ x]\] Ready to publish$/m);
const message = entry.match(/^> (.+)$/m)[1];
assert.ok(Array.from(message).length <= 280);
if (!record.published) assert.ok(fs.readFileSync(path.join(root, "blog/preparations/index.html"), "utf8").includes('href="' + slug + '.html"'));
console.log(`Stein presentation: ${blocks.length} display blocks, 5 proofs, 7 references, metadata, anchors, portrait license, and editorial entry passed.`);
