---
title: "Wasserstein singular vectors: a distance that defines itself"
subtitle: "Sample geometry and feature geometry can be learned from each other."
description: "Wasserstein singular vectors learn sample and feature distances together. Order, homogeneity, a fixed-point existence proof, and interactive exact transport experiments reveal the construction."
date: "2026-11-06"
topic: "Learning a ground metric"
keywords:
  - "Wasserstein singular vectors"
  - "ground metric learning"
  - "unsupervised metric learning"
  - "optimal transport"
  - "Earth mover distance"
  - "histograms"
  - "sample geometry"
  - "feature geometry"
  - "nonlinear singular vectors"
  - "nonlinear Perron Frobenius"
  - "order preserving maps"
  - "positive homogeneity"
  - "topical maps"
  - "Hilbert projective metric"
  - "nonexpansive maps"
  - "Brouwer fixed point theorem"
  - "metric cone"
  - "normalized power iteration"
  - "transport linear programming"
  - "regularization"
  - "translated histograms"
  - "periodic bumps"
  - "location scale family"
  - "Gaussian quantiles"
  - "Wasserstein distance"
  - "min cost flow"
  - "Geert Jan Huizing"
  - "Laura Cantini"
  - "Marco Cuturi"
  - "David Avis"
  - "Gabriel Peyre"
  - "vecteurs singuliers de Wasserstein"
  - "apprentissage de métrique"
proofs: true
embedded_experiment: true
---

<p>Two histograms can have almost disjoint supports and still describe nearly the same object: imagine translating a narrow bump by one pixel. Optimal transport recognizes this—provided we already know which bins are close. But what if the bins are genes, words, or abstract features, with no obvious geometry?</p>
<p>The project began with a question Laura Cantini raised about genomics at our first meeting at the start of Geert-Jan Huizing’s PhD. Geert started working on it, and we eventually found ourselves studying nonlinear Perron–Frobenius theory and <em>topical maps</em>. I enjoy seeing a biological question lead us to mathematics we had not expected to use.</p>
<p>With Geert-Jan Huizing and Laura Cantini, we studied two coupled comparisons: samples are compared using a distance between features, and features using the resulting distance between samples. A consistent pair is a pair of <em>Wasserstein singular vectors</em> <a href="#ref-wsv">[1]</a>. The construction is unsupervised: unlike supervised ground-metric learning <a href="#ref-ground">[2]</a>, it does not start from labels saying which samples ought to be similar.</p>


<!--more-->

## Row and column probability distributions {#one-data-matrix-two-families-of-distributions}

<figure class="portrait-figure"><img src="{{ '/blog/imgs/gaspard-monge-carnavalet.jpg' | relative_url }}" width="425" height="500" loading="lazy" decoding="async" alt="Engraved profile portrait of Gaspard Monge"><figcaption>Gaspard Monge. Engraving by Edmé Quenedey after Jean-Claude Naigeon, Musée Carnavalet, inventory G.19215. <a href="https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/gaspard-monge">CC0 Paris Musées / Musée Carnavalet – Histoire de Paris</a>. Modern discrete couplings extend the map-based transport problem associated with Monge.</figcaption></figure>
<p>Let \(X\in\mathbb R_+^{n\times m}\) have nonzero rows and columns, with \(n,m\ge2\). Normalize each row to a probability vector \(a_i\in\Delta_m\), and each column to \(b_k\in\Delta_n\). Thus rows describe samples over features, while columns describe features over samples.</p>
<p>For a symmetric nonnegative cost matrix \(C\in\mathbb R^{m\times m}\) with zero diagonal, define the <em>unrooted</em> transport cost</p>

