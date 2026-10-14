---
title: "Convex neural networks: when width is not enough"
subtitle: "Two small counterexamples and an obstruction at every fixed depth"
description: "Why no fixed depth makes ReLU ICNNs universal in dimension two: explicit counterexamples, expandable proofs, triangular-grid witnesses at larger depths, and interactive numerical comparisons."
topic: Approximation theory
figure: icnn
proofs: true
---

Neural networks are flexible representations of functions. But what if the function must be **convex**? This constraint is especially natural in optimal transport. For probability measures with finite second moments and an absolutely continuous source, Brenier's theorem identifies the quadratic optimal transport map as the gradient of a convex potential [[1]](#ref-brenier), [[2]](#ref-ot). Learning such a potential is therefore a way to learn a transport map while respecting its geometry.

**Input-convex neural networks**, or ICNNs, enforce convexity through their architecture [[3]](#ref-amos). A natural question follows: can they approximate every convex function? Yes, if depth is allowed to grow with the desired accuracy [[4]](#ref-chen). But in dimension two, no fixed depth suffices. We start with two explicit counterexamples on a square, for one and two hidden ReLU layers, then give a self-contained proof of the obstruction at every fixed depth.

Universality means reaching every prescribed uniform error by increasing the network's size. Its failure is compatible with a good fit at a fixed tolerance: the obstruction can be small enough to escape a plot of the function values. The second example below illustrates this distinction particularly well.

<!--more-->

## Why convex neural networks?

In quadratic optimal transport, the relevant representation is

$$
T(x)=\nabla\varphi(x),\qquad \varphi\text{ convex}.
$$

Convexity encodes the structure of the transport map. ICNN-based approaches learn convex potentials in dual or minimax formulations [[5]](#ref-makkuva), [[6]](#ref-korotin). They have been used for generative modeling, continuous transport benchmarks [[7]](#ref-benchmark), and predicting changes between populations of cells [[8]](#ref-cellot). Representing a potential well, optimizing its parameters, and accurately recovering its gradient are three distinct questions.

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

<span id="theorem-1"></span>
**Theorem 1.** Every two-layer ICNN $$h$$, regardless of its width or parameter magnitudes, satisfies

$$
\boxed{\|h-f\|_{\infty,K}\geq\frac1{12}.}
$$

This is not a difficulty of training. No choice of parameters can overcome it.

<details class="blog-proof">
<summary>Proof: a seven-point inequality</summary>
<div class="blog-proof-body" markdown="1">

For three points $$p,q,r$$, denote their barycenter by $$z=(p+q+r)/3$$ and their pairwise midpoints by $$m_{uv}=(u+v)/2$$. Introduce the seven-point functional

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

</div>
</details>

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

Thus $$f\in\mathcal C_3$$. The next example shows that two hidden layers still do not suffice for universality.

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

<span id="theorem-2"></span>
**Theorem 2.** There is a number $$\delta>0$$ such that every three-layer ICNN satisfies

$$
\boxed{\|h-F\|_{\infty,K}\geq\delta\qquad(h\in\mathcal C_3).}
$$

Unlike the first example, the proof below does not give an explicit value of $$\delta$$. We first rule out an exact representation, then explain why approximation cannot evade the obstruction.

<details class="blog-proof">
<summary>Proof: rigidity, ReLU geometry, and approximation</summary>
<div class="blog-proof-body" markdown="1">

*Step 1: the convex summands are rigid*

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

*Step 2: the last ReLU cannot create this shape*

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

This proves $$F\notin\mathcal C_3$$. Passing from exact impossibility to an approximation barrier takes one more argument.

*Step 3: why exact impossibility also rules out approximation here*

An architecture can fail to represent a function exactly while approximating it arbitrarily well. The following elementary lemma closes that gap for our piecewise-affine targets.

<span id="lemma-1"></span>
**Lemma 1.** Let $$P$$ be a compact convex polytope with nonempty interior, and let $$u$$ be a continuous convex function with finitely many affine pieces on $$P$$. At a fixed depth $$L$$, if $$u$$ is a uniform limit of functions in $$\mathcal C_L$$, then some function in $$\mathcal C_L$$ equals $$u$$ exactly on $$P$$.

<details class="blog-proof">
<summary>Proof of Lemma 1: closed evaluation cones</summary>
<div class="blog-proof-body" markdown="1">

Fix finitely many sample points $$S=\{s_1,\ldots,s_M\}$$. Let $$A\subset\mathbb R^M$$ be the vectors of affine-function values at these points, and let $$E_L$$ be the vectors attainable by $$\mathcal C_L$$. The recursive definition gives

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

</div>
</details>

Apply Lemma 1 to $$F$$. Arbitrarily accurate approximation at depth three would imply exact representation at depth three, contradicting Step 2. This proves the positive gap $$\delta>0$$. $$\square$$

</div>
</details>

Once again, one extra layer resolves this particular obstruction. The width-one construction

$$
\begin{aligned}
z_1&=(x-y)_+,\\
z_2&=(z_1+x+2y+\tfrac12)_+,\\
z_3&=(z_2-x-y-\tfrac12)_+
\end{aligned}
$$

satisfies $$z_3=F$$, so $$F\in\mathcal C_4$$. All hidden-to-hidden weights are $$1$$. With four layers, one neuron per hidden layer already suffices.

## More layers: still no universal fixed depth

[Theorem 1](#theorem-1) and [Theorem 2](#theorem-2) are the first two instances of a general phenomenon. Adding a layer resolves each particular counterexample above, but a more complicated target creates a new obstruction. The counterexample must change with the allowed depth.

<span id="theorem-3"></span>
**Theorem 3.** On the same square $$K=[-1,1]^2$$, for every fixed depth $$L\geq2$$ there exist a convex function $$f_L$$ that is a finite maximum of affine functions and a number $$\delta_L>0$$ such that

$$
\inf_{h\in\mathcal C_L}\|h-f_L\|_{\infty,K}
\geq\delta_L.
$$

The widths and admissible parameters are unrestricted. Both the target and the error bound depend on $$L$$. This is compatible with growing-depth universality: every one of these finite maxima has an exact representation once sufficiently many layers are allowed.

Here is an explicit family. Set $$e_1=(1,0)$$ and $$e_2=(1/2,\sqrt3/2)$$. Let $$\Lambda_r$$ contain the lattice points $$ie_1+je_2$$, for integers $$i,j$$ satisfying

$$
\max(|i|,|j|,|i+j|)\leq r.
$$

This is a hexagonal patch: joining points at distance one gives $$1+3r(r+1)$$ vertices and $$6r^2$$ elementary triangles. On the fixed square, define

$$
H_r(x)=\max_{u\in\Lambda_r}
\left\{\frac{\langle u,x\rangle}{r}
-\frac{\|u\|^2}{r(2r+1)}\right\}.
$$

For example, Theorem 3 holds with

$$
f_L=H_r,\qquad r=\left\lceil19^{(L-1)/2}\right\rceil.
$$

This choice is deliberately generous; it makes the construction explicit without optimizing its size. Every affine piece is active somewhere on $$K$$, and all slopes have norm at most one. As $$r$$ grows, the graph gains more small planar faces, while the domain and Lipschitz bound stay fixed. Before rescaling, completing the square gives

$$
\max_{u\in\Lambda_r}\bigl(\langle u,x\rangle-\|u\|^2\bigr)
=\frac{\|x\|^2}{4}
-\min_{u\in\Lambda_r}\left\|u-\frac{x}{2}\right\|^2.
$$

Thus the active affine pieces are arranged according to the nearest lattice point to $$x/2$$. Their planar cells form a hexagonal pattern, with three faces meeting at each interior junction. The small junction obstruction of Theorems 1 and 2 has become a connected mesh of junctions.

The idea is to lift the lattice vertices to $$(u,-\|u\|^2)$$ in three dimensions. Their neighboring triples become triangular faces. Positive sums must preserve a connected chain of these triangles in at least one summand. Passing backward through a ReLU can lose at most six triangles. Counting the remaining connected pieces is enough to show that a fixed number of layers cannot create arbitrarily large patches. [Lemma 1](#lemma-1) then turns this exact-representation obstruction into a positive uniform error.

**Proof attribution.** The self-contained proof of Theorem 3 below was developed and written by **GPT-6**, using the triangular-face ideas of Bakaev et al. [[10]](#ref-bakaev). The counting bound is intentionally coarse; the point is a short argument for non-universality, not a sharp depth estimate.

**Related work.** Bakaev et al. establish exact ICNN depth obstructions in dimension three [[10]](#ref-bakaev), and Valerdi obtains related exact-representation results using cyclic polytopes [[14]](#ref-valerdi). Bakaev, Brunck and Yehudayoff also prove approximation obstructions for simplices in a convex polytope/max-gate model, with dimension growing with depth [[15]](#ref-polytope-approximation). These results provide the geometric background, but do not directly prove the statement here: a positive uniform approximation gap on one fixed planar square, allowing arbitrary widths, biases, and affine input connections. The localization and the passage from exact representation to approximation are essential.

<details class="blog-proof">
<summary>Proof of Theorem 3: a triangular patch that outgrows the depth</summary>
<div class="blog-proof-body" markdown="1">

Write $$d=L-1$$ for the number of hidden layers. We use two elementary facts about polytopes, prove both below, and then apply the earlier closure lemma.

*Step 1: translate the network operations into geometry*

For a polytope $$P\subset\mathbb R^3$$, its support function is $$s_P(v)=\max_{p\in P}\langle p,v\rangle$$. The Minkowski sum is $$P+Q=\{p+q:p\in P,q\in Q\}$$. Directly from these definitions,

$$
\begin{aligned}
s_{P+Q}&=s_P+s_Q,\\
s_{cP}&=c\,s_P\quad(c\geq0),\\
s_{\operatorname{conv}(P\cup\{0\})}&=\sigma(s_P).
\end{aligned}
$$

A linear function is the support function of a point, and adding it translates the polytope. Thus a homogeneous ICNN builds polytopes from points by positive Minkowski sums and by adjoining the origin and taking the convex hull. Each hidden layer permits one more point-adjoining operation along a path.

An **exposed face** is the set where a linear functional attains its maximum. A **chain of triangles** here means an edge-connected collection of exposed triangular faces: one can move between any two through triangles sharing a whole edge.

<span id="lemma-2"></span>
**Lemma 2 (triangular chains survive positive sums).** If a Minkowski sum contains a chain of triangular faces, at least one summand contains the whole chain, up to one common translation and positive scaling.

<details class="blog-proof">
<summary>Proof of Lemma 2: a triangle cannot split into different shapes</summary>
<div class="blog-proof-body" markdown="1">

Write $$P=\sum_j P_j$$ and denote by $$P^v$$ its exposed face in direction $$v$$. Maximizing a linear functional separately on each summand gives

$$
P^v=\sum_j P_j^v.
$$

Suppose this face is a triangle $$T$$. After translations, all its face summands lie in the same plane. An edge direction of a planar summand also appears on the boundary of their sum: exposing that edge gives an edge parallel to it in the sum. Hence the summands can have only the three directed edge directions of $$T$$. A nontrivial segment is impossible, since it would require two opposite directions. A nontrivial polygon therefore has three edges parallel to those of $$T$$. Closing its boundary forces the three edge vectors to have the same relative scale. Each face summand is consequently a point or a homothetic triangle:

$$
P_j^v=\lambda_{j,T}T+b_{j,T},\qquad \lambda_{j,T}\geq0.
$$

Now let adjacent triangles $$T=P^v$$ and $$T'=P^{v'}$$ share an edge $$E$$. Their common edge is exposed by $$v+v'$$. Because these faces intersect, $$s_P(v+v')=s_P(v)+s_P(v')$$. Each summand's support function is subadditive, so equality must hold separately in every summand. Its face in direction $$v+v'$$ is therefore the intersection of its faces in directions $$v$$ and $$v'$$, with both descriptions

$$
\lambda_{j,T}E+b_{j,T}
=\lambda_{j,T'}E+b_{j,T'}.
$$

Equality of segment lengths forces the two scales to agree; then the translations agree as well. This also holds if the scale is zero, when both faces are the same point. Connectivity propagates one scale $$\lambda_j$$ and one translation $$b_j$$ throughout the chain. Since $$\sum_j\lambda_j=1$$, at least one scale is positive. That summand retains the entire chain. $$\square$$

</div>
</details>

*Step 2: count how many triangles a fixed depth can retain*

We will only consider chains obtained from subsets of the elementary triangles of our lifted lattice patch, by a common positive scaling and translation. Every triangle has at most three edge-neighbors, and at most six triangles meet at any vertex. These two incidence bounds survive taking subsets and homotheties.

<span id="lemma-3"></span>
**Lemma 3 (a depth bound by counting).** A polytope computed with $$d$$ hidden layers cannot contain such a chain with more than

$$
B_d=\frac{19^d-1}{3}
$$

triangles, regardless of its other faces or the network's widths.

<details class="blog-proof">
<summary>Proof of Lemma 3: delete six triangles and count components</summary>
<div class="blog-proof-body" markdown="1">

At depth zero the polytope is a point, so $$B_0=0$$. Suppose the claim holds at depth $$d-1$$. The final output at depth $$d$$ corresponds to

$$
\begin{aligned}
P&=\{a\}+\sum_j c_j R_j,\\
R_j&=\operatorname{conv}(Q_j\cup\{0\}),
\end{aligned}
$$

where $$c_j\geq0$$ and each $$Q_j$$ has depth at most $$d-1$$. By Lemma 2, a positive homothet of the whole chain survives in one $$R_j$$ with $$c_j>0$$. Follow that summand.

Passing from $$R_j$$ back to $$Q_j$$ can lose only triangles having the adjoined point $$0$$ as a vertex. Indeed, every other vertex of $$R_j$$ belongs to $$Q_j$$. If a retained triangle has three such vertices, then it lies in $$Q_j$$; its exposing functional still exposes exactly that triangle because $$Q_j\subset R_j$$. Even if $$0$$ lies inside a triangle or on its edge, the triangle survives unless $$0$$ is one of its vertices.

At most six retained triangles have $$0$$ as a vertex. Delete them from the triangle-adjacency graph. The graph was connected and has degree at most three, so deleting at most six vertices leaves at most $$1+3\cdot6=19$$ connected components. To see this elementary bound, delete the vertices one at a time: each deletion creates at most three new components.

Each remaining component is still a chain of the same kind in $$Q_j$$, so has at most $$B_{d-1}$$ triangles by induction. Therefore the original chain has at most

$$
6+19B_{d-1}=\frac{19^d-1}{3}=B_d
$$

triangles. This proves the claim. $$\square$$

</div>
</details>

*Step 3: put a large triangular patch into a planar function*

For $$u\in\Lambda_r$$, set $$p_u=(u,-\|u\|^2)$$ and let $$P_r=\operatorname{conv}\{p_u:u\in\Lambda_r\}$$. Consider

$$
\begin{aligned}
G_r(x)&=s_{P_r}(x,1)\\
&=\max_{u\in\Lambda_r}\{\langle u,x\rangle-\|u\|^2\}.
\end{aligned}
$$

Every elementary lattice triangle lifts to an exposed triangular face of $$P_r$$. Indeed, if $$c$$ is its circumcenter, its circumradius is $$1/\sqrt3$$, and

$$
\langle(2c,1),p_u\rangle
=\|c\|^2-\|u-c\|^2.
$$

The three vertices are the unique closest lattice points to $$c$$. For completeness, by lattice symmetries it suffices to check the triangle $$0,e_1,e_2$$, with $$c=(1/2,\sqrt3/6)$$. For $$u=ie_1+je_2$$,

$$
\|u-c\|^2-\tfrac13=i^2+ij+j^2-i-j.
$$

This integer is at least $$-1/3$$, hence nonnegative, and is zero exactly at $$(i,j)=(0,0),(1,0),(0,1)$$. Thus the functional with direction $$(2c,1)$$ exposes exactly the lifted triangle. The whole patch gives an edge-connected chain of $$6r^2$$ exposed triangles.

Now suppose a depth-$$L$$ ICNN $$g$$ equals $$G_r$$ on $$Q_r=[-2r-1,2r+1]^2$$. Replace every bias $$b$$ in the network by $$bt$$, introducing a third input coordinate $$t$$. The resulting homogeneous ICNN has the same hidden depth $$d$$ and computes a support function $$s_P$$. Positive homogeneity of ReLU gives

$$
s_P(x,t)=t\,g(x/t),\qquad t>0.
$$

Since $$\|c\|\leq r$$, each $$2c$$ lies strictly inside $$Q_r$$. Consequently $$s_P$$ and $$s_{P_r}$$ agree on an open neighborhood of every $$(2c,1)$$. They therefore have the same exposed face there. One elementary way to see this is that the subdifferential of a maximum of linear functions is the convex hull of its active coefficient vectors, exactly the exposed face; subdifferentials depend only on the function in a neighborhood.

So $$P$$ contains the same chain of $$6r^2$$ triangles, even if it has additional faces elsewhere. Lemma 3 requires $$6r^2\leq B_d$$. Choosing $$r=\lceil19^{d/2}\rceil$$ violates this inequality and rules out exact representation on $$Q_r$$.

*Step 4: keep the square fixed and rule out approximation*

The normalized target introduced above satisfies

$$
H_r(x)=\frac{G_r((2r+1)x)}{r(2r+1)}.
$$

Rescaling the input and multiplying the output by a positive number preserve ICNN depth and sign constraints. Hence an exact depth-$$L$$ representation of $$H_r$$ on $$K$$ would give one of $$G_r$$ on $$Q_r$$, which we have just excluded. By [Lemma 1](#lemma-1), arbitrarily accurate uniform approximation of this finite maximum would imply an exact representation. Its distance from $$\mathcal C_L$$ is therefore strictly positive, as claimed. $$\square$$

The normalization also verifies the promised bounds: the slopes are $$u/r$$ with norm at most one, and the branch $$u$$ is uniquely active at $$x=2u/(2r+1)\in\operatorname{int}K$$. At that point its advantage over the branch $$v\ne u$$ is $$\|u-v\|^2/[r(2r+1)]>0$$.

</div>
</details>

## Numerical experimentation

The figure compares three situations. In one dimension, a depth-two ICNN interpolates $$t^2$$ with $$N$$ internal knots; its exact uniform error is $$1/(N+1)^2$$. In dimension two, we fit $$\mathcal C_2$$ networks to $$f$$ and $$\mathcal C_3$$ networks to $$F$$, with $$N$$ neurons per hidden layer. The slider starts at $$N=64$$ and selects fitted networks at widths $$1,2,4,8,16,32,64$$.

{% include blog-figure.html kind="icnn" %}

The planar panels initially show the **signed residual**, approximation minus target. Their color scales make the remaining error visible; switch to the function view to compare values and level sets. A closer view of the central triangle reveals how the three-layer fit replaces the target's flat face.

At width $$64$$, this fit has maximum error about $$0.017395$$, just $$1.16\%$$ of the target's range $$1.5$$. Its values at the triangle's three corners, in the order defining $$T$$ above, are approximately $$0.01409,0.01728,0.01740$$. At the barycenter $$(-1/6,-1/6)$$, the value is approximately $$-0.01543$$. The target is zero at all these points: the approximation lifts the corners and dips inside the triangle. These small distortions are hard to distinguish on the full function plot.

The diagonal plot follows $$x=y=t$$ across the flat interval $$[-1/4,0]$$, where $$F(t,t)=0$$. It shows the same loss of flatness on a magnified vertical scale. This is a slice of the network trained in two dimensions; approximating the one-dimensional restriction alone has no such obstruction.

Try **one extra hidden layer**: the planar targets are then represented exactly by the width-one formulas above, independently of the width slider. Both residual maps and the diagonal residual become zero. The one-dimensional spline continues to depend on $$N$$.

The displayed planar errors are numerical whole-square errors for the stored networks. They are computed using convexity and linear programming: on each affine cell of the target, the largest value of approximation minus target occurs at a cell vertex. The opposite error is obtained by minimizing the network minus each affine piece, using its linear epigraph constraints. The computations use floating-point solver tolerances; they do not give an architecture-wide lower bound.

The fits come from constrained numerical optimization. At width $$64$$, the selected three-layer model is the width-$$32$$ fit with zero-weight neurons added. Thus an observed plateau can reflect the fitting procedure. The proofs establish a positive gap for the architecture, but neither the plotted fits nor their errors determine the optimal value of that gap.

## References

<span id="ref-brenier"></span>
**[1]** Yann Brenier. *Polar factorization and monotone rearrangement of vector-valued functions*. Communications on Pure and Applied Mathematics 44(4), 375–417 (1991). [Paper](https://doi.org/10.1002/cpa.3160440402).

<span id="ref-ot"></span>
**[2]** Gabriel Peyré and Marco Cuturi. *Computational Optimal Transport*. Foundations and Trends in Machine Learning 11(5–6), 355–607 (2019). [Open-access manuscript](https://arxiv.org/abs/1803.00567).

<span id="ref-amos"></span>
**[3]** Brandon Amos, Lei Xu, and J. Zico Kolter. *Input Convex Neural Networks*. ICML, Proceedings of Machine Learning Research 70, 146–155 (2017). [Paper and proceedings](https://proceedings.mlr.press/v70/amos17b.html).

<span id="ref-chen"></span>
**[4]** Yize Chen, Yuanyuan Shi, and Baosen Zhang. *Optimal Control Via Neural Networks: A Convex Approach*. ICLR (2019). [Paper](https://arxiv.org/abs/1805.11835) · [Proceedings](https://openreview.net/forum?id=H1MW72AcK7).

<span id="ref-makkuva"></span>
**[5]** Ashok Makkuva, Amirhossein Taghvaei, Sewoong Oh, and Jason Lee. *Optimal transport mapping via input convex neural networks*. ICML, Proceedings of Machine Learning Research 119, 6672–6681 (2020). [Paper and proceedings](https://proceedings.mlr.press/v119/makkuva20a.html).

<span id="ref-korotin"></span>
**[6]** Alexander Korotin, Vage Egiazarian, Arip Asadulaev, Alexander Safin, and Evgeny Burnaev. *Wasserstein-2 Generative Networks*. ICLR (2021). [Paper](https://arxiv.org/abs/1909.13082).

<span id="ref-benchmark"></span>
**[7]** Alexander Korotin, Lingxiao Li, Aude Genevay, Justin M. Solomon, Alexander Filippov, and Evgeny Burnaev. *Do Neural Optimal Transport Solvers Work? A Continuous Wasserstein-2 Benchmark*. NeurIPS 34 (2021). [Paper and proceedings](https://papers.nips.cc/paper_files/paper/2021/hash/7a6a6127ff85640ec69691fb0f7cb1a2-Abstract.html).

<span id="ref-cellot"></span>
**[8]** Charlotte Bunne, Stefan G. Stark, Gabriele Gut, Jacobo Sarabia del Castillo, Mitch Levesque, Kjong-Van Lehmann, Lucas Pelkmans, Andreas Krause, and Gunnar Rätsch. *Learning single-cell perturbation responses using neural optimal transport*. Nature Methods 20, 1759–1768 (2023). [Paper](https://www.nature.com/articles/s41592-023-01969-x).

<span id="ref-gagneux"></span>
**[9]** Anne Gagneux, Mathurin Massias, Emmanuel Soubies, and Rémi Gribonval. *Convexity in ReLU Neural Networks: Beyond ICNNs?* Journal of Mathematical Imaging and Vision 67, article 40 (2025). [Paper](https://arxiv.org/abs/2501.03017) · [Published version](https://doi.org/10.1007/s10851-025-01253-x).

<span id="ref-bakaev"></span>
**[10]** Egor Bakaev, Florestan Brunck, Christoph Hertrich, Daniel Reichman, and Amir Yehudayoff. *On the Depth of Monotone ReLU Neural Networks and ICNNs* (2025). [Paper](https://arxiv.org/abs/2505.06169).

<span id="ref-pinelis"></span>
**[11]** Iosif Pinelis. *Does the Convex Order Between the Distributions of Linear Functionals Imply the Convex Order Between the Probability Distributions Over* $$\mathbb R^d$$*?* The American Mathematical Monthly 133(3), 281–284 (2026). [Open-access manuscript](https://arxiv.org/abs/2510.04269) · [Published version](https://doi.org/10.1080/00029890.2025.2594389) · [Earlier MathOverflow answer, 9 April 2025](https://mathoverflow.net/a/490802).

<span id="ref-hyper"></span>
**[12]** Shayan Hundrieser, Insung Kong, and Johannes Schmidt-Hieber. *Hyper Input Convex Neural Networks for Shape Constrained Learning and Optimal Transport* (2026). [Paper](https://arxiv.org/abs/2604.26942).

<span id="ref-popoviciu"></span>
**[13]** Tiberiu Popoviciu. *Sur certaines inégalités qui caractérisent les fonctions convexes*. Analele Științifice ale Universității “Al. I. Cuza” din Iași, Secția I a, Matematică (N.S.) 11B, 155–164 (1965). [Statement and application in Pinelis's paper](https://arxiv.org/html/2510.04269v3).

<span id="ref-valerdi"></span>
**[14]** Juan L. Valerdi. *On Minimal Depth in Neural Networks* (2024; revised 2026). [Paper, version 6](https://arxiv.org/abs/2402.15315v6).

<span id="ref-polytope-approximation"></span>
**[15]** Egor Bakaev, Florestan Brunck, and Amir Yehudayoff. *Approximation Depth of Convex Polytopes* (2025). [Paper](https://arxiv.org/abs/2507.07779).
