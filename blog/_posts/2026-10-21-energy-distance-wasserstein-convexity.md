---
title: 'Energy distance: convexity hidden in the ordering'
subtitle: An attractive–repulsive particle energy becomes convex when the particles
  live on a line.
description: Why the energy distance is Wasserstein convex on the line, how its quantiles
  evolve, and an explicit two-dimensional counterexample.
date: '2026-10-21'
topic: Gradient flows
keywords:
- energy distance
- maximum mean discrepancy
- MMD
- distance kernel
- reproducing kernel Hilbert space
- RKHS
- Wasserstein gradient flow
- displacement convexity
- mixture convexity
- attractive–repulsive interactions
- quantile functions
- quantile cone
- cumulative distribution functions
- one-dimensional transport
- interaction energy
- implicit Euler scheme
- proximal step
- subgradient flow
- monotone resolvent
- atomic mass splitting
- particle descent
- mollification
- backtracking line search
- two-dimensional counterexample
- Richard Duong
- Gabriele Steidl
- Dino Sejdinovic
- Gabriel Peyré
- distance d'énergie
- convexité géodésique
- flot de gradient
- fonctions quantiles
- attraction et répulsion
proofs: true
embedded_experiment: true
---

Suppose we want to move a distribution towards a target. A natural loss attracts its points towards the target while repelling them from one another: attraction finds the right location, and repulsion prevents everything from collapsing to a single point. The *energy distance* implements exactly this idea using ordinary Euclidean distances.

