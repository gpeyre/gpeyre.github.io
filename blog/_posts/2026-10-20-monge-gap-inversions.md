---
title: "The Monge gap: a penalty for inversions"
subtitle: On the line, the excess transport cost becomes a convex regularizer of a learned map.
description: A quantitative rearrangement identity turns the Monge gap into a sum of hinge penalties, with an application to convex kernel regression.
date: 2026-10-20
topic: Optimal transport
keywords:
- Monge gap
- optimal transport regularization
- inversion penalty
- rearrangement inequality
- monotone rearrangement
- sorted matching
- bubble sort
- hinge loss
- convex regularizer
- kernel regression
- reproducing kernel Hilbert space
- RKHS
- representer theorem
- Gram matrix
- quadratic programming
- isotonic regression
- smooth hinge
- softplus
- damped Newton method
- strong convexity
- optimality certificate
- quadratic transport cost
- pushforward measure
- empirical measures
- Théo Uscidda
- Marco Cuturi
- Bernhard Schölkopf
- Gabriel Peyré
- écart de Monge
- pénalité d'inversions
- régression à noyaux
- réarrangement monotone
- régression isotone
proofs: true
embedded_experiment: true
---

Imagine fitting a response curve to noisy observations. You want a flexible model, but you also expect larger inputs to produce larger outputs. Smoothness alone does not enforce this: a perfectly smooth curve can run in the wrong direction. Optimal transport suggests a different penalty, one which measures how much a map would improve if we reassigned its outputs.

