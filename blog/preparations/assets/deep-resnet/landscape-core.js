/* Exact inverse-image contours, independent of the canvas and the DOM. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ResNetLandscape = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TAU = 2 * Math.PI;
  const DEPTHS = Object.freeze(Array.from({length: 40}, (_, k) => k + 1).concat([50, 75, 100, 200, 500, 1000, Infinity]));
  const LEVELS = Object.freeze([.1, .5, 1, 2, 5, 10, 25]);
  const INITIAL_CAMERA = Object.freeze({cx: -7.5, cy: 0, zoom: 1});
  function depth(L) {
    if (L !== Infinity && (!Number.isInteger(L) || L < 1 || L > 100000)) throw new RangeError("Depth must be a positive integer or Infinity.");
  }
  function principal(a) { return a - TAU * Math.floor((a + Math.PI) / TAU); }
  function fromLogPolar(L, logRadius, angle) {
    if (L === Infinity) return {x: logRadius, y: angle};
    if (logRadius === -Infinity) return {x: -L, y: 0};
    const a = logRadius / L, theta = principal(angle / L), radius = Math.exp(a);
    // Avoid cancellation in L (exp(logRadius/L) cos(theta) - 1).
    return {x: L * (Math.expm1(a) * Math.cos(theta) - 2 * Math.sin(theta / 2) ** 2), y: L * radius * Math.sin(theta)};
  }
  function loss(L, x, y) {
    depth(L);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return NaN;
    let a = x, theta = y;
    if (L !== Infinity) {
      const u = x / L, v = y / L;
      if (u === -1 && v === 0) return 1;
      const logRadius = Math.abs(u) < .5 && Math.abs(v) < .5 ? .5 * Math.log1p(2 * u + u * u + v * v) : Math.log(Math.hypot(1 + u, v));
      a = L * logRadius; theta = L * Math.atan2(v, 1 + u);
    }
    if (a > 355) return Infinity;
    const radius = Math.exp(a), delta = Math.expm1(a);
    return delta * delta + 4 * radius * Math.cos(principal(theta) / 2) ** 2;
  }
  function inside(p, b, pad = 0) { return p.x >= b.xmin - pad && p.x <= b.xmax + pad && p.y >= b.ymin - pad && p.y <= b.ymax + pad; }
  function intersects(a, b) { return a.xmin <= b.xmax && a.xmax >= b.xmin && a.ymin <= b.ymax && a.ymax >= b.ymin; }
  function minima(L, bounds) {
    depth(L);
    const points = [];
    if (L === Infinity) {
      if (!bounds) throw new RangeError("A viewport is required for infinitely many minima.");
      if (bounds.xmin > 0 || bounds.xmax < 0) return points;
      const first = Math.ceil((bounds.ymin / Math.PI - 1) / 2), last = Math.floor((bounds.ymax / Math.PI - 1) / 2);
      for (let k = first; k <= last; k++) points.push({x: 0, y: (2 * k + 1) * Math.PI, k});
    } else {
      for (let k = 0; k < L; k++) {
        const p = fromLogPolar(L, 0, (2 * k + 1) * Math.PI);
        if (!bounds || inside(p, bounds)) points.push({...p, k});
      }
    }
    return points;
  }
  function saddle(L) { depth(L); return L === Infinity || L === 1 ? null : {x: -L, y: 0, loss: 1, kind: L === 2 ? "ordinary" : "degenerate", order: L}; }
  function cameraBounds(camera, width, height) {
    if (!(width > 0 && height > 0 && camera.zoom > 0)) throw new RangeError("Camera dimensions and zoom must be positive.");
    const scale = Math.min(width / 35, height / 24) * camera.zoom;
    return {xmin: camera.cx - width / (2 * scale), xmax: camera.cx + width / (2 * scale), ymin: camera.cy - height / (2 * scale), ymax: camera.cy + height / (2 * scale), scale};
  }
  function toWorld(camera, width, height, px, py) {
    const b = cameraBounds(camera, width, height);
    return {x: b.xmin + px / b.scale, y: b.ymax - py / b.scale};
  }
  function toScreen(camera, width, height, x, y) {
    const b = cameraBounds(camera, width, height);
    return {x: (x - b.xmin) * b.scale, y: (b.ymax - y) * b.scale};
  }
  function panCamera(camera, width, height, dx, dy) {
    const scale = cameraBounds(camera, width, height).scale;
    return {...camera, cx: camera.cx - dx / scale, cy: camera.cy + dy / scale};
  }
  function zoomCamera(camera, width, height, zoom, px = width / 2, py = height / 2) {
    const before = toWorld(camera, width, height, px, py), next = {...camera, zoom: Math.max(1 / 256, Math.min(64, zoom))};
    const after = toWorld(next, width, height, px, py);
    next.cx += before.x - after.x; next.cy += before.y - after.y;
    return next;
  }
  function sectorBounds(L, rmin, rmax, amin, amax) {
    const angles = [amin, amax];
    for (let k = Math.ceil(amin / (Math.PI / 2)); k <= Math.floor(amax / (Math.PI / 2)); k++) angles.push(k * Math.PI / 2);
    const xs = [], ys = [];
    for (const angle of angles) for (const r of [rmin, rmax]) { xs.push(L * (r * Math.cos(angle) - 1)); ys.push(L * r * Math.sin(angle)); }
    return {xmin: Math.min(...xs), xmax: Math.max(...xs), ymin: Math.min(...ys), ymax: Math.max(...ys)};
  }
  function contourCurves(L, level, viewport) {
    depth(L);
    if (!(level > 0 && Number.isFinite(level))) throw new RangeError("Contour levels must be finite and positive.");
    if (L === Infinity && !viewport) throw new RangeError("Infinite-depth contours require a viewport.");
    const r = Math.sqrt(level), small = level < 1;
    const amin = level === 1 ? Math.PI / 2 : small ? Math.PI - Math.asin(r) : -Math.PI;
    const amax = level === 1 ? 3 * Math.PI / 2 : small ? Math.PI + Math.asin(r) : Math.PI;
    const curves = [];
    let first = 0, last = L - 1;
    if (L === Infinity) {
      first = Math.ceil((viewport.ymin - amax) / TAU); last = Math.floor((viewport.ymax - amin) / TAU);
    }
    for (let k = first; k <= last; k++) {
      let bounds;
      if (L === Infinity) bounds = {xmin: level === 1 ? viewport.xmin : Math.log(Math.abs(1 - r)), xmax: Math.log(1 + r), ymin: amin + TAU * k, ymax: amax + TAU * k};
      else bounds = sectorBounds(L, level === 1 ? 0 : Math.abs(1 - r) ** (1 / L), (1 + r) ** (1 / L), (amin + TAU * k) / L, (amax + TAU * k) / L);
      if (viewport && !intersects(bounds, viewport)) continue;
      let point, boundsBetween, closed = small || L !== Infinity && level === 1;
      if (level === 1 && L !== Infinity) {
        const maxRadius = 2 ** (1 / L);
        point = t => {
          if (t === 0 || t === 1) return {x: -L, y: 0};
          const rising = t <= .5, u = rising ? 2 * t : 2 * (1 - t), s = Math.sin(Math.PI * u / 2);
          // Reparameterize the Lth root radially. A uniform circle grid cannot
          // resolve t^(1/L) near w=0 and would erase the degenerate saddle.
          const theta = rising ? Math.PI / 2 + Math.asin(s ** L) : 3 * Math.PI / 2 - Math.asin(s ** L);
          const angle = principal((theta + TAU * k) / L), radius = maxRadius * s;
          return {x: L * (radius * Math.cos(angle) - 1), y: L * radius * Math.sin(angle)};
        };
        boundsBetween = (a, b) => {
          function polar(t) {
            const rising = t <= .5, s = Math.sin(Math.PI * (rising ? t : 1 - t));
            return {r: maxRadius * s, theta: ((rising ? Math.PI / 2 + Math.asin(s ** L) : 3 * Math.PI / 2 - Math.asin(s ** L)) + TAU * k) / L};
          }
          const pa = polar(a), pb = polar(b);
          return sectorBounds(L, Math.min(pa.r, pb.r), a <= .5 && b >= .5 ? maxRadius : Math.max(pa.r, pb.r), pa.theta, pb.theta);
        };
      } else if (level === 1) {
        const xmin = Math.min(viewport.xmin, Math.log(2)), xmax = Math.log(2);
        point = t => {
          const rising = t <= .5, u = rising ? 2 * t : 2 * (1 - t);
          // A quadratic endpoint removes the square-root turn at x=log(2).
          const x = xmax - (xmax - xmin) * (1 - u) ** 2;
          const a = Math.acos(Math.min(1, Math.exp(x) / 2));
          return {x, y: Math.PI + (rising ? -a : a) + TAU * k};
        };
      } else {
        point = t => {
          const phi = small ? TAU * t : -Math.PI + TAU * t;
          const wx = -1 + r * Math.cos(phi), wy = r * Math.sin(phi);
          let theta = Math.atan2(wy, wx);
          if (small && theta < 0) theta += TAU;
          return fromLogPolar(L, Math.log(Math.hypot(wx, wy)), theta + TAU * k);
        };
      }
      curves.push({level, sheet: k, closed, point, bounds, boundsBetween});
    }
    return curves;
  }
  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy;
    const t = d === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function sampleCurve(curve, scale, tolerance = .35, viewport) {
    if (!(scale > 0 && tolerance > 0)) throw new RangeError("Sampling scale and tolerance must be positive.");
    const result = [], error = tolerance / scale;
    function split(a, b, pa, pb, level) {
      // Exact interval enclosures let high-zoom saddle views omit refinement
      // of remote lobes. A skipped chord lies in the same offscreen rectangle.
      if (viewport && curve.boundsBetween && !intersects(curve.boundsBetween(a, b), viewport)) { result.push({...pb, t: b}); return; }
      const m = (a + b) / 2, pm = curve.point(m);
      const q1 = curve.point((a + m) / 2), q3 = curve.point((m + b) / 2);
      if (level < 20 && Math.max(distanceToSegment(pm, pa, pb), distanceToSegment(q1, pa, pb), distanceToSegment(q3, pa, pb)) > error) {
        split(a, m, pa, pm, level + 1); split(m, b, pm, pb, level + 1);
      } else result.push({...pb, t: b});
    }
    result.push({...curve.point(0), t: 0});
    // Fixed seeds prevent symmetry from hiding a complete loop from the test.
    for (let j = 0; j < 12; j++) split(j / 12, (j + 1) / 12, curve.point(j / 12), curve.point((j + 1) / 12), 0);
    return result;
  }
  function contours(L, bounds, scale = bounds.scale || 1, levels = LEVELS, tolerance = .35) {
    return levels.flatMap(level => contourCurves(L, level, bounds).map(curve => ({level, sheet: curve.sheet, closed: curve.closed, points: sampleCurve(curve, scale, tolerance, bounds)})));
  }
  return {DEPTHS, LEVELS, INITIAL_CAMERA, loss, minima, saddle, inside, cameraBounds, toWorld, toScreen, panCamera, zoomCamera, contourCurves, sampleCurve, contours, distanceToSegment};
});
