---
title: "Logarithmic Sobolev is a Wasserstein P–L inequality"
subtitle: "An entropy inequality controls both the objective and the distance travelled by a distribution."
description: "Logarithmic Sobolev is the Polyak–Łojasiewicz inequality for entropy in Wasserstein geometry. A finite-length proof turns entropy decay into convergence of distributions."
date: "2026-11-04"
last_modified_at: "2026-11-04T11:34:30Z"
topic: "Wasserstein gradient flows"
keywords:
- "logarithmic Sobolev inequality"
- "log Sobolev"
- "Wasserstein Polyak Lojasiewicz inequality"
- "PL condition"
- "relative entropy"
- "Kullback Leibler divergence"
- "Fisher information"
- "Wasserstein gradient flow"
- "Fokker Planck equation"
- "Ornstein Uhlenbeck semigroup"
- "finite length gradient flows"
- "metric slope"
- "energy dissipation identity"
- "exponential convergence"
- "Talagrand transportation inequality"
- "Gaussian measure"
- "Gross inequality"
- "Bakry Emery criterion"
- "displacement convexity"
- "porous medium equation"
- "nonconvex optimization"
- "nonunique minimizers"
- "Otto Villani"
- "Leonard Gross"
- "Boris Polyak"
- "Stanislaw Lojasiewicz"
- "Felix Otto"
- "Cedric Villani"
- "Gabriel Peyre"
- "inégalité de Sobolev logarithmique"
- "flot de gradient"
- "information de Fisher"
- "Raphaël Barboni"
- "Langevin diffusion"
- "Gaussian mixture"
- "multimodal sampling"
- "metastability"
- "mixture score"
- "Scharfetter Gummel scheme"
proofs: true
embedded_experiment: true
---

<p>I learned this Wasserstein P–L viewpoint from Raphaël Barboni. In particular, he taught me the useful distinction at the heart of this post: the condition can control convergence of the gradient-flow trajectory itself, not merely decay of its objective value.</p>
<p>A small gradient is reassuring only if it means that the objective is nearly minimized. The Polyak–Łojasiewicz condition supplies precisely this guarantee <a href="#ref-pl">[6]</a>. It can yield exponential convergence even without convexity, as in <a href="{{ '/blog/2026/08/14/polyak-lojasiewicz-gradient-flows/' | relative_url }}">Fast gradient flows without convexity</a>.</p>
<p>Now replace a point by a probability distribution, Euclidean distance by quadratic Wasserstein distance, and the objective by relative entropy. The same condition becomes the <em>logarithmic Sobolev inequality</em>. This is more than a dictionary: one short argument shows that the entire distribution converges, not just its entropy. It also explains the implication from logarithmic Sobolev to Talagrand’s transport inequality <a href="#ref-ov">[1]</a>.</p>

<!--more-->

## Entropy has a gradient: Fisher information

<figure class="portrait-pair"><div class="portrait-pair-images"><div><a href="https://as.cornell.edu/people/leonard-gross"><img src="https://as.cornell.edu/sites/default/files/styles/4_5/public/2026-07/leonard-gross.jpg?itok=kmbYIhOU" width="500" height="572" loading="lazy" decoding="async" alt="Portrait of Leonard Gross"><p>Leonard Gross</p></a></div><div><a href="https://www.mis.mpg.de/de/people/felix-otto"><img src="https://www.mis.mpg.de/fileadmin/_processed_/5/e/csm_2655_23a2458343.webp" width="1440" height="810" loading="lazy" decoding="async" alt="Portrait of Felix Otto"><p>Felix Otto</p></a></div></div><figcaption>Gross’s logarithmic Sobolev inequality <a href="#ref-gross">[3]</a> and the Wasserstein viewpoint of Otto and Villani <a href="#ref-ov">[1]</a> meet in the argument below. Institutional portraits linked from <a href="https://as.cornell.edu/people/leonard-gross">Cornell University</a> and the <a href="https://www.mis.mpg.de/de/people/felix-otto">Max Planck Institute for Mathematics in the Sciences</a>; photographers and open reuse licenses are not specified on these profiles.</figcaption></figure>
<p>Let \(\pi(x)=Z^{-1}e^{-V(x)}\) be a smooth positive probability density on \(\mathbb R^d\). We use natural logarithms and write</p>

