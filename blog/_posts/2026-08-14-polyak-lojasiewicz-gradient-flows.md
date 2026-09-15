---
title: "Fast gradient flows without convexity"
subtitle: "The Polyak–Łojasiewicz condition, and a favourite banana-shaped valley."
description: "Why a gradient inequality can be enough for exponential convergence, illustrated by an interactive curved valley."
topic: Optimization
figure: pl
---

Convexity is not the only route to fast optimization. The Polyak–Łojasiewicz (P–L) condition asks for something more directly connected to gradient descent: away from the minimum value, the gradient must remain large enough.

For a differentiable function with minimum value $$f_\star$$, the condition is

$$
\frac12\|\nabla f(x)\|^2\geq \mu\bigl(f(x)-f_\star\bigr),
\qquad \mu>0.
$$

It rules out stationary points with a nonoptimal value, without requiring a convex landscape.

<!--more-->

Along the gradient flow $$\dot x=-\nabla f(x)$$,

$$
\frac{\mathrm d}{\mathrm dt}(f(x(t))-f_\star)
=-\|\nabla f(x(t))\|^2
\leq -2\mu(f(x(t))-f_\star).
$$

Integration gives the exponential decay

$$
f(x(t))-f_\star
\leq e^{-2\mu t}\bigl(f(x(0))-f_\star\bigr).
$$

This is a statement about the **objective value**, not necessarily convergence to a unique minimizer.

## A curved valley

One of my favourite illustrations is the [banana-shaped gradient flow in the Mathematical Nexus](https://www.gpeyre.com/mathematical-nexus/python/p-l-flow/banana_gradient_flow_interactive.html). Let $$I=[0,1]$$ and, for $$b\geq0$$, consider

$$
F_b(x,y)=\operatorname{dist}(x,I)^2+
\bigl(y+b(x-\tfrac12)^2\bigr)^2.
$$

Its minimizers form the parabolic arc $$y=-b(x-\tfrac12)^2$$, $$x\in I$$. For $$b>0$$ this set is not convex, so neither is the function. Nevertheless, its gradient flow has an exponential energy bound on each bounded sublevel set.

{% include blog-figure.html kind="pl" %}

There is a useful qualification here: this banana does **not** have one uniform, global P–L constant when $$b>0$$. Set

$$
r=x-\operatorname{proj}_I(x),\qquad
z=y+b(x-\tfrac12)^2,\qquad
c=2b(x-\tfrac12).
$$

Then $$F_b=r^2+z^2$$ and $$\nabla F_b=2(r+cz,z)$$. Inverting this shear gives

$$
\sqrt{r^2+z^2}
\leq (1+|c|)\sqrt{(r+cz)^2+z^2}.
$$

On $$F_b\leq R$$, one has $$|x-\tfrac12|\leq \tfrac12+\sqrt R$$, hence

$$
\frac12\|\nabla F_b\|^2
\geq
\frac{2}{\bigl[1+2b(\tfrac12+\sqrt R)\bigr]^2}\,F_b.
$$

The flow stays in its initial sublevel, so this is enough for exponential decay along every trajectory. The rate may depend on the starting sublevel.

## Ten years of a useful perspective

The 2016 paper by Hamed Karimi, Julie Nutini, and Mark Schmidt, [*Linear Convergence of Gradient and Proximal-Gradient Methods Under the Polyak–Łojasiewicz Condition*](https://arxiv.org/abs/1608.04636), is an excellent entry point into this viewpoint, including its discrete and proximal variants.

*Update, 15 September 2026:* the paper received the **ECML PKDD 2026 Test-of-Time Award**, as [announced by PICUS Lab](https://it.linkedin.com/company/picuslab), the award committee chair’s research group.
