---
title: "Mean field conservation laws"
subtitle: "What stays constant when the number of neurons becomes infinite"
description: "From balancedness in linear networks to conserved functionals of a neuron distribution: a covariance formulation, a short proof, and its role in convergence."
topic: Optimization
keywords:
  - "mean-field conservation law"
  - "loi de conservation"
  - "linear neural network"
  - "two-layer linear network"
  - "infinite-width network"
  - "neuron distribution"
  - "balancedness"
  - "Gram matrix"
  - "matrix factorization"
  - "gradient flow"
  - "normalized time"
  - "uncentered covariance"
  - "second-moment matrix"
  - "covariance dynamics"
  - "signature matrix"
  - "signed spectrum"
  - "spectral invariant"
  - "Lax equation"
  - "commutator"
  - "trace powers"
  - "Newton identities"
  - "empirical measure"
  - "Wasserstein gradient flow"
  - "mean-field limit"
  - "hidden preconditioner"
  - "Polyak–Łojasiewicz condition"
  - "PL condition"
  - "exponential convergence"
  - "isotropic initialization"
  - "Stephen Zhang"
  - "Sibylle Marcotte"
  - "Rémi Gribonval"
proofs: true
---

While working with Stephen Zhang on the convergence of two-layer linear networks, we made use of a construction I find particularly appealing: **mean-field conservation laws**. These are functionals of the neuron distribution that remain constant during training. The same functional works for every number of neurons, and also for a continuous distribution describing an infinite-width network.

