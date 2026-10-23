---
title: Gaussians are not closed for Gromov–Wasserstein
subtitle: A radial coupling reveals a failure of Gaussian optimality for Gromov–Wasserstein
  transport.
description: A rigorous counterexample shows that Gaussian marginals need not admit
  a jointly Gaussian optimizer for squared-distance Gromov–Wasserstein transport.
date: '2026-10-23'
topic: Optimal transport
keywords:
- Gromov–Wasserstein distance
- GW
- Gaussian marginals
- non-Gaussian optimal coupling
- Gaussian-constrained transport
- squared-distance distortion
- radial coupling
- nonlinear dependence
- cross-covariance
- mixed fourth moments
- Gaussian fourth-moment identity
- chi-squared distributions
- quantile coupling
- radius fluctuations
- high-dimensional probability
- central limit theorem
- Wasserstein convergence
- correlation versus independence
- positive semidefinite block matrices
- unequal dimensions
- optimality counterexample
- Antoine Salmona
- Julie Delon
- Agnès Desolneux
- Facundo Mémoli
- Gabriel Peyré
- transport de Gromov–Wasserstein
- couplage gaussien
- couplage radial
- moments d'ordre quatre
- dépendance non linéaire
proofs: true
---

Gaussians are wonderfully cooperative in quadratic optimal transport: when the source is nondegenerate, an affine map solves the transport problem, and the answer can be expressed using means and covariance matrices. It is tempting to carry this intuition into Gromov–Wasserstein transport, where the task is to match *relations between pairs of points*.

That intuition has a limit. A pair of Gaussian marginals need not admit a jointly Gaussian optimal coupling. The example below makes the obstruction explicit: linear correlation has a bounded budget, while correlating the *radii* can exploit fluctuations that grow with dimension.

