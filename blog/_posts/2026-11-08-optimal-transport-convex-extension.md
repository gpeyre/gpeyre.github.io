---
title: "An Axiomatic Definition of the Wasserstein Distance"
subtitle: "A transport plan is a convex decomposition of two distributions into pairs of points."
description: "Kantorovich transport is the largest jointly convex lower-semicontinuous extension of a pointwise cost, with a short proof and interactive transport contours on a three-point probability simplex."
date: "2026-11-08"
topic: "Convex relaxation and optimal transport"
keywords:
  - "optimal transport convex extension"
  - "Kantorovich transport"
  - "convex envelope"
  - "lower convex roof"
  - "joint convexity"
  - "separate convexity"
  - "weak lower semicontinuity"
  - "weak convergence"
  - "Dirac masses"
  - "coupling decomposition"
  - "barycentric representation"
  - "compact metric spaces"
  - "probability measures"
  - "finite-support approximation"
  - "marginal constraints"
  - "mixture convexity"
  - "variance concavity"
  - "transport cost versus distance"
  - "two-point transport"
  - "Kantorovich duality"
  - "supporting hyperplanes"
  - "affine minorants"
  - "dual potentials"
  - "linear programming"
  - "Giuseppe Savaré"
  - "Giacomo Enrico Sodini"
  - "Cédric Villani"
  - "Gabriel Peyré"
  - "extension convexe"
  - "enveloppe convexe"
  - "semi-continuité inférieure"
  - "décomposition convexe"
  - "dualité de Kantorovich"
  - "probability simplex"
  - "barycentric coordinates"
  - "three-point Wasserstein distance"
  - "polyhedral transport balls"
  - "power ground costs"
  - "snowflake metrics"
  - "sublinear transport cost"
proofs: true
embedded_experiment: true
---

<p>Suppose a cost \(c(x,y)\) tells us how expensive it is to move one point to another. How should we extend it to compare two probability distributions? Optimal transport answers by introducing a coupling and minimizing an average cost. But there is another way to arrive at the same construction: ask for the largest extension compatible with convexity and stability under weak limits.</p>
<p>This viewpoint makes the transport plan almost inevitable. A coupling records a way to express a pair of distributions as an average of point-pairs, and convexity puts an upper bound on the cost of every such decomposition. The best of those bounds is precisely the Kantorovich value. Savaré and Sodini develop this relaxation approach in a much more general setting <a href="#ref-savare">[1]</a>; the compact probability version is <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.3.3.35">Theorem 3.35 of my book</a> <a href="#ref-book">[2]</a>.</p>

<!--more-->

## The two requirements

<p>Let \(X,Y\) be compact metric spaces and let \(c:X\times Y\to[0,\infty)\) be continuous. Write \(\mathcal P(X)\) for probability measures on \(X\), and \(\delta_x\) for a unit point mass. We seek a functional \(F(\alpha,\beta)\) which does not exceed \(c(x,y)\) on point masses:</p>

$$
F(\delta_x,\delta_y)\le c(x,y).
$$

<p>The first requirement is <em>joint convexity</em>. Randomizing between two pairs of distributions should not cost more than randomizing their costs:</p>

$$
\begin{aligned}
  F((1-t)\alpha_0+t\alpha_1,\,
    (1-t)\beta_0+t\beta_1)
  \le (1-t)F(\alpha_0,\beta_0)+tF(\alpha_1,\beta_1).
  \end{aligned}
$$

<p>The second is <em>joint weak lower semicontinuity</em>: if both marginals converge weakly, the limiting cost cannot exceed their limiting lower cost,</p>

$$
F(\alpha,\beta)\le\liminf_{j\to\infty}F(\alpha_j,\beta_j).
$$

