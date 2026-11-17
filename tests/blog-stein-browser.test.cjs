"use strict";
// Run against repository sources, BLOG_SITE_ROOT=/path/to/safe/build, or --live.
// Analytics is intercepted: browser QA must never send real page views.
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
const live = process.argv.includes("--live"), article = articleSource("stein-operators-discrepancies");
const title = "Stein operators and probability discrepancies";
const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };
function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
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
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      response.end(request.method === "HEAD" ? undefined : fs.readFileSync(file));
    } catch (_) { response.writeHead(404); response.end(); }
  });
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
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, reducedMotion: "reduce" });
    await page.route("**/js/site-analytics.js", route => route.fulfill({ contentType: "application/javascript", body: "" }));
    const errors = [], failed = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("response", response => { if (response.status() >= 400 && response.url().startsWith(base)) failed.push([response.status(), response.url()]); });
    assert.equal((await page.goto(base + article.url)).status(), 200);
    assert.equal(await page.locator("h1").textContent(), title);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.gpeyre.com" + article.url);
    if (!article.published) assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,follow");
    assert.ok(await page.evaluate(() => {
      const identity = document.getElementById("gaussian-identity"), experiment = document.getElementById("experiment"), theorem = document.getElementById("gaussian-characterization");
      return !!(identity.compareDocumentPosition(experiment) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(experiment.compareDocumentPosition(theorem) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), "The experiment must immediately follow the initial Gaussian explanation");
    await page.waitForFunction(() => window.MathJax?.Hub?.getAllJax().length > 0, null, { timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
    const iframe = page.locator('iframe[data-experiment="stein"]');
    await iframe.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('iframe[data-experiment="stein"]')?.contentWindow?.SteinOperatorApp);
    const frame = page.frames().find(item => item.url().includes("/stein-operator/index.html"));
    assert.ok(frame);
    await frame.waitForFunction(() => !!window.SteinOperatorApp);
    assert.equal(await frame.locator('input[type="range"]').count(), 2);
    assert.equal(await frame.locator('input[type="radio"]').count(), 0, "No obsolete selected-function control");
    const initial = await frame.evaluate(() => SteinOperatorApp.getState());
    assert.equal(initial.rows.length, 6);
    const initialScales = initial.rows.map(row => row.scale);
    assert.ok(initialScales.every(scale => Number.isFinite(scale) && scale > 0));
    assert.equal(await frame.locator("#function").count(), 0, "The old full-size function panel is removed");
    const layouts = [];
    for (const width of [1200, 375, 320, 300]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => {
        document.querySelectorAll("details.blog-proof").forEach(node => { node.open = true; });
        MathJax.Hub.Queue(["Rerender", MathJax.Hub]);
      });
      await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
      await page.waitForTimeout(200);
      const report = await page.evaluate(() => {
        const math = MathJax.Hub.getAllJax().map(jax => ({ source: jax.originalText, mml: jax.root.toMathML() }));
        const element = document.querySelector('iframe[data-experiment="stein"]'), child = element.contentDocument;
        return {
          width: innerWidth, scroll: document.documentElement.scrollWidth,
          expressions: math.length, display: document.querySelectorAll('script[type="math/tex; mode=display"]').length,
          errors: math.filter(item => /<merror\b/.test(item.mml)), fallbacks: document.querySelectorAll(".noError,.MathJax_Error").length,
          proofs: document.querySelectorAll("details.blog-proof[open]").length, references: document.querySelectorAll("ol.references > li").length,
          iframeHeight: element.clientHeight, contentHeight: child.querySelector("main").getBoundingClientRect().height,
          childWidth: element.contentWindow.innerWidth, childScroll: child.documentElement.scrollWidth,
          portraits: [...document.querySelectorAll("article img")].map(image => ({ complete: image.complete, width: image.naturalWidth }))
        };
      });
      assert.deepEqual(report.errors, []); assert.equal(report.fallbacks, 0);
      assert.ok(report.expressions > 100); assert.equal(report.proofs, 5); assert.equal(report.references, 7);
      assert.ok(report.scroll <= width + 1, JSON.stringify(report));
      assert.ok(report.childScroll <= report.childWidth + 1, JSON.stringify(report));
      assert.ok(report.iframeHeight >= report.contentHeight - 1, JSON.stringify(report));
      assert.ok(report.portraits.every(image => image.complete && image.width > 0));
      const canvases = await frame.locator("canvas").evaluateAll(nodes => nodes.map(canvas => {
        const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let colored = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 0 && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 210) colored++;
        return { id: canvas.id, width: canvas.width, height: canvas.height, colored };
      }));
      assert.equal(canvases.length, 2, "One density canvas and one histogram canvas");
      assert.ok(canvases.every(canvas => canvas.width > 0 && canvas.height > 0 && canvas.colored > 100), JSON.stringify(canvases));
      const histogram = await frame.evaluate(() => {
        const visible = document.getElementById("residuals"), canvas = document.createElement("canvas");
        canvas.width = visible.clientWidth; canvas.height = visible.clientHeight;
        return SteinOperatorView.drawHistogram(canvas.getContext("2d"), canvas.width, canvas.height, SteinOperatorApp.getState());
      });
      close(histogram.zeroY, (histogram.top + histogram.bottom) / 2);
      assert.equal(histogram.bars.length, 6, "All six tests have bars and function sketches");
      for (const bar of histogram.bars) {
        close(bar.normalized, bar.raw / bar.scale);
        assert.ok(bar.sketch.width > 0 && bar.sketch.height > 0);
        assert.ok(bar.sketch.left >= 0 && bar.sketch.top > histogram.bottom);
      }
      report.histogramZeroCentered = true; report.functionSketches = histogram.bars.length;
      layouts.push(report);
      await iframe.screenshot({ path: `/private/tmp/stein-revised-${live ? "live-" : ""}${width}.png` });
    }
    async function stateAt(theta, position) {
      await frame.evaluate(({ theta, position }) => {
        for (const [id, value] of [["deformation", theta], ["position", position]]) {
          const input = document.getElementById(id); input.value = String(value); input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, { theta, position });
      return frame.evaluate(() => SteinOperatorApp.getState());
    }
    const densityBefore = await frame.locator("#density").evaluate(canvas => canvas.toDataURL());
    const barsBefore = await frame.locator("#residuals").evaluate(canvas => canvas.toDataURL());
    const controls = [];
    for (const theta of [-1, -.4, 0, .4, 1]) for (const position of [-1, 0, 1]) {
      const state = await stateAt(theta, position);
      close(state.theta, theta); close(state.position, position); close(state.shift, 1.5 * position);
      close(state.mean, state.shift); close(state.sigma, 1 - .75 * Math.abs(theta));
      assert.deepEqual(state.rows.map(row => row.scale), initialScales, "Per-test scales must stay fixed");
      for (const row of state.rows) assert.ok(Number.isFinite(row.residual) && Math.abs(row.residual / row.scale) <= 1.01);
      close(state.rows[0].residual, -state.mean);
      close(state.rows[1].residual, 1 - state.secondMoment);
      controls.push([theta, position, state.rows.map(row => row.residual)]);
    }
    assert.notEqual(await frame.locator("#density").evaluate(canvas => canvas.toDataURL()), densityBefore, "Moving controls must redraw density");
    assert.notEqual(await frame.locator("#residuals").evaluate(canvas => canvas.toDataURL()), barsBefore, "Moving controls must redraw residual bars");
    assert.ok(controls.some(item => item[2].some(value => value > .1)) && controls.some(item => item[2].some(value => value < -.1)), "Both positive and negative residuals are exercised");
    const shifted = await stateAt(0, 1);
    assert.ok(shifted.rows.some(row => Math.abs(row.residual) > .1), "A shifted Gaussian is not the standard Gaussian");
    shifted.means.forEach(mean => close(mean, 1.5));
    await frame.locator("#reset").click();
    const reset = await frame.evaluate(() => SteinOperatorApp.getState());
    close(reset.theta, 0); close(reset.position, 0);
    assert.ok(reset.rows.every(row => row.residual === 0), "Both centered controls recover exact zero residuals");
    for (const [id, key, other] of [["deformation", "theta", "position"], ["position", "position", "theta"]]) {
      await frame.locator("#reset").click(); await frame.locator("#" + id).focus();
      await page.keyboard.press("End"); let state = await frame.evaluate(() => SteinOperatorApp.getState()); close(state[key], 1); close(state[other], 0);
      await page.keyboard.press("Home"); state = await frame.evaluate(() => SteinOperatorApp.getState()); close(state[key], -1); close(state[other], 0);
      await page.keyboard.press("ArrowRight"); state = await frame.evaluate(() => SteinOperatorApp.getState()); assert.ok(state[key] > -1 && state[key] < 0);
    }
    await frame.evaluate(() => document.querySelectorAll("details").forEach(node => { node.open = true; }));
    await page.waitForTimeout(200);
    assert.equal(await frame.locator("#test-rows tr").count(), 6);
    const expanded = await page.evaluate(() => {
      const element = document.querySelector('iframe[data-experiment="stein"]');
      return { actual: element.clientHeight, required: element.contentDocument.querySelector("main").getBoundingClientRect().height };
    });
    assert.ok(expanded.actual >= expanded.required - 1, JSON.stringify(expanded));
    const missingAnchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a => a.href));
    assert.deepEqual(missingAnchors, []);
    assert.equal((await page.request.get(base + "/blog/imgs/charles-stein-LICENSE.txt")).status(), 200);
    const summary = await page.request.get(base + "/blog/imgs/summaries/stein-operators-discrepancies.jpg");
    assert.equal(summary.status(), 200);
    if (!article.published) {
      const index = await page.request.get(base + "/blog/preparations/"); assert.equal(index.status(), 200);
      assert.match(await index.text(), /href="stein-operators-discrepancies\.html"/);
      assert.match(await index.text(), /stein-operators-discrepancies\.jpg/);
    }
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    console.log(JSON.stringify({ live, article: article.url, layouts, parameterStates: controls.length, fixedScales: initialScales, expanded, summaryBytes: (await summary.body()).length, errors, failed }, null, 2));
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
