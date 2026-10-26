/* Render the live experiment's exact chart routine; no replacement curves. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
const core = require("../blog/preparations/assets/dc-decomposition/core.js");
const view = require("../blog/preparations/assets/dc-decomposition/view.js");
let canvasLibrary;
if (process.env.BLOG_CANVAS_PATH) canvasLibrary = require(process.env.BLOG_CANVAS_PATH);
else {
  try { canvasLibrary = require("@napi-rs/canvas"); }
  catch (_) { canvasLibrary = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); }
}
const { createCanvas } = canvasLibrary;
for (const [file, family] of [
  ["Arial.ttf", "DC Summary"], ["Arial Bold.ttf", "DC Summary"], ["Arial Unicode.ttf", "DC Unicode"]
]) {
  const fontPath = path.join("/System/Library/Fonts/Supplemental", file);
  if (fs.existsSync(fontPath)) canvasLibrary.GlobalFonts.registerFromPath(fontPath, family);
}
const settings = { amplitude: 0.35, phase: 0, lambda: 0, domain: [-2, 2], plotting_points: 801 };
const model = core.build(settings), points = [];
for (let i = 0; i < settings.plotting_points; i++) {
  points.push(model.evaluate(core.LEFT + (core.RIGHT - core.LEFT) * i / (settings.plotting_points - 1)));
}
const canvas = createCanvas(1200, 820), ctx = canvas.getContext("2d"), colors = view.colors;
ctx.fillStyle = "#f5f9f9"; ctx.fillRect(0, 0, canvas.width, canvas.height);
function text(value, x, y, size, color = "#243640", weight = "normal") {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px "DC Summary","DC Unicode",sans-serif`; ctx.fillText(value, x, y);
}
function card(x, y, width, height) {
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#d9e4e7"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 10); ctx.fill(); ctx.stroke();
}
function legend(label, x, y, color, dashed = false) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 24, y - 5); ctx.stroke(); ctx.setLineDash([]);
  text(label, x + 32, y, 15, color);
}
function chart(series, showRoots, x, y, width, height, sourceWidth, sourceHeight) {
  const plot = createCanvas(sourceWidth, sourceHeight);
  const pctx = plot.getContext("2d"); pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, plot.width, plot.height);
  view.draw(plot, points, model.roots, series, { showRoots, ratio: width / sourceWidth });
  ctx.drawImage(plot, x, y, width, height);
}
text("A function, two convex pieces", 25, 42, 28, colors.phi, "600");
text("Φ(x) = x²/2 + 0.35 cos(πx)     ·     Minimal curvature split (λ = 0)", 26, 76, 18, "#61727a");
card(24, 105, 566, 336); card(610, 105, 566, 336); card(24, 461, 1152, 302);
text("The target Φ", 43, 135, 19, colors.phi, "600");
text("Two convex functions: Φ = F − G", 629, 135, 19, colors.phi, "600");
legend("F", 630, 160, colors.F); legend("G", 704, 160, colors.G);
chart([{ key: "phi", color: colors.phi }], false, 29, 169, 552, 264, 414, 198);
chart([{ key: "F", color: colors.F }, { key: "G", color: colors.G }], false, 615, 169, 552, 264, 414, 198);
text("Positive and negative curvature go into separate convex pieces", 43, 492, 19, colors.phi, "600");
legend("Φ″", 45, 518, colors.phi, true);
legend("F″ = max(Φ″, 0)", 133, 518, colors.F);
legend("G″ = max(−Φ″, 0)", 341, 518, colors.G);
chart([
  { key: "ddF", color: colors.F }, { key: "ddG", color: colors.G },
  { key: "ddphi", color: colors.phi, dashed: true, width: 1.8 }
], true, 29, 530, 1136, 225, 852, 169);
text("Exact curvature integration · F(−2) = Φ(−2), F′(−2) = Φ′(−2), G(−2) = G′(−2) = 0", 26, 798, 15, "#61727a");
const outputFlag = process.argv.indexOf("--out");
const output = outputFlag < 0 ? path.join(__dirname, "../blog/imgs/summaries/dc-programming-toland-duality.jpg") : process.argv[outputFlag + 1];
if (!output) throw Error("--out requires an output path");
const bytes = stripMetadata(canvas.encodeSync("jpeg", 90));
if (bytes.length > 1000000) throw Error("Summary image exceeds the 1 MB image limit");
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes);
console.log(JSON.stringify({
  slug: "dc-programming-toland-duality",
  path: "/blog/imgs/summaries/dc-programming-toland-duality.jpg",
  ...dimensions(bytes),
  alt: "A quadratic with cosine oscillations, its exact difference of two convex functions, and the positive and negative curvature components defining the minimal one-dimensional DC split.",
  source: "/blog/preparations/assets/dc-decomposition/index.html",
  settings: { ...settings, renderer: "shared experiment view.js, native canvas summary layout" },
  sha256: crypto.createHash("sha256").update(bytes).digest("hex")
}));