<p>Weak convergence means convergence of integrals against every continuous test function. It is the natural topology for approximating a distribution by increasingly fine point clouds on a compact space.</p>
<p>These convex combinations mix measures; they do not move particles along Wasserstein geodesics. The theorem concerns convexity in the ordinary linear structure of measures, not displacement convexity.</p>
<p>“Jointly” is essential too. Independent averaging, \(F(\alpha,\beta)=\iint c\,d\alpha\,d\beta\), is affine in each marginal separately. But for \(c(x,y)=|x-y|\) on \(\{0,1\}\), it is zero at both \((\delta_0,\delta_0)\) and \((\delta_1,\delta_1)\), while it is \(1/2\) at their common midpoint. Thus it fails joint convexity. The <a href="{{ '/blog/preparations/when-independence-is-optimal.html' | relative_url }}">post on independence and optimal transport</a> examines this coupling from another angle.</p>

## The maximal extension theorem

<p>Let \(\Pi(\alpha,\beta)\) denote the joint probability measures on \(X\times Y\) with the given marginals. Define</p>

$$
T_c(\alpha,\beta)
  =\min_{\pi\in\Pi(\alpha,\beta)}\int c(x,y)\,d\pi(x,y).
$$

<p>Compactness ensures that the minimum exists. The product law is always feasible, so \(T_c\) is finite.</p>
<p id="theorem-1"><strong>Theorem 1 (the largest convex, weakly lower-semicontinuous extension).</strong> The functional \(T_c\) is jointly convex, jointly weakly lower semicontinuous, and satisfies \(T_c(\delta_x,\delta_y)=c(x,y)\). If a proper functional \(F:\mathcal P(X)\times\mathcal P(Y)\to\mathbb R\cup\{+\infty\}\) has the same convexity and lower-semicontinuity properties and satisfies the Dirac upper bound, then</p>

$$
F(\alpha,\beta)\le T_c(\alpha,\beta)
  \quad\text{for every }\alpha,\beta.
$$

<details class="blog-proof">

<summary>Proof: mix plans, then approximate any plan by finitely many point-pairs</summary>

<div class="blog-proof-body" markdown="1">

<p><em>Step 1: the transport value belongs to the class.</em> If \(\pi_0,\pi_1\) are optimal plans, then \((1-t)\pi_0+t\pi_1\) couples the corresponding mixtures of marginals. Its cost is the mixture of the two optimal costs. Taking the minimum proves joint convexity.</p>
<p>For lower semicontinuity, let \((\alpha_j,\beta_j)\) converge weakly. Choose a subsequence along which the optimal values realize their lower limit, and optimal plans \(\pi_j\). Compactness of \(\mathcal P(X\times Y)\) gives a further convergent subsequence. The limit \(\pi\) has marginals \(\alpha,\beta\), and continuity of \(c\) gives</p>

$$
T_c(\alpha,\beta)\le\int c\,d\pi
  =\lim_j T_c(\alpha_j,\beta_j).
$$

<p>There is only one coupling between two Dirac masses, namely \(\delta_{(x,y)}\), proving the pointwise equality.</p>
<p><em>Step 2: every admissible extension is below it.</em> Fix any \(\pi\in\Pi(\alpha,\beta)\). Partition the compact product into finitely many measurable cells of diameter tending to zero, and place each cell's mass at one representative point. This gives weakly converging finite approximations</p>

$$
\pi_j=\sum_k w_{j,k}\delta_{(x_{j,k},y_{j,k})}.
$$

<p>Their marginals \(\alpha_j,\beta_j\) converge to \(\alpha,\beta\). Finite convexity and the Dirac bound give</p>

$$
\begin{aligned}
  F(\alpha_j,\beta_j)
  &\le\sum_k w_{j,k}F(\delta_{x_{j,k}},\delta_{y_{j,k}})\\
  &\le\sum_k w_{j,k}c(x_{j,k},y_{j,k})
   =\int c\,d\pi_j.
  \end{aligned}
$$

<p>Lower semicontinuity of \(F\) and continuity of the cost integral imply \(F(\alpha,\beta)\le\int c\,d\pi\). Minimize over \(\pi\). \(\square\)</p>

</div>

</details>

<p>The central identity is the barycentric representation</p>

$$
(\alpha,\beta)=\int_{X\times Y}(\delta_x,\delta_y)\,d\pi(x,y).
$$

