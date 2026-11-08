/* BLOG_PREVIEW_URL=http://127.0.0.1:4242 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-transport-simplex-browser.test.js */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");
const base = process.env.BLOG_PREVIEW_URL || "http://127.0.0.1:4242";
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
    assert.equal(initial.mode, "target"); assert.equal(initial.colorCap, null);
    assert.equal(await frame.locator('button.handle').count(), 4);
    async function simplexPosition(targetFrame, weights) {
      return targetFrame.evaluate(a => {
        const s = window.TransportSimplexApp.getState(), canvas = document.getElementById("simplex"), box = window.TransportSimplexView.layout(canvas.clientWidth, canvas.clientHeight);
        const pixel = box.toScreen(window.TransportSimplex.point(a, s.vertices));
        return { x: pixel[0], y: pixel[1] };
      }, weights);
    }
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

    // Pinned alpha is a separate control, available to touch and keyboard users.
    await frame.getByRole("button", { name: "Inspect α", exact: true }).click();
    const targetBeforeInspect = (await state()).b, alpha = [.22, .31, .47];
    await frame.locator("#simplex").click({ position: await simplexPosition(frame, alpha) });
    let inspection = await state(); assert.equal(inspection.mode, "inspect"); assert.deepEqual(inspection.b, targetBeforeInspect);
    inspection.probe.forEach((v, i) => assert.ok(Math.abs(v - alpha[i]) < .004)); // Real pointer coordinates are pixel-quantized.
    assert.match(await frame.locator("#probe").innerText(), /pinned/); assert.match(await frame.locator("#probe-cost").innerText(), /W₁ = [0-9]/);
    await page.mouse.move(5, 5); assert.deepEqual((await state()).probe, inspection.probe);
    await drag("vertex-0", 15, -6); assert.deepEqual((await state()).probe, inspection.probe); assert.deepEqual((await state()).b, targetBeforeInspect);
    await frame.locator("#simplex").press("ArrowRight"); assert.notDeepEqual((await state()).probe, inspection.probe); assert.deepEqual((await state()).b, targetBeforeInspect);
    await frame.locator("#simplex").press("Home"); assert.deepEqual((await state()).probe, (await state()).b);
    await frame.locator("#vertex-1").click(); assert.deepEqual((await state()).probe, [0, 1, 0]);
    await frame.getByRole("button", { name: "Reset", exact: true }).click();

    // A fixed legend allows comparisons; saturation is explicit instead of hidden.
    await frame.getByRole("checkbox", { name: "Lock color scale", exact: true }).check();
    const locked = (await state()).colorCap; assert.ok(locked > 0);
    await frame.locator("#simplex").click({ position: await simplexPosition(frame, [.82, .1, .08]) });
    assert.equal((await state()).colorCap, locked);
    await frame.waitForFunction(() => document.getElementById("scale-status").textContent.includes("saturated"));
    await frame.getByRole("button", { name: "Thin triangle", exact: true }).click(); assert.equal((await state()).colorCap, locked);
    await frame.getByRole("button", { name: "Reset", exact: true }).click(); assert.equal((await state()).colorCap, null); assert.equal((await state()).mode, "target");
    assert.equal(await frame.getByRole("checkbox", { name: "Lock color scale", exact: true }).isChecked(), false);
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

    // A real touch-enabled context catches behavior missed by shrinking a desktop
    // viewport: tapping to inspect must not accidentally move beta or lose alpha.
    const touchContext = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    try {
      const touchPage = await touchContext.newPage(); touchPage.on("pageerror", e => errors.push(e.message));
      touchPage.on("response", r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(r.status() + " " + r.url()); });
      await touchPage.goto(base + article);
      const touchIframe = touchPage.locator('iframe[data-experiment="transport-simplex"]'); await touchIframe.scrollIntoViewIfNeeded();
      const touchFrame = await (await touchIframe.elementHandle()).contentFrame();
      await touchFrame.waitForFunction(() => window.TransportSimplexApp && document.getElementById("target").style.left);
      const touchState = () => touchFrame.evaluate(() => window.TransportSimplexApp.getState());
      const betaBeforeTouch = (await touchState()).b;
      await touchFrame.getByRole("button", { name: "Inspect α", exact: true }).tap();
      const touchAlpha = [.25, .47, .28]; await touchFrame.locator("#simplex").tap({ position: await simplexPosition(touchFrame, touchAlpha) });
      let touched = await touchState(); assert.equal(touched.mode, "inspect"); assert.deepEqual(touched.b, betaBeforeTouch);
      touched.probe.forEach((v, i) => assert.ok(Math.abs(v - touchAlpha[i]) < .015)); // Mobile tap pixels are integral.
      const pinnedTouchAlpha = touched.probe;
      await touchFrame.getByRole("checkbox", { name: "Lock color scale", exact: true }).tap();
      assert.deepEqual((await touchState()).probe, pinnedTouchAlpha); assert.deepEqual((await touchState()).b, betaBeforeTouch);
      assert.match(await touchFrame.locator("#probe").innerText(), /pinned/);
      for (const width of [375, 320]) {
        await touchPage.setViewportSize({ width, height: 900 }); await touchIframe.scrollIntoViewIfNeeded();
        await touchFrame.waitForFunction(() => document.getElementById("simplex").getBoundingClientRect().width < 400);
        assert.ok(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.ok(await touchFrame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.deepEqual((await touchState()).probe, pinnedTouchAlpha); assert.deepEqual((await touchState()).b, betaBeforeTouch);
        if (process.env.BLOG_SCREENSHOT_DIR) await touchIframe.screenshot({ path: process.env.BLOG_SCREENSHOT_DIR + "/transport-simplex-touch-" + width + ".png" });
      }
      await touchFrame.getByRole("button", { name: "Move β", exact: true }).tap();
      await touchFrame.locator("#simplex").tap({ position: await simplexPosition(touchFrame, [.25, .45, .3]) });
      assert.notDeepEqual((await touchState()).b, betaBeforeTouch); assert.equal((await touchState()).probe, null);
      await touchFrame.getByRole("button", { name: "Reset", exact: true }).tap(); assert.deepEqual(await touchState(), initial);
    } finally { await touchContext.close(); }
    assert.deepEqual(errors, []);
    console.log("Transport simplex browser: mouse/keyboard drags, pinned alpha inspection, scale locking/saturation, real mobile touch taps, 375/320px overflow checks, five folded proofs, MathJax, responsive iframe sizing and social image pass.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
