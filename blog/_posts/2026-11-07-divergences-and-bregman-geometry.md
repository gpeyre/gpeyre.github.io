---
title: "Why KL belongs to two divergence families"
subtitle: "A characterization of KL among f-divergences and Bregman divergences."
description: "Definitions and examples of phi-divergences and Bregman divergences, with a short measure-level proof that their smooth overlap is precisely scaled Kullback–Leibler divergence."
date: "2026-11-07"
topic: "Information geometry and convexity"
keywords:
  - "Kullback–Leibler divergence"
  - "KL divergence"
  - "relative entropy"
  - "Bregman divergence"
  - "f-divergence"
  - "phi-divergence"
  - "density ratios"
  - "convex tangent planes"
  - "first variation"
  - "entropy Hessian"
  - "Fisher information metric"
  - "divergence characterization"
  - "rigidity theorem"
  - "Pearson chi-square divergence"
  - "Hellinger distance"
  - "squared density error"
  - "separable generators"
  - "nonseparable functionals"
  - "singular measures"
  - "Lebesgue decomposition"
  - "probability simplex"
  - "multiplicative weights"
  - "exponential reweighting"
  - "Solomon Kullback"
  - "Richard Leibler"
  - "Lev Bregman"
  - "Imre Csiszár"
  - "Ronald Fisher"
  - "Cressie–Read power divergence"
  - "normalized convex generator"
  - "simplex level sets"
  - "Jiantao Jiao"
  - "Thomas Courtade"
  - "Gabriel Peyré"
  - "divergence de Bregman"
  - "entropie relative"
  - "géométrie de l'information"
  - "rapport de densités"
proofs: true
embedded_experiment: true
---

<p>A discrepancy between probability distributions can be built in two quite different ways. We can compare their density ratio at each point. Or we can measure how far a convex functional lies above its tangent plane. The first construction comes from statistical information; the second comes from convex geometry and optimization.</p>
<p>Kullback–Leibler divergence belongs to both families. This is more than a convenient coincidence: under natural smoothness assumptions, it is the <em>only</em> common member, up to scale. A short proof reveals why entropy appears so often when probability models meet convex optimization.</p>
<p>The finite-alphabet characterization is Theorem 5 of Jiao, Courtade, No, Venkat, and Weissman <a href="#ref-jiao">[1]</a>. The measure-level formulation below follows <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.8.8.34">Proposition 8.34 of <em>Optimal Transport for Machine Learners</em></a> <a href="#ref-book">[2]</a>. We start with the two definitions, because similar-looking quadratic formulas can disguise genuinely different geometries.</p>

<!--more-->

<figure class="portrait-pair">
<div class="portrait-pair-images">
<div><img src="{{ '/blog/preparations/assets/imre-csiszar.jpg' | relative_url }}" alt="Imre Csiszár in 1976" width="274" height="400" loading="lazy"><p>Imre Csiszár</p></div>
<div><img src="{{ '/blog/preparations/assets/divergence-simplex/ronald-fisher-1913.jpg' | relative_url }}" alt="Ronald Fisher in 1913" width="291" height="408" loading="lazy"><p>Ronald Fisher</p></div>
</div>
<figcaption>Csiszár developed the density-ratio viewpoint <a href="#ref-csiszar">[5]</a>; Fisher’s information is the local quadratic geometry shared by the smooth divergences below <a href="#ref-fisher">[6]</a>. Left: Konrad Jacobs, MFO, 1976, <a href="https://commons.wikimedia.org/wiki/File:ImreCsiszar1976.jpg">source</a>, <a href="https://creativecommons.org/licenses/by-sa/2.0/de/deed.en">CC BY-SA 2.0 Germany</a>, unmodified. Right: anonymous 1913 photograph, University of Adelaide archive via <a href="https://commons.wikimedia.org/wiki/File:Youngronaldfisher2.JPG">Wikimedia Commons</a>, public domain.</figcaption>
</figure>

## Definition of f-divergences {#first-construction-compare-density-ratios}