<p>There are generally many ways to make this decomposition. Convexity bounds \(F\) by the average pointwise cost of <em>each</em> one, so it bounds \(F\) by the smallest of them. Lower semicontinuity is what lets finite decompositions control general distributions.</p>
<p>Without that last assumption, the conclusion is false. On \(X=Y=[0,1]\), set \(F=T_c\) when both marginals have finite support, and \(F=+\infty\) otherwise. This functional is convex and agrees with the cost on every Dirac pair, but it assigns infinite value to diffuse distributions. Weak lower semicontinuity excludes precisely this kind of jump from finite clouds to their limit.</p>

## A complete example on two points

<p>Take \(X=Y=\{0,1\}\), with cost \(c(x,y)=|x-y|\). The squared cost is the same on this two-point space. Write</p>

$$
\alpha_a=(1-a)\delta_0+a\delta_1,
  \qquad
  \beta_b=(1-b)\delta_0+b\delta_1.
$$

<p id="proposition-1"><strong>Proposition 1 (the convex roof over a square).</strong> For \(a,b\in[0,1]\),</p>

$$
T_c(\alpha_a,\beta_b)=|a-b|.
$$

<details class="blog-proof">

<summary>Proof: only the imbalance must cross</summary>

<div class="blog-proof-body" markdown="1">

<p>Any coupling satisfies \(\pi_{10}-\pi_{01}=a-b\). Its cost is \(\pi_{10}+\pi_{01}\), hence at least \(|a-b|\). If \(a\ge b\), choose</p>

$$
\pi_{00}=1-a,\quad \pi_{11}=b,\quad
  \pi_{10}=a-b,\quad \pi_{01}=0.
$$

<p>This has the prescribed marginals and cost \(a-b\). The other case is symmetric. \(\square\)</p>

</div>

</details>

<p>The four Dirac pairs are the corners of the square of parameters \((a,b)\). The equal-point corners have cost \(0\), and the other two have cost \(1\). The V-shaped surface \(|a-b|\) is the largest convex function lying below those four heights.</p>
<p>This also illustrates why one should state the theorem for the transport <em>cost</em>. On these two points \(W_2^2=|a-b|\), whereas \(W_2=\sqrt{|a-b|}\) is not convex in the marginals: along \(b=0\), it is a strictly concave function of \(a\).</p>

## Why “largest” is essential

<p>Joint convexity, weak lower semicontinuity, and agreement on Dirac masses do not uniquely determine a functional. On compact Euclidean supports, choose \(\varepsilon&gt;0\) and let</p>

$$
F_\varepsilon(\alpha,\beta)
  =T_c(\alpha,\beta)
   -\varepsilon\bigl(\operatorname{Var}(\alpha)+\operatorname{Var}(\beta)\bigr),
$$

<p>where \(\operatorname{Var}(\alpha)=\int|x|^2\,d\alpha-|\int x\,d\alpha|^2\). Variance is concave in a law, so its negative is convex. It is also weakly continuous on compact supports. Thus \(F_\varepsilon\) is another jointly convex lower-semicontinuous functional with the same values on every Dirac pair, and it is smaller wherever the subtracted variance is positive.</p>

<details class="blog-proof">

<summary>Why subtracting variance preserves convexity</summary>

<div class="blog-proof-body" markdown="1">

<p>Let \(m_i=\int x\,d\alpha_i(x)\). Expanding the square of the mixed mean gives</p>

$$
\begin{aligned}
  \operatorname{Var}((1-t)\alpha_0+t\alpha_1)
  ={}&(1-t)\operatorname{Var}(\alpha_0)
     +t\operatorname{Var}(\alpha_1)\\
     &+t(1-t)|m_0-m_1|^2.
  \end{aligned}
$$

<p>The extra term is nonnegative, proving concavity. On a fixed compact support, both \(x\) and \(|x|^2\) are bounded continuous test functions, so the mean and variance vary continuously under weak convergence. Subtracting the variance therefore preserves both convexity and lower semicontinuity of \(T_c\).</p>

</div>

</details>

<p>If one also wants nonnegative values, use \(\max(F_\varepsilon,0)\). The maximum of two convex lower-semicontinuous functions has the same properties, and the Dirac values remain unchanged because \(c\ge0\).</p>

