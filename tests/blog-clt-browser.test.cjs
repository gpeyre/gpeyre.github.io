"use strict";
// Repository source by default; BLOG_SITE_ROOT=/path/to/safe/build or --live.
// No analytics requests are sent during browser verification.
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
const article = articleSource("central-limit-wasserstein-constants");
const experiment = "/blog/preparations/assets/ot-lab/index.html?topic=clt";
const fixedAxes = { x: [-4.5, 4.5], y: [0, .45] };
const widths = [1200, 820, 375, 320];
const expectedN = [1, 2, 3, 4, 5, 6, 7, 9, 11, 14, 17, 21, 27, 33, 41, 52, 64, 80, 100, 124, 154, 192];
const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };
const sum = values => values.reduce((a, b) => a + b, 0);

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

async function setIndex(context, index) {
  await context.locator("#clt-n").evaluate((input, value) => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, index);
  await context.waitForFunction(n => window.CLTExperiment?.getState().n === n, expectedN[index]);
}

async function inspect(context) {
  const state = await context.evaluate(() => CLTExperiment.getState());
  assert.deepEqual(state.axes, fixedAxes, "The two distribution panels must keep fixed scales");
  assert.ok(expectedN.includes(state.n));
  for (const key of ["bernoulli", "uniform"]) {
    const bars = state[key].bars;
    assert.ok(Array.isArray(bars) && bars.length > 1, key);
    for (const bar of bars) {
      for (const property of ["left", "right", "center", "mass", "height"]) assert.ok(Number.isFinite(bar[property]), key + ": " + property);
      assert.ok(bar.right > bar.left && bar.mass >= 0 && bar.height >= 0);
      close(bar.height * (bar.right - bar.left), bar.mass);
      close((bar.left + bar.right) / 2, bar.center);
      assert.ok(bar.height <= fixedAxes.y[1] + 1e-12, "The fixed density scale must contain every bar");
    }
    const mass = sum(bars.map(bar => bar.mass));
    assert.ok(mass > .9999 && mass <= 1 + 1e-12, key + " probability mass");
  }
  const coin = state.bernoulli.bars;
  assert.equal(coin.length, state.n + 1, "Keep all exact binomial masses in the numerical state");
  close(sum(coin.map(bar => bar.mass)), 1);
  close(sum(coin.map(bar => bar.mass * bar.center)), 0);
  close(sum(coin.map(bar => bar.mass * bar.center ** 2)), 1);
  for (const bar of coin) close(bar.right - bar.left, 2 / Math.sqrt(state.n));
  const diagnostics = await context.evaluate(() => {
    const density = id => {
      const svg = document.getElementById(id), gaussian = svg.querySelector(".clt-gaussian");
      return {
        bars: [...svg.querySelectorAll(".clt-bar")].map(node => ({
          left: +node.dataset.left, right: +node.dataset.right, center: +node.dataset.center,
          mass: +node.dataset.mass, height: +node.dataset.height,
          widthPixels: +node.getAttribute("width"), heightPixels: +node.getAttribute("height"),
          color: getComputedStyle(node).fill
        })),
        gaussian: gaussian && (gaussian.getAttribute("d") || gaussian.getAttribute("points")),
        dash: gaussian && getComputedStyle(gaussian).strokeDasharray,
        clip: [...svg.querySelectorAll("[clip-path]")].map(node => node.getAttribute("clip-path")),
        clipDefinitions: svg.querySelectorAll("clipPath").length,
        viewBox: svg.getAttribute("viewBox")
      };
    };
    const nodes = [...document.querySelectorAll("#plots svg rect,#plots svg path,#plots svg polyline,#plots svg circle")];
    return {
      width: innerWidth, scroll: document.documentElement.scrollWidth,
      panels: document.querySelectorAll("#plots .plot").length,
      invalid: nodes.filter(node => [...node.attributes].some(attr => /NaN|Infinity|undefined/.test(attr.value))).map(node => node.outerHTML),
      bernoulli: density("clt-bernoulli"), uniform: density("clt-uniform"),
      status: document.getElementById("status").textContent
    };
  });
  assert.equal(diagnostics.panels, 4);
  assert.deepEqual(diagnostics.invalid, []);
  assert.ok(diagnostics.scroll <= diagnostics.width + 1, JSON.stringify(diagnostics));
  for (const [key, color] of [["bernoulli", "rgb(38, 115, 181)"], ["uniform", "rgb(199, 75, 69)"]]) {
    const pane = diagnostics[key];
    assert.ok(pane.bars.length > 1 && pane.gaussian);
    assert.ok(pane.dash !== "none" && /[1-9]/.test(pane.dash), "The Gaussian comparison must be dashed");
    assert.ok(pane.clipDefinitions > 0 && pane.clip.length > 0, "Bars must be clipped to the fixed plotting window");
    for (const bar of pane.bars) {
      close(bar.height * (bar.right - bar.left), bar.mass);
      assert.ok(bar.widthPixels > 0 && bar.heightPixels >= 0);
      assert.equal(bar.color, color);
      const source = state[key].bars.find(item => Math.abs(item.center - bar.center) < 1e-10);
      assert.ok(source, "The plotted bar must come from the distribution data");
      close(bar.mass, source.mass);
      close(bar.height, source.height);
    }
  }
  assert.equal(diagnostics.bernoulli.viewBox, diagnostics.uniform.viewBox);
  assert.equal(diagnostics.bernoulli.gaussian, diagnostics.uniform.gaussian, "Both panels share one Gaussian reference and the same scales");
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
    await page.waitForFunction(() => !!window.CLTExperiment);
    assert.equal(await page.locator('input[type="range"]').count(), 1);
    assert.equal(Number(await page.locator("#clt-n").getAttribute("min")), 0);
    assert.equal(Number(await page.locator("#clt-n").getAttribute("max")), expectedN.length - 1);
    assert.equal(Number(await page.locator("#clt-n").getAttribute("step")), 1);
    for (const selector of ["#clt-bernoulli", "#clt-uniform", "#clt-rates", "#clt-errors"]) assert.equal(await page.locator(selector).count(), 1);
    const parameterChecks = [];
    let gaussian;
    for (let index = 0; index < expectedN.length; index++) {
      const before = performance.now();
      await setIndex(page, index);
      const report = await inspect(page);
      assert.equal(report.state.n, expectedN[index]);
      if (gaussian) assert.equal(report.diagnostics.bernoulli.gaussian, gaussian, "The Gaussian reference must not refit as n changes");
      gaussian = report.diagnostics.bernoulli.gaussian;
      parameterChecks.push({ n: report.state.n, bernoulliBars: report.state.bernoulli.bars.length,
        uniformMass: sum(report.state.uniform.bars.map(bar => bar.mass)), elapsedMs: Math.round(performance.now() - before) });
    }
    await page.locator("#clt-n").focus();
    await page.keyboard.press("Home");
    assert.equal((await inspect(page)).state.n, 1);
    await page.keyboard.press("ArrowRight");
    assert.equal((await inspect(page)).state.n, 2);
    await page.keyboard.press("End");
    assert.equal((await inspect(page)).state.n, 192);
    const layouts = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 });
      await setIndex(page, expectedN.indexOf(9));
      const report = await inspect(page);
      layouts.push({ width, scroll: report.diagnostics.scroll });
      await page.screenshot({ path: `/private/tmp/clt-${live ? "live-" : ""}${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1200, height: 1100 });
    assert.equal((await page.goto(base + article.url)).status(), 200);
    assert.equal(await page.locator("h1").textContent(), article.title);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.gpeyre.com" + article.url);
    if (!article.published) assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,follow");
    await page.waitForFunction(() => window.MathJax?.isReady, null, { timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
    const expectedProofs = (article.body.match(/<details class="blog-proof"/g) || []).length;
    assert.ok(expectedProofs >= 2);
    assert.equal(await page.locator("details.blog-proof[open]").count(), 0);
    const iframe = page.locator('iframe[data-experiment="clt"]');
    await iframe.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('iframe[data-experiment="clt"]')?.contentWindow?.CLTExperiment);
    const frame = page.frames().find(item => item.url().endsWith("/ot-lab/index.html?topic=clt"));
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
        const element = document.querySelector('iframe[data-experiment="clt"]');
        return element.clientHeight >= element.contentDocument.querySelector("main").getBoundingClientRect().height - 1;
      });
      const report = await page.evaluate(() => {
        const math = MathJax.Hub.getAllJax().map(jax => jax.root.toMathML());
        const element = document.querySelector('iframe[data-experiment="clt"]');
        return {
          width: innerWidth, scroll: document.documentElement.scrollWidth,
          expressions: math.length, errors: math.filter(mml => /<merror\b/.test(mml)),
          fallbacks: document.querySelectorAll(".noError,.MathJax_Error").length,
          openProofs: document.querySelectorAll("details.blog-proof[open]").length,
          iframeHeight: element.clientHeight, contentHeight: element.contentDocument.querySelector("main").getBoundingClientRect().height,
          childWidth: element.contentWindow.innerWidth, childScroll: element.contentDocument.documentElement.scrollWidth
        };
      });
      assert.ok(report.expressions > 30);
      assert.deepEqual(report.errors, []); assert.equal(report.fallbacks, 0);
      assert.equal(report.openProofs, expectedProofs);
      assert.ok(report.scroll <= width + 1, JSON.stringify(report));
      assert.ok(report.childScroll <= report.childWidth + 1, JSON.stringify(report));
      await inspect(frame);
      articleLayouts.push(report);
      await iframe.screenshot({ path: `/private/tmp/clt-embedded-${live ? "live-" : ""}${width}.png` });
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