<p>Let \(\alpha=p\,\omega\) and \(\beta=q\,\omega\) be probability measures with positive densities relative to a finite reference measure \(\omega\). For a convex function \(\phi:(0,\infty)\to\mathbb R\) satisfying \(\phi(1)=0\), define the <em>\(\phi\)-divergence</em>, also called an \(f\)-divergence, by</p>

$$
D_\phi(\alpha\mid\beta)
 =\int q(x)\phi\!\left(\frac{p(x)}{q(x)}\right)\,d\omega(x).
$$

<p>This depends only on \(\alpha,\beta\), not on the choice of dominating measure. Jensen's inequality under \(\beta\) gives \(D_\phi\ge\phi(\int p\,d\omega)=0\). If \(\phi\) is strictly convex, equality holds only for equal measures.</p>
<p>Three standard examples are</p>

$$
\begin{array}{c|c}
 \phi(r)&D_\phi(\alpha\mid\beta)\\ \hline
 r\log r-r+1 & \displaystyle\int p\log(p/q)\,d\omega\\[3pt]
 (r-1)^2/2 & \displaystyle\frac12\int\frac{(p-q)^2}{q}\,d\omega\\[3pt]
 (\sqrt r-1)^2 & \displaystyle\int(\sqrt p-\sqrt q)^2\,d\omega .
 \end{array}
$$

<p>These are KL, half the Pearson \(\chi^2\) divergence, and squared Hellinger distance with the displayed normalization. For probabilities, the linear terms in the KL generator integrate to zero. More generally, replacing \(\phi(r)\) by \(\phi(r)+a(r-1)\) leaves the divergence unchanged.</p>

### The power-divergence family {#one-family-several-geometries}

