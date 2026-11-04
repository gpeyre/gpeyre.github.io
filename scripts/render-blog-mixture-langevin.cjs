/* Reproduce the live Gaussian-mixture density figure as a three-panel GIF.
   Usage: node scripts/render-blog-mixture-langevin.cjs --summary PATH
          --video PATH --gif PATH
   Animated exports share the same numerical arrays, physical clock and colors. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const crypto = require("node:crypto"), { spawn } = require("node:child_process"), { once } = require("node:events");
const M = require("../blog/preparations/assets/gaussian-mixture-langevin/core.js");
const V = require("../blog/preparations/assets/gaussian-mixture-langevin/view.js");
const { stripMetadata, dimensions } = require("./blog-summary-jpeg.cjs");
let library;
try { library = require(process.env.BLOG_CANVAS_PATH || "@napi-rs/canvas"); }
catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); }
const { createCanvas } = library;
function flag(name) {
  const i = process.argv.indexOf(name); if (i < 0) return null;
  if (!process.argv[i + 1] || process.argv[i + 1].startsWith("--")) throw new Error(name + " requires a destination");
  return path.resolve(process.argv[i + 1]);
}
const summary = flag("--summary"), video = flag("--video"), gif = flag("--gif");
if (!summary && !video && !gif) throw new Error("Choose --summary, --video, and/or --gif with explicit output paths");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mixture-langevin-export-"));
const moviePath = video || path.join(temporary, "comparison.mp4");
const runs = [1, 2, 3].map(k => M.run(k, 2));
const settings = { components: [1, 2, 3], spread: 2, time: 4, sigma: M.defaults.sigma,
  initialMean: M.defaults.initialMean, initialSigma: M.defaults.initialSigma,
  nx: M.defaults.nx, ny: M.defaults.ny, dt: M.defaults.dt, domain: V.domain,
  renderer: "shared gaussian-mixture-langevin core.js and view.js, native canvas comparison layout" };
const width = 1200, height = 560;
function text(ctx, label, x, y, size = 17, weight = 400, color = "#243d49") {
  ctx.font = weight + " " + size + "px sans-serif"; ctx.fillStyle = color; ctx.fillText(label, x, y);
}
function comparison(canvas, t) {
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fafbf9"; ctx.fillRect(0, 0, width, height);
  text(ctx, "LANGEVIN DIFFUSION", 30, 29, 12, 600, "#127d86");
  text(ctx, "One initial cloud. Three target geometries.", 30, 67, 30, 600);
  text(ctx, "Same narrow initial Gaussian · R = 2 · bandwidth 0.65 · same noise and clock", 31, 96, 16, 400, "#617782");
  text(ctx, "t = " + t.toFixed(2), 1037, 63, 25, 500);
  runs.forEach((result, i) => {
    const x = 10 + 397 * i, state = M.sample(result, t);
    text(ctx, "k = " + result.k, x + 37, 135, 22, 600);
    text(ctx, "KL " + V.number(state.entropy) + "   ·   TV " + state.totalVariation.toFixed(3), x + 115, 134, 14, 400, "#617782");
    const plot = createCanvas(382, 370);
    V.drawDensity(plot.getContext("2d"), plot.width, plot.height, result.grid, state.density,
      { target: result.target, centers: result.centers, createCanvas });
    ctx.drawImage(plot, x, 145);
  });
  text(ctx, "Color + white contours: moving density   ·   Dark dashes: target   ·   Crosses: component means", 47, 539, 15, 400, "#617782");
  return canvas;
}
if (summary) {
  fs.mkdirSync(path.dirname(summary), { recursive: true }); const canvas = createCanvas(width, height);
  const bytes = stripMetadata(comparison(canvas, settings.time).encodeSync("jpeg", 90));
  if (bytes.length > 1000000) throw new Error("Summary exceeds 1 MB"); fs.writeFileSync(summary, bytes);
  console.log(JSON.stringify({ slug: "logarithmic-sobolev-wasserstein-pl",
    path: "/blog/imgs/summaries/logarithmic-sobolev-wasserstein-pl.jpg", ...dimensions(bytes),
    alt: "The same narrow initial Gaussian evolves towards targets with one, two, or three Gaussian components; colored densities and white level sets are overlaid with dashed target contours on identical axes.",
    source: "/blog/preparations/assets/gaussian-mixture-langevin/index.html", settings,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex") }));
}
const ffmpeg = process.env.BLOG_FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
async function command(args) {
  const child = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });
  const [code] = await once(child, "exit"); if (code !== 0) throw new Error("Encoding failed: " + code);
}
async function animate() {
  if (!video && !gif) return;
  for (const destination of [moviePath, gif].filter(Boolean)) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) throw new Error("Refusing to overwrite animation: " + destination);
  }
  const fps = 24, seconds = 20, canvas = createCanvas(width, height);
  const encoder = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pixel_format", "rgba",
    "-video_size", width + "x" + height, "-framerate", String(fps), "-i", "pipe:0", "-an", "-c:v", "libx264",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-map_metadata", "-1", moviePath],
    { stdio: ["pipe", "inherit", "inherit"] });
  const finished = once(encoder, "exit");
  for (let i = 0; i < fps * seconds; i++) {
    const wall = i / fps, t = Math.max(0, Math.min(20, (wall - .8) * 20 / 18)); comparison(canvas, t);
    if (!encoder.stdin.write(canvas.data())) await once(encoder.stdin, "drain");
    if (i % 96 === 0) console.log("Animation " + Math.round(100 * i / (fps * seconds)) + "% · physical t=" + t.toFixed(2));
  }
  encoder.stdin.end(); const [code] = await finished; if (code !== 0) throw new Error("MP4 encoding failed: " + code);
  if (gif) {
    const palette = path.join(temporary, "palette.png");
    await command(["-i", moviePath, "-vf", "fps=12,palettegen=max_colors=128:stats_mode=diff", "-frames:v", "1", palette]);
    await command(["-i", moviePath, "-i", palette, "-filter_complex", "[0:v]fps=12[v];[v][1:v]paletteuse=dither=sierra2_4a", "-loop", "0", "-map_metadata", "-1", gif]);
  }
  console.log(JSON.stringify({ video: video || null, gif, width, height, videoFps: fps, gifFps: 12,
    duration: seconds, physicalTime: [0, 20], components: [1, 2, 3], spread: 2,
    videoBytes: fs.statSync(moviePath).size, gifBytes: gif ? fs.statSync(gif).size : null }));
}
animate().catch(error => { console.error(error); process.exitCode = 1; });
