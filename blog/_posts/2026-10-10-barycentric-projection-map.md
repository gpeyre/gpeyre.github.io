---
title: "The barycentric projection map"
subtitle: "From a mass-splitting coupling to a deterministic transport"
description: "Barycentric projection of transport couplings in fiberwise Wasserstein geometry, with quadratic and entropic optimality proofs, the modified-target caveat, weak transport, and an interactive unequal-cardinality example."
topic: Optimal transport
figure: barycentric
---

How do you turn a transport plan into a map? This question appears as soon as we transport a small point cloud to a much larger one: the Kantorovich solution splits each source point's mass among several destinations. Entropic regularization makes that splitting even more explicit.

The **barycentric projection** replaces those destinations by their conditional mean. For an arbitrary coupling, the resulting map need not be optimal. If the coupling solves **quadratic Kantorovich OT or quadratic entropic OT**, however, its barycentric projection is an unregularized quadratic Monge map—but **to its own image measure, not generally to the original target**. In the entropic case, this follows from a smooth convex log-sum-exp potential derived from the optimal dual potentials.

<!--more-->

## Point clouds and mass splitting

Consider two probability measures on $$\mathbb R^d$$,

$$
\begin{aligned}
\alpha&=\sum_{i=1}^n a_i\delta_{x_i},\\
\beta&=\sum_{j=1}^m b_j\delta_{y_j},\\
a_i,b_j&>0,\\
\sum_i a_i&=\sum_j b_j=1.
\end{aligned}
$$

The support points within each cloud are distinct. The experiments below use uniform weights $$a_i=1/n$$ and $$b_j=1/m$$, with $$m\gg n$$ by default.

A **coupling** is a nonnegative matrix $$\pi=(\pi_{ij})$$ whose row and column sums are the prescribed masses:

$$
\Pi(a,b)=
\left\{\pi\geq0:
\pi\mathbf1_m=a,\quad
\pi^\top\mathbf1_n=b\right\}.
$$

Here $$\pi_{ij}$$ is the mass sent from $$x_i$$ to $$y_j$$. Throughout this post the cost is **quadratic**, with the convention

$$
c(x,y)=\tfrac12\|x-y\|^2,\qquad C_{ij}=c(x_i,y_j).
$$

Kantorovich OT minimizes the linear transport cost:

$$
\pi^0\in\operatorname*{argmin}_{\pi\in\Pi(a,b)}
\sum_{i,j}\pi_{ij}C_{ij}.
$$

By contrast, the **Monge problem** asks for a deterministic map $$T$$:

$$
\inf_{T_\#\alpha=\beta}
\int c(x,T(x))\,\mathrm d\alpha(x).
$$

The pushforward $$T_\#\alpha$$ is the distribution of $$T(X)$$ when $$X\sim\alpha$$. A map-induced coupling has a single destination per source point; a *Monge map* also minimizes the constrained transport cost. When $$m>n$$, no map can send these $$n$$ atoms to all $$m$$ target atoms. Different cardinalities alone do not always rule out a map: if $$n>m$$, compatible source masses can be grouped together.

**Entropic OT** instead solves

$$
\pi^\varepsilon=
\operatorname*{argmin}_{\pi\in\Pi(a,b)}
\left\{\sum_{i,j}\pi_{ij}C_{ij}
+\varepsilon\,\mathrm{KL}(\pi\mid a\otimes b)\right\},
$$

where $$\varepsilon>0$$ and

$$
\mathrm{KL}(\pi\mid a\otimes b)
=\sum_{i,j}\pi_{ij}
\log\frac{\pi_{ij}}{a_i b_j},
$$

with $$0\log0=0$$. For finite costs and positive weights, its unique solution has positive entries: each source distributes mass over every target. These discrete formulations and their computational treatment are described in my book with Marco Cuturi [[2]](#ref-computational-ot).

## The conditional mean map

For any coupling of measures with finite second moments, write its disintegration as

$$
\pi(\mathrm dx,\mathrm dy)=
\alpha(\mathrm dx)\,\pi_x(\mathrm dy).
$$

Thus $$\pi_x$$ is the conditional distribution of the destination given the source. The **barycentric projection map** is

$$
\boxed{T_\pi(x)=\int y\,\pi_x(\mathrm dy)
=\mathbb E[Y\mid X=x].}
$$

It is defined $$\alpha$$-almost everywhere. For the finite clouds this becomes a row-normalized weighted average:

$$
\boxed{T_\pi(x_i)=\frac1{a_i}\sum_j\pi_{ij}y_j.}
$$

The factor $$1/a_i$$ matters: the rows of a coupling sum to source masses, not to one. This conditional mean is also the best deterministic least-squares predictor of $$Y$$ from $$X$$ under the joint law $$\pi$$. The definition applies to any coupling; it does not by itself imply that $$T_\pi$$ is an optimal transport map.

The terminology already appears in Ambrosio, Gigli and Savaré's **2005** book, Definition 5.4.2 [[1]](#ref-ags). A computational presentation is Remark 4.11 of *Computational Optimal Transport* [[2]](#ref-computational-ot). A more recent use is the estimation of OT maps from entropic couplings by Pooladian and Niles-Weed [[3]](#ref-entropic-maps).

## Projection onto deterministic couplings

The word *projection* can be understood literally at the level of couplings, not only as least-squares prediction of the destination. The key is to choose a distance that **keeps the source point fixed**.

Fix $$\alpha\in\mathcal P_2(\mathbb R^d)$$. Let $$\mathcal C_\alpha$$ be the probability measures on $$\mathbb R^d\times\mathbb R^d$$ with finite second moments and first marginal $$\alpha$$; their second marginal is free. For $$\pi,\rho\in\mathcal C_\alpha$$, write their conditional laws as $$\pi_x,\rho_x$$ and define

$$
D_\alpha^2(\pi,\rho)
=\int W_2^2(\pi_x,\rho_x)\,\mathrm d\alpha(x).
$$

This is the **fiberwise Wasserstein distance**, also called a fibered Wasserstein distance [[6]](#ref-fiberwise-wasserstein). Each conditional distribution is compared with the other at the same source location: mass may move in the destination coordinate, but not between different source labels.

The deterministic couplings form the subset

$$
\begin{aligned}
\rho_S&=(\mathrm{Id},S)_\#\alpha,\\
\mathcal M_\alpha
&=\{\rho_S:S\in L^2(\alpha;\mathbb R^d)\}.
\end{aligned}
$$

Their conditional laws are Dirac masses $$\delta_{S(x)}$$. Define the barycentric modification of the whole coupling by

$$
P(\pi)=(\mathrm{Id},T_\pi)_\#\alpha.
$$

**Proposition.** For every $$\pi\in\mathcal C_\alpha$$, its barycentric modification is the unique nearest deterministic coupling:

$$
\boxed{
P(\pi)=\operatorname*{argmin}_{\rho\in\mathcal M_\alpha}
D_\alpha^2(\pi,\rho).
}
$$

**Proof.** Since transporting a measure to a Dirac mass has only one possible coupling,

$$
\begin{aligned}
&D_\alpha^2(\pi,\rho_S)\\
&=\int W_2^2(\pi_x,\delta_{S(x)})\,\mathrm d\alpha(x)\\
&=\iint\|y-S(x)\|^2\,\mathrm d\pi(x,y).
\end{aligned}
$$

The conditional mean minimizes this expression. More precisely, expanding the square gives a Pythagorean identity directly between couplings:

$$
\begin{aligned}
&D_\alpha^2(\pi,\rho_S)\\
&=D_\alpha^2(\pi,P(\pi))\\
&\quad+\int\|T_\pi(x)-S(x)\|^2\,\mathrm d\alpha(x)\\
&=D_\alpha^2(\pi,P(\pi))
+D_\alpha^2(P(\pi),\rho_S).
\end{aligned}
$$

The cross term vanishes because $$\int(y-T_\pi(x))\,\pi_x(\mathrm dy)=0$$. Jensen's inequality ensures $$T_\pi\in L^2(\alpha;\mathbb R^d)$$, and the remaining squared norm proves uniqueness up to $$\alpha$$-almost-everywhere equality.

Geometrically, each fiber $$\pi_x$$ collapses to its **nearest Dirac mass**, located at its barycenter. On graph couplings, $$D_\alpha(\rho_S,\rho_R)=\|S-R\|_{L^2(\alpha)}$$, so $$\mathcal M_\alpha$$ is an isometric copy of the space of square-integrable maps. This really is a projection: $$P(P(\pi))=P(\pi)$$.

This result holds for **every coupling**, without OT optimality. There is no constraint $$S_\#\alpha=\beta$$: the projected target is $$\widetilde\beta=(T_\pi)_\#\alpha$$. It is also a statement about the fiberwise metric, **not ordinary Wasserstein distance on the product space**, which allows the source coordinate to move. The sufficient conditions below address the separate question of whether $$T_\pi$$ is an optimal transport map to its image.

## Optimal to a modified target

**Theorem (quadratic OT).** Let $$\alpha,\beta\in\mathcal P_2(\mathbb R^d)$$, the probability measures with finite second moments. If $$\pi$$ is an **optimal quadratic Kantorovich coupling**, then

$$
\widetilde\beta=(T_\pi)_\#\alpha,\qquad
\gamma=(\mathrm{Id},T_\pi)_\#\alpha
$$

is an optimal quadratic coupling between $$\alpha$$ and $$\widetilde\beta$$. Equivalently, $$T_\pi$$ solves the Monge problem for this modified target. No absolute continuity of $$\alpha$$ is needed.

**Proof.** Quadratic optimality provides a lower-semicontinuous convex potential $$\Phi$$ with

$$
y\in\partial\Phi(x)
\quad\text{for }\pi\text{-almost every }(x,y).
$$

Each subdifferential $$\partial\Phi(x)$$ is closed and convex, so it contains the conditional mean:

$$
T_\pi(x)\in\partial\Phi(x)
\quad\text{for }\alpha\text{-almost every }x.
$$

The projected graph is therefore still cyclically monotone, which is the quadratic OT optimality criterion for its marginals. This proves the theorem. The same argument appears in the proof of Theorem 12.4.4 of Ambrosio–Gigli–Savaré [[1]](#ref-ags).

For discrete sources the precise statement is **subgradient selection**, not necessarily a classical gradient: $$\Phi$$ can be nondifferentiable at source atoms. Wherever $$\Phi$$ is differentiable, $$T_\pi=\nabla\Phi$$.

This proof uses unregularized quadratic optimality of $$\pi$$. The entropic OT guarantee below has a different proof. For an arbitrary coupling, there is no general optimality guarantee: take $$\alpha=\beta=(\delta_{-1}+\delta_1)/2$$ and pair each point with its opposite. Its barycentric map is $$T(x)=-x$$, while the identity transports $$\alpha$$ to itself at zero cost.

These are **sufficient conditions**, not an if-and-only-if characterization. For example, an independent coupling $$\alpha\otimes\beta$$ has a constant barycentric map, which is automatically optimal to its point-mass image, even when the coupling is not an OT optimizer.

## Why this does not solve the original problem

In general, **$$\widetilde\beta\neq\beta$$**. For a source with $$n$$ atoms,

$$
\widetilde\beta=\sum_{i=1}^n a_i\delta_{T_\pi(x_i)}
$$

has **at most $$n$$ atoms**; images can coincide. It cannot equal a target with $$m>n$$ distinct, positively weighted atoms. For example, projecting the only coupling between $$\delta_0$$ and $$(\delta_{-1}+\delta_1)/2$$ produces $$\delta_0$$, not the two-point target.

More generally, conditional averaging preserves the mean but removes conditional variance. Writing $$M_2(\nu)=\int\|z\|^2\,\mathrm d\nu(z)$$ for the second moment,

$$
\begin{aligned}
&M_2(\beta)-M_2(\widetilde\beta)\\
&=\iint\|y-T_\pi(x)\|^2\,\mathrm d\pi(x,y).
\end{aligned}
$$

Consequently, with finite second moments, $$\widetilde\beta=\beta$$ **if and only if** $$\pi$$ was already induced by a map. There is no cheap recovery of the original target hidden in barycentric projection: it discards the spread of each source's destinations.

## Entropic projection and log sum exp

Now assume $$\pi=\pi^\varepsilon$$ is the **solution of the quadratic entropic OT problem** defined above, not an arbitrary positive coupling. Its optimal dual potentials $$f_i,g_j$$ can be normalized so that

$$
\pi^\varepsilon_{ij}
=a_i b_j
\exp\!\left(\frac{f_i+g_j-C_{ij}}{\varepsilon}\right).
$$

Fix the target potential values $$g_j$$. The source potential has a natural extension to every $$x\in\mathbb R^d$$:

$$
\begin{aligned}
Z_\varepsilon(x)
&=\sum_j b_j e^{(g_j-c(x,y_j))/\varepsilon},\\
f_\varepsilon(x)&=-\varepsilon\log Z_\varepsilon(x).
\end{aligned}
$$

The row constraint gives $$f_\varepsilon(x_i)=f_i$$. Define the conditional weights and extended map by

$$
q_j(x)=\frac{b_j e^{(g_j-c(x,y_j))/\varepsilon}}
{Z_\varepsilon(x)},\qquad
T_\varepsilon(x)=\sum_j q_j(x)y_j.
$$

At each source point, $$q_j(x_i)=\pi^\varepsilon_{ij}/a_i$$, so $$T_\varepsilon(x_i)=T_{\pi^\varepsilon}(x_i)$$. Differentiation gives

$$
\boxed{T_\varepsilon(x)=x-\nabla f_\varepsilon(x).}
$$

This is Proposition 2 of Pooladian–Niles-Weed [[3]](#ref-entropic-maps). With our squared-distance convention, it is **not** the gradient of the raw source cost-dual potential $$f_\varepsilon$$. The convex potential is instead

$$
\begin{aligned}
\ell_j(x)&=\langle x,y_j\rangle+g_j-\tfrac12\|y_j\|^2,\\
\Phi_\varepsilon(x)
&=\tfrac12\|x\|^2-f_\varepsilon(x)\\
&=\varepsilon\log\sum_j b_j e^{\ell_j(x)/\varepsilon},\\
T_\varepsilon(x)&=\nabla\Phi_\varepsilon(x).
\end{aligned}
$$

This is a log-sum-exp of affine functions, hence smooth and convex for a finite target. Differentiating once more makes the convexity particularly transparent:

$$
\nabla^2\Phi_\varepsilon(x)
=\frac1\varepsilon\operatorname{Cov}_{q(x)}(Y)
\succeq0.
$$

Here the covariance is taken over the target points with probabilities $$q_j(x)$$.

**Corollary (entropic OT).** If $$\pi^\varepsilon$$ solves the quadratic entropic OT problem, then $$T_{\pi^\varepsilon}$$ solves **unregularized quadratic Monge OT to its own pushforward**, because it is the gradient of the convex potential $$\Phi_\varepsilon$$. The coupling $$\pi^\varepsilon$$ need not be an unregularized optimal plan to $$\beta$$. This conclusion uses its entropic optimality and dual representation, not merely positivity or the marginal constraints. The potential formula also defines the map between and beyond the sampled source points.

## Move the target cloud

{% include blog-figure.html kind="barycentric" %}

Each blue source point sends mass along the faint gray coupling segments. Its solid black arrow ends at the conditional mean of those destinations; the black endpoints represent $$\widetilde\beta$$. Move the target cloud and vary its cardinality independently of the source cardinality. Comparing exact and entropic OT shows how regularization changes the conditional averages without making them reproduce the original target.

## Barycentric costs and weak transport

There is another way to use these conditional means: make them the quantities being optimized. In **quadratic weak OT**, the objective is

$$
\mathsf W_{\mathrm{bar}}^2(\alpha,\beta)
=\inf_{\pi\in\Pi(\alpha,\beta)}
\int\|x-T_\pi(x)\|^2\,\mathrm d\alpha(x).
$$

Unlike ordinary OT, this cost depends on each whole conditional distribution, not just on individual source–target pairs. It belongs to the general transport-cost framework of Gozlan, Roberto, Samson and Tetali [[4]](#ref-weak-duality).

For every coupling, Jensen's inequality gives

$$
\widetilde\beta\preceq_{\mathrm{cx}}\beta,
$$

meaning that $$\int h\,\mathrm d\widetilde\beta\leq\int h\,\mathrm d\beta$$ for every convex test function for which these quantities are defined. This is **convex order**: averaging reduces spread while preserving the mean.

Gozlan and Juillet [[5]](#ref-brenier-strassen) identify weak OT with projection onto this convex-order constraint:

$$
\mathsf W_{\mathrm{bar}}^2(\alpha,\beta)
=\min_{\eta\preceq_{\mathrm{cx}}\beta}
W_2^2(\alpha,\eta).
$$

Here $$W_2^2$$ uses the cost $$\|x-y\|^2$$, without the factor $$1/2$$. Their Brenier–Strassen theorem gives the weak-optimal barycentric map as the gradient of a convex $$C^1$$ potential, with a 1-Lipschitz gradient. The transport factors into this deterministic step followed by a martingale coupling to $$\beta$$.

Projecting an ordinary OT plan is **not generally the same as solving weak OT**. For $$\alpha=(\delta_{-1}+\delta_1)/2$$ and $$\beta=(\delta_{-2}+\delta_2)/2$$, ordinary OT sends each point to twice itself, with barycentric cost $$1$$. Weak OT can attain cost $$0$$: send three quarters of each source mass to the target of the same sign and one quarter to the opposite sign. Each conditional mean is then the source point itself.

## Bibliography

1. <span id="ref-ags"></span> Luigi Ambrosio, Nicola Gigli and Giuseppe Savaré. [*Gradient Flows in Metric Spaces and in the Space of Probability Measures*](https://link.springer.com/book/10.1007/b137080). Birkhäuser, 2005. Definition 5.4.2, p. 126; proof of Theorem 12.4.4, p. 317. [First-edition text](https://www2.stat.duke.edu/~sayan/ambrosio.pdf).

2. <span id="ref-computational-ot"></span> Gabriel Peyré and Marco Cuturi. [*Computational Optimal Transport*](https://arxiv.org/abs/1803.00567). *Foundations and Trends in Machine Learning* **11**(5–6), 355–607, 2019. Remark 4.11 and Eq. (4.19).

3. <span id="ref-entropic-maps"></span> Aram-Alexandre Pooladian and Jonathan Niles-Weed. [*Entropic estimation of optimal transport maps*](https://arxiv.org/abs/2109.12004). arXiv:2109.12004, 2021, revised 2024. Section 3, Proposition 2.

4. <span id="ref-weak-duality"></span> Nathael Gozlan, Cyril Roberto, Paul-Marie Samson and Prasad Tetali. [*Kantorovich duality for general transport costs and applications*](https://doi.org/10.1016/j.jfa.2017.08.015). *Journal of Functional Analysis* **273**, 3327–3405, 2017.

5. <span id="ref-brenier-strassen"></span> Nathael Gozlan and Nicolas Juillet. [*On a mixture of Brenier and Strassen theorems*](https://arxiv.org/abs/1808.02681). *Proceedings of the London Mathematical Society* **120**(3), 434–463, 2020.

6. <span id="ref-fiberwise-wasserstein"></span> Clément Cancès, Daniel Matthes, Ismael Medina and Bernhard Schmitzer. [*Continuum of coupled Wasserstein gradient flows*](https://arxiv.org/abs/2411.13969). arXiv:2411.13969, 2024. Section 2, Eq. (24), defines the fiberwise Wasserstein metric; the fixed marginal is written as the second coordinate there.
