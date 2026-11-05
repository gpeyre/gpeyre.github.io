/* Reuse the numerical experiment's actual coupling, flow and canvas renderer. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const M = require("../blog/preparations/assets/orthostochastic-ot/core.js");
const V = require("../blog/preparations/assets/orthostochastic-ot/view.js");
const {stripMetadata, dimensions} = require("./blog-summary-jpeg.cjs");
let library;
if (process.env.BLOG_CANVAS_PATH) library = require(process.env.BLOG_CANVAS_PATH);
else {
  try { library = require("@napi-rs/canvas"); }
  catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); }
}
const settings = {n:12, motion:0.35, tMax:30, snapshotCount:121, maxStep:0.02,
  preset:"clouds", snapshotIndex:6,
  renderer:"shared orthostochastic-ot core.js and view.js, native canvas"};
const result = M.run(settings), canvas = library.createCanvas(1200,590);
V.draw(canvas.getContext("2d"),1200,590,result,settings.snapshotIndex);
const bytes = stripMetadata(canvas.encodeSync("jpeg",90));
if (bytes.length > 1000000) throw Error("Summary exceeds the attachment limit");
const flag = process.argv.indexOf("--out"), output = flag < 0
  ? path.resolve(__dirname,"../blog/imgs/summaries/orthostochastic-matrices.jpg") : process.argv[flag+1];
if (!output) throw Error("--out needs a path");
fs.writeFileSync(output,bytes);
console.log(JSON.stringify({slug:"orthostochastic-matrices", path:"/blog/imgs/summaries/orthostochastic-matrices.jpg",
  ...dimensions(bytes),
  alt:"An orthostochastic coupling between two irregular point clouds, with the exact assignment dashed; the matching transport-energy trajectory is compared with the dashed Kantorovich optimum.",
  source:"/blog/preparations/assets/orthostochastic-ot/index.html", settings,
  sha256:crypto.createHash("sha256").update(bytes).digest("hex")}));
