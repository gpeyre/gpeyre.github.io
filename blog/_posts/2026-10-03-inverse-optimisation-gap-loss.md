---
title: "Inverse optimisation and the convexity of the gap loss"
subtitle: "Learning a cost from decisions through the Fenchel–Young viewpoint"
description: "The convex optimality gap as a Fenchel–Young loss, with an interactive inverse optimal transport experiment between two Gaussian mixtures and a linked bibliography."
topic: Optimal transport
figure: inverse
---

In an optimisation problem, we know the objective and look for the best decision. In **inverse optimisation**, we observe decisions and try to recover an objective that explains them. Inverse optimal transport (iOT) is one example: rather than computing a coupling from a cost, we learn a cost from an observed coupling.

A useful measure of disagreement is the **gap loss**: the cost of the observed decision minus the cost of the best decision. When the objective depends linearly on the parameter to learn, this loss is convex—even if the forward optimisation problem is not. This is closely connected to Fenchel–Young losses. The interactive experiment below explores the gap for transport between two mixtures of Gaussians.

<!--more-->

## Learning an objective from a decision

Let $$\mathcal Z$$ be a fixed feasible set and consider

$$
z_\theta\in\operatorname*{argmin}_{z\in\mathcal Z}F_\theta(z).
$$

Given a feasible observation $$\hat z$$, we would like to find $$\theta$$ for which $$\hat z$$ is optimal, or at least nearly optimal. This viewpoint includes learning preferences, rewards, or transport costs. Inverse optimisation can also involve learning constraints; here we keep the feasible set fixed. Chan, Mahmood and Zhu's survey [[1]](#ref-inverse-optimisation) gives a broader overview.

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

The gap is nonnegative, and vanishes exactly when the observation is a minimizer. With several observations, one can average their gaps, allowing each observation to have its own known feasible set. This remains a convex loss.

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

## The Fenchel–Young connection