In our [recent preprint](https://arxiv.org/abs/2610.09356), the relevant laws depend only on the neurons' second moments. They turn a familiar conservation principle, *balancedness*, into a statement about a matrix whose size does not grow with the network. This gives a way to control the geometry of training and prove convergence.

<!--more-->

## Linear networks and gradient flow

A two-layer linear network with $$n$$ neurons is described by

$$
\begin{aligned}
U&=(u_1,\ldots,u_n)\in\mathbb R^{d_u\times n},\\
V&=(v_1,\ldots,v_n)\in\mathbb R^{d_v\times n}.
\end{aligned}
$$

Its predictor is a sum of rank-one contributions,

$$
S=\frac{UV^\top}{n}
=\frac1n\sum_{i=1}^n u_i v_i^\top,
$$

and training minimizes

$$
\min_{U,V} f(U,V),\qquad f(U,V)=\ell(S).
$$

Here $$\ell:\mathbb R^{d_u\times d_v}\to\mathbb R$$ is a smooth loss, for instance $$\ell(S)=\tfrac12\|S-S_\star\|_{\mathrm F}^2$$. Although this example is convex in $$S$$, its factorization makes $$f$$ nonconvex in $$(U,V)$$.

We study **gradient flow**, the continuous-time version of gradient descent. Writing $$E=\nabla\ell(S)$$, ordinary Euclidean gradient flow reads

$$
\begin{aligned}
(\dot U,\dot V)&=-\nabla f(U,V),\\
\dot U&=-\frac1n EV,\\
\dot V&=-\frac1n E^\top U.
\end{aligned}
$$

To compare different widths on the same time scale, we multiply the speed by $$n$$. **From now on**, dots refer to this normalized flow:

$$
\boxed{\dot U=-EV,\qquad\dot V=-E^\top U.}
$$

This is $$-n\nabla f$$; it follows exactly the same trajectories as $$-\nabla f$$, only faster. All conservation statements below hold for either convention. They are exact statements about continuous time; ordinary finite-step gradient descent generally introduces a conservation error.

## Balancedness at finite width

The classical invariant is the difference of the two neuron Gram matrices:

$$
\boxed{h(U,V)=U^\top U-V^\top V.}
$$

This is an $$n\times n$$ matrix.

<span id="proposition-1"></span>
**Proposition 1 (balancedness).** The difference of the neuron Gram matrices is constant along the flow:

$$
h(U(t),V(t))=h(U(0),V(0)).
$$

<details class="blog-proof">
<summary>Proof: the Gram matrices have the same derivative</summary>
<div class="blog-proof-body" markdown="1">

Direct differentiation gives

$$
\begin{aligned}
&\frac{\mathrm d}{\mathrm dt}(U^\top U)
=\frac{\mathrm d}{\mathrm dt}(V^\top V)\\
&=-U^\top EV-V^\top E^\top U.
\end{aligned}
$$

The derivatives agree, which proves the conservation law.

</div>
</details>

The name *balancedness* refers to the special case $$h=0$$: balanced initial factors remain balanced. But the whole matrix is conserved for arbitrary initialization. Conservation laws of this kind, and systematic ways to identify them, are studied in our work with Sibylle Marcotte and Rémi Gribonval [[2]](#ref-marcotte).

The matrix $$h$$ has one row and column per neuron. It records labeled pairwise quantities $$\langle u_i,u_j\rangle-\langle v_i,v_j\rangle$$, and its dimension changes with $$n$$. As such, it is not a single functional of a probability distribution. Some of its spectral summaries, however, admit precisely such a formulation.

## A covariance of fixed size

Stack the two weights of each neuron into one vector:

$$
\begin{aligned}
w_i&=\begin{pmatrix}u_i\\v_i\end{pmatrix}\in\mathbb R^d,\\
W&=\begin{pmatrix}U\\V\end{pmatrix},\qquad d=d_u+d_v.
\end{aligned}
$$

Define their **uncentered covariance**, or second-moment matrix, by

$$
\begin{aligned}
\Sigma&=\frac1n\sum_{i=1}^n w_iw_i^\top
=\frac1n WW^\top\\
&=\begin{pmatrix}A&S\\S^\top&B\end{pmatrix},\\
A&=\frac{UU^\top}{n},\qquad B=\frac{VV^\top}{n}.
\end{aligned}
$$

No mean is subtracted, and no centering assumption is needed. Crucially, $$\Sigma$$ is $$d\times d$$, independently of $$n$$. Its off-diagonal block $$S$$ is the predictor; the diagonal blocks $$A,B$$ describe the hidden weights.

Introduce the signature matrix and the symmetric gradient matrix

$$
J=\begin{pmatrix}I_{d_u}&0\\0&-I_{d_v}\end{pmatrix},
\qquad
G=\begin{pmatrix}0&E\\E^\top&0\end{pmatrix}.
$$

The factor flow is $$\dot W=-GW$$, so its second moment satisfies the **closed equation**

$$
\boxed{\dot\Sigma=-G\Sigma-\Sigma G.}
$$

It is closed because $$E=\nabla\ell(S)$$ depends only on a block of $$\Sigma$$. We can therefore evolve this fixed-size matrix without keeping track of all the individual neurons.

## The conserved signed spectrum

For $$k=1,\ldots,d$$, set

$$
H_k(\Sigma)=\operatorname{tr}\bigl((J\Sigma)^k\bigr),
\qquad H=(H_1,\ldots,H_d).
$$

<span id="theorem-1"></span>
**Theorem 1 (conserved signed spectrum).** Along the flow, on its interval of existence,

$$
\boxed{H(\Sigma(t))=H(\Sigma(0)).}
$$

Equivalently, the characteristic polynomial, and hence the eigenvalues with multiplicity, of $$J\Sigma$$ are constant. This is the *signed covariance spectrum*: $$J\Sigma$$ has the same characteristic polynomial as the symmetric matrix $$\Sigma^{1/2}J\Sigma^{1/2}$$, so these eigenvalues are real, even when $$\Sigma$$ is singular. Neither $$\Sigma$$ itself nor its ordinary eigenvalues need be constant.

<details class="blog-proof">
<summary>Proof: a Lax equation preserves the trace powers</summary>
<div class="blog-proof-body" markdown="1">

The key algebraic identity is $$JG=-GJ$$. Consequently,

$$
\begin{aligned}
\frac{\mathrm d}{\mathrm dt}(J\Sigma)
&=-JG\Sigma-J\Sigma G\\
&=G(J\Sigma)-(J\Sigma)G.
\end{aligned}
$$

This is a *Lax equation*, $$\dot M=[G,M]$$ for $$M=J\Sigma$$, where $$[G,M]=GM-MG$$. Cyclicity of the trace gives

$$
\begin{aligned}
\frac{\mathrm d}{\mathrm dt}\operatorname{tr}(M^k)
&=k\operatorname{tr}\bigl(M^{k-1}[G,M]\bigr)\\
&=0.
\end{aligned}
$$

The first $$d$$ trace powers determine the characteristic polynomial by Newton's identities, which proves the claim [[1]](#ref-linear-networks).

</div>
</details>

For example, the first two laws are

$$
\begin{aligned}
H_1(\Sigma)&=\operatorname{tr}(A)-\operatorname{tr}(B),\\
H_2(\Sigma)&=\operatorname{tr}(A^2)+\operatorname{tr}(B^2)\\
&\quad-2\|S\|_{\mathrm F}^2.
\end{aligned}
$$

These laws are closely connected to finite-width balancedness. Since $$h=W^\top JW$$, another use of cyclicity yields

$$
\boxed{H_k(\Sigma)=\operatorname{tr}\!\left((h/n)^k\right).}
$$

Thus the covariance laws are **normalized spectral summaries of balancedness**. Their advantage is that they can be defined without a neuron count or a labeling. Repeating every neuron the same number of times changes the size of $$h$$ but leaves $$\Sigma$$ and every $$H_k$$ unchanged.

## From particles to a neuron distribution

Associate the empirical probability measure

$$
\mu_n=\frac1n\sum_{i=1}^n\delta_{w_i}
$$

with the network. More generally, let $$\mu\in\mathcal P_2(\mathbb R^d)$$ be any probability measure with finite second moment, and define

$$
\begin{aligned}
\Sigma(\mu)&=\int ww^\top\,\mathrm d\mu(w),\\
\mathcal F(\mu)&=\ell\!\left(\int uv^\top\,\mathrm d\mu(u,v)\right),\\
\mathcal H_k(\mu)&=H_k(\Sigma(\mu)).
\end{aligned}
$$

Then $$\mathcal F(\mu_n)=f(U,V)$$. The normalized particle dynamics are exactly the characteristics of the Wasserstein gradient flow

$$
\partial_t\mu_t=\nabla_w\!\cdot(\mu_tG_tw).
$$

To see this, the first variation of $$\mathcal F$$ is $$u^\top E_tv=\tfrac12w^\top G_tw$$, up to a constant, and its spatial gradient is $$G_tw$$. Thus each neuron moves with velocity $$-G_tw$$. The equation also makes sense for empirical measures, in the distributional sense.

For a general initial distribution, its second moment follows exactly the same closed covariance equation. The proof above therefore gives

$$
\boxed{\mathcal H_k(\mu_t)=\mathcal H_k(\mu_0).}
$$

This is the mean-field statement: **one functional is conserved for all finite widths and for continuous neuron distributions**. There is no Gaussian assumption, and no infinite-width approximation is needed to establish the law.

The definition extends to other sufficiently regular losses on probability measures. A mean-field conservation law is a functional constant along their Wasserstein gradient flows; evaluating it on empirical measures gives compatible laws at every width. The particular signed spectral laws here rely on the linear network's split structure—lifting an arbitrary objective to measures does not automatically produce these invariants.

## Why conservation helps convergence

The hidden covariance blocks control the predictor's speed:

$$
\dot S=-AE-EB.
$$

If both blocks become small in relevant directions, training may slow down. The conserved geometry gives lower bounds that prevent this. Here is a simple instance of the argument in our paper [[1]](#ref-linear-networks).

Suppose $$\Sigma(0)=\sigma^2 I_d$$ with $$\sigma>0$$. Let $$\Phi_t$$ solve $$\dot\Phi_t=-G_t\Phi_t$$ with $$\Phi_0=I_d$$. The anticommutation identity implies

$$
\Phi_t^\top J\Phi_t=J,
\qquad \Phi_tJ\Phi_t^\top=J,
$$

where the second identity follows from invertibility. Since $$\Sigma(t)=\Phi_t\Sigma(0)\Phi_t^\top$$, we get

$$
\begin{aligned}
&\Sigma(t)\mp\sigma^2J\\
&=\Phi_t\bigl(\Sigma(0)\mp\sigma^2J\bigr)\Phi_t^\top\\
&\succeq0.
\end{aligned}
$$

Here $$\succeq0$$ means positive semidefinite. Taking the upper-left block for the minus sign and the lower-right block for the plus sign yields

$$
A(t)\succeq\sigma^2I_{d_u},
\qquad B(t)\succeq\sigma^2I_{d_v}.
$$

Consequently, the loss dissipates at least as fast as

$$
\begin{aligned}
&\frac{\mathrm d}{\mathrm dt}\ell(S(t))\\
&=-\operatorname{tr}(E^\top AE)
-\operatorname{tr}(E^\top EB)\\
&\leq-2\sigma^2\|E\|_{\mathrm F}^2.
\end{aligned}
$$

If the predictor loss has a globally Lipschitz gradient, is bounded below, and satisfies a Polyak–Łojasiewicz inequality,

$$
\|\nabla\ell(S)\|_{\mathrm F}^2
\geq2\kappa\bigl(\ell(S)-\ell_\star\bigr),
$$

with $$\ell_\star=\inf\ell$$ and $$\kappa>0$$, this gives the exponential estimate

$$
\boxed{
\ell(S(t))-\ell_\star
\leq e^{-4\kappa\sigma^2t}
\bigl(\ell(S(0))-\ell_\star\bigr).
}
$$

The rate is expressed in normalized time; in ordinary Euclidean gradient-flow time the exponent is divided by $$n$$. Exact isotropy at finite width requires $$n\geq d$$. The preprint treats general positive-definite covariances, certain singular covariances, and finite-width sampling, under a globally Lipschitz gradient and the PL condition. The role of the conservation laws is the same: they keep the hidden preconditioners from degenerating and turn information about initialization into a guarantee along the whole training trajectory.

## References

1. <span id="ref-linear-networks"></span> Stephen Y Zhang and Gabriel Peyré. [*Global Exponential Convergence of Two-Layer Linear Network Training*](https://arxiv.org/abs/2610.09356), 2026. See Section 2 for the covariance laws, Appendix B for their mean-field formulation, and Theorem 3.1 for convergence.
2. <span id="ref-marcotte"></span> Sibylle Marcotte, Rémi Gribonval and Gabriel Peyré. [*Abide by the Law and Follow the Flow: Conservation Laws for Gradient Flows*](https://arxiv.org/abs/2307.00144), NeurIPS, 2023.