## Couplings as certificates of convex decomposition

<p>Assign cost \(c(x,y)\) to the pairs \((\delta_x,\delta_y)\), and \(+\infty\) to every other pair of laws. Taking the convex lower-semicontinuous envelope of this function produces \(T_c\). On finite spaces, this is the familiar operation of taking the lower convex roof of finitely many points. On general compact spaces, weak limits complete that construction.</p>
<p>The coupling is therefore more than an auxiliary variable introduced to relax a matching constraint. It is the certificate of a convex decomposition. Its marginal constraints say exactly that the decomposition averages to the two distributions we started with. This is one reason linear programming appears so naturally in optimal transport <a href="#ref-computational">[3]</a>.</p>

## The dual potentials are the supporting affine functions

<p>This picture also explains Kantorovich duality. A continuous affine function of the two marginals has the form</p>

$$
L_{u,v}(\alpha,\beta)=\int u\,d\alpha+\int v\,d\beta,
$$

<p>with any constant absorbed into \(u\). It lies below the pointwise cost exactly when</p>

$$
u(x)+v(y)\le c(x,y)\quad\text{for all }x,y.
$$

<p>The standard supporting-hyperplane theorem for closed convex functions then identifies the convex envelope with the supremum of these affine minorants:</p>

$$
T_c(\alpha,\beta)
  =\sup_{\substack{u\in C(X),\,v\in C(Y)\\u(x)+v(y)\le c(x,y)}}
  \left(\int u\,d\alpha+\int v\,d\beta\right).
$$

<details class="blog-proof">

<summary>Why the envelope gives exactly this family of dual functions</summary>

<div class="blog-proof-body" markdown="1">

<p>Embed the probability measures in the vector spaces of finite signed measures, with the weak topologies induced by continuous test functions. Extend \(T_c\) by \(+\infty\) outside \(\mathcal P(X)\times\mathcal P(Y)\). Its epigraph is closed and convex by Theorem 1. The supporting-hyperplane representation expresses it as the supremum of its continuous affine minorants.</p>
<p>Continuous linear functionals for these weak topologies are integrals against \(u\in C(X)\) and \(v\in C(Y)\). On probability measures, an affine constant can be absorbed into \(u\). A minorant must obey the Dirac inequalities \(u(x)+v(y)\le c(x,y)\). Conversely, every such pair is a minorant, because integrating this inequality against any coupling gives \(L_{u,v}(\alpha,\beta)\le\int c\,d\pi\), and hence \(L_{u,v}\le T_c\).</p>
<p>Thus the supporting affine functions are exactly the admissible dual potentials. This argument invokes the general supporting-hyperplane theorem; the elementary maximal-extension proof above does not need it.</p>

</div>

</details>

<p>Savaré and Sodini use this perspective to obtain duality for more general spaces and lower-semicontinuous costs. Their formulation uses sublinearity on finite nonnegative measures; our compact probability version removes that extra machinery while preserving the central idea <a href="#ref-savare">[1]</a>. For the classical theory of transport duality, see also <a href="#ref-villani">[4]</a>.</p>

## Numerical experimentation: a triangle of distributions

<p>Here is a two-dimensional slice of this convex extension that we can explore directly. Choose three non-collinear sites \(x_1,x_2,x_3\in\mathbb R^2\), and raise their Euclidean distances to a positive exponent \(p\):</p>

$$
c^{(p)}_{ij}=|x_i-x_j|^p,\qquad
\alpha_a=\sum_{i=1}^3 a_i\delta_{x_i},\qquad
\beta_b=\sum_{i=1}^3 b_i\delta_{x_i},
\qquad a,b\in\Delta_2,
$$

<p>where \(\Delta_2=\{a\in\mathbb R_+^3:a_1+a_2+a_3=1\}\) is the probability simplex. The figure displays the <em>raw transport cost</em>, without taking a \(p\)-th root:</p>

$$
T_p(\alpha_a,\beta_b)
=\min_{\substack{\pi_{ij}\ge0\\\sum_j\pi_{ij}=a_i\\\sum_i\pi_{ij}=b_j}}
\sum_{i,j=1}^3 |x_i-x_j|^p\,\pi_{ij}.
$$

