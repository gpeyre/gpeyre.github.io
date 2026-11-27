#!/usr/bin/env node
/* Reproducible, data-faithful captures of the existing OT numerical experiments.
 * This script only changes capture-time layout; all curves come from the live XP.
 */
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {stripMetadata}=require("./blog-summary-jpeg.cjs");
const { chromium } = require(process.env.BLOG_PLAYWRIGHT_PATH || "/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const base = process.env.BLOG_CAPTURE_BASE || "http://127.0.0.1:4197";
const definitions = [
  ["autonomous-wasserstein-statistics", "moments", "Two different particle clouds approach the unit circle while their common signed-distance moment follows the same exponential decay.", [1.6]],
  ["bernstein-polynomials-on-measures", "bernstein", "The Bernstein particle polynomial smooths the corner of the absolute-value functional of a two-point probability law.", [10]],
  ["central-limit-wasserstein-constants", "clt", "Normalized Bernoulli sums in blue and continuous uniform sums in red, shown as probability-preserving bars against dashed standard Gaussian curves, above their Wasserstein and rescaled CDF errors.", [7]],
  ["gaussian-sinkhorn-convergence", "gaussian", "A Gaussian Sinkhorn coupling ellipse with its aligned marginal densities above and to the left; dashed curves show the exact solution, and a dot marks the selected cycle on the marginal-error plot.", [-1, 2]],
  ["noncrossing-matchings-catalan", "matchings", "A noncrossing red-blue matching and the changing costs of one hundred uniformly sampled noncrossing matchings.", [10]],
  ["optimal-particles-versus-random-sampling", "quantization", "Empirical CDFs of random and optimally placed particles, compared with their exact Wasserstein error rates.", [18]],
  ["sgd-iterate-covariance", "sgd", "Exact covariance ellipses and transient and stationary variance curves for constant-step least-squares SGD.", [0.48, 7, 10]],
  ["wasserstein-distance-without-quantiles", "cdf", "Cumulative distributions, the CDF-only Wasserstein integrand, and its quadrature convergence.", [100]],
  ["wasserstein-geodesics-density-caps", "caps", "Two localized Gaussian mixtures and their intermediate Wasserstein density, below a common dashed density cap, beside their interpolated quantiles.", [0.5, 0.22, 2, 2]],
  ["weak-transport-and-convex-order", "weak", "A quadratic optimal-transport coupling, its barycentric projection, and the conditional means of a weak-transport solution.", []],
  ["composing-optimal-transport-maps", "composition", "Two Gaussian optimal transport maps composed together, the direct Brenier map, and their exact excess-cost comparison.", [35]],
  ["monge-gap-inversions", "monge", "A kernel regression fit penalized by the Monge gap, with noisy observations and its sorted evaluations.", [-0.2]],
  ["energy-distance-wasserstein-convexity", "energy", "Energy-distance flow at an intermediate time: one-dimensional quantiles, planar particle trajectories, and decreasing normalized energies.", [42]],
];

const jobs = definitions.map(([slug, topic, alt, state]) => ({
  slug, topic, alt, state,
  source: `/blog/preparations/assets/ot-lab/index.html?topic=${topic}`,
}));

async function changeRange(page, index, value) {
  const range = page.locator('#controls input[type="range"]').nth(index);
  await range.evaluate((el, next) => {
    el.value = String(Math.max(+el.min, Math.min(+el.max, next)));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function capture(page, job, output) {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on("pageerror", onError);
  try {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(base + job.source, { waitUntil: "networkidle" });
    await page.locator("#plots svg polyline, #plots svg circle, #plots svg polygon").first().waitFor({ state: "attached" });
    for (let i = 0; i < job.state.length; i++) await changeRange(page, i, job.state[i]);
    if (job.topic === "matchings") {
      await page.getByRole("button", { name: "Explore 100 random matchings", exact: true }).click();
    }
    if (job.topic === "weak") {
      await page.getByRole("button", { name: "Refine weak solution", exact: true }).click();
    }
    await page.waitForFunction(() => {
      const s = document.querySelector("#status").textContent;
      return s.length > 10 && !s.includes("refining...") && !s.includes("Numerical error");
    }, null, { timeout: 45000 });
    // A short settling interval lets the final requested animation-frame draw finish.
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => ({
      title: document.querySelector("#title").textContent,
      status: document.querySelector("#status").textContent,
      controls: [...document.querySelectorAll('#controls input[type="range"]')].map(el => ({
        label: el.parentElement.querySelector("span").textContent, value: el.value,
      })),
      count: document.querySelectorAll("#plots .plot").length,
      finite: [...document.querySelectorAll("#plots svg")].every(svg => !/(?:NaN|Infinity)/.test(svg.innerHTML)),
      marks: document.querySelectorAll("#plots svg polyline, #plots svg circle, #plots svg polygon").length,
    }));
    if (!state.finite || state.marks < 2 || errors.length) {
      throw Error(`Invalid plotted state for ${job.slug}: ${JSON.stringify({ state, errors })}`);
    }
    const height = job.topic === "clt" ? 1000 : state.count === 3 ? 450 : 630;
    await page.addStyleTag({ content: `
      html, body { width:1200px!important; min-width:1200px!important; margin:0!important; background:#f5f9fa!important; }
      body { height:${height}px!important; overflow:hidden!important; }
      main { width:1200px!important; max-width:none!important; height:${height}px!important; padding:24px 26px!important; margin:0!important; }
      article { height:100%!important; display:flex!important; flex-direction:column!important; justify-content:center!important; }
      .eyebrow, #description, #controls, #status, #caveat, noscript { display:none!important; }
      h2 { font:600 25px/1.22 system-ui,sans-serif!important; text-align:center!important; margin:0 0 22px!important; color:#213940!important; }
      #plots { gap:14px!important; margin:0!important; align-items:start!important; }
      #plots.one { width:760px!important; max-width:760px!important; align-self:center!important; }
      #plots.one svg { max-height:500px!important; }
      .plot { border:1px solid #d7e3e6!important; border-radius:8px!important; background:#fff!important; padding:13px 4px 7px!important; }
      .plot h3 { font:550 14px/1.3 system-ui,sans-serif!important; margin:0 8px 1px!important; min-height:2.6em!important; color:#31494f!important; }
    ` });
    if (job.topic === "gaussian") {
      // Preserve both full SVG view boxes inside the two-panel social image.
      await page.addStyleTag({ content: `
        .gaussian-lab h2 { margin-bottom:10px!important; }
        .gaussian-lab .gs-legend { margin:0 0 12px!important; }
        .gaussian-lab #plots svg { height:440px!important; width:100%!important; }
        .gaussian-lab .plot h3 { min-height:0!important; margin-bottom:4px!important; }
        .gaussian-lab .gs-panel-note { display:none!important; }
      ` });
    }
    if (job.topic === "clt") {
      await page.addStyleTag({ content: `
        .clt-lab h2 { margin-bottom:12px!important; }
        .clt-lab .clt-legend { margin-bottom:14px!important; }
        .clt-lab #plots { grid-template-columns:repeat(2,minmax(0,1fr))!important; }
        .clt-lab #plots svg { height:360px!important; width:100%!important; }
        .clt-lab .plot h3 { min-height:0!important; margin-bottom:5px!important; }
      ` });
    }
    await page.setViewportSize({ width: 1200, height });
    await fs.writeFile(output,stripMetadata(await page.screenshot({ type: "jpeg", quality: 88, fullPage: false })));
    const stat = await fs.stat(output);
    if (stat.size > 1000000) throw Error(`Image exceeds Bluesky size limit: ${output}`);
    return {
      slug: job.slug,
      path: `/blog/imgs/summaries/${job.slug}.jpg`,
      width: 1200, height,
      alt: job.alt,
      source: job.source,
      capture_state: state,
      bytes: stat.size,
    };
  } finally {
    page.off("pageerror", onError);
  }
}

module.exports = { jobs, capture };

if (require.main === module) {
  (async () => {
    const selected = process.argv.slice(2);
    const chosen = selected.length ? jobs.filter(job => selected.includes(job.slug)) : jobs;
    if (selected.length && chosen.length !== selected.length) throw Error("Unknown or duplicate selected capture slug");
    const folder = path.resolve(__dirname, "../blog/imgs/summaries");
    await fs.mkdir(folder, { recursive: true });
    const browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    const results = [];
    try {
      for (const job of chosen) {
        results.push(await capture(page, job, path.join(folder, job.slug + ".jpg")));
        process.stdout.write(`Captured ${job.slug}\n`);
      }
    } finally { await browser.close(); }
    const fragment = "/private/tmp/blog-summary-ot-fragment.json";
    await fs.writeFile(fragment, JSON.stringify(results, null, 2) + "\n");
    process.stdout.write(`Manifest fragment: ${fragment}\n`);
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