$$
\mathcal F(\rho)=\operatorname{KL}(\rho\mid\pi)
 =\int\rho\log\frac\rho\pi\,dx,\qquad
 \mathcal I(\rho\mid\pi)=\int\left|\nabla\log\frac\rho\pi\right|^2\rho\,dx.
$$

<p>For the calculations, assume finite second moments and enough smoothness and decay to integrate by parts. If a density moves with velocity \(v\), the continuity equation is \(\partial_t\rho+\nabla\cdot(\rho v)=0\). Differentiating gives</p>

$$
\frac d{dt}\mathcal F(\rho_t)
 =\int\nabla\log(\rho_t/\pi)\cdot v_t\,\rho_t\,dx.
$$

<p>The tangent norm is \(\|v\|_\rho^2=\int|v|^2\rho\). Thus the Wasserstein gradient is represented by \(\nabla\log(\rho/\pi)\), and its squared norm is Fisher information. Its negative gradient flow is</p>

$$
v_t=-\nabla\log(\rho_t/\pi),\qquad
 \partial_t\rho_t=\Delta\rho_t+\nabla\cdot(\rho_t\nabla V).
$$

<p>This is the Fokker–Planck equation. Along a regular solution,</p>

$$
-\frac d{dt}\mathcal F(\rho_t)
 =\mathcal I(\rho_t\mid\pi)
 =|\dot\rho_t|_{W_2}^2.
$$

<p>The equality with metric speed uses the gradient velocity, not an arbitrary velocity solving the same continuity equation. Wasserstein gradient-flow theory makes this identity precise beyond smooth densities <a href="#ref-ags">[2]</a>.</p>

## The P–L condition in disguise

<p id="proposition-1"><strong>Proposition 1 (the dictionary).</strong> Logarithmic Sobolev with constant \(\lambda&gt;0\) is the inequality</p>

$$
\mathcal I(\rho\mid\pi)\ge 2\lambda\operatorname{KL}(\rho\mid\pi).
$$

<p>Equivalently,</p>

$$
\tfrac12\|\operatorname{grad}_{W_2}\mathcal F(\rho)\|_\rho^2
 \ge\lambda(\mathcal F(\rho)-\min\mathcal F).
$$

<p>This is exactly Wasserstein P–L. Consequently,</p>

$$
\mathcal F(\rho_t)\le e^{-2\lambda t}\mathcal F(\rho_0).
$$

<details class="blog-proof">

<summary>Proof: substitute the gradient norm</summary>

