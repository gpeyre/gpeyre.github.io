---
title: "The hump algebra of Yves Meyer"
subtitle: "A Gaussian identity becomes a space of functions, with a norm that counts bumps across scales."
description: "Multiplying two Gaussian bumps gives a smaller Gaussian bump. Yves Meyer's hump algebra turns this identity into a Banach algebra, with a scale-invariant atomic norm and an equivalent Besov norm."
date: "2026-10-30"
topic: "Gaussians and harmonic analysis"
keywords: ["Yves Meyer","hump algebra","bump algebra","algèbre des bosses","Gaussian mixtures","Gaussian bumps","product of Gaussians","completing the square","isotropic Gaussian","atomic norm","absolute summability","Banach algebra","Banach space","completion","quotient norm","homogeneous Besov space","critical regularity","finite differences","wavelet coefficients","multiscale analysis","dilation invariance","translation invariance","functions vanishing at infinity","radial basis functions","RBF networks","sparse approximation","Lorenzo Brandolese","Hans Feichtinger","David Donoho","niveau de fonction","mélanges gaussiens"]
proofs: true
embedded_experiment: true
---

Gaussian bumps are useful building blocks for signals and images: each has a location, a width, and an amplitude. Adding them creates complicated shapes. Multiplying them does something equally pleasant: two Gaussian bumps give another Gaussian bump, with a smaller width and an amplitude measuring their overlap.

<p>Yves Meyer took this elementary observation seriously. Allow absolutely summable superpositions of translated and rescaled Gaussians, and measure a function by the least total amplitude needed to represent it. The resulting <em>hump algebra</em>, or <em>algèbre des bosses</em>, is a Banach algebra. Its connection to Besov spaces reveals that this apparently geometric description is also a precise measure of regularity across scales <a href="#ref-meyer">[1]</a>.</p>

<!--more-->

<figure class="portrait-figure">
  <img src="{{ '/blog/preparations/assets/hump-algebra/yves-meyer.jpg' | relative_url }}" alt="Yves Meyer at the Conservatoire national des arts et métiers in 2000" width="863" height="745" loading="lazy" decoding="async">
  <figcaption>Yves Meyer, 2000. Photograph: <a href="https://commons.wikimedia.org/wiki/File:Yves_Meyer_(Conservatoire_National_des_Arts_et_M%C3%A9tiers)_-_Philippe_Binant_Archives.jpg">Philippe Binant</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Meyer develops the hump algebra in Chapter VI, §6 of <em>Wavelets and Operators</em>.</figcaption>
</figure>

## Multiply two humps

For a center $$a\in\mathbb R^d$$ and a scalar width $$s>0$$, write

$$
g_{a,s}(x)=\exp\!\left(-\frac{|x-a|^2}{2s^2}\right).
$$

These Gaussians have *peak height one*, not integral one. This convention is essential: a narrow hump and a broad hump have the same amplitude. We use isotropic Gaussians, with a single scale in every direction.

<span id="proposition-1"></span>

**Proposition 1 (Gaussian product formula).** For any two humps,

$$
g_{a,s}\,g_{b,t}=\kappa\,g_{m,r},
$$

where

$$
r^2=\frac{s^2t^2}{s^2+t^2},\qquad
  m=\frac{t^2a+s^2b}{s^2+t^2},\qquad
  \kappa=\exp\!\left(-\frac{|a-b|^2}{2(s^2+t^2)}\right).
$$

The center is a precision-weighted average, the new width is smaller than either original width, and $$0<\kappa\le1$$. If the centers coincide, the height stays one. If they are far apart relative to their widths, the product is small.

<details class="blog-proof">

<summary>Proof: complete the square</summary>

<div class="blog-proof-body" markdown="1">

Expand the squares to check

$$
\frac{|x-a|^2}{s^2}+\frac{|x-b|^2}{t^2}
  =\frac{|x-m|^2}{r^2}+\frac{|a-b|^2}{s^2+t^2}.
$$

Multiplying by $$-1/2$$ and exponentiating gives the result. $$\square$$

</div>

</details>

Consequently, the product of two finite Gaussian sums is again a finite Gaussian sum:

$$
f=\sum_{i=1}^n\alpha_i g_{a_i,s_i},\qquad
  h=\sum_{j=1}^m\beta_j g_{b_j,t_j}
$$

$$
\Longrightarrow\quad
  fh=\sum_{i=1}^n\sum_{j=1}^m
       \alpha_i\beta_j\kappa_{ij}g_{m_{ij},r_{ij}}.
