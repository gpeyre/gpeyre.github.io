---
title: "From MLP universality to ConvNet Universality"
subtitle: "Approximate one coordinate, share it across space, and turn width into depth."
description: "From exponential networks to two-layer MLPs, then from one output coordinate to a universal equivariant ConvNet. A short construction trades width for depth."
date: "2026-10-29"
topic: "Neural networks and symmetry"
keywords: ["MLP","multilayer perceptron","ConvNet","convolutional neural network","universal approximation","Cybenko","Hornik","Stinchcombe","White","Leshno","Stone–Weierstrass","exponential networks","sigmoidal activation","ReLU","piecewise linear interpolation","circular convolution","cyclic group","translation equivariance","weight sharing","convolution filters","compact sets","uniform approximation","residual networks","skip connections","depth width tradeoff","fixed width","receptive field","Petersen","Voigtlaender","Yarotsky","Li Lin Shen","approximation universelle","réseaux convolutifs"]
proofs: true
---

A fully connected neural network can approximate any continuous function on a compact set, provided its hidden layer is wide enough. What remains of this flexibility when the weights must be shared across space, as in a convolutional network?

The right target is a function with the same symmetry: shifting the input should shift the output. For finite periodic signals, the passage from MLP universality to ConvNet universality is remarkably short. A translation-equivariant map is determined by just *one* of its output coordinates. Approximate that coordinate by an MLP, and convolution applies the same computation at every position.

We will first prove shallow MLP universality through exponential networks and Stone–Weierstrass, then turn the proof into a convolutional one. Finally, we will see how to replace a wide hidden layer by a deep network with a constant number of channels.

<!--more-->

## Two-layer MLPs: the role of the activation and the bias

A two-layer MLP, with input $$x\in\mathbb R^d$$ and scalar output, has the form

$$
f_n(x)=\sum_{i=1}^n a_i\,\sigma(\langle w_i,x\rangle+b_i),
  \qquad w_i\in\mathbb R^d,\quad a_i,b_i\in\mathbb R.
$$

Here “two layers” counts the affine input-to-hidden map and the linear hidden-to-output map: there is one hidden layer, of width $$n$$. For a vector output, replace the scalars $$a_i$$ by vectors and apply the scalar result coordinate by coordinate.

The biases $$b_i$$ matter. One can absorb them into an augmented input $$(x,1)$$, but one cannot simply omit them: a bias-free ReLU network is positively homogeneous and vanishes at the origin, so it cannot approximate even a nonzero constant on a compact set containing the origin.

We use either ReLU, $$\sigma(t)=\max(t,0)$$, or a continuous *sigmoidal* activation, meaning

$$
\lim_{t\to-\infty}\sigma(t)=0,
  \qquad \lim_{t\to+\infty}\sigma(t)=1.
$$

The logistic sigmoid is an example; a rescaled hyperbolic tangent is another. Monotonicity is not needed for the proof below.

<span id="theorem-1"></span>

**Theorem 1 (shallow universal approximation).** Let $$K\subset\mathbb R^d$$ be compact, and let $$\sigma$$ be continuous sigmoidal or ReLU. For every $$f\in C(K)$$ and $$\varepsilon>0$$, there is a finite-width two-layer MLP such that

$$
\sup_{x\in K}|f(x)-f_n(x)|<\varepsilon.
$$

The sigmoidal case is the classical theorem of Cybenko and of Hornik, Stinchcombe, and White <a href="#ref-cybenko">[1]</a>, <a href="#ref-hornik1989">[2]</a>. Hornik later allowed any continuous, bounded, nonconstant activation <a href="#ref-hornik1991">[3]</a>. More generally, for continuous activations, the sharp condition for shallow universality is that $$\sigma$$ is not a polynomial <a href="#ref-leshno">[4]</a>. We prove the two concrete cases above, including ReLU, without using a neural approximation theorem as a black box.

