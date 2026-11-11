---
title: "Averaging Positive Symmetric Matrices"
subtitle: "Comparing log-Euclidean and Kubo–Ando geometric means with the logarithmic mean."
description: "Three ways to average positive matrices: log-Euclidean geometry, the Kubo–Ando geometric mean, and its logarithmic path average. Short axiomatic characterizations, proofs, Gaussian transport, and interactive covariance ellipses."
date: "2026-11-03"
last_modified_at: "2026-11-03T09:16:42Z"
topic: "Matrix means and covariance geometry"
keywords: ["positive semidefinite matrix","positive definite matrix","PSD cone","SPD cone","covariance matrix","matrix averaging","diffusion tensor imaging","covariance descriptor","arithmetic matrix mean","harmonic matrix mean","geometric matrix mean","log-Euclidean mean","operator logarithmic mean","Kubo–Ando mean","Fumio Kubo","Tsuyoshi Ando","Pusz–Woronowicz mean","matrix logarithm","matrix exponential","spectral calculus","Löwner order","congruence invariance","affine-invariant geometry","Gaussian optimal transport","Bures–Wasserstein geometry","determinant interpolation","Fréchet mean","Karcher mean","noncommuting matrices","positive matrix interpolation","moyenne de matrices","moyenne logarithmique","axiomatic characterization","inverse compatibility","self-duality","midpoint consistency","dyadic subdivision","uniform path average","Riemann sums"]
proofs: true
embedded_experiment: true
---

<p>Positive semidefinite matrices describe covariance, diffusion, and other directional properties of data. We average them to combine noisy estimates, interpolate measurements, or construct a representative template. The choice of mean affects which geometric properties are preserved.</p>
<p>For positive numbers, arithmetic and geometric averaging already answer different questions. For matrices, noncommutativity gives several distinct extensions of the <em>geometric mean</em>. We will compare the <em>log-Euclidean geometric mean</em>, the <em>Kubo–Ando geometric mean</em>, and the <em>logarithmic mean</em>, which is different from either geometric mean.</p>

<!--more-->

## Positive semidefinite matrices and applications {#the-positive-cone-why-matrices-encode-data}

<p>Write \(\mathbb S^d\) for the real symmetric \(d\times d\) matrices. Its positive semidefinite cone and positive definite interior are</p>

$$
\begin{aligned}
 \mathbb S_+^d&=\{A\in\mathbb S^d:x^\top Ax\ge0\ \forall x\},\\
 \mathbb S_{++}^d&=\{A\in\mathbb S^d:x^\top Ax>0\ \forall x\ne0\}.
 \end{aligned}
$$

<p>We write \(A\succeq0\) or \(A\succ0\), respectively. The <em>Löwner order</em> is \(A\preceq B\) when \(B-A\succeq0\): every directional quadratic form increases. For a random vector \(X\) with finite second moment and mean \(m\),</p>

$$
A=\mathbb E[(X-m)(X-m)^\top]\succeq0,
 \qquad x^\top Ax=\operatorname{Var}(x^\top X).
$$

<p>Thus covariance averaging combines directional uncertainty. In diffusion MRI, positive tensors describe local anisotropic diffusion; smoothing and resampling require averages of nearby tensors <a href="#ref-arsigny">[1]</a>, <a href="#ref-pennec">[2]</a>. In computer vision, covariances of local features describe image regions, and averaged descriptors can serve as templates or update tracking models <a href="#ref-tuzel">[3]</a>, <a href="#ref-tracker">[4]</a>. Positive matrices also appear as kernel Gram matrices and, in their complex Hermitian version, quantum density matrices. Extra constraints, such as a fixed trace or diagonal, may require a separate normalization; the means below act on the whole positive cone.</p>
<p>The ordinary weighted average preserves positivity:</p>

$$
A\nabla_t B=(1-t)A+tB,\qquad 0\le t\le1.
$$

<p>The PSD matrices form a <em>convex cone</em>, since \(x^\top(aA+bB)x\ge0\) for \(a,b\ge0\). Positive definite endpoints stay positive definite. There is no positivity problem with convex arithmetic averaging. The issue is the geometry: a multiplicative change from variance \(1\) to \(100\) has arithmetic midpoint \(50.5\), whereas the scalar geometric midpoint is \(10\).</p>
<p>From now on, assume \(A,B\succ0\). Logarithms and inverse-based formulas require this assumption. A singular covariance can be regularized as \(A+\delta I\), but results involving its logarithm are not assertions about \(\delta=0\).</p>

