/* Replay the live spectral formulas and shared ellipse renderer. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const M = require("../blog/preparations/assets/positive-matrix-means/core.js");
const V = require("../blog/preparations/assets/positive-matrix-means/view.js");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
let library;
if (process.env.BLOG_CANVAS_PATH) library = require(process.env.BLOG_CANVAS_PATH);
else {
  try { library = require("@napi-rs/canvas"); }
  catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); }
}
const { createCanvas } = library;
const settings = { ...M.presets.noncommuting, showLogarithmic: true,
  renderer: "shared experiment core.js and view.js, native canvas summary layout" };
const A = M.covariance(0, settings.anisotropy, 1);
const B = M.covariance(settings.rotation, settings.anisotropy, settings.bSize);
const bound = V.extent(A, B), canvas = createCanvas(1200, 680), ctx = canvas.getContext("2d");
ctx.fillStyle = "#f5f7fb"; ctx.fillRect(0, 0, canvas.width, canvas.height);
function text(t, x, y, size, weight = 400, color = "#21344d") {
  ctx.fillStyle = color; ctx.font = weight + " " + size + "px sans-serif"; ctx.fillText(t, x, y);
}
text("Averaging positive matrices", 28, 39, 27, 600);
text("Two geometric midpoints, plus a fixed logarithmic time-average", 29, 69, 18, 400, "#617087");
for (let i = 0; i < 2; i++) {
  const left = 24 + i * 588;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#dce3ee";
  ctx.beginPath(); ctx.roundRect(left, 94, 576, 517, 8); ctx.fill(); ctx.stroke();
  text(i ? "Kubo–Ando" : "Log-Euclidean", left + 18, 124, 21, 600);
  const plot = createCanvas(552, 464);
  V.drawPanel(plot.getContext("2d"), plot.width, plot.height,
    { A, B, t: settings.t, kind: i ? "ka" : "log", extent: bound, showLogarithmic: true });
  ctx.drawImage(plot, left + 12, 137);
}
text("Blue → red: interpolation time  ·  Bold: t = 0.50  ·  Teal dotted: logarithmic mean", 29, 645, 17, 400, "#617087");
const arg = process.argv.indexOf("--out");
const output = arg < 0 ? path.join(__dirname, "../blog/imgs/summaries/averaging-positive-symmetric-matrices.jpg") : process.argv[arg + 1];
if (!output) throw new Error("--out requires a path");
const bytes = stripMetadata(canvas.encodeSync("jpeg", 90));
if (bytes.length > 1000000) throw new Error("Summary exceeds image size limit");
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes);
console.log(JSON.stringify({ slug: "averaging-positive-symmetric-matrices",
  path: "/blog/imgs/summaries/averaging-positive-symmetric-matrices.jpg", ...dimensions(bytes),
  alt: "Log-Euclidean and Kubo–Ando geometric covariance midpoints on common axes, with a distinct fixed logarithmic time-average drawn as a teal dotted ellipse.",
  source: "/blog/preparations/assets/positive-matrix-means/index.html", settings,
  sha256: crypto.createHash("sha256").update(bytes).digest("hex") }));
