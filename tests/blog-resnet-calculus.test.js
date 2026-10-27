"use strict";
const assert = require("node:assert/strict");
const F = require("../blog/preparations/assets/deep-resnet/flow-core.js");

let checks = 0;
const diagnostics = [];
function test(name, run) { run(); checks++; console.log("✓ " + name); }
function close(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tolerance ${tolerance})`);
}
function matrixClose(actual, expected, tolerance, label) {
  assert.ok(F.distance(actual, expected) <= tolerance,
    `${label}: error ${F.distance(actual, expected)} (tolerance ${tolerance})`);
}
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const transpose = a => [a[0], a[2], a[1], a[3]];
const inverse = a => F.scale([a[3], -a[1], -a[2], a[0]], 1 / F.determinant(a));

// Independent quadrature and state solver: neither uses the core's RK4 routine.
function simpsonVector(fn, panels = 512) {
  assert.equal(panels % 2, 0);
  let total = F.add(fn(0), fn(1));
  for (let j = 1; j < panels; j++) {
    total = F.add(total, F.scale(fn(j / panels), j % 2 ? 4 : 2));
  }
  return F.scale(total, 1 / (3 * panels));
}
const simpson = (fn, panels) => simpsonVector(t => [fn(t)], panels)[0];
function rk4State(aAt, initial, steps = 256) {
  const h = 1 / steps;
  let x = initial.slice();
  for (let j = 0; j < steps; j++) {
    const t = j * h;
    const k1 = F.apply(aAt(t), x);
    const k2 = F.apply(aAt(t + h / 2), F.add(x, F.scale(k1, h / 2)));
    const k3 = F.apply(aAt(t + h / 2), F.add(x, F.scale(k2, h / 2)));
    const k4 = F.apply(aAt(t + h), F.add(x, F.scale(k3, h)));
    x = x.map((value, k) => value + h * (k1[k] + 2 * k2[k] + 2 * k3[k] + k4[k]) / 6);
  }
  return x;
}
function matrixPower(a, exponent) {
  let result = F.I.slice();
  for (let j = 0; j < exponent; j++) result = F.multiply(result, a);
  return result;
}
function tiedMap(a, depth) {
  return matrixPower(F.add(F.I, F.scale(a, 1 / depth)), depth);
}
function tiedDerivative(a, direction, depth) {
  const b = F.add(F.I, F.scale(a, 1 / depth));
  const powers = [F.I.slice()];
  for (let j = 1; j < depth; j++) powers.push(F.multiply(powers[j - 1], b));
  let result = [0, 0, 0, 0];
  for (let j = 0; j < depth; j++) {
    result = F.add(result, F.multiply(F.multiply(powers[depth - 1 - j], direction), powers[j]));
  }
  return F.scale(result, 1 / depth);
}

test("continuous adjoint matches independently perturbed noncommuting ODE solves", () => {
  const options = {mode: "strain", alpha: 0.17, omega: -0.4, strain: 0.8, speed: 1.3, horizon: 1};
  const aAt = t => F.matrixAt(t, options);
  const phiAt = t => F.exactFundamental(t, options);
  const endpoint = phiAt(1);
  const inputs = [[1, 0.4], [-0.3, 0.8], [0.1, -1.2]];
  const targets = [[-0.2, 0.7], [0.8, -0.1], [0.4, 0.5]];
  const residuals = inputs.map((a, i) => F.add(F.apply(endpoint, a), F.scale(targets[i], -1)));
  const directions = [
    t => [0.3 + 0.2 * t, -0.4 * Math.cos(0.7 * t), 0.1 + 0.6 * Math.sin(1.1 * t), -0.2 * t],
    t => [-0.2 * Math.cos(t), 0.3 + t * t, -0.4 + 0.2 * t, 0.5 * Math.sin(2 * t)]
  ];
  assert.ok(F.norm(F.commutator(aAt(0), aAt(0.7))) > 0.1);

  // Phi(1) Phi(t)^(-1) propagates states from t to 1. Its transpose
  // propagates terminal covectors backward, without solving an adjoint ODE.
  function adjointAt(t, residual) {
    return F.apply(transpose(F.multiply(endpoint, inverse(phiAt(t)))), residual);
  }
  let maxError = 0;
  for (const lambda of [0, 0.17]) for (const direction of directions) {
    const derivative = simpson(t => {
      const phi = phiAt(t), perturbation = direction(t);
      const dataTerm = inputs.reduce((sum, a, i) => {
        const x = F.apply(phi, a), p = adjointAt(t, residuals[i]);
        return sum + dot(p, F.apply(perturbation, x)) / inputs.length;
      }, 0);
      return dataTerm + lambda * dot(aAt(t), perturbation);
    });
    function objective(epsilon) {
      const perturbed = t => F.add(aAt(t), F.scale(direction(t), epsilon));
      const dataTerm = inputs.reduce((sum, a, i) => {
        const residual = F.add(rk4State(perturbed, a), F.scale(targets[i], -1));
        return sum + dot(residual, residual) / (2 * inputs.length);
      }, 0);
      return dataTerm + lambda / 2 * simpson(t => dot(perturbed(t), perturbed(t)));
    }
    for (const epsilon of [1e-4, 5e-5]) {
      const finiteDifference = (objective(epsilon) - objective(-epsilon)) / (2 * epsilon);
      maxError = Math.max(maxError, Math.abs(finiteDifference - derivative));
      close(finiteDifference, derivative, 2e-8, "continuous adjoint directional derivative");
    }
  }
  diagnostics.push(`continuous adjoint maximum error: ${maxError.toExponential(2)} (tolerance 2e-8)`);
});

const noncommutingCases = [
  {a: [0.2, -0.7, 0.35, -0.1], h: [0.4, 0.8, -0.6, 0.2]},
  {a: [0.1, 1.2, 0, 0.1], h: [-0.2, 0.3, 0.7, 0.4]},
  {a: [0.7, 0.2, -0.1, -0.5], h: [0.1, -0.6, 0.5, -0.3]}
];

test("matrix exponential Fréchet integral matches noncommuting central differences", () => {
  let maxError = 0;
  for (const {a, h} of noncommutingCases) {
    assert.ok(F.norm(F.commutator(a, h)) > 0.1);
    const derivative = simpsonVector(u => F.multiply(
      F.multiply(F.expm2(F.scale(a, 1 - u)), h), F.expm2(F.scale(a, u))));
    const epsilon = 1e-5;
    const finiteDifference = F.scale(F.add(
      F.expm2(F.add(a, F.scale(h, epsilon))),
      F.scale(F.expm2(F.add(a, F.scale(h, -epsilon))), -1)), 1 / (2 * epsilon));
    maxError = Math.max(maxError, F.distance(finiteDifference, derivative));
    matrixClose(finiteDifference, derivative, 2e-9, "exponential Fréchet derivative");
    assert.ok(F.distance(derivative, F.multiply(F.expm2(a), h)) > 0.05,
      "A noncommuting perturbation must not accidentally validate exp(A) H");
  }
  diagnostics.push(`exponential derivative maximum error: ${maxError.toExponential(2)} (tolerance 2e-9)`);
});

test("finite tied-weight derivative includes every ordered insertion and one depth factor", () => {
  let maxError = 0;
  for (const {a, h} of noncommutingCases) for (const depth of [1, 2, 7, 64]) {
    const epsilon = 1e-5;
    const finiteDifference = F.scale(F.add(
      tiedMap(F.add(a, F.scale(h, epsilon)), depth),
      F.scale(tiedMap(F.add(a, F.scale(h, -epsilon)), depth), -1)), 1 / (2 * epsilon));
    const derivative = tiedDerivative(a, h, depth);
    maxError = Math.max(maxError, F.distance(finiteDifference, derivative));
    matrixClose(finiteDifference, derivative, 5e-9, `tied derivative at depth ${depth}`);
  }
  diagnostics.push(`tied derivative maximum error: ${maxError.toExponential(2)} (tolerance 5e-9)`);
});

test("finite tied-weight derivatives approach the exponential derivative at first order", () => {
  for (const {a, h} of noncommutingCases) {
    const exact = simpsonVector(u => F.multiply(
      F.multiply(F.expm2(F.scale(a, 1 - u)), h), F.expm2(F.scale(a, u))));
    const errors = [32, 64, 128, 256].map(depth => F.distance(tiedDerivative(a, h, depth), exact));
    for (let j = 1; j < errors.length; j++) {
      const ratio = errors[j - 1] / errors[j];
      assert.ok(ratio > 1.85 && ratio < 2.15, `tied derivative error ratio ${ratio}: ${errors}`);
    }
  }
});

test("Euler endpoints converge at first order for constant and noncommuting smooth paths", () => {
  const cases = [
    {mode: "constant", alpha: 0.2, omega: 0.7, shear: 0.3},
    {mode: "strain", alpha: 0.17, omega: -0.4, strain: 0.8, speed: 1.3}
  ];
  for (const options of cases) {
    const exact = F.exactFundamental(1, options);
    const errors = [32, 64, 128, 256].map(depth => {
      let phi = F.I.slice();
      for (let j = 0; j < depth; j++) {
        phi = F.multiply(F.add(F.I, F.scale(F.matrixAt(j / depth, options), 1 / depth)), phi);
      }
      return F.distance(phi, exact);
    });
    for (let j = 1; j < errors.length; j++) {
      const ratio = errors[j - 1] / errors[j];
      assert.ok(ratio > 1.85 && ratio < 2.15, `Euler endpoint error ratio ${ratio}: ${errors}`);
    }
    assert.ok(errors.at(-1) < 0.02, `Euler endpoint did not approach the exact flow: ${errors}`);
    diagnostics.push(`${options.mode} Euler error ratios: ${errors.slice(1).map((e, j) => (errors[j] / e).toFixed(4)).join(", ")}`);
  }
});

console.log(`${checks} independent continuous-adjoint, Fréchet-derivative, and Euler-convergence checks passed.`);
diagnostics.forEach(message => console.log(message));
