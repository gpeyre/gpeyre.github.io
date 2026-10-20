"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const D = require("../blog/preparations/assets/new-dynamics/core.js");
let checks = 0;
function test(name, run) { run(); checks++; console.log("✓ " + name); }
function close(actual, expected, tolerance = 1e-11) { assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`); }
function arrayClose(a, b, tolerance = 1e-11) { assert.equal(a.length, b.length); a.forEach((x, i) => close(x, b[i], tolerance)); }
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const norm2 = a => a.reduce((s, x) => s + x * x, 0);
function naiveDFT(re, im, inverse) {
  const n = re.length, outR = [], outI = [];
  for (let k = 0; k < n; k++) {
    let a = 0, b = 0;
    for (let j = 0; j < n; j++) {
      const angle = (inverse ? 1 : -1) * 2 * Math.PI * j * k / n;
      a += re[j] * Math.cos(angle) - im[j] * Math.sin(angle);
      b += re[j] * Math.sin(angle) + im[j] * Math.cos(angle);
    }
    outR.push(a / (inverse ? n : 1)); outI.push(b / (inverse ? n : 1));
  }
  return {re: outR, im: outI};
}
test("mixed-radix FFT agrees with an independent direct DFT, including prime factors", () => {
  for (const n of [3, 5, 7, 9, 15, 21, 45, 63]) {
    const re = Float64Array.from({length: n}, (_, i) => Math.sin(0.71 * i));
    const im = Float64Array.from({length: n}, (_, i) => Math.cos(0.31 * i));
    for (const inverse of [false, true]) {
      const result = D.fft(re, im, inverse), reference = naiveDFT(re, im, inverse);
      arrayClose(result.re, reference.re, 4e-13); arrayClose(result.im, reference.im, 4e-13);
    }
  }
});
test("2D transform is invertible and respects Parseval normalization", () => {
  for (const n of [9, 15, 45, 63]) {
    const f = Float64Array.from({length: n * n}, (_, i) => Math.sin(i * 0.3) + Math.cos(i * 0.71));
    const F = D.fft2(f, null, n), restored = D.fft2(F.re, F.im, n, true);
    arrayClose(f, restored.re, 3e-14); assert.ok(Math.max(...restored.im.map(Math.abs)) < 3e-14);
    close(norm2(f), (norm2(F.re) + norm2(F.im)) / (n * n), 2e-10);
  }
});
test("OU zero-circulation transitions match independent scalar formulas", () => {
  for (const epsilon of [0, 0.03, 1.6]) for (const h of [0.001, 0.025, 0.7]) {
    const p = D.ouParameters(0, epsilon, h);
    arrayClose(p.E, [Math.exp(-h), 0, 0, Math.exp(-4 * h)]);
    arrayClose(p.Q, [epsilon * (1 - Math.exp(-2 * h)), 0, 0, epsilon * (1 - Math.exp(-8 * h)) / 4]);
  }
});
test("OU covariance satisfies Lyapunov, positivity, and exact finite-step stationarity", () => {
  for (const a of [-3, -0.75, 0, 0.75, 1.4, 3]) for (const epsilon of [0, 0.03, 0.55, 1.6]) {
    const p = D.ouParameters(a, epsilon, 0.025), as = D.multiply(p.A, p.S), sat = D.multiply(p.S, D.transpose(p.A));
    arrayClose(as.map((x, i) => x + sat[i]), [2 * epsilon, 0, 0, 2 * epsilon]);
    const eSet = D.multiply(D.multiply(p.E, p.S), D.transpose(p.E));
    arrayClose(eSet.map((x, i) => x + p.Q[i]), p.S);
    assert.ok(p.Q[0] >= -1e-14 && p.Q[3] >= -1e-14 && p.Q[0] * p.Q[3] - p.Q[1] * p.Q[2] >= -1e-14);
    arrayClose(D.multiply(p.L, D.transpose(p.L)), p.Q);
  }
});
test("OU transition has the correct generator and semigroup composition", () => {
  for (const a of [0.75, 2.2, -3]) {
    const small = D.ouParameters(a, 0.6, 1e-7);
    small.E.forEach((x, i) => close((x - (i % 3 === 0 ? 1 : 0)) / 1e-7, -small.A[i], 1e-5));
    const p = D.ouParameters(a, 0.6, 0.03), q = D.ouParameters(a, 0.6, 0.07), both = D.ouParameters(a, 0.6, 0.1);
    arrayClose(D.multiply(q.E, p.E), both.E);
    const noise = D.multiply(D.multiply(q.E, p.Q), D.transpose(q.E));
    arrayClose(noise.map((x, i) => x + q.Q[i]), both.Q);
  }
});
test("OU sampled noise has the specified covariance and deterministic resets", () => {
  const p = D.ouParameters(2.3, 0.8, 0.2), rng = D.random(87216), count = 60000;
  let x = 0, y = 0, xx = 0, xy = 0, yy = 0;
  for (let i = 0; i < count; i++) {
    const z = D.ouStep([2, 0], p, rng); z[0] -= 2;
    x += z[0] / count; y += z[1] / count; xx += z[0] ** 2 / count; xy += z[0] * z[1] / count; yy += z[1] ** 2 / count;
  }
  close(x, 0, 0.007); close(y, 0, 0.007);
  close(xx, p.Q[0], 0.004); close(xy, p.Q[1], 0.004); close(yy, p.Q[3], 0.004);
  const r1 = D.random(83), r2 = D.random(83);
  for (let i = 0; i < 30; i++) arrayClose(D.ouStep([-3, 0], p, r1), D.ouStep([-3, 0], p, r2), 0);
});
test("semi-Lagrangian scalar advection preserves constants and the range even at large steps", () => {
  const n = 15, rng = D.random(81), f = Float64Array.from({length: n * n}, () => rng());
  const u = Float64Array.from(f, () => 4 * rng() - 2), v = Float64Array.from(f, () => 4 * rng() - 2);
  const next = D.advect(f, u, v, n, 10), c = D.advect(new Float64Array(n * n).fill(3), u, v, n, 10);
  assert.ok(Math.min(...next) >= Math.min(...f) - 1e-14); assert.ok(Math.max(...next) <= Math.max(...f) + 1e-14);
  arrayClose(c, new Float64Array(n * n).fill(3));
  close(D.interpolate(Float64Array.from({length: n * n}, (_, j) => j), n, 0.2, 0.3), D.interpolate(Float64Array.from({length: n * n}, (_, j) => j), n, 1.2, -1.7));
});
test("Fourier projection is divergence free, orthogonal, mean preserving, and idempotent", () => {
  const n = 45, rng = D.random(914), u = Float64Array.from({length: n * n}, () => rng() - 0.4), v = Float64Array.from(u, () => rng() - 0.6);
  const p = D.spectralVelocity(u, v, n), pp = D.spectralVelocity(p.u, p.v, n);
  assert.ok(p.divergenceBefore > 10); assert.ok(p.divergenceAfter < 1e-12);
  assert.ok(D.spectralVelocity(p.u, p.v, n, 0, 0, false).divergenceBefore < 2e-12);
  arrayClose(p.u, pp.u, 1e-14); arrayClose(p.v, pp.v, 1e-14);
  close(mean(u), mean(p.u)); close(mean(v), mean(p.v));
  let residual = 0, inner = 0;
  for (let j = 0; j < u.length; j++) { residual += (u[j] - p.u[j]) ** 2 + (v[j] - p.v[j]) ** 2; inner += p.u[j] * (u[j] - p.u[j]) + p.v[j] * (v[j] - p.v[j]); }
  close(inner, 0, 1e-10); close(norm2(u) + norm2(v), norm2(p.u) + norm2(p.v) + residual, 1e-10);
  assert.throws(() => D.spectralVelocity(new Float64Array(16), new Float64Array(16), 4), /odd grid/);
});
test("a longitudinal Fourier wave is removed and a transverse wave is preserved", () => {
  const n = 15, u = new Float64Array(n * n), v = new Float64Array(n * n);
  for (let j = 0; j < n * n; j++) { const phase = D.TAU * ((j % n) + 2 * Math.floor(j / n)) / n; u[j] = Math.sin(phase); v[j] = 2 * Math.sin(phase); }
  const p = D.spectralVelocity(u, v, n); arrayClose(p.u, new Float64Array(n * n), 1e-14); arrayClose(p.v, new Float64Array(n * n), 1e-14);
  const transverse = D.spectralVelocity(v, Float64Array.from(u, x => -x), n); arrayClose(transverse.u, v, 1e-14); arrayClose(transverse.v, Float64Array.from(u, x => -x), 1e-14);
});
test("implicit spectral diffusion has the correct single-mode decay", () => {
  const n = 15, u = new Float64Array(n * n), zero = new Float64Array(n * n), h = 0.12, nu = 0.004;
  for (let j = 0; j < n * n; j++) u[j] = Math.sin(D.TAU * 3 * Math.floor(j / n) / n);
  const p = D.spectralVelocity(u, zero, n, h, nu), factor = 1 / (1 + h * nu * (3 * D.TAU) ** 2);
  arrayClose(p.u, Float64Array.from(u, x => factor * x), 1e-14); arrayClose(p.v, zero, 1e-14);
  assert.ok(norm2(p.u) <= norm2(u));
});
test("five-point dye diffusion is positive, mass preserving, and solves its independent grid equation", () => {
  const n = 15, f = new Float64Array(n * n); f[0] = 1; f[124] = 2;
  const h = 0.12, kappa = 0.002, a = D.diffuseDye(f, n, h, kappa);
  assert.ok(Math.min(...a) >= -1e-14); close(mean(a), mean(f)); assert.ok(norm2(a) <= norm2(f));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, lap = n * n * (a[y * n + (x + 1) % n] + a[y * n + (x + n - 1) % n] + a[((y + 1) % n) * n + x] + a[((y + n - 1) % n) * n + x] - 4 * a[i]);
    close(a[i] - h * kappa * lap, f[i], 1e-13);
  }
});
test("full fluid steps are finite, deterministic, and preserve spectral incompressibility", () => {
  let a = D.fluidInitial(45), b = D.fluidInitial(45);
  D.inject(a, 0.5, 0.5, 0.3, -0.4); D.inject(b, 0.5, 0.5, 0.3, -0.4);
  for (let k = 0; k < 15; k++) {
    a = D.fluidStep(a, {h: 0.12, viscosity: 0.0008, diffusivity: 0.0001});
    b = D.fluidStep(b, {h: 0.12, viscosity: 0.0008, diffusivity: 0.0001});
    assert.ok(a.divergenceAfter < 1e-12); assert.ok(Math.min(...a.dye) >= -1e-12); assert.ok(a.u.every(Number.isFinite));
  }
  arrayClose(a.u, b.u, 0); arrayClose(a.v, b.v, 0); arrayClose(a.dye, b.dye, 0);
});
test("brush radius and exact injected grid mass are audited without renormalization", () => {
  const narrow = D.fluidInitial(45), wide = D.fluidInitial(45), initialMass = mean(narrow.dye);
  const beforeU = new Float64Array(narrow.u), beforeV = new Float64Array(narrow.v);
  const smallMass = D.inject(narrow, 0.5, 0.5, 0, 0, 0.25, 0.02);
  const largeMass = D.inject(wide, 0.5, 0.5, 0.6, -0.3, 0.25, 0.12);
  assert.ok(largeMass > 20 * smallMass, "wider nonnormalized bump injects more actual dye");
  close(mean(narrow.dye) - initialMass, smallMass); close(mean(wide.dye) - initialMass, largeMass);
  close(narrow.injectedDyeMass, smallMass); close(wide.injectedDyeMass, largeMass);
  arrayClose(narrow.u, beforeU, 0); arrayClose(narrow.v, beforeV, 0);
  assert.ok(norm2(wide.u.map((x, j) => x - beforeU[j])) > 0);
  const secondMass = D.inject(wide, 0.15, 0.87, 0, 0, 0.3, 0.05);
  close(wide.injectedDyeMass, largeMass + secondMass); close(mean(wide.dye), initialMass + largeMass + secondMass);
  const next = D.fluidStep(wide, {h: 0.12, viscosity: 0.002, diffusivity: 0.001});
  close(next.initialDyeMass, initialMass); close(next.injectedDyeMass, largeMass + secondMass);
  // Keep the actual semi-Lagrangian mass error; do not secretly reset the mean.
  assert.ok(Math.abs(mean(next.dye) - next.initialDyeMass - next.injectedDyeMass) > 1e-6);
  assert.throws(() => D.inject(narrow, 0, 0, 0, 0, 1, 0), /radius/);
  assert.throws(() => D.inject(narrow, 0, 0, 0, 0, -1, 0.04), /nonnegative/);
});
test("Moser endpoints have unit mass, strict positivity, and periodic continuity", () => {
  for (const background of [0.025, 0.14, 0.5]) {
    const m = D.moserSetup(background);
    close(mean(m.rho0), 1); close(mean(m.rho1), 1);
    assert.ok(Math.min(...m.rho0) >= background); assert.ok(Math.min(...m.rho1) >= background);
    for (const endpoint of [0, 1]) close(D.density(0, 0.37, background, endpoint), D.density(1, 0.37, background, endpoint));
    const X = D.fft2(m.jx, null, m.n), Y = D.fft2(m.jy, null, m.n), rr = new Float64Array(m.n ** 2), ii = new Float64Array(m.n ** 2);
    for (let j = 0; j < rr.length; j++) {
      const kx = D.TAU * D.wave(j % m.n, m.n), ky = D.TAU * D.wave(Math.floor(j / m.n), m.n);
      rr[j] = -kx * X.im[j] - ky * Y.im[j]; ii[j] = kx * X.re[j] + ky * Y.re[j];
    }
    const div = D.fft2(rr, ii, m.n, true).re;
    div.forEach((value, j) => close(value, m.rho0[j] - m.rho1[j], 3e-12));
  }
});
test("Moser particle stepping is reproducible and improves with time resolution", () => {
  const m = D.moserSetup(0.14);
  function evolve(steps) { let x = [0.2, 0.31]; for (let j = 0; j < steps; j++) x = D.moserStep(m, x, j / steps, 1 / steps); return x; }
  const reference = evolve(1920), coarse = evolve(60), fine = evolve(240);
  assert.ok(Math.hypot(fine[0] - reference[0], fine[1] - reference[1]) < Math.hypot(coarse[0] - reference[0], coarse[1] - reference[1]));
  assert.deepEqual(D.moserParticles(0.14), D.moserParticles(0.14));
});
test("Moser transported low-frequency moments improve with spatial refinement", () => {
  // Deterministic weighted quadrature, independent of the Monte Carlo display.
  // It compares endpoint integrals, not merely the Poisson equation.
  function endpointError(n) {
    const m = D.moserSetup(0.14, n), q = 89, particles = [];
    for (let y = 0; y < q; y++) for (let x = 0; x < q; x++) {
      const xx = (x + 0.5) / q, yy = (y + 0.5) / q;
      particles.push({x: [xx, yy], weight: D.density(xx, yy, 0.14, 0) / q ** 2});
    }
    for (let k = 0; k < 480; k++) for (const p of particles) p.x = D.moserStep(m, p.x, k / 480, 1 / 480);
    let error = 0;
    for (const [kx, ky] of [[1, 0], [0, 1], [1, 1], [2, -1]]) {
      let r = 0, i = 0;
      for (const p of particles) { const angle = D.TAU * (kx * p.x[0] + ky * p.x[1]); r += p.weight * Math.cos(angle); i += p.weight * Math.sin(angle); }
      for (let y = 0; y < q; y++) for (let x = 0; x < q; x++) {
        const xx = (x + 0.5) / q, yy = (y + 0.5) / q, weight = D.density(xx, yy, 0.14, 1) / q ** 2;
        r -= weight * Math.cos(D.TAU * (kx * xx + ky * yy)); i -= weight * Math.sin(D.TAU * (kx * xx + ky * yy));
      }
      error += Math.hypot(r, i);
    }
    return error;
  }
  const coarse = endpointError(21), fine = endpointError(63);
  assert.ok(fine < 0.006 && fine < coarse / 4, `coarse ${coarse}, fine ${fine}`);
});
test("article metadata, disclosures, local experiment paths, and image credits are present", () => {
  for (const [slug, topic] of [["langevin-without-a-potential", "langevin"], ["lagrangian-density-interpolation", "moser"], ["stable-fluids", "fluids"]]) {
    const source = fs.readFileSync(path.join(__dirname, "../blog/preparations/" + slug + ".html"), "utf8");
    assert.match(source, /noindex,follow/); assert.match(source, /Alpha preview · Work in progress/);
    const keywords = source.match(/<meta name="keywords" content="([^"]+)"/)[1].split(","); assert.ok(keywords.length >= 22);
    assert.ok(source.includes(`data-experiment="${topic}"`)); assert.ok(source.includes(`assets/new-dynamics/index.html?topic=${topic}`));
    assert.match(source, /<details class="blog-proof">/); assert.match(source, /<strong>(Theorem|Proposition) 1/); assert.match(source, /Image unchanged/);
    for (const math of source.matchAll(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g)) assert.ok(!/[<>]/.test(math[0]), "Raw angle bracket in HTML math");
    for (const image of source.matchAll(/<img src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(__dirname, "../blog/preparations/", image[1])));
  }
});
console.log(`\n${checks} numerical and source checks passed.`);
