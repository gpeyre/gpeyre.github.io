/* The same exact expectations and canvas routines as the interactive figure. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const M = require("../blog/preparations/assets/stein-operator/core.js");
const V = require("../blog/preparations/assets/stein-operator/view.js");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
let library;
if (process.env.BLOG_CANVAS_PATH) library = require(process.env.BLOG_CANVAS_PATH);
else { try { library = require("@napi-rs/canvas"); } catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); } }
const settings = { theta: 1, selected: "cubic", renderer: "shared stein-operator core.js and view.js, native canvas" };
const canvas = library.createCanvas(1200, 630); V.drawSummary(canvas.getContext("2d"), 1200, 630, M.state(settings.theta, settings.selected));
const bytes = stripMetadata(canvas.encodeSync("jpeg", 90));
if (bytes.length > 1000000) throw Error("Summary exceeds the attachment limit");
const flag = process.argv.indexOf("--out"), output = flag < 0 ? path.resolve(__dirname, "../blog/imgs/summaries/stein-operators-discrepancies.jpg") : process.argv[flag + 1];
if (!output) throw Error("--out needs a path");
fs.writeFileSync(output, bytes);
console.log(JSON.stringify({ slug: "stein-operators-discrepancies", path: "/blog/imgs/summaries/stein-operators-discrepancies.jpg", ...dimensions(bytes),
  alt: "A three-component Gaussian mixture with the same mean and variance as the dashed standard Gaussian, beside six exact Stein residuals. The constant and linear tests vanish, while higher-order and trigonometric tests detect the non-Gaussian shape.",
  source: "/blog/preparations/assets/stein-operator/index.html", settings, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }));
