/* Exact heat flow of Gaussian mixtures, observed through deterministic quantiles. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HeatQuantiles = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SQRT_TWO = Math.SQRT2, INV_SQRT_TWO_PI = 1 / Math.sqrt(2 * Math.PI);

  /* erf/erfc coefficient tables: Stephen L. Moshier's Cephes Mathematical Library
   * (ndtr.c), copyright Stephen L. Moshier.
   * Source: https://netlib.org/cephes/cprob.tgz
   * Notice: https://netlib.org/cephes/readme
   * "What you see here may be used freely but it comes with no support or guarantee."
   * Evaluating erfc directly, rather than 1-erf, keeps small tails accurate.
   * The mixture and safeguarded quantile solver below are independent code.
   */
  const ERF_T = [9.604973739870516, 90.02601972038427, 2232.005345946843,
    7003.325141128051, 55592.3013010395];
  const ERF_U = [33.56171416475031, 521.3579497801527, 4594.323829709801,
    22629.000061389095, 49267.39426086359];
  const ERFC_P = [2.461969814735305e-10, .5641895648310688, 7.463210564422699,
    48.63719709856814, 196.5208329560771, 526.4451949954773,
    934.5285271719576, 1027.5518868951572, 557.5353353693993];
  const ERFC_Q = [13.2281951154745, 86.70721408859897, 354.9377788878199,
    975.7085017432055, 1823.9091668790973, 2246.3376081871097,
    1656.6630919416135, 557.5353408177277];
  const ERFC_R = [.5641895835477551, 1.275366707599781, 5.019050422511805,
    6.160210979930536, 7.4097426995044895, 2.9788666537210024];
  const ERFC_S = [2.2605286322011726, 9.396035249380015, 12.048953980809666,
    17.08144507475659, 9.608968090632859, 3.369076451000815];
  function polynomial(x, coefficients) {
    let y = coefficients[0];
    for (let i = 1; i < coefficients.length; i++) y = y * x + coefficients[i];
    return y;
  }
  function monicPolynomial(x, coefficients) {
    let y = x + coefficients[0];
    for (let i = 1; i < coefficients.length; i++) y = y * x + coefficients[i];
    return y;
  }
  function erfcPositive(x) {
    if (x === Infinity) return 0;
    if (x < 1) return 1 - x * polynomial(x * x, ERF_T) / monicPolynomial(x * x, ERF_U);
    const numerator = x < 8 ? ERFC_P : ERFC_R, denominator = x < 8 ? ERFC_Q : ERFC_S;
    return Math.exp(-x * x) * polynomial(x, numerator) / monicPolynomial(x, denominator);
  }
  function normalCDF(z) {
    const tail = .5 * erfcPositive(Math.abs(z) / SQRT_TWO);
    return z < 0 ? tail : 1 - tail;
  }
  function normalSurvival(z) { return normalCDF(-z); }

  function mixture(separation = 2) {
    if (!(separation >= 0) || !Number.isFinite(separation)) throw new RangeError("Use a finite nonnegative separation.");
    return { weights: [.28, .42, .30], means: [-separation, .15 * separation, 1.05 * separation], sigmas: [.30, .45, .25] };
  }
  function validate(config, t) {
    if (!(t >= 0) || !Number.isFinite(t)) throw new RangeError("Heat time must be finite and nonnegative.");
    const c = config || mixture();
    if (!Array.isArray(c.weights) || !Array.isArray(c.means) || !Array.isArray(c.sigmas) ||
        !c.weights.length || c.weights.length !== c.means.length || c.weights.length !== c.sigmas.length ||
        !c.weights.every(w => Number.isFinite(w) && w >= 0) ||
        !c.means.every(Number.isFinite) || !c.sigmas.every(s => Number.isFinite(s) && s > 0) ||
        Math.abs(c.weights.reduce((a, b) => a + b, 0) - 1) > 1e-13)
      throw new RangeError("A mixture needs normalized nonnegative weights, finite means and positive standard deviations.");
    return c;
  }
  function densityStats(x, t, c) {
    let rho = 0, dx = 0, dxx = 0;
    for (let j = 0; j < c.weights.length; j++) {
      const variance = c.sigmas[j] ** 2 + 2 * t, delta = x - c.means[j];
      const term = c.weights[j] * INV_SQRT_TWO_PI / Math.sqrt(variance) * Math.exp(-delta * delta / (2 * variance));
      rho += term;
      dx -= term * delta / variance;
      dxx += term * (delta * delta / (variance * variance) - 1 / variance);
    }
    return { rho, dx, dxx };
  }
  function density(x, t = 0, config) { return densityStats(x, t, validate(config, t)).rho; }
  function densityDerivative(x, t = 0, config) { return densityStats(x, t, validate(config, t)).dx; }
  function densitySecondDerivative(x, t = 0, config) { return densityStats(x, t, validate(config, t)).dxx; }
  function cdf(x, t = 0, config) {
    const c = validate(config, t);
    return c.weights.reduce((sum, w, j) => sum + w * normalCDF((x - c.means[j]) / Math.sqrt(c.sigmas[j] ** 2 + 2 * t)), 0);
  }
  function survival(x, t = 0, config) {
    const c = validate(config, t);
    return c.weights.reduce((sum, w, j) => sum + w * normalSurvival((x - c.means[j]) / Math.sqrt(c.sigmas[j] ** 2 + 2 * t)), 0);
  }
  function residual(x, s, t, c) {
    // Write F(x)-s as a plateau mass plus signed small tails. This avoids losing
    // the two tails to cancellation when a quantile lies between mixture modes.
    let plateau = 0, tails = 0;
    for (let j = 0; j < c.weights.length; j++) {
      const z = (x - c.means[j]) / Math.sqrt(c.sigmas[j] ** 2 + 2 * t);
      const tail = c.weights[j] * normalCDF(-Math.abs(z));
      if (z >= 0) { plateau += c.weights[j]; tails -= tail; }
      else tails += tail;
    }
    return (plateau - s) + tails;
  }
  function inverse(s, t, c) {
    if (s === 0) return -Infinity;
    if (s === 1) return Infinity;
    if (!(s > 0 && s < 1)) throw new RangeError("A quantile level must lie between zero and one.");
    const spread = Math.max(...c.sigmas.map(sigma => Math.sqrt(sigma * sigma + 2 * t)));
    let lo = Math.min(...c.means) - 9 * spread, hi = Math.max(...c.means) + 9 * spread;
    while (residual(lo, s, t, c) > 0) lo -= 2 * spread;
    while (residual(hi, s, t, c) < 0) hi += 2 * spread;
    let x = (lo + hi) / 2;
    for (let k = 0; k < 100; k++) {
      const error = residual(x, s, t, c), rho = densityStats(x, t, c).rho;
      if (error < 0) lo = x; else hi = x;
      const tolerance = 2e-13 * (1 + Math.abs(x)), correction = error / rho;
      if (Math.abs(correction) < tolerance || hi - lo < tolerance) return x;
      const next = x - correction;
      x = Number.isFinite(next) && next > lo && next < hi ? next : (lo + hi) / 2;
    }
    return (lo + hi) / 2;
  }
  function quantile(s, t = 0, config) { return inverse(s, t, validate(config, t)); }
  function quantileDerivatives(s, t = 0, config) {
    const c = validate(config, t), q = inverse(s, t, c);
    if (!Number.isFinite(q)) throw new RangeError("Quantile derivatives require a level strictly between zero and one.");
    const { rho, dx } = densityStats(q, t, c);
    return { q, qs: 1 / rho, qss: -dx / (rho ** 3), qt: -dx / rho };
  }
  function velocity(s, t = 0, config) { return quantileDerivatives(s, t, config).qt; }
  function moments(t = 0, config) {
    const c = validate(config, t), mean = c.weights.reduce((sum, w, j) => sum + w * c.means[j], 0);
    const variance = c.weights.reduce((sum, w, j) => sum + w * ((c.means[j] - mean) ** 2 + c.sigmas[j] ** 2), 0) + 2 * t;
    return { mean, variance };
  }
  function tracks(n, config, options = {}) {
    const tMax = options.tMax === undefined ? 2 : options.tMax, steps = options.steps === undefined ? 120 : options.steps;
    const c = validate(config, tMax);
    if (!Number.isInteger(n) || n < 1 || n > 1000 || !Number.isInteger(steps) || steps < 1 || steps > 2000)
      throw new RangeError("Use 1–1000 tracked quantiles and 1–2000 time intervals.");
    const levels = Array.from({ length: n }, (_, i) => (i + .5) / n);
    const times = Array.from({ length: steps + 1 }, (_, k) => tMax * k / steps);
    const positions = times.map(t => levels.map(s => inverse(s, t, c)));
    return { levels, times, positions };
  }
  function gaussianJKOStep(sigma, tau) {
    if (!(sigma > 0 && tau >= 0) || !Number.isFinite(sigma) || !Number.isFinite(tau))
      throw new RangeError("The previous standard deviation must be positive and the time step nonnegative.");
    return (sigma + Math.hypot(sigma, 2 * Math.sqrt(tau))) / 2;
  }
  return { mixture, normalCDF, normalSurvival, density, densityDerivative, densitySecondDerivative,
    cdf, survival, quantile, quantileDerivatives, velocity, moments, tracks, gaussianJKOStep };
});
