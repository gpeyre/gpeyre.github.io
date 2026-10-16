---
title: "When is independence optimal transport?"
subtitle: "Precisely when the cost has no interaction left to optimize."
description: "An exact criterion for independent sampling to solve optimal transport, with a short centered-interaction proof, orthogonal supports, and the high-temperature limit of entropic transport."
topic: Optimal transport
keywords:
  - "independent coupling"
  - "product measure"
  - "optimal transport"
  - "separable cost"
  - "additive cost decomposition"
  - "rectangular cross-differences"
  - "centered interaction"
  - "double centering"
  - "marginal-preserving perturbation"
  - "transport polytope"
  - "relative interior"
  - "linear programming"
  - "two-by-two cycles"
  - "quantitative suboptimality bound"
  - "orthogonal supports"
  - "quadratic transport cost"
  - "dual potentials"
  - "entropic optimal transport"
  - "Sinkhorn algorithm"
  - "mutual information"
  - "Kullback–Leibler divergence"
  - "high-temperature limit"
  - "logistic formula"
  - "Pinsker inequality"
  - "total variation convergence"
  - "Cédric Villani"
  - "Marco Cuturi"
  - "Gabriel Peyré"
  - "couplage indépendant"
  - "mesure produit"
  - "coût séparable"
  - "supports orthogonaux"
  - "régularisation entropique"
proofs: true
---

The simplest way to couple two distributions is to sample them independently. No matching algorithm, no sorting, no optimization: draw $$X\sim\alpha$$ and $$Y\sim\beta$$ independently. Their joint law $$\alpha\otimes\beta$$ always has the desired marginals.

