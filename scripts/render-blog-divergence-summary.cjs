/* Replay the actual simplex renderer; also regenerate the static generator plot. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const M = require("../blog/preparations/assets/divergence-simplex/core.js");
const V = require("../blog/preparations/assets/divergence-simplex/view.js");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
let library;
if (process.env.BLOG_CANVAS_PATH) library = require(process.env.BLOG_CANVAS_PATH);
else { try { library = require("@napi-rs/canvas"); } catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); } }
const { createCanvas } = library;
function generatorSvg() {
  const W = 960, H = 430, left = 62, right = 715, top = 34, bottom = 371, xmax = 3.2, ymax = 3;
  const X = r => left + r / xmax * (right - left), Y = v => bottom - v / ymax * (bottom - top);
  const rows = [
    [0, "Reverse KL", "−log r + r − 1", "#9b6f4b"],
    [.5, "2 Hellinger²", "2(√r − 1)²", "#8b6c9f"],
    [1, "KL", "r log r − r + 1", "#087e86"],
    [2, "½ Pearson χ²", "(r − 1)²/2", "#bd5858"]
  ];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">Normalized convex generators of four power divergences</title><desc id="desc">All curves have value and slope zero at one, and second derivative one there. The generators for reverse KL, twice squared Hellinger, KL and half Pearson chi-square differ away from one.</desc><rect width="960" height="430" fill="#fff"/><g font-family="system-ui,sans-serif" font-size="13" fill="#5d747b">`;
  for (const t of [.5, 1, 2, 3]) svg += `<path d="M${X(t)},${top}V${bottom}" stroke="#e7eeee"/><text x="${X(t)}" y="${bottom + 24}" text-anchor="middle">${t}</text>`;
  for (const t of [0, 1, 2, 3]) svg += `<path d="M${left},${Y(t)}H${right}" stroke="#e7eeee"/><text x="${left - 12}" y="${Y(t) + 5}" text-anchor="end">${t}</text>`;
  svg += `<path d="M${left},${top}V${bottom}H${right}" stroke="#7d969b" fill="none"/><text x="${right + 14}" y="${bottom + 5}">r</text><text x="${left - 16}" y="${top - 13}">φ(r)</text>`;
  rows.forEach(([lambda, name, formula, color], i) => {
    const points = Array.from({ length: 420 }, (_, k) => { const r = .04 + (xmax - .04) * k / 419; return `${k ? "L" : "M"}${X(r).toFixed(2)},${Y(M.phi(r, lambda)).toFixed(2)}`; }).join("");
    svg += `<path d="${points}" fill="none" stroke="${color}" stroke-width="2.5"/><path d="M746,${78 + 69 * i}h24" stroke="${color}" stroke-width="3"/><text x="779" y="${82 + 69 * i}" font-weight="600" fill="#29434b">${name}</text><text x="746" y="${103 + 69 * i}" font-size="12">${formula}</text>`;
  });
  svg += `<circle cx="${X(1)}" cy="${Y(0)}" r="4" fill="#29434b"/><text x="480" y="419" text-anchor="middle" font-size="12">φ(1) = φ′(1) = 0 and φ″(1) = 1: the same local geometry, different tails.</text></g></svg>\n`;
  return svg;
}
const staticPath = path.join(__dirname, "../blog/preparations/assets/divergence-simplex/generators.svg");
fs.writeFileSync(staticPath, generatorSvg());
const settings = { target: M.defaultTarget.slice(), powers: [0, 2], colorCap: V.cap,
  renderer: "shared divergence-simplex core.js and view.js, native canvas summary layout" };
const canvas = createCanvas(1200, 650), ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f8f7"; ctx.fillRect(0, 0, 1200, 650);
function label(text, x, y, size, bold, color = "#29434b") { ctx.fillStyle = color; ctx.font = (bold ? "600 " : "") + size + "px sans-serif"; ctx.fillText(text, x, y); }
label("One target, different divergence geometries", 28, 40, 27, true);
label("Power f-divergences on three probabilities · same target and color scale", 29, 70, 17, false, "#627a80");
settings.powers.forEach((lambda, i) => {
  const left = 24 + i * 588;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#d8e6e4"; ctx.beginPath(); ctx.roundRect(left, 94, 576, 514, 8); ctx.fill(); ctx.stroke();
  label(lambda === 0 ? "λ = 0 · reverse KL" : "λ = 2 · half Pearson χ²", left + 18, 126, 20, true);
  const plot = createCanvas(552, 466); V.draw(plot.getContext("2d"), plot.width, plot.height, { lambda, p: settings.target }, createCanvas); ctx.drawImage(plot, left + 12, 134);
});
label("Target p = (0.16, 0.58, 0.26). White lines: numerical divergence level sets.", 29, 635, 16, false, "#627a80");
const at = process.argv.indexOf("--out"), output = at < 0 ? path.join(__dirname, "../blog/imgs/summaries/divergences-and-bregman-geometry.jpg") : process.argv[at + 1];
if (!output) throw new Error("--out requires a path");
const bytes = stripMetadata(canvas.encodeSync("jpeg", 91)); if (bytes.length > 1000000) throw new Error("Summary exceeds size limit");
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes);
console.log(JSON.stringify({ slug: "divergences-and-bregman-geometry", path: "/blog/imgs/summaries/divergences-and-bregman-geometry.jpg", ...dimensions(bytes),
  alt: "Reverse-KL and half-Pearson divergence heatmaps on the same three-probability simplex, with a shared off-center target and color scale.",
  source: "/blog/preparations/assets/divergence-simplex/index.html", settings, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }));
