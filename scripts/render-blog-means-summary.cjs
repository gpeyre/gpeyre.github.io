/* Replay the actual interactive numerical renderer with a native canvas backend. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const core = require("../blog/preparations/assets/generalized-means/core.js");
const view = require("../blog/preparations/assets/generalized-means/view.js");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
let library;
if (process.env.BLOG_CANVAS_PATH) library = require(process.env.BLOG_CANVAS_PATH);
else {
  try { library = require("@napi-rs/canvas"); }
  catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); }
}
const { createCanvas } = library;
const settings = { p: 1, q: 0, x: .45, y: 1.8, grid: 111,
  renderer: "shared experiment view.js and core.js, native canvas summary layout" };
const fields = core.sampleFields(settings.p, settings.q, settings.grid);
const result = core.gaussMean(settings.p, settings.q, settings.x, settings.y);
const canvas = createCanvas(1200, 490), ctx = canvas.getContext("2d");
ctx.fillStyle = "#f5f9f9"; ctx.fillRect(0, 0, 1200, 490);
function text(t, x, y, size, weight = 400, color = "#263e48") {
  ctx.fillStyle = color; ctx.font = weight + " " + size + "px sans-serif"; ctx.fillText(t, x, y);
}
text("Two means, one shrinking interval", 28, 38, 25, 600);
text("Arithmetic + geometric → AGM  ·  x = 0.45, y = 1.80", 29, 68, 17, 400, "#61747b");
const panelWidth = 374, panelHeight = 340, top = 110;
for (let i = 0; i < 3; i++) {
  const left = 25 + i * 388;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#d9e4e7"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(left, top - 18, panelWidth, panelHeight + 20, 8); ctx.fill(); ctx.stroke();
  const plot = createCanvas(panelWidth - 10, panelHeight - 18), pc = plot.getContext("2d");
  if (i < 2) view.drawMap(pc, plot.width, plot.height,
    { fields, result, p: settings.p, x: settings.x, y: settings.y, composed: i === 1 }, createCanvas);
  else view.drawTrace(pc, plot.width, plot.height, result);
  text(["Arithmetic mean", "Gauss composition", "Nested bounds"][i], left + 14, top + 5, 17, 600);
  ctx.drawImage(plot, left + 5, top + 15);
}
text("Same raw color scale; the closing bracket bounds the common limit in exact arithmetic.", 29, 475, 14, 400, "#61747b");
const arg = process.argv.indexOf("--out");
const output = arg < 0 ? path.join(__dirname, "../blog/imgs/summaries/arithmetico-geometric-means.jpg") : process.argv[arg + 1];
if (!output) throw new Error("--out requires a path");
const bytes = stripMetadata(canvas.encodeSync("jpeg", 90));
if (bytes.length > 1000000) throw new Error("Summary exceeds the image size limit");
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes);
console.log(JSON.stringify({ slug: "arithmetico-geometric-means", path: "/blog/imgs/summaries/arithmetico-geometric-means.jpg",
  ...dimensions(bytes), alt: "Arithmetic-mean and arithmetic–geometric-mean heatmaps on identical positive axes, with a selected orbit and its closing lower and upper bounds.",
  source: "/blog/preparations/assets/generalized-means/index.html", settings,
  sha256: crypto.createHash("sha256").update(bytes).digest("hex") }));
