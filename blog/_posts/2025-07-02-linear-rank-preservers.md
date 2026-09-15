---
title: "Which linear maps preserve matrix rank?"
subtitle: "An elementary proof of the Marcus–Moyls classification."
description: "Why every linear rank preserver is a left-right change of basis, possibly composed with transposition in the square case."
topic: Linear algebra
---

Fun fact: a linear operator on matrices may mix all their entries, but preserving the rank of **every** matrix leaves remarkably little freedom. It must be a change of basis on the left and on the right.

There is just one additional possibility for square matrices: transposition, followed by those same changes of basis. The proof comes from understanding the linear subspaces made entirely of matrices of rank at most one.

<!--more-->

The square complex case was proved by Marcus and Moyls in [*Linear Transformations on Algebras of Matrices*, Canadian Journal of Mathematics 11 (1959), 61–66](https://doi.org/10.4153/CJM-1959-008-0). Here is a self-contained proof that also covers rectangular matrices over the reals or complexes.

## The precise statement

Let $$\mathbb K=\mathbb R$$ or $$\mathbb C$$. Suppose

$$
T:\mathbb K^{m\times n}\longrightarrow\mathbb K^{m\times n}
$$

is linear over $$\mathbb K$$ and satisfies

$$
\operatorname{rank}T(X)=\operatorname{rank}X
\qquad\text{for every }X.
$$

**Theorem.** There are invertible matrices $$A\in\mathbb K^{m\times m}$$ and $$B\in\mathbb K^{n\times n}$$ such that either

$$
\boxed{T(X)=AXB.}
$$

or, in the square case $$m=n$$,

$$
\boxed{T(X)=AX^\top B.}
$$

Conversely, each of these maps preserves every rank. Transposition gives an endomorphism of the same matrix space only in the square case.

We prove the theorem for $$m,n\geq2$$ first.

## 1. A lemma about two rank-one matrices

Every nonzero rank-one matrix is an outer product $$uv^\top$$. For nonzero vectors $$u,a\in\mathbb K^m$$ and $$v,b\in\mathbb K^n$$,

$$
\operatorname{rank}(uv^\top+ab^\top)\leq1
$$

if and only if $$u,a$$ are dependent or $$v,b$$ are dependent.

One direction is immediate: a common left or right factor makes the sum another outer product, possibly zero.

For the other direction, suppose both pairs are independent. Factor the sum as

$$
uv^\top+ab^\top
=\begin{pmatrix}u&a\end{pmatrix}
\begin{pmatrix}v^\top\\b^\top\end{pmatrix}.
$$

The right factor maps onto $$\mathbb K^2$$, while the left factor maps $$\mathbb K^2$$ injectively into $$\mathbb K^m$$. Their product therefore has rank two.

## 2. The two families of rank-one subspaces

For fixed nonzero $$u$$ and $$v$$, define

$$
\begin{aligned}
\mathcal L_u&=\{uw^\top:\ w\in\mathbb K^n\},\\
\mathcal R_v&=\{zv^\top:\ z\in\mathbb K^m\}.
\end{aligned}
$$

The first family fixes the column direction and has dimension $$n$$; the second fixes the row direction and has dimension $$m$$. Every matrix in either subspace has rank at most one.

**Claim.** These are exactly the maximal linear subspaces with that property.

To see this, take such a nonzero subspace $$S$$ and choose $$uv^\top\in S$$, nonzero. For every nonzero $$ab^\top\in S$$, the lemma applies to their sum. Thus either $$a$$ is parallel to $$u$$ or $$b$$ is parallel to $$v$$.

If all left factors are parallel to $$u$$, then $$S\subseteq\mathcal L_u$$. Otherwise, $$S$$ contains $$av^\top$$ with $$a$$ independent of $$u$$, after absorbing a scalar into $$a$$. Now consider any $$cd^\top\in S$$. If $$d$$ were not parallel to $$v$$, applying the lemma with both $$uv^\top$$ and $$av^\top$$ would force $$c$$ to be parallel to both independent vectors $$u$$ and $$a$$. That is impossible for nonzero $$c$$. Hence every right factor is parallel to $$v$$, and $$S\subseteq\mathcal R_v$$.

This proves containment in one of the two families. Each family member is maximal: it cannot be contained in another member of the same family unless they are equal, nor in a member of the other family because both dimensions are at least two.

The intersections record the distinction between the families. Distinct members of the same family intersect only at zero, whereas

$$
\mathcal L_u\cap\mathcal R_v
=\operatorname{span}\{uv^\top\}
$$

always has dimension one.

## 3. A rank preserver respects the two families

First, $$T$$ is automatically invertible. If $$T(X)=0$$, rank preservation forces $$X=0$$, so $$T$$ is injective; finite dimensionality makes it bijective. Its inverse also preserves rank.

Consequently, $$T$$ permutes the maximal subspaces from the previous step, and it preserves their intersection dimensions.

Two distinct $$\mathcal L$$-spaces cannot be sent to opposite families: their original intersection has dimension zero, while an $$\mathcal L$$-space and an $$\mathcal R$$-space always intersect in dimension one. Thus all $$\mathcal L$$-spaces go to the same family. The same holds for the $$\mathcal R$$-spaces.

Moreover, the two families must have opposite image types. Otherwise, the one-dimensional intersection of an $$\mathcal L$$-space with an $$\mathcal R$$-space would become an intersection within a single family, whose dimension is either zero or at least two.

There are therefore only two cases: $$T$$ preserves both families, or it exchanges them. Exchanging them requires $$m=n$$, because their dimensions must match. In that case, composing with transposition reduces us to a map that preserves both families.

## 4. Recovering the left and right factors

Assume now that both families are preserved. Let $$e_1,\ldots,e_m$$ and $$f_1,\ldots,f_n$$ be the standard bases, and set $$E_{ij}=e_i f_j^\top$$.

Choose nonzero vectors $$a_i$$ and $$b_j$$ such that

$$
T(\mathcal L_{e_i})=\mathcal L_{a_i},
\qquad
T(\mathcal R_{f_j})=\mathcal R_{b_j}.
$$

The intersection formula gives scalars $$c_{ij}\ne0$$ with

$$
T(E_{ij})=c_{ij}a_i b_j^\top.
$$

The vectors $$a_i$$ form a basis: otherwise every matrix in the image of $$T$$ would have all its columns in a proper subspace of $$\mathbb K^m$$, contradicting surjectivity. The same argument with rows shows that the $$b_j$$ form a basis.

Thus the matrices

$$
A_0=\begin{pmatrix}a_1&\cdots&a_m\end{pmatrix},
\qquad
C_0=\begin{pmatrix}b_1&\cdots&b_n\end{pmatrix}
$$

are invertible. Normalize the operator by defining

$$
S(X)=A_0^{-1}T(X)(C_0^\top)^{-1}.
$$

This still preserves rank, and now

$$
S(E_{ij})=c_{ij}E_{ij}.
$$

So only an entrywise scaling remains. We will show that its coefficients factor into a row scale and a column scale.

For $$i\ne k$$ and $$j\ne\ell$$, the matrix

$$
(e_i+e_k)(f_j+f_\ell)^\top
$$

has rank one. Its image under $$S$$ is supported on the corresponding two-by-two block, so rank preservation implies

$$
\det\begin{pmatrix}
c_{ij}&c_{i\ell}\\
c_{kj}&c_{k\ell}
\end{pmatrix}=0.
$$

Equivalently, every two-by-two minor of the coefficient matrix vanishes. Since all its entries are nonzero, choosing the first row and column yields

$$
c_{ij}=\frac{c_{i1}c_{1j}}{c_{11}}
=r_i s_j,
$$

where $$r_i=c_{i1}$$ and $$s_j=c_{1j}/c_{11}$$. The formula also holds when $$i=1$$ or $$j=1$$.

Let $$D_r=\operatorname{diag}(r_i)$$ and $$D_s=\operatorname{diag}(s_j)$$. By linearity,

$$
\begin{aligned}
S(X)&=D_rXD_s,\\
T(X)&=(A_0D_r)X(D_sC_0^\top).
\end{aligned}
$$

Both outside factors are invertible. This is exactly $$T(X)=AXB$$.

If we had composed with transposition in the preceding step, undoing it gives $$T(X)=AX^\top B$$ after renaming the two invertible factors. This completes the classification.

## Converse and edge cases

Multiplication by an invertible matrix does not change rank, and transposition exchanges row rank with column rank. Hence both displayed forms really do preserve every rank.

If $$m=1$$ or $$n=1$$, a nonzero matrix has rank one. Rank preservation is then simply invertibility of a linear map on a vector space. Such a map is already multiplication on the appropriate side, so the same statement holds; the two forms coincide when $$m=n=1$$.

Over $$\mathbb C$$, linearity means **complex** linearity. The transpose in the theorem is the ordinary transpose, not the conjugate transpose. If we allowed real-linear operators on complex matrices, entrywise conjugation would be another rank-preserving operation.

Finally, rank preservation does not imply preservation of singular values, determinants, or eigenvalues. For instance, $$X\mapsto2X$$ preserves all ranks. The rigidity concerns the *form of the operator*, not the numerical values attached to a matrix.

## The geometric reason

Rank-one matrices form the simplest possible products: one column direction times one row direction. Their maximal linear pieces come in exactly two families. An invertible linear map preserving rank must preserve this two-family structure, or exchange the families when their dimensions agree.

That is why an apparently unrestricted transformation of $$mn$$ entries collapses to two changes of basis, with transposition as the only extra symmetry.