$$
\operatorname{OT}_C(a,a')=
 \min_{P\ge0,\ P\mathbf1=a,\ P^\top\mathbf1=a'}
 \sum_{k,\ell}P_{k\ell}C_{k\ell}.
$$

<p>Every feasible plan has total mass one. This is a finite linear program; no entropy or square root is included. For background on this formulation, see <a href="#ref-computational">[4]</a> and <a href="#ref-book">[5]</a>. A feature cost produces a sample cost through</p>

$$
\Phi_a(C)_{ij}=\operatorname{OT}_C(a_i,a_j).
$$

<p>Interchange rows and columns to obtain \(\Phi_b(D)\in\mathbb R^{m\times m}\) from a sample cost \(D\). The self-consistency equations are</p>

$$
\Phi_a(C)=\mu D,\qquad \Phi_b(D)=\lambda C,
 \qquad \lambda,\mu>0.
$$

<p>One can fix scale by \(\|C\|_\infty=\|D\|_\infty=1\), where the norm is the <em>entrywise maximum</em>, not a matrix operator norm. These equations resemble left and right singular-vector equations, but the maps are nonlinear. The unknown vectors have become distance matrices.</p>


## Monotonicity, homogeneity, and Lipschitz continuity {#three-simple-properties-do-much-of-the-work}

<p id="proposition-1"><strong>Proposition 1 (order, scaling, and stability).</strong> For admissible costs and \(s\ge0\),</p>

$$
\begin{aligned}
 C\le C'&\Longrightarrow\Phi_a(C)\le\Phi_a(C'),\\
 \Phi_a(sC)&=s\Phi_a(C),\\
 \|\Phi_a(C)-\Phi_a(C')\|_\infty&\le\|C-C'\|_\infty.
 \end{aligned}
$$



<details class="blog-proof">

<summary>Proof: compare the objectives of the same transport plan</summary>

<div class="blog-proof-body" markdown="1">

<p>The first two claims follow directly by minimizing linear costs. For the third, if every entry changes by at most \(\delta\), the objective of every feasible plan changes by at most \(\delta\sum_{k,\ell}P_{k\ell}=\delta\). Compare an optimizer for either cost in the other problem. \(\square\)</p>

</div>

</details>

<p>If costs are strictly positive off the diagonal and the normalized rows are distinct, the output costs are also strictly positive off the diagonal. Order and homogeneity then give a projective stability estimate. Define</p>

$$
d_H(C,C')=
 \max_{k\ne\ell}\log\frac{C_{k\ell}}{C'_{k\ell}}
 -\min_{k\ne\ell}\log\frac{C_{k\ell}}{C'_{k\ell}}.
$$

<p>If \(\alpha C'\le C\le\beta C'\), the same sandwich passes through \(\Phi_a\). Taking the smallest possible ratio \(\beta/\alpha\) proves \(d_H(\Phi_a(C),\Phi_a(C'))\le d_H(C,C')\). In logarithmic coordinates, multiplicative homogeneity becomes additive homogeneity. This is the order geometry of nonlinear Perron–Frobenius theory <a href="#ref-pf">[3]</a>.</p>
<p>Nonexpansiveness does <em>not</em> imply strict contraction, uniqueness, or convergence of every normalized iteration. Those conclusions need more information.</p>


## Regularization and existence {#a-regularizer-that-also-makes-existence-transparent}

<p>The paper adds a simple term, different from entropic regularization:</p>

$$
\Phi_a^\tau(C)_{ij}
 =\operatorname{OT}_C(a_i,a_j)+\tau\|C\|_\infty R(a_i-a_j),
 \qquad\tau>0,
$$

<p>where \(R\) is a norm; define \(\Phi_b^\tau\) similarly. This term separates distinct histograms even when the ground cost has zero directions. Its sup-norm Lipschitz bound is \(1+\tau\max_{i,j}R(a_i-a_j)\), rather than the raw constant one.</p>
<p id="theorem-1"><strong>Theorem 1 (regularized self-consistency).</strong> Assume the normalized rows are pairwise distinct and the normalized columns are pairwise distinct. For every \(\tau&gt;0\), there are genuine metric matrices \(C,D\), positive off the diagonal, and positive numbers \(\lambda,\mu\), such that</p>

$$
\Phi_a^\tau(C)=\mu D,\qquad \Phi_b^\tau(D)=\lambda C.
$$



<details class="blog-proof">

<summary>Proof: normalize on a convex slice of the metric cone</summary>

<div class="blog-proof-body" markdown="1">

<p><em>First, transport preserves the triangle inequality.</em> If \(C\) is a pseudometric, glue optimal plans from \(a\) to \(b\) and from \(b\) to \(d\). The pointwise inequality \(C_{k\ell}\le C_{kj}+C_{j\ell}\), integrated against their joint three-way law, gives</p>

$$
\operatorname{OT}_C(a,d)
 \le\operatorname{OT}_C(a,b)+\operatorname{OT}_C(b,d).
$$

<p>The term \(R(a-d)\) also obeys the triangle inequality. Thus both regularized transforms preserve pseudometrics, and their outputs are strictly positive on distinct histograms.</p>
<p><em>Next, choose the right normalization.</em> Let \(\mathcal K_m\) be the set of symmetric pseudometric matrices with zero diagonal and \(\sum_{k&lt;\ell}C_{k\ell}=1\). It is a nonempty compact convex set: all defining inequalities are linear. Use the analogous \(\mathcal K_n\) for \(D\).</p>
<p>Normalize each transformed matrix by the sum of its upper-triangular entries. The map</p>

$$
(C,D)\longmapsto
 \left(
 \frac{\Phi_b^\tau(D)}{\sum_{k<\ell}\Phi_b^\tau(D)_{k\ell}},
 \frac{\Phi_a^\tau(C)}{\sum_{i<j}\Phi_a^\tau(C)_{ij}}
 \right)
$$

<p>is continuous and maps \(\mathcal K_m\times\mathcal K_n\) into itself. The denominators are positive by distinctness and \(\tau&gt;0\). Brouwer’s theorem gives a fixed point. Undoing the normalization gives the two singular-vector equations, and the regularizer makes both metrics positive off the diagonal. Homogeneity then permits rescaling each to maximum one. \(\square\)</p>

</div>

</details>

<p>This proof uses a convex <em>sum-normalized</em> slice; the superficially more familiar constraint \(\|C\|_\infty=1\) is not itself a convex slice. The paper’s Theorem 2.3 gives regularized existence, and Proposition 2.6 proves uniqueness and linear convergence for sufficiently large regularization. We do not claim that every positive \(\tau\) is already in that contraction regime.</p>


## Nonlinear power iteration {#a-power-iteration-not-a-magic-convergence-theorem}

<p>The numerical update alternates the two transforms:</p>

$$
C^{k+1}=\frac{\Phi_b^\tau(D^k)}{\|\Phi_b^\tau(D^k)\|_\infty},
 \qquad
 D^{k+1}=\frac{\Phi_a^\tau(C^{k+1})}{\|\Phi_a^\tau(C^{k+1})\|_\infty}.
$$

<p>Each cycle is a collection of transport problems. Starting inside the metric cone keeps every iterate there. At \(\tau=0\), the paper exhibits special cases with many self-consistent geometries; existence and uniqueness cannot be inferred from the raw nonexpansive estimate alone. At large \(\tau\), the histogram-norm term increasingly determines the learned geometry. These are useful checks on what the method can learn from the data.</p>


## Translation invariance and reference cost profiles {#translations-scales-and-an-exact-reference-geometry}

<p>For periodic translated bumps, use \(X_{ik}=h((i-k)/N)\). With a translation-invariant initialization, the transforms stay circulant. A row of the learned cost matrix is then a cost profile versus circular displacement. The original paper explores this symmetry in its translated-histogram experiments <a href="#ref-wsv">[1]</a>. A distance-like profile is plausible; a quadratic profile should be tested rather than assumed.</p>
<p>A second family varies both location and scale. Let \(h\) have mean zero and variance one, and set \(\rho_{m,s}(x)=s^{-1}h((x-m)/s)\), for \(s&gt;0\). Its quantile is \(m+sQ_h\), so the one-dimensional quantile formula gives</p>

$$
W_2^2(\rho_{m,s},\rho_{m',s'})=(m-m')^2+(s-s')^2.
$$



<details class="blog-proof">

<summary>Proof: expand the quantile difference</summary>

<div class="blog-proof-body" markdown="1">

<p>Integrate \([(m-m')+(s-s')Q_h(u)]^2\) on \((0,1)\). The mixed term vanishes because \(\int Q_h=0\), and \(\int Q_h^2=1\). \(\square\)</p>

</div>

</details>

<p>The experiment compares learned sample costs to both this squared cost and its square root, after fitting one positive scale factor. A learned metric need not equal either. In particular, squared Euclidean cost generally violates the triangle inequality, while our iterates satisfy it. The paper’s debiased entropic variant has a separate large-regularization, PCA-related squared-cost limit; it is not the raw transform simulated here.</p>
<figure><iframe class="idea-experiment" data-experiment="wasserstein-vectors" title="Interactive Wasserstein singular vectors for translated and rescaled histograms" src="{{ '/blog/preparations/assets/transport-geometry/wasserstein-vectors.html' | relative_url }}" loading="lazy"></iframe><figcaption>The first family has 12 circular translations; the second has nine Gaussian location–scale samples over 17 feature bins on [−4.8,4.8]. Discrete transport is solved by minimum-cost flow, with checked marginal residuals. Computation runs in a worker and history playback starts paused. The plotted Hilbert distance is between successive iterates, not a certified error to a known limiting metric.</figcaption></figure>


## References

<ol class="references">
<li id="ref-wsv">Geert-Jan Huizing, Laura Cantini, and Gabriel Peyré. <a href="https://proceedings.mlr.press/v162/huizing22a.html"><em>Unsupervised Ground Metric Learning Using Wasserstein Singular Vectors</em></a>. ICML, PMLR 162, 9429–9443, 2022.</li>
<li id="ref-ground">Marco Cuturi and David Avis. <a href="https://jmlr.org/papers/v15/cuturi14a.html"><em>Ground Metric Learning</em></a>. Journal of Machine Learning Research 15, 533–564, 2014.</li>
<li id="ref-pf">Bas Lemmens and Roger Nussbaum. <a href="https://doi.org/10.1017/CBO9781139026079"><em>Nonlinear Perron–Frobenius Theory</em></a>. Cambridge University Press, 2012.</li>
<li id="ref-computational">Gabriel Peyré and Marco Cuturi. <a href="https://arxiv.org/abs/1803.00567"><em>Computational Optimal Transport</em></a>. Foundations and Trends in Machine Learning 11(5–6), 355–607, 2019.</li>
<li id="ref-book">Gabriel Peyré. <a href="https://www.gpeyre.com/ot4ml/"><em>Optimal Transport for Machine Learners</em></a>. Book manuscript, 2025–2026.</li>
</ol>
