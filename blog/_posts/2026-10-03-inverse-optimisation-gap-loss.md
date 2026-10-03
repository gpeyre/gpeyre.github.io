---
title: "Inverse optimisation and the convexity of the gap loss"
subtitle: "Learning a cost from decisions, and seeing curvature emerge from samples."
description: "Why the optimality gap is convex for a linearly parameterized objective, with an interactive inverse optimal transport experiment showing marginals, exact pairings, and finite-sample loss curves."
topic: Optimal transport
figure: inverse
---

In an optimisation problem, we know the objective and look for the best decision. In **inverse optimisation**, we observe decisions and try to recover an objective that explains them. Inverse optimal transport (iOT) is one example: rather than computing a coupling from a cost, we learn a cost from an observed coupling.

A useful measure of disagreement is the **gap loss**: the cost of the observed decision minus the cost of the best decision. When the objective depends linearly on the parameter to learn, this loss is convex—even if the forward optimisation problem is not. The interactive experiment below shows how a finite-sample iOT loss, initially flat over many possible costs, develops more linear pieces as we add observations.

<!--more-->

## Learning an objective from a decision

Let $$\mathcal Z$$ be a fixed feasible set and consider

$$
z_\theta\in\operatorname*{argmin}_{z\in\mathcal Z}F_\theta(z).
$$