## The log-Euclidean mean {#first-route-average-logarithms}

<p>The spectral theorem writes \(A=U\operatorname{diag}(a_i)U^\top\), with \(U\) orthogonal and \(a_i&gt;0\). Define</p>

$$
\begin{aligned}
 \log A&=U\operatorname{diag}(\log a_i)U^\top,\\
 A^t&=U\operatorname{diag}(a_i^t)U^\top.
 \end{aligned}
$$

<p>Conversely, for any symmetric \(H=V\operatorname{diag}(h_i)V^\top\),</p>

$$
\exp H=V\operatorname{diag}(e^{h_i})V^\top.
$$

<p>These definitions are independent of choices inside repeated eigenspaces. The exponential maps \(\mathbb S^d\) bijectively onto \(\mathbb S_{++}^d\), with inverse the symmetric logarithm. We can therefore take an ordinary average in logarithmic coordinates:</p>

$$
E_t(A,B)=\exp\!\big((1-t)\log A+t\log B\big).
$$

<p>This is the <em>log-Euclidean geometric interpolation</em>, developed by Arsigny, Fillard, Pennec, and Ayache <a href="#ref-arsigny">[1]</a>, <a href="#ref-arsigny-siam">[5]</a>. Its midpoint is \(E_{1/2}\). In dimension one it is \(a^{1-t}b^t\). More generally, if \(A\) and \(B\) commute, they share an eigenbasis, and each eigenvalue follows precisely this scalar rule.</p>
<p>The name describes an actual geometry: \(d_{\mathrm{LE}}(A,B)=\|\log A-\log B\|_{\mathrm F}\), where \(\|M\|_{\mathrm F}^2=\operatorname{tr}(M^\top M)\). The path \(E_t\) is a straight line in log coordinates and minimizes the weighted squared-distance objective. For several matrices with nonnegative weights summing to one, the corresponding mean is explicitly \(\exp(\sum_i w_i\log A_i)\).</p>

## The Kubo–Ando geometric mean {#second-route-the-kuboando-geometric-mean}

<p>Another principle is to make averaging compatible with <em>every invertible linear change of coordinates</em>. Covariances transform as \(A\mapsto SAS^\top\). One would like to average before or after this change with the same result.</p>
<p>The geometric mean associated with Kubo–Ando theory is</p>

$$
A\#B=A^{1/2}\big(A^{-1/2}BA^{-1/2}\big)^{1/2}A^{1/2}.
$$

<p>It first turns \(A\) into the identity, takes a square root in these relative coordinates, then transforms back. For commuting matrices it equals \((AB)^{1/2}\); for general matrices \(AB\) is not even symmetric, so taking an entrywise or naive product square root misses the point.</p>
<p>Pusz and Woronowicz introduced this operator geometric mean in 1975 <a href="#ref-pusz">[6]</a>. Fumio Kubo and Tsuyoshi Ando subsequently placed it within an axiomatic theory of operator means, based on positivity, monotonicity, compatibility with congruences, and continuity from above <a href="#ref-kubo">[7]</a>. Their theory applies to operators as well as finite matrices; the geometric mean is one distinguished example, not the only Kubo–Ando mean.</p>
<figure class="portrait-single"><img src="{{ '/blog/imgs/ando-mfo.jpg' | relative_url }}" alt="Tsuyoshi Ando, photographed by Konrad Jacobs in Erlangen in 1976" width="282" height="400" loading="lazy"><figcaption>Tsuyoshi Ando, Erlangen, 1976. Konrad Jacobs, Archives of the Mathematisches Forschungsinstitut Oberwolfach; <a href="https://opc.mfo.de/detail?photo_id=73">photo 73</a>, <a href="https://creativecommons.org/licenses/by-sa/2.0/de/deed.en">CC BY-SA 2.0 Germany</a>. The archive’s watermarked image is reproduced unmodified. An official biography and portrait of Fumio Kubo are available in the <a href="https://www3.u-toyama.ac.jp/alumni4/bulletin/50th_Anniversary_Bulletin_Hyojun_16.pdf">University of Toyama’s anniversary bulletin</a>, printed p. 29.</figcaption></figure>

