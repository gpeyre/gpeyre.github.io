---
title: "Convex neural networks: when width is not enough"
subtitle: "Two small counterexamples to fixed-depth ICNN universality"
description: "Why input-convex ReLU networks need depth: a seven-point obstruction for one hidden layer, a planar counterexample for two hidden layers, proofs, and interactive numerical comparisons."
topic: Approximation theory
figure: icnn
---

Neural networks are flexible representations of functions. But what if the function must be **convex**? This constraint is especially natural in optimal transport: for the quadratic cost, Brenier's theorem identifies the optimal map as the gradient of a convex potential, for probability measures with finite second moments and an absolutely continuous source [[1]](#ref-brenier), [[2]](#ref-ot). Learning such a potential is therefore a way to learn a transport map while respecting its geometry.

**Input-convex neural networks**, or ICNNs, enforce convexity through their architecture [[3]](#ref-amos). A natural question follows: can they approximate every convex function? Yes, if depth is allowed to grow with the desired accuracy [[4]](#ref-chen). But increasing width at a fixed small depth is a different matter. Here are two explicit counterexamples on a square, with proofs: one for a single hidden ReLU layer, and another for two hidden layers.

<!--more-->

## Why convex neural networks?

In quadratic optimal transport, the relevant representation is

$$
T(x)=\nabla\varphi(x),\qquad \varphi\text{ convex}.
$$

Convexity is more than a convenient regularizer: it encodes the structure of the transport map. ICNN-based approaches learn convex potentials in dual or minimax formulations [[5]](#ref-makkuva), [[6]](#ref-korotin). They have been used for generative modeling, continuous transport benchmarks [[7]](#ref-benchmark), and predicting changes between populations of cells [[8]](#ref-cellot). Of course, representing a potential well, optimizing its parameters, and accurately recovering its gradient are three distinct questions.

Recent work has examined the expressive power of convex ReLU networks compared with ICNNs [[9]](#ref-gagneux), exact depth separations [[10]](#ref-bakaev), and approximation efficiency of alternative convex architectures [[12]](#ref-hyper). These results have different scopes: a separation at a fixed width, an exact-representation obstruction, and a positive uniform-approximation gap are not interchangeable. We will keep this distinction explicit.

To the best of my knowledge, Francis Bach was the first to notice the shallow obstruction; he explained it to me a few years ago (private communication). For a public reference, Pinelis gives a particularly elegant finite-point obstruction to approximation by convex ridge sums [[11]](#ref-pinelis). The first proof below is a concrete version of that argument. The second uses the geometry of a small piecewise-affine convex function, followed by a finite-sample argument to rule out approximation as well as exact representation.

## Two layers: positive sums of hinges

Write $$\sigma(t)=t_+=\max(t,0)$$. A **two-layer ReLU ICNN** is a function

$$
h(x)=a(x)+\sum_{j=1}^{N}c_j\sigma(\ell_j(x)),
$$

where $$a$$ and $$\ell_j(x)=w_j\cdot x+b_j$$ are affine, and $$c_j\geq0$$. The vectors $$w_j$$ and biases $$b_j$$ are unrestricted. The width $$N$$ can be arbitrarily large. Each hinge is convex; nonnegative sums and affine additions preserve convexity.

**Convention:** throughout this post, depth counts the final affine output layer. Thus depth $$L=2$$ means **one hidden layer**, and depth $$L=3$$ means **two hidden layers**. Input dimension and layer count are unrelated.

In one dimension, this shallow class is already universal for continuous convex functions on a compact interval. Indeed, a convex piecewise-linear interpolant has the form

$$
a+bt+\sum_j c_j(t-\tau_j)_+,\qquad c_j\geq0:
$$

the coefficients are its nonnegative slope jumps. Refining the knots gives uniform approximation. The obstruction starts in dimension two.

### A three-plane counterexample

Let $$K=[-1,1]^2$$ and

$$
f(x,y)=\max(0,x,y).
$$

**Theorem.** Every two-layer ICNN $$h$$, regardless of its width or parameter magnitudes, satisfies

$$
\boxed{\|h-f\|_{\infty,K}\geq\frac1{12}.}
$$

This is not a difficulty of training. No choice of parameters can overcome it.

**Proof.** For three points $$p,q,r$$, denote their barycenter by $$z=(p+q+r)/3$$ and their pairwise midpoints by $$m_{uv}=(u+v)/2$$. Introduce the seven-point functional

$$
\begin{aligned}
D(h)={}&h(p)+h(q)+h(r)\\
&+3h(z)-2h(m_{pq})\\
&-2h(m_{pr})-2h(m_{qr}).
\end{aligned}
$$

It vanishes on affine functions. For a hinge $$h=\sigma\circ\ell$$, set $$a=\ell(p)$$, $$b=\ell(q)$$ and $$c=\ell(r)$$. Positive homogeneity of ReLU gives

$$
D(h)=a_++b_++c_++(a+b+c)_+
-(a+b)_+-(a+c)_+-(b+c)_+\geq0.
$$

Here is a short check of the inequality, a special case of Popoviciu's inequality [[13]](#ref-popoviciu). The expression is unchanged by simultaneously reversing the three signs, since $$(-s)_+=s_+-s$$. When all signs agree it is zero. Otherwise, after a permutation and a sign reversal, take $$a,b\geq0$$ and $$c=-s\leq0$$. The claim becomes

$$
(a+b-s)_+\geq(a-s)_++(b-s)_+.
$$

If at most one term on the right is positive, the inequality is immediate. If both are positive, their sum is $$a+b-2s\leq a+b-s$$. Thus $$D(h)\geq0$$ for each hinge, and hence for every nonnegative sum of hinges plus an affine function.

Now choose

$$
p=(-1,0),\qquad q=(0,-1),\qquad r=(1,1).
$$

For our target, the vertex values are $$0,0,1$$, the barycenter value is $$0$$, and the three midpoint values are $$0,\tfrac12,\tfrac12$$. Therefore

$$
D(f)=1-2=-1.
$$

The sum of the absolute coefficients in $$D$$ is $$12$$. Consequently,

$$
1\leq D(h)-D(f)\leq12\|h-f\|_{\infty,K},
$$

which proves the claimed bound. $$\square$$

Geometrically, each affine ReLU hinge creates a crease along an entire line. With nonnegative output weights, these creases cannot cancel. The graph of $$\max(0,x,y)$$ instead has three crease rays meeting at one point, without their opposite rays. The finite-point inequality makes this geometric obstruction robust under approximation.

## Deeper ICNNs: the precise class

A depth-$$L$$ ICNN has $$L-1$$ hidden ReLU layers. With arbitrary finite widths, its standard form is the following, where $$z_\ell=z_\ell(x)$$ and the middle recursion applies for $$2\leq\ell\leq L-1$$:

$$
\begin{aligned}
z_1&=\sigma(A_1x+b_1),\\
z_\ell&=\sigma(W_\ell z_{\ell-1}+A_\ell x+b_\ell),\\
h(x)&=c^\top z_{L-1}+a^\top x+b.
\end{aligned}
$$

ReLU acts coordinatewise. The entries of $$W_\ell$$ and $$c$$ are **nonnegative**; all affine input connections and biases are unrestricted. These input connections are important: our negative results hold even when they are allowed at every layer, including the output. Convexity follows inductively because ReLU is convex and nondecreasing.

For the proofs, an equivalent recursive definition is convenient. Write $$\mathrm{Aff}$$ for affine functions and set

$$
\mathcal C_1=\mathrm{Aff},\qquad
\mathcal C_L=\left\{a+\sum_{j=1}^{N}c_j\sigma(g_j)\right\}.
$$

Here $$a\in\mathrm{Aff}$$, $$c_j\geq0$$, and each $$g_j\in\mathcal C_{L-1}$$. The width $$N$$ and the widths inside each $$g_j$$ are arbitrary but finite. Running the subnetworks in parallel gives the usual layered architecture, with no additional depth.

### What growing depth can do

Every convex Lipschitz function on a compact convex domain can be approximated uniformly by a finite maximum of affine functions. Such a maximum is an ICNN: add the affine pieces one at a time using

$$
\max(g,\ell)=\sigma(g-\ell)+\ell.
$$

The affine input connections implement $$-\ell$$ and the final $$+\ell$$; the hidden connection has weight $$1$$. A maximum of $$m$$ affine functions can therefore be represented with $$m-1$$ hidden layers, even with width one at each hidden layer. This proves universality when depth is allowed to depend on the accuracy [[4]](#ref-chen). Continuous convex targets on the square follow as well: first approximate them uniformly by Lipschitz convex functions, for example by restricting $$x\mapsto f(rx)$$ with $$0<r<1$$ and letting $$r\uparrow1$$. These restrictions are Lipschitz because $$rK$$ lies in the interior, and they converge uniformly by uniform continuity of $$f$$ on $$K$$.

For instance, the first counterexample becomes exactly representable after adding just one hidden layer:

$$
z_1=(x-y)_+,\qquad z_2=(z_1+y)_+,\qquad f=z_2.
$$

So $$f\in\mathcal C_3$$. Does that mean two hidden layers suffice for every convex function? No.

## Three layers: a four-plane counterexample

On the same square $$K$$, consider

$$
F(x,y)=\max\left(0,x,y,-x-y-\tfrac12\right).
$$

Its zero region is the triangle

$$
T=\operatorname{conv}\left\{(0,0),(0,-\tfrac12),(-\tfrac12,0)\right\}.
$$

Outside this triangle, three affine faces meet along three outward crease rays.

**Theorem.** There is a number $$\delta>0$$ such that every three-layer ICNN satisfies

$$
\boxed{\|h-F\|_{\infty,K}\geq\delta\qquad(h\in\mathcal C_3).}
$$

Unlike the first example, the proof below does not give an explicit value of $$\delta$$. We first rule out an exact representation, then explain why approximation cannot evade the obstruction.

### Step 1: the convex summands are rigid

Suppose that

$$
F=a+\sum_j H_j,
$$

where $$a$$ is affine and the $$H_j$$ are convex. On each of the four regions where $$F$$ is affine, every $$H_j$$ must also be affine: their nonnegative Jensen deficits add up to zero, so each deficit vanishes.

Fix one summand $$H$$. Denote its gradients on the regions where $$F$$ equals $$0,x,y,-x-y-\tfrac12$$ by $$q_0,q_1,q_2,q_3$$. Continuity across the triangle's sides and convexity give

$$
q_1=q_0+(A,0),\quad q_2=q_0+(0,B),\quad
q_3=q_0-(C,C),\qquad A,B,C\geq0.
$$

Across the interface $$x=y$$ between the first two outer faces, the gradient difference $$(A,-B)$$ must be normal to that interface, so $$A=B$$. Across $$2x+y=-\tfrac12$$, the difference $$(A+C,C)$$ is parallel to $$(2,1)$$, so $$A=C$$. It follows that

$$
H=\alpha F+b,\qquad \alpha\geq0,\quad b\text{ affine}.
$$

Applying this to all summands gives $$\sum_j\alpha_j=1$$. Thus, up to affine additions, each nontrivial convex summand must carry the **entire shape** of $$F$$. This is a small example of the indecomposability geometry behind depth lower bounds [[10]](#ref-bakaev).

### Step 2: the last ReLU cannot create this shape

Assume $$F\in\mathcal C_3$$. By absorbing nonnegative output coefficients into the preceding functions, we can write

$$
F=a+\sum_j\sigma(g_j),\qquad g_j\in\mathcal C_2.
$$

By Step 1, at least one summand satisfies

$$
\sigma(g)=\alpha F+b,\qquad \alpha>0,
$$

with $$b$$ affine. At each vertex of $$T$$, the function $$F$$ has three crease rays, with no opposite pair. If $$\sigma(g)$$ were positive at such a vertex, it would equal $$g$$ in a neighborhood. But $$g\in\mathcal C_2$$ is a positive sum of affine hinges: any crease through that vertex continues along a full line. It cannot have this three-ray junction.

Hence $$\sigma(g)$$ vanishes at all three vertices. Since $$F$$ vanishes there too, $$b$$ is zero at three noncollinear points, and therefore $$b=0$$. We obtain

$$
g=\alpha F\quad\text{wherever }F>0.
$$

Near $$(\tfrac14,\tfrac14)$$, this forces a crease along $$x=y$$. For a positive sum of affine hinges, that crease must continue along the same line. In particular it persists near $$(-\tfrac12,-\tfrac12)$$. Yet near that point $$F=-x-y-\tfrac12>0$$ is affine, so $$g=\alpha F$$ is affine too: a contradiction.

We have proved $$F\notin\mathcal C_3$$. Importantly, there is still one step left.

### Step 3: why exact impossibility also rules out approximation here

An architecture can fail to represent a function exactly while approximating it arbitrarily well. We cannot skip this issue. The following elementary lemma closes the gap for our piecewise-affine targets.

**Lemma.** Let $$P$$ be a compact convex polytope with nonempty interior, and let $$u$$ be a continuous convex function with finitely many affine pieces on $$P$$. At a fixed depth $$L$$, if $$u$$ is a uniform limit of functions in $$\mathcal C_L$$, then some function in $$\mathcal C_L$$ equals $$u$$ exactly on $$P$$.

**Proof.** Fix finitely many sample points $$S=\{s_1,\ldots,s_M\}$$. Let $$A\subset\mathbb R^M$$ be the vectors of affine-function values at these points, and let $$E_L$$ be the vectors attainable by $$\mathcal C_L$$. The recursive definition gives

$$
E_1=A,\qquad E_L=A+\operatorname{cone}\bigl(\sigma(E_{L-1})\bigr),
$$

where $$\operatorname{cone}$$ means all finite nonnegative linear combinations and ReLU acts coordinatewise. Each $$E_L$$ is a **closed polyhedral cone**. Indeed, this holds for the linear space $$A$$. Inductively split $$E_{L-1}$$ into its finitely many coordinate sign regions. On each region ReLU is a linear map, so its image is polyhedral. The conical hull of this finite union, and its sum with $$A$$, are again polyhedral cones, hence closed.

Now choose $$S$$ to contain every vertex of every full-dimensional affine cell of $$u$$, plus one interior point of each cell. Uniform approximation and closedness of $$E_L$$ give a single $$h\in\mathcal C_L$$ matching $$u$$ at all these sample points.

On a cell where $$u=\ell$$ is affine, vertex matching and convexity imply $$h-\ell\leq0$$. At the chosen interior point $$b$$, equality holds. For any point $$x$$ of the cell, write $$b=tx+(1-t)y$$ with $$y$$ in the cell and $$0<t<1$$. Then

$$
0=(h-\ell)(b)\leq t(h-\ell)(x)+(1-t)(h-\ell)(y)\leq0.
$$

Thus $$h(x)=\ell(x)$$. This holds on every cell, proving $$h=u$$ throughout $$P$$. $$\square$$

Apply the lemma to $$F$$. Arbitrarily accurate approximation at depth three would imply exact representation at depth three, contradicting Step 2. This proves the positive gap $$\delta>0$$.

Once again, one extra layer resolves this particular obstruction. The width-one construction

$$
\begin{aligned}
z_1&=(x-y)_+,\\
z_2&=(z_1+x+2y+\tfrac12)_+,\\
z_3&=(z_2-x-y-\tfrac12)_+
\end{aligned}
$$

satisfies $$z_3=F$$, so $$F\in\mathcal C_4$$. All hidden-to-hidden weights are $$1$$. The point is not that this target needs many neurons: it needs the right depth.

## Try increasing the width

The figure compares three situations. In one dimension, a depth-two ICNN interpolates $$t^2$$ with $$N$$ internal knots; its exact uniform error is $$1/(N+1)^2$$. In dimension two, we fit $$\mathcal C_2$$ networks to $$f$$ and $$\mathcal C_3$$ networks to $$F$$, with $$N$$ neurons in each hidden layer. The slider selects actual networks at widths $$1,2,4,8,16,32,64$$.

{% include blog-figure.html kind="icnn" %}

For the planar panels, the background colors show the fitted function, and solid approximation contours are superimposed on dashed target contours at the same levels. Try the **one extra hidden layer** option: the two targets are then represented exactly by the width-one formulas above, independent of the width slider. The one-dimensional panel continues to show its spline approximation.

The planar fits are precomputed by constrained numerical optimization, with nonnegative hidden and output weights and unrestricted affine input connections. They are examples of trained networks, **not certified best approximations**. Their displayed errors are maxima on a finite evaluation grid, not certified uniform errors. Optimization quality can vary with width; it is the proofs above, not a numerical plateau, that establish the approximation barriers.

## The takeaway

In one dimension, width alone suffices for shallow convex ReLU approximation. On a square, the three-plane maximum already defeats one hidden layer, and the four-plane maximum above defeats two hidden layers—even with unlimited width and input connections at every layer. Allowing depth to grow recovers universality.

For applications such as optimal transport, this distinction matters: enforcing convexity is valuable, but an architecture's convexity guarantee does not by itself imply universality at the depth used in practice. Nor does potential approximation alone guarantee gradient or transport-map accuracy. Those are separate approximation and numerical questions.

## References

<span id="ref-brenier"></span>
**[1]** Yann Brenier. *Polar factorization and monotone rearrangement of vector-valued functions*. Communications on Pure and Applied Mathematics 44(4), 375–417 (1991). [Paper](https://doi.org/10.1002/cpa.3160440402).

<span id="ref-ot"></span>
**[2]** Gabriel Peyré and Marco Cuturi. *Computational Optimal Transport*. Foundations and Trends in Machine Learning 11(5–6), 355–607 (2019). [Open-access manuscript](https://arxiv.org/abs/1803.00567).

<span id="ref-amos"></span>
**[3]** Brandon Amos, Lei Xu, and J. Zico Kolter. *Input Convex Neural Networks*. ICML, Proceedings of Machine Learning Research 70, 146–155 (2017). [Paper and proceedings](https://proceedings.mlr.press/v70/amos17b.html).

<span id="ref-chen"></span>
**[4]** Yize Chen, Yuanyuan Shi, and Baosen Zhang. *Optimal Control Via Neural Networks: A Convex Approach*. ICLR (2019). [Paper](https://arxiv.org/abs/1805.11835) · [Proceedings](https://openreview.net/forum?id=H1MW72AcK7). The finite-max construction underlies the growing-depth universality result.

<span id="ref-makkuva"></span>
**[5]** Ashok Makkuva, Amirhossein Taghvaei, Sewoong Oh, and Jason Lee. *Optimal transport mapping via input convex neural networks*. ICML, Proceedings of Machine Learning Research 119, 6672–6681 (2020). [Paper and proceedings](https://proceedings.mlr.press/v119/makkuva20a.html).

<span id="ref-korotin"></span>
**[6]** Alexander Korotin, Vage Egiazarian, Arip Asadulaev, Alexander Safin, and Evgeny Burnaev. *Wasserstein-2 Generative Networks*. ICLR (2021). [Paper](https://arxiv.org/abs/1909.13082).

<span id="ref-benchmark"></span>
**[7]** Alexander Korotin, Lingxiao Li, Aude Genevay, Justin M. Solomon, Alexander Filippov, and Evgeny Burnaev. *Do Neural Optimal Transport Solvers Work? A Continuous Wasserstein-2 Benchmark*. NeurIPS 34 (2021). [Paper and proceedings](https://papers.nips.cc/paper_files/paper/2021/hash/7a6a6127ff85640ec69691fb0f7cb1a2-Abstract.html).

<span id="ref-cellot"></span>
**[8]** Charlotte Bunne, Stefan G. Stark, Gabriele Gut, Jacobo Sarabia del Castillo, Mitch Levesque, Kjong-Van Lehmann, Lucas Pelkmans, Andreas Krause, and Gunnar Rätsch. *Learning single-cell perturbation responses using neural optimal transport*. Nature Methods 20, 1759–1768 (2023). [Paper](https://www.nature.com/articles/s41592-023-01969-x).

<span id="ref-gagneux"></span>
**[9]** Anne Gagneux, Mathurin Massias, Emmanuel Soubies, and Rémi Gribonval. *Convexity in ReLU Neural Networks: Beyond ICNNs?* Journal of Mathematical Imaging and Vision 67, article 40 (2025). [Paper](https://arxiv.org/abs/2501.03017) · [Published version](https://doi.org/10.1007/s10851-025-01253-x). In particular, their two-hidden-layer counterexample compares ordinary convex networks and ICNNs at the same fixed width, rather than ruling out all widths at that depth.

<span id="ref-bakaev"></span>
**[10]** Egor Bakaev, Florestan Brunck, Christoph Hertrich, Daniel Reichman, and Amir Yehudayoff. *On the Depth of Monotone ReLU Neural Networks and ICNNs* (2025). [Paper](https://arxiv.org/abs/2505.06169). Exact-representation depth lower bounds and polyhedral indecomposability arguments. Their depth convention counts ReLU stages; the convention here also counts the affine output. Their general separation theorem is not itself a uniform-approximation statement on our two-dimensional square.

<span id="ref-pinelis"></span>
**[11]** Iosif Pinelis. *Does the Convex Order Between the Distributions of Linear Functionals Imply the Convex Order Between the Probability Distributions Over* $$\mathbb R^d$$*?* The American Mathematical Monthly 133(3), 281–284 (2026). [Open-access manuscript](https://arxiv.org/abs/2510.04269) · [Published version](https://doi.org/10.1080/00029890.2025.2594389) · [Earlier MathOverflow answer, 9 April 2025](https://mathoverflow.net/a/490802). Gives the convex-ridge obstruction using $$\max(0,x,y)$$ and Popoviciu's inequality, even for pointwise approximation.

<span id="ref-hyper"></span>
**[12]** Shayan Hundrieser, Insung Kong, and Johannes Schmidt-Hieber. *Hyper Input Convex Neural Networks for Shape Constrained Learning and Optimal Transport* (2026). [Paper](https://arxiv.org/abs/2604.26942). A recent perspective on approximation efficiency and alternative convex architectures.

<span id="ref-popoviciu"></span>
**[13]** Tiberiu Popoviciu. *Sur certaines inégalités qui caractérisent les fonctions convexes*. Analele Științifice ale Universității “Al. I. Cuza” din Iași, Secția I a, Matematică (N.S.) 11B, 155–164 (1965). [Statement and application in Pinelis's paper](https://arxiv.org/html/2510.04269v3).
