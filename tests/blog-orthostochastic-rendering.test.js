"use strict";
const assert = require("node:assert/strict");
const { articleSource } = require("./blog-article-source.js");

function displayMath(source) {
  const blocks = [...source.matchAll(/^\$\$[ \t]*\n([\s\S]*?)\n\$\$[ \t]*$/gm)].map(match => match[1]);
  for (const tex of blocks) {
    // Kramdown already escapes display TeX for HTML. An entity in its input
    // becomes double-escaped and MathJax may silently display raw source.
    assert.doesNotMatch(tex, /&(?:[A-Za-z][A-Za-z0-9]*|#\d+|#x[0-9a-f]+);/i,
      "HTML entities must not occur inside Markdown display mathematics");
  }
  return blocks;
}

assert.throws(() => displayMath("$$\n\\sum_{i&lt;j} a_{ij}\n$$"), /HTML entities/);
assert.equal(displayMath("$$\n\\begin{aligned}a&=b\\\\c&=d\\end{aligned}\n$$").length, 1);

const article = articleSource("orthostochastic-matrices");
const blocks = displayMath(article.body);
const expansion = blocks.find(tex => tex.includes("E(e^\\Omega)-E(I)"));
assert.ok(expansion, "Proposition 2 must retain its centered local expansion");
assert.match(expansion, /\\sum_\{i\\lt j\}/, "The strict summation condition must be valid TeX");
assert.match(expansion, /C_\{ij\}\+C_\{ji\}-C_\{ii\}-C_\{jj\}/);
assert.match(expansion, /O\(\\\|\\Omega\\\|_\{\\mathrm F\}\^3\)/);
console.log("Orthostochastic rendering: actual article source, strict summation, unchanged expansion, and no display HTML entities passed.");