<p>To compare shapes rather than arbitrary linear terms, normalize the generators by \(\phi(1)=\phi'(1)=0\). For the pictures, also fix \(\phi''(1)=1\). A convenient power-divergence family is <a href="#ref-cressie-read">[7]</a></p>

$$
\phi_\lambda(r)=
 \begin{cases}
 \displaystyle\frac{r^\lambda-1-\lambda(r-1)}{\lambda(\lambda-1)},&\lambda\notin\{0,1\},\\[5pt]
 -\log r+r-1,&\lambda=0,\\[2pt]
 r\log r-r+1,&\lambda=1.
 \end{cases}
$$

<p>The cases \(0\) and \(1\) are the continuous limits in the parameter. Since \(\phi_\lambda''(r)=r^{\lambda-2}&gt;0\), every member is strictly convex. For \(\lambda=0,\frac12,1,2\), the corresponding divergences are reverse KL, <em>twice</em> the squared Hellinger distance displayed above, KL, and half Pearson \(\chi^2\). Our parameter is one larger than the parameter in Cressie–Read’s original convention.</p>
<figure>
<img src="{{ '/blog/preparations/assets/divergence-simplex/generators.svg' | relative_url }}" width="960" height="430" alt="Curves of the normalized convex generators for reverse KL, twice squared Hellinger, KL and half Pearson chi-square; all touch zero at one with the same curvature" loading="lazy">
<figcaption>The generators have the same value, slope, and curvature at one. Their differences away from one encode different penalties for density ratios. All curves are evaluated from the displayed formulas.</figcaption>
</figure>

<details class="blog-proof">

<summary>Definition at zero densities and for singular measures</summary>

<div class="blog-proof-body" markdown="1">

<p>Write the Lebesgue decomposition \(\alpha=f\,\beta+\alpha^\perp\), with \(\alpha^\perp\) singular relative to \(\beta\). The lower-semicontinuous extension is</p>

$$
D_\phi(\alpha\mid\beta)
 =\int\phi(f)\,d\beta+\phi'_\infty\,\alpha^\perp(E),
 \qquad
 \phi'_\infty=\lim_{r\to\infty}\frac{\phi(r)}r.
$$

<p>At \(f=0\), use \(\phi(0)=\lim_{r\downarrow0}\phi(r)\), possibly infinite, and use \(0\cdot\infty=0\) for a vanishing singular mass. For KL, \(\phi'_\infty=+\infty\): any nonzero part of \(\alpha\) singular with respect to \(\beta\) gives infinite divergence, even if their topological supports overlap. The smooth theorem below stays inside strictly positive bounded densities, where no such convention is needed.</p>

</div>

</details>

## Definition of Bregman divergences {#second-construction-subtract-a-tangent-plane}

<p>Let \(\Phi\) be a differentiable convex functional on a convex set of densities. Its <em>Bregman divergence</em> is</p>

$$
B_\Phi(\alpha\mid\beta)
 =\Phi(\alpha)-\Phi(\beta)
  -\int\delta\Phi(\beta)\,d(\alpha-\beta).
$$

<p>The first variation \(\delta\Phi(\beta)\) describes the tangent plane at \(\beta\); convexity makes the remainder nonnegative. On probability measures, the first variation is defined only up to an additive constant, which disappears because \(\alpha-\beta\) has total mass zero. This construction goes back to Bregman <a href="#ref-bregman">[3]</a>.</p>
<p>For a separable functional \(\Phi(p\,\omega)=\int F(p)\,d\omega\),</p>

$$
B_\Phi(\alpha\mid\beta)
 =\int\bigl[F(p)-F(q)-F'(q)(p-q)\bigr]\,d\omega.
$$

<p>Choosing \(F(r)=r^2/2\) gives \(\frac12\int(p-q)^2\,d\omega\). Notice the missing factor \(1/q\): this is squared \(L^2(\omega)\) error, not Pearson divergence. It changes if the reference measure changes while the formula for \(F\) is held fixed.</p>
<p>Choosing \(F(r)=r\log r-r\) instead gives</p>

$$
F(p)-F(q)-F'(q)(p-q)
 =p\log(p/q)-p+q.
$$

<p>After integration over probabilities, this is KL. This is the first meeting of the two constructions, historically introduced in information theory by Kullback and Leibler <a href="#ref-kl">[4]</a>.</p>
<p>Bregman generators need not be pointwise integrals. For a bounded feature map \(\psi:E\to\mathbb R^k\), the nonlocal functional</p>

$$
\Phi(\alpha)=\frac12\left|\int\psi\,d\alpha\right|^2
$$

<p>has divergence \(\frac12|\int\psi\,d\alpha-\int\psi\,d\beta|^2\). It can vanish for different measures with the same features. “Divergence” therefore does not automatically mean a metric, or even a discrepancy separating every pair of laws.</p>

## Characterization of the common divergence {#a-short-rigidity-theorem}

<p>For a precise domain, normalize the finite reference measure so that \(\omega(E)=1\), and assume it has a measurable set \(A\) with \(0&lt;\omega(A)&lt;1\). Let \(\mathcal D\) be all probability densities bounded above and bounded away from zero; the bounds may depend on the density.</p>
<p id="theorem-1"><strong>Theorem 1 (the smooth intersection is KL).</strong> Suppose \(\phi\in C^2(0,\infty)\) is convex with \(\phi(1)=0\), and \(\Phi\) is convex and twice differentiable along bounded zero-mass density directions. If</p>

$$
B_\Phi(p\,\omega\mid q\,\omega)
 =D_\phi(p\,\omega\mid q\,\omega)
 \quad\text{for all }p,q\in\mathcal D,
$$

<p>then, for some \(\kappa\ge0\),</p>

$$
B_\Phi=D_\phi=\kappa\,\mathrm{KL}.
$$

<p>More precisely, \(\phi(r)=\kappa r\log r+a(r-1)\), and \(\Phi\) differs from \(\kappa\int p\log p\,d\omega\) by an affine functional on \(\mathcal D\).</p>

<details class="blog-proof">

<summary>Proof: the local Hessian determines the global Bregman divergence</summary>

<div class="blog-proof-body" markdown="1">

<p><em>Step 1: compare second derivatives at equal densities.</em> Fix \(q\in\mathcal D\) and a bounded \(h\) with \(\int h\,d\omega=0\). For sufficiently small \(t\), \(q+th\in\mathcal D\). Differentiate the asserted equality twice at \(t=0\):</p>

$$
D^2\Phi(q)[h,h]
 =\phi''(1)\int\frac{h^2}{q}\,d\omega.
$$

<p>Set \(\kappa=\phi''(1)\ge0\). The right-hand side is exactly the second derivative of \(\kappa\operatorname{Ent}(q)=\kappa\int q\log q\,d\omega\). Thus \(\Psi=\Phi-\kappa\operatorname{Ent}\) has zero second derivative along every segment in \(\mathcal D\).</p>
<p>Consequently \(\Psi\) is affine on each such segment, so its tangent-plane remainder is zero. Therefore \(B_\Phi=\kappa B_{\operatorname{Ent}}=\kappa\mathrm{KL}\) for all pairs—not just infinitesimally close pairs.</p>
<p><em>Step 2: recover the scalar generator.</em> Put \(\psi(s)=\phi(s)-\kappa s\log s\). We now know that \(\int q\,\psi(p/q)\,d\omega=0\) for every pair.</p>

<details class="blog-proof">

<summary>Two-value lemma: a zero probability divergence is linear</summary>

<div class="blog-proof-body" markdown="1">

<p>Choose any \(0&lt;x&lt;1&lt;y\), and set</p>

$$
w=\frac{y-1}{y-x},\qquad 1-w=\frac{1-x}{y-x}.
$$

<p>Choose \(q\) constant on \(A\) and \(A^c\), with \(\beta(A)=w\). Set \(p=xq\) on \(A\) and \(p=yq\) on \(A^c\). Both are strictly positive bounded probability densities because \(wx+(1-w)y=1\). The zero divergence yields</p>

$$
(y-1)\psi(x)+(1-x)\psi(y)=0,
$$

<p>hence \(\psi(x)/(x-1)=\psi(y)/(y-1)\). Varying \(x\) and \(y\) shows this ratio has the same constant value on both sides of one. Since \(\psi(1)=0\), \(\psi(s)=a(s-1)\) everywhere.</p>

</div>

</details>

<p>This proves the scalar formula and completes the characterization. \(\square\)</p>

</div>

</details>

<p>The two-point construction explains the minimal assumption on the reference space: it must distinguish at least two events. On a one-point probability space every divergence is zero, so no generator can be identified.</p>
<p>The theorem also allows nonseparable \(\Phi\). It does not assume in advance that the Bregman generator is an integral of a scalar function. Its Hessian is forced to be that of entropy simply by matching the density-ratio divergence at every base density.</p>
<p>Local agreement alone is much weaker. Every smooth \(\phi\)-divergence has, for a bounded zero-mass perturbation \(h\), the expansion</p>

$$
D_\phi((q+th)\omega\mid q\omega)
 =\frac{\phi''(1)t^2}{2}
       \int\frac{h^2}{q}\,d\omega+o(t^2).
$$

<p>This common quadratic form is the Fisher information metric; it does not make Hellinger or Pearson divergence equal to KL. Rigidity comes from requiring one Bregman generator to realize the divergence for <em>all pairs</em>. Its Hessian at every base point then determines its tangent-plane remainders globally. If the divergence separates distinct laws, the scale in Theorem 1 must satisfy \(\kappa&gt;0\); \(\kappa=0\) gives the identically zero divergence.</p>

## KL regularization and multiplicative updates {#why-this-matters-for-algorithms}

<p>The derivative of entropy is logarithmic. On a finite probability simplex, minimizing a linear cost regularized by KL gives an explicit multiplicative step:</p>

$$
\begin{aligned}
 p^\star&=\underset{p_i\ge0,\ \sum_i p_i=1}{\arg\min}
 \left\{\sum_i c_ip_i+\frac1\eta\mathrm{KL}(p\mid q)\right\},\\
 p_i^\star&=\frac{q_i e^{-\eta c_i}}
                  {\sum_jq_j e^{-\eta c_j}},
 \qquad q_i>0,\quad\eta>0.
 \end{aligned}
$$

<p>A Lagrange multiplier for total mass makes \(\log(p_i/q_i)+\eta c_i\) constant, which gives the formula. Entropy geometry turns an additive change in dual coordinates into multiplicative reweighting in probability coordinates.</p>
<p>The overlap theorem explains why KL simultaneously enjoys a density-ratio interpretation and a tangent-plane interpretation. It does not say that other divergences are inferior. Pearson, Hellinger, squared density error, and feature-mean errors encode different choices. What it rules out is freely exchanging their geometric formulas merely because all of them measure a discrepancy.</p>

## Numerical experimentation: a triangle of probabilities

<p>Three nonnegative probabilities summing to one form a two-dimensional triangle inside \(\mathbb R^3\):</p>

$$
\Delta_3=\left\{q\in\mathbb R_+^3:\sum_{i=1}^3q_i=1\right\}.
$$

<p>Here write \(q\) for the varying point and \(p\) for the target. The figure evaluates the <em>same density-ratio construction</em></p>

$$
D_{\phi_\lambda}(q\mid p)
 =\sum_{i=1}^3p_i\phi_\lambda(q_i/p_i).
$$

<p>Change \(\lambda\) to move between the four familiar examples, and click or drag in the triangle to move \(p\). The two target-coordinate sliders provide the same control without a pointer. Contours bend as the generator changes, even though all these divergences have the same second-order Fisher geometry at the target. This plot is not the Bregman divergence of \(\phi_\lambda\); only the KL member belongs to both families in the sense of Theorem 1.</p>
<iframe class="idea-experiment" data-experiment="divergence-simplex" src="{{ '/blog/preparations/assets/divergence-simplex/index.html' | relative_url }}" title="Power f-divergence level sets on a probability simplex with interactive target and generator" loading="lazy" style="width:100%;height:1120px;border:0"></iframe>
<p class="caption">Targets are projected to \(p_i\ge0.04\), while the plotted \(q\) ranges over the whole closed triangle. Reverse KL is infinite on its boundary. The fixed color scale saturates at four; finite contours use a triangular grid and omit cells with an infinite corner. Changing the plot resolution does not change the divergence definition.</p>

## References

<ol class="references">
<li id="ref-jiao">Jiantao Jiao, Thomas A. Courtade, Albert No, Kartik Venkat, and Tsachy Weissman. <a href="https://arxiv.org/abs/1404.6810"><em>Information Measures: The Curious Case of the Binary Alphabet</em></a>. IEEE Transactions on Information Theory 60(12), 7616–7626, 2014. Theorem 5.</li>
<li id="ref-book">Gabriel Peyré. <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.8.8.34"><em>Optimal Transport for Machine Learners</em>, Proposition 8.34</a>, <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.8.8.31">Definition 8.31</a>, and <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.7.3.16">Definition 7.16</a>. Book manuscript.</li>
<li id="ref-bregman">Lev M. Bregman. <a href="https://doi.org/10.1016/0041-5553(67)90040-7"><em>The Relaxation Method of Finding the Common Point of Convex Sets and Its Application to the Solution of Problems in Convex Programming</em></a>. USSR Computational Mathematics and Mathematical Physics 7(3), 200–217, 1967.</li>
<li id="ref-kl">Solomon Kullback and Richard A. Leibler. <a href="https://doi.org/10.1214/aoms/1177729694"><em>On Information and Sufficiency</em></a>. Annals of Mathematical Statistics 22(1), 79–86, 1951.</li>
<li id="ref-csiszar">Imre Csiszár. <em>Information-type measures of difference of probability distributions and indirect observations</em>. Studia Scientiarum Mathematicarum Hungarica 2, 299–318, 1967. <a href="https://www.renyi.hu/~csiszar/publist2012.pdf#page=1">Author’s publication list, item 13</a>.</li>
<li id="ref-fisher">Ronald A. Fisher. <a href="https://doi.org/10.1098/rsta.1922.0009"><em>On the Mathematical Foundations of Theoretical Statistics</em></a>. Philosophical Transactions of the Royal Society A 222, 309–368, 1922. <a href="https://digital.library.adelaide.edu.au/items/36b96da4-e256-4e94-9720-eef372935c3a">Author archive</a>.</li>
<li id="ref-cressie-read">Noel Cressie and Timothy R. C. Read. <a href="https://doi.org/10.1111/j.2517-6161.1984.tb01318.x"><em>Multinomial Goodness-of-Fit Tests</em></a>. Journal of the Royal Statistical Society, Series B 46(3), 440–464, 1984.</li>
</ol>
