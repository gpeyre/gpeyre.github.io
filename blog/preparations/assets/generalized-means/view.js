/* The same canvas renderer is used by the interactive panel and its summary. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GeneralizedMeansView = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const colors = { lower: "#087e86", upper: "#ca7356", ink: "#233c45" };
  const stops = [[0, 250, 249, 242], [.12, 225, 239, 224], [.32, 161, 213, 193], [.56, 79, 170, 166], [.78, 33, 118, 142], [1, 31, 57, 91]];
  const palette = Array.from({ length: 256 }, (_, k) => {
    const t = k / 255; let j = 0;
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const a = stops[j], b = stops[j + 1], s = (t - a[0]) / (b[0] - a[0]);
    return [1, 2, 3].map(c => Math.round(a[c] + s * (b[c] - a[c])));
  });
  function layout(width, height) {
    const left = 34, top = 10, side = Math.min(width - left - 10, height - 75);
    return { left, top, side, bottom: top + side };
  }
  function contours(ctx, data, size, level, box) {
    const step = box.side / (size - 1); ctx.beginPath();
    function triangle(ax, ay, av, bx, by, bv, cx, cy, cv) {
      const hits = [];
      function edge(x0, y0, v0, x1, y1, v1) {
        if ((v0 < level) === (v1 < level)) return;
        const t = (level - v0) / (v1 - v0);
        hits.push([box.left + step * (x0 + t * (x1 - x0)), box.top + step * (y0 + t * (y1 - y0))]);
      }
      edge(ax, ay, av, bx, by, bv); edge(bx, by, bv, cx, cy, cv); edge(cx, cy, cv, ax, ay, av);
      if (hits.length === 2) { ctx.moveTo(hits[0][0], hits[0][1]); ctx.lineTo(hits[1][0], hits[1][1]); }
    }
    for (let row = 0; row < size - 1; row++) for (let col = 0; col < size - 1; col++) {
      const k = row * size + col, a = data[k], b = data[k + 1], c = data[k + size + 1], d = data[k + size];
      if (Math.min(a, b, c, d) > level || Math.max(a, b, c, d) < level) continue;
      triangle(col, row, a, col + 1, row, b, col + 1, row + 1, c);
      triangle(col, row, a, col + 1, row + 1, c, col, row + 1, d);
    }
    ctx.stroke();
  }
  function dot(ctx, px, py, r, fill) { ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = "#fff"; ctx.stroke(); }
  function drawMap(ctx, width, height, state, createCanvas) {
    const { fields, result, x, y, composed } = state;
    const box = layout(width, height), { left, top, side, bottom } = box, size = fields.size;
    const min = fields.min, max = fields.max, span = max - min, data = composed ? fields.composed : fields.single;
    // Accept the caller's canvas factory so this module also runs in Node.
    const raster = createCanvas(size, size), rasterContext = raster.getContext("2d");
    const pixels = rasterContext.createImageData(size, size);
    for (let k = 0; k < data.length; k++) {
      const color = palette[Math.max(0, Math.min(255, Math.round(255 * (data[k] - min) / span)))];
      pixels.data[4 * k] = color[0]; pixels.data[4 * k + 1] = color[1]; pixels.data[4 * k + 2] = color[2]; pixels.data[4 * k + 3] = 255;
    }
    rasterContext.putImageData(pixels, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(raster, left, top, side, side);
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, side, side); ctx.clip();
    ctx.strokeStyle = "rgba(23,65,77,.38)"; ctx.lineWidth = .65;
    for (const level of [.25, .5, .75, 1, 1.25, 1.5, 1.75]) contours(ctx, data, size, level, box);
    ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(left + side, top); ctx.stroke(); ctx.setLineDash([]);
    const px = v => left + (v - min) / span * side, py = v => top + (max - v) / span * side;
    if (composed) {
      ctx.beginPath(); result.trace.forEach((s, i) => i ? ctx.lineTo(px(s.x), py(s.y)) : ctx.moveTo(px(s.x), py(s.y)));
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = "#a9573e"; ctx.lineWidth = 1.7; ctx.stroke();
      result.trace.slice(1).forEach(s => dot(ctx, px(s.x), py(s.y), 2.4, colors.lower));
      dot(ctx, px(result.value), py(result.value), 4, colors.ink);
    }
    dot(ctx, px(x), py(y), 5, colors.upper); ctx.restore();
    ctx.strokeStyle = "#bbcecf"; ctx.lineWidth = .7; ctx.strokeRect(left, top, side, side);
    ctx.font = "9px system-ui,sans-serif"; ctx.fillStyle = "#637d83";
    for (const tick of [.08, 1, 2]) {
      ctx.textAlign = "center"; ctx.fillText(String(tick), px(tick), bottom + 13);
      ctx.textAlign = "right"; ctx.fillText(String(tick), left - 6, py(tick) + 3);
    }
    ctx.textAlign = "right"; ctx.fillText("x", left + side, bottom + 25); ctx.textAlign = "left"; ctx.fillText("y", 11, top - 1);
    const barTop = bottom + 31, gradient = ctx.createLinearGradient(left, 0, left + side, 0);
    stops.forEach(s => gradient.addColorStop(s[0], "rgb(" + s.slice(1).join(",") + ")"));
    ctx.fillStyle = gradient; ctx.fillRect(left, barTop, side, 6); ctx.strokeStyle = "#d1dedb"; ctx.strokeRect(left, barTop, side, 6);
    ctx.fillStyle = "#637d83"; ctx.textAlign = "left"; ctx.fillText("0.08", left, barTop + 18);
    ctx.textAlign = "center"; ctx.fillText("mean value", left + side / 2, barTop + 18); ctx.textAlign = "right"; ctx.fillText("2", left + side, barTop + 18);
    return box;
  }
  function drawTrace(ctx, width, height, result) {
    const box = layout(width, height), { left, top, side, bottom } = box, trace = result.trace, count = Math.max(1, result.iterations);
    const low = Math.max(0, trace[0].lower - .12 * trace[0].width - .04), high = trace[0].upper + .12 * trace[0].width + .04;
    const px = n => left + side * n / count, py = v => bottom - (v - low) / (high - low) * side;
    ctx.fillStyle = "#fbfdfc"; ctx.fillRect(left, top, side, side); ctx.font = "9px system-ui,sans-serif";
    for (let j = 0; j <= 4; j++) {
      const v = low + (high - low) * j / 4, yy = py(v);
      ctx.strokeStyle = "#e5eeee"; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(left + side, yy); ctx.stroke();
      ctx.fillStyle = "#637d83"; ctx.textAlign = "right"; ctx.fillText(v.toFixed(2), left - 5, yy + 3);
    }
    ctx.beginPath(); trace.forEach((s, i) => i ? ctx.lineTo(px(s.iteration), py(s.lower)) : ctx.moveTo(px(s.iteration), py(s.lower)));
    trace.slice().reverse().forEach(s => ctx.lineTo(px(s.iteration), py(s.upper))); ctx.closePath(); ctx.fillStyle = "#e4efec"; ctx.fill();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = "#8b9b9e"; ctx.beginPath(); ctx.moveTo(left, py(result.value)); ctx.lineTo(left + side, py(result.value)); ctx.stroke(); ctx.setLineDash([]);
    for (const [key, color] of [["lower", colors.lower], ["upper", colors.upper]]) {
      ctx.beginPath(); trace.forEach((s, i) => i ? ctx.lineTo(px(s.iteration), py(s[key])) : ctx.moveTo(px(s.iteration), py(s[key])));
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke(); trace.forEach(s => dot(ctx, px(s.iteration), py(s[key]), 2.8, color));
    }
    ctx.strokeStyle = "#bbcecf"; ctx.lineWidth = .7; ctx.strokeRect(left, top, side, side);
    ctx.textAlign = "center"; ctx.fillStyle = "#637d83";
    for (let n = 0; n <= count; n++) if (count < 9 || n % Math.ceil(count / 7) === 0 || n === count) ctx.fillText(String(n), px(n), bottom + 14);
    ctx.textAlign = "left"; ctx.fillText("value", left, top - 1);
    ctx.textAlign = "center"; ctx.fillText("The shared limit stays inside", left + side / 2, bottom + 38);
    ctx.fillText("every exact-arithmetic bracket.", left + side / 2, bottom + 51);
    return box;
  }
  return { colors, layout, drawMap, drawTrace };
});
