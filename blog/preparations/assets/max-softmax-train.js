(function (scope) {
  "use strict";

  // The renderer and the worker use exactly the same affine parameters.
  var Q = [1.5, 0.4, 0.8];
  var DEFAULT_SEED = 314159;

  function randomGenerator(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function target(x, y) {
    return (Q[0] * x * x + 2 * Q[1] * x * y + Q[2] * y * y) / 2;
  }

  function createModel(n, options) {
    options = options || {};
    var count = n * n;
    var rng = randomGenerator(options.seed == null ? DEFAULT_SEED : options.seed);
    var weights = new Float64Array(3 * count);
    // Random tangent planes are a reproducible starting point, not a fixed grid.
    // Adam is free to change every slope and every intercept afterward.
    for (var j = 0; j < count; j++) {
      var x = 2 * rng() - 1;
      var y = 2 * rng() - 1;
      weights[3 * j] = Q[0] * x + Q[1] * y;
      weights[3 * j + 1] = Q[1] * x + Q[2] * y;
      weights[3 * j + 2] = -target(x, y);
    }
    return { n: n, count: count, weights: weights };
  }

  function affineValues(model, x, y, buffer) {
    var largest = -Infinity;
    var winner = 0;
    var weights = model.weights;
    for (var j = 0; j < model.count; j++) {
      var v = weights[3 * j] * x + weights[3 * j + 1] * y + weights[3 * j + 2];
      if (buffer) buffer[j] = v;
      if (v > largest) { largest = v; winner = j; }
    }
    return { value: largest, winner: winner };
  }

  function evaluateModel(model, x, y, kind, tau) {
    var result = affineValues(model, x, y);
    if (kind === "max") return result.value;
    var sum = 0;
    var weights = model.weights;
    for (var j = 0; j < model.count; j++) {
      var v = weights[3 * j] * x + weights[3 * j + 1] * y + weights[3 * j + 2];
      sum += Math.exp((v - result.value) / tau);
    }
    return result.value + tau * Math.log(sum);
  }

  function validationPoints(resolution) {
    var points = [];
    for (var j = 0; j < resolution; j++) {
      var y = -1 + 2 * j / (resolution - 1);
      for (var i = 0; i < resolution; i++) {
        var x = -1 + 2 * i / (resolution - 1);
        points.push([x, y, target(x, y)]);
      }
    }
    return points;
  }

  function validationLoss(model, points, kind, tau) {
    var sum = 0;
    for (var j = 0; j < points.length; j++) {
      var p = points[j];
      var difference = evaluateModel(model, p[0], p[1], kind, tau) - p[2];
      sum += difference * difference;
    }
    return sum / points.length;
  }

  // This exported routine is also used by finite-difference gradient checks.
  function lossAndGradient(model, points, kind, tau) {
    var gradient = new Float64Array(model.weights.length);
    var scratch = new Float64Array(model.count);
    var loss = accumulateGradient(model, points, kind, tau, gradient, scratch);
    return { loss: loss, gradient: gradient };
  }

  function accumulateGradient(model, points, kind, tau, gradient, scratch) {
    gradient.fill(0);
    var loss = 0;
    var count = model.count;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var maxResult = affineValues(model, p[0], p[1], scratch);
      var value = maxResult.value;
      var sum = 0;
      var j, scale, offset;
      if (kind === "softmax") {
        for (j = 0; j < count; j++) {
          var probability = Math.exp((scratch[j] - value) / tau);
          scratch[j] = probability;
          sum += probability;
        }
        value += tau * Math.log(sum);
      }
      var difference = value - p[2];
      loss += difference * difference;
      var derivative = 2 * difference / points.length;
      if (kind === "max") {
        offset = 3 * maxResult.winner;
        gradient[offset] += derivative * p[0];
        gradient[offset + 1] += derivative * p[1];
        gradient[offset + 2] += derivative;
      } else {
        for (j = 0; j < count; j++) {
          scale = derivative * scratch[j] / sum;
          offset = 3 * j;
          gradient[offset] += scale * p[0];
          gradient[offset + 1] += scale * p[1];
          gradient[offset + 2] += scale;
        }
      }
    }
    return loss / points.length;
  }

  function sampledBatch(rng, side) {
    var points = new Array(side * side + 4 * 8);
    var index = 0;
    // Stratification applies to training samples, never to the learned planes.
    for (var j = 0; j < side; j++) {
      for (var i = 0; i < side; i++) {
        var x = -1 + 2 * (i + rng()) / side;
        var y = -1 + 2 * (j + rng()) / side;
        points[index++] = [x, y, target(x, y)];
      }
    }
    // Boundary samples improve the fit where an interior-only MSE has little
    // influence. The same explicitly sampled squared loss supplies gradients.
    for (var edge = 0; edge < 4; edge++) {
      for (var k = 0; k < 8; k++) {
        var position = 2 * (k + rng()) / 8 - 1;
        var edgeX = edge < 2 ? (edge ? 1 : -1) : position;
        var edgeY = edge < 2 ? position : (edge === 2 ? -1 : 1);
        points[index++] = [edgeX, edgeY, target(edgeX, edgeY)];
      }
    }
    return points;
  }

  function serializeModel(model) {
    var planes = [];
    for (var j = 0; j < model.count; j++) {
      planes.push({ a: model.weights[3 * j], b: model.weights[3 * j + 1], c: model.weights[3 * j + 2] });
    }
    return planes;
  }

  function sampleNetworks(maxPlanes, softPlanes, tau, resolution) {
    resolution = Math.max(2, Math.round(resolution || 201));
    var grid = new Array(resolution * resolution);
    var errors = [0, 0];
    var valueMin = Infinity, valueMax = -Infinity;
    var scratch = new Float64Array(softPlanes.length);
    var index = 0;
    for (var j = 0; j < resolution; j++) {
      var y = 1 - 2 * j / (resolution - 1);
      for (var i = 0; i < resolution; i++) {
        var x = -1 + 2 * i / (resolution - 1);
        var f = target(x, y);
        var maxValue = -Infinity;
        var softLargest = -Infinity;
        var k, plane, value;
        for (k = 0; k < maxPlanes.length; k++) {
          plane = maxPlanes[k];
          value = plane.a * x + plane.b * y + plane.c;
          if (value > maxValue) maxValue = value;
        }
        for (k = 0; k < softPlanes.length; k++) {
          plane = softPlanes[k];
          value = plane.a * x + plane.b * y + plane.c;
          scratch[k] = value;
          if (value > softLargest) softLargest = value;
        }
        var sum = 0, dx = 0, dy = 0;
        for (k = 0; k < softPlanes.length; k++) {
          var weight = Math.exp((scratch[k] - softLargest) / tau);
          sum += weight;
          dx += weight * softPlanes[k].a;
          dy += weight * softPlanes[k].b;
        }
        var softValue = softLargest + tau * Math.log(sum);
        grid[index++] = { f: f, max: maxValue, soft: softValue, softDx: dx / sum, softDy: dy / sum };
        errors[0] = Math.max(errors[0], Math.abs(maxValue - f));
        errors[1] = Math.max(errors[1], Math.abs(softValue - f));
        valueMin = Math.min(valueMin, f, maxValue, softValue);
        valueMax = Math.max(valueMax, f, maxValue, softValue);
      }
    }
    return { grid: grid, resolution: resolution, errors2: errors, valueMin: valueMin, valueMax: valueMax };
  }

  function trainOne(n, tau, kind, options) {
    var model = createModel(n, { seed: options.seed + (kind === "max" ? 0 : 10007) });
    var rng = randomGenerator(options.seed + 271828);
    var steps = options.steps;
    var validation = options.validation;
    var length = model.weights.length;
    var firstMoment = new Float64Array(length);
    var secondMoment = new Float64Array(length);
    var gradient = new Float64Array(length);
    var scratch = new Float64Array(model.count);
    var conditioned = kind === "max" || tau < 0.01;
    var baseRate = conditioned ? 0.03 : Math.max(0.012 / (n * Math.sqrt(n)), 0.03 * Math.sqrt(tau));
    if (kind === "softmax") {
      // A common intercept shift removes the initial log(N) offset. It is then
      // optimized like every other parameter, without fixing tangent planes.
      var meanOffset = 0;
      for (var p = 0; p < validation.length; p++) {
        meanOffset += evaluateModel(model, validation[p][0], validation[p][1], kind, tau) - validation[p][2];
      }
      meanOffset /= validation.length;
      for (var j = 0; j < model.count; j++) model.weights[3 * j + 2] -= meanOffset;
    }
    var parameters = model.weights.slice();
    if (conditioned) {
      // An invertible change of variables improves hard-max / low-temperature conditioning:
      // a=Qp and c=-f(p)+d. Both coordinates of p and d are unconstrained,
      // so this parameterization still permits every affine plane.
      var determinant = Q[0] * Q[2] - Q[1] * Q[1];
      for (var q = 0; q < model.count; q++) {
        var slopeX = model.weights[3 * q], slopeY = model.weights[3 * q + 1];
        var centerX = (Q[2] * slopeX - Q[1] * slopeY) / determinant;
        var centerY = (Q[0] * slopeY - Q[1] * slopeX) / determinant;
        parameters[3 * q] = centerX;
        parameters[3 * q + 1] = centerY;
        parameters[3 * q + 2] = model.weights[3 * q + 2] + target(centerX, centerY);
      }
    }
    var initialLoss = validationLoss(model, validation, kind, tau);
    var bestLoss = initialLoss;
    var bestWeights = model.weights.slice();
    var bestIteration = 0;
    var beta1Power = 1;
    var beta2Power = 1;
    for (var step = 1; step <= steps; step++) {
      var batch = sampledBatch(rng, 16);
      accumulateGradient(model, batch, kind, tau, gradient, scratch);
      if (conditioned) {
        for (var neuron = 0; neuron < model.count; neuron++) {
          var offset = 3 * neuron;
          var gx = gradient[offset], gy = gradient[offset + 1], gc = gradient[offset + 2];
          gradient[offset] = Q[0] * gx + Q[1] * gy - model.weights[offset] * gc;
          gradient[offset + 1] = Q[1] * gx + Q[2] * gy - model.weights[offset + 1] * gc;
        }
      }
      beta1Power *= 0.9;
      beta2Power *= 0.999;
      var fraction = step / steps;
      var rate = baseRate * (0.025 + 0.975 * (1 + Math.cos(Math.PI * fraction)) / 2);
      for (var k = 0; k < length; k++) {
        var g = gradient[k];
        firstMoment[k] = 0.9 * firstMoment[k] + 0.1 * g;
        secondMoment[k] = 0.999 * secondMoment[k] + 0.001 * g * g;
        var coordinateRate = conditioned && k % 3 === 2 ? rate / model.count : rate;
        parameters[k] -= coordinateRate * (firstMoment[k] / (1 - beta1Power)) /
          (Math.sqrt(secondMoment[k] / (1 - beta2Power)) + 1e-9);
      }
      if (conditioned) {
        for (var planeIndex = 0; planeIndex < model.count; planeIndex++) {
          var planeOffset = 3 * planeIndex;
          var px = parameters[planeOffset], py = parameters[planeOffset + 1];
          model.weights[planeOffset] = Q[0] * px + Q[1] * py;
          model.weights[planeOffset + 1] = Q[1] * px + Q[2] * py;
          model.weights[planeOffset + 2] = -target(px, py) + parameters[planeOffset + 2];
        }
      } else model.weights.set(parameters);
      if (step % 100 === 0 || step === steps) {
        var currentLoss = validationLoss(model, validation, kind, tau);
        if (currentLoss < bestLoss) {
          bestLoss = currentLoss;
          bestWeights = model.weights.slice();
          bestIteration = step;
        }
        if (options.onProgress) options.onProgress({
          kind: kind, iteration: step, steps: steps,
          initialLoss: initialLoss, validationLoss: bestLoss
        });
      }
    }
    model.weights.set(bestWeights);
    return {
      planes: serializeModel(model), initialLoss: initialLoss,
      validationLoss: bestLoss, finalLoss: bestLoss, iterations: steps, bestIteration: bestIteration
    };
  }

  function trainNetworks(options) {
    options = options || {};
    var n = Math.max(2, Math.min(18, Math.round(options.n || 6)));
    var tau = Math.max(1e-4, Math.min(1, Number(options.tau) || 0.01));
    var settings = {
      seed: options.seed == null ? DEFAULT_SEED : options.seed >>> 0,
      steps: Math.max(1, Math.round(options.steps || 2000)),
      validation: validationPoints(33), onProgress: options.onProgress
    };
    var max = trainOne(n, tau, "max", settings);
    var softmax = trainOne(n, tau, "softmax", settings);
    var sampled = sampleNetworks(max.planes, softmax.planes, tau, options.resolution);
    sampled.n = n;
    sampled.tau = tau;
    sampled.seed = settings.seed;
    sampled.max = max;
    sampled.softmax = softmax;
    return sampled;
  }

  var api = {
    target: target, randomGenerator: randomGenerator, createModel: createModel,
    evaluateModel: evaluateModel, lossAndGradient: lossAndGradient,
    validationPoints: validationPoints, validationLoss: validationLoss,
    serializeModel: serializeModel, sampleNetworks: sampleNetworks, trainNetworks: trainNetworks
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.MaxSoftmaxTraining = api;
  if (typeof WorkerGlobalScope !== "undefined" && scope instanceof WorkerGlobalScope) {
    scope.onmessage = function (event) {
      var message = event.data;
      try {
        var result = trainNetworks({
          n: message.n, tau: message.tau, steps: message.steps, seed: message.seed,
          resolution: message.resolution,
          onProgress: function (progress) {
            progress.id = message.id;
            progress.type = "progress";
            scope.postMessage(progress);
          }
        });
        result.id = message.id;
        result.type = "result";
        scope.postMessage(result);
      } catch (error) {
        scope.postMessage({ id: message.id, type: "error", message: error.message });
      }
    };
  }
})(typeof self !== "undefined" ? self : this);