<figure class="portrait-pair">
  <div class="portrait-pair-images">
    <div><a href="https://home.dartmouth.edu/news/2025/03/four-dartmouth-professors-named-aaas-fellows"><img src="https://home.dartmouth.edu/sites/home/files/styles/portrait_small_315x435/public/2025-03/19.jpg.webp?h=99d542f5&amp;itok=wnWkBB8A" alt="George Cybenko" width="315" height="435" loading="lazy" decoding="async"></a><p>George Cybenko</p></div>
    <div><a href="https://research.wu.ac.at/en/persons/kurt-hornik-7/"><img src="https://research.wu.ac.at/files-asset/16954735/csm_kh2_6b0972124b.jpg" alt="Kurt Hornik" width="139" height="185" loading="lazy" decoding="async"></a><p>Kurt Hornik</p></div>
  </div>
  <figcaption>Portraits linked from their institutional sources: George Cybenko, photograph by John Sherman / <a href="https://home.dartmouth.edu/news/2025/03/four-dartmouth-professors-named-aaas-fellows">Dartmouth</a>; Kurt Hornik, <a href="https://research.wu.ac.at/en/persons/kurt-hornik-7/">WU Vienna University of Economics and Business</a>.</figcaption>
</figure>

## Why exponentials make the proof simple

Consider the finite sums

$$
P(x)=\sum_{j=1}^N c_j e^{\langle q_j,x\rangle}.
$$

<p>They form an algebra: multiplying two exponential features just adds their directions. They contain constants, and they separate points. Indeed, if \(x\ne y\), choose \(q=x-y\), so that \(\langle q,x\rangle-\langle q,y\rangle=\|x-y\|^2&gt;0\). The real Stone–Weierstrass theorem therefore makes these exponential networks dense in \(C(K)\) <a href="#ref-stone">[5]</a>. This is the same mechanism discussed in <a href="/blog/2026/10/16/stone-weierstrass-approximate-products/">the earlier post on universal approximation</a>.</p>

All that remains is a one-dimensional problem: approximate $$t\mapsto e^t$$ on a bounded interval by sums of affine copies of $$\sigma$$. Substituting $$t=\langle q,x\rangle$$ then gives ordinary neurons, without adding a hidden layer.

<details class="blog-proof">

<summary>

Proof of Theorem 1: exponential features, then a one-dimensional replacement

</summary>

<div class="blog-proof-body" markdown="1">

<p>Choose \(P\) with \(\|f-P\|_{C(K)}&lt;\varepsilon/2\). Since \(K\) is compact and there are finitely many directions, choose \(R&gt;0\) such that \(|\langle q_j,x\rangle|\le R\) for every \(j\) and \(x\in K\).</p>

<span id="lemma-1"></span>

**Lemma 1 (replace an exponential by neurons).** For either activation in Theorem 1 and every $$\eta>0$$, there is a finite sum

$$
s(t)=\sum_{\ell=1}^M c_\ell\sigma(\alpha_\ell t+\beta_\ell)
  \quad\text{with}\quad
  \sup_{|t|\le R}|s(t)-e^t|<\eta.
$$

<details class="blog-proof">

<summary>

Proof of Lemma 1: a smoothed staircase for sigmoids

</summary>

<div class="blog-proof-body" markdown="1">

The elementary identity

$$
e^t=e^{-R}+\int_{-R}^{R}e^r\,\mathbf1_{\{r<t\}}\,dr
  \qquad (-R\le t\le R)
$$

suggests replacing the step by a steep sigmoid:

$$
S_A(t)=e^{-R}+\int_{-R}^{R}e^r\sigma\bigl(A(t-r)\bigr)\,dr.
$$

<p>This converges to \(e^t\) <em>uniformly</em> as \(A\to\infty\). To see why, write \(M=\sup|\sigma|&lt;\infty\) and fix \(\delta&gt;0\). The part where \(|t-r|\le\delta\) contributes at most \(2\delta e^R(M+1)\) to the error. On the rest, sigmoidality makes the error at most \(2Re^R\omega(A\delta)\), where</p>

$$
\omega(L)=\max\!\left\{
  \sup_{z\ge L}|\sigma(z)-1|,\;
  \sup_{z\le-L}|\sigma(z)|\right\}\longrightarrow0.
$$