$$

There are at most $$nm$$ resulting humps, and their total absolute coefficient size satisfies

$$
\sum_{i,j}|\alpha_i\beta_j|\kappa_{ij}
  \le\left(\sum_i|\alpha_i|\right)
       \left(\sum_j|\beta_j|\right).
$$

This inequality is the seed of the Banach-algebra norm.

<aside class="note"><p><strong>Mixtures versus an algebra.</strong> Positive coefficients give nonnegative mixtures. To obtain a vector space, we must also allow negative coefficients. If one instead uses probability-density Gaussians and weights summing to one, a product needs a further normalization to become a probability density. Here we study ordinary pointwise products of functions, without renormalizing them.</p></aside>

## From finite mixtures to the hump algebra

Let $$C_0(\mathbb R^d)$$ denote the continuous functions tending to zero at infinity. The *hump algebra* $$\mathcal H$$ consists of all functions that admit a representation

$$
f=\sum_{j=1}^{\infty}c_jg_{a_j,s_j},
  \qquad \sum_{j=1}^{\infty}|c_j|<\infty.
$$

<p>The coefficients are real, the centers are arbitrary, and every \(s_j\) is positive. Since \(\|g_{a,s}\|_\infty=1\), the series converges absolutely and uniformly. In particular, every such \(f\) belongs to \(C_0\).</p>

The associated *atomic norm* is

$$
\|f\|_{\mathcal H}
  =\inf\left\{\sum_{j=1}^{\infty}|c_j|:
       f=\sum_{j=1}^{\infty}c_jg_{a_j,s_j}\right\}.
$$

The infimum runs over *all* absolutely summable representations, including when $$f$$ happens to be a finite mixture. A particular list of coefficients gives an upper bound, not necessarily the norm. This formulation is Meyer's hump algebra; a general treatment of such atomic spaces is given by Feichtinger and Zimmermann <a href="#ref-feichtinger">[2]</a>.

<span id="theorem-2"></span>

**Theorem 2 (a Banach algebra of humps).** The space $$\mathcal H$$, equipped with this norm, is complete, and

$$
\|f\|_\infty\le\|f\|_{\mathcal H},\qquad
  \|fh\|_{\mathcal H}\le\|f\|_{\mathcal H}\|h\|_{\mathcal H}.
$$

Finite Gaussian sums are dense in $$\mathcal H$$ for its own norm. Thus $$\mathcal H$$ is their completion under the norm just defined. Each individual hump has norm exactly one.

<details class="blog-proof">

<summary>Proof: an absolutely summable dictionary and the Gaussian product formula</summary>

<div class="blog-proof-body" markdown="1">

*The norm and completeness.* Let $$A=\mathbb R^d\times(0,\infty)$$ index the humps. The space $$\ell^1(A)$$ consists of absolutely summable coefficient families; each has at most countably many nonzero entries. The synthesis map

$$
S:\ell^1(A)\longrightarrow C_0(\mathbb R^d),
  \qquad Sc=\sum_{(a,s)\in A}c_{a,s}g_{a,s}
$$

<p>is bounded because \(\|Sc\|_\infty\le\|c\|_1\). Its kernel is therefore closed. The quotient Banach space \(\ell^1(A)/\ker S\) identifies with \(\mathcal H\), and its quotient norm is precisely the infimum above. This proves completeness and the first inequality. The triangle inequality also follows directly by concatenating representations.</p>

*Density of finite sums.* For any representation of $$f$$, its partial sums satisfy

$$
\left\|f-\sum_{j=1}^Nc_jg_{a_j,s_j}\right\|_{\mathcal H}
  \le\sum_{j>N}|c_j|\longrightarrow0.
$$

*Multiplication.* Multiply two absolutely summable representations. The double series converges absolutely and uniformly, and Proposition 1 replaces each product of atoms by a single atom with coefficient at most one in absolute value. Therefore

$$
\|fh\|_{\mathcal H}
  \le\left(\sum_i|c_i|\right)\left(\sum_j|d_j|\right).
$$

<p>Take the infimum separately over the two representations. Finally, \(\|g_{a,s}\|_{\mathcal H}\le1\) from its one-term representation and \(\|g_{a,s}\|_{\mathcal H}\ge\|g_{a,s}\|_\infty=1\). \(\square\)</p>

</div>

</details>

Translations and dilations act isometrically:

$$
\left\|f\!\left(\frac{\,\cdot-a\,}{s}\right)\right\|_{\mathcal H}
  =\|f\|_{\mathcal H}.
$$

<p>Indeed, they simply relabel the Gaussian atoms; applying the inverse transformation gives equality. The algebra has no identity, since the constant function one does not vanish at infinity. If desired, one can adjoin constants with the norm \(\|c+f\|=|c|+\|f\|_{\mathcal H}\).</p>

This completion is not the uniform closure of finite mixtures. That closure is all of $$C_0$$, by the locally compact version of Stone–Weierstrass: Gaussian sums form an algebra, separate points, and vanish nowhere simultaneously. The hump norm imposes extra control on how much amplitude is distributed across locations and scales. It is also important not to restrict its infimum to finite exact representations and then complete: that is a different construction.

## An explicit norm: differences across scales

Meyer's striking identification is that $$\mathcal H$$ is the homogeneous Besov space $$\dot B^d_{1,1}(\mathbb R^d)$$, realized as functions in $$C_0$$ <a href="#ref-meyer">[1]</a>, <a href="#ref-brandolese">[3]</a>. The superscript $$d$$ is the smoothness index; the two subscripts mean summation in space and over scales. This is the critical index at which dilation preserves the norm.

There is an explicit version involving only differences of function values. Define $$\Delta_hf(x)=f(x+h)-f(x)$$, and choose an integer $$q>d$$, for instance $$q=d+1$$. Set

$$
N_q(f)=\int_{\mathbb R^d}
       \frac{\|\Delta_h^q f\|_{L^1(\mathbb R^d)}}{|h|^{2d}}\,dh,
$$

where the repeated difference is

$$
\Delta_h^q f(x)
  =\sum_{\ell=0}^{q}(-1)^{q-\ell}\binom q\ell f(x+\ell h).
$$

<span id="theorem-3"></span>

**Theorem 3 (Besov characterization).** For $$f\in C_0(\mathbb R^d)$$, membership in $$\mathcal H$$ is equivalent to $$N_q(f)<\infty$$. There are constants depending only on $$d,q$$ such that

$$
c_{d,q}N_q(f)\le\|f\|_{\mathcal H}
  \le C_{d,q}N_q(f).
$$

This combines Meyer's Gaussian atomic characterization with the standard finite-difference characterization of homogeneous Besov spaces <a href="#ref-triebel">[4]</a>. The condition $$f\in C_0$$ selects an actual function: a homogeneous Besov seminorm otherwise leaves a polynomial ambiguity. No $$L^1$$ term is added to the norm.

In one dimension, take $$q=2$$. A change of variable in the inner integral gives the particularly concrete formula

$$
N_2(f)=\int_{\mathbb R}\int_{\mathbb R}
    \frac{|f(x+h)-2f(x)+f(x-h)|}{|h|^2}\,dx\,dh.
$$

<p>At a given separation \(h\), the numerator measures how far the function is from being affine. The integral sums this departure over all locations and all scales. In two dimensions, use third differences and the weight \(|h|^{-4}\).</p>

<details class="blog-proof">

<summary>Why this norm is plausible, and where the deeper theorem enters</summary>

<div class="blog-proof-body" markdown="1">

<p><em>Dilation fixes the exponent.</em> If \(f_s(x)=f(x/s)\), then \(\|\Delta_h^q f_s\|_1=s^d\|\Delta_{h/s}^q f\|_1\). Changing variables \(h=su\) contributes another \(s^d\), exactly cancelled by \(|h|^{2d}\). Thus \(N_q(f_s)=N_q(f)\), as for the hump norm.</p>
<p><em>One inequality is elementary.</em> Write \(G(x)=e^{-|x|^2/2}\). Repeated integration of directional derivatives, and the triangle inequality for large shifts, give</p>

$$
\|\Delta_h^qG\|_1\le C\min(|h|^q,1).
$$

In polar coordinates, the integrals defining $$N_q(G)$$ are bounded by constants times

$$
\int_0^1 r^{q-d-1}\,dr
  +\int_1^\infty r^{-d-1}\,dr<\infty.
$$

<p>This explains the requirement \(q&gt;d\). Translation and dilation invariance give the same bound for every Gaussian atom. The triangle inequality and Fatou's lemma then yield \(N_q(f)\le C\|f\|_{\mathcal H}\).</p>

