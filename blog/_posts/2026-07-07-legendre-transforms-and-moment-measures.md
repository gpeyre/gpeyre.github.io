---
title: "A convex functional hidden behind the Legendre transform"
subtitle: "From Prékopa–Leindler to moment measures."
description: "Why minus the log-integral of the exponential of a negative convex conjugate is convex, and how its variation produces a moment measure."
topic: Convexity
---

For a convex function $$f:\mathbb R^d\to\mathbb R\cup\{+\infty\}$$, write

$$
f^*(y)=\sup_x\{\langle x,y\rangle-f(x)\}
$$

for its Legendre transform. A beautiful consequence of Prékopa–Leindler is that the functional

$$
\Phi(f)=-\log\int_{\mathbb R^d}e^{-f^*(y)}\,\mathrm dy
$$

is convex, on a class of proper closed convex functions for which the integrals below are finite and strictly positive.

<!--more-->

## A short proof

Let $$f_t=(1-t)f_0+tf_1$$, $$0<t<1$$. For arbitrary $$y_0,y_1$$,

$$
f_t^*((1-t)y_0+ty_1)
\leq (1-t)f_0^*(y_0)+tf_1^*(y_1).
$$

Indeed, in the supremum defining the left-hand side, the expression is a convex combination of the two corresponding expressions for $$f_0^*$$ and $$f_1^*$$. The supremum of that sum is at most the sum of their suprema.

Setting $$g_t=e^{-f_t^*}$$ gives

$$
g_t((1-t)y_0+ty_1)\geq g_0(y_0)^{1-t}g_1(y_1)^t.
$$

Prékopa–Leindler therefore implies

$$
\int g_t\geq
\left(\int g_0\right)^{1-t}
\left(\int g_1\right)^t.
$$

Taking minus the logarithm proves

$$
\Phi(f_t)\leq (1-t)\Phi(f_0)+t\Phi(f_1).
$$

## Where moment measures enter

A convex potential $$u$$ with $$0<Z_u=\int e^{-u}<\infty$$ defines a log-concave probability density. Its **moment measure** is the distribution of its gradient under that density:

$$
\mu_u=(\nabla u)_\#
\left(\frac{e^{-u(x)}}{Z_u}\,\mathrm dx\right).
$$

In other words, sample $$X$$ with density proportional to $$e^{-u}$$ and look at $$\nabla u(X)$$.

The connection to $$\Phi$$ can be seen by differentiation. Under smoothness, strict convexity, and integrability assumptions justifying the calculation, a perturbation $$f_t=f+th$$ satisfies

$$
\left.\frac{\mathrm d}{\mathrm dt}f_t^*(y)\right|_{t=0}
=-h(\nabla f^*(y)).
$$

Consequently,

$$
\left.\frac{\mathrm d}{\mathrm dt}\Phi(f+th)\right|_{t=0}
=-\int h\,\mathrm d\mu_{f^*}.
$$

Thus the stationarity equation for the convex functional

$$
\Phi(f)+\int f\,\mathrm d\nu
$$

is precisely $$\mu_{f^*}=\nu$$: finding a potential with a prescribed moment measure becomes a variational problem.

The rigorous existence and uniqueness theory, including the appropriate boundary regularity, is developed by Dario Cordero-Erausquin and Bo’az Klartag in [*Moment Measures*](https://arxiv.org/abs/1304.0630). In particular, a probability measure with finite first moment, barycenter zero, and support not contained in a proper hyperplane is a moment measure of an essentially continuous convex potential, unique up to translation after normalizing its exponential density.
