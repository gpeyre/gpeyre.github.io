/* Exact centered Gaussian Sinkhorn dynamics, sampled after complete cycles.
 * Cost: |x-y|^2/2; entropy coefficient: epsilon.
 * The Y marginal is N(0,b), and s is Var(X|Y), not Var(X).
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GaussianSinkhorn = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function positive(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(name + " must be finite and strictly positive");
    }
  }

  function parameters(a, b, epsilon) {
    positive(a, "a"); positive(b, "b"); positive(epsilon, "epsilon");
    const scale = Math.sqrt(a) * Math.sqrt(b);
    const delta = epsilon / scale;
    positive(delta, "epsilon / sqrt(ab)");
    const logRho = -Math.asinh(delta / 2);
    // Equivalent to 2/(hypot(delta,2)+delta), without overflowing the sum.
    const rho = 1 / (Math.hypot(delta, 2) / 2 + delta / 2);
    const h = rho * rho;
    const logq = 4 * logRho;
    // delta*rho is 1-rho^2 without cancellation when epsilon is small.
    const oneMinusRhoSquared = delta * rho;
    const sStar = a * oneMinusRhoSquared;
    const sMinus = -a * (delta / rho);
    positive(sStar, "the positive fixed point");
    return {
      a, b, epsilon, delta, scale, rho, logRho,
      q: Math.exp(logq), logq, sStar, sMinus,
      rhoSquared: h, oneMinusRhoSquared
    };
  }

  function step(s, a, b, epsilon) {
    positive(s, "s");
    const p = parameters(a, b, epsilon);
    // F(s)/a = (s/a + delta^2)/(1+s/a+delta^2).
    const t = s / a + p.delta * p.delta;
    return t === Infinity ? a : a * (t / (1 + t));
  }

  function logAdd(x, y) {
    if (x === -Infinity) return y;
    if (y === -Infinity) return x;
    const largest = Math.max(x, y);
    return largest + Math.log1p(Math.exp(Math.min(x, y) - largest));
  }

  // log(1+e)+1/(1+e)-1 = e^2 A(e).
  // Factoring out e^2 retains the KL when 1+e rounds to one.
  function smallErrorFactor(e) {
    let power = 1, total = 0;
    for (let m = 2; m <= 32; m++) {
      const term = (m % 2 ? -1 : 1) * (m - 1) / m * power;
      total += term;
      if (m > 2 && Math.abs(term) <= Number.EPSILON * Math.abs(total)) break;
      power *= e;
    }
    return total;
  }

  function divergence(p, u, e, logError) {
    if (logError === -Infinity) return {kl: 0, logKL: -Infinity};
    const logu = Math.abs(e) < .125 ? Math.log1p(e) : Math.log(u);
    let logVarianceTerm;
    if (Math.abs(e) < .125) {
      logVarianceTerm = 2 * logError + Math.log(smallErrorFactor(e));
    } else if (u < .5) {
      // log(u)+1/u-1 = [1+u(log(u)-1)]/u.
      logVarianceTerm = Math.log1p(u * (logu - 1)) - logu;
    } else {
      logVarianceTerm = Math.log(logu - e / u);
    }
    // Conditional mean contribution: (rho/delta)*e^2/u.
    const logMeanTerm = p.logRho - Math.log(p.delta) + 2 * logError - logu;
    const logKL = logAdd(logVarianceTerm, logMeanTerm) - Math.LN2;
    return {kl: Math.exp(logKL), logKL};
  }

  function stateFrom(p, initialRatio, k) {
    positive(initialRatio, "initialRatio");
    if (!Number.isFinite(k) || k < 0) throw new RangeError("k must be finite and nonnegative");
    const h = p.rhoSquared, e0 = initialRatio - 1;
    const logReduction = k * p.logq;
    const reduction = Math.exp(logReduction);
    const lost = -Math.expm1(logReduction);

    // Cross-ratio conjugacy, rearranged to avoid 1/h and cancellation.
    // u = [(1-t)+u0(h+t)]/[1+h*t+h*u0(1-t)], t=q^k.
    const denominator = 1 + h * reduction + h * initialRatio * lost;
    const logRelativeError = e0 === 0 ? -Infinity :
      Math.log(Math.abs(e0)) + (k === 0 ? 0 :
        logReduction + Math.log1p(h) - Math.log(denominator));
    const relativeConditionalError = e0 === 0 ? 0 :
      Math.sign(e0) * Math.exp(logRelativeError);
    const u = Math.abs(relativeConditionalError) < .25 ?
      1 + relativeConditionalError :
      (lost + initialRatio * (h + reduction)) / denominator;
    const s = p.sStar * u;
    const crossCov = p.scale * p.rho * u;
    const e = relativeConditionalError;
    // The first expression preserves the exactly stationary variance a.
    const xVariance = Math.abs(e) < .25 ?
      p.a * (1 + (1 + h) * e + h * e * e) :
      p.a * u * (p.oneMinusRhoSquared + h * u);
    const z0 = h * e0 / (1 + h * initialRatio);
    return {
      k, s, u, relativeConditionalError,
      relativeError: relativeConditionalError,
      logRelativeError, xVariance, yVariance: p.b, crossCov,
      jointCov: [[xVariance, crossCov], [crossCov, p.b]],
      determinant: p.b * s,
      crossRatio: z0 * reduction,
      logCrossRatioReduction: logReduction,
      ...divergence(p, u, e, logRelativeError)
    };
  }

  // Fractional k gives the analytic interpolation; integer k gives actual cycles.
  function state(a, b, epsilon, initialRatio = 2, k = 0) {
    return stateFrom(parameters(a, b, epsilon), initialRatio, k);
  }

  function trajectory(a, b, epsilon, initialRatio = 2, cycles = 100) {
    if (!Number.isSafeInteger(cycles) || cycles < 0) {
      throw new RangeError("cycles must be a nonnegative safe integer");
    }
    const p = parameters(a, b, epsilon);
    return Array.from({length: cycles + 1}, (_, k) => stateFrom(p, initialRatio, k));
  }

  return Object.freeze({parameters, step, state, trajectory});
});
