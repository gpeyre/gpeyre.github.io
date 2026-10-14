---
title: "Stone–Weierstrass with approximate products"
subtitle: "From an algebra in the closure to universal approximation with ReLU networks"
description: "A short Stone–Weierstrass corollary: products need only be approximable. Proofs for ReLU networks, including two-layer networks, and a connection to attention universality on spaces of measures."
topic: Approximation theory
---

The Stone–Weierstrass theorem is a cornerstone of approximation theory: it turns a few structural properties of a family of functions into the ability to approximate every continuous function. It explains the density of polynomials and Fourier modes, and provides a route to universality for neural networks—even two-layer networks. It also plays a central role in my recent work with Takashi Furuya and Maarten de Hoop on attention universality over an infinite-dimensional space of contexts [[3]](#ref-attention).

The hypothesis that often looks most restrictive is **stability under products**. Multiplying two polynomials gives another polynomial, but multiplying two ReLU networks generally does not give a ReLU network. Fortunately, exact multiplication is unnecessary: it is enough that products belong to the **uniform closure** of the class. This elementary consequence of the usual theorem is worth keeping in mind.

<!--more-->

<figure class="portrait-pair">
  <div class="portrait-pair-images">
    <div>
      <img src="{{ '/blog/imgs/marshall-stone.jpg' | relative_url }}" width="1000" height="776" alt="Portrait of Marshall H. Stone in profile" loading="lazy">
      <p>Marshall H. Stone</p>
    </div>
    <div>
      <img src="{{ '/blog/imgs/karl-weierstrass.jpg' | relative_url }}" width="901" height="1322" alt="Portrait of Karl Weierstrass with his signature below" loading="lazy">
      <p>Karl Weierstrass</p>
    </div>
  </div>
  <figcaption>
    Stone: <a href="https://photoarchive.lib.uchicago.edu/db.xqy?one=apf1-07972.xml">University of Chicago Photographic Archive, apf1-07972</a>, Hanna Holborn Gray Special Collections Research Center, University of Chicago Library. Used under the archive's <a href="https://photoarchive.lib.uchicago.edu/rights.html">educational and scholarly use permission</a>.<br>
    Weierstrass: Smithsonian Institution Libraries, via <a href="https://commons.wikimedia.org/wiki/File:Karl_Weierstrass.jpg">Wikimedia Commons</a>, public domain.
  </figcaption>
</figure>

## The classical theorem

Let $$K$$ be a compact Hausdorff space, and let $$C(K,\mathbb R)$$ denote its real-valued continuous functions, equipped with the uniform norm

$$
\|f\|_\infty=\sup_{x\in K}|f(x)|.
$$

A family $$\mathcal A$$ *separates points* if, whenever $$x\ne y$$, some $$f\in\mathcal A$$ satisfies $$f(x)\ne f(y)$$. It is a *unital algebra* if it contains the constant function $$1$$ and is stable under linear combinations and pointwise products.

**Stone–Weierstrass theorem.** A unital subalgebra $$\mathcal A\subset C(K,\mathbb R)$$ that separates points is uniformly dense:

$$
\overline{\mathcal A}=C(K,\mathbb R).
$$

Here and below, the bar means closure for $$\|\cdot\|_\infty$$. Thus, for every continuous target and every positive error tolerance, there is one member of the family approximating that target everywhere on $$K$$ [[1]](#ref-stone).

Two familiar examples illustrate the hypotheses:

- **Polynomials.** On any compact $$K\subset\mathbb R^d$$, restrictions of real polynomials form a unital algebra. Coordinate functions separate points, so polynomials are dense in $$C(K,\mathbb R)$$.
- **Fourier approximation.** On the torus $$\mathbb T^d$$, real trigonometric polynomials form a unital algebra and separate points. They therefore approximate every continuous periodic function uniformly. This is a density statement, not a claim that the ordinary Fourier partial sums of every continuous function converge uniformly.

## An algebra only in the closure

Here is the useful reformulation.

**Theorem (approximate products suffice).** Let $$\mathcal F\subset C(K,\mathbb R)$$ be a real linear subspace containing $$1$$ and separating points. Suppose that

$$
f,g\in\mathcal F\quad\Longrightarrow\quad fg\in\overline{\mathcal F}.
$$

Then

$$
\boxed{\overline{\mathcal F}=C(K,\mathbb R).}
$$

The assumption says that, for every $$f,g\in\mathcal F$$ and every $$\varepsilon>0$$, there is $$h\in\mathcal F$$ such that $$\|h-fg\|_\infty<\varepsilon$$. It does not require the exact product to be representable.

**Proof.** Set $$\mathcal A=\overline{\mathcal F}$$. It is a closed linear space containing constants and separating points. For $$f,g\in\mathcal A$$, choose $$f_n,g_n\in\mathcal F$$ converging uniformly to $$f,g$$. Multiplication is continuous in the uniform norm:

$$
\|f_ng_n-fg\|_\infty
\leq\|f_n\|_\infty\|g_n-g\|_\infty
+\|f_n-f\|_\infty\|g\|_\infty\longrightarrow0.
$$

Each $$f_ng_n$$ belongs to $$\mathcal A$$ by assumption, so $$fg\in\mathcal A$$ because $$\mathcal A$$ is closed. Thus $$\mathcal A$$ is a unital algebra. The classical theorem makes it dense in $$C(K,\mathbb R)$$; since it is already closed, it equals that space. $$\square$$

More generally, one can start with any family whose closure is a unital, point-separating algebra. The linear-space formulation above is simply convenient for applications. The distinction is between **exact algebraic operations in the model class** and **operations that can be approximated arbitrarily well**.

It even suffices to approximate squares, thanks to polarization:

$$
fg=\frac{(f+g)^2-(f-g)^2}{4}.
$$

## The ReLU construction

Let $$K\subset\mathbb R^d$$ be compact and write $$\sigma(t)=\max(t,0)$$. Consider the class $$\mathcal N$$ of scalar-valued, finite feed-forward ReLU networks, with biases and an affine output layer. For now, both width and depth may be any finite size.

These networks are continuous and piecewise affine. On $$K=[-1,1]$$, for example, the identity function is a ReLU network, but its square is not: no finite piecewise-affine function agrees with $$x^2$$ on an interval. So $$\mathcal N$$ is not, in general, an algebra.

The proof of universality nevertheless has a simple plan. A one-dimensional linear spline approximates the square function. ReLU represents such splines exactly. Polarization then produces an approximate multiplier, which we can append to any two networks. This puts their product in the closure, where Stone–Weierstrass applies. No neural-network universality theorem is needed as an input to this argument.

## Proof for ReLU networks

**Constants, linear combinations, and separation.** Networks can run in parallel and their outputs can be combined by an affine readout. Networks of different depths can be padded using the identity $$t=\sigma(t)-\sigma(-t)$$. Hence $$\mathcal N$$ is a vector space containing constants. It contains each coordinate function,

$$
x_j=\sigma(x_j)-\sigma(-x_j),
$$

so it separates points of $$K$$.

**Approximate multiplication.** Fix $$f,g\in\mathcal N$$ and choose $$R>0$$ with $$\|f\|_\infty,\|g\|_\infty\leq R$$. Given $$\delta>0$$, linearly interpolate $$t^2$$ on a sufficiently fine partition of $$[-2R,2R]$$. The resulting spline $$q_\delta$$ satisfies

$$
\sup_{|t|\leq2R}|q_\delta(t)-t^2|\leq\delta.
$$

Indeed, on an interval $$[a,b]$$, the interpolant minus $$t^2$$ is $$(t-a)(b-t)$$, which is at most $$(b-a)^2/4$$. Every such spline has a finite hinge representation

$$
q_\delta(t)=a+bt+\sum_{j=1}^N c_j\sigma(t-\tau_j),
$$

where the coefficients $$c_j$$ are its slope changes at the knots $$\tau_j$$. Thus it is exactly a one-hidden-layer ReLU network; the linear term can also be represented using two ReLU units.

Define

$$
m_\delta(u,v)=\frac{q_\delta(u+v)-q_\delta(u-v)}{4}.
$$

For $$|u|,|v|\leq R$$, the two spline errors give

$$
|m_\delta(u,v)-uv|\leq\frac{\delta}{2}.
$$

Run $$f$$ and $$g$$ in parallel, then apply $$m_\delta$$. This is still a finite ReLU network $$h_\delta=m_\delta(f,g)$$, and

$$
\|h_\delta-fg\|_\infty\leq\frac{\delta}{2}.
$$

Therefore $$fg\in\overline{\mathcal N}$$. The closure theorem yields

$$
\boxed{\overline{\mathcal N}=C(K,\mathbb R).}
$$

The networks themselves cannot multiply exactly, but their closure can.

## A proof for two layers

Appending a multiplier can increase depth. The preceding construction therefore proves universality for arbitrary finite-depth networks, not by itself for networks with a single hidden layer. The stronger two-layer result is also true [[2]](#ref-leshno), and there is a short Stone–Weierstrass proof.

Consider arbitrary-width networks of the form

$$
s(x)=a+\sum_{j=1}^N c_j\sigma(w_j\cdot x+b_j).
$$

Every polynomial is a finite linear combination of powers of linear forms. To see this, for $$k\geq1$$ use the polarization identity

$$
z_1\cdots z_k=\frac1{k!}\sum_{S\subset\{1,\ldots,k\}}
(-1)^{k-|S|}\left(\sum_{i\in S}z_i\right)^k.
$$

Expanding the right-hand side cancels every term missing one of the variables; the remaining term is $$k!z_1\cdots z_k$$ before division by $$k!$$. Taking the $$z_i$$ to be coordinates, with repetitions allowed, gives every monomial.

For each linear form $$w\cdot x$$, its range on $$K$$ is bounded. Approximate $$t^k$$ there by a linear spline. The hinge representation shows that the resulting function of $$w\cdot x$$ has one hidden layer. Finite sums remain in the same shallow class, so every polynomial lies in its uniform closure. Polynomial density, already obtained from Stone–Weierstrass, finishes the proof.

Thus even the two-layer class is dense, despite not being product-stable itself. This argument makes clear why increasing width is enough here, without silently adding layers.

## Attention and infinite-dimensional inputs

In our work with Takashi Furuya and Maarten de Hoop [[3]](#ref-attention), a context is a probability measure $$\mu$$ on a compact token domain $$\Omega\subset\mathbb R^d$$. The input is $$(\mu,x)\in\mathcal P(\Omega)\times\Omega$$, a compact space for weak convergence of measures, and generally infinite-dimensional.

For unmasked attention, we prove uniform approximation of continuous in-context maps by a single transformer, simultaneously across all context sizes, including non-atomic measures. The proof builds a point-separating algebra from elementary attention features, applies Stone–Weierstrass, then approximates its products with neural networks. It is the same useful principle: exact multiplication can belong to the proof's auxiliary algebra, while the architecture only needs to approximate it.

## References

<span id="ref-stone"></span>
**[1]** Marshall H. Stone. *The Generalized Weierstrass Approximation Theorem*. Mathematics Magazine 21 (1948), 167–184 and 237–254. [Part I](https://doi.org/10.2307/3029750) · [Part II](https://doi.org/10.2307/3029337).

<span id="ref-leshno"></span>
**[2]** Moshe Leshno, Vladimir Ya. Lin, Allan Pinkus, and Shimon Schocken. *Multilayer feedforward networks with a nonpolynomial activation function can approximate any function*. Neural Networks 6(6), 861–867 (1993). [Paper](https://doi.org/10.1016/S0893-6080(05)80131-5) · [Author-hosted PDF](https://pinkus.net.technion.ac.il/files/2021/02/neural.pdf).

<span id="ref-attention"></span>
**[3]** Takashi Furuya, Maarten V. de Hoop, and Gabriel Peyré. *Transformers are Universal In-context Learners*. ICLR (2025). [Paper](https://arxiv.org/abs/2408.01367) · [Proceedings](https://proceedings.iclr.cc/paper_files/paper/2025/hash/c9028f7874df04843e7bf435ee4cd3c3-Abstract-Conference.html).
