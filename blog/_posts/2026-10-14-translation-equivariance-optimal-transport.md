---
title: "Translation equivariance of optimal transport"
subtitle: "When moving both marginals preserves the optimal matching"
description: "Which transport costs preserve optimal plans under a common translation? A characterization by the mixed Hessian, a short proof, and quadratic, cubic, and exponential examples."
topic: Optimal transport
---

If we translate two point clouds by the same vector, should their optimal transport plan simply translate along with them? For a cost such as the squared Euclidean distance, the answer is immediate: every pairwise displacement stays the same. But this is only one way for the optimal matching to be preserved.

The more interesting question is to characterize **all costs whose optimal plans commute with translations**. A cost may change without changing its minimizers: multiplying it by a positive constant or adding terms that depend on the source point alone or the target point alone has no effect on the optimizer. Under suitable nondegeneracy assumptions, these two freedoms give the complete answer.

<!--more-->

## The setup and the question

Let $$\mu,\nu$$ be compactly supported probability measures on $$\mathbb R^d$$, and let $$c:\mathbb R^d\times\mathbb R^d\to\mathbb R$$ be a finite, continuous cost. Write $$\Pi(\mu,\nu)$$ for the couplings with these marginals, and

$$
\operatorname{Opt}_c(\mu,\nu)
=\operatorname*{argmin}_{\pi\in\Pi(\mu,\nu)}
\int c(x,y)\,\mathrm d\pi(x,y).
$$

This is the **set of all optimal plans**. Compact support ensures that the minimum exists, even when the cost is not nonnegative or convex.

For a translation vector $$a\in\mathbb R^d$$, define

$$
\begin{aligned}
\tau_a(x)&=x+a,\\
S_a(x,y)&=(x+a,y+a),\\
\mu_a&=(\tau_a)_\#\mu,\\
\nu_a&=(\tau_a)_\#\nu.
\end{aligned}
$$

Here the pushforward $$F_\#\mu$$ is the distribution of $$F(X)$$ when $$X\sim\mu$$. The question is:

**For which costs does the following identity hold for every $$a,\mu,\nu$$?**

<div class="blog-equation-scroll" tabindex="0" role="region" aria-label="Translation equivariance equation">
<div class="blog-equation-content" markdown="1">

