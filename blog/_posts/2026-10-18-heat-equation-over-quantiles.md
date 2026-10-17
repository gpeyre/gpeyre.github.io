---
title: The heat equation over quantiles
subtitle: Follow the mass, rather than the density.
description: Quantiles turn one-dimensional Wasserstein geometry into L2 geometry.
  The JKO entropy step then yields a nonlinear quantile formulation of heat, illustrated
  by a three-Gaussian mixture.
topic: Wasserstein gradient flows
keywords:
- heat equation
- quantile function
- inverse cumulative distribution
- inverse CDF
- one-dimensional optimal transport
- monotone rearrangement
- Wasserstein distance
- W2
- JKO scheme
- Jordan Kinderlehrer Otto
- Richard Jordan
- David Kinderlehrer
- Felix Otto
- minimizing movements
- implicit Euler
- proximal step
- Wasserstein gradient flow
- Hilbert gradient flow
- mass coordinates
- Lagrangian coordinates
- entropy
- Shannon entropy
- Boltzmann entropy
- differential entropy
- internal energy
- nonlinear diffusion
- porous medium equation
- Gaussian mixture
- Gaussian convolution
- quantile trajectories
- score function
- Fisher information
- entropy dissipation
- Daniel Matthes
- Horst Osberger
- équation de la chaleur
- fonction quantile
proofs: true
embedded_experiment: true
---

The heat equation spreads a density through space. In one dimension, there is another way to watch it: follow the median, the first quartile, or any fixed fraction of the mass. These positions trace deterministic, ordered paths, even though heat can also be described by random Brownian motion.