<p>For \(p\ge1\), this is \(W_p^p\); at the default \(p=1\), it is simply \(W_1\). Exponents \(0&lt;p&lt;1\) are allowed too: \(|x-y|^p\) is then a metric, and \(T_p\) is its Wasserstein-1 distance. In contrast, \(T_p\) need not itself satisfy the triangle inequality when \(p&gt;1\). For every positive \(p\), however, the coupling problem is still a linear program and its value is jointly convex in the weights.</p>

<p><strong>One triangle has two roles.</strong> Its vertices are the actual sites where mass lives. The filled triangle also gives coordinates for <em>all distributions on those three sites</em>: we draw the weight vector \(a\) at the point \(z(a)=a_1x_1+a_2x_2+a_3x_3\). Non-collinearity makes this correspondence one-to-one. At a vertex, \(\alpha_a\) is a Dirac mass; on an edge, one weight vanishes; at the centroid, all three weights are \(1/3\).</p>

<iframe class="idea-experiment" data-experiment="transport-simplex" src="{{ '/blog/preparations/assets/transport-simplex/index.html?v=power-3' | relative_url }}" title="Transport-cost level sets with adjustable positive exponent, draggable support points, and target weights" loading="lazy" style="width:100%;height:1250px;border:0"></iframe>

<p><strong>How to read and manipulate the figure.</strong></p>

<ul>
<li><em>The dark target represents a distribution.</em> It sits at \(z(b)\), initially the centroid with \(b=(1/3,1/3,1/3)\). It is not a fourth support point, nor does \(\beta_b\) put all its mass there: its three masses remain at the vertices. Dragging this marker changes their proportions.</li>
<li><em>Every colored location represents another distribution.</em> At \(z(a)\), the color is \(T_p(\alpha_a,\beta_b)\). Hover to read the weights \(a\) and the cost, or choose <em>Inspect α</em> and tap to pin a distribution without moving the target. The pinned weights stay fixed as you change the geometry or exponent. The target is the unique zero; the unlabeled contour lines join distributions with equal transport cost.</li>
<li><em>Change how strongly long moves are penalized.</em> The logarithmic slider explores positive exponents on either side of \(1\); the number field accepts other positive values within floating-point range. Smaller \(p\) reduces the contrast between long and short moves, while larger \(p\) increases it. The color scale resets when \(p\) changes, since the cost units change too. Extremely large exponents can exceed numerical range or make fine contours unresolvable.</li>
<li><em>Keep the same colors when comparing costs.</em> The automatic color scale uses rounded bounds enclosing all current values. Select <em>Lock color scale</em> to freeze it while moving the vertices or target. Costs beyond the locked upper bound use the darkest color; a warning and the actual maximum make this saturation explicit.</li>
<li><em>Dragging a vertex changes the problem itself.</em> It changes the distances \(c_{ij}\), and hence the price of moving mass between sites. The target weights \(b\) stay fixed during this operation, so its displayed position \(z(b)\) follows the moving triangle. A small geometric guard keeps the three sites distinct and non-collinear.</li>
<li><em>Try the equilateral and thin triangles.</em> In the equilateral case, all off-diagonal costs equal \(d^p\), where \(d\) is the side length, so \(T_p=(d^p/2)\sum_i|a_i-b_i|\): transport is just scaled total variation. Changing the geometry changes the contour directions and their relative spacing. At \(p=1\), moving the target translates polygonal balls, which are then clipped by the simplex boundary; for \(p&gt;1\), the geometry can be more complicated.</li>
</ul>

<p>Although \(z(a)\) is the mean of \(\alpha_a\), the displayed cost is <em>not</em> just a distance between the two means. At \(p=1\), \(|z(a)-z(b)|\) is only a lower bound, by the triangle inequality applied to any coupling. The plot measures the actual cost of redistributing mass among the three sites. Nor is it a spatial density plot: there is no mass spread over the colored interior.</p>

### An exact formula at p = 1

