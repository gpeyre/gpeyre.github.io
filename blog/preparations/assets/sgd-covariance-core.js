/* Exact second moments for centered, constant-step, least-squares SGD.
 * X is Gaussian with G=diag(lambda1,lambda2); conditional noise variance is
 * sigma2. The squared loss has NO factor 1/2, and theta_0=theta_*.
 * These are covariance curves, not an assertion that the iterate law is Gaussian.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SGDCovariance = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function positive(x, name) {
    if (!Number.isFinite(x) || x <= 0) {
      throw new RangeError(name + " must be finite and strictly positive");
    }
  }

  function parameters(lambda1, lambda2, eta, sigma2 = 1) {
    positive(lambda1, "lambda1");
    positive(lambda2, "lambda2");
    positive(eta, "eta");
    if (!Number.isFinite(sigma2) || sigma2 < 0) {
      throw new RangeError("sigma2 must be finite and nonnegative");
    }
    const lambdas = [lambda1, lambda2];
    const trace = lambda1 + lambda2;
    const R = trace + 2 * Math.max(lambda1, lambda2);
    const maxSafeStep = 1 / R;
    if (!(eta < maxSafeStep)) {
      throw new RangeError("eta must be strictly less than the sufficient safety bound 1/R");
    }
    const x = lambdas.map(lambda => eta * lambda);
    const [x1, x2] = x;
    const B11 = 4*x1*(1-3*x1), B22 = 4*x2*(1-3*x2);
    const B12 = -4*x1*x2;
    const A = [[1-B11, -B12], [-B12, 1-B22]];
    const first = eta * sigma2;
    const forcing = x.map(value => 4*first*value);
    // Divide row i of (I-A)v=forcing by 4*eta*lambda_i before solving.
    // This avoids subtracting two nearly equal numbers when eta is tiny.
    const determinant = (1-3*x1)*(1-3*x2)-x1*x2;
    const stationary = [
      first*(1-2*x2)/determinant,
      first*(1-2*x1)/determinant
    ];
    const firstOrder = [first, first];
    const secondOrder = lambdas.map(lambda => first*(1+eta*(trace+2*lambda)));
    const residual = [
      B11*stationary[0]+B12*stationary[1]-forcing[0],
      B12*stationary[0]+B22*stationary[1]-forcing[1]
    ];

    // Diagonalize B=I-A directly, not a rounded A close to the identity.
    const midpoint = (B11+B22)/2, difference = (B11-B22)/2;
    const radius = Math.hypot(difference, B12);
    const lossFast = midpoint+radius;
    // The product formula avoids cancellation for highly unequal eigenvalues.
    const lossSlow = radius === 0 ? midpoint : 16*x1*x2*determinant/lossFast;
    const logEigenvalues = [Math.log1p(-lossSlow), Math.log1p(-lossFast)];
    return {
      lambda1, lambda2, lambdas, eta, sigma2, trace, R, maxSafeStep,
      stepFraction: eta*R, A, forcing, stationary, firstOrder, secondOrder,
      stationaryResidual: Math.hypot(...residual),
      eigenvalues: [1-lossSlow, 1-lossFast],
      logEigenvalues,
      spectralRadius: 1-lossSlow,
      logSpectralRadius: logEigenvalues[0],
      // B's eigenspaces are represented by bounded coefficients, even at isotropy.
      spectralDirection: radius === 0 ? [0, 0] : [difference/radius, B12/radius],
      scaledEigenvalues: x
    };
  }

  function stateFrom(p, k) {
    if (!Number.isSafeInteger(k) || k < 0) {
      throw new RangeError("k must be a nonnegative safe integer");
    }
    let variances;
    if (k === 0 || p.sigma2 === 0) {
      variances = [0, 0];
    } else {
      // v_k=(I-A^k)v_infinity. expm1 preserves tiny early-time variances.
      const slow = -Math.expm1(k*p.logEigenvalues[0]);
      const fast = -Math.expm1(k*p.logEigenvalues[1]);
      const average = (fast+slow)/2, halfDifference = (fast-slow)/2;
      const [direction, offDiagonal] = p.spectralDirection;
      const F11 = average+halfDifference*direction;
      const F22 = average-halfDifference*direction;
      const F12 = halfDifference*offDiagonal;
      const [v1, v2] = p.stationary;
      variances = [F11*v1+F12*v2, F12*v1+F22*v2];
    }
    const leadingTransient = p.scaledEigenvalues.map(value =>
      p.firstOrder[0]*(-Math.expm1(-4*value*k)));
    return {
      k, time: k*p.eta, variances, exact: variances,
      covariance: [[variances[0], 0], [0, variances[1]]],
      leadingTransient,
      leadingCovariance: [[leadingTransient[0], 0], [0, leadingTransient[1]]],
      stationary: p.stationary,
      firstOrder: p.firstOrder,
      secondOrder: p.secondOrder
    };
  }

  function state(lambda1, lambda2, eta, sigma2 = 1, k = 0) {
    return stateFrom(parameters(lambda1, lambda2, eta, sigma2), k);
  }

  function trajectory(lambda1, lambda2, eta, sigma2 = 1, cycles = 100) {
    if (!Number.isSafeInteger(cycles) || cycles < 0) {
      throw new RangeError("cycles must be a nonnegative safe integer");
    }
    const p = parameters(lambda1, lambda2, eta, sigma2);
    return Array.from({length: cycles+1}, (_, k) => stateFrom(p, k));
  }

  return Object.freeze({parameters, state, trajectory});
});