<p id="proposition-1"><strong>Proposition 1 (a square-root equation).</strong> The midpoint \(A\#B\) is the unique positive definite solution \(X\) of</p>

$$
XA^{-1}X=B.
$$

<details class="blog-proof">

<summary>Proof: whiten the equation</summary>

<div class="blog-proof-body" markdown="1">

<p>Set \(Y=A^{-1/2}XA^{-1/2}\) and \(C=A^{-1/2}BA^{-1/2}\). The equation becomes \(Y^2=C\). Its unique positive definite solution is the spectral root \(C^{1/2}\), giving the formula for \(A\#B\). Moreover, \(XA^{-1}X=B\) implies \(XB^{-1}X=A\), so uniqueness also proves \(A\#B=B\#A\). \(\square\)</p>
</div>

</details>

<p>To interpolate rather than just take a midpoint, replace the relative square root by a power:</p>

$$
A\#_tB=A^{1/2}C^tA^{1/2},\qquad 0\le t\le1,
$$

$$
C=A^{-1/2}BA^{-1/2}.
$$

<p>The endpoints are \(A\#_0B=A\), \(A\#_1B=B\), and \(A\#_{1/2}B=A\#B\). This is also the geodesic of the standard affine-invariant Riemannian geometry on positive definite matrices <a href="#ref-moakher">[8]</a>, <a href="#ref-bhatia">[9]</a>. For more than two matrices, its Riemannian barycenter is generally found by optimization, unlike the explicit log-Euclidean formula.</p>

<p id="theorem-1"><strong>Theorem 1 (scalar-like identities, with coordinate invariance).</strong> For \(0\le t\le1\) and invertible \(S\),</p>

$$
A\#_tB=B\#_{1-t}A,
$$

$$
(A\#_tB)^{-1}=A^{-1}\#_tB^{-1},
$$

$$
(SAS^\top)\#_t(SBS^\top)=S(A\#_tB)S^\top.
$$

<p>The operation is homogeneous and jointly monotone: increasing either endpoint in Löwner order cannot decrease the result. Both geometric interpolations satisfy the same determinant law,</p>

$$
\det(A\#_tB)=\det E_t(A,B)
 =(\det A)^{1-t}(\det B)^t.
$$

<details class="blog-proof">

<summary>Proof: changing the whitening basis only introduces a rotation</summary>

<div class="blog-proof-body" markdown="1">

<p>Put \(\widetilde A=SAS^\top\) and \(U=\widetilde A^{-1/2}SA^{1/2}\). Then \(UU^\top=I\), and the whitened second endpoint is \(UCU^\top\). Spectral powers commute with orthogonal conjugation, so transforming back gives the congruence identity.</p>
<p>Using congruence, the symmetry identity reduces to \(I\#_tC=C\#_{1-t}I=C^t\). Inversion follows directly because \(A^{1/2}B^{-1}A^{1/2}=C^{-1}\). Homogeneity follows by taking \(S=\sqrt c\,I\), for \(c&gt;0\). Finally, \(\det C=\det B/\det A\), while \(\det e^H=e^{\operatorname{tr}H}\), proving the two determinant formulas.</p>

<details class="blog-proof">

<summary>Why joint monotonicity also holds</summary>

<div class="blog-proof-body" markdown="1">

<p>For \(0&lt;t&lt;1\), scalar integration gives \(r^t=(\sin\pi t/\pi)\int_0^\infty \lambda^{t-1}r/(r+\lambda)\,d\lambda\). Applying this identity spectrally to \(C\) yields</p>

$$
A\#_tB=\frac{\sin\pi t}{\pi}
 \int_0^\infty\lambda^{t-1}(A^{-1}+\lambda B^{-1})^{-1}\,d\lambda.
$$

<p>Inversion reverses positive definite order. Increasing \(A\) and \(B\) therefore decreases the sum of inverses, then increases its inverse. Integration preserves the order. The endpoint cases are immediate. \(\square\)</p>
</div>

</details>

</div>

</details>

<p>The log-Euclidean mean also has endpoint symmetry, homogeneity, inverse compatibility, and orthogonal equivariance. It is <em>not</em> generally equivariant under arbitrary invertible congruences, nor jointly monotone in Löwner order. Noncommutativity is the obstruction; the matrix exponential does not preserve arbitrary Löwner inequalities.</p>
<p>A useful warning follows just from determinants: whenever \(E_t(A,B)\) and \(A\#_tB\) differ, neither is above the other in Löwner order. Indeed, \(P\preceq Q\) for positive definite matrices with equal determinants forces \(P=Q\): all eigenvalues of \(P^{-1/2}QP^{-1/2}\) are at least one and their product is one.</p>

## An operator arithmetic–geometric–harmonic inequality

<p id="theorem-2"><strong>Theorem 2 (an order sandwich).</strong> Define the weighted harmonic mean \(A!_tB=((1-t)A^{-1}+tB^{-1})^{-1}\). Then</p>

$$
A!_tB\preceq A\#_tB\preceq A\nabla_tB.
$$

<p>For \(0&lt;t&lt;1\), equality of either pair of matrices holds exactly when \(A=B\). Thus Kubo–Ando geometry retains the scalar harmonic–geometric–arithmetic ordering in every direction. This statement is about \(\#_t\), not a claimed order sandwich for \(E_t\).</p>

<details class="blog-proof">

<summary>Proof: the scalar inequality in relative coordinates</summary>

<div class="blog-proof-body" markdown="1">

<p>For \(r&gt;0\), scalar weighted AM–GM and its reciprocal give</p>

$$
\big((1-t)+t/r\big)^{-1}\le r^t\le(1-t)+tr.
$$

<p>Apply these scalar inequalities to every eigenvalue of \(C\), then multiply on the left and right by \(A^{1/2}\). The three expressions become exactly the harmonic, geometric, and arithmetic matrix means above. For interior weights, scalar equality requires every eigenvalue of \(C\) to be one, hence \(A=B\). A nonzero difference in these inequalities need not be positive definite: some generalized eigenvalues may already equal one. \(\square\)</p>
</div>

</details>

## The operator logarithmic mean {#a-third-object-the-logarithmic-mean}

<p>Now average the <em>whole Kubo–Ando path</em> using an ordinary matrix integral. This defines the <em>operator logarithmic mean</em>, denoted here by \(\mathcal L\):</p>

$$
\mathcal L(A,B)=\int_0^1 A\#_tB\,dt.
$$

<p id="theorem-3"><strong>Theorem 3 (integrating a geometric path).</strong> With the same relative matrix \(C\),</p>

$$
\mathcal L(A,B)=A^{1/2}\ell(C)A^{1/2},
$$

$$
\ell(r)=\begin{cases}\dfrac{r-1}{\log r},&r\ne1,\\1,&r=1.\end{cases}
$$

$$
A\#B\preceq\mathcal L(A,B)\preceq\frac{A+B}{2}.
$$

<details class="blog-proof">

<summary>Proof: integrate each relative eigenvalue</summary>

<div class="blog-proof-body" markdown="1">

<p>Diagonalize \(C\). For each eigenvalue \(r&gt;0\), \(\int_0^1r^t\,dt=\ell(r)\); the value at one is its continuous limit. This proves the formula without dividing by a potentially singular matrix \(\log C\).</p>
<p>The scalar inequality \(r^t+r^{1-t}\ge2\sqrt r\), integrated over \([0,1]\), gives \(\sqrt r\le\ell(r)\). Integrating \(r^t\le(1-t)+tr\) gives \(\ell(r)\le(1+r)/2\). Apply spectral calculus and congruence once more. Both matrix equalities require \(A=B\). \(\square\)</p>
</div>

</details>

<p>The logarithmic mean is symmetric: exchanging \(A,B\) reverses \(t\) to \(1-t\) in the integral. Joint monotonicity and congruence equivariance pass through the integral as well. But it is <em>not</em> the log-Euclidean geometric midpoint. Already for positive numbers,</p>

$$
E_{1/2}(1,4)=1\#4=2,
$$

$$
\mathcal L(1,4)=\frac3{\log4}\simeq2.164.
$$

<p>This separates the names cleanly. <em>Log-Euclidean</em> means average the logarithms and exponentiate. <em>Logarithmic mean</em> means integrate the relative geometric interpolation. The latter produces one fixed matrix for the chosen endpoints; it does not move when we change the observation time \(t\).</p>
<table><thead><tr><th>Mean</th><th>Construction</th><th>For \(1,4\)</th></tr></thead><tbody>
<tr><td>Log-Euclidean geometric</td><td>Average logs, then exponentiate</td><td>\(2\)</td></tr>
<tr><td>Kubo–Ando geometric</td><td>Take a relative square root</td><td>\(2\)</td></tr>
<tr><td>Logarithmic</td><td>Average the whole Kubo–Ando path</td><td>\(3/\log4\)</td></tr>
</tbody></table>

### Relation to log-Euclidean geometry {#a-genuine-bridge-to-log-euclidean-geometry}

<p>There is nevertheless a simple limiting connection—not by averaging time, but by shrinking matrix powers toward the identity.</p>
<p id="proposition-2"><strong>Proposition 2 (small-power limit).</strong> For fixed positive definite \(A,B\) and \(t\in[0,1]\),</p>

$$
\lim_{r\to0}(A^r\#_tB^r)^{1/r}=E_t(A,B).
$$

<details class="blog-proof">

<summary>Proof: near the identity, noncommuting products agree to first order</summary>

<div class="blog-proof-body" markdown="1">

<p>Write \(H=\log A\), \(K=\log B\). Matrix Taylor expansions give \(A^{\pm r/2}=I\pm rH/2+O(r^2)\) and \(B^r=I+rK+O(r^2)\). Hence</p>

$$
A^{-r/2}B^rA^{-r/2}=I+r(K-H)+O(r^2),
$$

$$
A^r\#_tB^r=I+r\big((1-t)H+tK\big)+O(r^2).
$$

<p>Taking its symmetric logarithm and dividing by \(r\ne0\) gives \((1-t)H+tK+O(r)\). Exponentiating proves the limit. All remainders are in a matrix norm for these fixed matrices; no commutation assumption was made. \(\square\)</p>
</div>

</details>

## Axiomatic characterizations {#which-axioms-select-the-mean}

<p>The formulas above are natural, but do their properties <em>force</em> them? There are two distinct questions: what counts as a matrix mean, and which additional principles distinguish one mean from another?</p>
<p>For this discussion, a <em>matrix mean</em> is a map \(M:\mathbb P_d\times\mathbb P_d\to\mathbb P_d\), where \(\mathbb P_d=\mathbb S_{++}^d\), which is normalized by \(M(A,A)=A\) and jointly monotone in the Löwner order. If \(A\preceq B\), these conditions imply \(A\preceq M(A,B)\preceq B\). They do not impose symmetry, which would exclude weighted means. This is a convenient working definition, not the full Kubo–Ando axiomatization: that theory additionally uses a transformer inequality and continuity from above on positive semidefinite operators <a href="#ref-kubo">[7]</a>, <a href="#ref-connections">[10]</a>.</p>
<p>In particular, <em>Kubo–Ando mean</em> names a whole class, not just the geometric mean. Arithmetic, harmonic, geometric, and logarithmic means all satisfy congruence equivariance. Coordinate invariance alone cannot choose between them.</p>

### Characterization of the geometric midpoint {#the-geometric-midpoint-three-invariances-suffice}

<p id="theorem-4"><strong>Theorem 4 (invariance determines the geometric midpoint).</strong> The only map \(M:\mathbb P_d\times\mathbb P_d\to\mathbb P_d\) satisfying the following three identities, for all \(A,B\) and every invertible \(S\), is \(M(A,B)=A\#B\):</p>

$$
M(SAS^\top,SBS^\top)=SM(A,B)S^\top
,
$$

$$
M(B,A)=M(A,B),
$$

$$
M(A^{-1},B^{-1})=M(A,B)^{-1}.
$$

<p>These express <em>congruence equivariance</em>, <em>symmetry</em>, and <em>inverse compatibility</em> (also called self-duality). Positivity of the output and these identities suffice: normalization, continuity, and monotonicity need not be assumed for this uniqueness statement. They follow because the resulting operation is the geometric mean.</p>

<details class="blog-proof">

<summary>Proof: normalize, swap, and invert</summary>

<div class="blog-proof-body" markdown="1">

<p>Theorem 1 shows that \(A\#B\) satisfies the identities. For uniqueness, congruence reduces the problem to the pair \(I,C\), where \(C=A^{-1/2}BA^{-1/2}\). Set \(X=M(I,C)\) and \(D=C^{1/2}\). Apply congruence to the pair \(C^{-1},I\), then use symmetry and inverse compatibility:</p>

$$
X=D\,M(C^{-1},I)\,D=DX^{-1}D.
$$

<p>Consequently \(Y=D^{-1/2}XD^{-1/2}\) is positive definite and satisfies \(Y=Y^{-1}\). Each eigenvalue is positive and squares to one, so \(Y=I\). Thus \(X=D=C^{1/2}\). Transforming back gives</p>

$$
M(A,B)=A^{1/2}C^{1/2}A^{1/2}=A\#B.
$$

<p>No order or regularity assumption entered the argument. \(\square\)</p>

</div>

</details>

<p>Full congruence equivariance matters: the log-Euclidean midpoint has symmetry and inverse compatibility, but not equivariance under every invertible change of coordinates. Conversely, the arithmetic midpoint is symmetric and congruence-equivariant, but fails inverse compatibility. Another standard characterization uses congruence equivariance together with agreement with the scalar geometric mean on diagonal matrices <a href="#ref-bini-iannazzo">[11]</a>.</p>

### Midpoint consistency and geometric interpolation {#the-interpolation-make-midpoints-consistent}

<p>For a whole interpolation, the natural exchange law is \(M_t(A,B)=M_{1-t}(B,A)\). Even with congruence and inverse compatibility, this does not fix the speed along the path: replacing \(t\) by an increasing continuous \(h(t)\), with \(h(0)=0\), \(h(1)=1\), and \(h(1-t)=1-h(t)\), preserves those laws. The missing requirement is that <em>every temporal midpoint is the geometric midpoint of its endpoints</em>.</p>

<p id="theorem-5"><strong>Theorem 5 (midpoint consistency determines the path).</strong> The unique continuous path \(\gamma:[0,1]\to\mathbb P_d\) satisfying the following identities, with the midpoint condition holding for every \(s,t\in[0,1]\),</p>

$$
\gamma(0)=A,\qquad \gamma(1)=B,
$$

$$
\gamma\!\left(\frac{s+t}{2}\right)
=\gamma(s)\#\gamma(t)
$$

<p>is \(\gamma(t)=A\#_tB\).</p>

<details class="blog-proof">

<summary>Proof: dyadic subdivision fixes every time</summary>

<div class="blog-proof-body" markdown="1">

<p>For existence, whiten by \(A^{-1/2}\). The candidate path becomes \(C^t\), and its matrices commute. Their geometric midpoint is \(C^s\#C^t=C^{(s+t)/2}\); congruence proves the midpoint identity. The same calculation gives the useful subpath identity, for all \(s,t,u\in[0,1]\),</p>

$$
\gamma(s)\#_u\gamma(t)
=\gamma((1-u)s+ut).
$$

<p>For uniqueness, the endpoint midpoint is forced, then the midpoints of the two halves are forced, and so on. This determines \(\gamma(j/2^k)\) for every dyadic time. Continuity extends equality from this dense set to all of \([0,1]\). Thus midpoint consistency fixes both the path and its parametrization. \(\square\)</p>

</div>

</details>

### Subdivision consistency and the logarithmic mean {#the-logarithmic-mean-average-consistently-over-subdivisions}

<p>The logarithmic mean is selected by a different principle: split the geometric path into equal halves, average each half, then average the two answers <em>arithmetically</em>. Its integral representation is standard <a href="#ref-raissouli-furuichi">[12]</a>; the following elementary characterization follows directly from subdivision.</p>

<p id="theorem-6"><strong>Theorem 6 (subdivision consistency determines the logarithmic mean).</strong> Let \(N:\mathbb P_d\times\mathbb P_d\to\mathbb P_d\) be continuous and satisfy \(N(A,A)=A\). If, for every pair \(A,B\), writing \(G=A\#B\),</p>

$$
N(A,B)=\frac{N(A,G)+N(G,B)}2,
$$

<p>then necessarily</p>

$$
N(A,B)=\mathcal L(A,B)=\int_0^1 A\#_tB\,dt.
$$

<p>Conversely, the logarithmic mean satisfies this identity. No monotonicity or congruence assumption is needed for uniqueness here either.</p>

<details class="blog-proof">

<summary>Proof: repeated subdivision becomes a Riemann sum</summary>

<div class="blog-proof-body" markdown="1">

<p>Set \(\gamma(t)=A\#_tB\) and \(t_j=j/2^k\). By Theorem 5, every geometric midpoint of points on this path is its temporal midpoint. Iterating the subdivision identity therefore gives</p>

$$
N(A,B)=\frac1{2^k}\sum_{j=0}^{2^k-1}
N\big(\gamma(t_j),\gamma(t_{j+1})\big).
$$

<p>The image \(K=\gamma([0,1])\) is compact. Continuity of \(N\) makes it uniformly continuous on \(K\times K\), and adjacent points on the path approach each other uniformly. Using \(N(X,X)=X\), we obtain</p>

$$
\max_{0\le j<2^k}
\big\|N\big(\gamma(t_j),\gamma(t_{j+1})\big)
-\gamma(t_j)\big\|_{\mathrm F}
\longrightarrow0.
$$

<p>The preceding average has the same limit as the left-endpoint Riemann sums for \(\gamma\), proving the integral formula.</p>
<p>Conversely, Theorem 5 identifies \(A\#_uG=\gamma(u/2)\) and \(G\#_uB=\gamma((1+u)/2)\). Splitting the integral at \(1/2\) gives exactly the subdivision identity. Normalization and continuity of \(\mathcal L\) follow from those of the geometric interpolation. \(\square\)</p>

</div>

</details>

<p>The logarithmic mean is <em>not</em> inverse-compatible, already for scalars:</p>

$$
\mathcal L(1,1/4)=\frac3{4\log4}
\ne\frac{\log4}{3}=\mathcal L(1,4)^{-1}.
$$

<p>These characterizations distinguish the three constructions. Congruence equivariance, symmetry, and inverse compatibility determine the <em>geometric midpoint</em>. Midpoint consistency determines its <em>constant-speed path</em>, while arithmetic averaging over equal subdivisions determines the <em>logarithmic path average</em>.</p>

## The Gaussian optimal transport map {#a-gaussian-transport-map-hidden-in-a-geometric-mean}

<p>Here is a useful connection to <a href="{{ '/blog/preparations/bures-distance-square-root-covariances.html' | relative_url }}">Bures geometry and Gaussian optimal transport</a>. The optimal quadratic-cost transport from \(\mathcal N(0,A)\) to \(\mathcal N(0,B)\) is \(x\mapsto Tx\), where</p>

$$
\begin{aligned}
 T&=A^{-1}\#B\\
 &=A^{-1/2}(A^{1/2}BA^{1/2})^{1/2}A^{-1/2},\\
 T^{-1}&=A\#B^{-1}.
 \end{aligned}
$$

<details class="blog-proof">

<summary>Proof: the covariance transport equation is the same square-root equation</summary>

<div class="blog-proof-body" markdown="1">

<p>A symmetric positive definite transport matrix must satisfy \(TAT=B\). Proposition 1, with first argument \(A^{-1}\), identifies its unique solution as \(A^{-1}\#B\). To verify optimality directly, for every \(x,y\),</p>

$$
2x^\top y\le x^\top Tx+y^\top T^{-1}y.
$$

<p>The difference is \(|T^{1/2}x-T^{-1/2}y|^2\). In a coupling with these Gaussian marginals, the expectation of the right-hand side is fixed. Equality is attained by \(Y=TX\), which has covariance \(B\); this maximizes \(\mathbb E[X^\top Y]\), hence minimizes \(\mathbb E|X-Y|^2\). Inverse compatibility of \(\#\) gives the formula for \(T^{-1}\). \(\square\)</p>
</div>

</details>

<p>Notice the roles: \(A^{-1}\#B\) is a <em>map</em>, whereas \(A\#B\) is an averaged covariance. The Bures covariance path \(((1-t)I+tT)A((1-t)I+tT)\) is yet another interpolation. Even for scalar variances \(a,b\), it is \(((1-t)\sqrt a+t\sqrt b)^2\), not \(a^{1-t}b^t\).</p>

## Numerical experimentation

<p>Compare log-Euclidean and Kubo–Ando interpolation between two covariance ellipses. Both panels share endpoints, time, axes, and scale; blue to red is linear in \(t\). The rotation slider turns the red covariance relative to the fixed blue axes. The anisotropy slider changes their common major-to-minor radius ratio while preserving each endpoint’s area; ratio one gives circles. Relative overall size is set by the preset, and the time slider remains independent. With common axes, the two geometric paths agree—but the logarithmic mean remains a different object.</p>
<p>Enable the teal logarithmic-mean overlay to see \(\mathcal L(A,B)\), the <em>fixed time-average</em> of the Kubo–Ando path. The scalar preset uses \(A=I,B=4I\): at \(t=1/2\), both geometric paths give \(2I\), while the overlay is \((3/\log4)I\). Covariance eigenvalues are squared radii, so the ellipse radii are their square roots.</p>
<iframe class="idea-experiment" data-experiment="positive-matrix-means" src="{{ '/blog/preparations/assets/positive-matrix-means/index.html' | relative_url }}" title="Compare log-Euclidean and Kubo–Ando covariance interpolations, with a fixed logarithmic-mean overlay" loading="lazy" style="height:1250px"></iframe>
<p class="caption">The figures evaluate the spectral formulas, not fitted approximations. Every control keeps both endpoints strictly positive definite. The two moving matrices have the same determinant \((\det A)^{1-t}(\det B)^t\); the logarithmic time-average generally does not. Equal determinant fixes ellipse area, not orientation or anisotropy.</p>

## Bibliography

<ol class="references">
<li id="ref-arsigny">Vincent Arsigny, Pierre Fillard, Xavier Pennec, and Nicholas Ayache. <em>Log-Euclidean Metrics for Fast and Simple Calculus on Diffusion Tensors.</em> Magnetic Resonance in Medicine <strong>56</strong>(2), 411–421, 2006. <a href="https://doi.org/10.1002/mrm.20965">Paper</a>.</li>
<li id="ref-pennec">Xavier Pennec, Pierre Fillard, and Nicholas Ayache. <em>A Riemannian Framework for Tensor Computing.</em> International Journal of Computer Vision <strong>66</strong>, 41–66, 2006. <a href="https://doi.org/10.1007/s11263-005-3222-z">Paper</a>.</li>
<li id="ref-tuzel">Oncel Tuzel, Fatih Porikli, and Peter Meer. <em>Region Covariance: A Fast Descriptor for Detection and Classification.</em> ECCV 2006, 589–600. <a href="https://doi.org/10.1007/11744047_45">Paper</a>.</li>
<li id="ref-tracker">Fatih Porikli and Oncel Tuzel. <em>Covariance Tracker.</em> MERL Technical Report TR2006-042, 2006. <a href="https://www.merl.com/publications/docs/TR2006-042.pdf">Report</a>.</li>
<li id="ref-arsigny-siam">Vincent Arsigny, Pierre Fillard, Xavier Pennec, and Nicholas Ayache. <em>Geometric Means in a Novel Vector Space Structure on Symmetric Positive-Definite Matrices.</em> SIAM Journal on Matrix Analysis and Applications <strong>29</strong>(1), 328–347, 2007. <a href="https://doi.org/10.1137/050637996">Paper</a>.</li>
<li id="ref-pusz">Wiesław Pusz and Stanisław L. Woronowicz. <em>Functional calculus for sesquilinear forms and the purification map.</em> Reports on Mathematical Physics <strong>8</strong>(2), 159–170, 1975. <a href="https://doi.org/10.1016/0034-4877(75)90061-0">Paper</a>.</li>
<li id="ref-kubo">Fumio Kubo and Tsuyoshi Ando. <em>Means of positive linear operators.</em> Mathematische Annalen <strong>246</strong>, 205–224, 1980. <a href="https://doi.org/10.1007/BF01371042">Paper</a>.</li>
<li id="ref-moakher">Maher Moakher. <em>A Differential Geometric Approach to the Geometric Mean of Symmetric Positive-Definite Matrices.</em> SIAM Journal on Matrix Analysis and Applications <strong>26</strong>(3), 735–747, 2005. <a href="https://doi.org/10.1137/S0895479803436937">Paper</a>.</li>
<li id="ref-bhatia">Rajendra Bhatia and John Holbrook. <em>Riemannian geometry and matrix geometric means.</em> Linear Algebra and its Applications <strong>413</strong>, 594–618, 2006. <a href="https://doi.org/10.1016/j.laa.2005.08.025">Paper</a>.</li>
<li id="ref-connections">Pattrawut Chansangiam and Wicharn Lewkeeratiyutkul. <em>Characterizations of Connections for Positive Operators.</em> arXiv:1208.4912, 2012. <a href="https://arxiv.org/abs/1208.4912">Paper</a>.</li>
<li id="ref-bini-iannazzo">Dario A. Bini and Bruno Iannazzo. <em>Computational aspects of the geometric mean of two matrices: a survey.</em> Acta Scientiarum Mathematicarum <strong>90</strong>, 349–389, 2024. <a href="https://doi.org/10.1007/s44146-024-00155-5">Paper</a>.</li>
<li id="ref-raissouli-furuichi">Mustapha Raïssouli and Shigeru Furuichi. <em>On weighted means and their inequalities.</em> Journal of Inequalities and Applications <strong>2021</strong>, article 65, 2021. <a href="https://doi.org/10.1186/s13660-021-02589-9">Paper</a>.</li>
</ol>
