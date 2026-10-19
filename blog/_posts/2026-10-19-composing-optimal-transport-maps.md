---
title: Two optimal transports need not compose optimally
subtitle: The obstruction already appears when multiplying two positive-definite matrices.
description: Two quadratic optimal maps need not compose into an optimal map. A matrix example separates monotonicity, convex gradients, and optimality.
date: 2026-10-19
topic: Optimal transport
keywords:
- optimal transport map composition
- quadratic optimal transport
- Monge maps
- Brenier theorem
- convex gradients
- Gaussian transport
- covariance matrices
- positive definite matrices
- noncommuting matrices
- matrix commutator
- symmetric Jacobian
- monotone operators
- cyclical monotonicity
- convex subdifferentials
- polar factorization
- exact transport cost gap
- pushforward measure
- matrix square root
- Bures–Wasserstein geometry
- Hessian commutation
- quantile maps
- one-dimensional transport
- Yann Brenier
- Tyrrell Rockafellar
- Rajendra Bhatia
- Gabriel Peyré
- composition de transports optimaux
- gradient convexe
- monotonie cyclique
- matrices définies positives
- factorisation polaire
proofs: true
embedded_experiment: true
---

Transport a distribution optimally to an intermediate distribution, then transport that one optimally to a final target. Is the resulting correspondence optimal between the original and final distributions? On the real line, yes: increasing maps compose into increasing maps. In higher dimensions, the answer is generally no.