<div class="blog-proof-body" markdown="1">
<p>The minimum of relative entropy is zero, attained only at \(\pi\). Substitute the gradient–Fisher identity above. Energy dissipation then gives \(\mathcal F'\le-2\lambda\mathcal F\), and Grönwall gives the decay estimate. \(\square\)</p>
</div>

</details>

<p>The constant convention matters: for the standard Gaussian, \(\lambda=1\). In the classical function formulation, putting \(\rho=h^2\pi/\int h^2d\pi\) turns this into \(\operatorname{Ent}_\pi(h^2)\le(2/\lambda)\int|\nabla h|^2d\pi\). This is the normalization of Gross’s Gaussian inequality <a href="#ref-gross">[3]</a>.</p>

## Why the measures themselves converge

<p>Exponential decay of an objective does not, by itself, imply convergence of its argument. A valley can contain many minimizers; a curve might keep travelling along it. Here the dissipation identity gives the missing control: the curve has finite remaining length.</p>
<p id="theorem-1"><strong>Theorem 1 (finite length under Wasserstein P–L).</strong> Let \(\mathcal G:\mathcal P_2(\mathbb R^d)\to(-\infty,+\infty]\) be lower semicontinuous, with finite infimum \(\mathcal G_\star\). Suppose a global locally absolutely continuous flow, of finite initial energy, has locally absolutely continuous energy \(E\) and satisfies for almost every time</p>

$$
E(t)=\mathcal G(\rho_t)-\mathcal G_\star,\qquad
 -E'(t)=|\dot\rho_t|_{W_2}^2=|\partial\mathcal G|^2(\rho_t),
 \qquad |\partial\mathcal G|^2(\rho_t)\ge2\lambda E(t).
$$

<p>Here \(|\partial\mathcal G|\) is the descending metric slope. Then the flow converges in \(W_2\) to a minimizer \(\rho_\infty\), and</p>

$$
W_2(\rho_t,\rho_\infty)
 \le\sqrt{\frac{2E(t)}\lambda}
 \le\sqrt{\frac{2E(0)}\lambda}\,e^{-\lambda t}.
$$

<details class="blog-proof">

<summary>Proof: differentiate the square root of the energy</summary>

<div class="blog-proof-body" markdown="1">

<p>Write \(s(t)=|\dot\rho_t|_{W_2}\). As long as \(E(t)&gt;0\), dissipation and P–L give</p>

$$
-\frac d{dt}\sqrt{E(t)}
 =\frac{s(t)^2}{2\sqrt{E(t)}}
 \ge\sqrt{\lambda/2}\,s(t).
$$

<p>Integrate from \(a\) to \(b\), and use that distance is bounded by the length of a curve:</p>

$$
W_2(\rho_a,\rho_b)
 \le\int_a^b s(t)\,dt
 \le\sqrt{2/\lambda}\bigl(\sqrt{E(a)}-\sqrt{E(b)}\bigr).
$$

<p>Also \(E'\le-2\lambda E\), so \(E(t)\to0\). The last bound makes the curve Cauchy as time tends to infinity. Completeness of \(\mathcal P_2\) gives a limit, and lower semicontinuity gives \(\mathcal G(\rho_\infty)\le\liminf\mathcal G(\rho_t)=\mathcal G_\star\). Let \(b\to\infty\) in the length bound. If energy reaches zero at a finite time, the dissipation identity makes the curve constant thereafter, with the same conclusion. \(\square\)</p>

</div>

</details>

<aside class="note"><p>This proves convergence to the limit selected by the initial condition. It does <em>not</em> assert that two different flows contract toward one another. Neither uniqueness of the minimizer nor displacement convexity is required in Theorem 1.</p></aside>
<p>For entropy, the minimizer is uniquely \(\pi\). Applying the theorem at time zero gives</p>

$$
W_2(\rho,\pi)^2\le\frac2\lambda\operatorname{KL}(\rho\mid\pi).
$$

<p>This is Talagrand’s quadratic transportation inequality, with the same constant. The calculation proves it for initial data admitting the stated dissipative flow; standard approximation extends it to all finite-entropy data under the usual hypotheses. The full logarithmic-Sobolev-to-transport implication is due to Otto and Villani <a href="#ref-ov">[1]</a>.</p>

## A Gaussian example attaining both rates

<p>Take \(\pi=\mathcal N(0,I)\) and \(\rho_0=\mathcal N(m_0,I)\). The exact flow is \(\rho_t=\mathcal N(e^{-t}m_0,I)\). Hence</p>

$$
\mathcal F(\rho_t)=\tfrac12e^{-2t}|m_0|^2,\qquad
 W_2(\rho_t,\pi)=e^{-t}|m_0|.
$$

<p>The objective decays at rate two, the distance at rate one. Both constants in Theorem 1 are sharp.</p>

<details class="blog-proof">

<summary>Why the Gaussian logarithmic Sobolev constant is one</summary>

<div class="blog-proof-body" markdown="1">

<p>Here is a short semigroup proof for smooth positive densities \(f=d\rho/d\pi\) bounded above and away from zero, with sufficient derivative integrability. Let</p>

$$
P_tf(x)=\mathbb E\,f(e^{-t}x+\sqrt{1-e^{-2t}}Z),\qquad Z\sim\pi.
$$

<p>Gaussian invariance gives \(\int P_tg\,d\pi=\int g\,d\pi\). Differentiation gives \(\nabla P_tf=e^{-t}P_t\nabla f\). Weighted Cauchy–Schwarz therefore yields</p>

$$
\frac{|\nabla P_tf|^2}{P_tf}
 \le e^{-2t}P_t\!\left(\frac{|\nabla f|^2}{f}\right).
$$

<p>After integration, \(\mathcal I(P_tf\,\pi\mid\pi)\le e^{-2t}\mathcal I(f\pi\mid\pi)\). Entropy dissipation and \(P_tf\to1\) give</p>

$$
\operatorname{KL}(f\pi\mid\pi)
 =\int_0^\infty\mathcal I(P_tf\,\pi\mid\pi)\,dt
 \le\tfrac12\mathcal I(f\pi\mid\pi).
$$

<p>Boundedness justifies the entropy limit by dominated convergence. Truncation, smoothing, and lower semicontinuity extend the inequality to its natural finite-information domain. \(\square\)</p>

</div>

</details>

## More than entropy, more than convexity

<p><em>Uniformly convex confinement.</em> If \(\nabla^2V\succeq\lambda I\), the Bakry–Émery criterion gives logarithmic Sobolev with constant \(\lambda\) <a href="#ref-be">[4]</a>. This is a sufficient condition, not a characterization: a bounded perturbation of a uniformly convex potential can preserve a logarithmic Sobolev inequality even when pointwise convexity is lost.</p>
<p><em>A genuinely nonconvex lifted loss.</em> If \(|\nabla h|^2\ge2\lambda(h-h_\star)\), integration proves Wasserstein P–L for \(\mathcal G(\rho)=\int h\,d\rho\) whenever its slope has the expected gradient representation. For instance,</p>

$$
h(x,y)=\tfrac12(y-x^2)^2,\qquad
 |\nabla h|^2=(1+4x^2)(y-x^2)^2\ge2h.
$$

<p>Its minimizers are distributions supported on a parabola. A particle stays in its initial sublevel, which bounds \(|y-x^2|\); the equations \(x'=2x(y-x^2)\), \(y'=-(y-x^2)\) then rule out finite-time escape. Theorem 1 applies to distributional flows for which its finite-moment and full-dissipation assumptions hold. Different initializations can select different minimizing measures.</p>
<p><em>Confined internal energy.</em> For \(m&gt;1\), the functional</p>

$$
\mathcal G(\rho)=\frac1{m-1}\int\rho^m\,dx+
 \frac\lambda2\int|x|^2\rho\,dx
$$

<p>is \(\lambda\)-displacement convex and satisfies Wasserstein P–L with constant \(\lambda\). Indeed, its geodesic subgradient inequality bounds the energy gap by \(|\partial\mathcal G|r-\lambda r^2/2\le|\partial\mathcal G|^2/(2\lambda)\), where \(r\) is the distance to a minimizer. Convexity supplies one route to P–L; the finite-length argument needs only P–L itself. See <em>Optimal Transport for Machine Learners</em> <a href="#ref-book">[5]</a>.</p>

<span id="numerical-experimentation-bending-the-route-to-equilibrium"></span>
<span id="langevin-experiment"></span>

## Numerical experimentation: a narrow Gaussian explores a mixture

<p>A diffusion can quickly settle inside one well and still take a long time to explore the others. Start with a small, translated Gaussian cloud and let it evolve towards an equally weighted mixture of \(k\) Gaussians. The controls change the number of components and move their centers from overlapping to separated positions.</p>

$$
\pi_{k,R}=\frac1k\sum_{j=0}^{k-1}\mathcal N(\mu_j,\sigma^2I_2),
\qquad \mu_j=R\left(\cos\theta_j,\sin\theta_j\right),
\qquad \theta_j=\pi+\frac{2\pi j}{k}.
$$

<p>Here \(\sigma=0.65\) is fixed, while the position slider changes \(R\). For \(k=1\), the single center moves along the negative horizontal axis; for larger \(k\), the centers form a regular polygon. At \(R=0\), every choice of \(k\) gives exactly the same Gaussian target.</p>

<p>With \(V=-\log\pi_{k,R}\), the Langevin equation is \(dX_t=\nabla\log\pi_{k,R}(X_t)\,dt+\sqrt2\,dB_t\). Its drift averages the component centers using the local responsibilities:</p>

$$
\nabla\log\pi_{k,R}(x)
 =\frac{\sum_j w_j(x)\mu_j-x}{\sigma^2},
\qquad
w_j(x)=\frac{e^{-|x-\mu_j|^2/(2\sigma^2)}}
 {\sum_\ell e^{-|x-\mu_\ell|^2/(2\sigma^2)}}.
$$

<p>Every run starts from the <em>same</em> narrow distribution \(\rho_0=\mathcal N(m_0,\tau^2I_2)\), with \(m_0=(-2.2,-0.35)\) and \(\tau=0.3\). Noise strength, physical time, spatial axes, and density colors are identical across settings. Unlike the initial distribution itself, its relative entropy to the target changes with \(k\) and \(R\).</p>

<iframe class="idea-experiment" data-experiment="gaussian-mixture-langevin" src="{{ '/blog/preparations/assets/gaussian-mixture-langevin/index.html' | relative_url }}" title="One Langevin density plot with target contours, time, Gaussian component count and position sliders" loading="lazy" style="height:1100px"></iframe>

<p>For one component, the exact solution stays Gaussian. Its mean and variance are</p>

$$
m_t=\mu_0+(m_0-\mu_0)e^{-t/\sigma^2},
\qquad s_t^2=\sigma^2+(\tau^2-\sigma^2)e^{-2t/\sigma^2}.
$$

<p>This gives an independent check of the numerical evolution. For separated components, low-density passages create a different challenge: a cloud can look equilibrated around its starting mode while still missing much of the target mass.</p>

<p id="proposition-2"><strong>Proposition 2 (separating the modes weakens log-Sobolev).</strong> For fixed \(k\), the optimal log-Sobolev rate \(\lambda_{k,R}\) is nonincreasing in \(R\). It also satisfies</p>

$$
\lambda_{k,R}\le
 \frac{1}{\sigma^2+\lambda_{\max}(\operatorname{Cov}(\mu_J))},
\qquad J\sim\operatorname{Unif}\{0,\ldots,k-1\}.
$$

<p>For \(k=1\), the exact constant is \(\sigma^{-2}\). The upper bound is \((\sigma^2+R^2)^{-1}\) for \(k=2\), and \((\sigma^2+R^2/2)^{-1}\) for \(k\ge3\). These upper bounds are not formulas for the observed decay. Finite Gaussian mixtures do satisfy a positive log-Sobolev inequality; quantitative bounds for Gaussian convolutions are developed in <a href="#ref-mixture-lsi">[8]</a>.</p>

<details class="blog-proof">

<summary>Proof: a linear test and an extra Gaussian smoothing</summary>

<div class="blog-proof-body" markdown="1">

<p><em>The upper bound.</em> Log-Sobolev implies \(\lambda_{k,R}\operatorname{Var}_{\pi_{k,R}}(g)\le\int|\nabla g|^2d\pi_{k,R}\). Test \(g(x)=a\cdot x\) with a unit vector \(a\) maximizing the variance. Since a mixture sample is \(\mu_J+\sigma Z\), its covariance is \(\operatorname{Cov}(\mu_J)+\sigma^2I_2\). This proves the bound, by smooth truncation if needed.</p>

<p><em>Monotonicity in the separation.</em> Write \(C_R=1/\lambda_{k,R}\), and fix \(0\le R_1\le R_2\), with \(R_2&gt;0\). If \(r=R_1/R_2\), \(X\sim\pi_{k,R_2}\), and \(Z'\sim\mathcal N(0,I_2)\) is independent, then</p>

$$
rX+\sigma\sqrt{1-r^2}\,Z'\sim\pi_{k,R_1}.
$$

<p>Apply the product log-Sobolev inequality to \(g(rX+\sigma\sqrt{1-r^2}Z')\). The chain rule gives</p>

$$
C_{R_1}\le r^2C_{R_2}+(1-r^2)\sigma^2
 \le C_{R_2}.
$$

<p>The last inequality uses \(C_{R_2}\ge\sigma^2\), already implied by the linear test. When both radii are zero there is nothing to prove. \(\square\)</p>

</div>

</details>

<aside class="note"><p>Increasing the <em>number</em> of modes is not the same as separating a fixed set of modes. There is no claimed ordering between the \(k=2\) and \(k=3\) trajectories: their distances, passages, and initial errors differ. This is precisely why the figure exposes both controls. See also <a href="#ref-schlichting">[9]</a> for the subtleties of functional inequalities for mixtures.</p></aside>

<p>The plot solves the physical-space Fokker–Planck equation deterministically, using target-preserving Scharfetter–Gummel fluxes and positive implicit steps; see <a href="#ref-sg">[7]</a> for related finite-volume entropy analysis. It uses a large reflecting box. The full-space mathematical statements above and these finite-domain numerical trajectories should not be confused; the plot does not measure the optimal log-Sobolev constant.</p>

## References
<ol class="references">
<li id="ref-ov">Felix Otto and Cédric Villani. <a href="https://doi.org/10.1006/jfan.1999.3557"><em>Generalization of an Inequality by Talagrand and Links with the Logarithmic Sobolev Inequality</em></a>. Journal of Functional Analysis 173(2), 361–400, 2000.</li>
<li id="ref-ags">Luigi Ambrosio, Nicola Gigli, and Giuseppe Savaré. <a href="https://doi.org/10.1007/978-3-7643-8722-8"><em>Gradient Flows in Metric Spaces and in the Space of Probability Measures</em></a>. Second edition, Birkhäuser, 2008.</li>
<li id="ref-gross">Leonard Gross. <a href="https://doi.org/10.2307/2373688"><em>Logarithmic Sobolev Inequalities</em></a>. American Journal of Mathematics 97(4), 1061–1083, 1975.</li>
<li id="ref-be">Dominique Bakry and Michel Émery. <a href="https://www.numdam.org/item/SPS_1985__19__177_0/"><em>Diffusions hypercontractives</em></a>. Séminaire de Probabilités XIX, 177–206, 1985.</li>
<li id="ref-book">Gabriel Peyré. <a href="https://www.gpeyre.com/ot4ml/"><em>Optimal Transport for Machine Learners</em></a>. Book manuscript, 2025–2026.</li>
<li id="ref-pl">Hamed Karimi, Julie Nutini, and Mark Schmidt. <a href="https://arxiv.org/abs/1608.04636"><em>Linear Convergence of Gradient and Proximal-Gradient Methods Under the Polyak–Łojasiewicz Condition</em></a>. ECML PKDD, 2016.</li>
<li id="ref-sg">Claire Chainais-Hillairet and Maxime Herda. <a href="https://doi.org/10.1093/imanum/drz037"><em>Large-time behaviour of a family of finite volume schemes for boundary-driven convection–diffusion equations</em></a>. IMA Journal of Numerical Analysis 40(4), 2473–2504, 2020.</li>
<li id="ref-mixture-lsi">Jean-Baptiste Bardet, Nathaël Gozlan, Florent Malrieu, and Pierre-André Zitt. <a href="https://arxiv.org/abs/1507.02389"><em>Functional inequalities for Gaussian convolutions of compactly supported measures: explicit bounds and dimension dependence</em></a>. 2015.</li>
<li id="ref-schlichting">André Schlichting. <a href="https://doi.org/10.3390/e21010089"><em>Poincaré and log-Sobolev inequalities for mixtures</em></a>. Entropy 21(1), 89, 2019.</li>
</ol>