Blondel, Martins and Niculae developed the **Fenchel–Young loss** framework in their AISTATS paper [[2]](#ref-fy-aistats) and its broader JMLR treatment [[3]](#ref-fy-jmlr). Given a regularizer $$\Omega$$, its conjugate and loss are

$$
\begin{aligned}
\Omega^*(s)&=\sup_z\bigl\{\langle s,z\rangle-\Omega(z)\bigr\},\\
L_\Omega(s,\hat z)&=\Omega^*(s)+\Omega(\hat z)-\langle s,\hat z\rangle.
\end{aligned}
$$

Here $$s$$ is a score vector: prediction maximizes $$\langle s,z\rangle-\Omega(z)$$. The loss measures how far the observation is from attaining that maximum.

In the linear-in-decision case $$\Phi(z)=z$$, set $$\Omega=F_0+\iota_{\mathcal Z}$$, where the indicator $$\iota_{\mathcal Z}$$ is zero on the feasible set and $$+\infty$$ elsewhere. Then

$$
\begin{aligned}
V(\theta)&=-\Omega^*(-\theta),\\
\mathcal L(\theta;\hat z)
&=\Omega(\hat z)+\langle\theta,\hat z\rangle+\Omega^*(-\theta)\\
&=L_\Omega(-\theta,\hat z).
\end{aligned}
$$

Thus the gap is **exactly a Fenchel–Young loss**, with the sign reversal turning minimization of a cost into maximization of a score. Its nonnegativity is the Fenchel–Young inequality, and its convexity comes from the conjugate.

The nonlinear feature model above fits the **generalized** Fenchel–Young construction of Blondel et al. [[4]](#ref-fy-generalized). Use $$E(\theta,z)=-\langle\theta,\Phi(z)\rangle$$ and the same $$\Omega=F_0+\iota_{\mathcal Z}$$. The generalized conjugate is

$$
\begin{aligned}
\Omega^E(\theta)
&=\sup_z\bigl\{E(\theta,z)-\Omega(z)\bigr\}\\
&=-V(\theta),
\end{aligned}
$$

so its loss $$\Omega^E(\theta)+\Omega(\hat z)-E(\theta,\hat z)$$ is again the gap. Affinity in $$\theta$$ is essential to the convexity argument; a general nonlinear energy need not give a convex parameter-learning problem. Our work with Francisco Andrade and Clarice Poon [[5]](#ref-learning-measures) studies related gap losses for inverse problems over measures.

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

It is convex in $$\theta$$, since the coupling set stays fixed while the cost varies. It is also a direct Fenchel–Young example: take $$\Omega=\iota_{\Pi(\alpha,\beta)}$$ and pair costs with couplings through integration. Then

$$
\begin{aligned}
\Omega^*(-c_\theta)&=-\operatorname{OT}_{\alpha,\beta}(c_\theta),\\
\mathcal L(\theta;\hat\pi)&=L_\Omega(-c_\theta,\hat\pi).
\end{aligned}
$$

Its subgradient compares the feature integrals under $$\hat\pi$$ and under an optimal coupling for $$c_\theta$$. Importantly, the observations include **pairing information**, not just the two marginal distributions: marginals alone do not tell us which cost generated a coupling.

There are unavoidable ambiguities. Adding $$u(x)+v(y)$$ to a cost changes every feasible coupling's objective by the same amount, so leaves the gap unchanged. Positive rescaling leaves optimal couplings unchanged, and the zero cost makes every coupling optimal. Thus recovering a meaningful cost requires a normalization or other prior information. Convexity does not, by itself, imply identifiability.

A fixed entropy regularizer can be included in $$F_0$$ without losing convexity in the cost parameter. Our paper with Francisco Andrade and Clarice Poon [[6]](#ref-sparsistency) studies sparse recovery for that regularized model. The figure below instead uses **unregularized OT**: there is no entropy or artificial smoothing of the loss.

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

The source and target are each a mixture of two moderately separated Gaussians, with differently oriented component centers:

$$
\begin{aligned}
\alpha&=\tfrac12\mathcal N(-m,\sigma^2I_2)
+\tfrac12\mathcal N(m,\sigma^2I_2),\\
\beta&=\tfrac12\mathcal N(-r,\sigma^2I_2)
+\tfrac12\mathcal N(r,\sigma^2I_2),\\
m&=(1.4,0.8),\qquad r=(0.8,-1.4),\\
\sigma&=0.7.
\end{aligned}
$$

We draw the two marginal clouds independently. For each $$n$$, we compute a reference pairing $$\tau_*$$ by exact OT at $$\theta_*=1$$, and keep that pairing fixed while varying $$\theta$$. The reference is recomputed when $$n$$ changes; the point clouds themselves are nested subsets of the same draws.

The point-count slider changes both empirical marginals. The cost slider changes the optimal pairing and marks the corresponding position on the loss curve. All points contribute to the loss; only up to 24 pairing segments are drawn to keep the picture readable. “Reference pairs” overlays the coupling at $$\theta=1$$, “Compare sample sizes” displays several $$n$$ values, and “New sample” changes the random seed.

With equal weights, the empirical measures and reference coupling are

$$
\begin{aligned}
\alpha_n&=\frac1n\sum_i\delta_{x_i},\qquad
\beta_n=\frac1n\sum_i\delta_{y_i},\\
\hat\pi_n&=\frac1n\sum_i\delta_{(x_i,y_{\tau_*(i)})}.
\end{aligned}
$$

The plotted loss is the mean cost gap

$$
\mathcal L_n(\theta)
=\frac1n\sum_i c_\theta(x_i,y_{\tau_*(i)})
-\min_{\tau\in\mathfrak S_n}
\frac1n\sum_i c_\theta(x_i,y_{\tau(i)}).
$$

Each optimal pairing is computed by the Hungarian assignment algorithm. The curve is traced by finding changes of optimal assignment along the slice, rather than fitting a smooth curve through a few values. At finite $$n$$ it remains **convex and piecewise linear**: more points can reveal a finer, more rounded-looking envelope, but do not automatically guarantee greater curvature.

My recent work with **Oscar Tron and Clarice Poon** [[7]](#ref-curvature) studies curvature of the OT value with respect to the cost. Since the observed-coupling term is affine, this translates directly into curvature of the inverse gap loss. Under regularity and spanning assumptions, the paper gives local quadratic stability for cost recovery, modulo the unavoidable non-identifiable directions.

## Bibliography

1. <span id="ref-inverse-optimisation"></span> Timothy C. Y. Chan, Rafid Mahmood and Ian Yihang Zhu. [*Inverse Optimization: Theory and Applications*](https://doi.org/10.1287/opre.2022.0382). *Operations Research* **73**(2), 1046–1074, 2025.

2. <span id="ref-fy-aistats"></span> Mathieu Blondel, André F. T. Martins and Vlad Niculae. [*Learning Classifiers with Fenchel-Young Losses: Generalized Entropies, Margins, and Algorithms*](https://proceedings.mlr.press/v89/blondel19a.html). AISTATS, *PMLR* **89**, 606–615, 2019.

3. <span id="ref-fy-jmlr"></span> Mathieu Blondel, André F. T. Martins and Vlad Niculae. [*Learning with Fenchel-Young Losses*](https://www.jmlr.org/papers/v21/19-021.html). *Journal of Machine Learning Research* **21**(35), 1–69, 2020.

4. <span id="ref-fy-generalized"></span> Mathieu Blondel, Felipe Llinares-López, Robert Dadashi, Léonard Hussenot and Matthieu Geist. [*Learning Energy Networks with Generalized Fenchel-Young Losses*](https://papers.nips.cc/paper_files/paper/2022/hash/510cfd9945f8bde6f0cf9b27ff1f8a76-Abstract-Conference.html). NeurIPS **35**, 2022.

5. <span id="ref-learning-measures"></span> Francisco Andrade, Gabriel Peyré and Clarice Poon. [*Learning from Samples: Inverse Problems over Measures*](https://arxiv.org/abs/2505.07124). arXiv:2505.07124, 2025.

6. <span id="ref-sparsistency"></span> Francisco Andrade, Gabriel Peyré and Clarice Poon. [*Sparsistency for Inverse Optimal Transport*](https://arxiv.org/abs/2310.05461). ICLR, 2024.

7. <span id="ref-curvature"></span> Gabriel Peyré, Clarice Poon and Oscar Tron. [*Curvature of Optimal Transport with Respect to the Cost and Applications to Inverse Optimal Transport*](https://arxiv.org/abs/2604.22670). arXiv:2604.22670, 2026.
