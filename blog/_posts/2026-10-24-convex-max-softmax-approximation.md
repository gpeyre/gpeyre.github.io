---
title: Convex approximation with max and softmax layers
subtitle: Supporting planes give a remarkably simple universal network. Smoothing
  the maximum makes the network differentiable—but introduces a second approximation
  scale.
description: Constructive universal approximation of convex functions by max-affine
  and log-sum-exp networks, with proofs, rates, and interactive experiments.
date: '2026-10-24'
topic: Neural networks
keywords:
- convex function approximation
- universal approximation
- max-affine networks
- maxout
- softmax
- log-sum-exp
- LSE
- supporting hyperplanes
- affine minorants
- polyhedral convex functions
- tangent planes
- approximation rates
- sharp lower bounds
- covering nets
- temperature scaling
- bounded weights
- smooth maximum
- Hessian covariance
- convex regression
- input convex neural networks
- ICNN
- optimal transport potentials
- Adam optimizer
- 3D surface visualization
- Giuseppe Calafiore
- Stéphane Gaubert
- Corrado Possieri
- Ian Goodfellow
- Tyrrell Rockafellar
- approximation convexe
- réseaux de neurones convexes
- plans d'appui
- taux d'approximation
- maximum lissé
proofs: true
---

When learning an energy, it is often worth building its geometry into the model. A convex objective has no spurious local minima on a convex domain, and many algorithms can exploit that structure. In quadratic optimal transport, the optimal map is the gradient of a convex potential when the source measure has a density and both measures have finite second moments. These are good reasons to use neural architectures that represent convex functions by construction [[7]](#ref-icnn), [[8]](#ref-ot).

One architecture is especially transparent: compute several affine functions, then take their maximum. To approximate a convex target, choose these functions as supporting planes; their maximum forms a polyhedral surface beneath the graph. Replacing the maximum by a log-sum-exp gives a smooth surface. We will separate three questions: can these networks approximate every convex function, how many planes are needed, and what does smoothing cost?

<!--more-->

## A network made of supporting planes

For vectors $$a_i\in\mathbb R^d$$ and offsets $$b_i\in\mathbb R$$, set

$$
\ell_i(x)=a_i\cdot x+b_i,\qquad
M_N(x)=\max_{1\le i\le N}\ell_i(x).
$$

Here a *two-layer max network* means one affine feature layer with $$N$$ outputs, followed by one scalar maximum. This is a maxout unit [[3]](#ref-maxout), not a sum of coordinatewise ReLUs. The weights $$a_i,b_i$$ can have either sign: the final maximum guarantees convexity.

The geometric starting point is classical convex analysis: a proper lower semicontinuous convex function is the supremum of its affine minorants, the affine functions lying below it [[1]](#ref-rockafellar). Compactness turns this infinite description into a finite approximation.

<span id="theorem-1"></span>

**Theorem 1 (universality of max-affine networks).** Let $$K\subset\mathbb R^d$$ be nonempty, compact and convex, and let $$f:K\to\mathbb R$$ be continuous and convex. For every $$\varepsilon>0$$, there is a max-affine network $$M_N$$ such that

$$
0\le f(x)-M_N(x)<\varepsilon
\qquad\text{for every }x\in K.
$$

<details class="blog-proof">
<summary>Proof: one good plane near each point, then compactness</summary>

<div class="blog-proof-body" markdown="1">

Extend $$f$$ by $$+\infty$$ outside $$K$$. This is a proper lower semicontinuous convex function, so the affine-minorant representation applies. Geometrically, it comes from separating points below the graph from the closed convex epigraph. For each $$z\in K$$, choose an affine function $$\ell_z\le f$$ on $$K$$ with

$$
f(z)-\ell_z(z)<\varepsilon.
$$

By continuity, this inequality persists in a relative neighborhood of $$z$$. These neighborhoods cover $$K$$; compactness gives a finite subcover, associated with planes $$\ell_1,\ldots,\ell_N$$. Their maximum is below $$f$$ everywhere, and at every point at least one plane is within $$\varepsilon$$ of $$f$$. This proves the result.

No differentiability or interior assumption is needed. In particular, a plane need not touch the graph exactly at a boundary point: an arbitrarily small gap is enough.

</div>
</details>

## How many planes are needed?

Write $$\Vert g\Vert_\infty=\sup_{x\in K}\vert g(x)\vert$$. Theorem 1 gives no bound on $$N$$. If the target is smooth, tangent planes have a quadratic local error, and a grid gives an explicit rate. An $$h$$-net means that every point of $$K$$ is within distance $$h$$ of one of the chosen points.

<span id="theorem-2"></span>

**Theorem 2 (a constructive smooth rate).** Suppose that $$f$$ is convex and continuously differentiable on a neighborhood of the compact convex set $$K$$, with $$\beta$$-Lipschitz gradient on $$K$$. If $$z_1,\ldots,z_N\in K$$ form an $$h$$-net, the tangent-plane maximum satisfies

$$
0\le f(x)-M_N(x)\le \frac{\beta h^2}{2},
\qquad
M_N(x)=\max_i\bigl[f(z_i)+\nabla f(z_i)\cdot(x-z_i)\bigr].
$$

In particular, on $$K=[0,1]^d$$, use a grid with $$m+1$$ equally spaced points per coordinate, where $$m\ge1$$. Then $$N=(m+1)^d$$, $$h\le\sqrt d/(2m)$$, and

$$
\|f-M_N\|_\infty\le \frac{\beta d}{8m^2}
=O(N^{-2/d}).
$$

<details class="blog-proof">
<summary>Proof: integrate the gradient along a segment</summary>

<div class="blog-proof-body" markdown="1">

For $$z,x\in K$$, convexity gives the lower bound, while

$$
\begin{aligned}
f(x)-f(z)-\nabla f(z)\cdot(x-z)
&=\int_0^1
\bigl[\nabla f(z+t(x-z))-\nabla f(z)\bigr]\cdot(x-z)\,dt\\
&\le\int_0^1\beta t\|x-z\|^2\,dt
=\frac{\beta}{2}\|x-z\|^2.
\end{aligned}
$$

Choose a point of the net at distance at most $$h$$, and use that $$M_N$$ is at least its tangent plane.

</div>
</details>

The exponent reflects the dimension: reducing the error by a factor of four requires roughly $$2^d$$ times as many planes. For a merely $$L$$-Lipschitz convex function on a neighborhood of $$K$$, bounded subgradients give the coarser estimate $$2Lh$$, hence $$L\sqrt d/m=O(N^{-1/d})$$ on this grid.

<details class="blog-proof">
<summary>Why bounded slopes give the Lipschitz estimate</summary>

<div class="blog-proof-body" markdown="1">

At each $$z_i$$, choose $$p_i\in\partial f(z_i)$$, with $$\|p_i\|\le L$$, and use $$\ell_i(x)=f(z_i)+p_i\cdot(x-z_i)$$. If $$\|x-z_i\|\le h$$, then

$$
0\le f(x)-M_N(x)
\le f(x)-f(z_i)-p_i\cdot(x-z_i)\le2Lh.
$$

</div>
</details>

This nonsmooth estimate is a bound for a uniform grid, not an optimal rate for the whole Lipschitz convex class. Adaptive plane placement can improve it; this distinction is important in max-affine convex regression [[4]](#ref-balazs).

The smooth exponent $$2/d$$ cannot generally be improved by a clever choice of planes. Even a quadratic already forces it.

<span id="proposition-1"></span>

**Proposition 1 (the smooth exponent is sharp).** For $$q(x)=\|x\|^2/2$$ on $$[0,1]^d$$, every maximum of $$N$$ affine functions satisfies

$$
\|q-M_N\|_\infty\ge \frac{1}{16N^{2/d}}.
$$

<details class="blog-proof">
<summary>Proof: an affine patch cannot be too large</summary>

<div class="blog-proof-body" markdown="1">

Write $$\varepsilon=\|q-M_N\|_\infty$$. Intersect each affine branch's active region with the cube. This is a convex set on which $$M_N$$ is affine. For two points $$x,y$$ in the same such set, the affine midpoint terms cancel, giving

$$
\frac{\|x-y\|^2}{8}
=\frac{q(x)+q(y)}2-q\!\left(\frac{x+y}2\right)
\le 2\varepsilon.
$$

Thus each active region has diameter at most $$4\sqrt\varepsilon$$, and is contained in a coordinate box of volume at most $$(4\sqrt\varepsilon)^d$$. The $$N$$ regions cover the unit cube, so $$1\le N(4\sqrt\varepsilon)^d$$. Rearranging proves the claim. Notice that we did not assume the approximant lies below the target.

</div>
</details>

## From max to softmax

The smooth analogue is the *log-sum-exp* (LSE) network, at temperature $$\tau>0$$:

$$
S_{N,\tau}(x)=
\tau\log\!\left(\sum_{i=1}^N e^{\ell_i(x)/\tau}\right).
$$

We use “softmax layer” for this scalar smooth maximum. Strictly speaking, the usual vector-valued softmax gives the normalized exponential weights, which appear in its gradient below. The scalar LSE is smooth and convex [[2]](#ref-boyd); its universal approximation properties have been studied explicitly by Calafiore, Gaubert and Possieri [[5]](#ref-lse).

<span id="lemma-1"></span>

**Lemma 1 (smoothing error).** For every $$x$$,

$$
M_N(x)\le S_{N,\tau}(x)\le M_N(x)+\tau\log N.
$$

<details class="blog-proof">
<summary>Proof: subtract the largest exponent</summary>

<div class="blog-proof-body" markdown="1">

Set $$a=M_N(x)$$. Then

$$
S_{N,\tau}(x)=a+\tau\log
\sum_{i=1}^N e^{(\ell_i(x)-a)/\tau}.
$$

Every term is at most $$1$$, and at least one equals $$1$$. The sum therefore lies between $$1$$ and $$N$$. This shifted expression is also the numerically stable way to evaluate LSE [[9]](#ref-stability).

</div>
</details>

<span id="theorem-3"></span>

**Theorem 3 (smooth universality and rate).** Allowing both $$N$$ and $$\tau$$ to vary, LSE networks are uniformly dense in the continuous convex functions on a nonempty compact convex set. More precisely, if affine minorants give $$0\le f-M_N\le\delta_N$$, then

$$
-\delta_N\le S_{N,\tau}-f\le\tau\log N,
\qquad
\|S_{N,\tau}-f\|_\infty
\le\max\{\delta_N,\tau\log N\}.
$$

Thus the smooth grid rate $$O(N^{-2/d})$$ is preserved by choosing $$\tau\log N\le\delta_N$$, for example $$\tau=O(N^{-2/d}/\log N)$$ when $$N>1$$.

<details class="blog-proof">
<summary>Proof: separate the two errors</summary>

<div class="blog-proof-body" markdown="1">

The two-sided estimate follows by combining $$f-\delta_N\le M_N\le f$$ with Lemma 1. The maximum, rather than the sum, of the two error bounds suffices because the errors have opposite signs. For universality, use Theorem 1 with error $$\varepsilon/2$$, then choose $$\tau\log N<\varepsilon/2$$. If $$N=1$$, LSE is exactly the single affine branch, independently of $$\tau$$.

</div>
</details>

The normalization convention matters: replacing the sum by its average gives $$S_{N,\tau}-\tau\log N$$. This is just a constant shift, absorbable into every bias $$b_i$$, so it does not change the approximation class at fixed $$N,\tau$$. It does change the graph when the same tangent planes are used without refitting.

## Temperature, curvature, and the size of the weights

The estimate above proves universality by decreasing temperature as width grows; the bound $$\tau\log N$$ alone proves nothing at fixed temperature. A separate, quantitative obstruction appears if both the temperature and the permitted slopes are fixed: there is then not enough curvature to resolve a corner.

Define $$w_i(x)=e^{\ell_i(x)/\tau}/\sum_j e^{\ell_j(x)/\tau}$$ and $$\bar a(x)=\sum_iw_i(x)a_i$$. Differentiating gives

$$
\nabla S_{N,\tau}=\bar a,\qquad
\nabla^2 S_{N,\tau}
=\frac1\tau\sum_iw_i(a_i-\bar a)(a_i-\bar a)^\top.
$$

If $$\|a_i\|\le A$$, the covariance formula implies $$0\preceq\nabla^2S_{N,\tau}\preceq (A^2/\tau)I$$. Consequently, fixed temperature *and* uniformly bounded slopes prevent arbitrarily accurate approximation of a corner, no matter how large $$N$$ is.

<details class="blog-proof">
<summary>A quantitative example: approximating the absolute value</summary>

<div class="blog-proof-body" markdown="1">

Suppose $$0\le s''\le H$$ on $$[-1,1]$$ and $$\Vert s-\vert\,\cdot\,\vert\Vert_\infty\le\varepsilon$$. For $$0<h\le1$$,

$$
2h-4\varepsilon
\le s(h)+s(-h)-2s(0)\le Hh^2.
$$

The first inequality uses the uniform error at three points; the second follows by integrating $$s''$$. Taking $$h=1/(1+H)$$ yields

$$
\varepsilon\ge\frac{h}{2}-\frac{Hh^2}{4}
\ge\frac{1}{4(1+H)}.
$$

For an LSE network with slopes bounded by $$A$$, use $$H=A^2/\tau$$. This is a joint restriction on temperature and slopes, not a non-universality claim about fixed temperature with unrestricted weights.

</div>
</details>

There is also a parameterization issue. Writing the network as $$\tau\,\mathrm{LSE}((Ax+b)/\tau)$$, the weights and biases entering the standard LSE activation scale like $$1/\tau$$. The physical slopes $$a_i$$ of the planes may stay bounded even while these internal parameters grow. Any theorem imposing bounds on weights must specify which convention it uses.

## Numerical experimentation

The one-dimensional panel illustrates the tangent-plane construction for $$f(x)=x^2/2$$. In two dimensions, we instead *learn the affine pieces* of the max and softmax networks. The target is $$f(x)=x^\top Qx/2$$, with

$$
Q=\begin{pmatrix}1.5&0.4\\0.4&0.8\end{pmatrix}.
$$

Both domains are $$[-1,1]^d$$. The width parameter $$n$$ sets $$n$$ neurons in the 1D reference and $$N=n^2$$ neurons in each 2D network. The 2D planes start from nonuniform, reproducible random initializations. Adam [[10]](#ref-adam) then optimizes their slopes and offsets to minimize sampled mean squared error:

$$
\mathcal L(\theta)=\frac1B\sum_{j=1}^B
\bigl(F_\theta(z_j)-f(z_j)\bigr)^2.
$$

The max and LSE models are fitted independently, rather than sharing a fixed set of supporting planes. Convexity is preserved by their architectures, but the fitted functions can lie on either side of the target. The displays report sampled errors and validation losses, not certificates of global optimality.

<details class="blog-proof">
<summary>Training details</summary>

<div class="blog-proof-body" markdown="1">

Each model takes 2,000 Adam steps. A batch contains 256 stratified random interior points and 32 random boundary points. A separate 33 × 33 validation grid selects the best checkpoint; the 201 × 201 display grid is evaluated afterward. Fixed seeds make the fits reproducible.

For conditioning, hard-max and low-temperature fits use free plane centers and free intercept offsets. This is an invertible reparameterization of the affine coefficients, not a constraint that the planes remain tangent to the quadratic. Every slope and intercept is allowed to change.

</div>
</details>

<style>
#max-experiment{--ink:#24333b;--muted:#617078;--teal:#006f7e;--line:#d8e4e4;--paper:#fff;--soft:#f2f7f7}
#max-experiment,#max-experiment *{box-sizing:border-box}
#max-experiment p{margin:0 0 1.15em}
#max-experiment h3,#max-experiment button,#max-experiment label,#max-experiment output,#max-experiment .caption,#max-experiment .metric{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#max-experiment input:focus-visible,#max-experiment select:focus-visible,#max-experiment button:focus-visible{outline:3px solid #dc9d4e;outline-offset:4px}
#max-experiment{border:1px solid var(--line);background:#f9fbfb;border-radius:9px;padding:23px;margin:30px 0}
#max-experiment h3{margin:0 0 15px;font-size:20px}
#max-experiment .controls{display:grid;grid-template-columns:1fr 1fr;gap:16px 25px;margin-bottom:20px}
#max-experiment .controls label{display:block;font-size:14px;line-height:1.55}
#max-experiment .controls input[type=range]{display:block;width:100%;margin:12px 0 4px;accent-color:var(--teal)}
#max-experiment .controls select{width:100%;font:14px system-ui;padding:7px;border:1px solid #a6bcbe;border-radius:4px;background:white;color:var(--ink)}
#max-experiment .controls output{font-size:13px;font-variant-numeric:tabular-nums;color:var(--teal)}
#max-experiment .controls .check{display:flex;gap:8px;align-items:center}
#max-experiment .controls input[type=checkbox]{accent-color:var(--teal)}
#max-experiment canvas{display:block;max-width:100%;width:100%;background:white;border:1px solid #dfe8e9;border-radius:4px}
#max-experiment .panel-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
#max-experiment .panel-grid h4{font:600 14px/1.5 system-ui;margin:16px 0 8px}
#max-experiment .plot-1d{aspect-ratio:2.45}
#max-experiment .plot-2d{aspect-ratio:1}
#max-experiment .metric{font-size:13px;line-height:1.6;color:var(--muted);margin-top:8px;font-variant-numeric:tabular-nums}
#max-experiment .legend{display:flex;gap:18px;flex-wrap:wrap;font:13px/1.6 system-ui;margin:12px 0}
#max-experiment .legend span::before{content:"";display:inline-block;width:20px;height:3px;background:var(--c);margin-right:6px;vertical-align:middle}
#max-experiment .colorbar{max-width:300px;margin:15px auto 0;font:12px/1.4 system-ui;color:var(--muted)}
#max-experiment .colorbar .ramp{height:12px;border-radius:3px;background:linear-gradient(90deg,#176b9c,#fbfbf9,#b64e36)}
#max-experiment .colorbar .ends{display:flex;justify-content:space-between;margin-top:5px}
#max-experiment noscript{display:block;background:#fff4db;padding:15px;margin-bottom:15px}
#max-experiment button{cursor:pointer;background:#fff;color:var(--teal);border:1px solid #9fb9bb;border-radius:4px;padding:8px 12px;font-size:14px}
#max-experiment .surface-section{margin-top:28px;padding-top:24px;border-top:1px solid var(--line)}
#max-experiment .plot-surface{aspect-ratio:1.08}
#max-experiment .caption{font-size:13px;line-height:1.6;color:var(--muted);margin-top:12px}
@media(max-width:620px){#max-experiment .panel-grid{grid-template-columns:1fr}#max-experiment .controls{gap:12px;grid-template-columns:1fr}#max-experiment{padding:13px}#max-experiment .plot-1d{aspect-ratio:1.65}}
@media print{#max-experiment .controls{display:none}#max-experiment{break-inside:avoid}}
</style>

<section class="experiment" id="max-experiment" aria-label="Interactive max and softmax approximation">
<h3>Learning the affine pieces</h3>
<noscript>Enable JavaScript for the interactive plots. The 1D reference uses tangent planes; the two 2D networks are fitted with Adam.</noscript>
<div class="controls">
<label for="max-width">Width parameter n
<input id="max-width" type="range" min="2" max="18" step="1" value="6">
<output id="max-width-value" for="max-width"></output></label>
<div><label class="check" for="max-auto"><input id="max-auto" type="checkbox" checked> Reduce temperature with network width</label>
<label for="max-temperature">Manual temperature (logarithmic scale)
<input id="max-temperature" type="range" min="-4" max="0" step="0.05" value="-2" disabled>
<output id="max-temperature-value" for="max-temperature max-auto"></output></label></div>
<label for="max-view">Heatmap display
<select id="max-view"><option value="error">Signed approximation error</option><option value="values">Values and level sets</option></select></label>
<div><button id="max-reset" type="button">Reset experiment</button></div>
</div>
<div class="legend"><span style="--c:#24333b">Target</span><span style="--c:#007d85">Max</span><span style="--c:#d16b2f">Softmax / LSE</span></div>
<canvas class="plot-1d" id="max-1d" role="img" aria-label="One-dimensional target, max and softmax curves, with signed residuals below"></canvas>
<p class="metric" id="max-stats-1d"></p>
<p class="metric training-status" id="max-training-status" role="status"></p>
<div class="panel-grid">
<div><h4>2D · Trained max network</h4><canvas class="plot-2d" id="max-2d" role="img" aria-label="Two-dimensional trained max approximation"></canvas></div>
<div><h4>2D · Trained softmax network</h4><canvas class="plot-2d" id="softmax-2d" role="img" aria-label="Two-dimensional trained softmax approximation"></canvas></div>
</div>
<div class="colorbar" id="max-colorbar"><div class="ramp"></div><div class="ends"><span id="max-color-low"></span><span id="max-color-mid"></span><span id="max-color-high"></span></div></div>
<p class="metric" id="max-stats-2d" aria-live="polite"></p>
<p class="metric" id="max-fit-metrics"></p>
<p class="caption">Errors are maxima on a fine evaluation grid, separate from the training samples, not certified suprema. The two heatmaps share a color scale, recomputed after each fit. In error mode, blue means underestimation and red overestimation. In value mode, black contours show the target, white dashed contours the fitted network.</p>
<div class="surface-section" id="max-surfaces">
<h3>3D surface view</h3>
<p class="caption" id="max-3d-description">The learned approximations shown as surfaces: the max has planar faces, while softmax is smooth. Both panels use the same camera and height scale. Adjust the neuron count and temperature above, or rotate the view below.</p>
<div class="controls">
<label for="max-azimuth">Rotation
<input id="max-azimuth" type="range" min="-180" max="180" step="1" value="-45">
<output id="max-azimuth-value" for="max-azimuth"></output></label>
<label for="max-elevation">Elevation
<input id="max-elevation" type="range" min="15" max="70" step="1" value="30">
<output id="max-elevation-value" for="max-elevation"></output></label>
</div>
<div class="panel-grid">
<div><h4>3D · Trained max network</h4><canvas class="plot-surface" id="max-3d" role="img" aria-label="Three-dimensional surface of the trained max-affine approximation" aria-describedby="max-3d-description max-3d-caption max-stats-2d"></canvas></div>
<div><h4>3D · Trained softmax network</h4><canvas class="plot-surface" id="softmax-3d" role="img" aria-label="Three-dimensional surface of the trained smooth log-sum-exp approximation" aria-describedby="max-3d-description max-3d-caption max-stats-2d"></canvas></div>
</div>
<p class="caption" id="max-3d-caption">Teal and orange surfaces show the learned networks, with studio lighting and reflective highlights to reveal facets and curvature. Both panels use the same lighting. Heights are function values, not errors; compare with the target using the 2D contours above. The max shows its planar faces exactly; softmax uses a fine 201 × 201 grid and analytic normals, without smoothing the fitted functions.</p>
</div>
</section>

<script defer src="{{ '/blog/preparations/assets/max-softmax-3d.js' | relative_url }}"></script>
<script defer src="{{ '/blog/preparations/assets/max-softmax.js' | relative_url }}"></script>


The automatic setting uses $$\tau=1/(2n)$$; manual mode lets you explore other temperatures and refits the softmax network. At very low temperature, an LSE can genuinely approach a polyhedral shape even though it is smooth. The fine mesh and analytic normals reduce rendering artifacts without artificially rounding the surface. The smoothing lemma compares max and LSE built from the *same* planes; the two independently trained 2D models need not satisfy that comparison.

## What this buys us—and what it does not

A max-affine epigraph is described by linear inequalities, which is convenient in optimization. Its smooth LSE counterpart provides an explicit gradient and a positive semidefinite Hessian. Both are universal convex models, and their rates expose the usual dependence on dimension. Differences of two LSE networks can in turn represent much richer, nonconvex functions [[6]](#ref-dlse).

Uniform approximation of function values should not be confused with uniform approximation of gradients. Near a genuine corner, the target does not even have a unique gradient. For transport maps or differentiable optimization, the relevant regularity and derivative estimates deserve a separate analysis.

## References

<ol class="references">
<li id="ref-rockafellar">R. Tyrrell Rockafellar. <a href="https://doi.org/10.1515/9781400873173"><em>Convex Analysis.</em></a> Princeton University Press, 1970.</li>
<li id="ref-boyd">Stephen Boyd and Lieven Vandenberghe. <a href="https://web.stanford.edu/~boyd/cvxbook/"><em>Convex Optimization.</em></a> Cambridge University Press, 2004.</li>
<li id="ref-maxout">Ian Goodfellow, David Warde-Farley, Mehdi Mirza, Aaron Courville and Yoshua Bengio. <a href="https://proceedings.mlr.press/v28/goodfellow13.html">Maxout Networks.</a> <em>ICML</em>, PMLR 28(3):1319–1327, 2013.</li>
<li id="ref-balazs">Gábor Balázs, András György and Csaba Szepesvári. <a href="https://proceedings.mlr.press/v38/balazs15.html">Near-optimal max-affine estimators for convex regression.</a> <em>AISTATS</em>, PMLR 38:56–64, 2015.</li>
<li id="ref-lse">Giuseppe C. Calafiore, Stéphane Gaubert and Corrado Possieri. <a href="https://arxiv.org/abs/1806.07850">Log-Sum-Exp Neural Networks and Posynomial Models for Convex and Log-Log-Convex Data.</a> <em>IEEE Transactions on Neural Networks and Learning Systems</em>, 31(3):827–838, 2020. <a href="https://doi.org/10.1109/TNNLS.2019.2910417">DOI</a>.</li>
<li id="ref-dlse">Giuseppe C. Calafiore, Stéphane Gaubert and Corrado Possieri. <a href="https://arxiv.org/abs/1905.08503">A Universal Approximation Result for Difference of Log-Sum-Exp Neural Networks.</a> <em>IEEE Transactions on Neural Networks and Learning Systems</em>, 31(12):5603–5612, 2020.</li>
<li id="ref-icnn">Brandon Amos, Lei Xu and J. Zico Kolter. <a href="https://proceedings.mlr.press/v70/amos17b.html">Input Convex Neural Networks.</a> <em>ICML</em>, PMLR 70:146–155, 2017.</li>
<li id="ref-ot">Ashok Makkuva, Amirhossein Taghvaei, Sewoong Oh and Jason Lee. <a href="https://proceedings.mlr.press/v119/makkuva20a.html">Optimal transport mapping via input convex neural networks.</a> <em>ICML</em>, PMLR 119:6672–6681, 2020.</li>
<li id="ref-stability">Pierre Blanchard, Desmond J. Higham and Nicholas J. Higham. <a href="https://arxiv.org/abs/1909.03469">Accurately computing the log-sum-exp and softmax functions.</a> <em>IMA Journal of Numerical Analysis</em>, 41(4):2311–2330, 2021. <a href="https://doi.org/10.1093/imanum/draa038">DOI</a>.</li>
<li id="ref-adam">Diederik P. Kingma and Jimmy Ba. <a href="https://arxiv.org/abs/1412.6980">Adam: A Method for Stochastic Optimization.</a> <em>ICLR</em>, 2015.</li>
</ol>