$$
\boxed{\operatorname{Opt}_c(\mu_a,\nu_a)
=\{(S_a)_\#\pi:\pi\in\operatorname{Opt}_c(\mu,\nu)\}.}
$$

</div>
</div>

This is *translation equivariance of optimal transport*. For point clouds, the entries of the coupling matrix remain the same: only the point locations move. When an optimal plan is induced by a map $$T$$, its translated map is $$T_a(x)=a+T(x-a)$$. Neither uniqueness nor the existence of an optimal map is needed for the question about plans.

## A characterization by the mixed Hessian

**Theorem.** Assume $$d\geq2$$, $$c\in C^3(\mathbb R^d\times\mathbb R^d)$$, and that the mixed Hessian

$$
M(x,y)=D^2_{xy}c(x,y),\qquad
M_{ij}=\partial_{x_i}\partial_{y_j}c,
$$

is invertible at every $$(x,y)$$. Optimal transport is translation-equivariant for all compactly supported marginals **if and only if** there is a single vector $$k\in\mathbb R^d$$ such that, for every $$a$$, there are functions $$f_a,g_a$$ with

<div class="blog-equation-scroll" tabindex="0" role="region" aria-label="Cost characterization equation">
<div class="blog-equation-content" markdown="1">

$$
\boxed{c(x+a,y+a)=e^{k\cdot a}c(x,y)+f_a(x)+g_a(y).}
$$

</div>
</div>

Equivalently, the mixed Hessian satisfies

$$
\boxed{M(x+a,y+a)=e^{k\cdot a}M(x,y).}
$$

The functions $$f_a,g_a$$ depend on the translation but not on the marginals. No symmetry or convexity of $$c$$ is assumed. The sufficient condition works in every dimension, even for degenerate costs; the hypotheses above are needed for the general converse.

## A short proof

**Sufficiency.** Translating both coordinates gives a bijection between the two coupling sets. For any $$\pi\in\Pi(\mu,\nu)$$,

$$
\int c\,\mathrm d(S_a)_\#\pi
=e^{k\cdot a}\int c\,\mathrm d\pi
+\int f_a\,\mathrm d\mu+\int g_a\,\mathrm d\nu.
$$

The last two terms are fixed by the marginals, and the multiplicative factor is positive. Thus the entire set of minimizers is preserved.

**Necessity begins with two-point marginals.** Fix $$a$$ and put $$c_a(x,y)=c(x+a,y+a)$$. Give mass $$1/2$$ to each of $$x,x+\varepsilon u$$ and $$y,y+\varepsilon v$$. The extreme couplings are the direct and crossed matchings. Twice their cost difference is

$$
\Delta_\varepsilon c=c(x,y)+c(x+\varepsilon u,y+\varepsilon v)
-c(x+\varepsilon u,y)-c(x,y+\varepsilon v).
$$

Equivariance says that $$\Delta_\varepsilon c$$ and $$\Delta_\varepsilon c_a$$ have the same sign, including ties. Dividing by $$\varepsilon^2$$ and letting $$\varepsilon\to0$$ gives the bilinear forms $$u^\top Mv$$ and $$u^\top Nv$$, where $$N=M(x+a,y+a)$$. In particular,

$$
u^\top Mv>0\quad\Longrightarrow\quad u^\top Nv\geq0,
$$

and likewise with both inequalities reversed. For fixed $$v\neq0$$, invertibility makes $$Mv,Nv$$ nonzero. The half-space implication forces $$Nv$$ to be a positive multiple of $$Mv$$: apply it to $$u=Mv+t b$$, with $$b\perp Mv$$, for every real $$t$$. Linearity, applied to a basis and its pairwise sums, then gives

$$
N=\rho_a(x,y)M,\qquad \rho_a(x,y)>0.
$$

**Compatibility removes the position dependence.** The scalar $$\rho_a$$ is $$C^1$$, since it equals $$d^{-1}\operatorname{tr}(NM^{-1})$$. Differentiate this proportionality and commute the two $$x$$ derivatives of $$c$$. The derivatives of $$M$$ cancel, leaving

$$
(\partial_{x_\ell}\rho_a)M_{ij}
=(\partial_{x_i}\rho_a)M_{\ell j}.
$$

If one $$x$$ derivative of $$\rho_a$$ were nonzero, every row of $$M$$ would be proportional to the same row. This contradicts $$\operatorname{rank}M=d\geq2$$. Commuting the $$y$$ derivatives gives the same conclusion for columns. Hence $$\rho_a(x,y)=\rho(a)$$.

Finally, composing translations gives $$\rho(a+b)=\rho(a)\rho(b)$$. Positivity and continuity imply $$\rho(a)=e^{k\cdot a}$$. The residual $$r_a=c_a-e^{k\cdot a}c$$ has zero mixed Hessian, so

$$
r_a(x,y)=r_a(x,0)+r_a(0,y)-r_a(0,0).
$$

It is therefore a sum $$f_a(x)+g_a(y)$$, as required.

## Every quadratic cost works

Consider an arbitrary polynomial of total degree at most two:

$$
c(x,y)=\tfrac12x^\top Ax+x^\top By+\tfrac12y^\top Cy
+\ell^\top x+m^\top y+r,
$$

with $$A,C$$ symmetric and $$B$$ arbitrary. Translation gives

$$
c(x+a,y+a)-c(x,y)
=x^\top(A+B)a+y^\top(C+B^\top)a+K(a),
$$

where $$K(a)$$ is independent of $$x,y$$. The change consists only of marginal terms, so the sufficient condition applies with $$k=0$$. There is **no rank, sign, or symmetry restriction on $$B$$**. In fact, quadratic costs even preserve optimal plans under independent translations of the two marginals.

A less familiar example in dimension two is

$$
c(x,y)=x_1y_2-x_2y_1.
$$

Its mixed Hessian is the invertible skew-symmetric matrix

$$
D^2_{xy}c=\begin{pmatrix}0&1\\-1&0\end{pmatrix}.
$$

This cannot be written as $$h(x-y)+f(x)+g(y)$$: such a representation would have mixed Hessian $$-D^2h(x-y)$$, which is symmetric. Translation equivariance thus goes beyond displacement costs even when the exponential factor is trivial.

## Which cubic costs work

For polynomials of total degree at most three, there is a complete answer that needs **neither invertibility nor $$d\geq2$$**. Equivariance holds precisely for costs of the form

<div class="blog-equation-scroll" tabindex="0" role="region" aria-label="Cubic cost classification equation">
<div class="blog-equation-content" markdown="1">

$$
\boxed{c(x,y)=Q_2(x,y)+p_3(x)+q_3(y)+h_3(x-y),}
$$

</div>
</div>

where $$Q_2$$ is any polynomial of degree at most two and $$p_3,q_3,h_3$$ are homogeneous cubic polynomials. The quadratic part is covered above, the marginal terms do not affect the optimizer, and the displacement term is unchanged by translation.

Why are these the only possibilities? For a cubic cost, $$M$$ is affine. The difference between any two-point direct and crossed matching costs is therefore affine in the translation $$a$$. Equivariance requires its sign to remain constant for all $$a\in\mathbb R^d$$. A nonconstant affine function takes both signs, so all translation-dependent coefficients vanish. Varying the two point differences gives

$$
M(x+a,y+a)=M(x,y).
$$

Thus $$M$$ has the form

$$
M_{ij}(x,y)=B_{ij}+\sum_k T_{ijk}(x_k-y_k).
$$

Commuting the $$x$$ derivatives and then the $$y$$ derivatives makes $$T$$ fully symmetric. The polynomial

$$
h_3(z)=-\frac16\sum_{i,j,k}T_{ijk}z_i z_j z_k
$$

has exactly the required nonconstant mixed Hessian. Subtracting $$x^\top By+h_3(x-y)$$ from $$c$$ leaves zero mixed Hessian, hence only marginal polynomials. This proves the classification.

In one dimension, write

$$
c(x,y)=\alpha x^3+\beta x^2y+\gamma xy^2+\delta y^3+Q_2(x,y).
$$

The condition reduces to **$$\beta+\gamma=0$$**. For example, $$x^2y-xy^2$$ works because

$$
x^2y-xy^2=-\tfrac13(x-y)^3+\tfrac13x^3-\tfrac13y^3.
$$

By contrast, $$c(x,y)=x^2y$$ fails. Take $$\mu=\nu=(\delta_0+\delta_1)/2$$. Before translation, crossing the two points is optimal. After translating both marginals by $$-1$$, the direct matching wins:

| Common translation | Direct cost | Crossed cost |
| --- | --- | --- |
| $$a=0$$ | $$1/2$$ | $$0$$ |
| $$a=-1$$ | $$-1/2$$ | $$0$$ |

More generally, twice the direct-minus-crossed cost difference is $$2a+1$$. The optimal matching switches at $$a=-1/2$$, where both matchings, and their mixtures, are optimal.

## An exponential cost that genuinely scales

The vector $$k$$ in the theorem need not vanish. In dimension two, consider the smooth, positive cost

$$
\boxed{c(x,y)=e^{x_1+y_1}\cosh(x_2-y_2).}
$$

For every $$a=(a_1,a_2)$$,

$$
c(x+a,y+a)=e^{2a_1}c(x,y).
$$

Every coupling's objective is multiplied by the same positive number. Optimal plans therefore translate, although the cost depends on the absolute position through $$x_1+y_1$$.

This example also satisfies the nondegeneracy assumption. With $$s=x_1+y_1$$ and $$z=x_2-y_2$$,

$$
\begin{aligned}
&D^2_{xy}c=e^s\begin{pmatrix}
\cosh z&-\sinh z\\
\sinh z&-\cosh z
\end{pmatrix},\\
&\det D^2_{xy}c=-e^{2s}\neq0.
\end{aligned}
$$

It cannot be reduced to $$h(x-y)+f(x)+g(y)$$, since that would make its mixed Hessian invariant under common translations. Here the mixed Hessian instead scales by $$e^{2a_1}$$. The positive exponential factor is an essential part of the characterization.

## Why the dimension assumption matters

In one dimension, ordering can preserve optimality for a much larger family of costs. For example,

$$
c(x,y)=-(x+x^3)y,
\qquad c_{xy}=-(1+3x^2)<0.
$$

Because $$x\mapsto x+x^3$$ is strictly increasing, minimizing this cost pairs the two marginals in increasing quantile order. That coupling commutes with translations. But the mixed-derivative ratio

$$
\frac{c_{xy}(x+a,y+a)}{c_{xy}(x,y)}
=\frac{1+3(x+a)^2}{1+3x^2}
$$

depends on $$x$$ when $$a\neq0$$, so it cannot have the form $$e^{ka}$$. This is exactly where the proof above loses its rigidity: in dimension one, proportional rows give no contradiction. This degree-four example does not conflict with the separate cubic classification.