First choose $$\delta$$ small, then $$A$$ large. For this fixed $$A$$, ordinary Riemann sums approximate the integral uniformly in $$t$$, by uniform continuity on the compact square $$[-R,R]^2$$. The result is a finite sum of neurons. The constant $$e^{-R}$$ is also a neuron: choose zero input weight and a bias $$b$$ with $$\sigma(b)\ne0$$. $$\square$$

</div>

</details>

<details class="blog-proof">

<summary>

Proof of Lemma 1 for ReLU: explicit linear interpolation

</summary>

<div class="blog-proof-body" markdown="1">

Set $$t_k=-R+kh$$, where $$h=2R/m$$, and let

$$
q_k=\frac{e^{t_{k+1}}-e^{t_k}}h,\qquad 0\le k<m.
$$

The piecewise affine interpolant of the exponential is exactly

$$
s_m(t)=e^{-R}+q_0(t+R)
    +\sum_{k=1}^{m-1}(q_k-q_{k-1})(t-t_k)_+.
$$

Its error on $$[-R,R]$$ is at most $$e^Rh^2/8$$, by the interpolation remainder and $$(e^t)''=e^t$$. It is a ReLU network: on this interval $$t+R=(t+R)_+$$, and constants are multiples of $$\sigma(1)$$. Let $$m\to\infty$$. $$\square$$

</div>

</details>

<p>Apply the lemma with \(\eta=\varepsilon/[2(1+\sum_j|c_j|)]\), and substitute \(t=\langle q_j,x\rangle\). Each term is a neuron because</p>

$$
\sigma(\alpha\langle q_j,x\rangle+\beta)
  =\sigma(\langle\alpha q_j,x\rangle+\beta).
$$

<p>Adding all these terms gives a two-layer MLP \(f_n\) with \(\|P-f_n\|_{C(K)}&lt;\varepsilon/2\), and hence the desired approximation. \(\square\)</p>

</div>

</details>

## Convolution on a periodic one-dimensional signal

Now regard $$x\in\mathbb R^d$$ as a scalar signal on the cyclic grid $$\mathbb Z/d\mathbb Z$$. Indices $$0,\ldots,d-1$$ are understood modulo $$d$$. For a filter $$u\in\mathbb R^d$$, define the circular convolution and the shift by

$$
(u*x)_j=\sum_{k=0}^{d-1}u_kx_{j-k},
  \qquad (\tau_sx)_j=x_{j-s}.
$$

A filter has the same weights at every location. Wraparound replaces boundary padding, so the symmetry is exact. We use mathematical convolution; the cross-correlation convention common in software amounts to reversing the filter.

With $$\mathbf1=(1,\ldots,1)$$ and pointwise activation, a two-layer ConvNet with $$n$$ hidden channels is

$$
F_n(x)=\sum_{i=1}^n
    \sigma(u_i*x+b_i\mathbf1)*v_i,
  \qquad u_i,v_i\in\mathbb R^d.
$$

The first layer produces $$n$$ feature signals; the second convolves and sums them into one output signal. The biases are spatially constant, as required by translation symmetry. Filters are allowed to use all $$d$$ positions; there is no pooling or downsampling.

A map $$F:\mathbb R^d\to\mathbb R^d$$ is *translation equivariant* if

$$
F(\tau_sx)=\tau_sF(x)
  \qquad\text{for every }s\in\mathbb Z/d\mathbb Z.
$$

This differs from invariance, which would require the output to stay unchanged. Examples of equivariant maps include pointwise squaring, a nonlinear stencil such as $$F(x)_j=x_jx_{j+1}$$, and the global interaction $$F(x)_j=x_j\sum_k x_k^2$$. All commute with cyclic shifts. Every ConvNet above does too: convolution commutes with shifts, pointwise activation commutes with shifts, and $$\tau_s\mathbf1=\mathbf1$$.

## One output coordinate is enough

For an equivariant $$F$$, define the scalar function $$g(x)=F(x)_0$$. Then

$$
F(x)_j=g(\tau_{-j}x).
$$

