(function (root) {
  "use strict";
  var LEFT = -2, RIGHT = 2, FREQUENCY = Math.PI;

  function parameters(options) {
    options = options || {};
    return {
      amplitude: options.amplitude == null ? 0.35 : Number(options.amplitude),
      phase: options.phase == null ? 0 : Number(options.phase),
      lambda: options.lambda == null ? 0 : Number(options.lambda)
    };
  }

  function target(x, p) {
    return x * x / 2 + p.amplitude * Math.cos(FREQUENCY * x + p.phase);
  }
  function derivative(x, p) {
    return x - p.amplitude * FREQUENCY * Math.sin(FREQUENCY * x + p.phase);
  }
  function curvature(x, p) {
    return 1 - p.amplitude * FREQUENCY * FREQUENCY * Math.cos(FREQUENCY * x + p.phase);
  }

  // All zeros of Phi'' in the open plotting interval. The threshold case is
  // harmless: Phi'' stays nonnegative and no splitting point is needed.
  function curvatureRoots(p) {
    var strength = p.amplitude * FREQUENCY * FREQUENCY;
    if (strength <= 1) return [];
    var angle = Math.acos(1 / strength), roots = [];
    [-angle, angle].forEach(function (base) {
      var first = Math.ceil((FREQUENCY * LEFT + p.phase - base) / (2 * Math.PI));
      var last = Math.floor((FREQUENCY * RIGHT + p.phase - base) / (2 * Math.PI));
      for (var k = first; k <= last; k++) {
        var x = (base + 2 * Math.PI * k - p.phase) / FREQUENCY;
        if (x > LEFT + 1e-12 && x < RIGHT - 1e-12) roots.push(x);
      }
    });
    return roots.sort(function (a, b) { return a - b; });
  }

  // Exact first and second antiderivatives on a segment of fixed curvature
  // sign. No finite-difference curvature or numerical quadrature is used.
  function segmentIntegrals(left, right, x, p) {
    var length = right - left;
    var angleLeft = FREQUENCY * left + p.phase;
    var angleRight = FREQUENCY * right + p.phase;
    var mass = length - p.amplitude * FREQUENCY * (Math.sin(angleRight) - Math.sin(angleLeft));
    var atRight = length * length / 2 - p.amplitude *
      (Math.cos(angleLeft) - Math.cos(angleRight) - FREQUENCY * length * Math.sin(angleLeft));
    return { mass: mass, weighted: atRight + (x - right) * mass };
  }

  function build(options) {
    var p = parameters(options);
    var cuts = [LEFT].concat(curvatureRoots(p), [RIGHT]);
    var segments = [];
    for (var i = 0; i + 1 < cuts.length; i++) {
      segments.push({ left: cuts[i], right: cuts[i + 1], positive: curvature((cuts[i] + cuts[i + 1]) / 2, p) >= 0 });
    }
    var initialValue = target(LEFT, p), initialSlope = derivative(LEFT, p);
    function evaluate(x) {
      var positive = 0, negative = 0, positiveSlope = 0, negativeSlope = 0;
      segments.forEach(function (segment) {
        if (x <= segment.left) return;
        var integrals = segmentIntegrals(segment.left, Math.min(x, segment.right), x, p);
        if (segment.positive) { positive += integrals.weighted; positiveSlope += integrals.mass; }
        else { negative -= integrals.weighted; negativeSlope -= integrals.mass; }
      });
      var distance = x - LEFT, common = p.lambda * distance * distance / 2;
      var h = curvature(x, p);
      return {
        x: x, phi: target(x, p), dphi: derivative(x, p), ddphi: h,
        F: initialValue + initialSlope * distance + positive + common,
        G: negative + common,
        dF: initialSlope + positiveSlope + p.lambda * distance,
        dG: negativeSlope + p.lambda * distance,
        ddF: Math.max(h, 0) + p.lambda, ddG: Math.max(-h, 0) + p.lambda
      };
    }
    var positiveMass = 0, negativeMass = 0;
    segments.forEach(function (segment) {
      var mass = segmentIntegrals(segment.left, segment.right, RIGHT, p).mass;
      if (segment.positive) positiveMass += mass; else negativeMass -= mass;
    });
    return {
      parameters: p, roots: cuts.slice(1, -1), segments: segments, evaluate: evaluate,
      minimalCurvature: positiveMass + negativeMass,
      addedCurvature: 2 * p.lambda * (RIGHT - LEFT)
    };
  }

  var api = { LEFT: LEFT, RIGHT: RIGHT, FREQUENCY: FREQUENCY, parameters: parameters,
    target: target, derivative: derivative, curvature: curvature,
    curvatureRoots: curvatureRoots, segmentIntegrals: segmentIntegrals, build: build };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DCDecomposition = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
