/* Uniform transport through squared entries of a real orthogonal matrix.
   Numerical descent is local: its energy need not reach the assignment optimum. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.OrthostochasticOT = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const defaults = Object.freeze({ n: 12, motion: 0.5, tMax: 30, snapshotCount: 121, maxStep: 0.02 });
  function random(seed) {
    let state = seed >>> 0;
    return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return ((state >>> 0) + 0.5) / 4294967296; };
  }
  function identity(n) {
    const a = new Float64Array(n * n);
    for (let i = 0; i < n; i++) a[i * n + i] = 1;
    return a;
  }
  function multiply(a, b, n) {
    const c = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      const aik = a[i * n + k];
      for (let j = 0; j < n; j++) c[i * n + j] += aik * b[k * n + j];
    }
    return c;
  }
  function transposeMultiply(a, b, n) {
    const c = new Float64Array(n * n);
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) {
      const aki = a[k * n + i];
      for (let j = 0; j < n; j++) c[i * n + j] += aki * b[k * n + j];
    }
    return c;
  }
  // All operations are column rotations, so the result belongs to SO(n).
  function initialOrthogonal(n, mode = "dense", seed = 1618033) {
    const q = identity(n), rng = random(seed + 67 * n), near = mode === "nearIdentity";
    for (let sweep = 0; sweep < (near ? 1 : 3); sweep++) {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const angle = (2 * rng() - 1) * (near ? 0.16 : Math.PI), c = Math.cos(angle), s = Math.sin(angle);
        for (let k = 0; k < n; k++) {
          const x = q[k * n + i], y = q[k * n + j];
          q[k * n + i] = c * x + s * y; q[k * n + j] = -s * x + c * y;
        }
      }
    }
    return q;
  }
  // Hungarian primal/dual algorithm. Costs and returned potentials are NOT
  // divided by n; primal and dual energies are normalized by n at the end.
  function hungarian(cost, n) {
    if (cost.length !== n * n || !Number.isInteger(n) || n < 1 || !Array.from(cost).every(Number.isFinite))
      throw new RangeError("Expected a finite square cost matrix");
    const u = new Float64Array(n + 1), v = new Float64Array(n + 1), p = new Int32Array(n + 1), way = new Int32Array(n + 1);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      const minv = new Float64Array(n + 1); minv.fill(Infinity);
      const used = new Uint8Array(n + 1);
      let j0 = 0;
      do {
        used[j0] = 1;
        const i0 = p[j0]; let delta = Infinity, j1 = 0;
        for (let j = 1; j <= n; j++) if (!used[j]) {
          const current = cost[(i0 - 1) * n + j - 1] - u[i0] - v[j];
          if (current < minv[j]) { minv[j] = current; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
          else minv[j] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0 !== 0);
    }
    const assignment = new Int32Array(n);
    for (let j = 1; j <= n; j++) assignment[p[j] - 1] = j - 1;
    let primal = 0, dual = 0, maxDualViolation = 0;
    for (let i = 0; i < n; i++) {
      primal += cost[i * n + assignment[i]]; dual += u[i + 1] + v[i + 1];
      for (let j = 0; j < n; j++) maxDualViolation = Math.max(maxDualViolation, u[i + 1] + v[j + 1] - cost[i * n + j]);
    }
    return { assignment, u: u.slice(1), v: v.slice(1), primal: primal / n, dual: dual / n,
      dualityGap: Math.abs(primal - dual) / n, maxDualViolation };
  }
  function prepare(options = {}) {
    const o = Object.assign({}, defaults, options);
    const n = o.preset === "trap" ? 3 : o.n, motion = o.motion;
    if (!Number.isInteger(n) || n < 3 || n > 32 || !Number.isFinite(motion) || motion < 0 || motion > 1)
      throw new RangeError("Use 3–32 points and motion in [0,1]");
    const source = [], target = [];
    if (o.preset === "trap") {
      const rotation = (65 + 20 * motion) * Math.PI / 180;
      for (let i = 0; i < 3; i++) {
        const a = 2 * Math.PI * i / 3;
        source.push([Math.cos(a), Math.sin(a)]); target.push([Math.cos(a + rotation), Math.sin(a + rotation)]);
      }
    } else {
      const rng = random(27182818), normal = () => Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng());
      const angle = 1.1 * (motion - 0.5), c = Math.cos(angle), s = Math.sin(angle);
      for (let i = 0; i < n; i++) {
        const a = 2 * Math.PI * (i % 3) / 3;
        source.push([0.95 * Math.cos(a) + 0.24 * normal() - 0.3, 0.7 * Math.sin(a) + 0.22 * normal()]);
        const b = a + 0.32, x = 0.88 * Math.cos(b) + 0.29 * normal(), y = 0.9 * Math.sin(b) + 0.22 * normal();
        target.push([c * x - s * y + 0.45 + 0.25 * Math.sin(2 * Math.PI * motion),
          s * x + c * y + 0.28 * Math.sin(Math.PI * motion) + 0.12 * (2 * motion - 1) * x * x]);
      }
    }
    const cost = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cost[i * n + j] =
      (source[i][0] - target[j][0]) ** 2 + (source[i][1] - target[j][1]) ** 2;
    const solution = hungarian(cost, n);
    return { n, motion, preset: o.preset === "trap" ? "trap" : "clouds", source, target, cost,
      assignment: solution.assignment, optimalEnergy: solution.primal,
      assignmentDiagnostics: { dualityGap: solution.dualityGap, maxDualViolation: solution.maxDualViolation } };
  }
  function energy(q, cost, n) {
    let result = 0;
    for (let i = 0; i < q.length; i++) result += cost[i] * q[i] * q[i];
    return result / n;
  }
  // Metric: <U,V>_Q = tr(U^T V)/n. The ambient gradient for this
  // normalized metric is G=2(C .* Q), and grad E(Q)=Q K, K=skew(Q^T G).
  function gradient(q, cost, n) {
    const ambient = new Float64Array(n * n);
    for (let i = 0; i < ambient.length; i++) ambient[i] = 2 * cost[i] * q[i];
    const qtG = transposeMultiply(q, ambient, n), skew = new Float64Array(n * n);
    let normSquared = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const value = (qtG[i * n + j] - qtG[j * n + i]) / 2;
      skew[i * n + j] = value; skew[j * n + i] = -value; normSquared += 2 * value * value / n;
    }
    return { skew, tangent: multiply(q, skew, n), normSquared };
  }
  // Solve A X=B using pivoted elimination, with n right-hand sides.
  function solve(a, b, n) {
    a = new Float64Array(a); b = new Float64Array(b);
    for (let k = 0; k < n; k++) {
      let pivot = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(a[i * n + k]) > Math.abs(a[pivot * n + k])) pivot = i;
      if (Math.abs(a[pivot * n + k]) < 1e-14) throw new Error("Singular Cayley solve");
      if (pivot !== k) for (let j = 0; j < n; j++) {
        const x = a[k * n + j]; a[k * n + j] = a[pivot * n + j]; a[pivot * n + j] = x;
        const y = b[k * n + j]; b[k * n + j] = b[pivot * n + j]; b[pivot * n + j] = y;
      }
      const diagonal = a[k * n + k];
      for (let i = k + 1; i < n; i++) {
        const factor = a[i * n + k] / diagonal; a[i * n + k] = 0;
        for (let j = k + 1; j < n; j++) a[i * n + j] -= factor * a[k * n + j];
        for (let j = 0; j < n; j++) b[i * n + j] -= factor * b[k * n + j];
      }
    }
    const x = new Float64Array(n * n);
    for (let i = n - 1; i >= 0; i--) for (let j = 0; j < n; j++) {
      let value = b[i * n + j];
      for (let k = i + 1; k < n; k++) value -= a[i * n + k] * x[k * n + j];
      x[i * n + j] = value / a[i * n + i];
    }
    return x;
  }
  function cayleyStep(q, skew, step, n) {
    const a = identity(n), b = identity(n);
    for (let i = 0; i < a.length; i++) { a[i] += step * skew[i] / 2; b[i] -= step * skew[i] / 2; }
    return multiply(q, solve(a, b, n), n);
  }
  function orthogonalityError(q, n) {
    const gram = transposeMultiply(q, q, n); let error = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) error = Math.max(error, Math.abs(gram[i * n + j] - (i === j ? 1 : 0)));
    return error;
  }
  function marginalError(q, n) {
    let error = 0;
    for (let i = 0; i < n; i++) {
      let row = 0, column = 0;
      for (let j = 0; j < n; j++) { row += q[i * n + j] ** 2 / n; column += q[j * n + i] ** 2 / n; }
      error = Math.max(error, Math.abs(row - 1 / n), Math.abs(column - 1 / n));
    }
    return error;
  }
  function run(options = {}) {
    const o = Object.assign({}, defaults, options), data = prepare(o), n = data.n;
    if (!(o.tMax > 0) || !Number.isFinite(o.tMax) || !Number.isInteger(o.snapshotCount) || o.snapshotCount < 2 || o.snapshotCount > 1001 || !(o.maxStep > 0) || !Number.isFinite(o.maxStep))
      throw new RangeError("Invalid flow horizon, step or snapshot count");
    let q = initialOrthogonal(n, o.initial || (data.preset === "trap" ? "nearIdentity" : "dense")), t = 0, currentEnergy = energy(q, data.cost, n);
    const times = new Float64Array(o.snapshotCount), energies = new Float64Array(o.snapshotCount), snapshots = [];
    let steps = 0, rejectedSteps = 0, maxOrthogonalityError = 0, maxMarginalError = 0, finalGradientNorm = 0;
    for (let frame = 0; frame < o.snapshotCount; frame++) {
      const targetTime = o.tMax * frame / (o.snapshotCount - 1);
      while (t < targetTime - 1e-12) {
        const g = gradient(q, data.cost, n); finalGradientNorm = Math.sqrt(g.normSquared);
        if (g.normSquared < 1e-25) { t = targetTime; break; }
        let step = Math.min(o.maxStep, targetTime - t), candidate, value;
        let accepted = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          candidate = cayleyStep(q, g.skew, step, n); value = energy(candidate, data.cost, n);
          if (value <= currentEnergy - 1e-4 * step * g.normSquared + 1e-14 && value <= currentEnergy + 1e-14) { accepted = true; break; }
          step /= 2; rejectedSteps++;
        }
        if (!accepted || step < 1e-12) throw new Error("Descent line search failed; no approximate result was substituted");
        q = candidate; currentEnergy = value; t += step; steps++;
        if (steps > 100000) throw new Error("Flow step limit exceeded");
      }
      times[frame] = targetTime; energies[frame] = currentEnergy; snapshots.push(new Float64Array(q));
      maxOrthogonalityError = Math.max(maxOrthogonalityError, orthogonalityError(q, n));
      maxMarginalError = Math.max(maxMarginalError, marginalError(q, n));
    }
    finalGradientNorm = Math.sqrt(gradient(q, data.cost, n).normSquared);
    return Object.assign(data, { times, energies, snapshots, diagnostics: {
      steps, rejectedSteps, orthogonalityError: maxOrthogonalityError, marginalError: maxMarginalError,
      dualityGap: data.assignmentDiagnostics.dualityGap, maxDualViolation: data.assignmentDiagnostics.maxDualViolation,
      finalGradientNorm, finalEnergyGap: currentEnergy - data.optimalEnergy,
      metric: "normalized Frobenius: tr(U^T V)/n", integrator: "Cayley retraction with Armijo backtracking", maxStep: o.maxStep } });
  }
  function sample(result, index) {
    if (!Number.isInteger(index) || index < 0 || index >= result.snapshots.length) throw new RangeError("Select a saved time index");
    const Q = result.snapshots[index], P = new Float64Array(Q.length), coupling = new Float64Array(Q.length);
    for (let i = 0; i < Q.length; i++) { P[i] = Q[i] * Q[i]; coupling[i] = P[i] / result.n; }
    return { Q, P, coupling, energy: result.energies[index], time: result.times[index] };
  }
  return { defaults, identity, multiply, transposeMultiply, initialOrthogonal, hungarian, prepare, energy, gradient,
    cayleyStep, orthogonalityError, marginalError, run, sample };
}));
