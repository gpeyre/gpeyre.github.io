/* Optional end-to-end QA: BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-browser.test.js */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");
const base = process.env.BLOG_PREVIEW_URL || "http://127.0.0.1:4173";
const screenshotDir = process.env.BLOG_SCREENSHOT_DIR || "/private/tmp";

(async () => {
    const browser = await chromium.launch({ headless: true, channel: "chrome" });
    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(base + "/blog/", { waitUntil: "networkidle" });
        assert.equal(await page.locator(".blog-preview").count(), 11);
        const dates = await page.locator(".blog-preview time").evaluateAll(nodes => nodes.map(n => n.dateTime));
        assert.deepEqual(dates, dates.slice().sort().reverse());
        const paths = await page.locator(".blog-preview h2 a").evaluateAll(nodes => nodes.map(n => new URL(n.href).pathname));
        assert.equal(new Set(paths).size, 11);
        for (const width of [768, 820, 1024]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(base + "/");
            assert.ok(await page.locator("nav.navbar").evaluate(n => n.getBoundingClientRect().height < 70), "Menu wraps at " + width);
        }
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(base + "/blog/", { waitUntil: "networkidle" });
        await page.screenshot({ path: screenshotDir + "/blog-archive-desktop.png" });
        const nonfinite = /(?:NaN|Infinity|undefined)/;

        for (const path of paths) {
            const response = await page.goto(base + path, { waitUntil: "networkidle" });
            assert.equal(response.status(), 200);
            await page.waitForFunction(() => window.MathJax && MathJax.Hub && MathJax.isReady);
            await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(resolve)));
            assert.equal(await page.locator(".MathJax_Error, .merror").count(), 0, path);
            if (!/clarifications|mathematical-nexus|machine-learners/.test(path)) {
                assert.ok(await page.evaluate(() => MathJax.Hub.getAllJax().length > 0), "No mathematics rendered: " + path);
            }
            const brokenImages = await page.locator("article img").evaluateAll(nodes => nodes.filter(n => n.complete && !n.naturalWidth).map(n => n.src));
            assert.deepEqual(brokenImages, []);
            assert.equal(await page.locator("h1").count(), 1);
            assert.ok(await page.locator(".blog-pagination a").count() >= 1);
            const hasFigure = await page.locator("[data-figure]").count();
            if (hasFigure) {
                const figure = page.locator("[data-figure]");
                const kind = await figure.getAttribute("data-figure");
                await figure.scrollIntoViewIfNeeded();
                assert.ok((await figure.getAttribute("class")).includes("js-ready"));
                assert.ok(!nonfinite.test(await page.locator("[data-status]").textContent()));
                for (const slider of await figure.locator("input").all()) {
                    for (const endpoint of ["min", "max"]) {
                        await slider.evaluate((input, end) => { input.value = input[end]; input.dispatchEvent(new Event("input", { bubbles: true })); }, endpoint);
                        assert.ok(!nonfinite.test(await page.locator("[data-status]").textContent()));
                    }
                }
                await page.locator("[data-reset]").click();
                const scrub = page.locator('[data-param="' + (kind === "sinkhorn" ? "iteration" : kind === "gaussian" ? "weight" : "time") + '"]');
                await page.locator("[data-play]").click();
                await page.waitForTimeout(1100);
                assert.ok(Number(await scrub.inputValue()) > 0, "Animation did not advance: " + kind);
                await page.locator("[data-play]").click();
                assert.equal(await page.locator("[data-play]").getAttribute("aria-pressed"), "false");
                await page.locator("[data-reset]").click();
                if (kind === "pl") await scrub.fill("2");
                if (kind === "sinkhorn") await scrub.fill("4");
                await figure.screenshot({ path: screenshotDir + "/blog-figure-" + kind + ".png", style: ".navbar { visibility: hidden; }" });
            }
            const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.equal(overflows, false, "Desktop overflow: " + path);
            await page.setViewportSize({ width: 390, height: 844 });
            await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(["Rerender", MathJax.Hub], resolve)));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "Mobile overflow: " + path);
            if (hasFigure) await page.locator("[data-figure]").screenshot({ path: screenshotDir + "/blog-figure-" + await page.locator("[data-figure]").getAttribute("data-figure") + "-mobile.png" });
            if (path.includes("covariance-gauges")) await page.screenshot({ path: screenshotDir + "/blog-proof-mobile.png" });
            await page.setViewportSize({ width: 1280, height: 900 });
            console.log("Verified " + path);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/blog/", { waitUntil: "networkidle" });
        await page.screenshot({ path: screenshotDir + "/blog-archive-mobile.png" });
        await page.locator(".navbar-toggle").click();
        assert.ok(await page.locator(".navbar-nav a").filter({ hasText: /^Blog$/ }).isVisible());
        await page.goto(base + "/", { waitUntil: "networkidle" });
        await page.locator(".navbar-toggle").click();
        await page.locator(".navbar-nav a").filter({ hasText: /^Blog$/ }).click();
        assert.equal(new URL(page.url()).pathname, "/blog/");
        for (const path of ["/blog/blog-todo.md", "/blog/README.md", "/tests/blog-math.test.js"]) {
            assert.equal((await context.request.get(base + path)).status(), 404, "Authoring file leaked: " + path);
        }
        assert.deepEqual(errors, []);
        console.log("Blog browser QA passed: all 11 posts, maths, images, figures, navigation, and mobile widths.");
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
