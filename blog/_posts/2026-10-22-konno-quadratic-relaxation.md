---
title: 'Konno’s quadratic relaxation: two copies, the same minimum'
subtitle: A one-line identity turns a quadratic interaction into two simpler subproblems.
description: An elementary exactness identity for quadratic optimization, its extension
  to regularized objectives, and its role in Gromov–Wasserstein computation.
date: '2026-10-22'
topic: Optimization
keywords:
- Konno relaxation
- quadratic programming
- QP
- convex quadratic maximization
- concave quadratic minimization
- bilinear splitting
- biconvex optimization
- exact relaxation
- feasible differences
- conditional negative definiteness
- negative-type kernels
- global optimality
- alternating minimization
- block coordinate descent
- majorization minimization
- difference-of-convex programming
- Gromov–Wasserstein distance
- GW
- unbalanced optimal transport
- transport polytope
- entropic regularization
- Sinkhorn scaling
- tensorized KL divergence
- conic formulation
- Hiroshi Konno
- Thibault Séjourné
- François-Xavier Vialard
- Gabriel Peyré
- Isaac Schoenberg
- Paul Tseng
- relaxation quadratique
- programmation quadratique
- dédoublement de variables
- transport non équilibré
proofs: true
---

When an optimization problem is difficult because a variable interacts with itself, a tempting idea is to introduce a second copy. Replace a quadratic term $$x^{\mathsf T}Qx$$ by a bilinear term $$x^{\mathsf T}Qy$$, and optimize alternately over $$x$$ and $$y$$. Each step is much simpler. But have we changed the problem? What prevents the two copies from exploiting their new freedom?

