"use strict";
// Repository source by default; BLOG_SITE_ROOT=/path/to/safe/build or --live.
// Browser checks block analytics and never change the publication queue.
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const { articleSource } = require("./blog-article-source.js");
let playwright;
if (process.env.BLOG_PLAYWRIGHT_PATH) playwright = require(process.env.BLOG_PLAYWRIGHT_PATH);
else {
  try { playwright = require("playwright"); }
  catch (_) { playwright = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"); }
}
const root = path.resolve(process.env.BLOG_SITE_ROOT || path.join(__dirname, ".."));
const live = process.argv.includes("--live");
const article = articleSource("doubly-nonnegative-completely-positive");
const experiment = "/blog/preparations/assets/kernel-sketches/index.html";
const widths = [1200, 900, 375, 320], names = ["exact", "positive", "fourier"];
const domain = [-2, 2], colorRange = [-2, 2];
const levels = [-1, -.5, -.25, 0, .25, .5, .75, 1, 1.5];
const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(actual), Math.abs(expected)), `${actual} != ${expected}`);
}
function serverFor(directory) {
  return http.createServer((request, response) => {
    let file;
    try { file = path.resolve(directory, "." + decodeURIComponent(new URL(request.url, "http://localhost").pathname)); }
    catch (_) { response.writeHead(400); response.end(); return; }
    if (!file.startsWith(directory + path.sep) || !["GET", "HEAD"].includes(request.method)) {
      response.writeHead(403); response.end(); return;
    }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.realpathSync(file).startsWith(directory + path.sep)) throw Error("Outside test root");
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      response.end(request.method === "HEAD" ? undefined : fs.readFileSync(file));
    } catch (_) { response.writeHead(404); response.end(); }
  });
}
async function ready(context, p, r) {
  await context.waitForFunction(({ p, r }) => {
    const s = window.KernelSketchesApp?.getState();
    return s?.ready && !s.busy && Math.abs(s.p - p) < 1e-10 && s.r === r;
  }, { p, r }, { timeout: 60000 });
}
async function setControls(context, p, r) {
  await context.evaluate(({ p, r }) => {
    for (const [id, value] of [["power", p], ["sketches", Math.log2(r)]]) {
      const input = document.getElementById(id); input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, { p, r });
  await ready(context, p, r);
}
async function inspect(context) {
  const report = await context.evaluate(() => {
    const state = KernelSketchesApp.getState(), data = KernelSketchesApp.getData();
    const result = {
      state, levels: KernelSketchesView.levels, displayed: KernelSketchesApp.getDisplayedState(),
      width: innerWidth, scroll: document.documentElement.scrollWidth,
      status: document.getElementById("status").textContent,
      saturation: document.getElementById("saturation").textContent,
      data: data && { p: data.p, r: data.r, size: data.size, x0: data.xs[0], x1: data.xs[data.size - 1] },
      grids: {}, canvases: {}
    };
    if (!data) return result;
    for (const name of ["exact", "positive", "fourier"]) {
      const grid = data[name], size = data.size;
      let minimum = Infinity, maximum = -Infinity, square = 0, negative = 0, saturated = 0;
      let symmetry = 0, exactError = 0, finite = true;
      for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
        const index = row * size + col, value = grid[index];
        finite = finite && Number.isFinite(value);
        minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
        square += (value - data.exact[index]) ** 2;
        if (value < 0) negative++;
        if (value < -2 || value > 2) saturated++;
        symmetry = Math.max(symmetry, Math.abs(value - grid[col * size + row]));
        if (name === "exact") exactError = Math.max(exactError, Math.abs(value - Math.exp(-(Math.abs(data.xs[col] - data.xs[row]) ** data.p))));
      }
      // Hash the unmodified floating-point grid, not the clipped color image.
      const bytes = new Uint8Array(grid.buffer, grid.byteOffset, grid.byteLength);
      let hash = 2166136261;
      for (const byte of bytes) { hash ^= byte; hash = Math.imul(hash, 16777619); }
      const quadratics = [];
      const ids = [0, 12, 31, 47, 64, 79, 96, 115, size - 1].filter(id => id < size);
      for (let trial = 1; trial <= 7; trial++) {
        const v = ids.map((_, i) => Math.sin((i + 1) * trial * 1.137));
        let q = 0, scale = 0;
        for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
          const term = v[i] * v[j] * grid[ids[i] * size + ids[j]];
          q += term; scale += Math.abs(term);
        }
        quadratics.push({ q, scale });
      }
      result.grids[name] = { length: grid.length, finite, minimum, maximum, symmetry, exactError,
        rmse: Math.sqrt(square / grid.length), negativeFraction: negative / grid.length,
        saturatedFraction: saturated / grid.length, hash: hash >>> 0, quadratics };
      const canvas = document.getElementById("plot-" + name), box = canvas.getBoundingClientRect();
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      for (let i = 0; i < pixels.length; i += 4 * 17) if (pixels[i + 3]) colors.add(pixels[i] + "," + pixels[i + 1] + "," + pixels[i + 2]);
      result.canvases[name] = { width: box.width, height: box.height, colors: colors.size,
        label: canvas.getAttribute("aria-label"), stats: document.getElementById("stats-" + name).textContent };
    }
    return result;
  });
  assert.equal(report.state.ready, true); assert.equal(report.state.busy, false);
  assert.deepEqual(report.state.domain, domain); assert.deepEqual(report.state.colorRange, colorRange);
  assert.deepEqual(report.levels, levels, "All contours must use fixed common levels");
  assert.ok(report.data && report.data.size >= 65);
  close(report.data.x0, -2); close(report.data.x1, 2);
  close(report.data.p, report.state.p); assert.equal(report.data.r, report.state.r);
  close(report.displayed.p, report.state.p); assert.equal(report.displayed.r, report.state.r);
  assert.ok(report.scroll <= report.width + 1, JSON.stringify(report));
  for (const name of names) {
    const grid = report.grids[name], stats = report.state.stats[name], canvas = report.canvases[name];
    assert.equal(grid.length, report.data.size ** 2); assert.equal(grid.finite, true);
    close(grid.symmetry, 0); close(grid.minimum, stats.min); close(grid.maximum, stats.max);
    close(grid.rmse, stats.rmse); close(grid.negativeFraction, stats.negativeFraction);
    close(grid.saturatedFraction, stats.saturatedFraction);
    for (const { q, scale } of grid.quadratics) assert.ok(q >= -1e-10 * Math.max(1, scale), name + " Gram quadratic must be nonnegative");
    assert.ok(canvas.width > 100 && canvas.height > 100 && canvas.colors > 10, name + " canvas must be painted");
    assert.ok(canvas.label && canvas.stats && !/NaN|undefined|Infinity/.test(canvas.stats));
  }
  close(report.grids.exact.exactError, 0);
  assert.ok(report.grids.positive.minimum >= 0, "Positive features must preserve entrywise nonnegativity");
  assert.equal(report.grids.positive.negativeFraction, 0);
  assert.ok(report.grids.fourier.minimum >= -2 - 1e-12 && report.grids.fourier.maximum <= 2 + 1e-12);
  if (names.some(name => report.grids[name].saturatedFraction > 0)) {
    assert.match(report.saturation, /saturation/i, "Values beyond the fixed color scale must be reported");
    assert.match(report.saturation, /unclipped/i, "Saturation must not change numerical diagnostics");
  }
  assert.ok(report.status && !/failed|NaN|undefined|Infinity/i.test(report.status));
  return report;
}

