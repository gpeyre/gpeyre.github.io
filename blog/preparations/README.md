# Forthcoming blog posts: public alpha previews

The public preview index is `/blog/preparations/`, linked from the blog archive.
Serve the pages over HTTP and open `index.html` to review the standalone HTML
articles; the training worker requires an HTTP origin. Each article uses
the shared files in `assets/`; mathematical typesetting loads MathJax from its
CDN, so the initial equation rendering requires an Internet connection.

The HTML pages and assets are included in the website build. Only this README
is excluded in `_config.yml`. The index and every article visibly identify the
content as an alpha preview and use `noindex,follow` until the finished posts
are published. These files are not Jekyll posts and have no publication dates
or RSS/Atom entries. Publishing a finished article should create a selected
dated post in `blog/_posts`, then update its preview to link to that article.

The index offers search across both published and forthcoming articles. Each
preview has a `<meta name="keywords">` list of at least 18 specific terms.
After changing article metadata or adding a preview, run
`ruby scripts/build-blog-search.rb` from the repository root and include the
updated catalogue. See `../README.md` for search authoring and verification.

## Heat equation over quantiles

`heat-equation-over-quantiles.html` derives the one-dimensional quantile isometry,
the exact JKO reformulation on the monotone cone in L2, and the smooth quantile
PDE for internal energies. Negative Shannon entropy gives the heat equation;
the Gaussian example distinguishes a finite JKO step from exact heat evolution.
Numbered statements and folded proofs follow the shared mathematical style.

`assets/heat-quantiles/` evaluates the analytic heat evolution of a three-Gaussian
mixture and numerically inverts its CDF. Controls set 8–120 tracked mass ranks,
the initial cluster separation, and time, with paused-by-default playback.
The density, quantile graph, and noncrossing trajectories share rank colors.
Changing the point count does not discretize or otherwise alter the underlying
heat solution; neither infinite endpoint quantile is sampled. The experiment
does not numerically solve the JKO scheme. Run `node tests/blog-heat-quantiles.test.js`
and `tests/blog-heat-quantiles-browser.test.js` for CDF inversion, PDE consistency,
Gaussian benchmarks, conservation laws, playback, and mobile layout.

## Spectral Wasserstein distances

`spectral-wasserstein-distances.html` presents the displacement second-moment
definition, the cost-robust minimax reformulation, and a Benamou–Brenier proof
using conditional Eulerian velocities. The paper's convex-gauge results are
distinguished from the extension proved in the post: Schatten exponents
`p >= 1/2` retain the metric and dynamic formula, whereas the convex robust
formulation requires `p >= 1`. A three-measure example shows failure of the
triangle inequality below `1/2`.

`assets/spectral-transport/` compares two intricate, uniformly weighted point
clouds, with point-count and exponent sliders, an operator-norm endpoint,
displacement interpolation, and the uncentered second-moment ellipse. A Hungarian
assignment oracle supplies conditional-gradient steps for the convex cases.
The infinity endpoint uses smooth spectral approximation with its error included
in the reported numerical optimality bound. Below one, multistart search returns
a feasible matching without claiming global optimality. No entropy is added.
Run `node tests/blog-spectral-transport.test.js` to verify spectral calculations,
optimization certificates, marginal constraints, and mass conservation.
`tests/blog-spectral-transport-browser.test.js` checks the embedded controls,
zero-width lazy loading, and responsive sizing.

## Perspective transform

`perspective-transform-on-measures.html` develops closed perspectives and their
reference-independent integral on measures, with numbered results and nested
proof disclosures. The main examples are Csiszár divergences and the quadratic
Benamou–Brenier action; coarse-graining and the dynamic Wasserstein–Fisher–Rao
model provide further applications. The action uses kinetic energy with a
factor one-half, so its transport value is `W2²/2`. No general equivalence is
claimed between arbitrary KL-marginal-penalized OT and the dynamic reaction
model. The article remains an undated alpha preview, outside the feeds.

Portrait credits are in the article: Csiszár (Konrad Jacobs/MFO, CC BY-SA 2.0
Germany), Brenier (MFO, CC BY-SA 2.5), and the watermarked group photograph
showing Benamou with Virginie Ehrlacher and Daniel Matthes (Tatjana Ruf/MFO,
CC BY-SA 2.0 Germany). Files are unmodified; retain the complete Benamou group
image and its MFO watermark.

