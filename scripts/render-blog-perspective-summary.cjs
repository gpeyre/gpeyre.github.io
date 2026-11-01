/* Render the same analytic contours and field as the live perspective experiment. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const view = require("../blog/preparations/assets/perspective-powers/view.js");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
let library;
try { library = require(process.env.BLOG_CANVAS_PATH || "@napi-rs/canvas"); }
catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); }
const { createCanvas } = library, canvas = createCanvas(1200, 720), ctx = canvas.getContext("2d");
const settings = { p: 2, resolution: 240, point: { z: .8, r: .6 }, renderer: "shared experiment core.js and view.js, native canvas summary layout" };
ctx.fillStyle = "#f5f9f9"; ctx.fillRect(0, 0, 1200, 720);
ctx.fillStyle = "#263e48"; ctx.font = "600 27px sans-serif"; ctx.fillText("The perspective transform: a ratio becomes convex", 28, 42);
ctx.fillStyle = "#536976"; ctx.font = "18px sans-serif"; ctx.fillText("Quadratic power p = 2   ·   P(z,r) = z² / (2r)   ·   white curves are exact level sets", 29, 76);
const plot = createCanvas(1128, 550); view.draw(plot.getContext("2d"), plot.width, plot.height, settings); ctx.drawImage(plot, 35, 102);
ctx.fillStyle = "#536976"; ctx.font = "16px sans-serif"; ctx.fillText("A fixed log(1 + cost) color scale; the dashed slice r = 1 recovers the original cost.", 29, 695);
const flag = process.argv.indexOf("--out"), output = flag < 0 ? path.join(__dirname, "../blog/imgs/summaries/perspective-transform-on-measures.jpg") : process.argv[flag + 1];
if (!output) throw new Error("--out requires a path");
const bytes = stripMetadata(canvas.encodeSync("jpeg", 90)); if (bytes.length > 1000000) throw new Error("Summary exceeds 1 MB");
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes);
console.log(JSON.stringify({ slug: "perspective-transform-on-measures", path: "/blog/imgs/summaries/perspective-transform-on-measures.jpg", ...dimensions(bytes),
  alt: "Colored level sets of the quadratic perspective z squared over twice the mass, with exact white contours and the dashed unit-mass slice recovering the original function.",
  source: "/blog/preparations/assets/perspective-powers/index.html", settings, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }));
