/* Two isospectral quadratics, compared using norm-steepest descent. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SignGeometryCore = api;
})(globalThis, function () {
  "use strict";

  const exponents = Object.freeze([1, 1.1, 1.2, 1.35, 1.5, 1.75, 2, 2.25, 2.5, 3, 4, 6, 8, 12, 20, 40, Infinity]);
  const eigenvalues = Object.freeze([.16, 1]);
  const seeds = Object.freeze([[.90, .66], [-.77, .83], [-1.13, -.39], [.62, -.94], [1.09, -.28]].map(Object.freeze));
  const angles = Object.freeze([0, Math.PI / 4]);
  const levels = Object.freeze([.006, .012, .025, .05, .09, .15, .24, .36, .52, .74, 1, 1.45, 2.05]);
  const horizon = 48, extent = 1.45;

  function checkExponent(p) {
    if (typeof p !== "number" || !(p >= 1)) throw new RangeError("Choose p in [1, infinity]");
  }

  function direction(gx, gy, p) {
    checkExponent(p);
    const ax = Math.abs(gx), ay = Math.abs(gy), m = Math.max(ax, ay);
    if (m === 0) return [0, 0];
    if (p === 1) return ax >= ay ? [-gx, 0] : [0, -gy];
    if (p === Infinity) return [gx ? -(ax + ay) * Math.sign(gx) : 0, gy ? -(ax + ay) * Math.sign(gy) : 0];
    if (p === 2) return [-gx, -gy];

    // Factor out the largest component before taking powers. With
    // s = |g|/m and A = sum(s^q), the common scale is m A^(2/q-1).
    const q = p / (p - 1), sx = ax / m, sy = ay / m;
    const scale = m * (sx ** q + sy ** q) ** (2 / q - 1);
    return [gx ? -Math.sign(gx) * scale * sx ** (q - 1) : 0,
      gy ? -Math.sign(gy) * scale * sy ** (q - 1) : 0];
  }

  function stepSize(p) {
    checkExponent(p);
    // H has Euclidean operator norm one and ||v||_2^2 <= L ||v||_p^2.
    // This shared safe bound does not depend on the orientation of H.
    return 1 / Math.max(1, 2 ** (1 - 2 / p));
  }

  function rotate(angle, x, y) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: c * x - s * y, y: s * x + c * y };
  }

  function hessianAt(angle) {
    const c = Math.cos(angle), s = Math.sin(angle), [a, b] = eigenvalues;
    return [a * c * c + b * s * s, (a - b) * c * s, a * s * s + b * c * c];
  }

  function energy([a, b, c], x, y) {
    return (a * x * x + 2 * b * x * y + c * y * y) / 2;
  }

  function contourPoint(angle, level, t) {
    return rotate(angle, Math.sqrt(2 * level / eigenvalues[0]) * Math.cos(t),
      Math.sqrt(2 * level / eigenvalues[1]) * Math.sin(t));
  }

  function descent(hessian, start, p, eta) {
    const [a, b, c] = hessian;
    let { x, y } = start;
    const points = [{ x, y, loss: energy(hessian, x, y) }];
    for (let k = 0; k < horizon; k++) {
      const [dx, dy] = direction(a * x + b * y, b * x + c * y, p);
      x += eta * dx;
      y += eta * dy;
      points.push({ x, y, loss: energy(hessian, x, y) });
    }
    return points;
  }

  function compute(p) {
    const eta = stepSize(p);
    const trajectories = angles.map(angle => {
      const hessian = hessianAt(angle);
      const runs = seeds.map(seed => {
        const start = rotate(angle, ...seed);
        return { selected: descent(hessian, start, p, eta), euclidean: descent(hessian, start, 2, 1) };
      });
      return { angle, hessian, runs };
    });
    return { p, trajectories, eta };
  }

  return Object.freeze({ exponents, eigenvalues, seeds, horizon, extent, levels,
    direction, stepSize, rotate, hessianAt, energy, contourPoint, compute });
});