## Attention token sample complexity

The attention article was published on 16 October 2026. Its source is now
`../_posts/2026-10-16-token-sample-complexity-attention.md`;
`token-sample-complexity-attention.html` redirects to the published URL and is
excluded from the forthcoming list and search catalogue.

The embedded experiment in `assets/attention-sampling/` compares five Gaussian
sample streams with the exact linear population attention. Counts are nested
within each stream, and the token-count control uses a logarithmic scale.
Reported root-mean-square errors are finite-window Gaussian quadrature for
individual contexts, not an expectation over contexts. Run
`node tests/attention-sampling.test.js` and the browser checks in
`tests/attention-sampling-browser.test.js` after changing it.

## OT4ML idea collection

The fifteen selected topics in `../ideas/ot4ml-blog-post-ideas.tex` and its
three `notes/` inputs have individual previews. The source dossiers remain
authoring material: `_config.yml` excludes `blog/ideas` from the public build.
The preview index groups articles by subject, with no publication dates.

| Dossier | Preview |
| --- | --- |
| 1 | `monge-gap-inversions.html` |
| 2 | `autonomous-wasserstein-statistics.html` |
| 3 | `gaussian-gromov-wasserstein-counterexample.html` |
| 5 | `wasserstein-geodesics-density-caps.html` |
| 6 | `central-limit-wasserstein-constants.html` |
| 7 | `divergences-and-bregman-geometry.html` |
| 9 | `energy-distance-wasserstein-convexity.html` |
| 13 | `composing-optimal-transport-maps.html` |
| 19 | `wasserstein-distance-without-quantiles.html` |
| 21 | `noncrossing-matchings-catalan.html` |
| 23 | Published: `/blog/2026/10/17/when-independence-is-optimal/` |
| 24 | `optimal-transport-convex-extension.html` |
| 27 | `bernstein-polynomials-on-measures.html` |
| 34 | `optimal-particles-versus-random-sampling.html` |
| 55 | `weak-transport-and-convex-order.html` |

The Bernstein article complements the existing qualitative
`wasserstein-polynomials.html` article with a constructive operator and rates.

### Embedded experiments

`assets/ot-lab/` adapts the supplied offline numerical companion. A single
experiment is selected with `index.html?topic=weak` (or another topic ID).
Articles embed it in an iframe whose height follows its contents through
`assets/idea-experiments.js`, including responsive controls and stacked mobile
plots. The diagrams work directly from local files as well as over HTTP.
They do not upload data or need a numerical CDN. MathJax for article equations
is loaded separately, as in the existing previews.

The thirteen experiments cover the eleven supplied prototypes plus exact
two-point illustrations of independent couplings and the convex extension.
The Gaussian GW and divergence articles are proof-focused. The independence
article was published with the date 17 October 2026, without its numerical
experimentation section or interactive figure. Its analytic two-point example
is retained in the entropic-transport discussion. The former preview URL
redirects to the published post; the standalone lab demo remains available to
the other numerical authoring tools.

`data.js` contains the supplied fixed-seed CLT profiles, energy trajectories,
weak-transport reference, and independent SciPy fixtures. Only those three
experiments load this data bundle; the others use the small numerical core.
Changing the CLT
selection or energy time replays these computed data; the captions say so.
All other controls evaluate exact formulas or recompute the stated numerical
optimization. Monge regression uses damped Newton and reports a
strong-convexity bound for its smoothed objective error (with a roundoff floor);
weak transport reports a Frank–Wolfe certificate and marginal residual.
The distinction between exact formula, finite iterate, asymptotic result, and
Monte Carlo realization is kept in each article and experiment.

Changes from the prototype include equal spatial scales in geometric panels,
standard-Gaussian samples consistent with the composition cost, an exact
composition-excess curve, stable mode-centered Bernstein sums, and direct
rescaled CLT errors. The uniform CLT distances have also been recomputed:
the original signed-integral quadrature missed zeros exactly on its grid
(including the symmetry zero), cancelling positive and negative error lobes.
The corrected distances integrate the absolute CDF error without cancellation.
The input files under `blog/ideas` are not edited.