The construction is recorded in [Proposition 13.34 of *Optimal Transport for Machine Learners*](https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.13.3.34) [[1]](#ref-book). The Gaussian-constrained problem and the question of unrestricted optimality are studied by Antoine Salmona, Julie Delon, and Agnès Desolneux [[2]](#ref-gaussian). We will prove the strict separation directly, without claiming a formula for the unrestricted optimizer.

<!--more-->

## Match internal geometry, not coordinates

Ordinary transport needs a cost comparing a point $$x$$ in one space with a point $$y$$ in another. Gromov–Wasserstein transport instead compares how two points relate *within* each space [[3]](#ref-memoli). This makes it natural when the spaces have different dimensions.

Take

$$
\alpha=\mathcal N(0,1)\quad\text{on }\mathbb R,
 \qquad \beta_n=\mathcal N(0,I_n)\quad\text{on }\mathbb R^n.
$$

Let $$(X,Y)$$ and $$(X',Y')$$ be independent samples from a coupling $$\pi\in\Pi(\alpha,\beta_n)$$. We minimize the distortion

$$
\mathcal Q(\pi)
 =\mathbb E\left[
       \bigl(|X-X'|^2-|Y-Y'|^2\bigr)^2
       \right].
$$

<blockquote markdown="1">

The inner dissimilarities are *squared* Euclidean distances, and the outside loss is also a square. There is no prefactor $$1/2$$. Using ordinary distances inside the square, or replacing them by inner products, gives a different problem.

</blockquote>

Every admissible coupling has finite objective, by the Gaussian fourth moments. An optimizer exists: the set of couplings is weakly compact, and the nonnegative continuous integrand makes the objective lower semicontinuous under convergence of $$\pi\otimes\pi$$.

## The mixed fourth moment is decisive

Write $$k=\mathbb E[YX]\in\mathbb R^n$$ for the vector of cross-correlations, and define the score

$$
\mathcal G(\pi)=\mathbb E[X^2|Y|^2]+2|k|^2.
$$

<span id="lemma-1"></span>

**Lemma 1 (a moment reduction).** Every coupling with these marginals satisfies

$$
\mathcal Q(\pi)=4n^2+4n+12-4\mathcal G(\pi).
$$

Among all jointly Gaussian couplings, including degenerate ones,

$$
\max\mathcal G=n+4,\qquad
 \min\mathcal Q=4n^2-4.
$$

<details class="blog-proof">

<summary>Proof: expand the square and use Gaussian fourth moments</summary>

<div class="blog-proof-body" markdown="1">

The marginal terms are fixed:

$$
\mathbb E|X-X'|^4=12,\qquad
 \mathbb E|Y-Y'|^4=4n(n+2).
$$

Expanding the cross term and using independence of the primed and unprimed pairs gives

$$
\mathbb E[(X-X')^2|Y-Y'|^2]
 =2\mathbb E[X^2|Y|^2]+2n+4|k|^2.
$$

Substitution proves the first identity. If the joint law is Gaussian, its block covariance is positive semidefinite:

$$
\begin{pmatrix}1&k^\top\\ k&I_n\end{pmatrix}\succeq0,
 \qquad\text{hence }|k|^2\le1.
$$

The Gaussian fourth-moment identity gives $$\mathbb E[X^2Y_j^2]=1+2k_j^2$$. Therefore $$\mathcal G=n+4\lvert k\rvert^2\le n+4$$. Taking $$X=Y_1$$ attains equality. $$\square$$

</div>

</details>

This calculation identifies the possible escape route. In a jointly Gaussian law, the mixed fourth moment is tied to $$k$$. For a general coupling, it is an independent source of improvement. We will set $$k=0$$ and make the fourth moment large enough to compensate.

## A radial coupling that beats the whole Gaussian class

Let $$F_j$$ denote the CDF of the chi-squared law with $$j$$ degrees of freedom, and write $$q_j=F_j^{-1}$$ for its quantile. Draw $$Y\sim\mathcal N(0,I_n)$$ and put

$$
R=|Y|^2,\qquad
 U=F_n(R),\qquad A=q_1(U).
$$

The variable $$U$$ is uniform on $$(0,1)$$, so $$A$$ has the same law as a squared standard normal. Choose an independent fair sign $$\varepsilon\in\{-1,1\}$$, and set $$X=\varepsilon\sqrt A$$. Then $$X\sim\mathcal N(0,1)$$. The sign guarantees $$\mathbb E[YX]=0$$, while $$X^2=A$$ is an increasing function of $$\lvert Y\rvert^2$$: large radii are matched with large magnitudes.

<span id="theorem-1"></span>

**Theorem 1 (failure of Gaussian optimality).** For all sufficiently large $$n$$, the radial coupling above satisfies

$$
\mathcal Q(\pi_{\mathrm{rad}})<4n^2-4.
$$

Consequently, no jointly Gaussian coupling is an optimizer of the unrestricted problem in these dimensions.

<details class="blog-proof">

<summary>Proof: radius fluctuations grow like the square root of dimension</summary>

<div class="blog-proof-body" markdown="1">

Since $$k=0$$, the radial score is

$$
\mathcal G(\pi_{\mathrm{rad}})
 =\int_0^1q_1(u)q_n(u)\,du.
$$

The central limit theorem applied to the sum of $$n$$ squared standard normals gives

$$
\frac{R-n}{\sqrt{2n}}\ \Longrightarrow\ \mathcal N(0,1).
$$

The standardized variables also have second moment exactly one, matching the limit. Weak convergence plus convergence of second moments is convergence in $$W_2$$. In one dimension, $$W_2$$ is the $$L^2$$ distance between quantiles [[4]](#ref-computational). Writing $$\Phi$$ for the standard normal CDF, we obtain

$$
\frac{q_n-n}{\sqrt{2n}}
 \longrightarrow\Phi^{-1}
 \quad\text{in }L^2(0,1).
$$

As $$q_1\in L^2(0,1)$$, with mean $$1$$ and squared norm $$3$$, Cauchy–Schwarz yields

$$
\begin{aligned}
 \mathcal G(\pi_{\mathrm{rad}})
 &=n+\sqrt{2n}\,(c+o(1)),\\
 c&=\int_0^1q_1(u)\Phi^{-1}(u)\,du>0.
 \end{aligned}
$$

<details class="blog-proof">

<summary>Why is the constant strictly positive?</summary>

<div class="blog-proof-body" markdown="1">

For independent uniforms $$U,V$$, the mean of $$\Phi^{-1}(U)$$ is zero and the mean of $$q_1(U)$$ is one. Expanding therefore gives

$$
2c=\mathbb E\!\left[
 (q_1(U)-q_1(V))
 (\Phi^{-1}(U)-\Phi^{-1}(V))\right].
$$

Both quantile functions are strictly increasing. The integrand is strictly positive whenever $$U\ne V$$, and it is integrable by Cauchy–Schwarz. Hence $$c>0$$.

</div>

</details>

The positive term $$\sqrt{2n}(c+o(1))$$ eventually exceeds $$4$$. Thus $$\mathcal G(\pi_{\mathrm{rad}})>n+4$$, and Lemma 1 gives the strict improvement in distortion. $$\square$$

</div>

</details>

## How can zero correlation win?

In the Gaussian class, all dependence is encoded by the cross-correlation vector, and its squared norm cannot exceed one. The largest available improvement in $$\mathcal G$$ beyond the independent value $$n$$ is exactly $$4$$.

The radial construction uses another kind of dependence. The radius squared of an $$n$$-dimensional Gaussian has standard deviation $$\sqrt{2n}$$. Aligning those fluctuations with the nonconstant variable $$X^2$$ produces an improvement of order $$\sqrt n$$. The signs erase every linear correlation but preserve the correlation of magnitudes.

In particular, this coupling is not jointly Gaussian. A jointly Gaussian pair with zero cross-covariance would be independent, whereas here $$X^2$$ is determined by $$\lvert Y\rvert^2$$. Marginal Gaussianity says nothing comparable about their joint nonlinear dependence.

## What the example does—and does not—settle

The theorem uses unequal dimensions and only proves failure for sufficiently large $$n$$. It does not identify the smallest failing dimension, and the radial competitor need not be the global optimizer. A single better feasible coupling is enough to rule out an entire proposed optimizer class.

For a particular dimension, the same competitor gives a concrete one-dimensional test:

$$
\int_0^1 q_1(u)\bigl(q_n(u)-n\bigr)\,du>4.
$$

This inequality, if established, certifies failure of Gaussian optimality at that $$n$$. It is stronger evidence than finding one non-Gaussian coupling better than one arbitrarily chosen Gaussian coupling: the benchmark $$n+4$$ is the optimum over the *entire* jointly Gaussian class. The asymptotic proof avoids relying on numerical quadrature of the unbounded quantiles near $$u=1$$.

It also does not contradict the exact Gaussian-constrained formulas or the special unrestricted Gaussian-optimality cases in [[2]](#ref-gaussian). Nor does it concern inner-product GW, where the objective has a different dependence on moments. The useful lesson is to keep the optimization domain visible: restricting to Gaussian couplings can give an elegant, computable surrogate without solving the unrestricted problem.

## References

<ol class="references">
<li id="ref-book">Gabriel Peyré. <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.13.3.34"><em>Optimal Transport for Machine Learners</em>, Proposition 13.34</a>. Book manuscript.</li>
<li id="ref-gaussian">Julie Delon, Agnès Desolneux, and Antoine Salmona. <a href="https://doi.org/10.1017/jpr.2022.16"><em>Gromov–Wasserstein Distances between Gaussian Distributions</em></a>. Journal of Applied Probability 59(4), 1178–1198, 2022. <a href="https://arxiv.org/abs/2104.07970">Preprint</a>.</li>
<li id="ref-memoli">Facundo Mémoli. <a href="https://doi.org/10.1007/s10208-011-9093-5"><em>Gromov–Wasserstein Distances and the Metric Approach to Object Matching</em></a>. Foundations of Computational Mathematics 11, 417–487, 2011.</li>
<li id="ref-computational">Gabriel Peyré and Marco Cuturi. <a href="https://arxiv.org/abs/1803.00567"><em>Computational Optimal Transport</em></a>. Foundations and Trends in Machine Learning 11(5–6), 355–607, 2019.</li>
</ol>
