/* Peak-normalized Gaussian humps and their exact finite-product expansion. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HumpAlgebra = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TAU = 2 * Math.PI;
  function atomCheck(a) {
    if (!a || ![a.x, a.y, a.s, a.weight].every(Number.isFinite) || !(a.s > 0))
      throw new RangeError("A hump needs finite center and weight, and a positive width.");
    return a;
  }
  function evaluate(atoms, x, y) {
    let value = 0;
    for (const a of atoms) {
      const dx = x - a.x, dy = y - a.y;
      value += a.weight * Math.exp(-(dx * dx + dy * dy) / (2 * a.s * a.s));
    }
    return value;
  }
  function multiplyAtoms(a, b) {
    atomCheck(a); atomCheck(b);
    const s2 = a.s * a.s, t2 = b.s * b.s, sum = s2 + t2;
    const dx = a.x - b.x, dy = a.y - b.y;
    return {
      x: (t2 * a.x + s2 * b.x) / sum,
      y: (t2 * a.y + s2 * b.y) / sum,
      s: Math.sqrt(s2 * t2 / sum),
      weight: a.weight * b.weight * Math.exp(-(dx * dx + dy * dy) / (2 * sum))
    };
  }
  function productMixture(first, second) {
    return first.flatMap(a => second.map(b => multiplyAtoms(a, b)));
  }
  function mixture(n, phase, family = 0) {
    if (!Number.isInteger(n) || n < 1 || n > 12 || !Number.isFinite(phase) || ![0, 1].includes(family))
      throw new RangeError("Use 1–12 bumps, a finite motion phase, and family 0 or 1.");
    const t = TAU * phase, atoms = [];
    for (let i = 0; i < n; i++) {
      const angle = i * 2.399963229728653 + family * 1.18;
      const radius = .48 + .62 * Math.sqrt((i % 7) / 6);
      const shift = family ? .34 : -.34;
      atoms.push({
        x: shift + radius * Math.cos(angle + (family ? -.22 : .19) * Math.sin(t)) + .32 * Math.sin(t + .9 * i + family),
        y: .83 * radius * Math.sin(angle) + .29 * Math.cos(t + 1.3 * i + family * .8),
        s: .25 + .18 * (.5 + .5 * Math.cos(i * 1.71 + family * .8)) + (n === 1 ? .16 : 0),
        weight: .85 + .3 * (.5 + .5 * Math.sin(i * 2.07 + family))
      });
    }
    const total = atoms.reduce((s, a) => s + a.weight, 0);
    for (const a of atoms) a.weight /= total;
    return atoms;
  }
  function sampleScene(n, phase, size = 181) {
    if (!Number.isInteger(size) || size < 3 || size > 501) throw new RangeError("Use a grid size between 3 and 501.");
    const first = mixture(n, phase, 0), second = mixture(n, phase, 1), product = productMixture(first, second);
    const min = -2.5, max = 2.5, fields = Array.from({ length: 3 }, () => new Float64Array(size * size));
    const maxima = [0, 0, 0];
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
      const x = min + (max - min) * col / (size - 1), y = max - (max - min) * row / (size - 1);
      const k = row * size + col;
      fields[0][k] = evaluate(first, x, y); fields[1][k] = evaluate(second, x, y);
      fields[2][k] = fields[0][k] * fields[1][k];
      for (let j = 0; j < 3; j++) maxima[j] = Math.max(maxima[j], fields[j][k]);
    }
    // Independent expanded evaluation on a separate, fixed 17 × 17 grid.
    let residual = 0;
    for (let row = 0; row < 17; row++) for (let col = 0; col < 17; col++) {
      const x = min + (max - min) * col / 16, y = min + (max - min) * row / 16;
      residual = Math.max(residual, Math.abs(evaluate(product, x, y) - evaluate(first, x, y) * evaluate(second, x, y)));
    }
    return { n, phase, size, min, max, first, second, product, fields, maxima, residual,
      productWeight: product.reduce((sum, a) => sum + a.weight, 0) };
  }
  return { evaluate, multiplyAtoms, productMixture, mixture, sampleScene };
});