Given a feasible observation $$\hat z$$, we would like to find $$\theta$$ for which $$\hat z$$ is optimal, or at least nearly optimal. This viewpoint includes learning preferences, rewards, or transport costs. Inverse optimisation can also involve learning constraints; here we keep the feasible set fixed. [Chan, Mahmood and Zhu's survey](https://doi.org/10.1287/opre.2022.0382) gives a broader overview.

Assume that the objective at the observation and the optimal value are finite, and that

$$
F_\theta(z)=F_0(z)+\langle\theta,\Phi(z)\rangle.
$$

The feature map $$\Phi$$ and the term $$F_0$$ may be nonlinear in the decision $$z$$. What matters is the **affine dependence on the unknown parameter** $$\theta$$. Define

$$
\begin{aligned}
V(\theta)&=\inf_{z\in\mathcal Z}F_\theta(z),\\
\mathcal L(\theta;\hat z)&=F_\theta(\hat z)-V(\theta).
\end{aligned}
$$

The gap is nonnegative, and vanishes exactly when the observation is a minimizer. With several observations, one can average their gaps, allowing each observation to have its own known feasible set. This remains a convex loss. This approach is also central to our work with Francisco Andrade and Clarice Poon on [*Learning from Samples: Inverse Problems over Measures*](https://arxiv.org/abs/2505.07124).

## Why the gap loss is convex

There is a short proof that is worth remembering:

$$
\begin{aligned}
\mathcal L(\theta;\hat z)
&=\sup_{z\in\mathcal Z}\ell_z(\theta),\\
\ell_z(\theta)&=F_\theta(\hat z)-F_\theta(z)\\
&=F_0(\hat z)-F_0(z)\\
&\quad+\langle\theta,\Phi(\hat z)-\Phi(z)\rangle.
\end{aligned}
$$

Every $$\ell_z$$ is affine in $$\theta$$. A supremum of affine functions is convex. Equivalently, $$V$$ is concave because it is an infimum of affine functions, so subtracting it from an affine function gives a convex loss.

Notice what the proof does **not** require: convexity of $$F_\theta$$ in $$z$$. Solving the forward problem may still be difficult, but the exact gap has this convexity property. It does require a parameter-independent feasible set and a fixed observation. A nonlinear neural parameterization of the objective does not automatically preserve it.

When a forward minimizer $$z_\theta$$ exists, an associated subgradient is

$$
\Phi(\hat z)-\Phi(z_\theta)\in
\partial_\theta\mathcal L(\theta;\hat z).
$$

Under the usual conditions ensuring differentiability of the optimal value, for instance a unique optimizer on a compact feasible set with continuous $$F_0$$ and features, this is the gradient. Learning compares the features of the observed decision with those of the currently optimal decision.

## Inverse optimal transport

For two probability measures $$\alpha,\beta$$, let $$\Pi(\alpha,\beta)$$ denote their couplings. The forward problem is

$$
\operatorname{OT}_{\alpha,\beta}(c)
=\inf_{\pi\in\Pi(\alpha,\beta)}\int c(x,y)\,\mathrm d\pi(x,y).
$$

Suppose we observe a coupling $$\hat\pi\in\Pi(\alpha,\beta)$$ and use a linear cost model

$$
c_\theta(x,y)=c_0(x,y)+\sum_{k=1}^p\theta_k\psi_k(x,y).
$$

The inverse OT gap is

$$
\boxed{\quad
\mathcal L(\theta;\hat\pi)
=\int c_\theta\,\mathrm d\hat\pi
-\operatorname{OT}_{\alpha,\beta}(c_\theta).
\quad}
$$

It is convex in $$\theta$$, since the coupling set stays fixed while the cost varies. Its subgradient compares the feature integrals under $$\hat\pi$$ and under an optimal coupling for $$c_\theta$$. Importantly, the observations include **pairing information**, not just the two marginal distributions: marginals alone do not tell us which cost generated a coupling.

There are unavoidable ambiguities. Adding $$u(x)+v(y)$$ to a cost changes every feasible coupling's objective by the same amount, so leaves the gap unchanged. Positive rescaling leaves optimal couplings unchanged, and the zero cost makes every coupling optimal. Thus recovering a meaningful cost requires a normalization or other prior information. Convexity does not, by itself, imply identifiability.

A fixed entropy regularizer can be included in $$F_0$$ without losing convexity in the cost parameter. Our paper [*Sparsistency for Inverse Optimal Transport*](https://arxiv.org/abs/2310.05461), with Francisco Andrade and Clarice Poon, studies sparse recovery for that regularized model. The figure below instead uses **unregularized OT**: there is no entropy or artificial smoothing of the loss.

## An interactive cost slice

We learn one entry of a positive diagonal metric, fixing the other to remove the scaling ambiguity:

$$
\begin{aligned}
A_\theta&=\begin{pmatrix}\theta&0\\0&1\end{pmatrix},\\
c_\theta(x,y)&=\tfrac12(x-y)^\top A_\theta(x-y),
\qquad 0.2\leq\theta\leq2.6.
\end{aligned}
$$

For fixed point clouds, $$C_\theta=(c_\theta(x_i,y_j))_{i,j}$$ is a one-dimensional affine slice of cost matrices. Varying $$\theta$$ changes how strongly horizontal displacement is penalized.

{% include blog-figure.html kind="inverse" %}

The point-count slider changes both empirical marginals. The cost slider changes the optimal pairing and marks the corresponding position on the loss curve. All points contribute to the loss; only up to 24 pairing segments are drawn to keep the picture readable. “Observed pairs” overlays the data-generating coupling, and “Compare sample sizes” shows nested subsets of the same sample. “New sample” changes the random seed.

To construct paired data without guessing the ground truth, draw $$x_i\sim\mathcal N(0,I_2)$$ and set $$y_i=T(x_i)$$, where

$$
\begin{aligned}
T&=\nabla\varphi,\\
\varphi(x)&=\frac{0.12}{2}\|x\|^2
+\log\cosh(x_1+x_2)\\
&\qquad+\frac14\log\cosh(2x_1-x_2).
\end{aligned}
$$

The Hessian of $$\varphi$$ is $$0.12I$$ plus two positive semidefinite matrices, so $$\varphi$$ is strictly convex. Its gradient is a nonlinear quadratic-cost OT map from the Gaussian to $$T_\#\mathcal N(0,I_2)$$. The target is not Gaussian. In particular, the observed pairs $$x_i\mapsto y_i$$ are optimal at the true parameter $$\theta_*=1$$ for every sample size: gradients of convex functions are cyclically monotone.

With equal weights, the empirical measures and observed coupling are

$$
\begin{aligned}
\alpha_n&=\frac1n\sum_i\delta_{x_i},\qquad
\beta_n=\frac1n\sum_i\delta_{y_i},\\
\hat\pi_n&=\frac1n\sum_i\delta_{(x_i,y_i)}.
\end{aligned}
$$

The plotted loss is the mean cost gap

$$
\mathcal L_n(\theta)
=\frac1n\sum_i c_\theta(x_i,y_i)
-\min_{\sigma\in\mathfrak S_n}
\frac1n\sum_i c_\theta(x_i,y_{\sigma(i)}).
$$

Each optimal pairing is computed by the Hungarian assignment algorithm. The curve is traced by finding changes of optimal assignment along the slice, rather than fitting a smooth curve through a few values.

## More samples and the emergence of curvature

At finite $$n$$, the loss is a maximum of finitely many affine functions of $$\theta$$. It is therefore **convex and piecewise linear**, not smoothly curved. A whole interval of costs can produce the same observed pairing and hence zero gap. Away from assignment changes, the second derivative is zero.

For the default sample, increasing $$n$$ narrows this zero-loss interval and introduces many more affine pieces. At the scale of the plot, the envelope starts to look curved. This illustrates how a curved population loss can arise as a limit of polyhedral empirical losses. It is not a universal rule that adding points increases curvature, nor a claim that empirical losses are pointwise monotone in sample size.

The population coupling in this example identifies $$\theta=1$$ within our slice. Indeed, optimality for $$c_\theta$$ would require $$A_\theta T$$ to be a gradient. Its Jacobian $$A_\theta D^2\varphi$$ must therefore be symmetric, which imposes

$$
(\theta-1)\,\partial_{12}\varphi(x)=0.
$$

Since $$\partial_{12}\varphi(0)=1/2$$, this is possible only at $$\theta=1$$. A finite cloud does not impose this differential condition everywhere, explaining why it can admit a flat range of exact fits.

## The link with cost-space curvature

This is the connection with my recent work with **Oscar Tron and Clarice Poon**, [*Curvature of optimal transport with respect to the cost and applications to inverse optimal transport*](https://arxiv.org/abs/2604.22670). The object whose curvature matters here is the **OT value as a function of its cost**, not displacement convexity of an energy over measures.

Because the observed-coupling term is affine, whenever the population value is twice differentiable along a cost slice,

$$
D^2_\theta\mathcal L(\theta;\hat\pi)
=-D^2_\theta\operatorname{OT}_{\alpha,\beta}(c_\theta).
$$

The paper characterizes this second variation and, for structured bilinear costs under its regularity and spanning assumptions, establishes local quadratic stability transverse to the unavoidable scaling direction. After an identifiable normalization, a lower bound of the form

$$
\mathcal L(\theta;\hat\pi)
\geq\kappa\|\theta-\theta_*\|^2,
\qquad \kappa>0,
$$

near the true parameter gives a quantitative way to turn a small gap into a small parameter error. The assumptions matter: affine transport maps, including Gaussian-to-Gaussian examples in the full bilinear family, can retain extra non-identifiable directions.

The Gaussian-source experiment above illustrates the finite-sample mechanism; it is not a direct application of the paper's compact-domain stability theorem. Convexity of the gap is elementary and very general. **Strict curvature, and the recovery guarantees it enables, require additional geometry of the transport problem.**