<p>No regularization or iterative transport solver is needed for this small example. At \(p=1\), the formula is particularly simple. Write \(d_{ij}=|x_i-x_j|\), and define</p>

$$
w_1=\frac{d_{12}+d_{13}-d_{23}}2,\qquad
w_2=\frac{d_{12}+d_{23}-d_{13}}2,\qquad
w_3=\frac{d_{13}+d_{23}-d_{12}}2.
$$

<p>The strict triangle inequalities give \(w_i&gt;0\), and \(d_{ij}=w_i+w_j\) for \(i\ne j\). These are the branch lengths of an abstract three-leaf tree with the same pairwise distances; its junction need not correspond to a point in the Euclidean triangle.</p>

<p id="proposition-2"><strong>Proposition 2 (three-site \(W_1\) transport).</strong> With the Euclidean ground cost \(d_{ij}=|x_i-x_j|\), that is, at \(p=1\), any two weight vectors \(a,b\in\Delta_2\) satisfy</p>

$$
W_1(\alpha_a,\beta_b)=\sum_{i=1}^3 w_i|a_i-b_i|.
$$

<details class="blog-proof">

<summary>Proof: retain common mass and move only the surplus</summary>

<div class="blog-proof-body" markdown="1">

<p>For any admissible coupling, the identity \(d_{ij}=w_i+w_j\) off the diagonal gives</p>

$$
\sum_{i,j}d_{ij}\pi_{ij}
=\sum_i w_i(a_i+b_i-2\pi_{ii})
\ge\sum_i w_i|a_i-b_i|,
$$

<p>since \(\pi_{ii}\le\min(a_i,b_i)\). This lower bound is attained: keep \(\min(a_i,b_i)\) at each site, then send the remaining surplus from sites with \(a_i&gt;b_i\) to those with \(a_i&lt;b_i\). Total surplus equals total deficit, so this completes a feasible coupling with all the desired diagonal entries. \(\square\)</p>

</div>

</details>

<p>The formula is affine on each region where the signs of \(a_i-b_i\) are fixed. For an interior target, its small positive level sets are hexagons, not ellipses; larger ones meet the simplex boundary.</p>
<p><strong>Which exponents does this cover?</strong> The proposition as written is a formula for \(W_1\), not for \(W_p\) at arbitrary \(p\). The underlying condition, however, is that the <em>ground costs</em> satisfy the triangle inequality. Thus the same proof gives \(T_p=\sum_i w_i(p)|a_i-b_i|\), with \(w_i(p)=(d_{ij}^p+d_{ik}^p-d_{jk}^p)/2\), whenever these three weights are nonnegative. This always holds for \(0&lt;p\le1\), because \((u+v)^p\le u^p+v^p\); it can also hold for particular triangles with \(p&gt;1\), for instance an equilateral triangle. For \(p\ge1\), remember that this computes \(W_p^p\), not \(W_p\) itself.</p>
<p>For \(p&gt;1\), that inequality may fail, and keeping all common mass in place need no longer be optimal. For example, take \(x_1=(-1,0)\), \(x_2=(0,0.1)\), \(x_3=(1,0)\), and \(p=2\). Between \(a=(1/2,1/2,0)\) and \(b=(0,1/2,1/2)\), sending half the mass directly from \(x_1\) to \(x_3\) costs \(2\). Instead, exchanging half a unit along each of \(x_1\to x_2\) and \(x_2\to x_3\) costs only \(1.01\). This uses the mass already present at \(x_2\); it is not free transshipment. Between the two endpoint Dirac masses, the cost is still \(4\).</p>

### Beyond p = 1: an equally fast exact computation

<p>Fortunately, even when the triangle inequality fails, three-site transport has a closed form. Write \(c_{ij}=d_{ij}^p\). At most one edge can violate the triangle inequality; relabel its endpoints \(i,j\), with \(k\) the remaining site, and put</p>

$$
A=c_{ik},\qquad B=c_{jk},\qquad e=c_{ij}-A-B>0.
$$

<p>The exact coupling cost is then</p>

