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
  ["central-limit-wasserstein-constants", "clt", "Exact Wasserstein central-limit errors and rescaled CDF errors for symmetric Bernoulli and uniform random variables.", [4]],
  ["gaussian-sinkhorn-convergence", "gaussian", "Gaussian Sinkhorn coupling ellipses, exact error decay, and the number of cycles required as temperature decreases.", [-0.8, 5]],
  ["noncrossing-matchings-catalan", "matchings", "A noncrossing red-blue matching and the changing costs of one hundred uniformly sampled noncrossing matchings.", [10]],
  ["optimal-particles-versus-random-sampling", "quantization", "Empirical CDFs of random and optimally placed particles, compared with their exact Wasserstein error rates.", [18]],
  ["sgd-iterate-covariance", "sgd", "Exact covariance ellipses and transient and stationary variance curves for constant-step least-squares SGD.", [0.48, 7, 10]],
  ["wasserstein-distance-without-quantiles", "cdf", "Cumulative distributions, the CDF-only Wasserstein integrand, and its quadrature convergence.", [100]],
  ["wasserstein-geodesics-density-caps", "caps", "Densities and quantile derivatives along a Wasserstein geodesic remain within the endpoint density cap.", [0.3, 0.72]],
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
    const height = state.count === 3 ? 450 : 630;
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