The Jordan–Kinderlehrer–Otto formulation makes this change of viewpoint particularly transparent. Heat is the Wasserstein gradient flow of negative entropy [[1]](#ref-jko). Quantiles turn the one-dimensional Wasserstein distance into an ordinary $$L^2$$ distance. Put these two facts together, and the familiar linear heat equation becomes a nonlinear equation for a single increasing function.

<!--more-->

Its evolution is

$$
 \partial_t q
 =-\partial_s\!\left(\frac1{\partial_s q}\right)
 =\frac{\partial_{ss}q}{(\partial_s q)^2}.
$$

Let us derive this equation from the variational time step, explain its boundary behavior, and then watch it act on a mixture of three Gaussians.

## Quantiles flatten one-dimensional transport

For a probability measure $$\alpha\in\mathcal P_2(\mathbb R)$$, meaning that its second moment is finite, define its cumulative distribution and generalized quantile by

$$
 F_\alpha(x)=\alpha(({-\infty},x]),
 \qquad
 q_\alpha(s)=\inf\{x:F_\alpha(x)\ge s\},
 \quad 0\lt s\lt1.
$$

The variable $$s$$ labels a *fraction of mass*, not a spatial position. If $$S$$ is uniform on $$(0,1)$$, then $$q_\alpha(S)$$ has law $$\alpha$$. In pushforward notation, $$(q_\alpha)_\#ds=\alpha$$: applying the map $$q_\alpha$$ to uniform mass produces the desired distribution.

<span id="proposition-1"></span>

**Proposition 1 (the quantile isometry).** For any $$\alpha,\beta\in\mathcal P_2(\mathbb R)$$,

$$
 W_2(\alpha,\beta)^2
 =\int_0^1|q_\alpha(s)-q_\beta(s)|^2\,ds.
$$

Thus $$\mathcal P_2(\mathbb R)$$ is isometric to the closed convex cone $$\mathcal C\subset L^2(0,1)$$ of functions having a nondecreasing representative [[2]](#ref-santambrogio). Functions equal almost everywhere represent the same quantile.

<details class="blog-proof">
<summary>Proof: sorted mass should be matched to sorted mass</summary>
<div class="blog-proof-body" markdown="1">

The coupling $$(q_\alpha,q_\beta)_\#ds$$ gives the displayed integral as an upper bound. To see optimality, first consider equally weighted finite point clouds. If $$x\le x'$$ and $$y\le y'$$, then

$$
 |x-y'|^2+|x'-y|^2
 -|x-y|^2-|x'-y'|^2
 =2(x'-x)(y'-y)\ge0.
$$

Uncrossing therefore makes the sorted assignment optimal. A coupling of equally weighted clouds is a convex combination of assignments, so splitting mass cannot do better. Approximating general quantiles in $$L^2$$ by their averages on equal-length bins gives the same identity for arbitrary measures. Conversely, every nondecreasing $$L^2$$ function is the quantile, up to null sets, of its pushforward of $$ds$$. $$\square$$

</div>
</details>

For a smooth, strictly positive density $$\alpha=\rho\,dx$$, differentiating $$F_\alpha(q_\alpha(s))=s$$ gives the key identity

$$
 \rho(q(s))\,q_s(s)=1.
$$

A large spacing $$q_s$$ means low density; a small spacing means high density.

## The JKO step becomes a Hilbert-space proximal step

For an energy $$\mathcal E$$ on measures and a time step $$\tau>0$$, the JKO scheme chooses

$$
 \alpha_{k+1}\in\operatorname*{argmin}_{\alpha\in\mathcal P_2(\mathbb R)}
 \left\{\frac{W_2^2(\alpha,\alpha_k)}{2\tau}
                  +\mathcal E(\alpha)\right\}.
$$

The first term penalizes movement; the second rewards lower energy. This is the Wasserstein analogue of implicit Euler, developed in [[1]](#ref-jko) and in the general theory of metric gradient flows [[3]](#ref-ags).

Write $$\widetilde{\mathcal E}(q)=\mathcal E(q_\#ds)$$. Proposition 1 makes the change of variables exact:

$$
 q_{k+1}\in\operatorname*{argmin}_{q\in\mathcal C}
 \left\{\frac{\|q-q_k\|_{L^2}^2}{2\tau}
                   +\widetilde{\mathcal E}(q)\right\}.
$$

There is no transport problem left inside the distance. We have an ordinary $$L^2$$ variational step, with the monotonicity constraint that makes $$q$$ a quantile. When the pulled-back energy is convex, this is convex optimization on a convex set.

## From an internal energy to a quantile PDE

Consider an internal energy $$\mathcal E(\rho\,dx)=\int_{\mathbb R}U(\rho(x))\,dx$$, with $$U(0)=0$$ and $$U\in C^2((0,\infty))$$. To compute its differential equation, assume a smooth, positive density and enough decay and integrability to justify the following operations. Set

$$
 P(r)=rU'(r)-U(r).
$$

<span id="proposition-2"></span>

**Proposition 2 (density and mass coordinates).** In this smooth regime, the energy and its gradient flow can be written as

$$
 \widetilde{\mathcal E}(q)
 =\int_0^1q_s\,U(1/q_s)\,ds,
 \qquad
 q_t=-\partial_sP(1/q_s).
$$

The corresponding density solves

$$
 \rho_t=\partial_x\!\left(\rho\,\partial_xU'(\rho)\right)
        =\partial_{xx}P(\rho).
$$

<details class="blog-proof">
<summary>Proof: change variables, then integrate by parts</summary>
<div class="blog-proof-body" markdown="1">

Since $$x=q(s)$$, $$dx=q_s\,ds$$ and $$\rho(q(s))=1/q_s$$, the energy formula follows. Put $$L(z)=zU(1/z)$$; then $$L'(z)=-P(1/z)$$. For a smooth variation $$\eta$$ compactly supported in $$(0,1)$$,

$$
 D\widetilde{\mathcal E}(q)[\eta]
 =-\int_0^1P(1/q_s)\eta_s\,ds
 =\int_0^1\partial_sP(1/q_s)\eta\,ds.
$$

The negative $$L^2$$ gradient is therefore $$-\partial_sP(1/q_s)$$. Equivalently, define the velocity by $$v(q(s))=q_t(s)$$. The chain rule gives

$$
 \partial_sP(\rho(q(s)))
 =U''(\rho(q(s)))\rho_x(q(s)),
 \qquad v=-\partial_xU'(\rho).
$$

Transporting the mass labels gives $$\rho_t+\partial_x(\rho v)=0$$, hence the density equation. $$\square$$

</div>
</details>

If $$U$$ is convex, then $$L''(z)=U''(1/z)/z^3\ge0$$: the integrand in quantile coordinates is convex too. For example, $$U(r)=r^m/(m-1)$$, $$m>1$$, gives $$P(r)=r^m$$, the porous-medium equation $$\rho_t=\partial_{xx}(\rho^m)$$, and its mass-coordinate form $$q_t=-\partial_s(q_s^{-m})$$.

> **What is exact, and what is a smooth computation?** The quantile JKO minimization on $$\mathcal C$$ is an exact reformulation. The formulas involving $$q_s$$ above describe its smooth, strictly increasing regime. For arbitrary measures, use the extended energy $$\mathcal E(q_\#ds)$$, rather than assuming that a classical derivative alone captures the whole functional. Atoms, gaps in support, and singular parts require this distinction.

## Negative Shannon entropy gives heat

Take the Boltzmann entropy

$$
 \mathcal H(\alpha)=\int_{\mathbb R}\rho\log\rho\,dx,
 \qquad \alpha=\rho\,dx,
$$

with value $$+\infty$$ for measures without a density. This is the *negative* of differential Shannon entropy: minimizing $$\mathcal H$$ favors spreading. We have $$U(r)=r\log r$$, so $$P(r)=r$$, and

$$
 \widetilde{\mathcal H}(q)=-\int_0^1\log q_s\,ds.
$$

<span id="theorem-1"></span>

**Theorem 1 (heat in quantile coordinates).** For a smooth, positive heat solution with suitable decay, its quantile satisfies

$$
 q_t=-\partial_s(1/q_s)=\frac{q_{ss}}{q_s^2}.
$$

The corresponding smooth JKO step satisfies the implicit equation

$$
 \frac{q_{k+1}-q_k}{\tau}
 =-\partial_s\!\left(\frac1{\partial_s q_{k+1}}\right).
$$

<details class="blog-proof">
<summary>Proof: the same variation, at the new time step</summary>
<div class="blog-proof-body" markdown="1">

Proposition 2 gives the continuous equation and $$\rho_t=\rho_{xx}$$. For the discrete step, the first variation of the quadratic distance is $$(q_{k+1}-q_k)/\tau$$, while that of entropy is $$\partial_s(1/\partial_s q_{k+1})$$. Their sum vanishes. Crucially, the right-hand side is evaluated at the *new* quantile, not the old one. $$\square$$

</div>
</details>

One can also check the equation directly: integrating $$\rho_t=\rho_{xx}$$ from $$-\infty$$ to $$x$$ gives $$F_t=\rho_x$$. Differentiating $$F(t,q(t,s))=s$$ then gives

$$
 q_t(t,s)=-\frac{\rho_x}{\rho}(t,q(t,s)).
$$

The quantiles move with the negative *score* of the density. These deterministic paths never cross. They reproduce the same evolving laws as Brownian diffusion, but they are not Brownian sample paths.

For a positive, full-support density with decaying tails, the natural endpoint behavior on the line is

$$
 q(t,0+)=-\infty,\qquad q(t,1-)=+\infty,
 \qquad 1/q_s\longrightarrow0.
$$

This holds for heat at every positive time, in particular for the mixtures below. These are tail conditions, not finite Dirichlet values imposed at $$s=0,1$$.

Finally, the apparently nonlinear quantile equation retains a simple gradient-flow identity. With sufficient decay,

$$
 \frac{d}{dt}\mathcal H(\alpha_t)
 =-\int_0^1|q_t|^2\,ds
 =-\int_{\mathbb R}\frac{|\rho_x|^2}{\rho}\,dx.
$$

The squared $$L^2$$ speed of the quantile is precisely the Fisher information of the density.

## A Gaussian check: one JKO step is not one heat step

The exact heat solution is convolution with $$\mathcal N(0,2t)$$. Thus, starting from $$\mathcal N(m,\sigma_0^2)$$,

$$
 q(t,s)=m+\sqrt{\sigma_0^2+2t}\,\Phi^{-1}(s),
$$

where $$\Phi$$ is the standard normal CDF. A finite JKO step is different.

<span id="proposition-3"></span>

**Proposition 3 (the Gaussian JKO update).** If $$\alpha_k=\mathcal N(m,\sigma_k^2)$$, with $$\sigma_k>0$$, the entropy JKO minimizer is Gaussian, with the same mean and standard deviation

$$
 \sigma_{k+1}
 =\frac{\sigma_k+\sqrt{\sigma_k^2+4\tau}}2.
$$

<details class="blog-proof">
<summary>Proof: a global minimizer, not just a Gaussian ansatz</summary>
<div class="blog-proof-body" markdown="1">

Let a competing density have mean $$a$$ and standard deviation $$b>0$$. Cauchy–Schwarz applied to any coupling gives

$$
 W_2^2(\alpha,\alpha_k)\ge(a-m)^2+(b-\sigma_k)^2.
$$

Nonnegativity of its relative entropy with respect to $$\mathcal N(a,b^2)$$ gives

$$
 \mathcal H(\alpha)\ge-\tfrac12\log(2\pi e b^2).
$$

Both bounds are attained simultaneously by $$\alpha=\mathcal N(a,b^2)$$. The full optimization therefore reduces to $$a=m$$ and

$$
 \min_{b>0}\left\{\frac{(b-\sigma_k)^2}{2\tau}-\log b\right\}.
$$

The strictly convex scalar objective has derivative $$(b-\sigma_k)/\tau-1/b$$. Its unique positive zero gives the formula. $$\square$$

</div>
</details>

In other words, JKO applies implicit Euler to $$\dot\sigma=1/\sigma$$. The continuous solution has variance $$\sigma_0^2+2t$$, but a single JKO step does *not* simply add $$2\tau$$ to the variance. The two agree in the vanishing-step limit.

## Numerical experimentation: follow the same mass over time

Start from three Gaussian components with unequal weights and widths. If their means, variances, and weights are $$m_j,\sigma_j^2,w_j$$, the heat solution is exactly

$$
 \rho_t(x)=\sum_{j=1}^3w_j\,
 \frac{\exp\!\left(-\dfrac{(x-m_j)^2}{2(\sigma_j^2+2t)}\right)}
      {\sqrt{2\pi(\sigma_j^2+2t)}}.
$$

The initial-separation slider moves the component means from an overlapping mixture to three distinct modes. The point-count slider selects the mass levels $$s_i=(i+1/2)/n$$, $$i=0,\ldots,n-1$$. Play the flow or move time manually to compare the density, the quantile function, and the paths $$t\mapsto q(t,s_i)$$.

<iframe class="idea-experiment" data-experiment="heat-quantiles" src="{{ '/blog/preparations/assets/heat-quantiles/index.html' | relative_url }}" title="Heat evolution of a three-Gaussian mixture: density, quantile function, and ordered mass trajectories" loading="lazy"></iframe>

*The density is the analytic Gaussian-convolution solution; quantiles are obtained by numerical inversion of its CDF. No JKO time discretization or stochastic particle simulation is used. The finite time grid only draws the trajectories. Increasing $$n$$ changes which quantiles are tracked, not the underlying heat flow; the endpoints $$s=0,1$$, whose quantiles are infinite, are never sampled.*

This is also the starting point of genuinely Lagrangian numerical schemes: discretize the increasing map, rather than the Eulerian density, and inherit mass conservation from the parametrization. Variational convergence results and a broader overview can be found in Matthes–Osberger [[4]](#ref-matthes) and Carrillo–Matthes–Wolfram [[5]](#ref-carrillo); for computational Wasserstein gradient flows more generally, see [[6]](#ref-computational).

## References

1. <span id="ref-jko"></span>Richard Jordan, David Kinderlehrer, and Felix Otto. [*The Variational Formulation of the Fokker–Planck Equation*](https://doi.org/10.1137/S0036141096303359). SIAM Journal on Mathematical Analysis 29(1), 1–17, 1998.

1. <span id="ref-santambrogio"></span>Filippo Santambrogio. [*Optimal Transport for Applied Mathematicians*](https://link.springer.com/book/10.1007/978-3-319-20828-2). Birkhäuser, 2015.

1. <span id="ref-ags"></span>Luigi Ambrosio, Nicola Gigli, and Giuseppe Savaré. [*Gradient Flows in Metric Spaces and in the Space of Probability Measures*](https://link.springer.com/book/10.1007/978-3-7643-8722-8). Second edition, Birkhäuser, 2008.

1. <span id="ref-matthes"></span>Daniel Matthes and Horst Osberger. [*Convergence of a Variational Lagrangian Scheme for a Nonlinear Drift Diffusion Equation*](https://arxiv.org/abs/1301.0747). ESAIM: Mathematical Modelling and Numerical Analysis 48(3), 697–726, 2014.

1. <span id="ref-carrillo"></span>José A. Carrillo, Daniel Matthes, and Marie-Therese Wolfram. [*Lagrangian Schemes for Wasserstein Gradient Flows*](https://arxiv.org/abs/2003.03803). Handbook of Numerical Analysis 22, 271–311, 2021.

1. <span id="ref-computational"></span>Gabriel Peyré and Marco Cuturi. [*Computational Optimal Transport*](https://arxiv.org/abs/1803.00567). Foundations and Trends in Machine Learning 11(5–6), 355–607, 2019.
