(function (root) {
  "use strict";
  const DOMAIN = { zMin: -2.4, zMax: 2.4, rMax: 2.4 };
  const LEVELS = [.1, .25, .5, 1, 2, 4];
  function exponent(p) {
    if (!Number.isFinite(p) || p < 1 || p > 4) throw new RangeError("Use 1 ≤ p ≤ 4.");
    return p;
  }
  function value(z, r, p) {
    exponent(p);
    if (!Number.isFinite(z) || !Number.isFinite(r)) throw new RangeError("Use finite coordinates.");
    if (r < 0) return Infinity;
    if (r === 0) return z === 0 ? 0 : p === 1 ? Math.abs(z) : Infinity;
    return Math.abs(z) ** p / (p * r ** (p - 1));
  }
  function levelRadius(r, level, p) {
    exponent(p);
    if (!Number.isFinite(r) || r < 0 || !Number.isFinite(level) || level <= 0) throw new RangeError("Use nonnegative mass and a positive level.");
    return (p * level) ** (1 / p) * (p === 1 ? 1 : r ** (1 - 1 / p));
  }
  function color(v) {
    const t = Math.min(1, Math.log1p(Math.max(0, v)) / Math.log(7));
    const stops = [[246, 250, 235], [132, 191, 170], [34, 114, 133], [31, 52, 84]];
    const index = Math.min(2, Math.floor(t * 3)), a = t * 3 - index;
    return "rgb(" + stops[index].map((x, i) => Math.round(x + a * (stops[index + 1][i] - x))).join(",") + ")";
  }
  const api = { domain: DOMAIN, levels: LEVELS, exponent, value, levelRadius, color };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PerspectivePowers = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
