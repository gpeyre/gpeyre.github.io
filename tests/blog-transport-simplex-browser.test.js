/* BLOG_PREVIEW_URL=http://127.0.0.1:4241 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-transport-simplex-browser.test.js */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");
const base = process.env.BLOG_PREVIEW_URL || "http://127.0.0.1:4241";
const article = "/blog/2026/11/08/optimal-transport-convex-extension/";
(async function () {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 1 });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    page.on("response", r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(r.status() + " " + r.url()); });
    await page.goto(base + article);
    const iframe = page.locator('iframe[data-experiment="transport-simplex"]'); await iframe.scrollIntoViewIfNeeded();
    const frame = await (await iframe.elementHandle()).contentFrame();
    await frame.waitForFunction(() => window.TransportSimplexApp && document.getElementById("target").style.left);
    const state = () => frame.evaluate(() => window.TransportSimplexApp.getState());
    const initial = await state(); initial.b.forEach(v => assert.ok(Math.abs(v - 1 / 3) < 1e-12));
    assert.equal(await frame.locator('button.handle').count(), 4);
    async function drag(id, dx, dy) {
      const box = await frame.locator("#" + id).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 }); await page.mouse.up();
    }
    await drag("target", -55, 22); const movedTarget = await state(); assert.notDeepEqual(movedTarget.b, initial.b);
    await drag("vertex-0", 28, -12); const movedSupport = await state();
    assert.deepEqual(movedSupport.b, movedTarget.b); assert.notDeepEqual(movedSupport.vertices, initial.vertices);
    await frame.locator("#vertex-2").press("ArrowRight"); assert.notDeepEqual((await state()).vertices[2], movedSupport.vertices[2]);
    await frame.getByRole("button", { name: "Center target", exact: true }).click(); (await state()).b.forEach(v => assert.ok(Math.abs(v - 1 / 3) < 1e-12));
    await frame.getByRole("button", { name: "Equilateral", exact: true }).click();
    const equilateral = await frame.evaluate(() => { const s = window.TransportSimplexApp.getState(); return window.TransportSimplex.geometry(s.vertices).distances; });
    assert.ok(Math.abs(equilateral[0][1] - equilateral[0][2]) < 1e-12);
    await frame.getByRole("button", { name: "Thin triangle", exact: true }).click(); assert.equal((await state()).vertices[2][1], 1.02);
    await frame.getByRole("button", { name: "Reset", exact: true }).click(); assert.deepEqual(await state(), initial);
    await page.waitForFunction(() => document.querySelectorAll(".MathJax_SVG").length > 100);
    assert.equal(await page.locator(".MathJax_Error, .merror").count(), 0);
    const proofs = page.locator("details.blog-proof"); assert.equal(await proofs.count(), 5);
    assert.equal(await page.locator("details.blog-proof[open]").count(), 0);
    await proofs.last().locator("summary").click(); assert.ok(await proofs.last().getAttribute("open") !== null);
    await proofs.last().locator(".MathJax_SVG_Display").waitFor({ state: "visible" });
    assert.equal(await page.locator(".MathJax_Error, .merror").count(), 0);
    await iframe.scrollIntoViewIfNeeded();
    if (process.env.BLOG_SCREENSHOT_DIR) await iframe.screenshot({ path: process.env.BLOG_SCREENSHOT_DIR + "/transport-simplex-desktop.png" });
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 900 }); await iframe.scrollIntoViewIfNeeded();
      await frame.waitForFunction(() => document.getElementById("simplex").getBoundingClientRect().width < 400);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await frame.locator("#target").press("ArrowUp");
      await frame.getByRole("button", { name: "Equilateral", exact: true }).click();
      await frame.getByRole("button", { name: "Reset", exact: true }).click();
      assert.ok(await iframe.evaluate(el => el.clientHeight >= 600));
      if (width === 375 && process.env.BLOG_SCREENSHOT_DIR) await iframe.screenshot({ path: process.env.BLOG_SCREENSHOT_DIR + "/transport-simplex-mobile.png" });
    }
    assert.match(await page.locator('meta[property="og:image"]').getAttribute("content"), /optimal-transport-convex-extension\.jpg$/);
    assert.deepEqual(errors, []);
    console.log("Transport simplex browser: real mouse/keyboard drags, preserved target weights, presets, five folded proofs, MathJax, responsive iframe sizing, 375/320px overflow checks and social image pass.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
