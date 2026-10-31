---
title: "Bures’ distance and square roots of covariances"
subtitle: "Fix a Gaussian coordinate system—or optimally align it. Two simple choices, two geometries."
description: "Bures geometry optimally aligns covariance factors; linear optimal transport fixes their symmetric square roots. Short proofs explain commuting equality and the sharp square-root-of-two comparison, with interactive Gaussian ellipses."
date: "2026-10-31"
topic: "Gaussian optimal transport and matrix geometry"
keywords: ["Bures distance","Bures–Wasserstein distance","covariance matrix","Gaussian optimal transport","positive semidefinite matrix","positive definite matrix","matrix square root","spectral calculus","Frobenius norm","linear optimal transport","LOT","Procrustes alignment","orthogonal alignment","Gaussian coupling","Brenier map","Wasserstein geodesic","covariance interpolation","Gaussian barycenter","quantum fidelity","density matrix","Hellinger distance","commuting matrices","sharp inequality","rank-one covariance","Cyril Letrouit","Tudor Manole","stability of Brenier potentials","Poincaré inequality","matrix geometry","distance de Bures","racine carrée de covariance","Fréchet Inception Distance","FID","Inception-v3","generative model evaluation","feature moments"]
proofs: true
embedded_experiment: true
---

A covariance matrix describes the shape of a Gaussian cloud. How should we compare two such shapes? Subtracting their matrices is possible, but optimal transport suggests a different answer: compare their <em>square roots</em>, after allowing a suitable rotation.

This post was inspired by discussions with Cyril Letrouit about his beautiful recent paper with Tudor Manole, <em>Sharp Stability of Brenier Potentials and its Link to Poincaré Inequalities</em> <a href="#ref-letrouit-manole">[1]</a>. Their functional inequality reaches far beyond Gaussians. Here we explore an elementary matrix comparison that it recovers, and prove that comparison directly. The matrix result itself predates their work <a href="#ref-dinh">[3]</a>.

<!--more-->

## Covariances and their square roots

A real symmetric matrix $$A$$ is <em>positive semidefinite</em>, written $$A\succeq0$$, when $$z^\top A z\ge0$$ for every $$z\in\mathbb R^d$$. Write $$\mathbb S_+^d$$ for this cone. Positive definiteness means strict inequality for every nonzero $$z$$.

These are exactly the possible covariance matrices. For a centered random vector $$X$$,

$$
A=\mathbb E[XX^\top],\qquad z^\top A z=\mathbb E[(z^\top X)^2]\ge0.
$$

Conversely, every $$A\succeq0$$ defines a centered Gaussian $$\mu_A=\mathcal N(0,A)$$. If $$A$$ is singular, this is a perfectly valid Gaussian concentrated on a subspace, rather than a distribution with a density on all of $$\mathbb R^d$$.

The spectral theorem gives $$A=V\operatorname{diag}(\lambda_i)V^\top$$, with $$V$$ orthogonal and $$\lambda_i\ge0$$. A scalar function acts on eigenvalues:

$$
f(A)=V\operatorname{diag}(f(\lambda_i))V^\top,\qquad
 A^{1/2}=V\operatorname{diag}(\sqrt{\lambda_i})V^\top.
$$

This definition does not depend on the choice of basis within a repeated eigenspace. The root $$A^{1/2}$$ is the <em>unique positive semidefinite</em> square root. Without that qualification, matrix square roots need not be unique.

<details class="blog-proof">

<summary>Proof: why the positive square root is unique</summary>

<div class="blog-proof-body" markdown="1">

If $$S\succeq0$$ and $$S^2=A$$, then $$SA=AS$$, so $$S$$ preserves every eigenspace of $$A$$. On the eigenspace associated with $$\lambda$$, its nonnegative eigenvalues must square to $$\lambda$$, hence all equal $$\sqrt\lambda$$. Thus $$S$$ is exactly the spectral root above. $$\square$$

</div>

</details>

In particular, if $$Z\sim\mathcal N(0,I)$$, then $$A^{1/2}Z\sim\mu_A$$. The covariance records <em>squared</em> lengths; its square root acts on lengths themselves. This is why square roots, not raw covariances, are the natural objects below.

## Bures geometry: choose the best alignment

The <em>Bures–Wasserstein distance</em> on $$\mathbb S_+^d$$ is

