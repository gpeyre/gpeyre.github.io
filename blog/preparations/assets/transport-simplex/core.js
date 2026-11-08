/* Exact three-point Wasserstein-1 geometry; shared by the experiment and tests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TransportSimplex = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const defaults = {
    vertices: [[.45, .4], [2.8, .55], [1.35, 2.25]],
    b: [1 / 3, 1 / 3, 1 / 3]
  };
  const simplexVertices = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  function vector(v, length) {
    if (!Array.isArray(v) || v.length !== length || v.some(x => !Number.isFinite(x))) throw new RangeError("Expected a finite coordinate vector.");
    return v;
  }
  function probability(a) {
    vector(a, 3);
    if (a.some(x => x < -1e-12) || Math.abs(a.reduce((s, x) => s + x, 0) - 1) > 1e-9) throw new RangeError("Expected three nonnegative weights summing to one.");
    return a;
  }
  function support(vertices) {
    if (!Array.isArray(vertices) || vertices.length !== 3) throw new RangeError("Expected three support points.");
    vertices.forEach(v => vector(v, 2));
    return vertices;
  }
  function signedDoubleArea(vertices) {
    const [a, b, c] = vertices;
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }
  function geometry(vertices) {
    support(vertices);
    const distances = vertices.map(x => vertices.map(y => Math.hypot(x[0] - y[0], x[1] - y[1])));
    const weights = distances.map((row, i) => {
      const j = (i + 1) % 3, k = (i + 2) % 3;
      // Tiny negative values can only be floating-point triangle-inequality error.
      return Math.max(0, (row[j] + row[k] - distances[j][k]) / 2);
    });
    return { distances, weights };
  }
  function point(a, vertices) {
    return [0, 1].map(k => a.reduce((sum, value, i) => sum + value * vertices[i][k], 0));
  }
  function barycentric(xy, vertices) {
    vector(xy, 2); support(vertices);
    const [x, y, z] = vertices, area = signedDoubleArea(vertices);
    if (Math.abs(area) < 1e-14) throw new RangeError("A non-collinear triangle is required.");
    const a1 = ((y[0] - xy[0]) * (z[1] - xy[1]) - (y[1] - xy[1]) * (z[0] - xy[0])) / area;
    const a2 = ((z[0] - xy[0]) * (x[1] - xy[1]) - (z[1] - xy[1]) * (x[0] - xy[0])) / area;
    return [a1, a2, 1 - a1 - a2];
  }
  function projectProbability(a) {
    vector(a, 3);
    // Shift first: the simplex projection is unchanged by a common offset.
    const largest = Math.max(...a), shifted = a.map(x => x - largest);
    const sorted = shifted.slice().sort((x, y) => y - x);
    let total = 0, threshold = 0;
    for (let i = 0; i < 3; i++) {
      total += sorted[i];
      threshold = (total - 1) / (i + 1);
      if (i === 2 || sorted[i + 1] <= threshold) break;
    }
    const result = shifted.map(x => Math.max(0, x - threshold));
    const pivot = result.indexOf(Math.max(...result));
    result[pivot] += 1 - result.reduce((s, x) => s + x, 0);
    return result;
  }
  function weightedCost(a, b, weights) {
    return weights.reduce((sum, value, i) => sum + value * Math.abs(a[i] - b[i]), 0);
  }
  function cost(a, b, vertices) {
    probability(a); probability(b);
    return weightedCost(a, b, geometry(vertices).weights);
  }
  function distanceSquared(a, b) {
    return a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);
  }
  function unique(points) {
    return points.filter((p, i) => !points.slice(0, i).some(q => distanceSquared(p, q) < 1e-22));
  }
  function clip(polygon, coordinate, threshold, sign) {
    if (!polygon.length) return [];
    const result = [];
    let previous = polygon[polygon.length - 1], previousValue = sign * (previous[coordinate] - threshold);
    for (const current of polygon) {
      const currentValue = sign * (current[coordinate] - threshold);
      const previousInside = previousValue >= -1e-14, currentInside = currentValue >= -1e-14;
      if (previousInside !== currentInside) {
        const t = previousValue / (previousValue - currentValue);
        result.push(previous.map((value, i) => value + t * (current[i] - value)));
      }
      if (currentInside) result.push(current.slice());
      previous = current; previousValue = currentValue;
    }
    return unique(result);
  }
  function polygonArea(polygon) {
    return Math.abs(polygon.reduce((sum, p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      return sum + p[0] * q[1] - p[1] * q[0];
    }, 0)) / 2;
  }
  function signCells(b) {
    probability(b);
    const cells = [];
    for (let mask = 0; mask < 8; mask++) {
      const signs = [0, 1, 2].map(i => mask & (1 << i) ? 1 : -1);
      let polygon = simplexVertices.map(p => p.slice());
      for (let i = 0; i < 3; i++) polygon = clip(polygon, i, b[i], signs[i]);
      if (polygon.length >= 3 && polygonArea(polygon) > 1e-13) cells.push({ polygon, signs });
    }
    return cells;
  }
  function contours(vertices, b, levels) {
    const { weights } = geometry(vertices), cells = signCells(b);
    if (!Array.isArray(levels) || levels.some(x => !Number.isFinite(x) || x < 0)) throw new RangeError("Contour levels must be finite and nonnegative.");
    return levels.map(level => {
      const segments = [], seen = new Set(), tolerance = 1e-11 * Math.max(1, level, ...weights);
      // The zero level is the target point, drawn separately by the view.
      if (level === 0) return { level, segments };
      for (const { polygon } of cells) {
        const intersections = [];
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i], next = polygon[(i + 1) % polygon.length];
          const fa = weightedCost(a, b, weights) - level, fb = weightedCost(next, b, weights) - level;
          if (Math.abs(fa) <= tolerance) intersections.push(a);
          if (fa * fb < 0) {
            const t = fa / (fa - fb);
            intersections.push(a.map((value, j) => value + t * (next[j] - value)));
          }
        }
        const points = unique(intersections).map(a => point(a, vertices));
        if (points.length < 2) continue;
        // A line meets a convex cell in a segment; select its two endpoints.
        let endpoints, longest = 0;
        for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
          const length = distanceSquared(points[i], points[j]);
          if (length > longest) { longest = length; endpoints = [points[i], points[j]]; }
        }
        if (longest < 1e-20) continue;
        const key = endpoints.map(p => p.map(x => Math.round(x * 1e10)).join(",")).sort().join(";");
        if (!seen.has(key)) { seen.add(key); segments.push(endpoints); }
      }
      return { level, segments };
    });
  }
  function validateVertexMove(vertices, index, candidate) {
    if (!Number.isInteger(index) || index < 0 || index > 2 || !Array.isArray(candidate) || candidate.length !== 2 || candidate.some(x => !Number.isFinite(x))) return false;
    if (candidate[0] < .12 || candidate[0] > 3.08 || candidate[1] < .12 || candidate[1] > 2.48) return false;
    const proposed = vertices.map((v, i) => i === index ? candidate : v);
    if (signedDoubleArea(proposed) <= .15) return false;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (distanceSquared(proposed[i], proposed[j]) <= .3 ** 2) return false;
    return true;
  }
  return { defaults, geometry, point, barycentric, projectProbability, weightedCost, cost, signCells, contours, validateVertexMove, signedDoubleArea };
});