To compute the output at position $$j$$, move that position to the origin and evaluate the same scalar rule. Conversely, any scalar function $$g$$ defines an equivariant map by this formula. This is the reason weight sharing retains all the expressive power we need.

<span id="theorem-2"></span>

**Theorem 2 (two-layer ConvNet universality).** Let $$K\subset\mathbb R^d$$ be compact and invariant under cyclic shifts. Let $$F:K\to\mathbb R^d$$ be continuous and translation equivariant. For either activation in Theorem 1 and every $$\varepsilon>0$$, there is a two-layer ConvNet such that

$$
\sup_{x\in K}\|F(x)-F_n(x)\|_\infty<\varepsilon.
$$

In fact, the output filters can all be supported at the origin: $$v_i=a_i\delta_0$$, where $$(\delta_0)_0=1$$ and its other entries vanish. Only the first-layer filters need full spatial support.

<details class="blog-proof">

<summary>

Proof of Theorem 2: lift the scalar MLP by weight sharing

</summary>

<div class="blog-proof-body" markdown="1">

Apply Theorem 1 to $$g(x)=F(x)_0$$, obtaining

$$
g_n(x)=\sum_{i=1}^n a_i\sigma(\langle w_i,x\rangle+b_i),
  \qquad \sup_{x\in K}|g_n(x)-g(x)|<\varepsilon.
$$

Reverse each input weight vector, setting $$(u_i)_k=(w_i)_{-k}$$. A change of index gives

$$
\langle w_i,\tau_{-j}x\rangle
  =\sum_{r=0}^{d-1}(w_i)_r x_{r+j}
  =(u_i*x)_j.
$$

Thus $$F_n(x)_j=g_n(\tau_{-j}x)$$ is exactly the stated ConvNet with $$v_i=a_i\delta_0$$. Since $$\tau_{-j}x\in K$$,

$$
|F_n(x)_j-F(x)_j|
  =|g_n(\tau_{-j}x)-g(\tau_{-j}x)|<\varepsilon
$$

uniformly over both $$x$$ and $$j$$. $$\square$$

</div>

</details>

<p>For a compact set \(K\) that is not shift invariant, replace it by the compact orbit \(K^{\mathrm{orb}}=\bigcup_s\tau_sK\), provided the target is defined and equivariant there. In particular, any globally continuous equivariant map can be approximated on any compact set. Our use of the coordinate maximum norm avoids a dimension factor; a Euclidean error bound follows from \(\|z\|_2\le\sqrt d\|z\|_\infty\).</p>

This is a basic instance of the correspondence developed by Petersen and Voigtlaender, which also transfers approximation rates between fully connected networks and convolutional networks <a href="#ref-petersen">[6]</a>. Group-equivariant approximation has a wider setting, including the work of Yarotsky <a href="#ref-yarotsky">[7]</a>.

## Trading width for depth

A shallow network computes all its features in parallel and then sums them. A deep network can evaluate the same sum sequentially: compute one feature, add its contribution to a running total, and move on to the next. The key is to retain both the original input and the partial sum. This gives an explicit conversion from width to depth, with *no extra approximation error*.

### First, an MLP as an accumulator

For the scalar MLP $$f_n(x)=\sum_{i=1}^n a_i\sigma(\langle w_i,x\rangle+b_i)$$, initialize $$s_0=0$$ and apply

$$
(x,s_{i-1})\longmapsto
  \bigl(x,s_{i-1}+a_i\sigma(\langle w_i,x\rangle+b_i)\bigr).
$$

After $$n$$ residual blocks, $$s_n=f_n(x)$$. Instead of $$n$$ parallel nonlinear units, each block needs only one; the carried state consists of the $$d$$ input coordinates and one scalar accumulator. Thus the state width is $$d+1$$, independent of the desired accuracy, while the number of blocks grows with $$n$$. Keeping the input is essential: the next feature depends on $$x$$, not just on the previous partial sum.

### Then, the same construction with convolution

For a deep ConvNet, a channel is an entire signal in $$\mathbb R^d$$. A general convolutional layer from $$r$$ channels to $$r'$$ channels has the form