Looking at the repulsive interaction, one might expect a difficult nonconvex problem. On the real line, however, its Wasserstein geometry is particularly simple: the repulsion is linear in quantile coordinates, and the whole objective is convex. The explanation has less to do with smoothness than with the fact that particles can be ordered. This is the mechanism behind the interaction criterion in [Proposition 15.18 of my book](https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.15.2.18) [[1]](#ref-book) and the quantile-flow analysis of Duong and collaborators [[2]](#ref-flow).

<!--more-->

## A discrepancy made out of distances

Let $$\alpha,\beta\in\mathcal P_2(\mathbb R^d)$$, the probability measures with finite second moment. Take independent random variables $$X,X'\sim\alpha$$ and $$Y,Y'\sim\beta$$. We use the convention

$$
  E_\beta(\alpha)
  =2\,\mathbb E|X-Y|-\mathbb E|X-X'|-\mathbb E|Y-Y'|.
$$

The last term is constant during optimization. The first attracts $$\alpha$$ to $$\beta$$; the negative self-interaction rewards spreading the source points. The entire expression is nevertheless nonnegative and vanishes exactly when $$\alpha=\beta$$. It is also a squared maximum mean discrepancy: one may write its signed-measure quadratic form with the distance kernel $$k(x,y)=-\lvert x-y\rvert$$, or use the positive-semidefinite anchored kernel

$$
  k_o(x,y)=|x-o|+|y-o|-|x-y|.
$$

The anchoring terms disappear when integrated against $$\alpha-\beta$$, whose total mass is zero. This link between distance statistics and kernel statistics is developed in [[3]](#ref-kernel). The unanchored kernel itself is not positive semidefinite on arbitrary coefficients.

As a squared Hilbert-space discrepancy, $$E_\beta$$ is convex under *mixtures* of measures in every dimension. More precisely,

$$
  \begin{aligned}
  E_\beta((1-t)\alpha_0+t\alpha_1)
  ={}&(1-t)E_\beta(\alpha_0)+tE_\beta(\alpha_1)\\
     &-t(1-t)E_{\alpha_1}(\alpha_0).
  \end{aligned}
$$

This follows by expanding the three quadratic forms. It does not yet say anything about moving the locations of particles: mixtures change how much mass follows each law, whereas Wasserstein interpolation moves the mass itself.

On the line, positivity has an especially concrete expression. With $$F_\alpha(x)=\alpha((-\infty,x])$$,

$$
  E_\beta(\alpha)
  =2\int_{\mathbb R}|F_\alpha(x)-F_\beta(x)|^2\,dx.
$$

<details class="blog-proof">
<summary>Proof: express distance through threshold crossings</summary>
<div class="blog-proof-body" markdown="1">

For real $$u,v$$,

$$
  |u-v|=\int_{\mathbb R}
  |\mathbf 1_{\{u\le x\}}-\mathbf 1_{\{v\le x\}}|\,dx.
$$

Independence gives

$$
  \mathbb E|X-Y|
  =\int\bigl[F_\alpha(1-F_\beta)+F_\beta(1-F_\alpha)\bigr]\,dx.
$$

Apply the same identity to the two self-interaction terms and cancel: the remaining integrand is $$2(F_\alpha-F_\beta)^2$$. Finite first moments justify the finite expressions. $$\square$$

</div>
</details>

In higher dimensions one can average this one-dimensional identity over projected directions: Euclidean distance is a positive constant times the spherical average of absolute projected distance. Nonnegativity follows. Equality first gives identical projected laws for almost every direction, then for every direction by continuity of characteristic functions, and hence identical original laws.

## Convexity in the right coordinates

For $$0<r<1$$, let

$$
  Q_\alpha(r)=\inf\{x:F_\alpha(x)\ge r\}
$$

be the quantile function. The one-dimensional transport identity is

$$
  W_2^2(\alpha_0,\alpha_1)
  =\int_0^1|Q_{\alpha_0}(r)-Q_{\alpha_1}(r)|^2\,dr.
$$

Thus Wasserstein space on the line is the closed convex cone of nondecreasing functions in $$L^2(0,1)$$. Its geodesic from $$\alpha_0$$ to $$\alpha_1$$ has quantile $$Q_t=(1-t)Q_{\alpha_0}+tQ_{\alpha_1}$$. These one-dimensional transport formulas are reviewed in [[5]](#ref-computational).

<span id="theorem-1"></span>

**Theorem 1 (one-dimensional displacement convexity).** For any fixed $$\beta\in\mathcal P_2(\mathbb R)$$ and every Wasserstein geodesic $$(\alpha_t)_{0\le t\le1}$$,

$$
  E_\beta(\alpha_t)
  \le(1-t)E_\beta(\alpha_0)+tE_\beta(\alpha_1).
$$

<details class="blog-proof">
<summary>Proof: ordered distances turn repulsion into a linear term</summary>
<div class="blog-proof-body" markdown="1">

Write $$Q=Q_\alpha$$. Since $$Q(r)\ge Q(s)$$ when $$r\ge s$$,

$$
  \begin{aligned}
  \mathbb E|X-X'|
  &=2\int_0^1\int_0^r (Q(r)-Q(s))\,ds\,dr\\
  &=2\int_0^1(2r-1)Q(r)\,dr.
  \end{aligned}
$$

This is linear in $$Q$$. The attraction term is

$$
  2\int_0^1 V_\beta(Q(r))\,dr,
  \qquad V_\beta(x)=\int|x-y|\,d\beta(y),
$$

which is convex in $$Q$$, because $$V_\beta$$ is convex. The target self-interaction is constant. Therefore $$E_\beta$$ is convex along the affine interpolation of quantiles. $$\square$$

</div>
</details>

The pointwise function $$z\mapsto-\lvert z\rvert$$ is concave. On an ordered pair, however, the relevant variable is the nonnegative distance $$Q(r)-Q(s)$$, and $$a\mapsto-a$$ is affine on $$[0,\infty)$$. This is why testing the kernel's convexity on the whole plane would miss the result.

<span id="proposition-1"></span>

**Proposition 1 (the general interaction criterion).** Suppose $$\varphi:[0,\infty)\to\mathbb R$$ is continuous and has at most quadratic growth. Then

$$
  I_\varphi(\alpha)=\frac12\iint\varphi(|x-y|)\,d\alpha(x)\,d\alpha(y)
$$

is displacement convex on $$\mathcal P_2(\mathbb R)$$ if and only if $$\varphi$$ is convex on $$[0,\infty)$$.

<details class="blog-proof">
<summary>Proof: sufficiency uses order; necessity needs only two atoms</summary>
<div class="blog-proof-body" markdown="1">

For $$r>s$$, the distance along a quantile geodesic is $$Q_t(r)-Q_t(s)$$, affine in $$t$$. Convexity of $$\varphi$$, integrated over this triangle, proves sufficiency. For necessity, test $$\alpha_a=\tfrac12(\delta_0+\delta_a)$$, $$a\ge0$$. Linear interpolation of $$a$$ is a quantile geodesic, and

$$
  I_\varphi(\alpha_a)=\tfrac14\varphi(0)+\tfrac14\varphi(a).
$$

Convexity of this expression in $$a$$ is precisely convexity of $$\varphi$$. $$\square$$

</div>
</details>

## The flow becomes a family of scalar equations

Assume that the target CDF $$F_\beta$$ is continuous. Then $$V_\beta'(x)=2F_\beta(x)-1$$. In quantile coordinates the Wasserstein gradient flow satisfies, for almost every rank $$r$$,

$$
  \partial_t Q_t(r)=4\bigl(r-F_\beta(Q_t(r))\bigr).
$$

The coefficient four comes from our convention for $$E_\beta$$. A quantile moves right when too little target mass lies to its left, and left when there is too much. For a uniform target on $$[0,1]$$, if $$Q_0(r)\in[0,1]$$, the formula is explicit:

$$
  Q_t(r)=r+e^{-4t}(Q_0(r)-r).
$$

For example, starting from a Dirac mass at $$1/2$$ produces a uniform law on a growing interval, with endpoints $$e^{-4t}/2$$ and $$1-e^{-4t}/2$$. An atom can split instantly in this measure-valued flow. A fixed number of moving particles cannot represent that phenomenon exactly.

The robust implicit update with time step $$h>0$$ solves

$$
  Q^{k+1}(r)+4hF_\beta(Q^{k+1}(r))
  =Q^k(r)+4hr.
$$

The left side is continuous, strictly increasing, and onto $$\mathbb R$$, so bisection finds the unique solution. Its inverse is increasing; hence the update preserves quantile ordering. This matters: a gradient step in an arbitrary $$L^2$$ function would not automatically describe a probability law through its quantiles.

<details class="blog-proof">
<summary>Why the scalar update is the genuine Wasserstein proximal step</summary>
<div class="blog-proof-body" markdown="1">

The quantile expression in Theorem 1 extends to a finite convex functional on all of $$L^2(0,1)$$:

$$
  \mathcal E(Q)
  =2\int_0^1\bigl[V_\beta(Q(r))-(2r-1)Q(r)\bigr]\,dr
   -\mathbb E|Y-Y'|.
$$

For nondecreasing $$Q$$, this equals $$E_\beta(Q_\#dr)$$, where $$dr$$ is uniform probability on $$(0,1)$$. Minimizing

$$
  \mathcal E(Q)+\frac1{2h}\|Q-Q^k\|_{L^2}^2
$$

separates into a strictly convex scalar problem at each rank. Its first-order condition is exactly the implicit equation above. It also gives $$\lvert Q^{k+1}(r)-Q^k(r)\rvert\le4h$$, so the solution belongs to $$L^2$$. Because $$r\mapsto Q^k(r)+4hr$$ is increasing, the pointwise minimizer is itself nondecreasing. Therefore it also minimizes over the quantile cone: no projection or sorting has been silently omitted.

Comparing the minimum with the candidate $$Q=Q^k$$ gives the energy estimate

$$
  \mathcal E(Q^{k+1})
  +\frac1{2h}\|Q^{k+1}-Q^k\|_{L^2}^2
  \le\mathcal E(Q^k).
$$

The usual convex subgradient-flow limit of these proximal steps yields the displayed evolution; its quantile formulation is developed in [[2]](#ref-flow).

</div>
</details>

If $$\beta$$ has atoms, the correct implicit condition uses an interval:

$$
  Q^k(r)+4hr
  \in Q^{k+1}(r)
  +4h\,[F_\beta(Q^{k+1}(r)^-),F_\beta(Q^{k+1}(r))].
$$

It still has a unique solution, as the resolvent of a monotone subdifferential. Selecting an arbitrary value of a discontinuous CDF can miss it. Sobolev regularizations of the quantile evolution are studied in [[4]](#ref-sobolev).

## Why the plane is different

Without a total ordering, the self-interaction need not be affine along a transport geodesic. The failure is visible with just two source atoms.

<span id="proposition-2"></span>

**Proposition 2 (a two-dimensional obstruction).** Set $$\beta=\delta_0$$ and

$$
  \alpha_s=\tfrac12\delta_{(4,s)}+\tfrac12\delta_{(2,-s)},
  \qquad -\delta\le s\le\delta,\quad 0<\delta<1.
$$

This curve, after an affine change of time, is a Wasserstein geodesic. Yet $$s\mapsto E_\beta(\alpha_s)$$ is not convex.

<details class="blog-proof">
<summary>Proof: compare the two matchings and differentiate once more</summary>
<div class="blog-proof-body" markdown="1">

Between the endpoints, matching the same labels costs $$4\delta^2$$, whereas exchanging labels costs $$4$$. Thus the same-label matching is optimal and its linear interpolation is the stated geodesic. Direct evaluation gives

$$
  E_\beta(\alpha_s)
  =\sqrt{16+s^2}+\sqrt{4+s^2}-\sqrt{1+s^2}.
$$

Its second derivative at zero is $$1/4+1/2-1=-1/4$$, contradicting convexity. $$\square$$

</div>
</details>

Away from collisions, the formal continuum velocity is

$$
  v_\alpha(x)
  =2\int\frac{x-z}{|x-z|}\,d\alpha(z)
   -2\int\frac{x-y}{|x-y|}\,d\beta(y).
$$

Empirical averages give a particle method, with the self-term omitted. The appropriate particle metric is $$n^{-1}\sum_i\lvert\dot x_i\rvert^2$$; this explains why the velocity is $$n$$ times the negative ordinary gradient with respect to a single particle. Energy descent is meaningful, but it is not a proof of displacement convexity or global convergence.

## Numerical experimentation

Move the time slider to compare the quantile evolution on the line with a planar particle descent. The line samples the rank variable at bin midpoints and applies implicit quantile steps: both rank and time are discretized. In the plane, the norm is replaced by $$\sqrt{\lvert z\rvert^2+\eta^2}$$, with $$\eta=0.002$$, and a backtracking step decreases that same regularized objective. Since each distance changes by at most $$\eta$$, the regularized and original energies differ by at most $$4\eta$$.

<figure>
  <iframe class="idea-experiment" data-experiment="energy" title="Energy-distance quantile and particle flows" src="{{ '/blog/preparations/assets/ot-lab/index.html?topic=energy' | relative_url }}" loading="lazy"></iframe>
  <figcaption markdown="1">

The slider replays saved, energy-checked numerical iterates. In one dimension, red quantiles approach the blue target quantiles. In the plane, source particles move towards the gray target cloud. The two energy curves use their own initial energy and normalized experiment time; the planar curve belongs to the mollified finite-particle problem.

</figcaption>
</figure>

The useful lesson is geometric: convexity in mixture coordinates, convexity of a pointwise kernel, and convexity along Wasserstein geodesics are different properties. Here the last one is recovered by changing coordinates to quantiles—and is genuinely lost in dimension two.

## References

<ol class="references">
  <li id="ref-book">Gabriel Peyré. <a href="https://arxiv.org/abs/2505.06589"><em>Optimal Transport for Machine Learners</em></a>, 2025–2026. <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.15.2.18">Proposition 15.18, p. 360</a>.</li>
  <li id="ref-flow">Richard Duong, Viktor Stein, Robert Beinert, Johannes Hertrich, and Gabriele Steidl. <a href="https://arxiv.org/abs/2408.07498"><em>Wasserstein Gradient Flows of MMD Functionals with Distance Kernel and Cauchy Problems on Quantile Functions</em></a>. arXiv:2408.07498, 2024.</li>
  <li id="ref-kernel">Dino Sejdinovic, Bharath Sriperumbudur, Arthur Gretton, and Kenji Fukumizu. <a href="https://arxiv.org/abs/1207.6076"><em>Equivalence of distance-based and RKHS-based statistics in hypothesis testing</em></a>. <em>Annals of Statistics</em> 41(5), 2263–2291, 2013.</li>
  <li id="ref-sobolev">Richard Duong, Nicolaj Rux, Viktor Stein, and Gabriele Steidl. <a href="https://arxiv.org/abs/2411.09848"><em>Wasserstein Gradient Flows of MMD Functionals with Distance Kernels under Sobolev Regularization</em></a>. arXiv:2411.09848, 2024.</li>
  <li id="ref-computational">Gabriel Peyré and Marco Cuturi. <a href="https://arxiv.org/abs/1803.00567"><em>Computational Optimal Transport</em></a>. <em>Foundations and Trends in Machine Learning</em> 11(5–6), 355–607, 2019.</li>
</ol>
