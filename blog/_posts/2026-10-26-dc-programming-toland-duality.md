---
title: DC programming and Toland duality
subtitle: A difference of convex functions, two minimization problems, and a surprisingly
  simple convex dual.
description: Difference-of-convex optimization, canonical curvature splitting in
  one dimension, nonunique minimal quadratic splits, and Toland duality, with
  an interactive decomposition and a nonconvex problem whose dual is convex.
date: '2026-10-26'
last_modified_at: '2026-10-26'
topic: Convex optimization
keywords:
- DC programming
- difference-of-convex optimization
- Toland duality
- DCA
- concave-convex procedure
- CCCP
- convex conjugate
- Fenchel duality
- subgradients
- alternating minimization
- majorization minimization
- strong convexity
- critical points
- convex dual
- global optimality certificates
- primal recovery
- Fenchel residual
- Huber function
- Moreau envelope
- infimal convolution
- signed Wasserstein barycenters
- metric extrapolation
- convex order
- Brenier potentials
- linear programming
- John Toland
- Guillaume Carlier
- Pham Dinh Tao
- Le Thi Hoai An
- Werner Fenchel
- Jean-Jacques Moreau
- dualité de Toland
- différence de fonctions convexes
- optimisation non convexe
- dual convexe
- canonical DC decomposition
- minimal DC decomposition
- positive and negative curvature
- Jordan decomposition
- distributional second derivative
- Loewner order
- spectral splitting
- indefinite quadratic forms
- Philip Hartman
- Nikolas Stott
proofs: true
embedded_experiment: true
---

Convex optimization is appealing because a local supporting plane contains global information. But many interesting objectives combine competing effects: a fidelity term and a sparsity incentive, attraction and repulsion, or positive and negative contributions to a transport energy. Subtracting two convex functions is already enough to leave the convex world.

