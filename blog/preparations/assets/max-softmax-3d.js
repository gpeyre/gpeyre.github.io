(function (root) {
  "use strict";

  var TAU = 2 * Math.PI;
  var COLORS = { max: [18, 143, 150], soft: [220, 119, 60] };
  var maxCellCache = new WeakMap();

  function unit(v) {
    var length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  // Both plots use bounds from all three functions, including negative max values.
  function bounds(data) {
    var low = 0, high = Math.max(data.valueMax || 0, 0.05);
    for (var i = 0; i < data.grid.length; i++) {
      var v = data.grid[i];
      if (Number.isFinite(v.f)) { low = Math.min(low, v.f); high = Math.max(high, v.f); }
      if (Number.isFinite(v.max)) { low = Math.min(low, v.max); high = Math.max(high, v.max); }
      if (Number.isFinite(v.soft)) { low = Math.min(low, v.soft); high = Math.max(high, v.soft); }
    }
    var span = high - low || 1;
    return { low: low, high: high, span: span, floor: low - 0.04 * span, vertical: 1.8 / span };
  }

  function camera(width, height, range, view) {
    view = view || {};
    var azimuth = Number.isFinite(view.azimuth) ? view.azimuth : -45;
    var elevation = Number.isFinite(view.elevation) ? view.elevation : 30;
    var a = azimuth * TAU / 360;
    var e = Math.max(5, Math.min(85, elevation)) * TAU / 360;
    var ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
    var right = [ca, -sa, 0];
    var up = [-se * sa, -se * ca, ce];
    var toward = [ce * sa, ce * ca, se];

    function world(x, y, value) {
      var p = [x, y, (value - range.low) * range.vertical];
      return { x: dot(right, p), y: -dot(up, p), depth: dot(toward, p) };
    }

    var extent = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    [-1, 1].forEach(function (x) {
      [-1, 1].forEach(function (y) {
        [range.floor, range.high].forEach(function (z) {
          var p = world(x, y, z);
          extent.left = Math.min(extent.left, p.x);
          extent.right = Math.max(extent.right, p.x);
          extent.top = Math.min(extent.top, p.y);
          extent.bottom = Math.max(extent.bottom, p.y);
        });
      });
    });
    var margins = { left: 42, right: 19, top: 21, bottom: 42 };
    var availableWidth = Math.max(30, width - margins.left - margins.right);
    var availableHeight = Math.max(30, height - margins.top - margins.bottom);
    var scale = Math.min(availableWidth / (extent.right - extent.left),
      availableHeight / (extent.bottom - extent.top));
    var offsetX = margins.left + (availableWidth - scale * (extent.right - extent.left)) / 2 - scale * extent.left;
    var offsetY = margins.top + (availableHeight - scale * (extent.bottom - extent.top)) / 2 - scale * extent.top;

    return {
      scale: scale, right: right, up: up, toward: toward,
      project: function (x, y, z) {
        var p = world(x, y, z);
        return { x: offsetX + scale * p.x, y: offsetY + scale * p.y, depth: p.depth };
      },
      frontX: sa < 0 ? -1 : 1,
      frontY: ca < 0 ? -1 : 1,
      leftX: ca < 0 ? 1 : -1,
      leftY: sa < 0 ? -1 : 1
    };
  }

  function studio(projection, color) {
    var right = projection.right, up = projection.up, view = projection.toward;
    function direction(horizontal, vertical, front) {
      return unit([0, 1, 2].map(function (i) {
        return horizontal * right[i] + vertical * up[i] + front * view[i];
      }));
    }
    var key = direction(-0.55, 0.75, 1.1);
    var fill = direction(0.9, 0.2, 0.65);
    return {
      color: color, view: view, key: key, fill: fill,
      half: unit(key.map(function (v, i) { return v + view[i]; })),
      fillHalf: unit(fill.map(function (v, i) { return v + view[i]; }))
    };
  }

  // A shared studio material reveals normals through diffuse shading and
  // view-dependent white reflections. It never changes the model geometry.
  function shade(x, y, z, lighting) {
    var length = Math.hypot(x, y, z) || 1;
    x /= length; y /= length; z /= length;
    var facing = x * lighting.view[0] + y * lighting.view[1] + z * lighting.view[2];
    if (facing < 0) { x = -x; y = -y; z = -z; facing = -facing; }
    function cosine(v) { return Math.max(0, x * v[0] + y * v[1] + z * v[2]); }
    var diffuse = 0.25 + 0.58 * cosine(lighting.key) + 0.13 * cosine(lighting.fill);
    var highlight = 0.34 * Math.pow(cosine(lighting.half), 42) +
      0.09 * Math.pow(cosine(lighting.half), 8) +
      0.06 * Math.pow(cosine(lighting.fillHalf), 22);
    var rim = 0.055 * Math.pow(1 - Math.min(1, facing), 4);
    return lighting.color.map(function (channel, i) {
      return Math.min(255, channel * diffuse + 255 * highlight + [210, 228, 240][i] * rim);
    });
  }

  function triangleShade(a, b, c, lighting) {
    var ux = b.wx - a.wx, uy = b.wy - a.wy, uz = b.wz - a.wz;
    var vx = c.wx - a.wx, vy = c.wy - a.wy, vz = c.wz - a.wz;
    var x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    return shade(x, y, z, lighting);
  }

  function vertices(data, key, range, projection, ratio, lighting) {
    var r = data.resolution, result = new Array(r * r);
    var step = 2 / (r - 1);
    for (var j = 0; j < r; j++) {
      for (var i = 0; i < r; i++) {
        var index = j * r + i, vertex = data.grid[index], value = vertex[key];
        var x = -1 + i * step, y = 1 - j * step;
        var p = projection.project(x, y, value);
        p.x *= ratio; p.y *= ratio;
        p.wx = x; p.wy = y; p.wz = (value - range.low) * range.vertical;
        if (key === "soft") {
          var dx = vertex.softDx, dy = vertex.softDy;
          if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
            var left = Math.max(0, i - 1), right = Math.min(r - 1, i + 1);
            var top = Math.max(0, j - 1), bottom = Math.min(r - 1, j + 1);
            dx = (data.grid[j * r + right].soft - data.grid[j * r + left].soft) / ((right - left) * step);
            dy = (data.grid[top * r + i].soft - data.grid[bottom * r + i].soft) / ((bottom - top) * step);
          }
          // Analytic log-sum-exp gradients give a smooth normal field even when
          // a low temperature concentrates curvature into a narrow transition.
          // Only lighting is interpolated; the model values are never filtered.
          var color = shade(-range.vertical * dx, -range.vertical * dy, 1, lighting);
          p.red = color[0]; p.green = color[1]; p.blue = color[2];
        }
        result[index] = p;
      }
    }
    return result;
  }

  // An orthographic z-buffer makes every azimuth behave consistently, including
  // views where the near rim hides part of the graph. Depth increases toward us.
  function rasterTriangle(a, b, c, buffer, width, height, pixels, flatColor) {
    var denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denominator) < 1e-9) return;
    // Rasterize pixel centers only. Tight boxes matter for a fine surface mesh:
    // many triangles occupy less than a pixel in one direction.
    var minX = Math.max(0, Math.ceil(Math.min(a.x, b.x, c.x) - 0.5));
    var maxX = Math.min(width - 1, Math.floor(Math.max(a.x, b.x, c.x) - 0.5));
    var minY = Math.max(0, Math.ceil(Math.min(a.y, b.y, c.y) - 0.5));
    var maxY = Math.min(height - 1, Math.floor(Math.max(a.y, b.y, c.y) - 0.5));
    if (minX > maxX || minY > maxY) return;
    var duX = (b.y - c.y) / denominator, duY = (c.x - b.x) / denominator;
    var dvX = (c.y - a.y) / denominator, dvY = (a.x - c.x) / denominator;
    var firstU = duX * (minX + 0.5 - c.x) + duY * (minY + 0.5 - c.y);
    var firstV = dvX * (minX + 0.5 - c.x) + dvY * (minY + 0.5 - c.y);
    var depthU = a.depth - c.depth, depthV = b.depth - c.depth;
    var smooth = flatColor === null;
    var redU = smooth ? a.red - c.red : 0, redV = smooth ? b.red - c.red : 0;
    var greenU = smooth ? a.green - c.green : 0, greenV = smooth ? b.green - c.green : 0;
    var blueU = smooth ? a.blue - c.blue : 0, blueV = smooth ? b.blue - c.blue : 0;
    for (var y = minY; y <= maxY; y++) {
      var u = firstU, v = firstV;
      for (var x = minX; x <= maxX; x++, u += duX, v += dvX) {
        var w = 1 - u - v;
        if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
        var depth = c.depth + u * depthU + v * depthV;
        var index = y * width + x;
        if (depth < buffer[index]) continue;
        buffer[index] = depth;
        var offset = 4 * index;
        if (smooth) {
          pixels[offset] = c.red + u * redU + v * redV;
          pixels[offset + 1] = c.green + u * greenU + v * greenV;
          pixels[offset + 2] = c.blue + u * blueU + v * blueV;
        } else {
          pixels[offset] = flatColor[0]; pixels[offset + 1] = flatColor[1]; pixels[offset + 2] = flatColor[2];
        }
        pixels[offset + 3] = 255;
      }
      firstU += duY; firstV += dvY;
    }
  }

  function rasterMesh(points, resolution, depth, width, height, pixels, lighting, smooth) {
    for (var j = 0; j < resolution - 1; j++) {
      for (var i = 0; i < resolution - 1; i++) {
        var a = points[j * resolution + i];
        var b = points[j * resolution + i + 1];
        var c = points[(j + 1) * resolution + i + 1];
        var d = points[(j + 1) * resolution + i];
        rasterTriangle(a, b, c, depth, width, height, pixels,
          smooth ? null : triangleShade(a, b, c, lighting));
        rasterTriangle(a, c, d, depth, width, height, pixels,
          smooth ? null : triangleShade(a, c, d, lighting));
      }
    }
  }

  // A sampled grid straddles the creases of a max-affine function, creating
  // tiny triangles with normals that belong to none of its actual planes.
  // Clip each plane's active region instead, retaining exact flat faces.
  function maxCells(planes) {
    if (!Array.isArray(planes) || !planes.length || planes.some(function (plane) {
      return !plane || !Number.isFinite(plane.a) || !Number.isFinite(plane.b) || !Number.isFinite(plane.c);
    })) return null;
    if (maxCellCache.has(planes)) return maxCellCache.get(planes);

    function clip(polygon, a, b, c) {
      var length = Math.hypot(a, b);
      a /= length; b /= length; c /= length;
      function distance(point) {
        var value = a * point.x + b * point.y + c;
        return Math.abs(value) < 1e-12 ? 0 : value;
      }
      var result = [], previous = polygon[polygon.length - 1];
      var previousDistance = distance(previous);
      polygon.forEach(function (current) {
        var currentDistance = distance(current);
        if ((currentDistance >= 0) !== (previousDistance >= 0)) {
          var t = previousDistance / (previousDistance - currentDistance);
          result.push({ x: previous.x + t * (current.x - previous.x),
            y: previous.y + t * (current.y - previous.y) });
        }
        if (currentDistance >= 0) result.push(current);
        previous = current; previousDistance = currentDistance;
      });
      // A line through a polygon vertex can otherwise duplicate that vertex.
      return result.filter(function (point, index) {
        var other = result[(index + 1) % result.length];
        return Math.hypot(point.x - other.x, point.y - other.y) > 1e-12;
      });
    }

    var cells = [];
    planes.forEach(function (plane, i) {
      var polygon = [{ x: -1, y: -1 }, { x: 1, y: -1 },
        { x: 1, y: 1 }, { x: -1, y: 1 }];
      for (var j = 0; j < planes.length && polygon.length >= 3; j++) {
        if (i === j) continue;
        var other = planes[j];
        var a = plane.a - other.a, b = plane.b - other.b, c = plane.c - other.c;
        if (a === 0 && b === 0) {
          // Equal planes have a single owner; a parallel higher plane hides us.
          if (c < 0 || (c === 0 && j < i)) polygon = [];
        } else {
          polygon = clip(polygon, a, b, c);
        }
      }
      if (polygon.length >= 3) cells.push({ a: plane.a, b: plane.b, c: plane.c, polygon: polygon });
    });
    maxCellCache.set(planes, cells);
    return cells;
  }

  function rasterMaxCells(cells, range, projection, ratio, depth, width, height, pixels, lighting) {
    cells.forEach(function (cell) {
      var points = cell.polygon.map(function (point) {
        var value = cell.a * point.x + cell.b * point.y + cell.c;
        var projected = projection.project(point.x, point.y, value);
        projected.x *= ratio; projected.y *= ratio;
        return projected;
      });
      var color = shade(-cell.a * range.vertical, -cell.b * range.vertical, 1, lighting);
      for (var i = 1; i < points.length - 1; i++) {
        rasterTriangle(points[0], points[i], points[i + 1], depth, width, height, pixels, color);
      }
    });
  }

  function blendPixel(pixels, index, color, opacity) {
    var offset = index * 4;
    for (var c = 0; c < 3; c++) pixels[offset + c] += opacity * (color[c] - pixels[offset + c]);
    pixels[offset + 3] = 255;
  }

  function depthLine(a, b, image, depth, color, ratio, tolerance) {
    var width = image.width, height = image.height, pixels = image.data;
    var length = Math.hypot(b.x - a.x, b.y - a.y);
    var steps = Math.max(1, Math.ceil(length * 1.2));
    var radius = Math.max(0.6, 0.48 * ratio), reach = Math.ceil(radius);
    for (var k = 0; k <= steps; k++) {
      var t = k / steps;
      var x = a.x + t * (b.x - a.x), y = a.y + t * (b.y - a.y);
      var z = a.depth + t * (b.depth - a.depth);
      for (var dy = -reach; dy <= reach; dy++) {
        for (var dx = -reach; dx <= reach; dx++) {
          var ix = Math.floor(x) + dx, iy = Math.floor(y) + dy;
          if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;
          var distance = Math.hypot(ix + 0.5 - x, iy + 0.5 - y);
          var alpha = Math.max(0, Math.min(0.82, radius + 0.45 - distance));
          if (!alpha) continue;
          var index = iy * width + ix;
          if (z + tolerance < depth[index]) continue;
          blendPixel(pixels, index, color, alpha);
        }
      }
    }
  }

  function canvasLine(ctx, points, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.stroke();
  }

  function drawFloor(ctx, projection, range) {
    var floor = range.floor;
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (p) {
      return projection.project(p[0], p[1], floor);
    });
    ctx.beginPath();
    corners.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.closePath(); ctx.fillStyle = "#f7f9f9"; ctx.fill();
    [-1, -0.5, 0, 0.5, 1].forEach(function (v) {
      canvasLine(ctx, [projection.project(v, -1, floor), projection.project(v, 1, floor)], "#e0e6e7", 0.7);
      canvasLine(ctx, [projection.project(-1, v, floor), projection.project(1, v, floor)], "#e0e6e7", 0.7);
    });
    canvasLine(ctx, corners.concat([corners[0]]), "#c0ced1", 0.8);
  }

  function tickText(value) {
    if (Math.abs(value) < 1e-10) return "0";
    if (Math.abs(value) >= 10) return value.toFixed(0);
    return Number(value.toPrecision(2)).toString();
  }

  function zTicks(range) {
    var raw = range.span / 3;
    var power = Math.pow(10, Math.floor(Math.log10(raw)));
    var fraction = raw / power;
    var step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
    var ticks = [];
    for (var value = Math.ceil((range.low - 1e-9) / step) * step;
      value <= range.high + 1e-9; value += step) {
      ticks.push(Math.abs(value) < 1e-9 ? 0 : value);
    }
    return ticks;
  }

  function drawAxes(ctx, image, surfaceDepth, projection, range, ratio) {
    var floor = range.floor;
    var axes = [
      { name: "x", points: [[-1, projection.frontY], [1, projection.frontY]],
        point: function (v) { return projection.project(v, projection.frontY, floor); } },
      { name: "y", points: [[projection.frontX, -1], [projection.frontX, 1]],
        point: function (v) { return projection.project(projection.frontX, v, floor); } }
    ];
    var annotations = [];
    var center = projection.project(0, 0, floor);
    function rasterAxis(a, b) {
      depthLine({ x: a.x * ratio, y: a.y * ratio, depth: a.depth },
        { x: b.x * ratio, y: b.y * ratio, depth: b.depth },
        image, surfaceDepth, [103, 121, 129], ratio, 0.006);
    }

    axes.forEach(function (axis) {
      var a = axis.point(-1), b = axis.point(1), middle = axis.point(0);
      var ox = middle.x - center.x, oy = middle.y - center.y;
      var distance = Math.hypot(ox, oy) || 1;
      ox /= distance; oy /= distance;
      rasterAxis(a, b);
      [-1, 0, 1].forEach(function (v) {
        var p = axis.point(v);
        rasterAxis(p, { x: p.x + 4 * ox, y: p.y + 4 * oy, depth: p.depth });
        annotations.push({ text: String(v), x: p.x + 11 * ox, y: p.y + 11 * oy, align: "center" });
      });
      annotations.push({ text: axis.name, x: middle.x + 27 * ox, y: middle.y + 27 * oy, align: "center", axis: true });
    });

    // The leftmost vertical edge leaves its labels outside the graph silhouette.
    var zx = projection.leftX, zy = projection.leftY;
    rasterAxis(projection.project(zx, zy, floor), projection.project(zx, zy, range.high));
    zTicks(range).forEach(function (value) {
      var p = projection.project(zx, zy, value);
      rasterAxis(p, { x: p.x - 4, y: p.y, depth: p.depth });
      annotations.push({ text: tickText(value), x: p.x - 7, y: p.y, align: "right" });
    });
    var top = projection.project(zx, zy, range.high);
    annotations.push({ text: "z", x: top.x, y: top.y - 13, align: "center", axis: true });
    return annotations;
  }

  function draw(canvas, data, key, view) {
    if (!canvas || !data || !data.grid || !data.grid.length || !(key in COLORS)) return false;
    var rect = canvas.getBoundingClientRect();
    var width = rect.width, height = rect.height;
    if (!(width > 0 && height > 0) || data.resolution < 2) return false;
    var ratio = Math.min(root.devicePixelRatio || 1, 2);
    var pixelWidth = Math.max(1, Math.round(width * ratio));
    var pixelHeight = Math.max(1, Math.round(height * ratio));
    canvas.width = pixelWidth; canvas.height = pixelHeight;
    var ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    var range = bounds(data), projection = camera(width, height, range, view);
    drawFloor(ctx, projection, range);
    var image = ctx.getImageData(0, 0, pixelWidth, pixelHeight);
    var surfaceDepth = new Float32Array(pixelWidth * pixelHeight);
    surfaceDepth.fill(-Infinity);
    var lighting = studio(projection, COLORS[key]);
    var planes = key === "max" && ((data.maxModel && data.maxModel.planes) || (data.max && data.max.planes));
    var cells = planes && maxCells(planes);
    if (cells) {
      rasterMaxCells(cells, range, projection, ratio, surfaceDepth, pixelWidth, pixelHeight, image.data, lighting);
    } else {
      var surface = vertices(data, key, range, projection, ratio, lighting);
      rasterMesh(surface, data.resolution, surfaceDepth, pixelWidth, pixelHeight,
        image.data, lighting, key === "soft");
    }
    var annotations = drawAxes(ctx, image, surfaceDepth, projection, range, ratio);
    ctx.putImageData(image, 0, 0);
    annotations.forEach(function (label) {
      ctx.font = (label.axis ? "italic 12px" : "11px") + " system-ui, sans-serif";
      ctx.fillStyle = label.axis ? "#30434c" : "#617078";
      ctx.textAlign = label.align; ctx.textBaseline = "middle";
      // A small white halo keeps numbers readable near projected grid lines.
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
      ctx.strokeText(label.text, label.x, label.y);
      ctx.fillText(label.text, label.x, label.y);
    });
    return true;
  }

  var api = { draw: draw, bounds: bounds, camera: camera, zTicks: zTicks, maxCells: maxCells };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MaxSoftmax3D = api;
}(typeof window !== "undefined" ? window : globalThis));
