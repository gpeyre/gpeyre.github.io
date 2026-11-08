/* Exact three-point Kantorovich costs, including nonmetric power costs. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TransportSimplex = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const defaults = {
    vertices: [[.45, .4], [2.8, .55], [1.35, 2.25]],
    b: [1 / 3, 1 / 3, 1 / 3],
    p: 1
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
  function model(vertices, p = 1) {
    if (!Number.isFinite(p) || p <= 0) throw new RangeError("The exponent must be finite and strictly positive.");
    const { distances } = geometry(vertices);
    const costs = distances.map(row => row.map(d => {
      const c = d === 0 ? 0 : Math.pow(d, p);
      // Leave headroom for affine coefficients and rounded color-bar bounds.
      if (!Number.isFinite(c) || c > Number.MAX_VALUE / 16 || (d > 0 && c === 0)) throw new RangeError("These powered distances exceed floating-point range; reduce p or change the geometry.");
      return c;
    }));
    const edges = [[0, 1, 2], [0, 2, 1], [1, 2, 0]];
    const [i, j, k] = edges.reduce((best, edge) => costs[edge[0]][edge[1]] > costs[best[0]][best[1]] ? edge : best);
    const A = costs[i][k], B = costs[j][k];
    const excess = (costs[i][j] - Math.max(A, B)) - Math.min(A, B);
    const isMetric = excess <= 0;
    const weights = isMetric ? costs.map((row, r) => {
      const s = (r + 1) % 3, t = (r + 2) % 3;
      // Subtract the two large terms first to preserve a very short third edge.
      return Math.max(0, (Math.max(row[s], row[t]) - costs[s][t]) / 2 + Math.min(row[s], row[t]) / 2);
    }) : [0, 1, 2].map(r => r === i ? A : r === j ? B : 0);
    const planes = [];
    if (isMetric) {
      for (let mask = 0; mask < 8; mask++) {
        const u = weights.map((w, r) => (mask & (1 << r) ? 1 : -1) * w);
        planes.push({ u, v: u.map(x => -x) });
      }
    } else {
      // The full coupling LP, not shortest-path transport: a relay through k
      // is limited by the mass available there. Its exact value is
      // A|a_i-b_i| + B|a_j-b_j| + excess*max(0,a_i+b_j-1,a_j+b_i-1).
      // Expanding its absolute values and maximum gives twelve dual-feasible
      // affine functions. In particular the Dirac cost remains costs[i][j].
      for (const si of [-1, 1]) for (const sj of [-1, 1]) for (let branch = 0; branch < 3; branch++) {
        const base = [0, 1, 2].map(r => r === i ? si * A : r === j ? sj * B : 0);
        const u = base.slice(), v = base.map(x => -x);
        if (branch) {
          const from = branch === 1 ? i : j, to = branch === 1 ? j : i;
          for (let r = 0; r < 3; r++) if (r !== from) u[r] -= excess;
          v[to] += excess;
        }
        planes.push({ u, v });
      }
    }
    return { distances, costs, weights, p, isMetric, maxGroundCost: Math.max(...costs.flat()), planes,
      expensiveEdge: isMetric ? null : { i, j, k, excess } };
  }
  function value(a, b, transport) {
    probability(a); probability(b);
    if (transport.isMetric) return weightedCost(a, b, transport.weights);
    const { i, j, k, excess } = transport.expensiveEdge;
    // This cancellation-safe form gives exactly zero at a=b, including on the
    // boundary, and keeps a tiny short-edge cost even when another edge is huge.
    const di = a[i] - b[i], dj = a[j] - b[j];
    return transport.weights[i] * Math.abs(di) + transport.weights[j] * Math.abs(dj) + excess * Math.max(0, di - b[k], dj - b[k]);
  }
  function cost(a, b, vertices, p = 1) {
    return value(a, b, model(vertices, p));
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
  function cells(transport, b) {
    probability(b);
    const result = [];
    for (const cell of signCells(b)) {
      const coefficients = transport.weights.map((w, r) => cell.signs[r] * w);
      const offset = -coefficients.reduce((s, c, r) => s + c * b[r], 0);
      const baseValues = coefficients.map(c => c + offset);
      if (transport.isMetric) { result.push({ polygon: cell.polygon, values: baseValues }); continue; }
      const { i, j, excess } = transport.expensiveEdge;
      // Cut by the exact break lines, rather than compare nearly equal dual
      // planes. This remains well conditioned when power costs have huge ratios.
      for (let branch = 0; branch < 3; branch++) {
        let polygon = cell.polygon.map(a => a.slice()), values = baseValues.slice();
        if (branch === 0) {
          polygon = clip(polygon, i, 1 - b[j], -1);
          polygon = clip(polygon, j, 1 - b[i], -1);
        } else {
          const from = branch === 1 ? i : j, to = branch === 1 ? j : i;
          polygon = clip(polygon, from, 1 - b[to], 1);
          values = values.map((v, r) => v + excess * ((r === from ? 1 : 0) - (1 - b[to])));
        }
        if (polygon.length >= 3 && polygonArea(polygon) > 1e-13) result.push({ polygon, values });
      }
    }
    return result;
  }
  function contoursFromCells(vertices, pieces, levels) {
    if (!Array.isArray(levels) || levels.some(x => !Number.isFinite(x) || x < 0)) throw new RangeError("Contour levels must be finite and nonnegative.");
    return levels.map(level => {
      const segments = [], seen = new Set();
      // The zero level is the target point, drawn separately by the view.
      if (level === 0) return { level, segments };
      for (const { polygon, values } of pieces) {
        const scale = Math.max(level, ...values.map(Math.abs), Number.MIN_VALUE);
        // With an extreme exponent and a small locked color scale, an affine
        // piece can have coefficients many orders larger than the requested
        // level. Do not mistake cancellation at its boundary for that contour:
        // omit unresolvable pieces instead of drawing a spurious boundary line.
        if (level / scale <= 64 * Number.EPSILON) continue;
        const normalized = values.map(v => v / scale), normalizedLevel = level / scale;
        const intersections = [];
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i], next = polygon[(i + 1) % polygon.length];
          const fa = a.reduce((s, v, r) => s + v * normalized[r], -normalizedLevel);
          const fb = next.reduce((s, v, r) => s + v * normalized[r], -normalizedLevel);
          const roundoff = 32 * Number.EPSILON * (Math.abs(normalizedLevel) + a.reduce((s, v, r) => s + Math.abs(v * normalized[r]), 0));
          if (Math.abs(fa) <= roundoff) intersections.push(a);
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
  function contours(vertices, b, levels, p = 1) {
    return contoursFromCells(vertices, cells(model(vertices, p), b), levels);
  }
  function validateVertexMove(vertices, index, candidate) {
    if (!Number.isInteger(index) || index < 0 || index > 2 || !Array.isArray(candidate) || candidate.length !== 2 || candidate.some(x => !Number.isFinite(x))) return false;
    if (candidate[0] < .12 || candidate[0] > 3.08 || candidate[1] < .12 || candidate[1] > 2.48) return false;
    const proposed = vertices.map((v, i) => i === index ? candidate : v);
    if (signedDoubleArea(proposed) <= .15) return false;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (distanceSquared(proposed[i], proposed[j]) <= .3 ** 2) return false;
    return true;
  }
  return { defaults, geometry, model, value, cells, contoursFromCells, point, barycentric, projectProbability, weightedCost, cost, signCells, contours, validateVertexMove, signedDoubleArea };
});