$$
z'_a=\sigma\!\left(\sum_{b=1}^{r}W_{ab}*z_b+c_a\mathbf1\right),
  \qquad 1\le a\le r',
$$

where the $$W_{ab}$$ are circular filters. Linear output layers omit $$\sigma$$; a residual block adds its output to a carried state. All these operations are equivariant.

Now keep two signal channels: the original input $$x$$, and an accumulator $$s$$. For the full shallow architecture, including arbitrary output filters $$v_i$$, use the blocks

$$
B_i(x,s)=
  \bigl(x,\ s+\sigma(u_i*x+b_i\mathbf1)*v_i\bigr).
$$

Each residual branch computes one nonlinear feature, convolves it with $$v_i$$, and adds the result to the second channel. The correction to the first channel is zero. There is no activation after the addition, so signed values survive. Filters and biases may differ between blocks: this is a fixed-width construction, not a claim about sharing the same parameters across depth.

<span id="proposition-3"></span>

**Proposition 3 (exact width–depth conversion).** Every width-$$n$$ two-layer ConvNet above is exactly represented by $$n$$ such residual blocks, initialized at $$(x,0)$$, with two persistent channels and one nonlinear feature per residual branch. Consequently, allowing arbitrary depth with this fixed channel budget gives uniform universality as in Theorem 2.

<details class="blog-proof">

<summary>

Proof of Proposition 3: accumulate the shallow network exactly

</summary>

<div class="blog-proof-body" markdown="1">

Induction gives the state after $$k$$ blocks:

$$
(x,s_k),\qquad
  s_k=\sum_{i=1}^k\sigma(u_i*x+b_i\mathbf1)*v_i.
$$

For $$k=n$$, this is exactly $$F_n(x)$$. Choose the shallow approximant supplied by Theorem 2 and replace it by this deep realization; its uniform error is unchanged. $$\square$$

</div>

</details>

### Removing the skip connections

For ReLU, skip connections are convenient but not essential. A standard feedforward ConvNet with at most five hidden channels can perform the same computation. The trick is to store a signed quantity as the difference of its positive and negative parts: both parts pass through ReLU unchanged.

<details class="blog-proof">

<summary>

A five-channel ReLU realization without skip connections

</summary>

<div class="blog-proof-body" markdown="1">

Store positive and negative parts $$x^+,x^-,s^+,s^-$$, so that $$x=x^+-x^-$$ and $$s=s^+-s^-$$. All four channels are nonnegative and therefore pass unchanged through a ReLU identity channel, implemented with the filter $$\delta_0$$.

One layer carries these four channels and computes the fifth:

$$
h=\bigl(u_i*(x^+-x^-)+b_i\mathbf1\bigr)_+.
$$

The next layer carries $$x^+,x^-$$ and replaces the accumulator channels by

$$
\widetilde s^+=(s^+-s^-+v_i*h)_+,
  \qquad
  \widetilde s^-=(-s^++s^--v_i*h)_+.
$$

Their difference is exactly $$s+v_i*h$$. One initial layer creates $$x^+=(x)_+$$, $$x^-=(-x)_+$$, and $$s^+=s^-=0$$. Repeat this pair of layers for each of the $$n$$ terms, then use a linear readout $$s^+-s^-$$. This gives $$2n+1$$ ReLU hidden layers, each with at most five channels, followed by the final linear layer. Every operation is a convolutional layer of the form defined above. $$\square$$

</div>

</details>

The counts for these explicit realizations are:

<div class="blog-equation-scroll" role="region" aria-label="Width and depth comparison" tabindex="0">
<table>
  <caption>Three ways to evaluate the same shallow ReLU ConvNet</caption>
  <thead><tr><th scope="col">Architecture</th><th scope="col">Channel budget</th><th scope="col">Depth</th></tr></thead>
  <tbody>
    <tr><th scope="row">Shallow</th><td>\(n\) hidden channels</td><td>One hidden layer</td></tr>
    <tr><th scope="row">Residual</th><td>Two state channels; one feature per branch</td><td>\(n\) blocks, each with two convolutional stages</td></tr>
    <tr><th scope="row">Plain feedforward</th><td>At most five hidden channels</td><td>\(2n+1\) hidden layers</td></tr>
  </tbody>
