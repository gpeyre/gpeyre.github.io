# Blog publication and announcement queue

Last reconciled on 5 November 2026. All 27 forthcoming posts are included below; 7 are explicitly approved, in the requested order. Completed posts are archived in [published.md](published.md), with their dates and final article links. `publication-log.json` remains the authoritative retry and deduplication record.

Explicit publication order approved on 1 November 2026 (this order takes precedence over topic alternation):

1. [Optimal Planar Matching and Crossings](https://www.gpeyre.com/blog/preparations/noncrossing-matchings-catalan.html)
2. [Averaging Positive Symmetric Matrices](https://www.gpeyre.com/blog/preparations/averaging-positive-symmetric-matrices.html)
3. [Logarithmic Sobolev is a Wasserstein P–L inequality](https://www.gpeyre.com/blog/preparations/logarithmic-sobolev-wasserstein-pl.html)
4. [From Classical to Quantum Pinsker Inequality](https://www.gpeyre.com/blog/preparations/quantum-pinsker-sign-observable.html)
5. [Wasserstein singular vectors: a distance that defines itself](https://www.gpeyre.com/blog/preparations/wasserstein-singular-vectors.html)
6. [Why KL belongs to two divergence families](https://www.gpeyre.com/blog/preparations/divergences-and-bregman-geometry.html)
7. [An Axiomatic Definition of the Wasserstein Distance](https://www.gpeyre.com/blog/preparations/optimal-transport-convex-extension.html)
8. [The perspective transform: convexity on measures](https://www.gpeyre.com/blog/preparations/perspective-transform-on-measures.html)
9. [Training (very) deep ResNets](https://www.gpeyre.com/blog/preparations/training-very-deep-resnets.html)
10. [Iterative projections: Dykstra and Douglas–Rachford](https://www.gpeyre.com/blog/preparations/projections-corrections-reflections.html)
11. [Intrinsic dynamics of overparameterized dynamics](https://www.gpeyre.com/blog/preparations/intrinsic-factor-training-dynamics.html)

The daily workflow publishes at most one approved article and its Bluesky announcement, at 07:00 Europe/Paris. Today’s Pinsker article is already published; the next approved article is Wasserstein singular vectors. A delayed run retains queue order and the one-post-per-day limit. No announcement is sent before the dated official article is verified live.

To approve an article and its quoted announcement, use the exact checkbox `- [x] Ready to publish`. All other forthcoming entries remain unchecked. The linked plan above records order only; it does not replace checkbox approval. Keep the original preview URL in each quoted announcement; only the outgoing message replaces it with the final dated canonical URL.

For posts outside the explicitly requested priority order, alternate OT/Wasserstein geometry and other topics where available, preserving relative order within each topic. Moser's interpolation is transport-related, but not generally optimal transport. Messages fit 280 Unicode graphemes with either address.

This is a private editorial file, excluded from the website build. Readiness changes must be committed and pushed before the scheduled publication run. Add every new forthcoming article with an unchecked readiness box and a short announcement.

## 1. Wasserstein singular vectors: a distance that defines itself

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> How can transport compare histograms with no given ground geometry? Wasserstein singular vectors learn sample and feature distances from each other. A fixed-point argument closes the loop. https://www.gpeyre.com/blog/preparations/wasserstein-singular-vectors.html

## 2. Why KL belongs to two divergence families

Topic: Other topics

- [x] Ready to publish

> KL compares density ratios and gaps above entropy tangent planes. Under smoothness assumptions, it is the only measure-level divergence in both families, up to scale. https://www.gpeyre.com/blog/preparations/divergences-and-bregman-geometry.html

## 3. An Axiomatic Definition of the Wasserstein Distance

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> On compact spaces, Kantorovich transport is the largest jointly convex, lower-semicontinuous extension of a continuous pointwise cost to measures. A short geometric proof. https://www.gpeyre.com/blog/preparations/optimal-transport-convex-extension.html

## 4. The perspective transform: convexity on measures

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> A small convexity trick connects f-divergences and dynamic optimal transport: the perspective transform. It turns density ratios into convex functionals of mass and momentum. https://www.gpeyre.com/blog/preparations/perspective-transform-on-measures.html

## 5. Training (very) deep ResNets

Topic: Other topics

- [x] Ready to publish

> Depth becomes time in a ResNet. Explore adjoint training, noncommuting linear flows, and a loss with no bad local minima—but increasingly flat saddles. https://www.gpeyre.com/blog/preparations/training-very-deep-resnets.html

## 6. Iterative projections: Dykstra and Douglas–Rachford

Topic: Other topics

- [x] Ready to publish

> Alternating projections find a feasible point, not necessarily the nearest one. Dykstra adds corrections; Douglas–Rachford uses reflections. Explore the geometry—and a Sudoku experiment. https://www.gpeyre.com/blog/preparations/projections-corrections-reflections.html

## 7. Intrinsic dynamics of overparameterized dynamics

Topic: Other topics

- [x] Ready to publish

> Training a matrix factorization usually depends on more than its product. With suitable initialization, a conserved imbalance gives a closed equation for the product itself. https://www.gpeyre.com/blog/preparations/intrinsic-factor-training-dynamics.html

## 8. Weak transport and mean-preserving spreads

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> With quadratic cost, weak transport can be written as a Wasserstein projection under convex order. This post explains the role of conditional means and mean-preserving spreads. https://www.gpeyre.com/blog/preparations/weak-transport-and-convex-order.html

## 9. In-context composition

Topic: Other topics

- [ ] Ready to publish

> Each attention layer changes both a token and its context. Our in-context composition accounts for both updates; on the space of measure–point pairs, it is ordinary composition. https://www.gpeyre.com/blog/preparations/in-context-composition.html

## 10. Why optimal transport respects a density cap

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> If two densities share a constant upper bound, so does their quadratic Wasserstein interpolation on a convex Euclidean domain. The proof uses a determinant inequality. https://www.gpeyre.com/blog/preparations/wasserstein-geodesics-density-caps.html

## 11. Bernstein polynomials on probability measures

Topic: Other topics

- [ ] Ready to publish

> Bernstein's averaging construction also applies to continuous functions of probability measures. On a compact space it gives uniform approximation, with an error controlled by sampling. https://www.gpeyre.com/blog/preparations/bernstein-polynomials-on-measures.html

## 12. Sinkhorn on Gaussians: an exact convergence rate

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> For centered 1D Gaussians, Sinkhorn reduces to a scalar recursion. We can compute its convergence rate exactly and see how it depends on regularization. https://www.gpeyre.com/blog/preparations/gaussian-sinkhorn-convergence.html

## 13. Polynomials of probability measures

Topic: Other topics

- [ ] Ready to publish

> On a compact domain, polynomials of probability measures approximate every continuous functional. The proof is an application of Stone–Weierstrass. https://www.gpeyre.com/blog/preparations/wasserstein-polynomials.html

## 14. Wasserstein distance without quantiles

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> In 1D, quadratic Wasserstein distance can be computed directly from CDFs, without inverting them. A triangle-area argument gives the formula. https://www.gpeyre.com/blog/preparations/wasserstein-distance-without-quantiles.html

## 15. The covariance of SGD iterates

Topic: Other topics

- [ ] Ready to publish

> For least squares with constant noise variance, fixed-step SGD has an isotropic stationary covariance to first order. Fourth moments determine the next correction. https://www.gpeyre.com/blog/preparations/sgd-iterate-covariance.html

## 16. Carefully placed particles versus random samples

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> For a uniform distribution on an interval, optimally placed particles have squared W2 error of order 1/n². Independent sampling gives order 1/n in expectation. https://www.gpeyre.com/blog/preparations/optimal-particles-versus-random-sampling.html

## 17. Optimal conditioning of low-rank adaptation

Topic: Other topics

- [ ] Ready to publish

> Rescaling matrix factors can slow training without changing their product. For exact low-rank matrix recovery, balancing gives optimal positive Hessian conditioning. https://www.gpeyre.com/blog/preparations/balanced-low-rank-conditioning.html

## 18. Two symmetric central limit theorems, two rates

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Coin flips and continuous uniform variables are both symmetric, but their normalized sums converge at different W1 rates: 1/√n and 1/n. The lattice explains the difference. https://www.gpeyre.com/blog/preparations/central-limit-wasserstein-constants.html

## 19. Conditioning of Non-Euclidean Gradient Descent

Topic: Other topics

- [ ] Ready to publish

> Euclidean gradient descent is rotation invariant; scaled sign descent is not. The relevant condition number depends on the norm used for descent. https://www.gpeyre.com/blog/preparations/sign-gradient-descent-geometry.html

## 20. Spectral Wasserstein distances

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Spectral Wasserstein distances account for the directions of transport displacements. I explain their robust-cost and dynamic formulations, with a point-cloud experiment. https://www.gpeyre.com/blog/preparations/spectral-wasserstein-distances.html

## 21. When the best low-rank tensor approximation does not exist

Topic: Other topics

- [ ] Ready to publish

> A best low-rank tensor approximation need not exist: a sequence of rank-two tensors can converge to a rank-three tensor. Here is an example with a short proof. https://www.gpeyre.com/blog/preparations/tensor-rank-without-best-approximation.html

## 22. Which statistics evolve on their own?

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> When does a statistic satisfy a closed equation during a Wasserstein gradient flow? For energies depending on one observable, a condition on its gradient gives the answer. https://www.gpeyre.com/blog/preparations/autonomous-wasserstein-statistics.html

## 23. Universality and invariance

Topic: Other topics

- [ ] Ready to publish

> Expressive sum-message-passing GNNs distinguish the 1-WL classes. On compact sets of bounded-size graphs, a final MLP gives approximation of continuous functions constant on those classes. https://www.gpeyre.com/blog/preparations/universality-and-invariance.html

## 24. c-transform as a generalized Legendre transform

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Averages of transport potentials stay in the class for metric costs and quadratic Euclidean costs. Other power costs can fail, as a one-dimensional counterexample shows. https://www.gpeyre.com/blog/preparations/c-transforms-and-averaging.html

## 25. Universal approximation from one nonlinearity

Topic: Other topics

- [ ] Ready to publish

> On a compact space, a separating real linear family containing constants is dense if its closure is stable under one fixed continuous non-affine operation. https://www.gpeyre.com/blog/preparations/universality-from-one-nonlinearity.html

## 26. Orthostochastic matrices and optimal transport

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Squaring an orthogonal matrix entrywise gives a doubly stochastic matrix. Optimizing a linear transport cost this way preserves the optimum, but can introduce suboptimal local minima. https://www.gpeyre.com/blog/preparations/orthostochastic-matrices.html

## 27. Doubly nonnegative and completely positive matrices

Topic: Other topics

- [ ] Ready to publish

> A positive semidefinite matrix with nonnegative entries need not have nonnegative Gram factors. A five-cycle gives a counterexample; Gaussian kernels do admit such features. https://www.gpeyre.com/blog/preparations/doubly-nonnegative-completely-positive.html
