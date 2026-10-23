/* BLOG_PLAYWRIGHT_PATH=/path/to/playwright node tests/blog-queue-browser.test.js */
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.BLOG_PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(__dirname, ".."), sourcePath = path.join(root, "blog/announcement-queue.md"), baseline = fs.readFileSync(sourcePath, "utf8");
const url = pathToFileURL(path.join(root, "blog/announcement-queue.html")).href;
const expected = [...baseline.matchAll(/^- \[([ x])\] Ready to publish\s*$/gm)];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } }), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(source => {
      window.testQueue = { source, name: "announcement-queue.md", writes: 0, deny: false, race: false };
      const mock = {
        async getFile() { const text = window.testQueue.source; return { name: window.testQueue.name, async text() { return text; } }; },
        async queryPermission() { return window.testQueue.deny ? "prompt" : "granted"; },
        async requestPermission() { return window.testQueue.deny ? "denied" : "granted"; },
        async createWritable() {
          let value;
          if (window.testQueue.race) window.testQueue.source += "\nExternal edit while opening writer.\n";
          return { async write(text) { value = text; }, async close() { window.testQueue.source = value; window.testQueue.writes++; }, async abort() { window.testQueue.aborted = true; } };
        }
      };
      window.showOpenFilePicker = async () => [mock];
    }, baseline);
    await page.goto(url); await page.locator('html[data-queue-ready="true"]').waitFor();
    async function waitStatus(pattern) { await page.waitForFunction(source => new RegExp(source).test(document.querySelector("[data-save-status]").textContent), pattern.source); }
    assert.equal(await page.locator(".queue-card").count(), expected.length);
    assert.equal(await page.locator(".queue-ready input:checked").count(), expected.filter(match => match[1] === "x").length);
    assert.equal(await page.locator("[data-save]").isDisabled(), true);
    if (process.env.BLOG_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.BLOG_SCREENSHOT_DIR, "blog-queue-desktop.png"), fullPage: false });
    await page.getByLabel("Search the queue").fill("Sinkhorn");
    assert.equal(await page.locator(".queue-card:visible").count(), 1);
    await page.getByLabel("Search the queue").fill("");
    await page.getByLabel("Readiness", { exact: true }).selectOption("ready");
    assert.equal(await page.locator(".queue-card:visible").count(), expected.filter(match => match[1] === "x").length);
    await page.getByLabel("Readiness", { exact: true }).selectOption("all");
    await page.getByLabel("Topic", { exact: true }).selectOption("transport");
    assert.ok(await page.locator(".queue-card:visible").count() > 0);
    await page.getByLabel("Topic", { exact: true }).selectOption("all");
    const first = page.locator(".queue-ready input").first(), originallyChecked = await first.isChecked();
    await first.setChecked(!originallyChecked);
    assert.equal(await page.evaluate(() => window.testQueue.source), baseline, "Draft checkboxes never mutate source automatically");
    assert.match(await page.locator("[data-save-status]").innerText(), /Unsaved draft/);
    const intended = baseline.replace(/^- \[([ x])\] Ready to publish/m, `- [${originallyChecked ? " " : "x"}] Ready to publish`);
    await page.getByRole("button", { name: "Save to source", exact: true }).click();
    await waitStatus(/Saved to the selected/);
    assert.equal(await page.evaluate(() => window.testQueue.source), intended);
    assert.equal(await page.evaluate(() => window.testQueue.writes), 1);
    assert.match(await page.locator("[data-save-status]").innerText(), /Ask Codex to review, commit, and push/);
    assert.match(await page.locator("[data-save-status]").innerText(), /uncommitted queue changes can stop publication/);
    await first.setChecked(originallyChecked);
    await page.evaluate(() => { window.testQueue.source = "<!-- External editorial edit. -->\n" + window.testQueue.source; });
    await page.getByRole("button", { name: "Save to source", exact: true }).click();
    await waitStatus(/changed outside this page/);
    assert.match(await page.locator("[data-save-status]").innerText(), /changed outside this page/);
    assert.equal(await page.evaluate(() => window.testQueue.writes), 1, "Concurrent source edit must not be overwritten");
    page.on("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Open current Markdown", exact: true }).click();
    await waitStatus(/Current source opened/);
    await page.locator(".queue-ready input").first().setChecked(originallyChecked);
    await page.evaluate(() => { window.testQueue.deny = true; });
    await page.getByRole("button", { name: "Save to source", exact: true }).click();
    await waitStatus(/permission was not granted/);
    assert.match(await page.locator("[data-save-status]").innerText(), /permission was not granted/);
    assert.equal(await page.evaluate(() => window.testQueue.writes), 1);
    await page.evaluate(() => { window.testQueue.deny = false; window.testQueue.race = true; });
    await page.getByRole("button", { name: "Save to source", exact: true }).click();
    await waitStatus(/changed before writing/);
    assert.match(await page.locator("[data-save-status]").innerText(), /changed before writing/);
    assert.equal(await page.evaluate(() => window.testQueue.aborted), true);
    assert.equal(await page.evaluate(() => window.testQueue.writes), 1);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Markdown", exact: true }).click();
    const download = await downloading;
    assert.equal(download.suggestedFilename(), "announcement-queue.md");
    assert.match(await page.locator("[data-save-status]").innerText(), /Downloaded only—not saved/);
    assert.equal(await page.locator("[data-save]").isEnabled(), true, "Downloading must not claim source was saved");
    const slugs = [...baseline.matchAll(/https:\/\/www\.gpeyre\.com\/blog\/preparations\/([a-z0-9-]+)\.html/g)].map(match => match[1]);
    const malformed = [
      [baseline.replace(/^## 1\. /m, "## "), /numbered title/],
      [baseline.replace(`${slugs[1]}.html`, `${slugs[0]}.html`), /unique article slugs/],
      [baseline.replace(/^> /m, "> Extra line\n> "), /single-line quoted announcement/],
      [baseline.replace(/^> /m, "  > Indented extra line\n> "), /unexpected content/],
      [baseline.replace(/\.html(?=\n)/, ".html extra words"), /exact gpeyre.com preview URL/],
      [baseline.replace(/^(> .+)$/m, "$1\nUnquoted continuation"), /unexpected content/],
      [baseline.replace(/^- \[x\] Ready to publish$/m, "- [x] Ready to publish\n- [ ] Ready to publish"), /exact readiness checkbox/]
    ];
    for (const [invalid, error] of malformed) {
      await page.evaluate(source => { window.testQueue.source = source; }, invalid);
      await page.getByRole("button", { name: "Open current Markdown", exact: true }).click();
      await waitStatus(error);
      assert.match(await page.locator("[data-save-status]").innerText(), error);
      assert.equal(await page.locator(".queue-card").count(), expected.length, "Rejected source must leave the previous view intact");
      assert.equal(await page.evaluate(() => window.testQueue.writes), 1, "Malformed source must never be written");
    }
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 950 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `No overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(url);
    assert.equal(await noJS.locator(".queue-card").count(), expected.length);
    assert.equal(await noJS.locator(".queue-ready input:enabled").count(), 0);
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => { window.showOpenFilePicker = undefined; });
    await fallback.goto(url); await fallback.locator('html[data-queue-ready="true"]').waitFor();
    await fallback.locator(".queue-ready input").first().setChecked(!originallyChecked);
    await fallback.getByRole("button", { name: "Save to source", exact: true }).click();
    assert.match(await fallback.locator("[data-save-status]").innerText(), /Direct saving is unavailable/);
    assert.deepEqual(errors, []);
    assert.equal(fs.readFileSync(sourcePath, "utf8"), baseline, "Browser tests must never modify the real queue");
    console.log("Queue: filtering, draft-only approval, explicit saving, conflicts, write denial, download, file-mode, mobile and no-JS checks passed.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