This is more subtle than saying that a journey through a waypoint can be long. Here we compare the *direct endpoint displacement* of the composed map with the direct optimal cost. The composition itself may assign the wrong endpoints. A two-dimensional Gaussian example explains why, and also clarifies a common confusion between monotone maps and gradients of convex functions. See [Remark 2.42 of my book](https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.2.6.42) [[1]](#ref-book).

<!--more-->

## Which structure certifies optimality?

For probability measures with finite second moment, quadratic optimal transport minimizes $$\mathbb E\lvert X-Y\rvert^2$$ over all joint laws with the prescribed marginals. A map $$T$$ induces the coupling $$(X,T(X))$$ and the output distribution $$T_\#\alpha$$: by definition, $$T_\#\alpha(B)=\alpha(T^{-1}(B))$$. For background on these two formulations, see [[5]](#ref-computational).

Brenier's theorem says that, for an absolutely continuous source, the optimal map is a gradient of a convex function [[2]](#ref-brenier). The linear case is particularly transparent: $$T(x)=Ax$$ is a convex gradient exactly when $$A$$ is symmetric positive semidefinite.

<span id="lemma-1"></span>

**Lemma 1 (a quadratic optimality certificate).** If $$A$$ is symmetric positive definite and $$\alpha\in\mathcal P_2(\mathbb R^d)$$, then $$x\mapsto Ax$$ is optimal from $$\alpha$$ to $$A_\#\alpha$$.

<details class="blog-proof">
<summary>Proof: complete a square</summary>
<div class="blog-proof-body" markdown="1">

For any $$x,y$$,

$$
  x^\top y
  \le\tfrac12x^\top Ax+\tfrac12y^\top A^{-1}y,
$$

because the difference equals $$\tfrac12\lvert A^{1/2}x-A^{-1/2}y\rvert^2$$. Equality holds exactly when $$y=Ax$$. For fixed marginals, the expectation of the right side is fixed. Thus $$Y=AX$$ maximizes $$\mathbb E(X^\top Y)$$, and therefore minimizes

$$
  \mathbb E|X-Y|^2
  =\mathbb E|X|^2+\mathbb E|Y|^2-2\mathbb E(X^\top Y).
$$

This proves optimality without any density assumption. It also proves uniqueness of the optimal coupling: equality in the expected square forces $$Y=AX$$ almost surely. $$\square$$

</div>
</details>

## A counterexample with an exact cost gap

<span id="theorem-1"></span>

**Theorem 1 (optimal factors, nonoptimal product).** Let $$\alpha_0=\mathcal N(0,I_2)$$, and set

$$
  A=\begin{pmatrix}2&0\\0&1\end{pmatrix},
  \qquad B=\begin{pmatrix}2&1\\1&2\end{pmatrix}.
$$

Define $$\alpha_1=A_\#\alpha_0$$ and $$\alpha_2=B_\#\alpha_1$$. Each of the two maps is optimal for its corresponding pair. Their composition $$D=BA$$, however, has a strictly larger direct cost than the optimal map from $$\alpha_0$$ to $$\alpha_2$$: the excess is $$2\sqrt{37}-12>0$$.

<details class="blog-proof">
<summary>Proof: compare two maps with exactly the same Gaussian output</summary>
<div class="blog-proof-body" markdown="1">

Both $$A$$ and $$B$$ are symmetric positive definite, so Lemma 1 proves the first assertion. Their product and its output covariance are

$$
  D=\begin{pmatrix}4&1\\2&2\end{pmatrix},
  \qquad
  DD^\top=\begin{pmatrix}17&10\\10&8\end{pmatrix}.
$$

Let $$C=(DD^\top)^{1/2}$$ be the symmetric positive-definite square root. For $$X\sim\mathcal N(0,I_2)$$, the random vectors $$DX$$ and $$CX$$ have the same covariance, hence the same law. Lemma 1 makes $$C$$ optimal. The two costs are

$$
  \mathbb E|X-MX|^2
  =2+\operatorname{tr}(MM^\top)-2\operatorname{tr}(M).
$$

The covariance terms agree. If $$\lambda_1,\lambda_2$$ are the eigenvalues of $$DD^\top$$, then

$$
  \operatorname{tr}C
  =\sqrt{\lambda_1}+\sqrt{\lambda_2}
  =\sqrt{25+2\sqrt{36}}=\sqrt{37}.
$$

Since $$\operatorname{tr}D=6$$, subtracting the costs gives $$2\sqrt{37}-12$$. $$\square$$

</div>
</details>

The structural warning is already visible in $$D$$: it is not symmetric. Thus it cannot be the gradient of a quadratic—or, indeed, agree almost everywhere on $$\mathbb R^2$$ with any convex gradient. A gradient has symmetric distributional derivatives, while this linear field does not.

There is also a geometric explanation. Set $$R=C^{-1}D$$. Then $$RR^\top=I$$, so

$$
 D=CR,\qquad R_\#\mathcal N(0,I_2)=\mathcal N(0,I_2).
$$

The product first rotates the source and then applies the optimal symmetric map $$C$$. The rotation is invisible in the output distribution because the source is isotropic, but it changes which source point goes where. Removing it preserves the target and lowers the cost. This is the matrix version of *polar factorization* [[2]](#ref-brenier).

## Monotone is not the same as a convex gradient

A map is *monotone* when

$$
  \langle T(x)-T(y),x-y\rangle\ge0
  \quad\text{for every }x,y.
$$

For a continuously differentiable map on a convex open domain, this is equivalent to the symmetric part of its Jacobian being positive semidefinite. Necessity follows by taking $$y=x+hv$$ and letting $$h\to0$$; sufficiency follows by integrating the Jacobian along the segment between $$x$$ and $$y$$.

Being a gradient imposes a different condition: the Jacobian must be symmetric. On a convex open domain this condition is also sufficient, by integrating the vector field along line segments. Combining the two conditions characterizes gradients of convex functions. For linear maps the distinction reads

$$
  \begin{aligned}
  Ax\text{ monotone}
    &\iff (A+A^\top)/2\succeq0,\\
  Ax\text{ a gradient}
    &\iff A=A^\top,\\
  Ax\text{ a convex gradient}
    &\iff A=A^\top\succeq0.
  \end{aligned}
$$

Our nonoptimal product $$D$$ is actually still monotone: its symmetric part is $$\left(\begin{smallmatrix}4&3/2\\3/2&2\end{smallmatrix}\right)$$, which is positive definite. Pairwise monotonicity does not certify transport optimality. The stronger condition is *cyclical monotonicity*: for every finite cycle $$x_1,\ldots,x_k,x_{k+1}=x_1$$,

$$
 \sum_{i=1}^k
 \langle T(x_i),x_i-x_{i+1}\rangle\ge0.
$$

For $$k=2$$ this is ordinary monotonicity. Convex gradients satisfy every cycle inequality by summing the supporting-hyperplane inequalities. Conversely, Rockafellar's theorem places every cyclically monotone graph inside a convex subdifferential [[3]](#ref-rockafellar). The missing higher-order cycles explain why a monotone map can still be a poor transport assignment.

Even monotonicity need not survive composition. For $$A=\operatorname{diag}(9,1)$$ and $$B=\left(\begin{smallmatrix}1&2\\2&5\end{smallmatrix}\right)$$, both factors are positive definite, but the symmetric part of $$BA$$ is

$$
  \begin{pmatrix}9&10\\10&5\end{pmatrix},
$$

whose determinant is negative.

## When does composition work?

<span id="proposition-1"></span>

**Proposition 1 (commuting linear factors).** If $$A,B$$ are symmetric positive-definite matrices and the source is a nondegenerate Gaussian, then $$BA$$ is an optimal quadratic map to its own output law if and only if $$AB=BA$$.

<details class="blog-proof">
<summary>Proof: symmetry of the product is exactly commutativity</summary>
<div class="blog-proof-body" markdown="1">

If $$AB=BA$$, the two matrices admit a common orthonormal eigenbasis. In that basis $$BA$$ has positive diagonal entries, so Lemma 1 applies. Conversely, an optimal map from a nondegenerate Gaussian is a convex gradient by Brenier's theorem. Since the Gaussian density is strictly positive, the linear map $$BA$$ must have symmetric derivative. But $$(BA)^\top=AB$$, so $$BA=AB$$. $$\square$$

</div>
</details>

For $$C^2$$ convex potentials $$\phi,\psi$$, defined on open sets containing the source domain and its image respectively, the same local obstruction appears in the chain rule:

$$
  D(\nabla\psi\circ\nabla\phi)(x)
  =D^2\psi(\nabla\phi(x))\,D^2\phi(x).
$$

Even though both Hessians are symmetric positive semidefinite, their product need not be symmetric. On a convex open source domain, pointwise commutation of these Hessians is a sufficient condition: the derivative is then symmetric positive semidefinite, so the composition is again a convex gradient. When the source and output have finite second moments, it therefore transports optimally to its own output law.

On the line there is no matrix commutator. Compositions of nondecreasing maps remain nondecreasing and are therefore optimal to their own output distributions. For atomless source and intermediate laws, this agrees with composing their increasing quantile transport maps. With atoms, a deterministic map to a given target may not exist, so one should not cancel CDFs across jumps without checking the hypotheses.

## Numerical experimentation

The following experiment fixes $$A=\operatorname{diag}(2,1)$$ and rotates the eigenbasis of $$B$$, whose eigenvalues remain $$3$$ and $$1$$. Compare $$BAx$$ with $$Cx$$, where $$C=(BA^2B)^{1/2}$$. At each angle both maps produce exactly the same Gaussian law, while their pointwise assignments differ. The covariance formula and its relation to the Bures–Wasserstein geometry are discussed in [[4]](#ref-bures).

<figure>
<iframe class="idea-experiment" data-experiment="composition" title="Composition of Gaussian optimal maps and its exact cost excess" src="{{ '/blog/preparations/assets/ot-lab/index.html?topic=composition' | relative_url }}" loading="lazy"></iframe>
<figcaption markdown="1">

Rotate the eigenbasis and watch the skew defect $$\|BA-(BA)^\top\|_{\mathrm F}$$, the exact expected Gaussian costs, and the cost-excess curve in the third panel. The plotted source points illustrate couplings of continuous Gaussian laws; the two finite displayed endpoint clouds need not coincide. The endpoints agree in distribution, not sample by sample.

</figcaption>
</figure>

At commuting angles the excess vanishes. Away from them, the product introduces a component that can be removed while preserving the output covariance. Optimality is a property of the whole source–target correspondence, and is not inherited automatically by stacking individually optimal layers.

## References

<ol class="references">
  <li id="ref-book">Gabriel Peyré. <a href="https://arxiv.org/abs/2505.06589"><em>Optimal Transport for Machine Learners</em></a>, 2025–2026. <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.2.6.42">Remark 2.42, p. 30</a>.</li>
  <li id="ref-brenier">Yann Brenier. <a href="https://doi.org/10.1002/cpa.3160440402"><em>Polar factorization and monotone rearrangement of vector-valued functions</em></a>. <em>Communications on Pure and Applied Mathematics</em> 44(4), 375–417, 1991.</li>
  <li id="ref-rockafellar">R. Tyrrell Rockafellar. <a href="https://doi.org/10.2140/pjm.1966.17.497"><em>Characterization of the subdifferentials of convex functions</em></a>. <em>Pacific Journal of Mathematics</em> 17(3), 497–510, 1966.</li>
  <li id="ref-bures">Rajendra Bhatia, Tanvi Jain, and Yongdo Lim. <a href="https://arxiv.org/abs/1712.01504"><em>On the Bures–Wasserstein distance between positive definite matrices</em></a>. <em>Expositiones Mathematicae</em> 37(2), 165–191, 2019.</li>
  <li id="ref-computational">Gabriel Peyré and Marco Cuturi. <a href="https://arxiv.org/abs/1803.00567"><em>Computational Optimal Transport</em></a>. <em>Foundations and Trends in Machine Learning</em> 11(5–6), 355–607, 2019.</li>
</ol>
