/* Local numerical kernels. Fourier transforms use unscaled forward / normalized
   inverse coefficients; grids are periodic and odd, with x varying fastest. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NewDynamics = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TAU = 2 * Math.PI;
  const mod = x => ((x % 1) + 1) % 1;
  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(rng) {
    return Math.sqrt(-2 * Math.log(Math.max(1e-16, rng()))) * Math.cos(TAU * rng());
  }
  function multiply(a, b) {
    return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
      a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
  }
  const transpose = a => [a[0], a[2], a[1], a[3]];
  function ouParameters(circulation, epsilon, h) {
    const a = circulation;
    const A = [1, -4 * a, a, 4];
    const delta = 2.25 - 4 * a * a;
    let c, s;
    if (Math.abs(delta) < 1e-12) { c = 1; s = h; }
    else if (delta > 0) {
      const d = Math.sqrt(delta); c = Math.cosh(d * h); s = Math.sinh(d * h) / d;
    } else {
      const d = Math.sqrt(-delta); c = Math.cos(d * h); s = Math.sin(d * h) / d;
    }
    const decay = Math.exp(-2.5 * h);
    const E = [decay * (c + 1.5 * s), decay * 4 * a * s,
      -decay * a * s, decay * (c - 1.5 * s)];
    const S = [1, 0, 0, 0.25];
    const eSet = multiply(multiply(E, S), transpose(E));
    const Q = S.map((value, i) => epsilon * (value - eSet[i]));
    Q[1] = Q[2] = (Q[1] + Q[2]) / 2;
    const l00 = Math.sqrt(Math.max(0, Q[0]));
    const l10 = l00 ? Q[2] / l00 : 0;
    const L = [l00, 0, l10, Math.sqrt(Math.max(0, Q[3] - l10 * l10))];
    return {A, E, Q, L, S: S.map(value => epsilon * value)};
  }
  function ouStep(point, parameters, rng, center = [2, 0]) {
    const [x, y] = [point[0] - center[0], point[1] - center[1]];
    const {E, L} = parameters;
    const z = normal(rng), w = normal(rng);
    return [center[0] + E[0] * x + E[1] * y + L[0] * z,
      center[1] + E[2] * x + E[3] * y + L[2] * z + L[3] * w];
  }
  const rootCache = new Map();
  function roots(n) {
    if (!rootCache.has(n)) rootCache.set(n, {
      cos: Float64Array.from({length: n}, (_, j) => Math.cos(TAU * j / n)),
      sin: Float64Array.from({length: n}, (_, j) => Math.sin(TAU * j / n))
    });
    return rootCache.get(n);
  }
  function fft(re, im, inverse = false) {
    const n = re.length;
    if (n === 1) return {re: Float64Array.of(re[0]), im: Float64Array.of(im[0])};
    let p = 2;
    while (p < n && n % p) p++;
    const m = n / p, parts = [];
    for (let r = 0; r < p; r++) {
      const rr = new Float64Array(m), ii = new Float64Array(m);
      for (let s = 0; s < m; s++) { rr[s] = re[r + p * s]; ii[s] = im[r + p * s]; }
      parts.push(fft(rr, ii, inverse));
    }
    const outR = new Float64Array(n), outI = new Float64Array(n), table = roots(n);
    for (let k = 0; k < n; k++) {
      const q = k % m;
      for (let r = 0; r < p; r++) {
        const j = (r * k) % n, c = table.cos[j], s = (inverse ? 1 : -1) * table.sin[j];
        outR[k] += parts[r].re[q] * c - parts[r].im[q] * s;
        outI[k] += parts[r].re[q] * s + parts[r].im[q] * c;
      }
      if (inverse) { outR[k] /= p; outI[k] /= p; }
    }
    return {re: outR, im: outI};
  }
  function fft2(re, im, n, inverse = false) {
    if (re.length !== n * n) throw new Error("A square grid is required.");
    const rr = new Float64Array(re), ii = im ? new Float64Array(im) : new Float64Array(n * n);
    for (let axis = 0; axis < 2; axis++) {
      for (let a = 0; a < n; a++) {
        const r = new Float64Array(n), s = new Float64Array(n);
        for (let b = 0; b < n; b++) {
          const j = axis ? b * n + a : a * n + b; r[b] = rr[j]; s[b] = ii[j];
        }
        const transformed = fft(r, s, inverse);
        for (let b = 0; b < n; b++) {
          const j = axis ? b * n + a : a * n + b;
          rr[j] = transformed.re[b]; ii[j] = transformed.im[b];
        }
      }
    }
    return {re: rr, im: ii};
  }
  const wave = (j, n) => j <= (n - 1) / 2 ? j : j - n;
  function interpolate(field, n, x, y) {
    x = mod(x) * n; y = mod(y) * n;
    const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j;
    const i1 = (i + 1) % n, j1 = (j + 1) % n;
    return (1 - b) * ((1 - a) * field[j * n + i] + a * field[j * n + i1])
      + b * ((1 - a) * field[j1 * n + i] + a * field[j1 * n + i1]);
  }
  function advect(field, u, v, n, h) {
    return Float64Array.from(field, (_, j) => {
      const x = (j % n) / n, y = Math.floor(j / n) / n;
      return interpolate(field, n, x - h * u[j], y - h * v[j]);
    });
  }
  function spectralVelocity(u, v, n, h = 0, viscosity = 0, project = true) {
    if (!(n % 2)) throw new Error("Use an odd grid to avoid a Nyquist convention.");
    const U = fft2(u, null, n), V = fft2(v, null, n);
    let before = 0, after = 0;
    for (let j = 0; j < n * n; j++) {
      const kx = TAU * wave(j % n, n), ky = TAU * wave(Math.floor(j / n), n);
      const k2 = kx * kx + ky * ky;
      const dr = kx * U.re[j] + ky * V.re[j], di = kx * U.im[j] + ky * V.im[j];
      before += dr * dr + di * di;
      if (k2 && project) {
        U.re[j] -= kx * dr / k2; U.im[j] -= kx * di / k2;
        V.re[j] -= ky * dr / k2; V.im[j] -= ky * di / k2;
      }
      const denominator = 1 + h * viscosity * k2;
      U.re[j] /= denominator; U.im[j] /= denominator;
      V.re[j] /= denominator; V.im[j] /= denominator;
      after += (kx * U.re[j] + ky * V.re[j]) ** 2 + (kx * U.im[j] + ky * V.im[j]) ** 2;
    }
    return {u: fft2(U.re, U.im, n, true).re, v: fft2(V.re, V.im, n, true).re,
      divergenceBefore: Math.sqrt(before) / (n * n), divergenceAfter: Math.sqrt(after) / (n * n)};
  }
  function diffuseDye(field, n, h, diffusivity) {
    if (!diffusivity) return new Float64Array(field);
    const f = fft2(field, null, n);
    for (let j = 0; j < n * n; j++) {
      const x = j % n, y = Math.floor(j / n);
      const lambda = 4 * n * n * (Math.sin(Math.PI * x / n) ** 2 + Math.sin(Math.PI * y / n) ** 2);
      f.re[j] /= 1 + h * diffusivity * lambda;
      f.im[j] /= 1 + h * diffusivity * lambda;
    }
    const result = fft2(f.re, f.im, n, true).re;
    // This positive resolvent can have tiny negative inverse-FFT roundoff.
    for (let j = 0; j < result.length; j++) if (result[j] < 0 && result[j] > -1e-12) result[j] = 0;
    return result;
  }
  function fluidStep(state, options = {}) {
    const {n} = state, h = options.h || 0.035;
    const u = advect(state.u, state.u, state.v, n, h);
    const v = advect(state.v, state.u, state.v, n, h);
    const next = spectralVelocity(u, v, n, h, options.viscosity || 0, options.project !== false);
    const dye = advect(state.dye, next.u, next.v, n, h);
    return {n, u: next.u, v: next.v, dye: diffuseDye(dye, n, h, options.diffusivity || 0),
      initialDyeMass: state.initialDyeMass ?? state.dye.reduce((sum, value) => sum + value, 0) / (n * n),
      injectedDyeMass: state.injectedDyeMass || 0,
      divergenceBefore: next.divergenceBefore, divergenceAfter: next.divergenceAfter};
  }
  function fluidInitial(n = 45) {
    const u = new Float64Array(n * n), v = new Float64Array(n * n), dye = new Float64Array(n * n);
    for (let j = 0; j < n * n; j++) {
      const x = (j % n) / n, y = Math.floor(j / n) / n;
      u[j] = 0.23 * Math.sin(TAU * y) + 0.09 * Math.sin(TAU * (x + y));
      v[j] = -0.23 * Math.sin(TAU * x) - 0.09 * Math.sin(TAU * (x + y));
      dye[j] = 0.9 * Math.exp(-50 * ((x - 0.33) ** 2 + (y - 0.5) ** 2))
        + 0.6 * Math.exp(-120 * ((x - 0.72) ** 2 + (y - 0.32) ** 2));
    }
    const initialDyeMass = dye.reduce((sum, value) => sum + value, 0) / (n * n);
    return {n, u, v, dye, initialDyeMass, injectedDyeMass: 0, divergenceBefore: 0, divergenceAfter: 0};
  }
  function inject(state, x, y, dx = 0, dy = 0, amount = 0.25, radius = 0.042) {
    if (!(radius > 0) || !Number.isFinite(radius)) throw new RangeError("Injection radius must be positive and finite.");
    if (!(amount >= 0) || !Number.isFinite(amount)) throw new RangeError("Dye injection must be nonnegative and finite.");
    const {n} = state;
    if (state.initialDyeMass === undefined)
      state.initialDyeMass = state.dye.reduce((sum, value) => sum + value, 0) / (n * n) - (state.injectedDyeMass || 0);
    let addedMass = 0;
    for (let j = 0; j < n * n; j++) {
      let rx = mod((j % n) / n - x + 0.5) - 0.5;
      let ry = mod(Math.floor(j / n) / n - y + 0.5) - 0.5;
      const bump = Math.exp(-(rx * rx + ry * ry) / (2 * radius ** 2));
      const increment = amount * bump;
      state.dye[j] += increment; addedMass += increment / (n * n);
      state.u[j] += dx * bump; state.v[j] += dy * bump;
    }
    state.injectedDyeMass = (state.injectedDyeMass || 0) + addedMass;
    return addedMass;
  }
  function wrappedNormal(x, mean, sigma) {
    let value = 0;
    for (let j = -2; j <= 2; j++) value += Math.exp(-0.5 * ((x - mean + j) / sigma) ** 2);
    return value / (Math.sqrt(TAU) * sigma);
  }
  const mixtures = [
    [[0.35, 0.22, 0.28, 0.075], [0.4, 0.35, 0.7, 0.09], [0.25, 0.73, 0.48, 0.08]],
    [[0.4, 0.7, 0.75, 0.08], [0.35, 0.72, 0.27, 0.095], [0.25, 0.23, 0.55, 0.075]]
  ];
  function density(x, y, background, endpoint) {
    let value = background;
    for (const [weight, cx, cy, sigma] of mixtures[endpoint])
      value += (1 - background) * weight * wrappedNormal(x, cx, sigma) * wrappedNormal(y, cy, sigma);
    return value;
  }
  function moserSetup(background = 0.14, n = 63) {
    const rho0 = new Float64Array(n * n), rho1 = new Float64Array(n * n);
    for (let j = 0; j < n * n; j++) {
      const x = (j % n) / n, y = Math.floor(j / n) / n;
      rho0[j] = density(x, y, background, 0); rho1[j] = density(x, y, background, 1);
    }
    const difference = Float64Array.from(rho0, (r, j) => r - rho1[j]);
    const f = fft2(difference, null, n);
    const rx = new Float64Array(n * n), ix = new Float64Array(n * n);
    const ry = new Float64Array(n * n), iy = new Float64Array(n * n);
    for (let j = 1; j < n * n; j++) {
      const kx = TAU * wave(j % n, n), ky = TAU * wave(Math.floor(j / n), n), k2 = kx * kx + ky * ky;
      rx[j] = kx * f.im[j] / k2; ix[j] = -kx * f.re[j] / k2;
      ry[j] = ky * f.im[j] / k2; iy[j] = -ky * f.re[j] / k2;
    }
    const jx = fft2(rx, ix, n, true).re, jy = fft2(ry, iy, n, true).re;
    const divergence = spectralVelocity(jx, jy, n, 0, 0, false).divergenceBefore;
    return {background, n, rho0, rho1, jx, jy, divergence};
  }
  function moserVelocity(setup, x, y, t) {
    const rho = (1 - t) * interpolate(setup.rho0, setup.n, x, y)
      + t * interpolate(setup.rho1, setup.n, x, y);
    return [interpolate(setup.jx, setup.n, x, y) / rho, interpolate(setup.jy, setup.n, x, y) / rho];
  }
  function moserStep(setup, point, t, h) {
    const a = moserVelocity(setup, point[0], point[1], t);
    const b = moserVelocity(setup, point[0] + h * a[0] / 2, point[1] + h * a[1] / 2, t + h / 2);
    const c = moserVelocity(setup, point[0] + h * b[0] / 2, point[1] + h * b[1] / 2, t + h / 2);
    const d = moserVelocity(setup, point[0] + h * c[0], point[1] + h * c[1], t + h);
    return [mod(point[0] + h * (a[0] + 2 * b[0] + 2 * c[0] + d[0]) / 6),
      mod(point[1] + h * (a[1] + 2 * b[1] + 2 * c[1] + d[1]) / 6)];
  }
  function moserParticles(background, count = 500, seed = 7617) {
    const rng = random(seed), result = [];
    for (let i = 0; i < count; i++) {
      if (rng() < background) result.push([rng(), rng()]);
      else {
        const r = rng(); let cumulative = 0, component = mixtures[0][0];
        for (const item of mixtures[0]) { cumulative += item[0]; if (r <= cumulative) { component = item; break; } }
        result.push([mod(component[1] + component[3] * normal(rng)), mod(component[2] + component[3] * normal(rng))]);
      }
    }
    return result;
  }
  return {TAU, mod, random, normal, multiply, transpose, ouParameters, ouStep,
    fft, fft2, wave, interpolate, advect, spectralVelocity, diffuseDye, fluidStep, fluidInitial, inject,
    density, moserSetup, moserVelocity, moserStep, moserParticles};
}));
