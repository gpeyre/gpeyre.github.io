/* BLOG_PREVIEW_URL=http://127.0.0.1:4196 BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-new-dynamics-browser.test.js */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");
const base = process.env.BLOG_PREVIEW_URL || "http://127.0.0.1:4196";
const shots = process.env.BLOG_SCREENSHOT_DIR;
(async () => {
  const browser = await chromium.launch({headless: true, channel: "chrome"});
  try {
    const page = await browser.newPage({viewport: {width: 1200, height: 1000}}), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const [slug, topic] of [["langevin-without-a-potential", "langevin"], ["lagrangian-density-interpolation", "moser"], ["stable-fluids", "fluids"]]) {
      await page.setViewportSize({width: 1200, height: 1000});
      const response = await page.goto(base + "/blog/preparations/" + slug + ".html"); assert.equal(response.status(), 200);
      await page.waitForFunction(() => window.MathJax?.isReady);
      await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
      assert.ok(await page.locator(".MathJax_SVG").count() > 20);
      assert.equal(await page.locator(".MathJax_Error,.merror").count(), 0);
      assert.equal(await page.locator("details.blog-proof[open]").count(), 0);
      await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
      await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
      assert.equal(await page.locator(".MathJax_Error,.merror").count(), 0);
      await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => { node.open = false; }));
      assert.ok(await page.locator("figure img").evaluateAll(nodes => nodes.every(img => img.complete && img.naturalWidth > 0)), "local portrait loads");
      const iframe = page.locator("iframe.idea-experiment"); await iframe.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector("iframe").dataset.ready === "true");
      const frame = await (await iframe.elementHandle()).contentFrame();
      await frame.locator("canvas").first().waitFor();
      assert.equal(await frame.locator("#play").getAttribute("aria-pressed"), "false");
      const before = await frame.locator("#clock").textContent(); await page.waitForTimeout(150);
      assert.equal(await frame.locator("#clock").textContent(), before, "starts paused");
      await frame.locator("#step").click(); assert.notEqual(await frame.locator("#clock").textContent(), before);
      await frame.locator("#reset").click(); assert.equal(await frame.locator("#clock").textContent(), before);
      const set = (id, value) => frame.locator("#" + id).evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event("input", {bubbles: true})); }, value);
      if (topic === "langevin") {
        for (const a of [-3, 0, 3]) { await set("circulation", a); await set("noise", 0); await set("time", 8); }
        await set("noise", 1.6); await set("time", 1.5); assert.match(await frame.locator("#clock").textContent(), /1\.50/);
        await frame.locator("#reset").click();
      } else if (topic === "moser") {
        for (const background of [0.025, 0.5, 0.14]) { await set("background", background); await set("time", 240); assert.match(await frame.locator("#clock").textContent(), /1\.000/); }
        await set("time", 120); assert.match(await frame.locator("#time").getAttribute("aria-valuetext"), /0\.500/); assert.match(await frame.locator("#metrics").textContent(), /1\.000000000000/);
        await frame.locator("#reset").click();
      } else {
        const canvas = frame.locator("canvas").first(); await canvas.focus();
        await set("radius", 0.12); await set("force", 0);
        assert.equal(await frame.locator("#radius-value").textContent(), "0.120"); assert.equal(await frame.locator("#force-value").textContent(), "0.00×");
        const oldMass = await frame.locator(".metric").nth(2).textContent();
        await canvas.press("Enter"); assert.notEqual(await frame.locator(".metric").nth(2).textContent(), oldMass);
        assert.ok(Number(await frame.locator(".metric strong").nth(3).textContent()) > 0, "injected mass is accumulated");
        assert.ok(Math.abs(Number(await frame.locator(".metric strong").nth(5).textContent())) < 1e-10, "before stepping, added dye matches the source audit");
        await set("force", 3); await set("radius", 0.02);
        await canvas.press("Shift+ArrowRight"); await frame.locator("#step").click();
        assert.ok(Number((await frame.locator(".metric strong").first().textContent()).trim()) < 1e-10);
        await frame.locator("#project").uncheck(); await canvas.press("Shift+ArrowUp"); await frame.locator("#step").click();
        assert.ok(Number((await frame.locator(".metric strong").first().textContent()).trim()) > 1e-3);
        await frame.locator("#project").check(); await frame.locator("#step").click();
        assert.ok(Number((await frame.locator(".metric strong").first().textContent()).trim()) < 1e-10);
        const box = await canvas.boundingBox();
        await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5); await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, {steps: 5}); await page.mouse.up();
        for (const id of ["viscosity", "diffusivity", "time-step"]) await set(id, id === "time-step" ? 0.12 : 0.001);
      }
      await frame.locator("#play").click(); await page.waitForTimeout(180);
      assert.equal(await frame.locator("#play").getAttribute("aria-pressed"), "true");
      await frame.locator("#play").click(); const stopped = await frame.locator("#clock").textContent(); await page.waitForTimeout(150);
      assert.equal(await frame.locator("#clock").textContent(), stopped);
      if (shots) { fs.mkdirSync(shots, {recursive: true}); await iframe.screenshot({path: path.join(shots, "new-" + topic + "-desktop.png")}); }
      for (const width of [375, 320]) {
        await page.setViewportSize({width, height: 950}); await page.waitForTimeout(180);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `article overflow: ${topic}, ${width}`);
        await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
        await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `proof overflow: ${topic}, ${width}`);
        assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `experiment overflow: ${topic}, ${width}`);
        await page.waitForFunction(() => {
          const node = document.querySelector("iframe.idea-experiment");
          return node.clientHeight >= node.contentDocument.querySelector("#lab").getBoundingClientRect().height + 3;
        });
        const size = await iframe.evaluate(node => ({height: node.clientHeight, content: node.contentDocument.querySelector("#lab").getBoundingClientRect().height}));
        assert.ok(size.height >= size.content - 2, `iframe clipping: ${topic}, ${width}`);
        await page.locator("details.blog-proof").evaluateAll(nodes => nodes.forEach(node => { node.open = false; }));
      }
      if (shots) await iframe.screenshot({path: path.join(shots, "new-" + topic + "-mobile.png")});
      const mobileHeight = await iframe.evaluate(node => node.clientHeight);
      await page.setViewportSize({width: 1200, height: 1000});
      await page.waitForFunction(() => {
        const node = document.querySelector("iframe.idea-experiment");
        const desired = Math.ceil(node.contentDocument.querySelector("#lab").getBoundingClientRect().height) + 8;
        return Math.abs(node.clientHeight - Math.max(350, desired)) < 3;
      });
      assert.ok(await iframe.evaluate(node => node.clientHeight) < mobileHeight, `iframe can shrink back to desktop: ${topic}`);
      console.log(topic + ": math, portraits, proofs, controls, pause, reset, keyboard/pointer where applicable, and mobile passed.");
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
