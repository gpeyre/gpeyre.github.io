/* Dependency-free 2 × 2 covariance geometry. Matrices are row-major arrays. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BuresCovariances = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const EPS = Number.EPSILON, I = [1, 0, 0, 1];
  function scale(A, s) { return A.map(v => v * s); }
  function add(A, B) { return A.map((v, i) => v + B[i]); }
  function transpose(A) { return [A[0], A[2], A[1], A[3]]; }
  function multiply(A, B) { return [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]]; }
  function symmetric(A) { const b = A[1] / 2 + A[2] / 2; return [A[0], b, b, A[3]]; }
  function norm(A) { return Math.hypot(...A); }
  function trace(A) { return A[0] + A[3]; }
  // Error-free product correction on normalized entries keeps tiny, positive
  // determinants meaningful near rank one. No unscaled products are split.
  function productError(a, b, p) {
    const splitter = 134217729, ca = splitter * a, cb = splitter * b;
    const ah = ca - (ca - a), al = a - ah, bh = cb - (cb - b), bl = b - bh;
    return ((ah * bh - p) + ah * bl + al * bh) + al * bl;
  }
  function smallDet(a, b, d) { const p = a * d, q = b * b; return (p - q) + (productError(a, d, p) - productError(b, b, q)); }
  function normalized(A) {
    if (!Array.isArray(A) || A.length !== 4 || !A.every(Number.isFinite)) throw new RangeError("A covariance must contain four finite row-major entries.");
    const s = Math.max(...A.map(Math.abs));
    if (s === 0) return { matrix: [0, 0, 0, 0], scale: 0, determinant: 0 };
    if (Math.abs(A[1] / s - A[2] / s) > 64 * EPS) throw new RangeError("A covariance must be symmetric.");
    const a = A[0] / s, b = (A[1] / s + A[2] / s) / 2, d = A[3] / s, det = smallDet(a, b, d);
    if (a < 0 || d < 0 || det < -64 * EPS) throw new RangeError("A covariance must be positive semidefinite.");
    return { matrix: [a, b, b, d], scale: s, determinant: Math.max(0, det) };
  }
  function determinant(A) { const N = normalized(A); return N.determinant * N.scale * N.scale; }
  function sqrt(A) {
    const N = normalized(A), M = N.matrix;
    if (N.scale === 0) return [0, 0, 0, 0];
    const d = Math.sqrt(N.determinant), denominator = Math.sqrt(M[0] + M[3] + 2 * d), s = Math.sqrt(N.scale);
    return [(M[0] + d) / denominator * s, M[1] / denominator * s, M[2] / denominator * s, (M[3] + d) / denominator * s];
  }
  function eigen(A) {
    const N = normalized(A), M = N.matrix, high = (M[0] + M[3] + Math.hypot(M[0] - M[3], 2 * M[1])) / 2;
    const angle = Math.atan2(2 * M[1], M[0] - M[3]) / 2, c = Math.cos(angle), s = Math.sin(angle);
    return { values: [high * N.scale, (high ? N.determinant / high : 0) * N.scale], angle, vectors: [c, -s, s, c] };
  }
  function inverseSqrt(A) {
    const E = eigen(A);
    if (!(E.values[1] > 0)) throw new RangeError("The transport formula requires strictly positive definite covariances.");
    const a = 1 / Math.sqrt(E.values[0]), b = 1 / Math.sqrt(E.values[1]), c = Math.cos(E.angle), s = Math.sin(E.angle);
    return [a * c * c + b * s * s, (a - b) * c * s, (a - b) * c * s, a * s * s + b * c * c];
  }
  function transport(A, B) {
    // Normalize endpoints separately: sqrt(A) B sqrt(A) would overflow for
    // large common scales even when the resulting transport is well behaved.
    const NA = normalized(A), NB = normalized(B), X = sqrt(NA.matrix), inverse = inverseSqrt(NA.matrix);
    if (!(eigen(NB.matrix).values[1] > 0)) throw new RangeError("The UI transport formula requires strictly positive definite covariances.");
    const middle = sqrt(symmetric(multiply(multiply(X, NB.matrix), X)));
    return scale(symmetric(multiply(multiply(inverse, middle), inverse)), Math.sqrt(NB.scale) / Math.sqrt(NA.scale));
  }
  function alignedFactors(A, B) {
    const X = sqrt(A), Y = sqrt(B), nx = norm(X), ny = norm(Y);
    const M = nx && ny ? multiply(scale(X, 1 / nx), scale(Y, 1 / ny)) : [0, 0, 0, 0];
    const a = M[0] + M[3], b = M[1] - M[2], h = Math.hypot(a, b);
    const U = h ? [a / h, -b / h, b / h, a / h] : I.slice();
    return { X, Y: multiply(Y, U), U };
  }
  function rootDistance(A, B) { const X = sqrt(A), Y = sqrt(B); return norm(X.map((v, i) => v - Y[i])); }
  // Computing a factor difference avoids cancellation of almost equal traces.
  // The proper Procrustes rotation also works for singular PSD endpoints.
  function buresDistance(A, B) { const F = alignedFactors(A, B); return norm(F.X.map((v, i) => v - F.Y[i])); }
  function parameter(t) { if (!Number.isFinite(t) || t < 0 || t > 1) throw new RangeError("Interpolation time must lie in [0,1]."); }
  function interpolate(A, B, t, kind) {
    parameter(t); normalized(A); normalized(B);
    if (kind !== "root" && kind !== "bures") throw new RangeError("Unknown covariance geometry.");
    if (t === 0) return A.slice(); if (t === 1) return B.slice();
    const F = kind === "bures" ? alignedFactors(A, B) : { X: sqrt(A), Y: sqrt(B) };
    const Z = F.X.map((v, i) => (1 - t) * v + t * F.Y[i]);
    return symmetric(multiply(Z, transpose(Z)));
  }
  function rootGeodesic(A, B, t) { return interpolate(A, B, t, "root"); }
  function buresGeodesic(A, B, t) { return interpolate(A, B, t, "bures"); }
  function commutator(A, B) { const AB = multiply(A, B), BA = multiply(B, A); return AB.map((v, i) => v - BA[i]); }
  function relativeCommutator(A, B) {
    const X = normalized(A).matrix, Y = normalized(B).matrix, a = norm(X), b = norm(Y);
    return a && b ? norm(commutator(scale(X, 1 / a), scale(Y, 1 / b))) : 0;
  }
  function covariance(angleDegrees, aspect, size) {
    if (![angleDegrees, aspect, size].every(Number.isFinite) || aspect < 1 || size <= 0) throw new RangeError("Ellipse aspect must be ≥1 and size strictly positive.");
    const angle = angleDegrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle), a = size * size * aspect, b = size * size / aspect;
    return [a * c * c + b * s * s, (a - b) * c * s, (a - b) * c * s, a * s * s + b * c * c];
  }
  const presets = {
    commuting: { aAngle: 20, bAngle: 20, aAspect: 3.8, bAspect: 1.7, bSize: 1.2, t: .5 },
    noncommuting: { aAngle: -15, bAngle: 30, aAspect: 9, bAspect: 6, bSize: 1.08, t: .5 },
    thin: { aAngle: 0, bAngle: 78, aAspect: 25, bAspect: 25, bSize: .85, t: .5 }
  };
  return { I: I.slice(), scale, add, transpose, multiply, symmetric, norm, trace, determinant, sqrt, eigen, inverseSqrt, transport, alignedFactors, rootDistance, buresDistance, rootGeodesic, buresGeodesic, commutator, relativeCommutator, covariance, presets };
});
