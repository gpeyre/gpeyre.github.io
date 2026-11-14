"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {articleSource} = require("./blog-article-source.js");
const root = path.resolve(__dirname, "..");
const read = slug => articleSource(slug).body;

const pl = read("logarithmic-sobolev-wasserstein-pl");
const resnet = read("training-very-deep-resnets");
const vectors = read("wasserstein-singular-vectors");
const intrinsic = read("intrinsic-factor-training-dynamics");
const projections = read("projections-corrections-reflections");
const sgd = read("sgd-iterate-covariance");

for (const [source, phrase] of [
  [pl, "I learned this Wasserstein P–L viewpoint from Raphaël Barboni"],
  [resnet, "Raphaël Barboni’s work on training residual networks"],
  [vectors, "at the start of Geert-Jan Huizing’s PhD"],
  [intrinsic, "I owe my understanding of these dynamics to Sibylle Marcotte"],
  [sgd, "I owe much of my understanding of these covariance calculations to"]
]) {
  const heading = source.search(/<h2\b|^## /m);
  assert.ok(source.indexOf(phrase) >= 0 && source.indexOf(phrase) < heading, "Credit belongs in the introduction");
}
assert.match(sgd, /Samuel Hurault[\s\S]*Thomas Moreau[\s\S]*analyzing the training of diffusion models/);
assert.match(resnet, /diagonal analysis[\s\S]*two-dimensional plots are due to him/);
assert.match(pl, /trajectory itself, (?:not merely|as well as) decay of its objective value/);
assert.match(vectors, /Laura Cantini raised about genomics/);
assert.match(vectors, /<em>topical maps<\/em>/);
assert.match(intrinsic, /results on relaxed balancedness presented below are due to her/);

for (const [source, names] of [
  [pl, ["Leonard Gross", "Felix Otto"]],
  [projections, ["Richard L. Dykstra", "Jim Douglas Jr.", "Henry H. Rachford Jr."]]
]) {
  for (const name of names) assert.ok(source.includes('alt="Portrait of ' + name + '"'), "Named, accessible portrait: " + name);
  for (const tag of source.matchAll(/<img\b[^>]*src="https:[^"]+"[^>]*>/g)) {
    assert.match(tag[0], /loading="lazy"/);
    assert.match(tag[0], /width="\d+"/);
    assert.match(tag[0], /height="\d+"/);
  }
}
assert.ok(pl.includes("photographers and open reuse licenses are not specified"), "Do not invent a license for institutional portraits");
assert.ok(projections.includes("does not identify the photographer or specify an open reuse license"));
assert.match(vectors, /\/gaspard-monge-carnavalet\.jpg/);
assert.ok(vectors.includes("CC0 Paris Musées / Musée Carnavalet"));
const monge = fs.readFileSync(path.join(root, "blog/imgs/gaspard-monge-carnavalet.jpg"));
assert.equal(monge.subarray(0, 2).toString("hex"), "ffd8");
assert.equal(monge.subarray(-2).toString("hex"), "ffd9");
console.log("Editorial credits: introductory acknowledgments, authentic attributed portraits, intrinsic sizes and Monge CC0 asset pass.");
