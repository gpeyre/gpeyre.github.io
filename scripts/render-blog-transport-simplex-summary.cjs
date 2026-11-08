/* Reproduce the numerical thumbnail with the interactive figure's exact renderer. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const M = require("../blog/preparations/assets/transport-simplex/core.js");
const V = require("../blog/preparations/assets/transport-simplex/view.js");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
let library;
if (process.env.BLOG_CANVAS_PATH) library = require(process.env.BLOG_CANVAS_PATH);
else { try { library = require("@napi-rs/canvas"); } catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); } }
const { createCanvas } = library;
const settings = { vertices: M.defaults.vertices.map(p => p.slice()), target: M.defaults.b.slice(), p: 1, renderer: "shared transport-simplex core.js and view.js; exact transport affine cells and unlabeled contours, native canvas" };
const canvas = createCanvas(1200, 900), ctx = canvas.getContext("2d");
ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "#294553"; ctx.font = "600 29px sans-serif"; ctx.fillText("Transport geometry on a triangle of distributions", 40, 43);
ctx.fillStyle = "#617b85"; ctx.font = "18px sans-serif"; ctx.fillText("Power cost |x − y|ᵖ · p = 1 · equal target weights · exact transport level sets", 40, 75);
ctx.save(); ctx.translate(0, 90); V.draw(ctx, 1200, 810, { vertices: settings.vertices, b: settings.target, p: settings.p }); ctx.restore();
const at = process.argv.indexOf("--out"), output = at < 0 ? path.join(__dirname, "../blog/imgs/summaries/optimal-transport-convex-extension.jpg") : process.argv[at + 1];
if (!output) throw new Error("--out requires a path");
const bytes = stripMetadata(canvas.encodeSync("jpeg", 91)); if (bytes.length > 1000000) throw new Error("Summary exceeds 1 MB");
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes);
console.log(JSON.stringify({ slug: "optimal-transport-convex-extension", path: "/blog/imgs/summaries/optimal-transport-convex-extension.jpg", ...dimensions(bytes),
  alt: "Exact polygonal Wasserstein-1 cost contours on a three-site probability simplex, with a central equal-weight target and Euclidean distances between the triangle's vertices.",
  source: "/blog/preparations/assets/transport-simplex/index.html", settings, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }));
