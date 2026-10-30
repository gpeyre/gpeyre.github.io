# Blog publication and announcement queue

Last reconciled on 30 October 2026. All 31 forthcoming posts are included below. The two explicitly validated posts are first, in the requested publication order. Completed posts are archived in [published.md](published.md), with their dates and final article links. `publication-log.json` remains the authoritative retry and deduplication record.

Next publications under the daily 07:00 Europe/Paris workflow (one article and its Bluesky announcement per day):

1. **31 October 2026 — Bures’ distance and square roots of covariances.** Do not publish before this date.
2. **1 November 2026 — Arithmetico-geometric means and their generalizations.** Publish after Bures, not on the same day.

These dates express the requested editorial plan; queue order and the checked approvals determine the next eligible articles. If a run is delayed, retain this order and the one-post-per-day rule. No announcement is sent before the article has been promoted to its dated official URL and verified live.

To approve an article and its quoted announcement, change its exact checkbox to `- [x] Ready to publish`. Only the two posts explicitly validated above have newly checked boxes; all other forthcoming entries remain under review.

The order alternates OT/Wasserstein geometry and other topics where available, preserving relative order within each topic. Moser’s interpolation is transport-related, but not generally optimal transport. Each block quote retains its original preview URL; only the outgoing announcement replaces it with the final dated canonical URL. Messages fit 280 Unicode graphemes with either address.

This is a private editorial file, excluded from the website build. Readiness changes must be committed and pushed before the scheduled publication run. Add every new forthcoming article with an unchecked readiness box and a short announcement.

## 1. Bures’ distance and square roots of covariances

Topic: OT / Wasserstein geometry

- [x] Ready to publish

> How far apart are two Gaussian covariances? Bures optimizes their alignment; linear OT fixes a reference. They agree exactly for commuting matrices—and differ by at most a factor √2. https://www.gpeyre.com/blog/preparations/bures-distance-square-root-covariances.html

## 2. Arithmetico-geometric means and their generalizations

Topic: Other topics

- [x] Ready to publish

> Iterate two means to get a third. Arithmetic + harmonic gives geometric; arithmetic + geometric gives AGM. When is the limit quasi-arithmetic? A rigidity theorem answers exactly. https://www.gpeyre.com/blog/preparations/arithmetico-geometric-means.html

## 3. An Axiomatic Definition of the Wasserstein Distance

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> On compact spaces, Kantorovich transport is the largest jointly convex, lower-semicontinuous extension of a continuous pointwise cost to measures. A short geometric proof. https://www.gpeyre.com/blog/preparations/optimal-transport-convex-extension.html

## 4. In-context composition

Topic: Other topics

- [ ] Ready to publish

> A transformer layer moves a token and its context together. Our in-context composition becomes ordinary composition on a lifted space—a bridge to advection and particle dynamics. https://www.gpeyre.com/blog/preparations/in-context-composition.html

## 5. Optimal Planar Matching and Crossings

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Optimal Euclidean matchings cannot cross. But removing crossings still leaves exponentially many candidates! Catalan numbers explain why uncrossing alone does not solve the problem. https://www.gpeyre.com/blog/preparations/noncrossing-matchings-catalan.html

## 6. Bernstein polynomials on probability measures

Topic: Other topics

- [ ] Ready to publish

> Sample, evaluate, average: a Bernstein polynomial on measures. On a compact space, this gives universal approximation, with rates that reveal the role of dimension. https://www.gpeyre.com/blog/preparations/bernstein-polynomials-on-measures.html

## 7. Weak transport and mean-preserving spreads

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> What if transport only paid for moving conditional means? Weak transport becomes a Wasserstein projection under convex order: first move the means, then spread mass for free. https://www.gpeyre.com/blog/preparations/weak-transport-and-convex-order.html

## 8. Polynomials of probability measures

Topic: Other topics

- [ ] Ready to publish

> Polynomials of probability measures? Products of expectations form an algebra. Stone–Weierstrass gives universal approximation of continuous functionals of measures on a compact domain. https://www.gpeyre.com/blog/preparations/wasserstein-polynomials.html

## 9. Why optimal transport respects a density cap

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Can optimal transport create overcrowding? In a convex Euclidean domain, a common constant cap on endpoint densities survives the whole quadratic Wasserstein geodesic. https://www.gpeyre.com/blog/preparations/wasserstein-geodesics-density-caps.html

## 10. The covariance of SGD iterates

Topic: Other topics

- [ ] Ready to publish

> In least squares with constant noise variance, fixed-step SGD has an isotropic stationary covariance to first order. An exact recursion reveals fourth-moment corrections and relaxation times. https://www.gpeyre.com/blog/preparations/sgd-iterate-covariance.html

## 11. The perspective transform: convexity on measures

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> A small convexity trick connects f-divergences and dynamic optimal transport: the perspective transform. It turns density ratios into convex functionals of mass and momentum. https://www.gpeyre.com/blog/preparations/perspective-transform-on-measures.html

## 12. Why KL belongs to two divergence families

Topic: Other topics

- [ ] Ready to publish

> KL compares density ratios and gaps above entropy tangent planes. Under smoothness assumptions, it is the only measure-level divergence in both families, up to scale. https://www.gpeyre.com/blog/preparations/divergences-and-bregman-geometry.html

## 13. Sinkhorn on Gaussians: an exact convergence rate

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Why does Sinkhorn slow down as regularization decreases? For centered 1D Gaussians, a covariance recursion gives an exact convergence rate and explains the low-temperature regime. https://www.gpeyre.com/blog/preparations/gaussian-sinkhorn-convergence.html

## 14. Optimal conditioning of low-rank adaptation

Topic: Other topics

- [ ] Ready to publish

