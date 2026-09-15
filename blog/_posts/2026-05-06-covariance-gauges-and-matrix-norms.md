---
title: "When does a covariance gauge define a matrix norm?"
subtitle: "A characterization by monotonicity in the positive semidefinite order."
description: "A detailed proof that a positive convex homogeneous covariance gauge lifts to a matrix norm exactly when it is monotone."
topic: Matrix analysis
---

Given a way to measure a positive semidefinite matrix, a natural way to measure a general matrix is to apply it to its Gram matrix:

$$
N(X)=\sqrt{\gamma(X^\top X)}.
$$

When does this construction give a norm? The key condition is monotonicity in the positive semidefinite order: increasing a covariance should not decrease its size.

<!--more-->

<figure>
  <img src="{{ '/blog/imgs/matrixnorm.webp' | prepend: site.baseurl }}" alt="The equivalence between the norm property for the square-root Gram lift and monotonicity of the covariance gauge." loading="lazy">
  <figcaption>The basic equivalence, with the nondegeneracy assumption made explicit below.</figcaption>
</figure>

## A precise statement

Let $$\mathbb S_+^d$$ denote the cone of real symmetric positive semidefinite matrices. Suppose $$\gamma:\mathbb S_+^d\to[0,\infty)$$ is finite, convex, and positively homogeneous:
$$\gamma(tA)=t\gamma(A)$$ for $$t\geq0$$.
Assume also that $$\gamma(A)>0$$ whenever $$A\neq0$$.

Then the following are equivalent:

1. $$N(X)=\sqrt{\gamma(X^\top X)}$$ is a norm on $$\mathbb R^{d\times d}$$.
2. $$\gamma$$ is monotone for the Loewner order:

   $$
   0\preceq A\preceq B\quad\Longrightarrow\quad
   \gamma(A)\leq\gamma(B).
   $$

Moreover, condition 2 makes the same formula a norm on $$\mathbb R^{m\times d}$$ for **every** row dimension $$m$$. To infer monotonicity in the converse, testing on square matrices suffices.

The positivity assumption is necessary for the word *norm*. Without it, the corresponding statement concerns seminorms: for example, the zero gauge is monotone but its lift vanishes everywhere.

## Monotonicity implies the triangle inequality

Absolute homogeneity is immediate:

$$
N(tX)=\sqrt{\gamma(t^2X^\top X)}=|t|N(X).
$$

Also $$N(X)=0$$ implies $$X^\top X=0$$ and hence $$X=0$$. It remains to prove the triangle inequality.

Convexity and positive homogeneity imply subadditivity of $$\gamma$$. For $$0<\theta<1$$, the matrix form of the weighted square inequality is

$$
(X+Y)^\top(X+Y)
\preceq
\frac{X^\top X}{\theta}+\frac{Y^\top Y}{1-\theta}.
$$

Indeed, the difference between the right- and left-hand sides is $$Z^\top Z\succeq0$$, where

$$
Z=\sqrt{\frac{1-\theta}{\theta}}X
-\sqrt{\frac{\theta}{1-\theta}}Y.
$$

Applying monotonicity and subadditivity,

$$
N(X+Y)^2
\leq \frac{N(X)^2}{\theta}+\frac{N(Y)^2}{1-\theta}.
$$

If both norms are nonzero, choose
$$\theta=N(X)/(N(X)+N(Y))$$. This gives

$$
N(X+Y)^2\leq\bigl(N(X)+N(Y)\bigr)^2.
$$

The cases where one matrix is zero are immediate. This proof works for every row dimension.

## The norm property implies monotonicity

Now suppose $$N$$ is a norm on square matrices. Its Gram form makes it invariant under left multiplication by any orthogonal matrix $$U$$:

$$
N(UX)=N(X).
$$

The first step is to extend this invariance to an inequality for contractions.

### Every contraction is an average of orthogonal matrices

Let $$C$$ satisfy $$\|C\|_{\mathrm{op}}\leq1$$. In a singular value decomposition,

$$
C=U\operatorname{diag}(\sigma_1,\ldots,\sigma_d)V^\top,
\qquad 0\leq\sigma_i\leq1.
$$

Choose independent signs $$s_i\in\{-1,1\}$$ with
$$\mathbb P(s_i=1)=(1+\sigma_i)/2$$. Then

$$
C=\mathbb E\!\left[
U\operatorname{diag}(s_1,\ldots,s_d)V^\top
\right].
$$

Each matrix inside the expectation is orthogonal. The expectation is a finite convex combination, so convexity and orthogonal invariance imply

$$
N(CX)\leq
\mathbb E\,N\!\left(U\operatorname{diag}(s)V^\top X\right)
=N(X).
$$

### Compare two Gram matrices

Suppose $$0\preceq A\preceq B$$. Define a linear map on the range of $$B^{1/2}$$ by

$$
C(B^{1/2}x)=A^{1/2}x.
$$

This is well-defined: if $$B^{1/2}x=0$$, then
$$0\leq x^\top Ax\leq x^\top Bx=0$$, so $$A^{1/2}x=0$$. The same inequality shows that this map is a contraction:

$$
\|A^{1/2}x\|^2\leq\|B^{1/2}x\|^2.
$$

Extend it by zero on the orthogonal complement of that range. We obtain a square contraction with $$A^{1/2}=CB^{1/2}$$. Therefore,

$$
\sqrt{\gamma(A)}
=N(A^{1/2})
\leq N(B^{1/2})
=\sqrt{\gamma(B)}.
$$

Squaring proves the required monotonicity, including when $$A$$ or $$B$$ is singular.

## Examples and a warning

For $$1\leq p<\infty$$, the Schatten gauge

$$
\gamma(A)=\|A\|_{S_p}
=\left(\sum_i\lambda_i(A)^p\right)^{1/p}
$$

is convex, positive, and Loewner-monotone on the positive semidefinite cone. Its lift is

$$
N(X)=\left(\sum_i\sigma_i(X)^{2p}\right)^{1/(2p)}
=\|X\|_{S_{2p}}.
$$

Thus the trace gauge gives the Frobenius norm, and the operator-norm gauge gives the operator norm. A weighted trace $$\gamma(A)=\operatorname{tr}(QA)$$ with $$Q\succ0$$ gives $$N(X)=\|XQ^{1/2}\|_{\mathrm F}$$.

Convexity of the gauge alone is not sufficient. For instance, on two-by-two positive semidefinite matrices,

$$
\gamma(A)=|A_{11}-2A_{22}|+\tfrac1{10}\operatorname{tr}A
$$

is convex, positively homogeneous, and positive away from zero. But for $$A=\operatorname{diag}(1,0)$$ and $$B=\operatorname{diag}(1,\tfrac12)$$,

$$
A\preceq B,\qquad \gamma(A)=1.1>0.15=\gamma(B).
$$

Its Gram lift cannot be a norm. Monotonicity is exactly the missing property.
