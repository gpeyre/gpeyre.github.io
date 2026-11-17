# Blog publication and announcement queue

Last reconciled on 14 November 2026; the Stein-operator article was approved on 17 November and appended to the ready sequence. All forthcoming posts are listed below. The first 10 entries are approved in the order below; some have since been published and await the next archive reconciliation. Completed posts are archived in [published.md](published.md), with their publication dates and final article links. `publication-log.json` remains the authoritative retry and deduplication record.

Explicit publication order approved on 14 November 2026, with the Stein article appended on 17 November:

1. [Orthostochastic matrices and optimal transport](https://www.gpeyre.com/blog/preparations/orthostochastic-matrices.html)
2. [Polynomials of probability measures](https://www.gpeyre.com/blog/preparations/wasserstein-polynomials.html)
3. [Why optimal transport respects a density cap](https://www.gpeyre.com/blog/preparations/wasserstein-geodesics-density-caps.html)
4. [The covariance of SGD iterates](https://www.gpeyre.com/blog/preparations/sgd-iterate-covariance.html)
5. [Which statistics evolve on their own?](https://www.gpeyre.com/blog/preparations/autonomous-wasserstein-statistics.html)
6. [Carefully placed particles versus random samples](https://www.gpeyre.com/blog/preparations/optimal-particles-versus-random-sampling.html)
7. [Optimal conditioning of low-rank adaptation](https://www.gpeyre.com/blog/preparations/balanced-low-rank-conditioning.html)
8. [When the best low-rank tensor approximation does not exist](https://www.gpeyre.com/blog/preparations/tensor-rank-without-best-approximation.html)
9. [Universality and invariance](https://www.gpeyre.com/blog/preparations/universality-and-invariance.html)
10. [Stein operators and probability discrepancies](https://www.gpeyre.com/blog/preparations/stein-operators-discrepancies.html)

The previous approved sequence is complete. This new sequence begins with the next daily publication, on 15 November. The author's explicit order takes precedence over topic alternation; the other entries remain unchecked and alternate optimal transport and other topics where possible. The local `announcement-queue.html` is the editorial view of this list, not an article to publish.

The daily workflow publishes at most one approved article and its Bluesky announcement, at 07:00 Europe/Paris. A delayed run retains queue order and the one-post-per-day limit. No announcement is sent before the dated official article is verified live.

To approve an article and its quoted announcement, use the exact checkbox `- [x] Ready to publish`. Keep the original preview URL in each quoted announcement; only the outgoing message replaces it with the final dated canonical URL.

Put approved entries first. An explicit publication order requested by the author takes precedence; otherwise alternate OT/Wasserstein geometry and other topics where available, preserving relative order within each topic. Moser's interpolation is transport-related, but not generally optimal transport. Messages fit 280 Unicode graphemes with either address.

This is a private editorial file, excluded from the website build. Readiness changes must be committed and pushed before the scheduled publication run. Add every new forthcoming article with an unchecked readiness box and a short announcement.

## 1. Orthostochastic matrices and optimal transport

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> Squaring an orthogonal matrix entrywise gives a doubly stochastic matrix. Optimizing a linear transport cost this way preserves the optimum, but can introduce suboptimal local minima. https://www.gpeyre.com/blog/preparations/orthostochastic-matrices.html

## 2. Polynomials of probability measures

Topic: Other topics

- [x] Ready to publish

> On a compact domain, polynomials of probability measures approximate every continuous functional. The proof is an application of Stone–Weierstrass. https://www.gpeyre.com/blog/preparations/wasserstein-polynomials.html

## 3. Why optimal transport respects a density cap

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> If two densities share a constant upper bound, so does their quadratic Wasserstein interpolation on a convex Euclidean domain. The proof uses a determinant inequality. https://www.gpeyre.com/blog/preparations/wasserstein-geodesics-density-caps.html

## 4. The covariance of SGD iterates

Topic: Other topics

- [x] Ready to publish

> For least squares with constant noise variance, fixed-step SGD has an isotropic stationary covariance to first order. Fourth moments determine the next correction. https://www.gpeyre.com/blog/preparations/sgd-iterate-covariance.html

## 5. Which statistics evolve on their own?

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> When does a statistic satisfy a closed equation during a Wasserstein gradient flow? For energies depending on one observable, a condition on its gradient gives the answer. https://www.gpeyre.com/blog/preparations/autonomous-wasserstein-statistics.html

## 6. Carefully placed particles versus random samples

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> For a uniform distribution on an interval, optimally placed particles have squared W2 error of order 1/n². Independent sampling gives order 1/n in expectation. https://www.gpeyre.com/blog/preparations/optimal-particles-versus-random-sampling.html

## 7. Optimal conditioning of low-rank adaptation

Topic: Other topics

- [x] Ready to publish

> Rescaling matrix factors can slow training without changing their product. For exact low-rank matrix recovery, balancing gives optimal positive Hessian conditioning. https://www.gpeyre.com/blog/preparations/balanced-low-rank-conditioning.html

## 8. When the best low-rank tensor approximation does not exist

Topic: Other topics

- [x] Ready to publish

> A best low-rank tensor approximation need not exist: a sequence of rank-two tensors can converge to a rank-three tensor. Here is an example with a short proof. https://www.gpeyre.com/blog/preparations/tensor-rank-without-best-approximation.html

## 9. Universality and invariance

Topic: Other topics

- [x] Ready to publish

> Expressive sum-message-passing GNNs distinguish the 1-WL classes. On compact sets of bounded-size graphs, a final MLP gives approximation of continuous functions constant on those classes. https://www.gpeyre.com/blog/preparations/universality-and-invariance.html

## 10. Stein operators and probability discrepancies

Topic: Other topics

- [x] Ready to publish

> Gaussian integration by parts characterizes the normal law. Taking the largest failure of a Stein identity over a unit ball relates Fisher information to sample-based discrepancies. https://www.gpeyre.com/blog/preparations/stein-operators-discrepancies.html

## 11. Sinkhorn on Gaussians: an exact convergence rate

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> For centered 1D Gaussians, Sinkhorn reduces to a scalar recursion. We can compute its convergence rate exactly and see how it depends on regularization. https://www.gpeyre.com/blog/preparations/gaussian-sinkhorn-convergence.html

## 12. Bernstein polynomials on probability measures

Topic: Other topics

- [ ] Ready to publish

> Bernstein's averaging construction also applies to continuous functions of probability measures. On a compact space it gives uniform approximation, with an error controlled by sampling. https://www.gpeyre.com/blog/preparations/bernstein-polynomials-on-measures.html

## 13. Wasserstein distance without quantiles

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> In 1D, quadratic Wasserstein distance can be computed directly from CDFs, without inverting them. A triangle-area argument gives the formula. https://www.gpeyre.com/blog/preparations/wasserstein-distance-without-quantiles.html

## 14. Conditioning of Non-Euclidean Gradient Descent

Topic: Other topics

- [ ] Ready to publish

> Euclidean gradient descent is rotation invariant; scaled sign descent is not. The relevant condition number depends on the norm used for descent. https://www.gpeyre.com/blog/preparations/sign-gradient-descent-geometry.html

## 15. Different convergence rates in the central limit theorem

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Coin flips and continuous uniform variables are both symmetric, but their normalized sums converge at different W1 rates: 1/√n and 1/n. The lattice explains the difference. https://www.gpeyre.com/blog/preparations/central-limit-wasserstein-constants.html

## 16. Universal approximation from one nonlinearity

Topic: Other topics

- [ ] Ready to publish

> On a compact space, a separating real linear family containing constants is dense if its closure is stable under one fixed continuous non-affine operation. https://www.gpeyre.com/blog/preparations/universality-from-one-nonlinearity.html

## 17. Spectral Wasserstein distances

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Spectral Wasserstein distances account for the directions of transport displacements. I explain their robust-cost and dynamic formulations, with a point-cloud experiment. https://www.gpeyre.com/blog/preparations/spectral-wasserstein-distances.html

## 18. Doubly nonnegative and completely positive matrices

Topic: Other topics

- [ ] Ready to publish

> A positive semidefinite matrix with nonnegative entries need not have nonnegative Gram factors. A five-cycle gives a counterexample; Gaussian kernels do admit such features. https://www.gpeyre.com/blog/preparations/doubly-nonnegative-completely-positive.html

## 19. c-transform as a generalized Legendre transform

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Averages of transport potentials stay in the class for metric costs and quadratic Euclidean costs. Other power costs can fail, as a one-dimensional counterexample shows. https://www.gpeyre.com/blog/preparations/c-transforms-and-averaging.html
