# Blog publication and announcement queue

Last reconciled on 27 November 2026. All forthcoming posts are listed below. Completed posts are archived in [published.md](published.md), with their publication dates and canonical article links. `publication-log.json` remains the authoritative retry and deduplication record.

Explicit publication order approved on 27 November 2026:

1. [Doubly nonnegative and completely positive matrices](https://www.gpeyre.com/blog/preparations/doubly-nonnegative-completely-positive.html)
2. [Sinkhorn on Gaussians: an exact convergence rate](https://www.gpeyre.com/blog/preparations/gaussian-sinkhorn-convergence.html)
3. [Conditioning of Non-Euclidean Gradient Descent](https://www.gpeyre.com/blog/preparations/sign-gradient-descent-geometry.html)
4. [Different convergence rates in the central limit theorem](https://www.gpeyre.com/blog/preparations/central-limit-wasserstein-constants.html)

The author's explicit order takes precedence over topic alternation. The remaining entries are unchecked. The local `announcement-queue.html` is the editorial view of this list, not an article to publish.

The daily workflow publishes at most one approved article and its Bluesky announcement, at 07:00 Europe/Paris. A delayed run retains queue order and the one-post-per-day limit. No announcement is sent before the dated official article is verified live.

To approve an article and its quoted announcement, use the exact checkbox `- [x] Ready to publish`. Keep the original preview URL in each quoted announcement; only the outgoing message replaces it with the final dated canonical URL.

Put approved entries first. An explicit publication order requested by the author takes precedence; otherwise alternate OT/Wasserstein geometry and other topics where available, preserving relative order within each topic. Moser's interpolation is transport-related, but not generally optimal transport. Messages fit 280 Unicode graphemes with either address.

This is a private editorial file, excluded from the website build. Readiness changes must be committed and pushed before the scheduled publication run. Add every new forthcoming article with an unchecked readiness box and a short announcement.

## 1. Sinkhorn on Gaussians: an exact convergence rate

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> For centered 1D Gaussians, Sinkhorn reduces to a scalar recursion. We can compute its convergence rate exactly and see how it depends on regularization. https://www.gpeyre.com/blog/preparations/gaussian-sinkhorn-convergence.html

## 2. Conditioning of Non-Euclidean Gradient Descent

Topic: Other topics

- [x] Ready to publish

> Euclidean gradient descent is rotation invariant; scaled sign descent is not. The relevant condition number depends on the norm used for descent. https://www.gpeyre.com/blog/preparations/sign-gradient-descent-geometry.html

## 3. Different convergence rates in the central limit theorem

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> Coin flips and continuous uniform variables are both symmetric, but their normalized sums converge at different W1 rates: 1/√n and 1/n. The lattice explains the difference. https://www.gpeyre.com/blog/preparations/central-limit-wasserstein-constants.html

## 4. Bernstein polynomials on probability measures

Topic: Other topics

- [ ] Ready to publish

> Bernstein's averaging construction also applies to continuous functions of probability measures. On a compact space it gives uniform approximation, with an error controlled by sampling. https://www.gpeyre.com/blog/preparations/bernstein-polynomials-on-measures.html

## 5. Wasserstein distance without quantiles

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> In 1D, quadratic Wasserstein distance can be computed directly from CDFs, without inverting them. A triangle-area argument gives the formula. https://www.gpeyre.com/blog/preparations/wasserstein-distance-without-quantiles.html

## 6. Universal approximation from one nonlinearity

Topic: Other topics

- [ ] Ready to publish

> On a compact space, a separating real linear family containing constants is dense if its closure is stable under one fixed continuous non-affine operation. https://www.gpeyre.com/blog/preparations/universality-from-one-nonlinearity.html

## 7. Spectral Wasserstein distances

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Spectral Wasserstein distances account for the directions of transport displacements. I explain their robust-cost and dynamic formulations, with a point-cloud experiment. https://www.gpeyre.com/blog/preparations/spectral-wasserstein-distances.html

## 8. c-transform as a generalized Legendre transform

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Averages of transport potentials stay in the class for metric costs and quadratic Euclidean costs. Other power costs can fail, as a one-dimensional counterexample shows. https://www.gpeyre.com/blog/preparations/c-transforms-and-averaging.html
