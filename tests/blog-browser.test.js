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
        assert.equal(await page.locator(".blog-preview").count(), 16);
        const dates = await page.locator(".blog-preview time").evaluateAll(nodes => nodes.map(n => n.dateTime));
        assert.deepEqual(dates, dates.slice().sort().reverse());
        const paths = await page.locator(".blog-preview h2 a").evaluateAll(nodes => nodes.map(n => new URL(n.href).pathname));
        assert.equal(new Set(paths).size, 16);
        assert.ok(paths.includes("/blog/2026/09/15/gaussian-preserving-wasserstein-flows/"));
        assert.ok(paths.includes("/blog/2026/04/06/muon-spectral-wasserstein/"));
        assert.ok(paths.includes("/blog/2025/08/09/positive-definite-congruence/"));
        assert.ok(paths.includes("/blog/2025/07/02/linear-rank-preservers/"));
        assert.ok(paths.includes("/blog/2025/03/28/tout-comprendre-intelligence-artificielle/"));
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
            if (!/clarifications|mathematical-nexus|machine-learners|tout-comprendre-intelligence-artificielle/.test(path)) {
                assert.ok(await page.evaluate(() => MathJax.Hub.getAllJax().length > 0), "No mathematics rendered: " + path);
            }
            if (path.includes("covariance-gauges")) {
                assert.equal(await page.locator('article img[src*="matrixnorm"]').count(), 0);
                assert.ok(await page.evaluate(() => MathJax.Hub.getAllJax().some(jax =>
                    jax.originalText.includes("\\Updownarrow") && jax.originalText.includes("\\gamma(A)"))),
                    "The covariance equivalence must be rendered from LaTeX, not an image");
                await page.locator(".blog-prose .MathJax_SVG_Display").nth(1).screenshot({
                    path: screenshotDir + "/blog-covariance-equivalence-desktop.png",
                    style: ".navbar { visibility: hidden; }"
                });
            }
            if (path.includes("muon-spectral-wasserstein")) {
                assert.equal(await page.locator("article a[href='https://arxiv.org/abs/2604.04891']").count(), 1);
                assert.ok(await page.evaluate(() => MathJax.Hub.getAllJax().some(jax =>
                    jax.originalText.includes("\\mathsf W_\\gamma(\\mu,\\nu)^2"))),
                    "The spectral Wasserstein definition must render as mathematics");
                await page.screenshot({ path: screenshotDir + "/blog-muon-desktop.png", fullPage: true });
            }
            const algebraPost = path.includes("positive-definite-congruence") ? {
                slug: "congruence", date: "2025-08-09",
                source: "https://bsky.app/profile/gabrielpeyre.bsky.social/post/3lvxnbcglps2u",
                formula: "\\Psi_Y^{-1}(X)"
            } : path.includes("linear-rank-preservers") ? {
                slug: "rank-preservers", date: "2025-07-02",
                source: "https://doi.org/10.4153/CJM-1959-008-0",
                formula: "\\boxed{T(X)=AX^\\top B.}"
            } : null;
            if (algebraPost) {
                assert.equal(await page.locator(".blog-eyebrow time").getAttribute("datetime"), algebraPost.date);
                assert.equal(await page.locator("article a[href='" + algebraPost.source + "']").count(), 1);
                assert.equal(await page.locator("article img").count(), 0, "The mathematical statements must be LaTeX, not images");
                assert.ok(await page.evaluate(formula => MathJax.Hub.getAllJax().some(jax =>
                    jax.originalText.includes(formula)), algebraPost.formula));
                assert.ok(await page.locator("article h2").count() >= 5, "The detailed proof sections must be present");
                await page.screenshot({ path: screenshotDir + "/blog-" + algebraPost.slug + "-desktop.png" });
                await page.locator(".blog-prose .MathJax_SVG_Display").nth(algebraPost.slug === "congruence" ? 2 : 4).screenshot({
                    path: screenshotDir + "/blog-" + algebraPost.slug + "-theorem-desktop.png",
                    style: ".navbar { visibility: hidden; }"
                });
            }
            const isCappeBook = path.includes("tout-comprendre-intelligence-artificielle");
            if (isCappeBook) {
                assert.equal(await page.locator(".blog-eyebrow time").getAttribute("datetime"), "2025-03-28");
                for (const author of ["olivier-cappe", "claire-marc"]) {
                    assert.equal(await page.locator("article a[href='https://www.cnrseditions.fr/auteur/" + author + "/']").count(), 1);
                }
                assert.ok(await page.locator("article").textContent().then(text => text.includes("sharing my office with Olivier")));
                const cover = page.locator("article img[src='/blog/imgs/book-cappe.webp']");
                assert.equal(await cover.count(), 1);
                await cover.scrollIntoViewIfNeeded();
                await cover.evaluate(img => img.decode());
                assert.ok((await cover.getAttribute("alt")).includes("Olivier Cappé and Claire Marc"));
                await page.evaluate(() => scrollTo(0, 0));
                await page.screenshot({ path: screenshotDir + "/blog-cappe-book-desktop.png", fullPage: true });
            }
            const isGaussianFlow = path.includes("gaussian-preserving-wasserstein-flows");
            if (isGaussianFlow) {
                assert.equal(await page.locator(".blog-eyebrow time").getAttribute("datetime"), "2026-09-15");
                for (const source of ["https://www.gpeyre.com/ot4ml/", "https://hugolav.github.io/",
                    "https://doi.org/10.1002/mana.19901470121", "https://doi.org/10.1137/S0036141096303359"]) {
                    assert.equal(await page.locator("article a[href='" + source + "']").count(), 1);
                }
                const prose = await page.locator("article").textContent();
                for (const phrase of ["16.5", "Ornstein–Uhlenbeck", "not the pure heat equation", "finite entropy"]) {
                    assert.ok(prose.includes(phrase), "Missing qualification: " + phrase);
                }
                assert.ok(await page.locator("article h2").count() >= 7);
                const mathematics = await page.evaluate(() => MathJax.Hub.getAllJax().map(jax => jax.originalText));
                for (const formula of ["\\mathsf G\\alpha=\\mathcal N(m_\\alpha,\\Sigma_\\alpha)",
                    "W_2(\\mathsf G\\alpha,\\mathsf G\\beta)", "\\mathrm{KL}(\\alpha\\mid\\mathsf G\\alpha)",
                    "\\partial_t\\rho", "\\mathcal N(m_0,\\Sigma_0)*\\mathcal N(0,2tI)"]) {
                    assert.ok(mathematics.some(tex => tex.includes(formula)), "Missing formula: " + formula);
                }
                await page.screenshot({ path: screenshotDir + "/blog-gaussian-flows-desktop.png" });
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
                if (kind === "sinkhorn") {
                    assert.equal(await figure.locator('[data-param="epsilon"]').inputValue(), "0.22");
                    assert.equal(await figure.locator('[data-param="duration"]').inputValue(), "1.5");
                    assert.ok(await figure.locator('[data-step="-1"]').isDisabled());
                    await figure.locator('[data-step="1"]').click();
                    assert.equal(await scrub.inputValue(), "1");
                    await figure.locator('[data-step="-1"]').click();
                    assert.equal(await scrub.inputValue(), "0");
                }
                await page.locator("[data-play]").click();
                await page.waitForTimeout(1100);
                if (kind === "sinkhorn") {
                    assert.equal(await scrub.inputValue(), "0", "The first iterate must be held for 1.5 seconds");
                    await page.waitForTimeout(700);
                }
                assert.ok(Number(await scrub.inputValue()) > 0, "Animation did not advance: " + kind);
                await page.locator("[data-play]").click();
                assert.equal(await page.locator("[data-play]").getAttribute("aria-pressed"), "false");
                if (kind === "sinkhorn") {
                    assert.equal(await scrub.inputValue(), "1", "Slow playback should advance exactly once");
                    await figure.locator('[data-param="duration"]').fill("0.5");
                    await page.locator("[data-play]").click();
                    await page.waitForTimeout(700);
                    assert.equal(await scrub.inputValue(), "2", "The playback-speed control should change the delay");
                    await figure.locator('[data-step="-1"]').click();
                    assert.equal(await scrub.inputValue(), "1");
                    assert.equal(await page.locator("[data-play]").getAttribute("aria-pressed"), "false");
                }
                await page.locator("[data-reset]").click();
                if (kind === "pl") await scrub.fill("2");
                if (kind === "sinkhorn") {
                    for (const k of [0, 1, 4, 8, 24]) {
                        await scrub.fill(String(k));
                        await figure.screenshot({ path: screenshotDir + "/blog-sinkhorn-step-" + k + ".png", style: ".navbar { visibility: hidden; }" });
                    }
                    await scrub.fill("8");
                }
                await figure.screenshot({ path: screenshotDir + "/blog-figure-" + kind + ".png", style: ".navbar { visibility: hidden; }" });
            }
            const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.equal(overflows, false, "Desktop overflow: " + path);
            await page.setViewportSize({ width: 390, height: 844 });
            await page.evaluate(() => new Promise(resolve => MathJax.Hub.Queue(["Rerender", MathJax.Hub], resolve)));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "Mobile overflow: " + path);
            if (hasFigure) await page.locator("[data-figure]").screenshot({ path: screenshotDir + "/blog-figure-" + await page.locator("[data-figure]").getAttribute("data-figure") + "-mobile.png" });
            if (path.includes("covariance-gauges")) {
                await page.locator(".blog-prose .MathJax_SVG_Display").nth(1).screenshot({
                    path: screenshotDir + "/blog-covariance-equivalence-mobile.png",
                    style: ".navbar { visibility: hidden; }"
                });
            }
            if (path.includes("muon-spectral-wasserstein")) {
                await page.screenshot({ path: screenshotDir + "/blog-muon-mobile.png", fullPage: true });
            }
            if (algebraPost) {
                await page.evaluate(() => scrollTo(0, 0));
                await page.screenshot({ path: screenshotDir + "/blog-" + algebraPost.slug + "-mobile.png" });
                const displays = page.locator(".blog-prose .MathJax_SVG_Display");
                for (const index of [2, 4, 6, await displays.count() - 1]) {
                    await displays.nth(index).screenshot({
                        path: screenshotDir + "/blog-" + algebraPost.slug + "-equation-" + index + "-mobile.png",
                        style: ".navbar { visibility: hidden; }"
                    });
                }
            }
            if (isCappeBook) {
                await page.evaluate(() => scrollTo(0, 0));
                await page.screenshot({ path: screenshotDir + "/blog-cappe-book-mobile.png", fullPage: true });
            }
            if (isGaussianFlow) {
                await page.evaluate(() => scrollTo(0, 0));
                await page.screenshot({ path: screenshotDir + "/blog-gaussian-flows-mobile.png" });
                const displays = page.locator(".blog-prose .MathJax_SVG_Display");
                for (const index of [1, 2, 6, 9, 12, 18, 21, await displays.count() - 1]) {
                    await displays.nth(index).screenshot({
                        path: screenshotDir + "/blog-gaussian-flows-equation-" + index + "-mobile.png",
                        style: ".navbar { visibility: hidden; }"
                    });
                }
            }
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
        console.log("Blog browser QA passed: all 16 posts, maths, images, figures, navigation, and mobile widths.");
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