</table>
</div>

The final linear readout is not counted as a hidden layer. These are sufficient widths, not optimal-width claims. The channel bounds for the two deep constructions are independent of the approximation tolerance and of $$d$$; each channel still contains $$d$$ spatial values. The conversion retains full-support filters and does not reduce the order of the parameter count. It exchanges parallel computation for sequential computation, without asserting that training the resulting deep network will be easier.

## What about small filters?

Our short proofs allow filters with full circular support. Width counts channels, not spatial positions or filter coefficients. With small filters and fixed depth, the receptive field may exclude part of the input; such a network cannot approximate every equivariant map. For instance, changing a coordinate outside that receptive field leaves its output at the origin unchanged, whereas the target $$F(x)_j=\sum_k x_k$$ changes.

Growing depth can overcome this locality constraint. Li, Lin, and Shen prove universality for deep fully convolutional ReLU networks with small kernels and constant channel width, including residual architectures and nonresidual variants <a href="#ref-li">[8]</a>. In their architecture, one intermediate feature channel per residual block suffices, and two suffice without residual connections, with kernel size at least two. Their approximation statements use $$L^p$$ norms, $$1\le p<\infty$$, with respect to Lebesgue measure on compact sets. They should not be read as uniform-norm versions of the same minimal-width claims.

So the depth–width tradeoff is well established. The particularly short argument here proves a precise uniform statement with full-support filters: sharing an MLP across positions gives a shallow ConvNet, and serializing its sum gives a deep one.

## References

<ol class="references">
  <li id="ref-cybenko">George Cybenko. <a href="https://doi.org/10.1007/BF02551274"><em>Approximation by superpositions of a sigmoidal function</em></a>. Mathematics of Control, Signals and Systems 2, 303–314, 1989.</li>
  <li id="ref-hornik1989">Kurt Hornik, Maxwell Stinchcombe, and Halbert White. <a href="https://doi.org/10.1016/0893-6080(89)90020-8"><em>Multilayer feedforward networks are universal approximators</em></a>. Neural Networks 2(5), 359–366, 1989.</li>
  <li id="ref-hornik1991">Kurt Hornik. <a href="https://doi.org/10.1016/0893-6080(91)90009-T"><em>Approximation capabilities of multilayer feedforward networks</em></a>. Neural Networks 4(2), 251–257, 1991.</li>
  <li id="ref-leshno">Moshe Leshno, Vladimir Ya. Lin, Allan Pinkus, and Shimon Schocken. <a href="https://doi.org/10.1016/S0893-6080(05)80131-5"><em>Multilayer feedforward networks with a nonpolynomial activation function can approximate any function</em></a>. Neural Networks 6(6), 861–867, 1993.</li>
  <li id="ref-stone">Marshall H. Stone. <a href="https://doi.org/10.2307/3029750"><em>The generalized Weierstrass approximation theorem</em></a>. Mathematics Magazine 21(4), 167–184, and 21(5), 237–254, 1948.</li>
  <li id="ref-petersen">Philipp Petersen and Felix Voigtlaender. <a href="https://arxiv.org/abs/1809.00973"><em>Equivalence of approximation by convolutional neural networks and fully-connected networks</em></a>. <a href="https://doi.org/10.1090/proc/14789">Proceedings of the American Mathematical Society</a> 148, 1567–1581, 2020.</li>
  <li id="ref-yarotsky">Dmitry Yarotsky. <a href="https://arxiv.org/abs/1804.10306"><em>Universal approximations of invariant maps by neural networks</em></a>. Constructive Approximation 55, 407–474, 2022.</li>
  <li id="ref-li">Qianxiao Li, Ting Lin, and Zuowei Shen. <a href="https://doi.org/10.1137/23M1570119"><em>On the Universal Approximation Property of Deep Fully Convolutional Neural Networks</em></a>. SIAM Journal on Mathematical Analysis 57(5), 5275–5302, 2025. <a href="https://arxiv.org/abs/2211.14047">Preprint</a>.</li>
</ol>