$$
d_{\mathrm B}(A,B)^2
 =\operatorname{tr}A+\operatorname{tr}B
 -2\operatorname{tr}\!\left[(A^{1/2}BA^{1/2})^{1/2}\right].
$$

There are no inverses here: the formula includes singular covariances. Let $$P=A^{1/2}$$ and $$Q=B^{1/2}$$. Its geometric meaning is the orthogonal Procrustes formula <a href="#ref-bhatia">[2]</a>:

$$
d_{\mathrm B}(A,B)=\min_{U\in O(d)}\|P-QU\|_{\mathrm F},
 \qquad
 \|M\|_{\mathrm F}^2=\operatorname{tr}(M^\top M).
$$

Indeed, $$PZ$$ and $$QUZ$$ have covariances $$A$$ and $$B$$ for any orthogonal $$U$$. Bures geometry chooses the best relative orientation of their latent Gaussian coordinates.

<details class="blog-proof">

<summary>Proof: an orthogonal alignment becomes a trace square root</summary>

<div class="blog-proof-body" markdown="1">

Expanding the square gives

$$
\|P-QU\|_{\mathrm F}^2
 =\operatorname{tr}A+\operatorname{tr}B-2\operatorname{tr}(PQU).
$$

<p>A singular value decomposition shows that the maximum of \(\operatorname{tr}(MU)\) over orthogonal \(U\) is the nuclear norm \(\|M\|_*=\sum_i\sigma_i(M)\): in singular coordinates, every diagonal entry of an orthogonal matrix is at most one, and an alignment attains one on every singular direction. Applying this to \(M=PQ\) gives</p>

$$
\max_U\operatorname{tr}(PQU)
 =\|PQ\|_*=\operatorname{tr}[(PQ^2P)^{1/2}].
$$

This is the claimed formula, including when some singular values vanish. $$\square$$

</div>

</details>

<span id="theorem-1"></span>

<strong>Theorem 1 (Gaussian optimal transport).</strong> For any $$A,B\succeq0$$,

$$
W_2(\mu_A,\mu_B)=d_{\mathrm B}(A,B),
 \qquad
 W_2(\alpha,\beta)^2
 =\inf_{\pi\in\Pi(\alpha,\beta)}
 \int|x-y|^2\,d\pi(x,y).
$$

Here $$\Pi(\alpha,\beta)$$ is the set of couplings with the specified marginals. When $$A,B$$ are positive definite, the optimal transport is the linear map $$x\mapsto Tx$$, where

$$
T=A^{-1/2}(A^{1/2}BA^{1/2})^{1/2}A^{-1/2}.
$$

<details class="blog-proof">

<summary>Proof: a quadratic inequality certifies optimality</summary>

<div class="blog-proof-body" markdown="1">

For positive definite endpoints, $$T$$ is symmetric positive definite and $$TAT=B$$. Thus $$TX$$ has law $$\mu_B$$ when $$X$$ has law $$\mu_A$$. For any pair $$x,y$$,

$$
2x^\top y\le x^\top T x+y^\top T^{-1}y,
$$

<p>since the difference is \(|T^{1/2}x-T^{-1/2}y|^2\). Taking expectations in any coupling gives</p>

$$
\mathbb E|X-Y|^2
 \ge\operatorname{tr}A+\operatorname{tr}B
 -\operatorname{tr}(TA)-\operatorname{tr}(T^{-1}B).
$$

Both last traces equal $$\operatorname{tr}[(A^{1/2}BA^{1/2})^{1/2}]$$. Equality holds for $$Y=TX$$, proving the claim.

For singular endpoints, apply the result to $$A+\delta I,B+\delta I$$ and let $$\delta\downarrow0$$. Spectral square roots are continuous; coupling the approximating Gaussians with the same standard Gaussian shows convergence in $$W_2$$. This proves the distance formula without asserting an inverse-based map formula for a singular source. $$\square$$

</div>

</details>

This identification explains why Bures is a natural <em>metric</em>: it is the restriction of Wasserstein geometry to centered Gaussians <a href="#ref-dowson">[4]</a>, <a href="#ref-gelbrich">[5]</a>. For noncentered Gaussians, simply add the squared distance between their means.

### From Gaussian transport to FID

An important application is the <em>Fréchet Inception Distance</em> (FID), introduced by Heusel et al. to evaluate image generators <a href="#ref-fid">[8]</a>. Pass real and generated images through a fixed pretrained Inception-v3 network, then estimate the mean and covariance of its last-pooling-layer feature vectors. Writing these as $$(m_r,C_r)$$ and $$(m_g,C_g)$$, FID compares their Gaussian approximations:

$$
\operatorname{FID}
 =\|m_r-m_g\|^2+d_{\mathrm B}(C_r,C_g)^2.
$$

Bures geometry supplies exactly the covariance term. Despite its name, the conventional score is a <em>squared</em> Wasserstein distance. It is exact optimal transport between the fitted feature Gaussians—not between the original image distributions. A lower score means closer first two feature moments; matching those moments alone does not imply matching the entire feature distribution.

### A quantum connection

<figure class="portrait-single"><img src="{{ '/blog/imgs/donald-bures.jpg' | relative_url }}" alt="Portrait of Donald John Charles Bures" width="261" height="334" loading="lazy"><figcaption>Donald Bures. Photograph credited to the University of British Columbia in <a href="https://math.artsandsciences.baylor.edu/sites/g/files/ecbvkj1786/files/2024-12/Witte-BAF22.pdf#page=16">N. S. Witte’s Baylor Analysis Fest slides</a> (2022), slide 16. The photographer and date are not specified.</figcaption></figure>

Donald Bures introduced the distance in operator-algebraic work <a href="#ref-bures">[6]</a>. In quantum mechanics, states are complex Hermitian positive semidefinite matrices of trace one. The same expression, with transposes replaced by adjoints, is governed by their <em>root fidelity</em>

$$
F_{\mathrm{root}}(\rho,\sigma)
 =\operatorname{tr}[(\rho^{1/2}\sigma\rho^{1/2})^{1/2}],
 \qquad d_{\mathrm B}(\rho,\sigma)^2=2(1-F_{\mathrm{root}}).
$$

Some conventions call $$F_{\mathrm{root}}^2$$ the fidelity. For commuting diagonal states, Bures reduces to the square-root distance between probability vectors, closely related to Hellinger distance. Our interpolations below live on the <em>whole covariance cone</em>; they are not constrained to remain trace-one quantum states.

## Fix the alignment: linear optimal transport

<p>One can also use the ordinary Frobenius distance \(\|A-B\|_{\mathrm F}\), but this is <em>not</em> the linear optimal transport distance in this story. The latter is</p>

$$
d_{\mathrm{root}}(A,B)=\|A^{1/2}-B^{1/2}\|_{\mathrm F}.
$$

<p>The distinction is already visible in one dimension: comparing variances \(a,b\), transport costs \(|\sqrt a-\sqrt b|\), not \(|a-b|\). Scaling both covariance matrices by \(c\) scales the first distance by \(\sqrt c\), and the raw Frobenius distance by \(c\).</p>

<span id="proposition-1"></span>

<strong>Proposition 1 (an isotropic reference).</strong> Let $$\gamma=\mathcal N(0,I)$$. The optimal maps from $$\gamma$$ to $$\mu_A,\mu_B$$ are $$T_A(z)=Pz,T_B(z)=Qz$$, and

$$
\|T_A-T_B\|_{L^2(\gamma)}
 =d_{\mathrm{root}}(A,B).
$$

<details class="blog-proof">

<summary>Proof: the covariance of the reference is the identity</summary>

<div class="blog-proof-body" markdown="1">

The maps are optimal by Theorem 1 with source covariance $$I$$; singular targets follow by continuity. Since $$\mathbb E[ZZ^\top]=I$$,

$$
\mathbb E|(P-Q)Z|^2
 =\operatorname{tr}[(P-Q)^\top(P-Q)]
 =\|P-Q\|_{\mathrm F}^2.
$$

The same distance is obtained between the displacement fields $$T_A-\mathrm{Id}$$ and $$T_B-\mathrm{Id}$$. $$\square$$

</div>

</details>

This is <em>linear optimal transport</em> (LOT): represent each measure by its transport map from one fixed reference, then compare maps in a Hilbert space <a href="#ref-lot">[7]</a>. Here the coupling uses the same $$Z$$, without optimizing its relative rotation. Consequently,

$$
d_{\mathrm B}(A,B)\le d_{\mathrm{root}}(A,B).
$$

## When do the two distances agree?

<span id="theorem-2"></span>

<strong>Theorem 2 (equality means commutation).</strong> For any $$A,B\succeq0$$,