$$
T_p(\alpha_a,\beta_b)
=A|a_i-b_i|+B|a_j-b_j|
+e\max\{0,a_i+b_j-1,a_j+b_i-1\}.
$$

<p>The first two terms are the cost for the shorter path through \(k\). The last term accounts for the mass that must nevertheless cross the expensive edge: a coupling has only the available marginal mass at \(k\), so it cannot use that site as an unlimited relay.</p>

<details class="blog-proof">

<summary>Proof: identify the unavoidable mass on the expensive edge</summary>

<div class="blog-proof-body" markdown="1">

<p>For any coupling, subtract the excess \(e\) from the cost of the two directed edges between \(i\) and \(j\). The remaining costs form a three-leaf metric tree with branch lengths \(A,B,0\). The preceding proof therefore gives the lower bound \(A|a_i-b_i|+B|a_j-b_j|\). Also, the row and column constraints force \(\pi_{ij}\ge a_i+b_j-1\) and \(\pi_{ji}\ge a_j+b_i-1\). Their two right-hand sides cannot both be positive, since their sum is \(-a_k-b_k\). This proves the displayed lower bound.</p>
<p>To attain it, first consider opposite imbalances, say \(a_i-b_i=s\ge0\) and \(a_j-b_j=-r\le0\). Set \(t=\max(0,r-a_k)\). Because \(r-a_k=a_i+b_j-1\), this is exactly the forced mass on the expensive edge. Also, \(b_k=a_k+s-r\ge0\) gives \(0\le t\le\min(s,r)\). In row and column order \((i,j,k)\), choose</p>

$$
\pi=\begin{pmatrix}
b_i & t & s-t\\
0 & a_j & 0\\
0 & r-t & a_k-r+t
\end{pmatrix}.
$$

<p>Its entries are nonnegative and have marginals \(a,b\); its cost is \(As+Br+et\), as required. Reverse \(i,j\) for the other orientation. If both imbalances have the same sign, retain common mass and move only between \(k\) and the other two sites; the maximum term is then zero. \(\square\)</p>

</div>

</details>

<p>This is the formula used by the experiment whenever the powered costs are nonmetric. Evaluating it takes only a fixed number of arithmetic operations, independently of \(p\): no iterative solver and no entropic approximation are needed. Expanding the absolute values and the maximum gives at most twelve affine functions of \(a\) for fixed \(b\). The renderer computes their polygonal regions and straight contour segments directly, rather than solving a transport problem at every pixel. The corners are real features of the cost, not a smoothing or meshing artifact.</p>
<p>This is a slice \(a\mapsto T_c(\alpha_a,\beta_b)\) of the <em>joint</em> convex extension in Theorem 1. It should not be confused with the convex roof of the three vertex heights with \(b\) already fixed: that roof would simply be an affine plane. The coupling problem retains the information from <em>all pairs</em> of Dirac masses before we take the slice.</p>

## References

<ol class="references">
  <li id="ref-savare">Giuseppe Savaré and Giacomo Enrico Sodini. <a href="https://cvgmt.sns.it/paper/5594/"><em>A Simple Relaxation Approach to Duality for Optimal Transport Problems in Completely Regular Spaces</em></a>. <em>Journal of Convex Analysis</em> 29(1), 1–12, 2022, Theorem 4.4.</li>
  <li id="ref-book">Gabriel Peyré. <a href="https://arxiv.org/abs/2505.06589"><em>Optimal Transport for Machine Learners</em></a>, 2025–2026. <a href="https://www.gpeyre.com/ot4ml/OT4ML/OT4ML.pdf#nameddest=thm.3.3.35">Theorem 3.35, p. 59</a>.</li>
  <li id="ref-computational">Gabriel Peyré and Marco Cuturi. <a href="https://arxiv.org/abs/1803.00567"><em>Computational Optimal Transport</em></a>. <em>Foundations and Trends in Machine Learning</em> 11(5–6), 355–607, 2019.</li>
  <li id="ref-villani">Cédric Villani. <a href="https://doi.org/10.1090/gsm/058"><em>Topics in Optimal Transportation</em></a>. Graduate Studies in Mathematics 58, American Mathematical Society, 2003.</li>
</ol>
