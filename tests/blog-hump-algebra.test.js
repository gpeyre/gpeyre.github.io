"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const filename = path.join(__dirname, "../blog/preparations/assets/hump-algebra/core.js");
const H = require(filename);
function close(a, b, tolerance = 3e-14) { assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`); }

const browser = {};
vm.runInNewContext(fs.readFileSync(filename, "utf8"), browser);
close(browser.HumpAlgebra.evaluate([{x: 0, y: 0, s: 1, weight: 1}], 1, 2), Math.exp(-2.5));

// A single hump has its coefficient as its peak, not its integral.
const a = { x: -.8, y: .6, s: .43, weight: .72 }, b = { x: .7, y: -.4, s: .87, weight: -.21 };
close(H.evaluate([a], a.x, a.y), a.weight);
const product = H.multiplyAtoms(a, b), reverse = H.multiplyAtoms(b, a);
for (const key of ["x", "y", "s", "weight"]) close(product[key], reverse[key]);
assert.ok(product.s < Math.min(a.s, b.s));
assert.ok(Math.abs(product.weight) <= Math.abs(a.weight * b.weight));
for (let i = 0; i < 81; i++) {
  const x = -3 + 6 * (i % 9) / 8, y = -3 + 6 * Math.floor(i / 9) / 8;
  close(H.evaluate([product], x, y), H.evaluate([a], x, y) * H.evaluate([b], x, y));
}

// Translation and scalar scaling commute with the product identity.
const shift = atom => ({ ...atom, x: atom.x + 1.4, y: atom.y - 2.2 });
const shiftedProduct = H.multiplyAtoms(shift(a), shift(b));
close(shiftedProduct.x, product.x + 1.4); close(shiftedProduct.y, product.y - 2.2);
close(shiftedProduct.s, product.s); close(shiftedProduct.weight, product.weight);
const square = H.multiplyAtoms(a, a);
close(square.x, a.x); close(square.y, a.y); close(square.s, a.s / Math.SQRT2); close(square.weight, a.weight * a.weight);

// Mixtures are deterministic, smoothly periodic and normalized in coefficient
// sum; neither their spatial integral nor the product coefficient sum is one.
for (const n of [1, 2, 5, 8, 12]) for (const phase of [0, .18, .5, .83, 1]) {
  for (const family of [0, 1]) {
    const atoms = H.mixture(n, phase, family), later = H.mixture(n, phase + 1, family);
    assert.equal(atoms.length, n); assert.deepEqual(atoms, H.mixture(n, phase, family));
    close(atoms.reduce((sum, atom) => sum + atom.weight, 0), 1);
    atoms.forEach((atom, i) => {
      for (const key of ["x", "y", "s", "weight"]) close(atom[key], later[i][key]);
      assert.ok(atom.s > .24 && atom.weight > 0);
      assert.ok(Math.abs(atom.x) < 2 && Math.abs(atom.y) < 1.6);
    });
  }
  const scene = H.sampleScene(n, phase, 31);
  assert.equal(scene.product.length, n * n);
  assert.ok(scene.productWeight > 0 && scene.productWeight <= 1);
  assert.ok(scene.residual < 1e-14);
  assert.equal(scene.fields.length, 3);
  for (let k = 0; k < scene.fields[0].length; k++) {
    close(scene.fields[2][k], scene.fields[0][k] * scene.fields[1][k]);
    for (const field of scene.fields) assert.ok(Number.isFinite(field[k]) && field[k] >= 0 && field[k] <= 1);
  }
  scene.fields.forEach((field, j) => close(scene.maxima[j], Math.max(...field)));
}

// Expansion also works for mixtures with unequal cardinalities and signed
// coefficients, as needed for the linear span in the mathematical article.
const p = H.productMixture([a, b], [a, a, b]);
assert.equal(p.length, 6);
for (const [x, y] of [[0, 0], [-2, .5], [1, -1], [.3, .9]]) close(H.evaluate(p, x, y), H.evaluate([a, b], x, y) * H.evaluate([a, a, b], x, y));
assert.throws(() => H.mixture(0, 0), RangeError);
assert.throws(() => H.mixture(13, 0), RangeError);
assert.throws(() => H.mixture(5, NaN), RangeError);
assert.throws(() => H.sampleScene(5, .2, 2), RangeError);
assert.throws(() => H.multiplyAtoms(a, { ...b, s: 0 }), RangeError);
console.log("Gaussian hump products: exact identities, periodic mixtures, normalized coefficients, and sampled fields pass.");