*The reverse inequality uses atomic decomposition.* It asserts that finite multiscale variation can be reorganized into a Gaussian series with controlled total coefficients. This is the substantive part of Meyer's characterization; it is not a consequence of the product formula alone. We invoke that theorem rather than reproduce its wavelet decomposition argument here. Brandolese's discussion explicitly recalls the identification in arbitrary dimension <a href="#ref-brandolese">[3]</a>.

</div>

</details>

<details class="blog-proof">

<summary>A wavelet formula for the same norm</summary>

<div class="blog-proof-body" markdown="1">

Choose a Schwartz Meyer orthonormal wavelet basis, with finitely many mother wavelets $$\psi^e$$, and write

$$
\psi^e_{j,k}(x)=2^{jd/2}\psi^e(2^jx-k),
  \qquad j\in\mathbb Z,\quad k\in\mathbb Z^d.
$$

Then another equivalent norm is

$$
\|f\|_{\mathcal H}\asymp
  \sum_e\sum_{j\in\mathbb Z}\sum_{k\in\mathbb Z^d}
  2^{jd/2}|\langle f,\psi^e_{j,k}\rangle|.
$$

The bracket is the integral pairing. The extra $$2^{jd/2}$$ converts an $$L^2$$-normalized coefficient into the amplitude of its wavelet. Summability therefore measures total amplitude over positions and scales, just as the Gaussian norm does. The scales run over *all* integers: this is the homogeneous space. The one-dimensional version is discussed explicitly in the signal-compression survey of Donoho, Vetterli, DeVore, and Daubechies <a href="#ref-donoho">[5]</a>.

</div>

</details>

The equivalent Besov norms need not have multiplication constant exactly one. The atomic norm does, directly from $$\kappa\le1$$. Also, unrestricted anisotropic Gaussian atoms would define a different dictionary: closure under multiplication survives, but the isotropic Besov identification above should not be transferred to that larger space without further analysis.

## Numerical experimentation

Move the two families of humps and watch their product. Each input has $$n$$ positive humps with coefficients summing to one, while the product is evaluated both pointwise and through its exact $$n^2$$-term Gaussian expansion. The displayed discrepancy checks the identity numerically; it is not an approximation error from fitting a new mixture.

<iframe class="idea-experiment" data-experiment="hump-algebra" src="{{ '/blog/preparations/assets/hump-algebra/index.html' | relative_url }}" title="Two moving Gaussian mixtures and their exact product" loading="lazy" style="height:1000px"></iframe>
<p class="blog-figure-caption">The three panels share the same spatial coordinates. By default, each panel uses its own explicitly labelled colour range to make the product's smaller features visible; switch to the common scale to compare amplitudes directly. Contours and colours are sampled on a finite grid, but the functions and product parameters use the exact formulas above. Playback starts paused. The displayed coefficients give norm upper bounds, not a computation of the optimal atomic norm.</p>

## References

<ol class="references">
  <li id="ref-meyer">Yves Meyer. <a href="https://doi.org/10.1017/CBO9780511623820"><em>Wavelets and Operators</em></a>. Cambridge Studies in Advanced Mathematics 37, Cambridge University Press, 1992; translated by D. H. Salinger from <em>Ondelettes et opérateurs I: Ondelettes</em>, Hermann, 1990. Chapter VI, §6, “The hump algebra,” pp. 189–191, and §10, “Wavelets and Besov spaces.”</li>
  <li id="ref-feichtinger">Hans G. Feichtinger and Georg Zimmermann. <a href="https://doi.org/10.1002/1522-2616(200206)239:1%3C42::AID-MANA42%3E3.0.CO;2-%23"><em>An Exotic Minimal Banach Space of Functions</em></a>. Mathematische Nachrichten 239–240, 42–61, 2002.</li>
  <li id="ref-brandolese">Lorenzo Brandolese. <a href="https://doi.org/10.1090/S0002-9939-05-07893-7"><em>Poisson kernels and sparse wavelet expansions</em></a>. Proceedings of the American Mathematical Society 133(11), 3345–3353, 2005.</li>
  <li id="ref-triebel">Hans Triebel. <a href="https://doi.org/10.1007/978-3-0346-0416-1"><em>Theory of Function Spaces</em></a>. Monographs in Mathematics 78, Birkhäuser, 1983.</li>
  <li id="ref-donoho">David L. Donoho, Martin Vetterli, Ronald A. DeVore, and Ingrid Daubechies. <a href="https://doi.org/10.1109/18.720544"><em>Data Compression and Harmonic Analysis</em></a>. IEEE Transactions on Information Theory 44(6), 2435–2476, 1998.</li>
</ol>