async function main() {
  let browser, server;
  try {
    let base = "https://www.gpeyre.com";
    if (!live) {
      server = serverFor(root);
      await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
      base = "http://127.0.0.1:" + server.address().port;
    }
    browser = await playwright.chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 1100 }, reducedMotion: "reduce" });
    await page.route("**/js/site-analytics.js", route => route.fulfill({ contentType: "application/javascript", body: "" }));
    const errors = [], failed = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("response", response => { if (response.status() >= 400 && response.url().startsWith(base)) failed.push([response.status(), response.url()]); });
    assert.equal((await page.goto(base + experiment)).status(), 200);
    await ready(page, 1, 64);
    assert.equal(await page.locator('input[type="range"]').count(), 2);
    assert.equal(Number(await page.locator("#power").getAttribute("min")), .5);
    assert.equal(Number(await page.locator("#power").getAttribute("max")), 2);
    assert.equal(Number(await page.locator("#sketches").getAttribute("min")), 0);
    assert.equal(Number(await page.locator("#sketches").getAttribute("max")), 11);
    const initial = await inspect(page);
    assert.ok(initial.grids.fourier.minimum < 0, "The default Fourier sketch must retain its negative entries");
    const parameterChecks = [];
    for (const [p, r] of [[.5, 1], [.5, 2048], [1, 8], [1.5, 64], [2, 1], [2, 2048]]) {
      const start = performance.now(); await setControls(page, p, r);
      const report = await inspect(page);
      parameterChecks.push({ p, r, elapsedMs: Math.round(performance.now() - start), stats: report.state.stats });
    }
    await setControls(page, 1, 64);
    const again = await inspect(page);
    for (const name of names) assert.equal(again.grids[name].hash, initial.grids[name].hash, "Returning to a control state must reuse the same random draws");

    // Requests superseded during a costly worker computation must not repaint
    // stale data under the newly selected parameter labels.
    const transient = await page.evaluate(() => {
      for (const [p, exponent] of [[.5, 11], [2, 10], [.75, 9], [1.25, 3]]) {
        for (const [id, value] of [["power", p], ["sketches", exponent]]) {
          const input = document.getElementById(id); input.value = String(value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      const state = KernelSketchesApp.getState();
      return { state, hasData: !!KernelSketchesApp.getData(), displayed: KernelSketchesApp.getDisplayedState() };
    });
    assert.equal(transient.state.busy, true); assert.equal(transient.state.ready, false);
    assert.equal(transient.hasData, false); assert.equal(transient.displayed, null);
    await ready(page, 1.25, 8); await inspect(page);
    await page.waitForTimeout(250);
    close((await inspect(page)).state.p, 1.25);
    await page.locator("#power").focus(); await page.keyboard.press("Home"); await ready(page, .5, 8);
    await page.keyboard.press("End"); await ready(page, 2, 8);
    await page.locator("#sketches").focus(); await page.keyboard.press("Home"); await ready(page, 2, 1);
    await page.keyboard.press("ArrowRight"); await ready(page, 2, 2);

    const layouts = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 }); await setControls(page, 1, 64);
      const report = await inspect(page); layouts.push({ width, scroll: report.scroll });
      await page.screenshot({ path: `/private/tmp/kernel-sketches-${live ? "live-" : ""}${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1200, height: 1100 });
    assert.equal((await page.goto(base + article.url)).status(), 200);
    assert.equal(await page.locator("h1").textContent(), article.title);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.gpeyre.com" + article.url);
    if (!article.published) assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,follow");
    await page.waitForFunction(() => window.MathJax?.isReady, null, { timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
    const expectedProofs = (article.body.match(/<details class="blog-proof"/g) || []).length;
    assert.ok(expectedProofs >= 4); assert.equal(await page.locator("details.blog-proof[open]").count(), 0);
    const iframe = page.locator('iframe[data-experiment="kernel-sketches"]');
    await iframe.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('iframe[data-experiment="kernel-sketches"]')?.contentWindow?.KernelSketchesApp);
    const frame = page.frames().find(item => item.url().endsWith(experiment)); assert.ok(frame);
    await ready(frame, 1, 64); await inspect(frame);
    const articleLayouts = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 });
      await page.evaluate(() => {
        document.querySelectorAll("details.blog-proof").forEach(node => { node.open = true; });
        MathJax.Hub.Queue(["Rerender", MathJax.Hub]);
      });
      await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
      await page.waitForFunction(() => {
        const element = document.querySelector('iframe[data-experiment="kernel-sketches"]');
        return element.clientHeight >= element.contentDocument.querySelector("main").getBoundingClientRect().height - 1;
      });
      const report = await page.evaluate(() => {
        const math = MathJax.Hub.getAllJax().map(jax => jax.root.toMathML());
        const element = document.querySelector('iframe[data-experiment="kernel-sketches"]');
        return { width: innerWidth, scroll: document.documentElement.scrollWidth,
          expressions: math.length, errors: math.filter(mml => /<merror\b/.test(mml)),
          fallbacks: document.querySelectorAll(".noError,.MathJax_Error").length,
          openProofs: document.querySelectorAll("details.blog-proof[open]").length,
          iframeHeight: element.clientHeight, contentHeight: element.contentDocument.querySelector("main").getBoundingClientRect().height,
          childWidth: element.contentWindow.innerWidth, childScroll: element.contentDocument.documentElement.scrollWidth };
      });
      assert.ok(report.expressions > 30); assert.deepEqual(report.errors, []); assert.equal(report.fallbacks, 0);
      assert.equal(report.openProofs, expectedProofs); assert.ok(report.scroll <= width + 1, JSON.stringify(report));
      assert.ok(report.childScroll <= report.childWidth + 1, JSON.stringify(report));
      await inspect(frame); articleLayouts.push(report);
      await iframe.screenshot({ path: `/private/tmp/kernel-sketches-embedded-${live ? "live-" : ""}${width}.png` });
    }
    const missingAnchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a => a.href));
    assert.deepEqual(missingAnchors, []); assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    console.log(JSON.stringify({ live, article: article.url, parameterChecks, layouts, articleLayouts, errors, failed }, null, 2));
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
