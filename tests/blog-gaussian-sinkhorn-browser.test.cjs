"use strict";
// Repository previews by default; BLOG_SITE_ROOT=/path/to/safe/build or --live.
// Browser QA must not send analytics page views.
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
const article = articleSource("gaussian-sinkhorn-convergence");
const experiment = "/blog/preparations/assets/ot-lab/index.html?topic=gaussian";
const fixedAxes = { x: [-4.5, 4.5], y: [-4.5, 4.5] };
const widths = [1200, 820, 375, 320];
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

async function setRange(context, id, value) {
  await context.locator("#" + id).evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function inspect(context) {
  const state = await context.evaluate(() => GaussianSinkhornExperiment.getState());
  assert.deepEqual(state.axes, fixedAxes, "The coupling axes must not refit as controls move");
  assert.ok(Number.isSafeInteger(state.k) && state.k >= 0 && state.k <= state.horizon);
  assert.ok(Number.isSafeInteger(state.horizon) && state.horizon > 0);
  const p = state.state;
  assert.ok(p.s > 0 && p.xVariance > 0 && p.yVariance > 0);
  assert.ok(Number.isFinite(p.crossCov) && Number.isFinite(p.logMarginalError));
  close(p.yVariance, 1);
  close(state.target.xVariance, 1);
  close(state.target.yVariance, 1);
  close(p.xVariance - 1, p.relativeMarginalError, 2e-10);
  assert.ok(p.relativeMarginalError >= 0, "This initialization approaches the target from above");
  const dot = context.locator("#gs-error-dot");
  assert.equal(await dot.count(), 1);
  assert.equal(Number(await dot.getAttribute("data-k")), state.k);
  close(Number(await dot.getAttribute("data-log-error")), p.logMarginalError / Math.LN10);
  assert.ok(Number.isFinite(Number(await dot.getAttribute("cx"))));
  assert.ok(Number.isFinite(Number(await dot.getAttribute("cy"))));
  const diagnostics = await context.evaluate(() => {
    const plotNodes = [...document.querySelectorAll("#gs-coupling path,#gs-coupling polyline,#gs-error path,#gs-error polyline,#gs-error circle")];
    const invalid = plotNodes.filter(node => [...node.attributes].some(attr => /NaN|Infinity|undefined/.test(attr.value))).map(node => node.outerHTML);
    const geometry = selector => [...document.querySelectorAll(selector)].map(node => node.getAttribute("d") || node.getAttribute("points"));
    const dashed = selector => [...document.querySelectorAll(selector)].every(node => {
      const value = getComputedStyle(node).strokeDasharray;
      return value !== "none" && /[1-9]/.test(value);
    });
    return {
      width: innerWidth, scroll: document.documentElement.scrollWidth,
      marks: plotNodes.length, invalid,
      xCurrent: geometry(".gs-x-current"), xTarget: geometry(".gs-x-target"),
      yCurrent: geometry(".gs-y-current"), yTarget: geometry(".gs-y-target"),
      targetDashed: dashed(".gs-target-ellipse,.gs-x-target,.gs-y-target"),
      status: document.getElementById("status").textContent
    };
  });
  assert.ok(diagnostics.marks >= 8, "Coupling, two marginals and error trace must be drawn");
  assert.deepEqual(diagnostics.invalid, []);
  assert.ok(diagnostics.scroll <= diagnostics.width + 1, JSON.stringify(diagnostics));
  assert.ok(diagnostics.targetDashed, "The exact coupling and marginal solutions must be dashed");
  assert.ok(diagnostics.xCurrent.length && diagnostics.xTarget.length && diagnostics.yCurrent.length && diagnostics.yTarget.length);
  assert.deepEqual(diagnostics.yCurrent, diagnostics.yTarget, "The Y marginal is exactly correct after every complete cycle");
  assert.ok(diagnostics.status.length > 0 && !/Numerical error|NaN|Infinity|undefined/.test(diagnostics.status));
  return { state, diagnostics };
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
    await page.waitForFunction(() => !!window.GaussianSinkhornExperiment);
    assert.equal(await page.locator('input[type="range"]').count(), 2);
    assert.equal(await page.locator("#gs-epsilon").getAttribute("min"), "-3");
    assert.equal(await page.locator("#gs-epsilon").getAttribute("max"), "1");
    assert.equal(Number(await page.locator("#gs-cycle").getAttribute("step")), 1);
    assert.equal(await page.locator('script[src="data.js"]').count(), 0, "No unrelated trajectory data");
    for (const selector of ["#gs-coupling", "#gs-error", ".gs-current-ellipse", ".gs-target-ellipse"]) {
      assert.ok(await page.locator(selector).count() > 0, selector);
    }
    const parameterChecks = [];
    let previousTarget = null;
    for (const exponent of [-3, -1, 0, 1]) {
      await setRange(page, "gs-epsilon", exponent);
      let report = await inspect(page);
      close(report.state.epsilon, 10 ** exponent);
      const target = await page.locator(".gs-target-ellipse").first().evaluate(node => node.getAttribute("d") || node.getAttribute("points"));
      if (previousTarget) assert.notEqual(target, previousTarget, "Temperature changes the exact coupling");
      previousTarget = target;
      const horizon = report.state.horizon;
      let previousError = Infinity, initialMarginal = null, lastMarginal = null;
      for (const k of [...new Set([0, Math.floor(horizon / 2), horizon])]) {
        await setRange(page, "gs-cycle", k);
        report = await inspect(page);
        assert.equal(report.state.k, k);
        close(report.state.epsilon, 10 ** exponent);
        assert.ok(report.state.state.logMarginalError <= previousError);
        previousError = report.state.state.logMarginalError;
        const marginal = report.diagnostics.xCurrent;
        if (k === 0) initialMarginal = marginal;
        if (k === horizon) lastMarginal = marginal;
        parameterChecks.push({ epsilon: report.state.epsilon, k, horizon, error: report.state.state.relativeMarginalError });
      }
      assert.notDeepEqual(initialMarginal, lastMarginal, "The first marginal visibly converges");
      assert.ok(report.state.state.relativeMarginalError < 1e-4, "The displayed horizon reaches small marginal error");
    }

    await setRange(page, "gs-epsilon", -1);
    await page.locator("#gs-cycle").focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    assert.equal((await inspect(page)).state.k, 1);
    await page.keyboard.press("End");
    let state = (await inspect(page)).state;
    assert.equal(state.k, state.horizon);
    await page.locator("#gs-epsilon").focus();
    await page.keyboard.press("Home");
    close((await inspect(page)).state.epsilon, .001);
    await page.keyboard.press("End");
    close((await inspect(page)).state.epsilon, 10);

    await setRange(page, "gs-epsilon", -1);
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    assert.equal((await inspect(page)).state.k, 0);
    await page.getByRole("button", { name: "Play cycles", exact: true }).click();
    await page.waitForFunction(() => GaussianSinkhornExperiment.getState().k > 0);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    state = (await inspect(page)).state;
    assert.equal(state.playing, false);
    await page.waitForTimeout(150);
    assert.equal((await inspect(page)).state.k, state.k, "Pause freezes the selected cycle");
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    assert.equal((await inspect(page)).state.k, 0);

    const layouts = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 });
      await setRange(page, "gs-cycle", 2);
      const report = await inspect(page);
      layouts.push({ width, scroll: report.diagnostics.scroll });
      await page.screenshot({ path: `/private/tmp/gaussian-sinkhorn-${live ? "live-" : ""}${width}.png`, fullPage: true });
    }

    await page.setViewportSize({ width: 1200, height: 1100 });
    assert.equal((await page.goto(base + article.url)).status(), 200);
    assert.equal(await page.locator("h1").textContent(), article.title);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.gpeyre.com" + article.url);
    if (!article.published) assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,follow");
    await page.waitForFunction(() => window.MathJax?.isReady, null, { timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
    const expectedProofs = (article.body.match(/<details class="blog-proof"/g) || []).length;
    assert.ok(expectedProofs >= 4);
    assert.equal(await page.locator("details.blog-proof[open]").count(), 0);
    const iframe = page.locator('iframe[data-experiment="gaussian"]');
    await iframe.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('iframe[data-experiment="gaussian"]')?.contentWindow?.GaussianSinkhornExperiment);
    const frame = page.frames().find(item => item.url().endsWith("/ot-lab/index.html?topic=gaussian"));
    assert.ok(frame);
    await inspect(frame);
    const articleLayouts = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 });
      await page.evaluate(() => {
        document.querySelectorAll("details.blog-proof").forEach(node => { node.open = true; });
        MathJax.Hub.Queue(["Rerender", MathJax.Hub]);
      });
      await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
      await page.waitForFunction(() => {
        const element = document.querySelector('iframe[data-experiment="gaussian"]');
        return element.clientHeight >= element.contentDocument.querySelector("main").getBoundingClientRect().height - 1;
      });
      const report = await page.evaluate(() => {
        const math = MathJax.Hub.getAllJax().map(jax => jax.root.toMathML());
        const element = document.querySelector('iframe[data-experiment="gaussian"]');
        return {
          width: innerWidth, scroll: document.documentElement.scrollWidth,
          expressions: math.length, errors: math.filter(mml => /<merror\b/.test(mml)),
          fallbacks: document.querySelectorAll(".noError,.MathJax_Error").length,
          openProofs: document.querySelectorAll("details.blog-proof[open]").length,
          iframeHeight: element.clientHeight, contentHeight: element.contentDocument.querySelector("main").getBoundingClientRect().height,
          childWidth: element.contentWindow.innerWidth, childScroll: element.contentDocument.documentElement.scrollWidth
        };
      });
      assert.ok(report.expressions > 50);
      assert.deepEqual(report.errors, []); assert.equal(report.fallbacks, 0);
      assert.equal(report.openProofs, expectedProofs);
      assert.ok(report.scroll <= width + 1, JSON.stringify(report));
      assert.ok(report.childScroll <= report.childWidth + 1, JSON.stringify(report));
      await inspect(frame);
      articleLayouts.push(report);
      await iframe.screenshot({ path: `/private/tmp/gaussian-sinkhorn-embedded-${live ? "live-" : ""}${width}.png` });
    }
    const missingAnchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a => a.href));
    assert.deepEqual(missingAnchors, []);
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    console.log(JSON.stringify({ live, article: article.url, parameterChecks, layouts, articleLayouts, errors, failed }, null, 2));
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
