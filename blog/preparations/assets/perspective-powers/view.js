(function (root) {
  "use strict";
  const M = typeof module !== "undefined" && module.exports ? require("./core.js") : root.PerspectivePowers;
  function layout(width, height) {
    const left = 45, right = width - 18, top = 22, bottom = height - 45;
    return { left, right, top, bottom, width: right - left, height: bottom - top };
  }
  function draw(ctx, width, height, state) {
    const p = M.exponent(state.p), box = layout(width, height), D = M.domain;
    const px = z => box.left + (z - D.zMin) / (D.zMax - D.zMin) * box.width;
    const py = r => box.bottom - r / D.rMax * box.height;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    const count = state.resolution || 160;
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
      const z = D.zMin + (col + .5) * (D.zMax - D.zMin) / count, r = (count - row - .5) * D.rMax / count;
      ctx.fillStyle = M.color(M.value(z, r, p));
      ctx.fillRect(box.left + col * box.width / count, box.top + row * box.height / count, box.width / count + .5, box.height / count + .5);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, box.width, box.height); ctx.clip();
    for (const level of M.levels) {
      ctx.strokeStyle = "rgba(255,255,255,.82)"; ctx.lineWidth = 1.2;
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        const first = p === 1 ? 0 : 1;
        for (let k = first; k <= 350; k++) {
          const r = D.rMax * (k / 350) ** 2, x = px(sign * M.levelRadius(r, level, p)), y = py(r);
          if (k === first) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      const labelR = 2.1, z = M.levelRadius(labelR, level, p);
      if (z < D.zMax - .12) {
        ctx.font = "600 11px system-ui,sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = "#173841"; ctx.fillText(String(level), px(z), py(labelR) - 5);
      }
    }
    ctx.setLineDash([5, 4]); ctx.strokeStyle = "#b86c3d"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(px(D.zMin), py(1)); ctx.lineTo(px(D.zMax), py(1)); ctx.stroke(); ctx.setLineDash([]);
    if (state.point) {
      const x = px(state.point.z), y = py(state.point.r);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fillStyle = "#f6a56e"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    ctx.font = "12px system-ui,sans-serif"; ctx.fillStyle = "#536976";
    ctx.textAlign = "center";
    for (const z of [-2, -1, 0, 1, 2]) ctx.fillText(String(z), px(z), box.bottom + 20);
    ctx.textAlign = "right";
    for (const r of [0, .5, 1, 1.5, 2]) ctx.fillText(String(r), box.left - 9, py(r) + 4);
    ctx.textAlign = "left"; ctx.fillText("mass r", box.left, 13);
    ctx.textAlign = "right"; ctx.fillText("numerator z", box.right, height - 4);
    ctx.strokeStyle = "#9aaeb2"; ctx.lineWidth = 1; ctx.strokeRect(box.left, box.top, box.width, box.height);
    return box;
  }
  const api = { draw, layout };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PerspectivePowersView = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