$$
d_{\mathrm B}(A,B)=d_{\mathrm{root}}(A,B)
 \quad\Longleftrightarrow\quad AB=BA.
$$

If they commute, they have a common orthonormal eigenbasis, and both distances are simply $$(\sum_i(\sqrt{a_i}-\sqrt{b_i})^2)^{1/2}$$. Noncommutation is precisely what makes optimizing the alignment beneficial.

<details class="blog-proof">

<summary>Proof: when does a trace equal a nuclear norm?</summary>

<div class="blog-proof-body" markdown="1">

Set

$$
s=\|P\|_{\mathrm F}^2+\|Q\|_{\mathrm F}^2,\quad
 c=\operatorname{tr}(PQ),\quad F=\|PQ\|_*.
$$

Then $$d_{\mathrm{root}}^2=s-2c$$ and $$d_{\mathrm B}^2=s-2F$$. For a real square matrix $$M=\sum_i\sigma_i u_i v_i^\top$$,

$$
\operatorname{tr}M=\sum_i\sigma_i(v_i^\top u_i)\le\sum_i\sigma_i.
$$

Equality forces $$u_i=v_i$$ for each positive singular value, so it holds exactly when $$M$$ is symmetric positive semidefinite. Applied to $$M=PQ$$, this says $$PQ=QP$$. Commuting positive matrices have a positive product; conversely, symmetry of that product implies commutation. Finally, $$P,Q$$ commute exactly when $$A,B$$ do, by simultaneous diagonalization in one direction and squaring in the other. No invertibility was used. $$\square$$

</div>

</details>

## A sharp comparison, independent of dimension

<span id="theorem-3"></span>

<strong>Theorem 3 (at most a factor $$\sqrt2$$).</strong> For all positive semidefinite covariances,

$$
\frac1{\sqrt2}\,d_{\mathrm{root}}(A,B)
 \le d_{\mathrm B}(A,B)\le d_{\mathrm{root}}(A,B).
$$

Both constants are optimal, already in dimension two. Thus fixing the isotropic reference can stretch distances, but never by more than $$\sqrt2$$ <a href="#ref-dinh">[3]</a>.

<details class="blog-proof">

<summary>Proof: two applications of Cauchy–Schwarz</summary>

<div class="blog-proof-body" markdown="1">

Retain $$s,c,F$$ from the previous proof and choose an orthogonal $$U$$ with $$F=\operatorname{tr}(PQU)$$. Put $$M=P^{1/2}Q^{1/2}$$ and $$N=Q^{1/2}UP^{1/2}$$. Applying Frobenius Cauchy–Schwarz to $$\operatorname{tr}(MN)=\langle M^\top,N\rangle_{\mathrm F}$$, followed by $$2ab\le a^2+b^2$$, gives

$$
2F=2\operatorname{tr}(MN)
 \le\|M\|_{\mathrm F}^2+\|N\|_{\mathrm F}^2
 =c+\operatorname{tr}(PU^\top QU).
$$

Another application gives

$$
\operatorname{tr}(PU^\top QU)
 \le\|P\|_{\mathrm F}\|Q\|_{\mathrm F}\le s/2.
$$

Hence $$4F\le2c+s$$, or $$s-2c\le2(s-2F)$$. This is the lower bound. The upper bound was obtained by setting $$U=I$$ in Procrustes alignment.

To see sharpness, take unit vectors $$u,v$$ with $$u^\top v=\cos\theta\in(0,1)$$, and rank-one covariances $$A=uu^\top,B=vv^\top$$. Their square roots equal themselves, and

$$
d_{\mathrm{root}}^2=2\sin^2\theta,\qquad
 d_{\mathrm B}^2=2(1-\cos\theta),\qquad
 \frac{d_{\mathrm B}}{d_{\mathrm{root}}}
 =\frac1{\sqrt{1+\cos\theta}}\longrightarrow\frac1{\sqrt2}.
$$

The constant one is attained by distinct commuting covariances. Adding a small multiple of $$I$$ to the rank-one examples shows that the lower constant cannot improve even if both matrices are required to be positive definite. $$\square$$

</div>

</details>

### Why Letrouit–Manole goes much further

<p>Theorem 1.1 of <a href="#ref-letrouit-manole">[1]</a> considers a reference density \(\rho\propto e^{-V}\) for which \(V-\kappa|x|^2/2\) is convex, with \(\kappa&gt;0\). For convex potentials \(\varphi_0,\varphi_1\) whose gradients are in \(L^2(\rho)\), it proves</p>

