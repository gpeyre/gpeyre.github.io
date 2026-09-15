---
title: "Why I love Gaussian-preserving flows"
subtitle: "A contraction, a variational principle, and a beautifully excessive proof about Gaussian convolution."
description: "Gelbrich's Gaussian contraction and a criterion explained by Hugo Lavenant, with proofs for Gaussian relative entropy and heat flow."
topic: Optimal transport
---

I love Gaussians. I especially love PDEs that preserve Gaussians—and, more specifically, Wasserstein gradient flows that do so. An infinite-dimensional evolution of a probability density then reduces exactly to the evolution of a mean vector and a covariance matrix.

This is the topic of the very last section of my new book [*Optimal Transport for Machine Learners*](https://www.gpeyre.com/ot4ml/): **16.5, “Flows over the Gaussian Manifold.”**

<!--more-->

Here is one of my favorite explanations of this phenomenon. It combines a simple but powerful theorem of Gelbrich with a variational observation explained to me by Hugo Lavenant. The reward will be an extravagantly long proof of a familiar fact: convolving a Gaussian with a Gaussian still gives a Gaussian.

## Gaussian projection means matching moments

Let $$\mathcal P_2(\mathbb R^d)$$ denote probability measures with finite second moment. For $$\alpha\in\mathcal P_2(\mathbb R^d)$$, define its mean and covariance by

$$
\begin{aligned}
m_\alpha&=\int x\,\mathrm d\alpha(x),\\
\Sigma_\alpha
&=\int(x-m_\alpha)(x-m_\alpha)^\top\,\mathrm d\alpha(x).
\end{aligned}
$$

Its **Gaussian projection** is

$$
\boxed{\mathsf G\alpha=\mathcal N(m_\alpha,\Sigma_\alpha).}
$$

Thus we retain the first two moments and replace everything else by a Gaussian law. Singular covariances are allowed, so this is defined on all of $$\mathcal P_2$$. The nondegenerate Gaussians form the Gaussian manifold; including the degenerate ones gives its closure.

This is a projection in the sense that $$\mathsf G(\mathsf G\alpha)=\mathsf G\alpha$$. It is a *moment-matching* projection, not a claim that this Gaussian is the nearest one to $$\alpha$$ in Wasserstein distance.

## Gelbrich's contraction theorem

The crucial result is the following form of the inequality in Matthias Gelbrich's [1990 paper, *On a Formula for the L² Wasserstein Metric between Measures on Euclidean and Hilbert Spaces*](https://doi.org/10.1002/mana.19901470121).

**Theorem.** For every $$\alpha,\beta\in\mathcal P_2(\mathbb R^d)$$,

$$
\boxed{
W_2(\mathsf G\alpha,\mathsf G\beta)
\leq W_2(\alpha,\beta).
}
$$

“Contraction” here means **1-Lipschitz**, or nonexpansive, not a strict decrease. In particular, if $$\gamma$$ is already Gaussian,

$$
W_2(\mathsf G\alpha,\gamma)\leq W_2(\alpha,\gamma).
$$

### A short proof by Gaussianizing a coupling

Take any coupling $$(X,Y)$$ of $$\alpha$$ and $$\beta$$. Construct a jointly Gaussian vector $$(\widetilde X,\widetilde Y)$$ with the same mean and the same full block covariance matrix as $$(X,Y)$$. Such a Gaussian exists because a covariance matrix is positive semidefinite, even when it is singular.

The marginals of this new coupling are $$\mathsf G\alpha$$ and $$\mathsf G\beta$$. Its quadratic transport cost is unchanged: the expectation of a quadratic polynomial depends only on the first two moments. Therefore,

$$
\begin{aligned}
W_2^2(\mathsf G\alpha,\mathsf G\beta)
&\leq\mathbb E\|\widetilde X-\widetilde Y\|^2\\
&=\mathbb E\|X-Y\|^2.
\end{aligned}
$$

Taking the infimum over all original couplings proves the theorem.

Notice that the **joint** covariance, including the cross-covariance, is preserved. Replacing the two variables by independent Gaussians would not give this argument.

Equivalently, combining the theorem with the Gaussian Wasserstein formula gives Gelbrich's lower bound

$$
\begin{gathered}
W_2^2(\alpha,\beta)\\
\geq\|m_\alpha-m_\beta\|^2
+\mathcal B^2(\Sigma_\alpha,\Sigma_\beta),
\end{gathered}
$$

where the Bures covariance distance is

$$
\begin{aligned}
\mathcal B^2(A,B)
&=\operatorname{tr}A+\operatorname{tr}B\\
&\quad-2\operatorname{tr}\bigl((A^{1/2}BA^{1/2})^{1/2}\bigr).
\end{aligned}
$$

## Hugo Lavenant's Gaussian-preservation criterion

[Hugo Lavenant](https://hugolav.github.io/) explained to me the following very useful consequence: if Gaussian projection does not increase an energy, then its Wasserstein minimizing movements can stay Gaussian.

Suppose $$f:\mathcal P_2(\mathbb R^d)\to(-\infty,+\infty]$$ satisfies

$$
\boxed{f(\mathsf G\alpha)\leq f(\alpha)
\quad\text{for every }\alpha.}
$$

To see why this is a sufficient condition for Gaussian-preserving gradient flow, use the [Jordan–Kinderlehrer–Otto scheme](https://doi.org/10.1137/S0036141096303359). Given a current measure $$\gamma$$ and a time step $$\tau>0$$, minimize

$$
J_{\tau,\gamma}(\eta)
=f(\eta)+\frac{1}{2\tau}W_2^2(\eta,\gamma).
$$

**Discrete preservation theorem.** Assume this minimization has a finite minimizer. If $$\gamma$$ is Gaussian, the Gaussian projection of any minimizer is also a minimizer. In particular, a unique minimizer must be Gaussian.

**Proof.** Since $$\mathsf G\gamma=\gamma$$, the energy inequality and Gelbrich's contraction give, for every competitor $$\eta$$,

$$
\begin{aligned}
J_{\tau,\gamma}(\mathsf G\eta)
&=f(\mathsf G\eta)
+\frac{1}{2\tau}W_2^2(\mathsf G\eta,\mathsf G\gamma)\\
&\leq f(\eta)+\frac{1}{2\tau}W_2^2(\eta,\gamma)\\
&=J_{\tau,\gamma}(\eta).
\end{aligned}
$$

Applying this to a minimizer proves the assertion.

Starting from a Gaussian, we can consequently choose a Gaussian at every JKO step. If each step has a unique minimizer, no choice is needed. Whenever these minimizing movements converge in $$W_2$$ to the unique Wasserstein gradient flow, that flow stays Gaussian: the fixed-point set of the continuous map $$\mathsf G$$ is closed.

These existence, convergence, and uniqueness assumptions matter for the continuous-time conclusion; the energy inequality alone is not a well-posedness theorem for an arbitrary $$f$$. They hold for the entropy and quadratic-confinement examples below.

The point is that the minimization takes place over **all** probability measures. Gaussianity is an exact invariance property, not an approximation obtained by restricting the optimization to Gaussians.

## Relative entropy to a Gaussian satisfies the criterion

Fix a nondegenerate Gaussian reference

$$
\beta=\mathcal N(m_\beta,B),
\qquad B\succ0,
$$

with density $$q$$, and set

$$
f(\alpha)=\mathrm{KL}(\alpha\mid\beta)
=\int\rho\log\frac{\rho}{q}\,\mathrm dx
$$

when $$\alpha=\rho\,\mathrm dx$$, with value $$+\infty$$ when the relative entropy is not finite.

In fact, there is an exact identity:

$$
\boxed{
\begin{aligned}
\mathrm{KL}(\alpha\mid\beta)
&=\mathrm{KL}(\alpha\mid\mathsf G\alpha)\\
&\quad+\mathrm{KL}(\mathsf G\alpha\mid\beta).
\end{aligned}
}
$$

Here the identity is asserted for finite $$\mathrm{KL}(\alpha\mid\beta)$$; this ensures that $$\alpha$$ has a density and a positive definite covariance. The projection inequality is automatic when the right-hand energy $$f(\alpha)$$ is infinite.

### Proof of the identity

Write $$g$$ for the density of $$\mathsf G\alpha$$. Both $$g$$ and $$q$$ are Gaussian, so $$\log(g/q)$$ is a polynomial of degree at most two. Since $$\alpha$$ and $$\mathsf G\alpha$$ have the same first two moments,

$$
\int\rho\log\frac{g}{q}\,\mathrm dx
=\int g\log\frac{g}{q}\,\mathrm dx.
$$

Now split the logarithm:

$$
\log\frac{\rho}{q}
=\log\frac{\rho}{g}+\log\frac{g}{q}.
$$

Integrating against $$\rho$$, the first term is $$\mathrm{KL}(\alpha\mid\mathsf G\alpha)$$. By the moment identity, the second is $$\mathrm{KL}(\mathsf G\alpha\mid\beta)$$. This proves the decomposition.

Relative entropy is nonnegative, so

$$
\mathrm{KL}(\mathsf G\alpha\mid\beta)
\leq\mathrm{KL}(\alpha\mid\beta).
$$

The energy lost by Gaussian projection is **exactly** $$\mathrm{KL}(\alpha\mid\mathsf G\alpha)$$. Equality holds precisely when $$\alpha$$ is Gaussian. The sufficient condition is therefore satisfied, with a strict improvement for every non-Gaussian measure of finite energy.

## With a Gaussian reference, the PDE is Ornstein–Uhlenbeck

There is an important distinction before arriving at heat flow. For a smooth density, the Wasserstein descent equation is

$$
\partial_t\rho
=\nabla\cdot\left(\rho\,\nabla\frac{\delta f}{\delta\rho}\right).
$$

For relative entropy to the fixed Gaussian $$\beta$$,

$$
\frac{\delta f}{\delta\rho}
=\log\rho-\log q+1.
$$

Because $$\nabla\log q(x)=-B^{-1}(x-m_\beta)$$, this gives

$$
\boxed{
\partial_t\rho
=\Delta\rho
+\nabla\cdot\bigl(\rho B^{-1}(x-m_\beta)\bigr).
}
$$

This is the **Ornstein–Uhlenbeck equation**: heat diffusion plus a linear restoring drift. It is not the pure heat equation. Hugo's criterion proves that its solutions starting from a Gaussian remain Gaussian.

Their parameters satisfy the finite-dimensional equations

$$
\begin{aligned}
\dot m_t&=-B^{-1}(m_t-m_\beta),\\
\dot\Sigma_t&=2I-B^{-1}\Sigma_t-\Sigma_tB^{-1}.
\end{aligned}
$$

This is exactly the kind of reduction that makes Gaussian-preserving PDEs so appealing.

## Removing confinement gives the heat equation

To obtain pure heat flow, use the negative entropy

$$
\operatorname{Ent}(\alpha)
=\int\rho\log\rho\,\mathrm dx,
$$

extended by $$+\infty$$ to measures without a density. This is entropy relative to Lebesgue measure, not relative entropy to a fixed Gaussian probability measure.

For finite entropy, the same moment-matching argument gives

$$
\begin{aligned}
\operatorname{Ent}(\alpha)
-\operatorname{Ent}(\mathsf G\alpha)
&=\mathrm{KL}(\alpha\mid\mathsf G\alpha)\\
&\geq0.
\end{aligned}
$$

Indeed, $$\log g$$ is quadratic, so $$\int\rho\log g=\int g\log g$$. The resulting inequality $$\operatorname{Ent}(\mathsf G\alpha)\leq\operatorname{Ent}(\alpha)$$ also holds when the right side is infinite. Equivalently, Gaussians maximize Shannon entropy among laws with prescribed mean and covariance; our functional has the opposite sign.

Thus entropy satisfies Hugo's condition too. Its Wasserstein gradient flow is

$$
\partial_t\rho
=\nabla\cdot\bigl(\rho\nabla\log\rho\bigr)
=\Delta\rho.
$$

Starting from a nondegenerate Gaussian, the flow must remain Gaussian. Integrating the heat equation against $$x$$ and $$xx^\top$$ gives

$$
\dot m_t=0,
\qquad
\dot\Sigma_t=2I.
$$

Consequently,

$$
\alpha_0=\mathcal N(m_0,\Sigma_0)
\quad\Longrightarrow\quad
\alpha_t=\mathcal N(m_0,\Sigma_0+2tI).
$$

## An extravagant proof about convolution

The heat equation also has the familiar convolution representation

$$
\rho_t=\rho_0*k_t,
\qquad
k_t(x)=\frac{\exp(-\|x\|^2/(4t))}{(4\pi t)^{d/2}},
$$

where $$k_t$$ is the density of $$\mathcal N(0,2tI)$$. Combining this representation with the Gaussian invariance just proved yields

$$
\boxed{
\begin{gathered}
\mathcal N(m_0,\Sigma_0)*\mathcal N(0,2tI)\\
=\mathcal N(m_0,\Sigma_0+2tI).
\end{gathered}
}
$$

A linear change of variables gives the same statement for any positive definite Gaussian convolution kernel; translations add its mean, and degenerate cases follow by approximation.

Of course, one could prove Gaussian convolution closure directly using characteristic functions in a few lines. Instead, we have passed through a contraction theorem, a variational time discretization, an entropy identity, and a PDE.

Probably one of the most overkill proofs of this elementary fact—but a beautiful one. The real reward is the general preservation principle, which applies far beyond this particular convolution identity.