Could this effortless coupling already be an optimal transport? Under compactness and continuity assumptions, there is an exact answer: only when every coupling has the same cost. The cost must separate into a source-only term plus a target-only term on the two supports. The statement is [Proposition 3.29 of my book](https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.3.3.29) [[1]](#ref-book). Its proof can be made very short by subtracting the row and column means of the cost.

<!--more-->

## The freedom that a coupling represents

Let $$\alpha,\beta$$ be probability measures with compact metric supports $$A=\operatorname{supp}\alpha$$ and $$B=\operatorname{supp}\beta$$, and let $$c:A\times B\to\mathbb R$$ be continuous. A coupling $$\pi\in\Pi(\alpha,\beta)$$ is a joint distribution whose first marginal is $$\alpha$$ and second marginal is $$\beta$$. The transport problem is

$$
  \operatorname{OT}_c(\alpha,\beta)
  =\min_{\pi\in\Pi(\alpha,\beta)}\int c(x,y)\,d\pi(x,y).
$$

Each coupling chooses a dependence structure while keeping both individual distributions fixed. The independent coupling is one feasible choice. In a finite transport matrix with strictly positive marginal weights, all its entries are positive: it sits in the relative interior of the feasible polytope. A linear objective can be minimized there only if it is constant along every feasible direction. The theorem below is the continuous version of this observation.

<span id="theorem-1"></span>
**Theorem 1 (independence is optimal exactly in the separable case).** Under the assumptions above, the following are equivalent:

1. The product coupling $$\alpha\otimes\beta$$ is optimal.
1. There are continuous functions $$u:A\to\mathbb R$$, $$v:B\to\mathbb R$$ with $$c(x,y)=u(x)+v(y)$$ on $$A\times B$$.
1. Every coupling in $$\Pi(\alpha,\beta)$$ is optimal.

Equivalently, all rectangular cross-differences vanish:

$$
  c(x,y)+c(x',y')-c(x,y')-c(x',y)=0.
$$

<details class="blog-proof">
<summary>Proof: perturb independence in the direction of the centered interaction</summary>
<div class="blog-proof-body" markdown="1">

Write the row mean, column mean, and total mean as

$$
  \begin{aligned}
  a(x)&=\int c(x,y)\,d\beta(y),\\
  b(y)&=\int c(x,y)\,d\alpha(x),\\
  m&=\iint c(x,y)\,d\alpha(x)\,d\beta(y).
  \end{aligned}
$$

The centered interaction is

$$
  r(x,y)=c(x,y)-a(x)-b(y)+m.
$$

It is continuous and has zero mean in each row and each column. Indeed, integrating over $$y$$ gives $$a(x)-a(x)-m+m=0$$, and similarly over $$x$$. Hence, for $$0<t\le1/\|r\|_\infty$$ when $$r\ne0$$,

$$
  d\pi_t=(1-tr(x,y))\,d\alpha(x)\,d\beta(y)
$$

is nonnegative and has exactly the same marginals. The separable terms are orthogonal to $$r$$, so

$$
  \int c\,d\pi_t
  =m-t\iint cr\,d\alpha\,d\beta
  =m-t\iint r^2\,d\alpha\,d\beta.
$$

If the product is optimal, the last integral must vanish. Therefore $$r=0$$ almost everywhere. Since $$r$$ is continuous and the product law has full support on $$A\times B$$, it vanishes everywhere. Thus $$c=a+b-m$$ is separable.

Conversely, a separable cost has the same integral $$\int u\,d\alpha+\int v\,d\beta$$ for every coupling. Finally, separability implies vanishing cross-differences. If all cross-differences vanish, fix $$x_0,y_0$$ and write

$$
  c(x,y)=c(x,y_0)+c(x_0,y)-c(x_0,y_0),
$$

which is separable. $$\square$$

</div>
</details>

The proof also gives a quantitative statement. When $$r\not\equiv0$$, choosing $$t=1/\|r\|_\infty$$ still gives a nonnegative coupling, and therefore

$$
  \int c\,d(\alpha\otimes\beta)-\operatorname{OT}_c(\alpha,\beta)
  \ge\frac{\|r\|_{L^2(\alpha\otimes\beta)}^2}{\|r\|_\infty}.
$$

The perturbation has a simple meaning: reduce mass where the cost is higher than its row-and-column prediction, and increase mass where it is lower. Centering makes these changes cancel separately in every marginal. Compactness keeps the direction bounded; continuity upgrades an almost-everywhere conclusion to one on the full supports. With merely measurable costs or noncompact supports, the theorem needs corresponding integrability and almost-everywhere qualifications.

## The smallest possible cycle

For two points on each side, keeping the row and column sums fixed permits the perturbation

$$
  \pi\longmapsto
  \pi+t\begin{pmatrix}1&-1\\-1&1\end{pmatrix}.
$$

At a product matrix with positive weights, both signs of small $$t$$ are feasible. The cost changes by

$$
  t\bigl(c_{11}+c_{22}-c_{12}-c_{21}\bigr).
$$

Unless this slope is zero, one sign improves the independent plan. The continuous proof uses a distributed version of this same mass exchange. This also connects with transport duality: a cost $$u(x)+v(y)$$ is exactly saturated by a pair of dual potentials everywhere, so every feasible plan has the same primal value. General duality and optimality conditions are treated in [[2]](#ref-villani).

## Quadratic cost: orthogonal supports are the exception

For $$c(x,y)=\lVert x-y\rVert^2$$, the rectangular cross-difference is

$$
  -2\langle x-x',y-y'\rangle.
$$

Let $$U=\operatorname{span}(A-A)$$ and $$V=\operatorname{span}(B-B)$$. Theorem 1 gives the following exact characterization.

<span id="corollary-1"></span>
**Corollary 1.** For compactly supported laws and squared Euclidean cost, independence is optimal if and only if $$U\perp V$$.

A Dirac marginal is one possibility, because its difference span is $$\{0\}$$. But it is not the only possibility: a source on a horizontal line and a target on a vertical line also work, even when both are diffuse. More generally the supports may lie in orthogonal affine subspaces. If both supports have nonempty interior in the same positive-dimensional Euclidean space, independence cannot be optimal.

## Why entropic transport approaches independence

There is an apparent tension with entropic regularization, where diffuse couplings are desirable. The regularized problem is

$$
  \min_{\pi\in\Pi(\alpha,\beta)}
  \left\{\int c\,d\pi
  +\varepsilon\,\mathrm{KL}(\pi\mid\alpha\otimes\beta)\right\}.
$$

Here $$\varepsilon>0$$. If $$d\pi=p\,d(\alpha\otimes\beta)$$, the relative entropy is $$\int p\log p\,d(\alpha\otimes\beta)$$, with $$0\log0=0$$; it is $$+\infty$$ if no such density exists. For fixed marginals, it is also the mutual information of the two coordinates. It penalizes dependence and is uniquely minimized by the product.

This is the setting behind Sinkhorn algorithms [[3]](#ref-cuturi), [[4]](#ref-computational). Yet for a nonseparable cost, independence is not the minimizer at any finite positive $$\varepsilon$$: near the product, the cost decreases to first order while the entropy changes only to second order.

<details class="blog-proof">
<summary>Proof: linear cost improvement beats the quadratic entropy penalty</summary>
<div class="blog-proof-body" markdown="1">

Use $$d\pi_t=(1-tr)\,d(\alpha\otimes\beta)$$ from Theorem 1. Since $$r$$ is bounded and has mean zero, Taylor expansion at $$1$$ gives

$$
  \mathrm{KL}(\pi_t\mid\alpha\otimes\beta)
  =\tfrac12t^2\int r^2\,d(\alpha\otimes\beta)+O(t^3).
$$

The cost change is exactly $$-t\int r^2\,d(\alpha\otimes\beta)$$. For $$r\ne0$$, the sum is negative for sufficiently small positive $$t$$, at every fixed finite $$\varepsilon$$. If $$r=0$$, the cost is constant over couplings and the entropy selects the product uniquely. $$\square$$

</div>
</details>

For an explicit two-point example, take source points $$\pm e_1$$ and target points $$\pm v_\theta$$, where $$v_\theta=(\cos\theta,\sin\theta)$$, all with weight $$1/2$$. Every coupling is described by a single number:

$$
  \pi(t)=
  \begin{pmatrix}t&1/2-t\\1/2-t&t\end{pmatrix},
  \qquad 0\le t\le1/2.
$$

Independence corresponds to $$t=1/4$$. For $$0\le\theta\le\pi/2$$, the squared-distance cost is

$$
  C_\theta(t)=2+2\cos\theta-8t\cos\theta.
$$

When the directions are not orthogonal, increasing the diagonal pairing lowers the cost. At the orthogonal angle, the cost becomes constant: all couplings, including independence, are optimal.

The regularized solution is

$$
  t_\varepsilon
  =\frac{1}{2\bigl(1+\exp(-4\cos\theta/\varepsilon)\bigr)}.
$$

<details class="blog-proof">
<summary>Calculation: a logistic interpolation between matching and independence</summary>
<div class="blog-proof-body" markdown="1">

For $$\pi(t)$$, the entropy relative to the uniform product matrix is

$$
  K(t)=2t\log(4t)+2(1/2-t)\log(2-4t).
$$

On $$0<t<1/2$$, its derivative is $$2\log(t/(1/2-t))$$. Setting the derivative of $$C_\theta(t)+\varepsilon K(t)$$ to zero gives

$$
  \log\frac{t}{1/2-t}=\frac{4\cos\theta}{\varepsilon},
$$

and therefore the stated formula. Strict convexity of $$K$$ makes this the unique minimizer. For $$0\le\theta<\pi/2$$, it tends to $$1/2$$ as $$\varepsilon\downarrow0$$, and to the independent value $$1/4$$ as $$\varepsilon\to\infty$$. At the orthogonal angle it equals $$1/4$$ for every positive temperature.

</div>
</details>

The infinite-regularization limit is different. Comparing a minimizer $$\pi_\varepsilon$$ with the product gives

$$
  \mathrm{KL}(\pi_\varepsilon\mid\alpha\otimes\beta)
  \le\frac{\max c-\min c}{\varepsilon}.
$$

Thus the entropy tends to zero as $$\varepsilon\to\infty$$, and Pinsker's inequality gives convergence to independence in total variation. Independence is a natural high-entropy limit, but an exact unregularized optimum only when the coupling has no effect on the cost.

## References

  1. <span id="ref-book"></span> Gabriel Peyré. [*Optimal Transport for Machine Learners*](https://arxiv.org/abs/2505.06589), 2025–2026. [Proposition 3.29, p. 56](https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.3.3.29).
  1. <span id="ref-villani"></span> Cédric Villani. [*Topics in Optimal Transportation*](https://doi.org/10.1090/gsm/058). Graduate Studies in Mathematics 58, American Mathematical Society, 2003.
  1. <span id="ref-cuturi"></span> Marco Cuturi. [*Sinkhorn Distances: Lightspeed Computation of Optimal Transport*](https://papers.nips.cc/paper_files/paper/2013/hash/af21d0c97db2e27e13572cbf59eb343d-Abstract.html). NeurIPS, 2013.
  1. <span id="ref-computational"></span> Gabriel Peyré and Marco Cuturi. [*Computational Optimal Transport*](https://arxiv.org/abs/1803.00567). *Foundations and Trends in Machine Learning* 11(5–6), 355–607, 2019.