The resulting class is called *difference-of-convex*, or *DC*, optimization. It retains enough structure to admit a beautiful duality: conjugate both convex functions, reverse their order, and minimize again. This is Toland duality [[1]](#ref-1), [[2]](#ref-2). Following the viewpoint of Guillaume Carlier [[3]](#ref-3), I want to explain both its elementary mechanism and a particularly pleasant possibility: a genuinely nonconvex objective can have a fully convex dual.

The same construction also gives an algorithm. The key is to introduce a slope as an additional variable. Minimizing jointly gives the duality theorem; minimizing alternately gives the DC algorithm. But when the dual is convex, there is a third option: solve that convex problem directly, then recover a global solution of the original problem. This is the real prize—not merely another way to write the same stationary-point equations.

<!--more-->

## Two convex functions make one nonconvex problem

Let $$F,G:\mathbb R^d\to\mathbb R$$ be finite convex functions, and consider

$$
\inf_{x\in\mathbb R^d}\Phi(x),
    \qquad \Phi(x)=F(x)-G(x).
$$

The assumption that both functions are finite keeps the domain bookkeeping simple. They are then continuous. Their conjugates can still take the value $$+\infty$$, which we will handle explicitly.

This class is large. For example, if a twice differentiable function $$f$$ satisfies $$\nabla^2f\succeq-\rho I$$, then

$$
f(x)=\left(f(x)+\frac{\rho}{2}\|x\|^2\right)
    -\frac{\rho}{2}\|x\|^2
$$

is a DC decomposition. An indefinite quadratic form can likewise be split using the positive and negative parts of its matrix. Decompositions are not unique: adding the same convex function to $$F$$ and $$G$$ preserves $$\Phi$$, but changes the algorithm built from the decomposition [[4]](#ref-4), [[5]](#ref-5). Can we remove all unnecessary shared curvature and obtain a canonical split? We will see that the answer is particularly clean in one dimension, and more subtle in higher dimensions.

The convex conjugate records the cost of a supporting slope:

$$
F^*(p)=\sup_x\{\langle p,x\rangle-F(x)\}.
$$

We write $$\operatorname{dom}F^*=\{p:F^*(p)<+\infty\}$$. A supporting slope $$p\in\partial F(x)$$ means

$$
F(z)\geq F(x)+\langle p,z-x\rangle
    \quad\text{for every }z.
$$

The two basic identities are $$F=F^{**}$$, which reconstructs a convex function from its affine supports, and Fenchel's inequality $$F(x)+F^*(p)\geq\langle p,x\rangle$$. Equality holds exactly when $$p\in\partial F(x)$$ [[6]](#ref-6).

  <figure class="portrait-single">
    <img src="{{ '/blog/preparations/assets/werner-fenchel.jpg' | relative_url }}" width="252" height="400" alt="Werner Fenchel, photographed at Oberwolfach in 1972" loading="lazy">
    <figcaption>Werner Fenchel (1905–1988). Photograph by Konrad Jacobs, 1972, Oberwolfach Photo Collection, via <a href="https://commons.wikimedia.org/wiki/File:Werner_Fenchel.jpeg">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/2.0/de/deed.en">CC BY-SA 2.0 DE</a>; reproduced unchanged.</figcaption>
  </figure>

## Toland duality in three lines

Conjugation reverses the two terms. Notice that the dual is another *minimization* problem, generally another DC problem.

<span id="theorem-1"></span>

**Theorem 1 (Toland duality).** For finite convex $$F,G:\mathbb R^d\to\mathbb R$$,

$$
\inf_x\{F(x)-G(x)\}
    =\inf_{p\in\operatorname{dom}G^*}
    \{G^*(p)-F^*(p)\}.
$$

The common value may be $$-\infty$$. On the right, $$G^*(p)$$ is finite; if $$F^*(p)=+\infty$$, the difference means $$-\infty$$. Thus the formula never asks us to subtract two infinities. More general extended-real formulations are possible; Carlier discusses the necessary domain convention explicitly [[3]](#ref-3).

<details class="blog-proof">

<summary>Proof: introduce a slope and exchange two infima</summary>

<div class="blog-proof-body" markdown="1">

Since $$G=G^{**}$$,

$$
\begin{aligned}
        \inf_x(F-G)
        &=\inf_x\inf_{p\in\operatorname{dom}G^*}
          \{F(x)+G^*(p)-\langle p,x\rangle\}\\
        &=\inf_{p\in\operatorname{dom}G^*}
          \left\{G^*(p)+\inf_x(F(x)-\langle p,x\rangle)\right\}\\
        &=\inf_{p\in\operatorname{dom}G^*}(G^*-F^*).
      \end{aligned}
$$

There is no minimax exchange here: an infimum over pairs can always be taken in either order. Every expression inside the joint infimum is a finite real number. The possible value $$-\infty$$ appears only after taking an infimum.

</div>

</details>

It is useful to give the common two-variable function a name:

$$
B(x,p)=F(x)+G^*(p)-\langle p,x\rangle,
    \qquad p\in\operatorname{dom}G^*.
$$

Taking the infimum over $$p$$ gives $$\Phi(x)$$; taking it over $$x$$ gives the dual objective $$\Psi(p)=G^*(p)-F^*(p)$$. The function $$B$$ is convex in either variable separately, but need not be jointly convex. Equality of the optimal values does not itself assert that either problem attains its infimum.

<span id="proposition-1"></span>

**Proposition 1 (recovering minimizers).** Suppose the common optimal value is finite. If $$x_\star$$ is a primal minimizer, every $$p_\star\in\partial G(x_\star)$$ is a dual minimizer. Conversely, if $$p_\star$$ is a dual minimizer and $$x_\star\in\partial F^*(p_\star)$$, then $$x_\star$$ is a primal minimizer.

<details class="blog-proof">

<summary>Proof: equality in Fenchel's inequality</summary>

<div class="blog-proof-body" markdown="1">

In the first direction, $$p_\star\in\partial G(x_\star)$$ gives $$B(x_\star,p_\star)=\Phi(x_\star)$$. Theorem 1 and $$\Psi(p_\star)\leq B(x_\star,p_\star)$$ force equality with the optimal value. In the second direction, $$x_\star\in\partial F^*(p_\star)$$ gives $$B(x_\star,p_\star)=\Psi(p_\star)$$, and $$\Phi(x_\star)\leq B(x_\star,p_\star)$$ gives the same conclusion.

At such a minimizing pair, both Fenchel inequalities are equalities, so $$p_\star\in\partial F(x_\star)\cap\partial G(x_\star)$$. Having a common supporting slope is necessary, but by itself does not imply global optimality.

</div>

</details>

## The DC algorithm is alternating minimization

Instead of minimizing $$B$$ globally, alternate its two convex subproblems:

$$
\begin{aligned}
      p_k&\in\partial G(x_k),\\
      x_{k+1}&\in\operatorname*{argmin}_x
        \{F(x)-\langle p_k,x\rangle\}.
    \end{aligned}
$$

These are the standard DCA updates developed by Pham Dinh Tao and Le Thi Hoai An [[4]](#ref-4), [[5]](#ref-5). The second line is equivalently $$x_{k+1}\in\partial F^*(p_k)$$. The first update always exists because $$G$$ is finite and convex; the second needs an attained minimum. Strong convexity of $$F$$ guarantees a unique solution. One can enforce it by adding the same positive quadratic to both $$F$$ and $$G$$, without changing $$\Phi$$.

In particular, if $$G$$ is differentiable and $$F$$ is strongly convex, the updates reduce to the simple composition

$$
x_{k+1}=\nabla F^*(\nabla G(x_k)).
$$

Equivalently, replace $$G$$ by a supporting affine function at $$x_k$$. Because it is subtracted, this produces a convex upper bound on $$\Phi$$, touching it at the current iterate. Minimizing that bound is the same update. This is also the principle of the concave-convex procedure [[7]](#ref-7).

<span id="proposition-2"></span>

**Proposition 2 (descent).** Whenever the two updates are well defined, $$\Phi(x_{k+1})\leq\Phi(x_k)$$. If $$F$$ is $$\mu$$-strongly convex, then

$$
\Phi(x_k)-\Phi(x_{k+1})
    \geq\frac{\mu}{2}\|x_{k+1}-x_k\|^2.
$$

<details class="blog-proof">

<summary>Proof: follow the two block minimizations</summary>

<div class="blog-proof-body" markdown="1">

$$
\Phi(x_{k+1})
        \leq B(x_{k+1},p_k)
        \leq B(x_k,p_k)
        =\Phi(x_k).
$$

For the quantitative bound, optimality of the second update gives $$p_k\in\partial F(x_{k+1})$$. Apply strong convexity of $$F$$ at $$x_{k+1}$$, and convexity of $$G$$ at $$x_k$$, then subtract.

</div>

</details>

Descent alone guarantees neither convergence of the iterates nor global optimality. A useful weaker statement concerns *DC critical points*: points where $$\partial F$$ and $$\partial G$$ have a common slope.

<span id="corollary-1"></span>

**Corollary 1 (critical accumulation points).** If $$F$$ is strongly convex and the DCA iterates stay bounded, every accumulation point is DC critical. This does not assert convergence of the whole sequence or global optimality [[5]](#ref-5).

<details class="blog-proof">

<summary>Proof: vanishing steps and a common limiting slope</summary>

<div class="blog-proof-body" markdown="1">

Continuity of $$\Phi$$ bounds the objective values below on the bounded set of iterates. Summing Proposition 2 therefore gives $$\sum_k\Vert x_{k+1}-x_k\Vert ^2<\infty$$, so the steps tend to zero.

Take a subsequence $$x_{k_j}\to\bar x$$. Since $$G$$ is finite and convex on all of $$\mathbb R^d$$, its subgradients are bounded on bounded sets. Passing to a further subsequence gives $$p_{k_j}\to\bar p$$, while $$x_{k_j+1}\to\bar x$$. The updates imply $$p_{k_j}\in\partial G(x_{k_j})$$ and $$p_{k_j}\in\partial F(x_{k_j+1})$$. Passing to the limit in the two supporting-plane inequalities gives $$\bar p\in\partial F(\bar x)\cap\partial G(\bar x)$$.

</div>

</details>

## Is there a canonical DC decomposition?

Adding the same convex function to both terms hides curvature that cancels in the difference. To compare decompositions, it is therefore more meaningful to compare *convexity* than function values. Write

$$
F_1\preceq F_2
\quad\Longleftrightarrow\quad
F_2-F_1\text{ is convex}.
$$

For twice differentiable functions, this means $$\nabla^2F_1\preceq\nabla^2F_2$$ in the positive-semidefinite order. Affine functions carry no curvature, so this is an order **modulo affine terms**, not an order on pointwise heights.

A decomposition $$\Phi=F-G$$ is *minimal* if there is no non-affine convex function $$R$$ that can be subtracted from both terms while keeping $$F-R$$ and $$G-R$$ convex. A *least* decomposition is stronger: it lies below **every** other decomposition in this order. Every least decomposition is minimal, but minimal ones can be incomparable. This distinction already appears in Hartman's foundational paper [[12, Section 6]](#ref-12).

### In one dimension: split the curvature, then integrate twice

Let $$\Phi\in C^2([a,b])$$. Define the positive and negative curvature by

$$
c_+(x)=\max\{\Phi''(x),0\},
\qquad
c_-(x)=\max\{-\Phi''(x),0\}.
$$

Both are nonnegative, and $$\Phi''=c_+-c_-$$. Integrating twice gives a natural choice:

$$
\begin{aligned}
F_\star(x)
  &=\Phi(a)+\Phi'(a)(x-a)
    +\int_a^x(x-t)c_+(t)\,dt,\\
G_\star(x)
  &=\int_a^x(x-t)c_-(t)\,dt.
\end{aligned}
$$

The affine part is assigned to $$F_\star$$; equivalently, we fix $$G_\star(a)=G_\star'(a)=0$$. This convention determines the vertical placement and tilt of the two graphs. It does not affect their curvature.

<span id="theorem-2"></span>

**Theorem 2 (the least one-dimensional split).** The functions $$F_\star,G_\star$$ are convex and satisfy $$\Phi=F_\star-G_\star$$. For every other $$C^2$$ convex decomposition $$\Phi=F-G$$ on $$[a,b]$$, there is a convex function $$R$$ such that

$$
F=F_\star+R,\qquad G=G_\star+R.
$$

Within this $$C^2$$ class, this pair is least in the convexity order, and it is the unique minimal pair up to adding the same affine function to both terms.

<details class="blog-proof">
<summary>Proof of Theorem 2: remove exactly the common curvature</summary>
<div class="blog-proof-body" markdown="1">

The constructed functions have second derivatives $$c_+,c_-\geq0$$. Their difference has the same second derivative, value at $$a$$, and derivative at $$a$$ as $$\Phi$$, hence equals $$\Phi$$.

For any competing split, put $$R=F-F_\star=G-G_\star$$. Since $$\Phi''=F''-G''$$ and both $$F'',G''$$ are nonnegative,

$$
\begin{aligned}
R''&=F''-(F''-G'')_+\\
   &=\min\{F'',G''\}\geq0.
\end{aligned}
$$

So $$R$$ is convex. If it is not affine, it is precisely a removable common convex term, and the competing pair is not minimal. Conversely, the constructed pair has $$\min\{F_\star'',G_\star''\}=0$$ everywhere, so it has no non-affine convex term to remove. $$\square$$

</div>
</details>

The key picture is that positive and negative curvature never coexist at the same point in the least split. For a nonsmooth one-dimensional DC function on an open interval, the same idea uses the **Jordan decomposition of the signed measure** $$D^2\Phi$$: its mutually singular positive and negative parts are the curvature measures of the two least convex terms. The affine normalization must still be fixed. This extends the construction beyond ordinary second derivatives [[12]](#ref-12).

### In two dimensions: minimal does not mean unique

For matrices, positive semidefiniteness is only a partial order; there is no analogue of the scalar minimum that works for every pair. A simple indefinite quadratic already exposes the difference:

$$
\Phi(x_1,x_2)=\frac12(x_1^2-x_2^2).
$$

For any $$s\in\mathbb R$$, put $$c_s=\sqrt{1+s^2}$$ and define

$$
\begin{aligned}
F_s(x)&=\tfrac12(c_sx_1+sx_2)^2,\\
G_s(x)&=\tfrac12(sx_1+c_sx_2)^2.
\end{aligned}
$$

These are convex quadratics. Their cross terms cancel, and $$c_s^2-s^2=1$$, so $$F_s-G_s=\Phi$$ for every $$s$$. They even share the same normalization: both values and both gradients vanish at the origin.

<span id="theorem-3"></span>

**Theorem 3 (many incomparable minimal splits).** Every pair $$(F_s,G_s)$$ above is minimal, even among decompositions by arbitrary finite convex functions on $$\mathbb R^2$$. Distinct parameters give incomparable pairs. Consequently, this quadratic has no least DC decomposition in the convexity order.

<details class="blog-proof">
<summary>Proof of Theorem 3: there is no shared direction of curvature</summary>
<div class="blog-proof-body" markdown="1">

Write $$u_s=(c_s,s)^\top$$ and $$v_s=(s,c_s)^\top$$. The Hessians are rank-one positive-semidefinite matrices,

$$
P_s=u_su_s^\top,\qquad Q_s=v_sv_s^\top.
$$

The vectors are independent because $$\det[u_s\ v_s]=c_s^2-s^2=1$$.

If a $$C^2$$ convex function $$R$$ can be subtracted from both terms, its Hessian $$S=\nabla^2R(x)$$ satisfies

$$
0\preceq S\preceq P_s,
\qquad S\preceq Q_s.
$$

For $$z\in\ker P_s$$, these inequalities give $$0\leq z^\top Sz\leq z^\top P_sz=0$$. A positive-semidefinite matrix with $$z^\top Sz=0$$ satisfies $$Sz=0$$. Thus $$S$$ vanishes on both $$\ker P_s$$ and $$\ker Q_s$$. These are different lines spanning $$\mathbb R^2$$, so $$S=0$$. Hence $$R$$ is affine.

<details class="blog-proof">
<summary>Why the same conclusion holds without assuming that R is smooth</summary>
<div class="blog-proof-body" markdown="1">

Convolve $$R$$ with a nonnegative smooth compactly supported mollifier. Convolution preserves convexity of $$R$$, $$F_s-R$$, and $$G_s-R$$; the convolved quadratics still have Hessians $$P_s,Q_s$$. The preceding argument therefore makes every smoothed $$R$$ affine. These smoothings converge locally uniformly to $$R$$, so $$R$$ itself is affine. $$\square$$

</div>
</details>

We have proved minimality. Distinct parameters give distinct Hessians, so the corresponding pairs do not differ by affine terms. If one were below another, their common difference would be a non-affine removable convex function, contradicting minimality. A least pair would have to be below all these minimal pairs and therefore equal to all of them modulo affine terms, which is impossible. $$\square$$

</div>
</details>

At $$s=0$$, this is the familiar spectral split: put the positive eigenvalue in $$F_0$$ and the negative one in $$G_0$$. It is a natural canonical **choice**, but not a least element. Indeed, for $$s\ne0$$,

$$
\det(P_s-P_0)=-s^2<0,
$$

so $$P_s-P_0$$ is indefinite: neither Hessian dominates the other. Hartman gives a related two-dimensional quadratic obstruction [[12]](#ref-12); Stott studies the broader matrix-order geometry [[13]](#ref-13).

An extra optimization criterion can select a preferred split. For example, in this family the total trace is $$\operatorname{tr}(P_s+Q_s)=2+4s^2$$, uniquely minimized at $$s=0$$. But minimizing this scalar quantity is different from being least in every curvature direction. For a variable Hessian, there is an additional difficulty: its pointwise positive and negative matrix parts need not themselves be Hessian fields of functions.

Nor does least curvature automatically mean the best algorithm. Adding a common quadratic can make DCA subproblems strongly convex and uniquely solvable. Minimality answers a structural question about the representation, not a universal question about speed of optimization.

## Numerical experimentation: watch the curvature split

On $$[-2,2]$$, with $$A\geq0$$, consider

$$
\Phi(x)=\frac{x^2}{2}+A\cos(\pi x+\theta),
\qquad
\Phi''(x)=1-A\pi^2\cos(\pi x+\theta).
$$

Move the phase $$\theta$$ to shift the oscillations, and vary $$A$$ to change the amount of nonconvexity. The figure shows the objective, its two convex terms, and the signed curvature. At $$A\leq\pi^{-2}$$ the objective is already convex, so the normalized negative-curvature term is zero.

The shared-curvature slider adds $$\lambda(x+2)^2/2$$ to **both** terms. It leaves their difference unchanged while visibly making each term more convex. Set $$\lambda=0$$ to return to the least split. All decompositions use the same left-endpoint normalization; the component plots have a different vertical scale from the objective plot.

<iframe class="idea-experiment" data-experiment="dc-decomposition" title="Interactive one-dimensional DC decomposition and positive and negative curvature" src="{{ '/blog/preparations/assets/dc-decomposition/index.html' | relative_url }}" loading="lazy" style="width:100%;height:1120px;border:0;"></iframe>

The implementation locates the zeros of $$\Phi''$$ analytically and integrates each constant-sign interval in closed form. The curves are sampled only for drawing; the displayed identity check measures floating-point evaluation error, not a discretized approximation to convexity. [Open the experiment on its own]({{ '/blog/preparations/assets/dc-decomposition/index.html' | relative_url }}).

  <h2 id="why-convex-dual">What a convex dual actually buys us</h2>

Assume the common optimal value is finite and $$\Psi=G^*-F^*$$ is convex on its feasible set $$D=\operatorname{dom}G^*$$. We can then work with a genuine convex minimization problem instead of searching the nonconvex landscape of $$\Phi$$. Every local minimizer of $$\Psi$$ on $$D$$ is global. First-order optimality can now certify the answer: when the objective has a differentiable extension to a neighborhood of $$D$$, the condition is

$$
\langle\nabla\Psi(p_\star),q-p_\star\rangle\geq0
    \qquad\text{for every }q\in D.
$$

Without constraints, this reduces to $$\nabla\Psi(p_\star)=0$$. For a nonsmooth dual, one uses its convex subdifferential, including the feasible-set constraint. This is a condition on the *whole dual objective*, not merely the shared-slope condition of DCA.

This opens the door to convex optimization methods and global error certificates, provided the dual can be evaluated and its constraints or proximal subproblems can be handled. It does not automatically make the problem small, smooth, or cheap. Nor does convexity alone imply uniqueness; strict convexity would give uniqueness of an attained dual minimizer, and recovering a unique primal point requires an additional argument.

Crucially, one does not need to solve the dual exactly. A globally accurate dual solution can be turned into a globally accurate primal solution by solving one convex recovery problem. Let $$v_\star$$ be the common finite optimal value, and measure recovery accuracy by the Fenchel residual

$$
r_F(x,p)=F(x)+F^*(p)-\langle p,x\rangle\geq0.
$$

For fixed $$p$$, this is precisely the objective error in minimizing $$F(x)-\langle p,x\rangle$$. It vanishes when $$x\in\partial F^*(p)$$.

<span id="proposition-3"></span>

**Proposition 3 (accuracy transfers to the primal).** Let $$p\in\operatorname{dom}F^*\cap\operatorname{dom}G^*$$ and $$\delta,\eta\geq0$$. If

$$
\Psi(p)-v_\star\leq\delta,
    \qquad r_F(x,p)\leq\eta,
$$

then

$$
0\leq\Phi(x)-v_\star\leq\delta+\eta.
$$

<details class="blog-proof">

<summary>Proof: the two Fenchel residuals</summary>

<div class="blog-proof-body" markdown="1">

Fenchel's inequality also gives $$r_G(x,p)=G(x)+G^*(p)-\langle p,x\rangle\geq0$$. Subtracting yields

$$
\Phi(x)-\Psi(p)=r_F(x,p)-r_G(x,p)\leq r_F(x,p).
$$

Add $$\Psi(p)-v_\star\leq\delta$$. The lower bound follows from the definition of $$v_\star$$. The transfer inequality itself does not require a convex dual; convexity is what can make the certified bound $$\delta$$ accessible.

</div>

</details>

For example, if a convex solver supplies a lower bound $$L\leq v_\star$$, then $$\delta=\Psi(p)-L$$ is a valid certificate. Beware of the terminology: because Toland duality equates *two minima*, a dual feasible value $$\Psi(p)$$ is an upper bound on $$v_\star$$, not a lower bound on every primal value. Thus $$\Phi(x)-\Psi(p)$$ is not an ordinary nonnegative primal–dual gap.

## A nonconvex primal with a convex dual

Here is an example requiring only an absolute value and a quadratic. Take $$F(x)=\lvert x\rvert$$, and let $$G$$ be the Huber function with threshold one [[8]](#ref-8):

$$
G(x)=
    \begin{cases}
      x^2/2,& |x|\leq1,\\
      |x|-1/2,& |x|\geq1.
    \end{cases}
$$

Both functions are convex, but their difference is

$$
\Phi(x)=
    \begin{cases}
      |x|-x^2/2,& |x|\leq1,\\
      1/2,& |x|\geq1.
    \end{cases}
$$

This objective is plainly nonconvex: on $$(0,1)$$, its second derivative is $$-1$$. Nevertheless, writing $$I=[-1,1]$$ and letting $$\iota_I$$ denote the function equal to zero on $$I$$ and $$+\infty$$ outside, we have

$$
F^*(p)=\iota_I(p),
    \qquad G^*(p)=\frac{p^2}{2}+\iota_I(p).
$$

Thus the Toland dual, evaluated on $$\operatorname{dom}G^*=I$$, is simply

$$
\min_{|p|\leq1}\frac{p^2}{2}.
$$

It is a strongly convex minimization problem on a convex interval. Its unique solution $$p_\star=0$$ recovers $$x_\star=0$$, the unique primal minimizer. The useful change is visible already here: the primal has an entire nonoptimal flat region, whereas the dual quadratic points directly towards its global minimum.

{::nomarkdown}
<figure class="math-figure">
    <svg viewBox="0 0 780 215" role="img" aria-labelledby="toland-plot-title toland-plot-desc" style="width:100%;height:auto">
      <title id="toland-plot-title">A nonconvex objective and its convex Toland dual</title>
      <desc id="toland-plot-desc">Left: absolute value minus the Huber function rises from zero, bends downward, and becomes constant outside minus one to one. Right: the dual is a quadratic on the interval minus one to one. Both have minimum zero.</desc>
      <g fill="none" stroke="#c5cbd0" stroke-width="1.4">
        <path d="M35 155H340M185 175V45M430 155H740M585 175V45"/>
        <path d="M115 151V159M255 151V159M445 151V159M725 151V159"/>
      </g>
      <g fill="#4e5962" font-family="system-ui,sans-serif" font-size="14" text-anchor="middle">
        <text x="185" y="25">Nonconvex primal</text><text x="585" y="25">Convex dual</text>
        <text x="115" y="181">−1</text><text x="185" y="181">0</text><text x="255" y="181">1</text>
        <text x="445" y="181">−1</text><text x="585" y="181">0</text><text x="725" y="181">1</text>
        <text x="340" y="176">x</text><text x="740" y="176">p</text>
      </g>
      <path d="M45 65H115Q150 65 185 155Q220 65 255 65H325" fill="none" stroke="#b45045" stroke-width="3.3"/>
      <path d="M445 65Q585 245 725 65" fill="none" stroke="#266f8d" stroke-width="3.3"/>
      <g fill="#266f8d"><circle cx="445" cy="65" r="3.5"/><circle cx="725" cy="65" r="3.5"/></g>
    </svg>
    <figcaption>The two objectives have the same minimum, although their graphs have very different curvature. The dual is defined only on the closed interval shown.</figcaption>
  </figure>
{:/nomarkdown}

<details class="blog-proof">

<summary>Proof: compute the two conjugates</summary>

<div class="blog-proof-body" markdown="1">

For $$\lvert p\rvert\leq1$$, $$px-\lvert x\rvert\leq0$$, with equality at zero. For $$\lvert p\rvert>1$$, take $$x$$ to infinity with the sign of $$p$$. This gives $$F^*=\iota_I$$.

For $$\lvert p\rvert\leq1$$, maximizing $$px-G(x)$$ gives $$x=p$$ and value $$p^2/2$$. At the endpoints, a whole half-line also attains this value. For $$\lvert p\rvert>1$$, the linear tail again makes the supremum infinite. This proves the formula for $$G^*$$.

Finally, $$\partial F^*(0)=\{0\}$$, so Proposition 1 recovers the primal minimizer. Directly, $$\Phi$$ is nonnegative and vanishes only at zero.

</div>

</details>

The example also separates convex duality from DCA. If $$x_k>1$$, then $$p_k=G'(x_k)=1$$, and the next subproblem is $$\min_x(\lvert x\rvert-x)$$. Every $$x\geq0$$ minimizes it. Choosing $$x_{k+1}=x_k$$ is allowed: DCA can remain forever on the nonoptimal plateau. Solving the convex dual directly avoids this ambiguity.

The shared-slope condition is weaker than stationarity of the convex dual. At $$p=1$$, the subgradients of $$F^*$$ and $$G^*$$ overlap, but moving $$p$$ towards zero still decreases $$\Psi(p)=p^2/2$$.

<details class="blog-proof">

<summary>Even a unique DCA update can remain on the plateau</summary>

<div class="blog-proof-body" markdown="1">

Add $$\eta x^2/2$$, with $$\eta>0$$, to both $$F$$ and $$G$$. This preserves the objective and makes the first term strongly convex. At $$x_k>1$$, the new slope is $$p_k=1+\eta x_k$$. Up to a constant, the next subproblem becomes

$$
\min_x\left\{|x|-x+\frac{\eta}{2}(x-x_k)^2\right\}.
$$

Both terms are nonnegative and vanish together only at $$x=x_k$$. The unique update is therefore $$x_{k+1}=x_k$$. Thus the obstruction to global convergence persists even after removing the freedom to choose among minimizers. This modified decomposition has a different Toland dual, which is no longer convex.

</div>

</details>

## Why the example works: smoothing by infimal convolution

The Huber function is the Moreau envelope of the absolute value. More generally, given a finite convex $$F$$ and $$\lambda>0$$, define [[9]](#ref-9)

$$
G(x)=\inf_z\left\{F(z)+\frac{\|x-z\|^2}{2\lambda}\right\}.
$$

Then $$G\leq F$$ and

$$
G^*(p)=F^*(p)+\frac{\lambda}{2}\|p\|^2.
$$

Consequently, the dual of minimizing $$F-G$$ is the convex problem

$$
\inf_{p\in\operatorname{dom}F^*}\frac{\lambda}{2}\|p\|^2.
$$

If $$\operatorname{dom}F^*$$ is closed, its minimizer is the Euclidean projection of zero onto that domain. Recovery of a primal minimizer still requires the subgradient condition in Proposition 1. Without closedness, even dual attainment must be checked.

<details class="blog-proof">

<summary>Proof: conjugating an infimal convolution</summary>

<div class="blog-proof-body" markdown="1">

Put $$w=x-z$$ and separate the two suprema:

$$
\begin{aligned}
        G^*(p)
        &=\sup_{z,w}\left\{\langle p,z+w\rangle-F(z)-\frac{\|w\|^2}{2\lambda}\right\}\\
        &=F^*(p)+\frac{\lambda}{2}\|p\|^2.
      \end{aligned}
$$

This identity holds as an extended-real identity. Subtracting $$F^*$$ is done only on its effective domain, exactly as in Theorem 1.

</div>

</details>

<details class="blog-proof">

<summary>Why the recovery condition matters: a dual minimum without a primal one</summary>

<div class="blog-proof-body" markdown="1">

Take $$F(x)=e^x$$ and its Moreau envelope with $$\lambda=1$$. Its conjugate has domain $$[0,\infty)$$, with $$F^*(0)=0$$ and $$F^*(p)=p\log p-p$$ for $$p>0$$. The dual $$\min_{p\geq0}p^2/2$$ attains its minimum at zero.

The primal does not. For every finite $$x$$, choosing $$z=x-\delta$$ with sufficiently small $$\delta>0$$ gives $$G(x)<F(x)$$. Yet $$0<F(x)-G(x)\leq e^x\to0$$ as $$x\to-\infty$$. Thus its infimum is zero but is never attained.

There is no contradiction with Proposition 1: $$\partial F^*(0)$$ is empty. Indeed, the slopes $$(F^*(p)-F^*(0))/p=\log p-1$$ tend to $$-\infty$$ as $$p\downarrow0$$, so no finite supporting slope exists there.

</div>

</details>

  <h2 id="carlier-convex-reformulation">Carlier's example: a linear objective hidden inside transport</h2>

Carlier's transport example [[3, Section 3]](#ref-3) makes the benefit tangible. Let $$\mu_+,\mu_-$$ have densities on a bounded open convex set $$\Omega$$, and let $$K\subset\mathbb R^d$$ be nonempty, compact and convex. All measures here are probabilities. Consider

$$
\min_{\nu\in\mathcal P(K)}J(\nu),
    \qquad
    J(\nu)=\frac12W_2^2(\mu_-,\nu)-\frac12W_2^2(\mu_+,\nu),
$$

where $$W_2$$ is the quadratic Wasserstein distance and $$\mathcal P(K)$$ contains the probabilities supported in $$K$$. Introduce instead

$$
\mathcal A=\{u:\Omega\to\mathbb R:
      u\text{ convex},\ \nabla u\in K\text{ a.e.}\},
    \qquad
    L(u)=\int_\Omega u\,d(\mu_+-\mu_-).
$$

Carlier proves

$$
\min_{\nu\in\mathcal P(K)}J(\nu)
    =\min_{u\in\mathcal A}L(u)-c,
    \qquad
    c=\frac12\int_\Omega |x|^2\,d(\mu_+-\mu_-).
$$

This uses Toland duality *and* a further change to a convex-potential variable: the raw dual parameterization is not itself the linear problem. At an exact minimizer $$u_\star$$, the optimal measure is recovered by

$$
\nu_\star=(\nabla u_\star)_\#\mu_+
             =(\nabla u_\star)_\#\mu_-.
$$

Every optimal measure arises this way. The value identity extends beyond densities; the stated gradient recovery uses absolute continuity.

Why is the new problem better structured? Its objective $$L$$ is linear, and its feasible set is convex: averaging two convex functions preserves convexity, while their averaged gradient stays in the convex set $$K$$. The difficult difference of transport costs has become a linear objective with geometric constraints. One can study global optimality in this convex set rather than navigate stationary points of a difference of distances.

There is an analytic benefit too. Adding a constant to $$u$$ does not change $$L$$, so fix $$u(x_0)=0$$ at some $$x_0\in\Omega$$. Boundedness of $$K$$ bounds both slopes and values. After continuous extension to $$\overline\Omega$$, the normalized feasible family is closed and compact in the uniform norm by Arzelà–Ascoli. This gives existence, not uniqueness: if $$\mu_+=\mu_-$$, both objectives are constant.

<details class="blog-proof">

<summary>A computational consequence: a finite linear program</summary>

<div class="blog-proof-body" markdown="1">

For a finite approximation, replace the signed measure $$\mu_+-\mu_-$$ by weights $$w_i$$ at points $$x_i\in\Omega$$, with $$\sum_iw_i=0$$. Store a value $$u_i$$ and a supporting slope $$g_i$$ at each point. The resulting problem is

$$
\begin{aligned}
        \min_{u_i,g_i}\quad &\sum_iw_i u_i\\
        \text{subject to}\quad
          &u_j\geq u_i+g_i\cdot(x_j-x_i)\quad\forall i,j,\\
          &g_i\in K\quad\forall i,\qquad u_1=0.
      \end{aligned}
$$

The inequalities hold for every pair $$i,j$$. They are linear in the unknown values and slopes; if $$K$$ is a polytope, its constraints are linear too. Thus this finite potential problem is a linear program.

The constraints have a direct meaning. The convex function

$$
u(x)=\max_i\{u_i+g_i\cdot(x-x_i)\}
$$

interpolates the prescribed values and has gradients in $$K$$ wherever it is differentiable. Conversely, feasible convex potentials supply such supporting slopes at interior sample points. The linear program therefore represents the discrete potential problem exactly. Approximation of the original measures, and recovery of a transport minimizer from an approximate potential, still need their own error analysis. This construction illustrates the benefit of convexity; it is not a claim that every discretization solves the continuum problem exactly.

</div>

</details>

This is also a reason to preserve the convex formulation when choosing numerical variables. Replacing $$u$$ by an arbitrarily parameterized neural network can reintroduce nonconvexity in the parameters, even though the underlying optimization over functions is convex.

## Related signed Wasserstein barycenters

For probability measures with finite second moments, a signed barycenter minimizes

$$
\inf_\mu\sum_i\lambda_i W_2^2(\mu,\nu_i),
    \qquad \sum_i\lambda_i=1,
$$

where some coefficients are negative. Positive coefficients encourage closeness to their reference measures; negative coefficients encourage separation, while the positive total weight controls the quadratic growth. The two-measure case defines *metric extrapolation*: it agrees with extending a minimizing Wasserstein geodesic when such a minimizing continuation exists, and remains defined when no such continuation exists [[10]](#ref-10).

Gallouët, Natale and Todeschi [[11]](#ref-11) establish two convex dual formulations when exactly one coefficient is positive: one uses Brenier potentials, the other a projection under convex-order constraints. They also study the general signed case and develop particle algorithms using entropic regularization. The special sign pattern matters: their general case need not have the same convexity or uniqueness properties.

These transport results show why the elementary duality is useful beyond finite-dimensional toy examples. It gives a systematic question to ask of a nonconvex model: does exchanging positions for supporting slopes reveal a better geometry?

## References

  <ol class="references">
    <li id="ref-1">J. F. Toland. <a href="https://doi.org/10.1016/0022-247X(78)90243-3"><em>Duality in nonconvex optimization.</em></a> Journal of Mathematical Analysis and Applications 66(2), 399–415, 1978.</li>
    <li id="ref-2">J. F. Toland. <a href="https://doi.org/10.1007/BF00250669"><em>A duality principle for non-convex optimisation and the calculus of variations.</em></a> Archive for Rational Mechanics and Analysis 71, 41–61, 1979.</li>
    <li id="ref-3">Guillaume Carlier. <a href="https://www.ceremade.dauphine.fr/~carlier/toland.pdf"><em>Remarks on Toland's duality, convexity constraint and optimal transport.</em></a> Pacific Journal of Optimization 4(3), 423–432, 2008.</li>
    <li id="ref-4">Pham Dinh Tao and Le Thi Hoai An. <a href="https://math.ac.vn/uploads/files/9701289.pdf"><em>Convex analysis approach to d.c. programming: theory, algorithms and applications.</em></a> Acta Mathematica Vietnamica 22(1), 289–355, 1997.</li>
    <li id="ref-5">Hoai An Le Thi and Tao Pham Dinh. <a href="https://doi.org/10.1007/s10107-018-1235-y"><em>DC programming and DCA: thirty years of developments.</em></a> Mathematical Programming 169, 5–68, 2018.</li>
    <li id="ref-6">R. Tyrrell Rockafellar. <a href="https://doi.org/10.1515/9781400873173"><em>Convex Analysis.</em></a> Princeton University Press, 1970.</li>
    <li id="ref-7">Alan L. Yuille and Anand Rangarajan. <a href="https://www.cs.jhu.edu/~alanlab/Pubs03/yuille2003concave.pdf"><em>The concave-convex procedure.</em></a> Neural Computation 15(4), 915–936, 2003.</li>
    <li id="ref-8">Peter J. Huber. <a href="https://doi.org/10.1214/aoms/1177703732"><em>Robust estimation of a location parameter.</em></a> The Annals of Mathematical Statistics 35(1), 73–101, 1964.</li>
    <li id="ref-9">Jean-Jacques Moreau. <a href="https://www.numdam.org/articles/10.24033/bsmf.1625/"><em>Proximité et dualité dans un espace hilbertien.</em></a> Bulletin de la Société Mathématique de France 93, 273–299, 1965.</li>
    <li id="ref-10">Thomas O. Gallouët, Andrea Natale and Gabriele Todeschi. <a href="https://arxiv.org/abs/2407.10516"><em>Metric extrapolation in the Wasserstein space.</em></a> Calculus of Variations and Partial Differential Equations 64, article 147, 2025.</li>
    <li id="ref-11">Thomas Gallouët, Andrea Natale and Gabriele Todeschi. <a href="https://arxiv.org/abs/2609.17073"><em>Toland duality and particle approximations for signed Wasserstein barycenters.</em></a> arXiv:2609.17073, 2026.</li>
    <li id="ref-12">Philip Hartman. <a href="https://doi.org/10.2140/pjm.1959.9.707"><em>On functions representable as a difference of convex functions.</em></a> Pacific Journal of Mathematics 9(3), 707–713, 1959. <a href="https://msp.org/pjm/1959/9-3/pjm-v9-n3-p09-s.pdf">Publisher PDF</a>.</li>
    <li id="ref-13">Nikolas Stott. <a href="https://doi.org/10.1090/proc/13785"><em>Maximal lower bounds in the Löwner order.</em></a> Proceedings of the American Mathematical Society, 2018. <a href="https://arxiv.org/abs/1612.05664">Preprint</a>.</li>
  </ol>
