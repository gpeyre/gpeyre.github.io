/* BLOG_PREVIEW_URL=http://127.0.0.1:4192 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-heat-quantiles-browser.test.js */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");
const base = process.env.BLOG_PREVIEW_URL || "http://127.0.0.1:4192";
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } }), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/blog/preparations/heat-equation-over-quantiles.html");
    await page.waitForFunction(() => window.MathJax?.isReady);
    await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
    assert.equal(await page.locator(".MathJax_Error,.merror").count(), 0);
    assert.ok(await page.locator("details.blog-proof").count() >= 4);
    assert.equal(await page.locator("details.blog-proof[open]").count(), 0, "proofs start folded");
    await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => node.open = true));
    await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
    assert.equal(await page.locator(".MathJax_Error,.merror").count(), 0, "unfolded proofs render their maths");
    await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => node.open = false));
    const iframe = page.locator("iframe.idea-experiment");
    await iframe.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("iframe").dataset.ready === "true");
    const frame = await (await iframe.elementHandle()).contentFrame();
    await frame.waitForFunction(() => window.HeatQuantilesApp?.getState().n === 40);
    const snapshot = () => frame.evaluate(() => HeatQuantilesApp.getState());
    const control = async (id, value) => frame.locator("#" + id).evaluate((node, input) => {
      node.value = input; node.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    let state = await snapshot();
    assert.equal(state.playing, false, "playback must start paused");
    assert.equal(state.time, 0);
    assert.equal(state.trajectorySamples, 121);
    for (const t of [0, .3, 1, 2]) {
      await control("time", t);
      state = await snapshot();
      assert.equal(state.time, t);
      assert.ok(state.positions.every(Number.isFinite));
      assert.ok(state.positions.every((q, i) => !i || q > state.positions[i - 1]), "quantile order is preserved");
      assert.equal(+(await frame.locator("#increase-value").textContent()), 2 * t);
    }
    const unchangedDensity = state.density;
    for (const n of [8, 120, 40]) {
      await control("points", n); state = await snapshot();
      assert.equal(state.n, n); assert.equal(state.positions.length, n);
      assert.deepEqual(state.density, unchangedDensity, "number of markers must not alter the continuum heat solution");
      assert.ok(state.levels[0] > 0 && state.levels.at(-1) < 1, "never evaluate infinite endpoint quantiles");
    }
    await control("separation", .2);
    assert.notDeepEqual((await snapshot()).density, unchangedDensity, "separation must change the initial distribution");
    await control("separation", 3.2);
    await frame.locator("#restart").click(); assert.equal((await snapshot()).time, 0);
    await frame.locator("#play").click();
    await frame.waitForFunction(() => HeatQuantilesApp.getState().time > .025);
    assert.equal((await snapshot()).playing, true);
    await frame.locator("#play").click();
    const paused = (await snapshot()).time;
    await page.waitForTimeout(150);
    assert.equal((await snapshot()).time, paused);
    await frame.locator("#restart").click();
    assert.equal((await snapshot()).time, 0);
    // Reproduce lazy-iframe execution before a useful layout width is available.
    await iframe.evaluate(node => node.style.width = "0px");
    await control("points", 120); await control("separation", 2);
    await iframe.evaluate(node => node.style.width = "100%");
    await frame.waitForFunction(() => document.querySelector("canvas").width > 80);
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "article overflow at " + width);
      await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => node.open = true));
      await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
      assert.equal(await page.locator(".MathJax_Error,.merror").count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "unfolded proofs overflow at " + width);
      await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => node.open = false));
      assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "experiment overflow at " + width);
      const size = await iframe.evaluate(node => ({ height: node.clientHeight, content: node.contentDocument.querySelector("main").getBoundingClientRect().height }));
      assert.ok(size.height >= size.content - 2, "iframe must not clip the experiment");
    }
    assert.deepEqual(errors, []);
    console.log("Heat quantiles passed: playback, quantile ordering, exact-heat controls, marker-count invariance, zero-width iframe, and mobile layout.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