The second review adds true binomial jumps to the CLT display, readable
logarithmic axes and selected-sample markers, and current-iterate markers on
the energy curves. The CDF experiment integrates diagonal triangles at their
centroids, clips its heatmap to the ordered triangle, and displays convergence
against an exact answer. The matching experiment includes an explicit
three-pair local trap from the proof. Monge fits are deterministic at each
slider position; finite-difference derivative tests and strong-convexity
checks guard against inaccurate or history-dependent solutions.

Run `node tests/blog-ideas.test.js` for the numerical checks and
`python3 tests/blog-clt-data.test.py` (NumPy and SciPy required) to independently
verify every stored uniform CLT distance by continuous-CDF quadrature. Run
`tests/blog-preparations-browser.test.js` with `BLOG_PLAYWRIGHT_PATH`,
`BLOG_PREVIEW_URL`, and optionally `BLOG_SCREENSHOT_DIR` to exercise the
figures, sliders, dragging, proof tabs, mathematical rendering, and mobile
layouts. `BLOG_TEST_ONLY=experiments` or `articles` selects one part. Tests
write screenshots only to the specified temporary directory, not the site.

The shared scripts deliberately do not schedule or publish any of these
previews as dated posts, and the existing RSS/Atom entries remain unchanged.

## Gaussian Sinkhorn

`gaussian-sinkhorn-convergence.html` adds the centered Gaussian covariance
recursion and its exact scalar convergence factor. Its interactive companion
uses `assets/gaussian-sinkhorn-core.js` and the `gaussian` experiment topic.
The temperature slider is logarithmic; all trajectories use closed-form
cross-ratio coordinates, with errors evaluated directly in the log domain.
The covariance ellipses are joint laws of two scalar variables, not spatial
marginals. Run `node tests/blog-gaussian-sinkhorn.test.js` for independent
recurrence, covariance, relative-entropy, and rate checks. This preview has
no date or feed entry, like the other forthcoming articles.

## Covariance of SGD iterates

`sgd-iterate-covariance.html` develops the exact least-squares moment recursion,
its stationary covariance and its small-step expansion, with an explicit
distinction between covariance and the second moment about the minimizer.
The `sgd` topic in the shared lab loads `assets/sgd-covariance-core.js`.
It evaluates exact two-dimensional Gaussian-feature moments using a stable
2-by-2 matrix-power formula; no Monte Carlo trajectories are used. The ellipses
are covariance summaries, not claims of a Gaussian stationary distribution.
The controls remain inside a stated sufficient mean-square stability bound.
Run `node tests/blog-sgd-covariance.test.js` to check the independent recurrence,
stationary solutions, asymptotic orders, and long-time numerical stability.

## Max and softmax experiment

The max/softmax experiment retains a tangent-plane construction for its 1D
reference. Its 2D max and LSE networks are fitted independently with Adam in
assets/max-softmax-train.js, using nonuniform seeded initializations and free
affine slopes and offsets. A worker keeps training and dense evaluation off the
main thread; changed controls supersede pending jobs. Completed fits are cached
locally for repeated settings. The displays report validation losses and sampled
errors; the tangent-grid certificates from the theoretical construction do not
apply to these trained fits.
The heatmaps and 3D softmax surface use a 201-by-201 evaluation grid, independent
of network width. The 3D max surface uses the exact clipped affine faces.
Analytic LSE gradients give smooth normals without blurring model values.
Both 3D panels share a camera, height scale, and studio
lighting with view-dependent specular highlights. The max keeps flat facet
normals; the LSE uses its smooth analytic normals. The target remains available
in the separate 2D contour views, without a wireframe over the 3D surfaces.
Run node tests/blog-max-softmax.test.js to check parameter gradients, deterministic
training, free affine parameters, sampled values, and analytic surface normals.

Image credits are also given in the relevant articles:

- Marshall H. Stone: University of Chicago Photographic Archive, apf1-07972,
  educational and scholarly use permission, copied unchanged from the existing
  blog asset. https://photoarchive.lib.uchicago.edu/rights.html
- Karl Weierstrass: Smithsonian Institution Libraries, public domain, copied
  unchanged from the existing blog asset.
  https://commons.wikimedia.org/wiki/File:Karl_Weierstrass.jpg
- Werner Fenchel (1972): Konrad Jacobs, Oberwolfach Photo Collection, unchanged.
  https://commons.wikimedia.org/wiki/File:Werner_Fenchel.jpeg
  CC BY-SA 2.0 Germany: https://creativecommons.org/licenses/by-sa/2.0/de/deed.en
