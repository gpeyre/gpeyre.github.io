/* Uniform point-cloud spectral transport, with explicit convex optimality bounds. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SpectralTransport = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Symmetric matrices use [Q_11,Q_12,Q_22]; dot is the Frobenius inner product.
  const dot = (a, b) => a[0] * b[0] + 2 * a[1] * b[1] + a[2] * b[2];
  function eigenvalues(q) {
    const high = Math.max(0, (q[0] + q[2] + Math.hypot(q[0] - q[2], 2 * q[1])) / 2);
    return [high, high > 0 ? Math.max(0, q[0] * q[2] - q[1] * q[1]) / high : 0];
  }
  function gamma(q, p) {
    if (!(p > 0)) throw new RangeError("A positive Schatten exponent is required.");
    const [high, low] = eigenvalues(q);
    return p === Infinity || high === 0 ? high : high * Math.pow(1 + Math.pow(low / high, p), 1 / p);
  }
  function gradient(q, p, smoothing = 0) {
    if (p === 1) return [1, 0, 1];
    if (p === Infinity) {
      const gap = Math.hypot(q[0] - q[2], 2 * q[1], smoothing);
      return gap ? [.5 + (q[0] - q[2]) / (2 * gap), q[1] / gap, .5 - (q[0] - q[2]) / (2 * gap)] : [.5, 0, .5];
    }
    const [high, low] = eigenvalues(q);
    if (!high) return [1, 0, 1];
    const ratio = p < 1 ? Math.max(1e-10, low / high) : low / high;
    const wh = Math.pow(1 + Math.pow(ratio, p), 1 / p - 1), wl = wh * Math.pow(ratio, p - 1);
    const gap = high - low;
    if (gap <= high * 1e-12) return [Math.pow(2, 1 / p - 1), 0, Math.pow(2, 1 / p - 1)];
    const factor = (wh - wl) / gap;
    return [wl + factor * (q[0] - low), factor * q[1], wl + factor * (q[2] - low)];
  }
  function smoothValue(q, p, smoothing) {
    return p === Infinity ? (q[0] + q[2] + Math.hypot(q[0] - q[2], 2 * q[1], smoothing)) / 2 : gamma(q, p);
  }

  // Low-discrepancy samples are nested: changing n adds/removes points, not shapes.
  function radicalInverse(index, base) {
    let value = 0, fraction = 1 / base;
    while (index) { value += fraction * (index % base); index = Math.floor(index / base); fraction /= base; }
    return value;
  }
  function clouds(n) {
    if (!Number.isInteger(n) || n < 2 || n > 200) throw new RangeError("Use between 2 and 200 points per cloud.");
    const source = [], target = [];
    for (let i = 0; i < n; i++) {
      const component = i % 3, u = radicalInverse(i + 1, 2), v = radicalInverse(i + 1, 3);
      const angle = 2 * Math.PI * v, radius = .13 + .44 * Math.sqrt(u);
      const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
      const centersA = [[-1.03, -.13], [.08, .62], [.92, -.42]];
      const centersB = [[-.55, -.93], [.62, .18], [-.4, .99]];
      const ca = centersA[component], cb = centersB[(component + 1) % 3];
      source.push([ca[0] + 1.0 * x + .22 * y, ca[1] + .42 * y + .17 * Math.sin(5 * x)]);
      target.push([cb[0] + .48 * x - .15 * y + .1 * Math.sin(4 * y), cb[1] + .3 * x + 1.18 * y]);
    }
    return { source, target };
  }

  // Exact O(n^3) Hungarian assignment oracle. Its costs need not be nonnegative.
  function assignment(costs, n) {
    const u = new Float64Array(n + 1), v = new Float64Array(n + 1), matched = new Int32Array(n + 1), way = new Int32Array(n + 1);
    for (let i = 1; i <= n; i++) {
      matched[0] = i;
      let j0 = 0;
      const min = new Float64Array(n + 1); min.fill(Infinity);
      const used = new Uint8Array(n + 1);
      do {
        used[j0] = 1;
        const i0 = matched[j0];
        let delta = Infinity, j1 = 0;
        for (let j = 1; j <= n; j++) if (!used[j]) {
          const reduced = costs[(i0 - 1) * n + j - 1] - u[i0] - v[j];
          if (reduced < min[j]) { min[j] = reduced; way[j] = j0; }
          if (min[j] < delta) { delta = min[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) { u[matched[j]] += delta; v[j] -= delta; }
          else min[j] -= delta;
        }
        j0 = j1;
      } while (matched[j0] !== 0);
      do { const j1 = way[j0]; matched[j0] = matched[j1]; j0 = j1; } while (j0 !== 0);
    }
    const permutation = new Int32Array(n);
    for (let j = 1; j <= n; j++) permutation[matched[j] - 1] = j - 1;
    return permutation;
  }
  function geometry(source, target) {
    const n = source.length;
    if (n < 2 || target.length !== n || !source.concat(target).every(x => x.length === 2 && x.every(Number.isFinite)))
      throw new RangeError("The two uniform two-dimensional clouds must have the same size, at least two.");
    const moments = [new Float64Array(n * n), new Float64Array(n * n), new Float64Array(n * n)];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const dx = target[j][0] - source[i][0], dy = target[j][1] - source[i][1], k = i * n + j;
      moments[0][k] = dx * dx; moments[1][k] = dx * dy; moments[2][k] = dy * dy;
    }
    function atom(permutation) {
      const q = [0, 0, 0];
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) q[k] += moments[k][i * n + permutation[i]] / n;
      return { permutation, q, key: Array.from(permutation).join(","), weight: 0 };
    }
    const costs = new Float64Array(n * n);
    function oracle(g) {
      for (let k = 0; k < n * n; k++) costs[k] = g[0] * moments[0][k] + 2 * g[1] * moments[1][k] + g[2] * moments[2][k];
      return atom(assignment(costs, n));
    }
    return { n, moments, atom, oracle };
  }
  function planMoment(source, target, plan) {
    const q = [0, 0, 0];
    for (let i = 0; i < source.length; i++) for (let j = 0; j < target.length; j++) {
      const dx = target[j][0] - source[i][0], dy = target[j][1] - source[i][1], mass = plan[i][j];
      q[0] += mass * dx * dx; q[1] += mass * dx * dy; q[2] += mass * dy * dy;
    }
    return q;
  }
  function lineSearch(q, direction, maximum, p, smoothing) {
    const at = t => q.map((v, k) => v + t * direction[k]);
    if (dot(gradient(at(maximum), p, smoothing), direction) <= 0) return maximum;
    if (dot(gradient(q, p, smoothing), direction) >= 0) return 0;
    let lo = 0, hi = maximum;
    for (let k = 0; k < 38; k++) {
      const mid = (lo + hi) / 2;
      if (dot(gradient(at(mid), p, smoothing), direction) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function solve(source, target, p, options = {}) {
    if (!(p > 0)) throw new RangeError("A positive Schatten exponent is required.");
    const geo = geometry(source, target), first = geo.oracle([1, 0, 1]);
    const scale = Math.max(1e-12, first.q[0] + first.q[2]);
    const tolerance = options.tolerance ?? 2e-6 * scale;
    const maxIterations = options.maxIterations ?? 350;
    const smoothing = p === Infinity ? (options.smoothing ?? 1e-3 * scale) : 0;
    let active = [first], q = first.q.slice(), iterations = 0;
    first.weight = 1;
    if (p < 1) {
      // Concavity ensures a minimizer at a permutation, but the assignment
      // linearizations below are multistart descent, NOT a global certificate.
      const starts = [first];
      for (let k = 0; k < 10; k++) {
        const angle = Math.PI * k / 10, x = Math.cos(angle), y = Math.sin(angle);
        starts.push(geo.oracle([.025 + x * x, x * y, .025 + y * y]));
      }
      starts.push(geo.atom(Int32Array.from({ length: geo.n }, (_, i) => i)));
      starts.push(geo.atom(Int32Array.from({ length: geo.n }, (_, i) => geo.n - 1 - i)));
      let best = first, bestValue = gamma(q, p);
      for (const start of starts) {
        let current = start, value = gamma(current.q, p);
        for (let k = 0; k < Math.min(30, maxIterations); k++) {
          iterations++;
          const next = geo.oracle(gradient(current.q, p)), candidate = gamma(next.q, p);
          if (candidate >= value - 1e-12 * scale) break;
          current = next; value = candidate;
        }
        if (value < bestValue) { best = current; bestValue = value; }
      }
      best.weight = 1; active = [best]; q = best.q.slice();
    } else if (p > 1) {
      // Pairwise Frank-Wolfe: maintain a feasible sparse mixture of assignments.
      // Exact convex line searches avoid entropic bias in the displayed coupling.
      for (; iterations < maxIterations; iterations++) {
        const g = gradient(q, p, smoothing), toward = geo.oracle(g);
        const fwGap = Math.max(0, dot(g, q) - dot(g, toward.q));
        if (fwGap <= tolerance) break;
        let away = active[0];
        for (const item of active) if (dot(g, item.q) > dot(g, away.q)) away = item;
        let next = active.find(item => item.key === toward.key);
        if (!next) { next = toward; active.push(next); }
        const direction = next.q.map((v, k) => v - away.q[k]);
        const step = lineSearch(q, direction, away.weight, p, smoothing);
        if (!(step > 1e-14)) break;
        away.weight -= step; next.weight += step;
        active = active.filter(item => item.weight > 1e-13);
        q = [0, 0, 0];
        for (const item of active) for (let k = 0; k < 3; k++) q[k] += item.weight * item.q[k];
      }
    }
    const plan = Array.from({ length: geo.n }, () => new Array(geo.n).fill(0));
    for (const item of active) for (let i = 0; i < geo.n; i++) plan[i][item.permutation[i]] += item.weight / geo.n;
    const cost = gamma(q, p);
    let lowerBound = null, gap = null;
    if (p >= 1) {
      const g = gradient(q, p, smoothing), atom = geo.oracle(g);
      const fwGap = Math.max(0, dot(g, q) - dot(g, atom.q));
      lowerBound = Math.max(0, smoothValue(q, p, smoothing) - fwGap - smoothing / 2);
      gap = Math.max(0, cost - lowerBound);
    }
    return { plan, coupling: plan, q, cost, distance: Math.sqrt(cost), eigenvalues: eigenvalues(q), gap,
      lowerBound, certified: p >= 1, iterations, supportSize: active.length, smoothingError: smoothing / 2,
      status: p < 1 ? "multistart heuristic" : p === Infinity ? "smoothed convex solve" : p === 1 ? "exact quadratic OT" : "convex solve" };
  }
  function interpolation(source, target, plan, t) {
    const particles = [];
    for (let i = 0; i < source.length; i++) for (let j = 0; j < target.length; j++) if (plan[i][j] > 1e-14) {
      particles.push({ mass: plan[i][j], source: i, target: j,
        point: source[i].map((x, k) => (1 - t) * x + t * target[j][k]) });
    }
    return particles;
  }
  return { clouds, solve, eigenvalues, gamma, gradient, assignment, planMoment, interpolation };
});
