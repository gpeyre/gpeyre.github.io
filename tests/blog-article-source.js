"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

// A published preview is a redirect, not an article. Keep checking the actual
// content after publication instead of either failing on, or skipping, the stub.
function articleSource(slug) {
  assert.match(slug, /^[a-z0-9-]+$/);
  const preview = path.join(root, "blog/preparations", slug + ".html");
  const stub = fs.readFileSync(preview, "utf8");
  const redirect = stub.match(/^redirect_to:\s*(\S+)\s*$/m);
  if (!redirect) {
    const keywords = stub.match(/<meta name="keywords" content="([^"]+)"/);
    assert.ok(keywords, slug + " missing preview keywords");
    return { file: preview, source: stub, body: stub, published: false,
      url: "/blog/preparations/" + slug + ".html",
      title: stub.match(/<h1[^>]*>(.*?)<\/h1>/)[1],
      keywords: keywords[1].split(",").map(s => s.trim().toLocaleLowerCase()) };
  }
  const route = redirect[1].match(/^\/blog\/(\d{4})\/(\d{2})\/(\d{2})\/([a-z0-9-]+)\/$/);
  assert.ok(route, slug + " must redirect to a local dated post");
  assert.equal(route[4], slug, "preview must retain its article identity");
  assert.match(stub, /http-equiv="refresh"/);
  assert.match(stub, /page\.redirect_to \| absolute_url/);
  const date = route.slice(1, 4).join("-");
  const file = path.join(root, "blog/_posts", date + "-" + slug + ".md");
  const source = fs.readFileSync(file, "utf8");
  const front = source.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(front, slug + " missing published front matter");
  const keywords = front[1].match(/^keywords:\s*\n((?:[ \t]*- [^\n]+\n?)+)/m);
  assert.ok(keywords, slug + " missing published keywords");
  const unquote = s => s.trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
  return { file, source, body: source.slice(front[0].length), published: true,
    url: redirect[1], date, title: unquote(front[1].match(/^title:\s*(.+)$/m)[1]),
    keywords: keywords[1].trim().split("\n").map(s => unquote(s.replace(/^\s*- /, "")).toLocaleLowerCase()) };
}

function localAsset(raw, article) {
  const liquid = raw.match(/^\{\{\s*'([^']+)'\s*\|\s*(?:relative_url|prepend:\s*site\.baseurl)\s*\}\}(.*)$/);
  const url = liquid ? liquid[1] + liquid[2] : raw;
  if (/^(https?:|data:|mailto:|#)/.test(url)) return null;
  const link = url.split("#")[0].split("?")[0];
  return { link, file: link.startsWith("/") ? path.join(root, link) : path.resolve(path.dirname(article.file), link) };
}

module.exports = { articleSource, localAsset };
