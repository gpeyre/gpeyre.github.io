/* Focused subscription QA: BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-subscribe.test.js */
"use strict";

const assert = require("node:assert/strict");
const { chromium, webkit } = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");
const base = (process.env.BLOG_PREVIEW_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const basePath = process.env.BLOG_BASEURL || new URL(base).pathname.replace(/\/$/, "");
const feedURL = "https://www.gpeyre.com" + basePath + "/blog/rss.xml";
const article = "/blog/2026/10/03/inverse-optimisation-gap-loss/";

async function contextFor(browser, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
    // This checks the local subscription UI, not remote fonts or MathJax availability.
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ?
        route.continue() : route.abort());
    return context;
}

async function visit(context, path = "/blog/") {
    const page = await context.newPage();
    const response = await page.goto(base + path, { waitUntil: "load" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator(".blog-subscription").count(), 1);
    assert.equal(await page.locator(".blog-subscribe a").count(), 2);
    assert.equal(await page.locator("[data-copy-feed]").getAttribute("data-feed-url"), feedURL);
    assert.equal(await page.locator("input[data-feed-url]").inputValue(), feedURL);
    return page;
}

async function copied(page) {
    await page.waitForFunction(() => /copied/i.test(document.querySelector("[data-copy-status]").textContent));
    assert.match(await page.locator("[data-copy-feed]").textContent(), /copied/i);
    assert.equal(await page.locator("[data-copy-status]").getAttribute("role"), "status");
    assert.equal(await page.locator("[data-copy-status]").getAttribute("aria-live"), "polite");
}

async function clipboardStub(context, mode, legacyResult = false) {
    await context.addInitScript(({ mode, legacyResult }) => {
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: mode === "missing" ? undefined : {
            writeText(value) {
                window.__clipboardURL = value;
                return mode === "success" ? Promise.resolve() : Promise.reject(new Error("Clipboard permission denied"));
            }
        } });
        document.execCommand = command => {
            window.__legacyCopy = { command, value: document.activeElement && document.activeElement.value,
                selectionStart: document.activeElement && document.activeElement.selectionStart,
                selectionEnd: document.activeElement && document.activeElement.selectionEnd };
            return legacyResult;
        };
    }, { mode, legacyResult });
}

async function checkEngine(browser, name) {
    const context = await contextFor(browser);
    await clipboardStub(context, "success");
    try {
        for (const path of ["/blog/", article]) {
            const page = await visit(context, path);
            const button = page.locator("[data-copy-feed]");
            assert.ok(await button.isVisible(), name + ": copy button must become available with JavaScript");
            assert.match(await button.textContent(), /Copy feed URL/i);
            await button.click();
            await copied(page);
            assert.equal(await page.evaluate(() => window.__clipboardURL), feedURL, name + ": copy the canonical URL");
            await page.close();
        }

        const page = await visit(context);
        const summary = page.locator(".blog-subscribe-help summary");
        await summary.focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator(".blog-subscribe-help").evaluate(node => node.open), true,
            name + ": native help must open from the keyboard");
        const input = page.locator("input[data-feed-url]");
        assert.ok(await input.isVisible());
        assert.equal(await input.evaluate(node => node.readOnly), true);
        assert.ok(await input.evaluate(node => Array.from(node.labels || []).some(label => label.textContent.trim())),
            name + ": feed URL must have a visible accessible label");
        const id = await input.getAttribute("id");
        assert.ok(id);
        assert.equal(await page.locator('[id="' + id + '"]').count(), 1,
            name + ": subscription field needs a unique ID");
        await page.locator("[data-copy-feed]").focus();
        await page.keyboard.press("Enter");
        await copied(page);

        for (const width of [1280, 320]) {
            await page.setViewportSize({ width, height: 900 });
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
                name + ": help must not create horizontal overflow at " + width + "px");
            assert.ok(await input.evaluate(node => {
                const bounds = node.getBoundingClientRect();
                return bounds.width > 100 && bounds.left >= -1 && bounds.right <= innerWidth + 1;
            }), name + ": long URL field must stay within the viewport");
        }
        await page.close();
    } finally {
        await context.close();
    }

    for (const mode of ["reject", "missing"]) {
        const fallbackContext = await contextFor(browser);
        await clipboardStub(fallbackContext, mode, true);
        try {
            const page = await visit(fallbackContext);
            await page.locator("[data-copy-feed]").click();
            await page.waitForFunction(() => document.querySelector(".blog-subscribe-help").open &&
                document.activeElement === document.querySelector("input[data-feed-url]"));
            const selection = await page.locator("input[data-feed-url]").evaluate(node => ({
                start: node.selectionStart, end: node.selectionEnd, value: node.value
            }));
            assert.deepEqual(selection, { start: 0, end: feedURL.length, value: feedURL },
                name + ": manual fallback must focus and select the entire canonical URL");
            assert.match(await page.locator("[data-copy-status]").textContent(), /(?:copy|⌘|Ctrl|Command)/i,
                name + ": manual fallback must explain how to copy");
            assert.doesNotMatch(await page.locator("[data-copy-status]").textContent(), /copied/i,
                name + ": failed copy must never claim success");
            assert.equal(await page.evaluate(() => window.__legacyCopy), undefined,
                name + ": unavailable or denied clipboard access must not be retried with a deprecated API");
            await page.close();
        } finally {
            await fallbackContext.close();
        }
    }

    const noJSContext = await contextFor(browser, { javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    try {
        for (const path of ["/blog/", article]) {
            const page = await visit(noJSContext, path);
            assert.equal(await page.locator("[data-copy-feed]").isVisible(), false,
                name + ": nonfunctional copy button must stay hidden without JavaScript");
            await page.locator(".blog-subscribe-help summary").click();
            assert.ok(await page.locator("input[data-feed-url]").isVisible(),
                name + ": manual subscription instructions must work without JavaScript");
            const instructions = await page.locator(".blog-subscribe-help").textContent();
            assert.match(instructions, /Safari/);
            assert.match(instructions, /(?:RSS|feed) reader/i);
            await page.close();
        }
    } finally {
        await noJSContext.close();
    }
    console.log(name + ": canonical copy, keyboard access, mobile layout, rejection/missing-API manual fallback, and no-JavaScript help passed.");
}

(async () => {
    const chrome = await chromium.launch({ headless: true, channel: "chrome" });
    try {
        await checkEngine(chrome, "Chrome");
        const context = await contextFor(chrome, { permissions: ["clipboard-read", "clipboard-write"] });
        try {
            const page = await visit(context);
            await page.locator("[data-copy-feed]").click();
            await copied(page);
            // Read only our just-written public feed URL, never pre-existing clipboard contents.
            assert.equal(await page.evaluate(() => navigator.clipboard.readText()), feedURL,
                "Chrome must copy the actual canonical URL to the system clipboard");
            await page.close();
        } finally {
            await context.close();
        }
        console.log("Chrome: real clipboard API passed.");
    } finally {
        await chrome.close();
    }
    let safari;
    try {
        safari = await webkit.launch({ headless: true });
    } catch (error) {
        if (process.env.BLOG_REQUIRE_WEBKIT === "1") throw error;
        console.log("WebKit skipped: its Playwright browser runtime is not installed. Safari should be checked separately.");
    }
    if (safari) {
        try { await checkEngine(safari, "WebKit"); }
        finally { await safari.close(); }
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
