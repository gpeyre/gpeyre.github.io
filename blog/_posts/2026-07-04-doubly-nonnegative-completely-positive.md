---
title: "Two notions of positivity, separated by a pentagon"
subtitle: "Doubly nonnegative is not always completely positive."
description: "A five-by-five matrix and an elementary proof of the gap between doubly nonnegative and completely positive matrices."
topic: Linear algebra
---

A symmetric matrix can be positive in two different senses: positive semidefinite, and nonnegative entry by entry. Requiring both gives the cone of **doubly nonnegative matrices**

$$
\mathcal D_n=\{X\in\mathbb R^{n\times n}:X=X^\top,\ X\succeq0,\ X_{ij}\geq0\}.
$$

A seemingly similar condition is to ask for a Gram factorization with nonnegative vectors. This defines the cone of **completely positive matrices**. The two cones agree up to dimension four — but not in dimension five.

<!--more-->

## The two cones

Write

$$
\mathcal C_n=
\{AA^\top:A\in\mathbb R_+^{n\times p}
\text{ for some finite }p\}.
$$

Every such matrix is positive semidefinite and entrywise nonnegative, so $$\mathcal C_n\subseteq\mathcal D_n$$. The converse holds for $$n\leq4$$, and fails for every $$n\geq5$$; see Anstreicher, Burer, and Dür’s [study of the five-dimensional gap](https://optimization-online.org/2008/05/1990/).

The terminology matters: “totally positive” usually refers to positivity of all minors, which is a different property from complete positivity.

## A five-cycle counterexample

Set $$a=(\sqrt5-1)/2$$ and consider

$$
X=
\begin{pmatrix}
1&a&0&0&a\\
a&1&a&0&0\\
0&a&1&a&0\\
0&0&a&1&a\\
a&0&0&a&1
\end{pmatrix}.
$$

Its nonzero off-diagonal entries trace the edges of a pentagon.

### It is doubly nonnegative

Entrywise nonnegativity is immediate. To check the spectrum, write $$X=I+aH$$, where $$H$$ is the adjacency matrix of the five-cycle. Its Fourier eigenvectors give the eigenvalues

$$
\lambda_k(X)=1+2a\cos\left(\frac{2\pi k}{5}\right),
\qquad k=0,\ldots,4.
$$

The smallest cosine is $$-(1+\sqrt5)/4$$. Our choice of $$a$$ makes the smallest eigenvalue zero, so all eigenvalues are nonnegative.

### It is not completely positive

Suppose, for a contradiction, that

$$
X=\sum_{\ell=1}^p u_\ell u_\ell^\top,
\qquad u_\ell\geq0.
$$

Whenever $$X_{ij}=0$$, nonnegativity forces $$(u_\ell)_i(u_\ell)_j=0$$ for every $$\ell$$. Thus the support of each column $$u_\ell$$ must be a clique of the five-cycle. A pentagon has no triangles, so each support contains at most two vertices, and those vertices must be adjacent.

For a vector supported on one edge, the elementary inequality $$s^2+t^2\geq2st$$ yields

$$
\|u_\ell\|^2
\geq 2\sum_{\{i,j\}\in E}(u_\ell)_i(u_\ell)_j,
$$

where $$E$$ consists of the five unordered edges of the cycle. The same inequality holds for a vector supported on a single vertex.

Summing over the factor columns would imply

$$
\operatorname{tr}X\geq 2\sum_{\{i,j\}\in E}X_{ij}=10a.
$$

But $$\operatorname{tr}X=5$$ and $$a>1/2$$. This contradiction proves $$X\notin\mathcal C_5$$.

For larger dimensions, append a zero block. Any completely positive factorization of the enlarged matrix would give one for its leading principal five-by-five block, so the gap persists.