> The same low-rank matrix can train at different speeds depending on its factors. A short Hessian calculation shows why balancing gives optimal Euclidean local conditioning. https://www.gpeyre.com/blog/preparations/balanced-low-rank-conditioning.html

## 15. Wasserstein distance without quantiles

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Can we compute 1D quadratic Wasserstein distance without inverting CDFs? A triangle-area identity gives a formula directly in terms of the CDFs, with a geometric proof. https://www.gpeyre.com/blog/preparations/wasserstein-distance-without-quantiles.html

## 16. Intrinsic dynamics of overparameterized dynamics

Topic: Other topics

- [ ] Ready to publish

> Can a factored matrix evolve on its own during training? A conserved imbalance supplies the missing information, giving a closed gradient-flow equation for the represented model. https://www.gpeyre.com/blog/preparations/intrinsic-factor-training-dynamics.html

## 17. Carefully placed particles versus random samples

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> For a uniform law on an interval, optimal particles have squared W2 error of order 1/n², versus order 1/n in expectation for random samples. Quantile-bin averages show how to choose the points. https://www.gpeyre.com/blog/preparations/optimal-particles-versus-random-sampling.html

## 18. Iterative projections: Dykstra and Douglas–Rachford

Topic: Other topics

- [ ] Ready to publish

> Alternating projections find a feasible point, not necessarily the nearest one. Dykstra adds corrections; Douglas–Rachford uses reflections. Explore the geometry—and a Sudoku experiment. https://www.gpeyre.com/blog/preparations/projections-corrections-reflections.html

## 19. Two symmetric central limit theorems, two rates

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Two symmetric distributions, two central-limit rates: coin flips converge like 1/√n, continuous uniforms like 1/n in W1. The difference is the lattice. https://www.gpeyre.com/blog/preparations/central-limit-wasserstein-constants.html

## 20. From Classical to Quantum Pinsker Inequality

Topic: Other topics

- [ ] Ready to publish

> How does entropy control the distance between quantum states? A direct proof of quantum Pinsker tests entropy curvature against a sign observable. The sharp constant survives noncommutativity. https://www.gpeyre.com/blog/preparations/quantum-pinsker-sign-observable.html

## 21. Spectral Wasserstein distances

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Wasserstein transport measures how far mass moves. Spectral Wasserstein distances also track its directions. A robust-cost interpretation, a dynamic formulation, and a Schatten-p experiment. https://www.gpeyre.com/blog/preparations/spectral-wasserstein-distances.html

## 22. Conditioning of Non-Euclidean Gradient Descent

Topic: Other topics

- [ ] Ready to publish

> Rotating a quadratic preserves its eigenvalues but can change how sign descent behaves. Norm-steepest descent reveals the relevant condition number—and why coordinate geometry matters. https://www.gpeyre.com/blog/preparations/sign-gradient-descent-geometry.html

## 23. Which statistics evolve on their own?

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Can one statistic evolve on its own while the whole distribution moves? A geometric criterion gives exact moment closure for a class of Wasserstein gradient flows. https://www.gpeyre.com/blog/preparations/autonomous-wasserstein-statistics.html

## 24. When the best low-rank tensor approximation does not exist

Topic: Other topics

- [ ] Ready to publish

> For tensors, a best low-rank approximation may not exist. Two rank-one terms can converge to a tensor that needs three. Two matrix slices and a determinant give an elementary proof. https://www.gpeyre.com/blog/preparations/tensor-rank-without-best-approximation.html

## 25. c-transform as a generalized Legendre transform

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Are averages of transport potentials still transport potentials? Quadratic costs say yes; most other power costs say no. Cost transforms and supporting shapes explain the difference. https://www.gpeyre.com/blog/preparations/c-transforms-and-averaging.html

## 26. Universality and invariance

Topic: Other topics

- [ ] Ready to publish

> What can a neural network distinguish—and approximate? For GNNs, 1-WL describes the blind spots. Concatenating features and adding an MLP turns separation into relative universality. https://www.gpeyre.com/blog/preparations/universality-and-invariance.html

## 27. Logarithmic Sobolev is a Wasserstein P–L inequality

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> Logarithmic Sobolev is a Polyak–Łojasiewicz inequality for entropy in Wasserstein geometry. A finite-length argument turns entropy decay into convergence of distributions. https://www.gpeyre.com/blog/preparations/logarithmic-sobolev-wasserstein-pl.html

## 28. Universal approximation from one nonlinearity

Topic: Other topics

- [ ] Ready to publish

> Stone–Weierstrass needs products—or does it? Closure under one continuous non-affine operation already gives universality. Taylor expansion and smoothing reveal the hidden algebra. https://www.gpeyre.com/blog/preparations/universality-from-one-nonlinearity.html

## 29. Wasserstein singular vectors: a distance that defines itself

Topic: OT / Wasserstein geometry

- [ ] Ready to publish

> How can transport compare histograms with no given ground geometry? Wasserstein singular vectors learn sample and feature distances from each other. A fixed-point argument closes the loop. https://www.gpeyre.com/blog/preparations/wasserstein-singular-vectors.html

## 30. Training (very) deep ResNets

Topic: Other topics

- [ ] Ready to publish

> Depth becomes time in a ResNet. Explore adjoint training, noncommuting linear flows, and a loss with no bad local minima—but increasingly flat saddles. https://www.gpeyre.com/blog/preparations/training-very-deep-resnets.html

## 31. Averaging Positive Symmetric Matrices

Topic: Other topics

- [ ] Ready to publish

> How should we average positive matrices? Compare log-Euclidean and Kubo–Ando geometric means—and the different logarithmic mean obtained by averaging a path. https://www.gpeyre.com/blog/preparations/averaging-positive-symmetric-matrices.html