This is the *Monge gap*, introduced as a learning regularizer by Théo Uscidda and Marco Cuturi [[1]](#ref-monge). In one dimension, it has a particularly transparent meaning. On a uniform input grid, it is exactly a sum of penalties for inverted pairs. The identity in [Proposition 3.44 of *Optimal Transport for Machine Learners*](https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.3.4.44) [[2]](#ref-book) makes a transport-based regression problem an ordinary convex optimization problem.

<!--more-->

## Compare a map with its best rearrangement

For probability measures $$\alpha,\beta$$, let $$\Pi(\alpha,\beta)$$ denote the joint laws with these marginals. Given a cost $$c$$, write

$$
 \operatorname{OT}_c(\alpha,\beta)
 =\inf_{\pi\in\Pi(\alpha,\beta)}\int c(x,y)\,d\pi(x,y).
$$

A map $$T$$ pushes $$\alpha$$ to the law $$T_\#\alpha$$: if $$X\sim\alpha$$, then $$T(X)\sim T_\#\alpha$$. Assuming the following costs are finite, define

$$
 \mathcal M_\alpha^c(T)
 =\int c(x,T(x))\,d\alpha(x)
   -\operatorname{OT}_c(\alpha,T_\#\alpha).
$$

The graph law $$(\operatorname{Id},T)_\#\alpha$$ is an admissible coupling, so $$\mathcal M_\alpha^c(T)\ge0$$. The gap vanishes precisely when this map transports optimally to its *own* output law. It imposes no prescribed target distribution. In particular, zero gap does not mean that $$T$$ is the identity.

For quadratic cost on the line, optimal transport matches inputs and outputs in increasing order [[3]](#ref-computational). If the source is atomless, this is the rearranged map $$T^\uparrow=Q_{T_\#\alpha}\circ F_\alpha$$, with $$F_\alpha$$ the source CDF and $$Q$$ the target quantile. For a finite equal-weight cloud, it simply means sorting the outputs.

## An exact price for every inversion

Take equally spaced inputs $$x_i=x_1+(i-1)\Delta$$, with $$\Delta>0$$, and set $$\alpha_n=n^{-1}\sum_{i=1}^n\delta_{x_i}$$. Write $$t_i=T(x_i)$$, and denote their sorted values by $$t_{(1)}\le\cdots\le t_{(n)}$$. An inversion is a pair $$i<j$$ with $$t_i>t_j$$.

<span id="theorem-1"></span>

**Theorem 1 (the inversion identity).** For $$c(x,y)=\lvert x-y\rvert^2$$,

$$
 \begin{aligned}
 \mathcal M_{\alpha_n}^c(T)
 &=\frac1n\sum_{i=1}^n
       \bigl[(x_i-t_i)^2-(x_i-t_{(i)})^2\bigr]\\
 &=\frac{2\Delta}{n}\sum_{i<j}(t_i-t_j)_+,
 \end{aligned}
$$

where $$s_+=\max(s,0)$$. Thus the gap is convex in the fitted values, and its zero set is exactly the cone $$t_1\le\cdots\le t_n$$.

<details class="blog-proof">
<summary>Proof: add the savings from adjacent swaps</summary>
<div class="blog-proof-body" markdown="1">

Sorted matching minimizes the quadratic cost. Indeed, if $$x<x'$$ are matched to $$u>v$$, swapping the two outputs saves $$2(x'-x)(u-v)>0$$. For empirical laws with equal weights, the transport problem has a permutation optimizer, so uncrossing yields the sorted matching even when outputs coincide.

Now sort by swapping adjacent inverted outputs. At inputs $$x,x+\Delta$$, swapping $$u>v$$ decreases the normalized cost by

$$
 \frac{(x-u)^2+(x+\Delta-v)^2
       -(x-v)^2-(x+\Delta-u)^2}{n}
 =\frac{2\Delta}{n}(u-v).
$$

In bubble sort, each initially inverted pair of labeled outputs crosses once, and no other pair crosses. Adding all savings gives the identity. Each positive part of a linear function is convex; all terms vanish if and only if there is no inversion. $$\square$$

</div>
</details>

For example, at $$x=(0,1,2)$$, the outputs $$t=(2,0,1)$$ have two inversions, of sizes $$2$$ and $$1$$. Their gap is $$2(2+1)/3=2$$. The original cost is $$2$$, and sorting the outputs gives the identity map with zero cost.

Equal spacing is needed for the same coefficient in every pairwise penalty. Convexity survives on an arbitrary increasing input grid: cancellation of the squared terms gives

$$
 \mathcal M_{\alpha_n}^c(T)
 =\frac2n\left(
      \max_{\sigma}\sum_i x_i t_{\sigma(i)}
      -\sum_i x_it_i\right).
$$

A maximum of linear functions is convex. But replacing $$\Delta$$ in the inversion identity by an average spacing would generally be wrong.

## A transport regularizer for kernel regression

Let $$y_i$$ be noisy observations and $$\mathcal H_k$$ a real reproducing-kernel Hilbert space. With $$\lambda>0$$ and $$\gamma\ge0$$, consider

$$
 \min_{T\in\mathcal H_k}
 \frac1n\sum_i|T(x_i)-y_i|^2
 +\lambda\|T\|_{\mathcal H_k}^2
 +\gamma\mathcal M_{\alpha_n}^c(T).
$$

The three terms control prediction error, model complexity, and inversions. Their roles differ: smoothing removes oscillations, while the last term directly discourages decreasing pairs.

<span id="proposition-1"></span>

**Proposition 1 (a finite convex problem).** The minimizer has the form $$T=\sum_jq_jk(x_j,\cdot)$$. Writing $$K_{ij}=k(x_i,x_j)$$, its coefficients solve

$$
 \min_q\;
 \frac1n\|Kq-y\|^2+\lambda q^\top Kq
 +\frac{2\gamma\Delta}{n}
     \sum_{i<j}\bigl[(Kq)_i-(Kq)_j\bigr]_+.
$$

The minimizing function is unique because $$\lambda>0$$. The coefficient problem is convex; its coefficient vector is unique if $$K$$ is positive definite. A singular Gram matrix can give several coefficient vectors representing the same function.

<details class="blog-proof">
<summary>Proof: the orthogonal component cannot help</summary>
<div class="blog-proof-body" markdown="1">

Split $$T=T_\parallel+T_\perp$$, where $$T_\parallel$$ lies in the span of $$k(x_i,\cdot)$$. The reproducing identity gives $$T_\perp(x_i)=0$$ for every $$i$$. Both the data term and the Monge gap depend only on these evaluations, while

$$
 \|T\|_{\mathcal H_k}^2
 =\|T_\parallel\|_{\mathcal H_k}^2+\|T_\perp\|_{\mathcal H_k}^2.
$$

Since $$\lambda>0$$, a minimizer has $$T_\perp=0$$. On this finite-dimensional span, continuity and coercivity give existence. The squared Hilbert norm makes the original objective strictly convex, so the minimizing function is unique. Substituting the kernel expansion gives the stated objective; positive definiteness of $$K$$ also makes its coefficients unique. This is the representer-theorem argument [[4]](#ref-representer). $$\square$$

</div>
</details>

Introducing variables $$s_{ij}\ge0$$ and constraints $$s_{ij}\ge(Kq)_i-(Kq)_j$$ turns the last term into a linear function of the slacks. The resulting problem is a convex quadratic program.

## Numerical experimentation

Increase the transport penalty and watch decreasing pairs become more expensive. The fitted curve, its sorted evaluations, and the exact inversion gap expose three different objects: the learned map, its rearrangement, and the excess transport cost.

For the numerical solver only, replace $$s_+$$ by the smooth hinge $$h_\delta(s)=\delta\log(1+e^{s/\delta})$$, with $$\delta=0.015$$. Damped Newton iterations minimize this smooth objective, denoted by $$J_\delta(t)$$, in the fitted values $$t=(t_i)$$. The data term alone makes it $$2/n$$-strongly convex, giving the diagnostic

$$
 J_\delta(t)-\min J_\delta
 \le \frac n4\|\nabla J_\delta(t)\|^2.
$$

<figure>
<iframe class="idea-experiment" data-experiment="monge" title="Kernel regression with a Monge-gap penalty" src="{{ '/blog/preparations/assets/ot-lab/index.html?topic=monge' | relative_url }}" loading="lazy"></iframe>
<figcaption markdown="1">

The objective-error bound concerns the smooth optimization problem, not the exact hinge problem; its displayed floor of $$10^{-12}$$ reflects floating-point precision. Separately, the exact nonsmooth Monge gap is evaluated and checked against the difference of transport costs.

</figcaption>
</figure>

## Sorting is not regression

Sorting preserves the complete multiset of fitted values. Isotonic regression instead changes values, pooling neighboring observations when needed. Monge-gap regression balances prediction, complexity, and order. For the *exact hinge penalty*, in the finite-dimensional positive-definite setting, sending $$\gamma\to\infty$$ gives the unique kernel-regression fit subject to nondecreasing evaluations: comparison with any feasible fit bounds $$\gamma\mathcal M$$, coercivity gives compactness, and every limit solves the constrained problem.

This limit should not be confused with increasing $$\gamma$$ at a fixed numerical smoothing scale. The smooth hinge is positive even for an ordered pair, and can keep pushing its values apart. Since $$0\le h_\delta(s)-s_+\le\delta\log2$$, the smoothed and exact objectives differ uniformly by at most $$\gamma\Delta(n-1)\delta\log2$$. To recover the same constrained limit while smoothing, it suffices to let $$\delta$$ decrease so that $$\gamma\delta\to0$$.

The constraint here is on the sampled inputs. It does not certify monotonicity between them. Nor does the pairwise formula directly extend to higher dimensions, where optimal maps are described by convex potentials rather than a total order. These boundaries help explain why this one-dimensional identity is so useful: an intrinsically transport-based criterion becomes a very concrete convex penalty.

## References

<ol class="references">
<li id="ref-monge">Théo Uscidda and Marco Cuturi. <a href="https://proceedings.mlr.press/v202/uscidda23a.html"><em>The Monge Gap: A Regularizer to Learn All Transport Maps</em></a>. ICML, PMLR 202, 2023.</li>
<li id="ref-book">Gabriel Peyré. <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.3.4.44"><em>Optimal Transport for Machine Learners</em>, Proposition 3.44</a>. Book manuscript.</li>
<li id="ref-computational">Gabriel Peyré and Marco Cuturi. <a href="https://arxiv.org/abs/1803.00567"><em>Computational Optimal Transport</em></a>. Foundations and Trends in Machine Learning 11(5–6), 355–607, 2019.</li>
<li id="ref-representer">Bernhard Schölkopf, Ralf Herbrich, and Alex J. Smola. <a href="https://doi.org/10.1007/3-540-44581-1_27"><em>A Generalized Representer Theorem</em></a>. Computational Learning Theory, 416–426, 2001.</li>
</ol>
