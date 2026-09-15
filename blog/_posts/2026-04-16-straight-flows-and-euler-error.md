---
title: "Straighter flows, smaller Euler errors"
subtitle: "Making the material acceleration explicit in the Cauchy–Lipschitz estimate."
description: "A detailed Euler error bound isolating trajectory acceleration, with a proof and an interactive example."
topic: Differential equations
figure: ode
---

It is intuitively clear that straighter trajectories should be easier to integrate numerically. This intuition is especially appealing in flow matching, where one would like to generate samples with as few velocity evaluations as possible.

I wanted a precise estimate that exhibits this dependence directly. Rewriting the usual stability argument behind Cauchy–Lipschitz gives one: Euler’s global error is controlled by the **material acceleration** along the exact trajectory, multiplied by a stability factor.

<!--more-->

This post develops the argument in my [note *Rectified Flow meets Cauchy–Lipschitz*](https://github.com/gpeyre/DiscreteDiffusion/tree/main/draft/cauchy-lipschitz).

## The setting

Consider an ordinary differential equation on $$[0,1]$$:

$$
\dot X(t)=v(t,X(t)),\qquad X(0)=x_0.
$$

Assume that $$v$$ is continuously differentiable and globally Lipschitz in space, uniformly in time, with constant $$L\geq0$$:

$$
\|v(t,x)-v(t,y)\|\leq L\|x-y\|.
$$

These assumptions ensure a unique solution throughout the interval. By the chain rule,

$$
\ddot X(t)=
\underbrace{\partial_t v(t,X(t))
+D_xv(t,X(t))\,v(t,X(t))}_{a(t,X(t))}.
$$

The vector field $$a=\partial_t v+D_xv\,v$$ is the material acceleration: it measures the change in velocity **while following the flow**. Set

$$
A_X=\max_{0\leq t\leq1}\|a(t,X(t))\|.
$$

A global bound $$A_{\max}=\sup_{t,x}\|a(t,x)\|$$ can replace $$A_X$$ when available, but only the acceleration along this trajectory is needed below.

## The bound

For $$h=1/n$$ and $$t_k=kh$$, the explicit Euler scheme is

$$
x_{k+1}=x_k+h\,v(t_k,x_k).
$$

For $$L>0$$, it satisfies

$$
\boxed{
\|X(t_k)-x_k\|
\leq \frac{hA_X}{2}\,
\frac{(1+hL)^k-1}{L}
\leq \frac{hA_X}{2}\,
\frac{e^{Lt_k}-1}{L}.
}
$$

When $$L=0$$, the continuous limiting expression is
$$\|X(t_k)-x_k\|\leq t_khA_X/2$$.
In particular, for every $$L\geq0$$,

$$
\max_{0\leq k\leq n}\|X(t_k)-x_k\|
\leq \frac{e^L A_X}{2n}.
$$

This separates three effects: the step size $$1/n$$, the sensitivity $$e^L$$ to perturbations, and the acceleration $$A_X$$ of the exact path.

{% include blog-figure.html kind="ode" %}

## Proof: a local defect followed by propagation

### 1. The one-step defect

Taylor’s formula in integral form gives

$$
X(t_{k+1})=X(t_k)+h\,v(t_k,X(t_k))+\delta_k,
$$

where

$$
\delta_k=\int_{t_k}^{t_{k+1}}
(t_{k+1}-s)\,\ddot X(s)\,\mathrm ds.
$$

Thus

$$
\|\delta_k\|\leq
A_X\int_{t_k}^{t_{k+1}}(t_{k+1}-s)\,\mathrm ds
=\frac{h^2A_X}{2}.
$$

The local Euler defect is precisely an accumulated acceleration.

### 2. Stability transports the defect

Let $$e_k=X(t_k)-x_k$$. Subtracting the Euler update from the exact one,

$$
e_{k+1}
=e_k+h\bigl(v(t_k,X(t_k))-v(t_k,x_k)\bigr)+\delta_k.
$$

Spatial Lipschitz continuity yields

$$
\|e_{k+1}\|
\leq(1+hL)\|e_k\|+\frac{h^2A_X}{2}.
$$

Starting from $$e_0=0$$ and unrolling this recurrence,

$$
\|e_k\|
\leq\frac{h^2A_X}{2}
\sum_{j=0}^{k-1}(1+hL)^{k-1-j}.
$$

For $$L>0$$, the geometric sum gives the first bound. The inequality $$(1+hL)^k\leq e^{Lt_k}$$ gives the second. For $$L=0$$, the sum is simply $$k$$.

Finally,
$$ (e^{Lt}-1)/L=\int_0^t e^{Ls}\,\mathrm ds\leq e^L $$
for $$0\leq t\leq1$$, with the same conclusion at $$L=0$$. This proves the uniform estimate.

### 3. A more local version

The proof also retains the distribution of acceleration over time. If

$$
A_j=\max_{t_j\leq s\leq t_{j+1}}\|\ddot X(s)\|,
$$

then

$$
\|e_k\|
\leq\frac{h^2}{2}
\sum_{j=0}^{k-1}(1+hL)^{k-1-j}A_j.
$$

Errors generated earlier have more time to be amplified. This is a discrete Duhamel principle: local defects are propagated and then summed.

## What exactly does “straight” mean?

If $$a(t,X(t))=0$$ for all $$t$$, the trajectory has constant velocity, and Euler is exact at every grid point, even for a large step. The recurrence above proves this immediately.

But a path can be geometrically straight and still accelerate. For example, $$X(t)=(e^t,0)$$ lies on a line, yet has nonzero acceleration and a nonzero Euler error. The relevant notion is therefore **straightness with constant speed**, in the chosen time parametrization.

The interactive example uses

$$
v(t,x)=\bigl(1,b\pi\cos(\pi t)\bigr),
\qquad X(t)=\bigl(t,b\sin(\pi t)\bigr).
$$

Here $$L=0$$ and $$A_X=b\pi^2$$. The error bound is explicit, and lowering $$b$$ decreases both the bending and the bound, until Euler is exact at $$b=0$$.

## The connection to flow matching

This estimate explains a numerical motivation for [rectified flow](https://arxiv.org/abs/2209.03003): trajectories with small material acceleration have small local Euler defects. It does not, by itself, bound statistical error, velocity-estimation error, or the discrepancy between a learned model and the target distribution. It isolates the discretization error for a given velocity field.

It also makes the trade-off explicit: reducing acceleration helps, but a large spatial Lipschitz constant can still amplify the remaining error.