Hiroshi Konno identified a particularly elegant answer for convex quadratic maximization, or equivalently concave quadratic minimization [[1]](#ref-1). Under the appropriate sign condition, releasing the equality $$x=y$$ does not change the optimal value. Better still, either component of an optimal pair solves the original problem. The reason fits in a single quadratic identity.

With Thibault Séjourné and François-Xavier Vialard, we used an extension of this idea in our work on unbalanced Gromov–Wasserstein transport [[3]](#ref-3). The extension permits a general additional term, including entropy. Let us first isolate the elementary principle, then see what it does—and does not—say for transport algorithms.

<!--more-->

## Splitting a quadratic interaction

Let $$C\subset\mathbb R^d$$ be a nonempty convex feasible set, let $$Q=Q^{\mathsf T}$$, and let $$r:C\to\mathbb R$$. Consider

$$
p=\inf_{x\in C} E(x),
  \qquad E(x)=\frac12 x^{\mathsf T}Qx+r(x).
$$

The function $$r$$ may be linear, an entropy, a norm penalty, or another regularizer. The constraints stay in $$C$$. Introduce the symmetric two-variable objective

$$
F(x,y)=\frac12 x^{\mathsf T}Qy
       +\frac{r(x)+r(y)}2,
  \qquad x,y\in C.
$$

Because $$F(x,x)=E(x)$$, its infimum $$p_{\mathrm{split}}$$ always satisfies $$p_{\mathrm{split}}\le p$$: allowing two distinct copies can only lower a minimum. This is a relaxation. If $$r$$ is convex, $$F$$ is convex in each variable separately, so it is *biconvex*. It need not be jointly convex.

Konno’s original setting has $$r$$ linear, $$C$$ polyhedral, and $$Q\preceq0$$. His papers formulate the equivalent problem with the opposite sign, as convex quadratic maximization [[1]](#ref-1), [[2]](#ref-2). For exactness, the relevant sign condition is actually weaker:

$$
(x-y)^{\mathsf T}Q(x-y)\le0
  \quad\text{for every }x,y\in C.
$$

Only feasible differences matter. For example, take

$$
Q=\begin{pmatrix}0&1\\1&0\end{pmatrix},
 \qquad
 C=\{x\in\mathbb R_+^2:x_1+x_2=1\}.
$$

The matrix has eigenvalues $$1$$ and $$-1$$. Yet every feasible difference has the form $$z=(t,-t)$$, so $$z^{\mathsf T}Qz=-2t^2\le0$$. The positive curvature points out of the affine space allowed by the constraints.

<span id="theorem-1"></span>

**Theorem 1 (exact splitting).** Suppose the sign condition above holds. Then

$$
\inf_{x,y\in C}F(x,y)=\inf_{x\in C}E(x).
$$

The equality also holds if both infima are $$-\infty$$. If $$(x_*,y_*)$$ is a global minimizer of $$F$$, both $$x_*$$ and $$y_*$$ are global minimizers of $$E$$. No convexity assumption on $$r$$ is needed.

<details class="blog-proof">
<summary>Proof: compare with the two diagonal points</summary>

<div class="blog-proof-body" markdown="1">

Expand the quadratic form. The terms involving $$r$$ cancel, leaving

$$
F(x,y)-\frac{E(x)+E(y)}2
 =-\frac14(x-y)^{\mathsf T}Q(x-y)\ge0.
$$

Thus $$F(x,y)\ge p$$, while the diagonal already gives $$p_{\mathrm{split}}\le p$$. If $$p=-\infty$$, the diagonal alone gives equality. No existence assumption is needed. If an optimal pair exists, its value is finite because $$F$$ is real-valued, and

$$
p\le\frac{E(x_*)+E(y_*)}2
 \le F(x_*,y_*)=p.
$$

Each diagonal value is at least $$p$$, so both must equal $$p$$.

</div>
</details>

This proof also gives a practical rounding rule: for *any* feasible pair, at least one of $$x$$ and $$y$$ has original energy no larger than $$F(x,y)$$. A globally near-optimal pair therefore yields a near-optimal original solution simply by choosing the better component.

Nothing in the argument uses finite dimension. Replace $$x^{\mathsf T}Qy$$ by any finite symmetric bilinear form on a real vector space, with the same sign condition on feasible differences. The conclusion is unchanged. This is useful when the unknown is a measure rather than a vector; continuity and compactness enter only if one wants to establish existence of minimizers.

<span id="corollary-1"></span>

**Corollary 1 (when the copies coincide).** Under Theorem 1, every global minimizer satisfies $$x_*=y_*$$ if either the sign inequality is strict whenever $$x\ne y$$, or $$r$$ is strictly convex on $$C$$.

<details class="blog-proof">
<summary>Proof: the only possible disagreement is a flat direction</summary>

<div class="blog-proof-body" markdown="1">

Equality in the preceding identity forces $$(x_*-y_*)^{\mathsf T}Q(x_*-y_*)=0$$, proving the first assertion. For the second, put $$m=(x_*+y_*)/2$$. The quadratic part is affine along this segment because its second derivative in the segment direction is zero. If $$x_*\ne y_*$$, strict convexity of $$r$$ therefore gives

$$
E(m)<\frac{E(x_*)+E(y_*)}2=p,
$$

a contradiction.

</div>
</details>

The distinction between the two conclusions matters: exactness of the optimal *value* does not by itself force every optimal pair onto the diagonal. For example, if $$Q=0$$ and $$r=0$$, every pair is optimal.

## What happens without the sign condition?

Take $$C=[-1,1]$$, $$Q=2$$, and $$r=0$$. The original energy is $$E(x)=x^2$$, with minimum $$0$$. Its split version is $$F(x,y)=xy$$, with minimum $$-1$$, attained at $$(1,-1)$$ and $$(-1,1)$$. The new freedom really changes the answer.

The sign condition is sufficient, not necessary: on $$C=[0,1]$$, the same two objectives both have minimum zero. What the theorem provides is a guarantee that works for *every* additional term $$r$$, rather than an exact characterization for each individual objective.

There is also a quantitative version. Suppose $$p$$ is finite, $$C$$ has finite diameter $$D$$, and

$$
z^{\mathsf T}Qz\le\eta\|z\|^2
 \quad\text{for }z=x-y,\quad x,y\in C,
$$

If this holds with $$\eta\ge0$$, the same identity gives

$$
p-\frac{\eta D^2}{4}
 \le p_{\mathrm{split}}\le p.
$$

A small positive curvature in feasible directions controls how much the relaxation can underestimate the true minimum. This estimate concerns the global optima, independently of the algorithm used to search for them.

## From exactness to an algorithm

Assume again the sign condition, and now suppose $$r$$ is convex. Fixing $$y$$ leaves the convex subproblem

$$
\min_{x\in C}\;x^{\mathsf T}Qy+r(x).
$$

Whenever these subproblems attain their minima, alternating the two variables decreases $$F$$. Konno developed this perspective together with cutting-plane methods [[1]](#ref-1), [[2]](#ref-2). General convergence results for block-coordinate methods require additional assumptions and usually concern stationary points [[4]](#ref-4).

There is a second useful reading. Linearize only the concave quadratic part at the current point $$x$$. The resulting function

$$
M_x(z)=r(z)+z^{\mathsf T}Qx
              -\frac12x^{\mathsf T}Qx
$$

satisfies $$M_x(x)=E(x)$$ and

$$
E(z)-M_x(z)
 =\frac12(z-x)^{\mathsf T}Q(z-x)\le0.
$$

If $$x^+$$ minimizes $$M_x$$, then $$E(x^+)\le M_x(x^+)\le M_x(x)=E(x)$$. This gives a single-variable descent method: update one copy and put both copies at the new point. The subproblem is the same as above, but its guarantee concerns $$E$$ directly. Since the sign condition makes $$-x^{\mathsf T}Qx/2$$ convex on $$C$$, this is also the usual difference-of-convex update.

Exactness is nevertheless a statement about *global* minimizers. Take $$E(x)=-x^2+x/2$$ on $$[-1,1]$$. Its global minimizer is $$-1$$, with value $$-3/2$$. At $$x=y=1$$, each block update minimizes a linear function with negative slope, so it selects $$1$$ again. The algorithm remains at value $$-1/2$$, although each separate subproblem is solved exactly.

## Gromov–Wasserstein: the constraints supply the sign

Optimal transport usually compares points through a cross-cost. Gromov–Wasserstein transport instead compares the *relationships* between pairs of points: a good matching should preserve internal distances [[5]](#ref-5). This naturally creates a quadratic interaction.

Let $$A\in\mathbb R^{n\times n}$$ and $$B\in\mathbb R^{m\times m}$$ be symmetric distance or dissimilarity matrices. Given strictly positive probability vectors $$a,b$$, transport plans belong to

$$
\Pi(a,b)=\{\pi\ge0:
     \pi\mathbf1=a,\ \pi^{\mathsf T}\mathbf1=b\}.
$$

Define the bilinear distortion

$$
\mathcal G(\pi,\gamma)
 =\sum_{i,j,k,\ell}
      (A_{ik}-B_{j\ell})^2\pi_{ij}\gamma_{k\ell}.
$$

The regularized objective is

$$
E_\varepsilon(\pi)=\mathcal G(\pi,\pi)
          +\varepsilon\,\mathrm{KL}(\pi\mid a\otimes b),
$$

where $$\mathrm{KL}(\pi\mid a\otimes b)=\sum_{ij}\pi_{ij}\log(\pi_{ij}/(a_ib_j))$$, with $$0\log0=0$$. Entropic regularization makes each transport update accessible to Sinkhorn scaling [[6]](#ref-6), [[7]](#ref-7).

A symmetric matrix $$A$$ is *conditionally negative semidefinite* if $$u^{\mathsf T}Au\le0$$ whenever $$\sum_i u_i=0$$. These negative-type kernels have a long history, notably in Schoenberg’s work [[8]](#ref-8). For squared Euclidean dissimilarities $$A_{ik}=\Vert x_i-x_k\Vert ^2$$, the property is immediate:

$$
u^{\mathsf T}Au
 =-2\left\|\sum_i u_ix_i\right\|^2
 \quad\text{if }\sum_i u_i=0.
$$

Ordinary Euclidean distances also have this property [[8]](#ref-8). Conditional concavity in matching problems is studied systematically by Maron and Lipman [[9]](#ref-9).

<span id="theorem-2"></span>

**Theorem 2 (balanced transport splitting).** If $$A$$ and $$B$$ are conditionally negative semidefinite and $$\varepsilon\ge0$$, then the relaxation

$$
\inf_{\pi,\gamma\in\Pi(a,b)}
 \left\{\mathcal G(\pi,\gamma)
 +\frac\varepsilon2
 \left[\mathrm{KL}(\pi\mid a\otimes b)
       +\mathrm{KL}(\gamma\mid a\otimes b)\right]\right\}
$$

has the same value as $$\inf_{\pi\in\Pi(a,b)}E_\varepsilon(\pi)$$. If $$\varepsilon>0$$, every globally optimal pair has $$\pi=\gamma$$.

<details class="blog-proof">
<summary>Proof: zero marginals remove the unwanted terms</summary>

<div class="blog-proof-body" markdown="1">

For two feasible plans, $$Z=\pi-\gamma$$ has zero row and column sums. Expanding the squared difference therefore cancels the $$A_{ik}^2$$ and $$B_{j\ell}^2$$ terms:

$$
\mathcal G(Z,Z)
 =-2\sum_{i,j,k,\ell}A_{ik}B_{j\ell}Z_{ij}Z_{k\ell}
 =-2\operatorname{tr}(AZBZ^{\mathsf T}).
$$

Let $$H_n=I_n-\mathbf1\mathbf1^{\mathsf T}/n$$, and define $$H_m$$ similarly. Conditional negativity says $$P=-H_nAH_n\succeq0$$ and $$R=-H_mBH_m\succeq0$$. Since $$Z=H_nZH_m$$,

$$
\operatorname{tr}(AZBZ^{\mathsf T})
 =\operatorname{tr}(PZRZ^{\mathsf T})
 =\|P^{1/2}ZR^{1/2}\|_{\mathrm F}^2\ge0.
$$

Thus the quadratic distortion is nonpositive on feasible differences. Apply Theorem 1 to the vector of entries of $$\pi$$, taking its quadratic form to be $$2\mathcal G$$. The entropy is strictly convex, so Corollary 1 gives the last assertion.

</div>
</details>

The transport polytope is compact and these objectives are continuous, so the minima here are attained. The entropy forces agreement between the two copies at a global optimum; it does not establish uniqueness of the original transport plan or convexity of the joint objective.

## What changes when mass is unbalanced?

In unbalanced transport the marginal constraints are penalized rather than imposed. For arbitrary nonnegative masses $$u$$ and a strictly positive reference $$v$$, the appropriate KL divergence includes the mass corrections:

$$
\mathrm{KL}(u\mid v)
 =\sum_i\left[u_i\log\frac{u_i}{v_i}-u_i+v_i\right].
$$

These last two terms cancel for probability vectors, recovering the earlier definition. They must be retained when mass can vary. Our construction uses tensorized divergences, such as

$$
\mathrm{KL}(\pi_1\otimes\pi_1\mid a\otimes a),
$$

where $$\pi_1$$ is the first marginal. Splitting replaces $$\pi\otimes\pi$$ by $$\pi\otimes\gamma$$. It again gives a lower bound. With KL penalties and positive entropy regularization, fixing a nonzero copy gives a convex unbalanced transport problem solvable by generalized Sinkhorn iterations [[3]](#ref-3), [[10]](#ref-10).

<details class="blog-proof">
<summary>Details: why product entropy separates only at fixed mass</summary>

<div class="blog-proof-body" markdown="1">

<span id="lemma-1"></span>

**Lemma 1 (tensorization of KL).** Let $$a,b$$ be strictly positive probability vectors, and let $$u,v$$ be nonnegative vectors with masses $$M=\sum_i u_i$$ and $$N=\sum_jv_j$$. Then

$$
\begin{aligned}
 \mathrm{KL}(u\otimes v\mid a\otimes b)
 &=N\,\mathrm{KL}(u\mid a)
   +M\,\mathrm{KL}(v\mid b)\\
 &\quad +(M-1)(N-1).
\end{aligned}
$$

At $$M=N=1$$, this is a sum of two separate entropies. With variable masses, the weights and correction couple the two arguments. This is the finite-dimensional form of the identity in [[3, Appendix D.2]](#ref-3).

<details class="blog-proof">
<summary>Proof: expand the logarithm of a product</summary>

<div class="blog-proof-body" markdown="1">

Writing $$S(u)=\sum_i u_i\log(u_i/a_i)$$ and $$T(v)=\sum_jv_j\log(v_j/b_j)$$, direct expansion gives

$$
\mathrm{KL}(u\otimes v\mid a\otimes b)
 =N S(u)+M T(v)-MN+1.
$$

Substitute $$S(u)=\mathrm{KL}(u\mid a)+M-1$$ and $$T(v)=\mathrm{KL}(v\mid b)+N-1$$. The formula also covers zero entries by the convention $$0\log0=0$$.

</div>
</details>

</div>
</details>

However, $$\pi-\gamma$$ no longer has zero marginals, so the cancellation in Theorem 2 is unavailable. Moreover, tensorized marginal penalties are not simply a sum $$r(\pi)+r(\gamma)$$. The general exactness theorem must therefore not be applied automatically. Our paper proves tightness for balanced entropic GW and for its separate conic formulation under the stated kernel conditions; it leaves tightness of the general unbalanced divergence relaxation open [[3, Section 3.1]](#ref-3).

Konno’s identity provides an exactness guarantee, while convexity of the separate terms provides tractable updates. Neither property makes a local search globally reliable. Keeping those distinctions clear lets us use the splitting confidently where its hypotheses hold—and recognize what remains to be proved elsewhere.

## References

<ol class="references">
  <li id="ref-1">Hiroshi Konno. <a href="https://doi.org/10.1007/BF01580380">Maximization of a convex quadratic function under linear constraints</a>. <em>Mathematical Programming</em> 11, 117–127, 1976.</li>
  <li id="ref-2">Hiroshi Konno. <a href="https://doi.org/10.15807/jorsj.23.171">Maximizing a convex quadratic function over a hypercube</a>. <em>Journal of the Operations Research Society of Japan</em> 23(2), 171–189, 1980. <a href="https://orsj.org/wp-content/or-archives50/pdf/e_mag/Vol.23_02_171.pdf">Open PDF</a>.</li>
  <li id="ref-3">Thibault Séjourné, François-Xavier Vialard, and Gabriel Peyré. <a href="https://arxiv.org/abs/2009.04266">The Unbalanced Gromov Wasserstein Distance: Conic Formulation and Relaxation</a>. arXiv:2009.04266, 2020; version 3, 2023.</li>
  <li id="ref-4">Paul Tseng. <a href="https://doi.org/10.1023/A:1017501703105">Convergence of a block coordinate descent method for nondifferentiable minimization</a>. <em>Journal of Optimization Theory and Applications</em> 109, 475–494, 2001. <a href="https://www.mit.edu/~dimitrib/PTseng/papers/archive/bcr_jota.pdf">Open PDF</a>.</li>
  <li id="ref-5">Facundo Mémoli. <a href="https://doi.org/10.1007/s10208-011-9093-5">Gromov–Wasserstein distances and the metric approach to object matching</a>. <em>Foundations of Computational Mathematics</em> 11, 417–487, 2011.</li>
  <li id="ref-6">Marco Cuturi. <a href="https://arxiv.org/abs/1306.0895">Sinkhorn distances: Lightspeed computation of optimal transportation distances</a>. <em>Advances in Neural Information Processing Systems</em> 26, 2013.</li>
  <li id="ref-7">Gabriel Peyré, Marco Cuturi, and Justin Solomon. <a href="https://proceedings.mlr.press/v48/peyre16.html">Gromov–Wasserstein averaging of kernel and distance matrices</a>. <em>Proceedings of the 33rd International Conference on Machine Learning</em>, PMLR 48, 2664–2672, 2016.</li>
  <li id="ref-8">Isaac Jacob Schoenberg. <a href="https://doi.org/10.1090/S0002-9947-1938-1501980-0">Metric spaces and positive definite functions</a>. <em>Transactions of the American Mathematical Society</em> 44(3), 522–536, 1938. <a href="https://pages.stat.wisc.edu/~wahba/stat860public/pdf1/schoenberg.1938.pdf">Open PDF</a>.</li>
  <li id="ref-9">Haggai Maron and Yaron Lipman. <a href="https://arxiv.org/abs/1807.09722">(Probably) concave graph matching</a>. <em>Advances in Neural Information Processing Systems</em> 31, 2018.</li>
  <li id="ref-10">Lénaïc Chizat, Gabriel Peyré, Bernhard Schmitzer, and François-Xavier Vialard. <a href="https://doi.org/10.1090/mcom/3303">Scaling algorithms for unbalanced optimal transport problems</a>. <em>Mathematics of Computation</em> 87, 2563–2609, 2018. <a href="https://arxiv.org/abs/1607.05816">Preprint</a>.</li>
</ol>
