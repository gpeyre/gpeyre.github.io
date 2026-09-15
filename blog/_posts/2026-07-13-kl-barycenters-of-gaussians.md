---
title: "The KL barycenter of Gaussians is Gaussian"
subtitle: "Average precisions, not covariances."
description: "A short derivation of the reverse-KL Gaussian barycenter, with an animated two-dimensional example."
topic: Probability
figure: gaussian
---

Take Gaussian distributions $$\nu_i=\mathcal N(m_i,\Sigma_i)$$ with positive definite covariances, and weights $$\lambda_i\geq0$$ summing to one. Their barycenter for the objective

$$
\min_\mu\sum_i\lambda_i\,\mathrm{KL}(\mu\mid\nu_i)
$$

is again Gaussian. The striking point is that we average the **precision matrices** $$\Sigma_i^{-1}$$, rather than the covariances themselves.

<!--more-->

The answer is $$\mu_\star=\mathcal N(m,\Sigma)$$, with

$$
\boxed{\quad
\Sigma^{-1}=\sum_i\lambda_i\Sigma_i^{-1},
\qquad
m=\Sigma\sum_i\lambda_i\Sigma_i^{-1}m_i.
\quad}
$$

The order of matrix multiplication matters. Equivalently, $$m=\sum_i\lambda_i\Sigma\Sigma_i^{-1}m_i$$.

{% include blog-figure.html kind="gaussian" %}

## A geometric mean of densities

Write $$p_i$$ for the density of $$\nu_i$$, and define the normalized geometric mean

$$
q(x)=\frac{1}{Z}\prod_i p_i(x)^{\lambda_i},
\qquad
Z=\int_{\mathbb R^d}\prod_i p_i(x)^{\lambda_i}\,\mathrm dx.
$$

For any probability density $$\rho$$ with finite objective,

$$
\begin{aligned}
\sum_i\lambda_i\mathrm{KL}(\rho\mid p_i)
&=\int\rho\log\rho
-\int\rho\sum_i\lambda_i\log p_i\\
&=\mathrm{KL}(\rho\mid q)-\log Z.
\end{aligned}
$$

The first term is nonnegative and vanishes exactly at $$\rho=q$$. Thus the optimizer is the normalized geometric mean of the input densities. This argument optimizes over **all probability laws**, not just over Gaussian candidates; singular laws have infinite KL divergence against a nondegenerate Gaussian.

## Completing the square

For Gaussian inputs, put

$$
Q=\sum_i\lambda_i\Sigma_i^{-1},
\qquad
h=\sum_i\lambda_i\Sigma_i^{-1}m_i.
$$

Ignoring constants independent of $$x$$, the logarithm of the product density is

$$
-\frac12 x^\top Qx+x^\top h
=-\frac12(x-Q^{-1}h)^\top Q(x-Q^{-1}h)+\text{constant}.
$$

Since $$Q\succ0$$, this is the log-density of a Gaussian with covariance $$Q^{-1}$$ and mean $$Q^{-1}h$$, proving the formula.

In one dimension,

$$
\sigma^{-2}=\sum_i\lambda_i\sigma_i^{-2},
\qquad
m=\frac{\sum_i\lambda_i m_i/\sigma_i^2}
{\sum_i\lambda_i/\sigma_i^2}.
$$

More concentrated inputs exert a stronger pull on the mean. In several dimensions, that pull depends on direction, which is why the mean in the animation need not follow the straight segment between the input means.

## The direction of KL matters

If we reverse the arguments and instead minimize $$\sum_i\lambda_i\mathrm{KL}(\nu_i\mid\mu)$$ over all probability laws, the optimizer is the **mixture** $$\sum_i\lambda_i\nu_i$$. That mixture is generally not Gaussian. The Gaussian closure above is specific to the stated orientation of KL.