$$
\operatorname{Var}_\rho(\varphi_1-\varphi_0)
 \le\frac1\kappa
 W_2^2((\nabla\varphi_0)_\#\rho,(\nabla\varphi_1)_\#\rho).
$$

The pushforward $$T_\#\rho$$ is the law of $$T(X)$$ for $$X\sim\rho$$. This controls <em>Brenier potentials</em>, not an unrestricted $$L^2$$ distance between their gradients.

For the standard Gaussian, $$\kappa=1$$. Take $$\varphi_A(z)=z^\top Pz/2$$, so $$(\nabla\varphi_A)_\#\gamma=\mu_A$$. Gaussian fourth moments yield

$$
\operatorname{Var}_\gamma(\varphi_A-\varphi_B)
 =\tfrac12\|P-Q\|_{\mathrm F}^2.
$$

<details class="blog-proof">

<summary>Proof: the variance of a Gaussian quadratic form</summary>

<div class="blog-proof-body" markdown="1">

Diagonalize $$P-Q$$ with eigenvalues $$\eta_i$$. Rotational invariance makes the form $$\frac12\sum_i\eta_i Z_i^2$$. Independence, $$\mathbb E Z_i^2=1$$, and $$\mathbb E Z_i^4=3$$ give variance $$\frac14\sum_i2\eta_i^2$$, as claimed. $$\square$$

</div>

</details>

Their theorem therefore gives exactly the lower bound of Theorem 3. The striking generalization is that the potential inequality survives well beyond quadratic potentials and Gaussian target measures.

## Two barycentric interpolations

Distances determine how to interpolate. For positive definite endpoints and $$t\in[0,1]$$, compare

$$
C_t^{\mathrm{root}}=((1-t)P+tQ)^2,
 \qquad
 C_t^{\mathrm B}=((1-t)I+tT)\,A\,((1-t)I+tT),
$$

where $$T$$ is the Gaussian optimal map from Theorem 1. The first linearly interpolates symmetric square roots; the second follows Wasserstein displacement interpolation. Equivalently, if $$U_*$$ minimizes the Procrustes problem,

$$
C_t^{\mathrm B}=L_tL_t^\top,\qquad
 L_t=(1-t)P+tQU_*.
$$

For positive definite endpoints the optimal alignment satisfies $$QU_*=TP$$, which makes these two expressions for the Bures path identical.

<span id="proposition-2"></span>

<strong>Proposition 2 (geodesics and two-point barycenters).</strong> Each path is a constant-speed geodesic for its respective distance $$d$$, and its point at time $$t$$ minimizes

$$
C\longmapsto(1-t)d(C,A)^2+t\,d(C,B)^2.
$$

<details class="blog-proof">

<summary>Proof: straight factors, then the triangle inequality</summary>

<div class="blog-proof-body" markdown="1">

The square-root path is a straight segment in the convex cone of positive semidefinite square roots, so its distances are exactly proportional to time. For Bures, interpolating optimally aligned factors gives

$$
d_{\mathrm B}(C_s^{\mathrm B},C_t^{\mathrm B})
 \le |t-s|\,\|P-QU_*\|_{\mathrm F}.
$$

<p>This follows from the factor formulation of Procrustes distance: any factors \(XX^\top,YY^\top\) give an admissible bound \(\|X-Y\|_{\mathrm F}\). Applying the triangle inequality along the path from \(A\) to \(B\) forces equality on every subinterval.</p>

Finally write $$a=d(A,C),b=d(C,B),D=d(A,B)$$. Then

$$
(1-t)a^2+tb^2
 \ge t(1-t)(a+b)^2\ge t(1-t)D^2.
$$

The first difference is $$((1-t)a-tb)^2$$; the second inequality is the triangle inequality. A constant-speed geodesic point has $$a=tD,b=(1-t)D$$, and attains the bound. The endpoints $$t=0,1$$ are immediate. $$\square$$

</div>

</details>

When $$A,B$$ commute the two paths coincide. Neither is, in general, the arithmetic covariance interpolation $$(1-t)A+tB$$.

## Numerical experimentation

<p>Each panel shows ellipses \(\{C^{1/2}u:|u|=1\}\) at the same sequence of times. The bold ellipse is the selected time; its color interpolates linearly from blue to red. The axes and their scale are identical in both panels and remain fixed as time changes.</p>

<iframe class="idea-experiment" data-experiment="bures-covariances" src="{{ '/blog/preparations/assets/bures-covariances/index.html' | relative_url }}" title="Square-root and Bures covariance interpolations" loading="lazy" style="width:100%;height:1200px;border:0" allowfullscreen></iframe>

Start with <em>Commuting axes</em>: the paths and distances agree. Switch to <em>Rotated axes</em>, then vary orientation and anisotropy to see the two midpoints separate. <em>Nearly rank one</em> emphasizes thin clouds. The displayed ratio is $$d_{\mathrm{root}}/d_{\mathrm B}$$, so it lies between $$1$$ and $$\sqrt2$$; when both covariances coincide, the ratio is undefined rather than a numerical failure.

The two shape sliders separate <em>relative rotation</em> from <em>anisotropy</em>. Rotation turns the red covariance relative to the fixed blue axes. Anisotropy changes the common major-to-minor radius ratio of both endpoint ellipses, keeping their areas fixed; at ratio one both are circles. The relative overall size is fixed. The time slider independently selects a point on each interpolation path.

The controls keep both endpoints positive definite, though the theorems include singular matrices. The experiment evaluates the closed matrix formulas, not a discretized transport solver. Axis ratio means the ratio of ellipse radii, hence the square root of the covariance eigenvalue ratio.

## References

<ol class="bibliography">
<li id="ref-letrouit-manole">Cyril Letrouit and Tudor Manole. <a href="https://arxiv.org/abs/2610.37659"><em>Sharp Stability of Brenier Potentials and its Link to Poincaré Inequalities</em></a>. Preprint, 2026.</li>
<li id="ref-bhatia">Rajendra Bhatia, Tanvi Jain, and Yongdo Lim. <a href="https://doi.org/10.1016/j.exmath.2018.01.002"><em>On the Bures–Wasserstein distance between positive definite matrices</em></a>. Expositiones Mathematicae 37(2), 165–191, 2019. <a href="https://arxiv.org/abs/1712.01504">Preprint</a>.</li>
<li id="ref-dinh">Trung Hoa Dinh, Cong Trinh Le, Bich Khue Vo, and Trung-Dung Vuong. <a href="https://doi.org/10.7153/mia-2021-24-11"><em>Weighted Hellinger distance and in-betweenness property</em></a>. Mathematical Inequalities &amp; Applications 24(1), 157–165, 2021.</li>
<li id="ref-dowson">D. C. Dowson and B. V. Landau. <a href="https://doi.org/10.1016/0047-259X(82)90077-X"><em>The Fréchet distance between multivariate normal distributions</em></a>. Journal of Multivariate Analysis 12(3), 450–455, 1982.</li>
<li id="ref-gelbrich">Matthias Gelbrich. <a href="https://doi.org/10.1002/mana.19901470121"><em>On a Formula for the L² Wasserstein Metric between Measures on Euclidean and Hilbert Spaces</em></a>. Mathematische Nachrichten 147, 185–203, 1990.</li>
<li id="ref-bures">Donald Bures. <a href="https://doi.org/10.1090/S0002-9947-1969-0236719-2"><em>An extension of Kakutani’s theorem on infinite product measures to the tensor product of semifinite w*-algebras</em></a>. Transactions of the American Mathematical Society 135, 199–212, 1969.</li>
<li id="ref-lot">Wei Wang, Dejan Slepčev, Saurav Basu, John A. Ozolek, and Gustavo K. Rohde. <a href="https://doi.org/10.1007/s11263-012-0566-z"><em>A linear optimal transportation framework for quantifying and visualizing variations in sets of images</em></a>. International Journal of Computer Vision 101(2), 254–269, 2013. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3667970/">Open article</a>.</li>
<li id="ref-fid">Martin Heusel, Hubert Ramsauer, Thomas Unterthiner, Bernhard Nessler, and Sepp Hochreiter. <a href="https://papers.neurips.cc/paper_files/paper/2017/hash/8a1d694707eb0fefe65871369074926d-Abstract.html"><em>GANs Trained by a Two Time-Scale Update Rule Converge to a Local Nash Equilibrium</em></a>. Advances in Neural Information Processing Systems 30, 2017. <a href="https://arxiv.org/abs/1706.08500">Preprint</a>.</li>
</ol>
