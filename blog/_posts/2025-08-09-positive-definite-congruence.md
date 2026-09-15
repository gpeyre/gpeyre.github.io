---
title: "Solving a positive definite congruence equation"
subtitle: "A global diffeomorphism hidden inside a matrix square root."
description: "An explicit solution of UYU = X, with proofs of uniqueness and smooth dependence on positive definite matrices."
topic: Linear algebra
---

For positive numbers, solving $$uyu=x$$ is easy: $$u=\sqrt{x/y}$$. What remains true when the variables are matrices, which need not commute?

If $$X$$ and $$Y$$ are symmetric positive definite, there is still exactly one symmetric positive definite solution of $$UYU=X$$. More surprisingly, for fixed $$Y$$, the correspondence between $$U$$ and $$X$$ is a global smooth change of coordinates on the positive definite cone.

<!--more-->

This expands the lemma in my [note of 9 August 2025](https://bsky.app/profile/gabrielpeyre.bsky.social/post/3lvxnbcglps2u).

## The statement

Let $$\mathbb S_n$$ be the vector space of real symmetric $$n\times n$$ matrices, and write

$$
\mathbb S_n^{++}
=\{X\in\mathbb S_n:\ z^\top Xz>0
\text{ for every }z\ne0\}.
$$

This is an open subset of $$\mathbb S_n$$. Fix $$Y\in\mathbb S_n^{++}$$ and consider

$$
\Psi_Y:\mathbb S_n^{++}\longrightarrow\mathbb S_n^{++},
\qquad U\longmapsto UYU.
$$

**Theorem.** The map $$\Psi_Y$$ is a $$C^\infty$$ diffeomorphism: it is bijective, smooth, and its inverse is smooth. Explicitly,

$$
\boxed{
\begin{gathered}
\Psi_Y^{-1}(X)\\
=Y^{-1/2}
\bigl(Y^{1/2}XY^{1/2}\bigr)^{1/2}
Y^{-1/2}.
\end{gathered}
}
$$

Every square root here is the **principal positive definite square root**. If $$M=Q\operatorname{diag}(\lambda_i)Q^\top$$ with $$\lambda_i>0$$, it is

$$
M^{1/2}=Q\operatorname{diag}(\sqrt{\lambda_i})Q^\top.
$$

Notice which variable is fixed: $$Y\mapsto UYU^\top$$ is an ordinary linear congruence transformation when $$U$$ is fixed. Here we fix $$Y$$ and vary the symmetric matrix $$U$$, so the map is quadratic.

## Proof: reduce to a square

First, the map takes positive definite matrices to positive definite matrices. Indeed, $$U$$ is invertible, and for $$z\ne0$$,

$$
z^\top UYU z=(Uz)^\top Y(Uz)>0.
$$

Now introduce

$$
C=Y^{1/2}UY^{1/2},
\qquad M=Y^{1/2}XY^{1/2}.
$$

Congruence by $$Y^{1/2}$$ preserves positive definiteness. Moreover,

$$
\begin{aligned}
UYU=X
&\iff Y^{1/2}UYUY^{1/2}=M\\
&\iff C^2=M.
\end{aligned}
$$

Thus the nonlinear equation has become a square-root problem. There is exactly one positive definite $$C$$ with $$C^2=M$$, namely $$C=M^{1/2}$$.

For completeness, uniqueness does not require choosing eigenvectors smoothly. If a positive definite $$C$$ satisfies $$C^2=M$$, then $$C$$ commutes with $$M$$. It therefore preserves each eigenspace of $$M$$. On an eigenspace with eigenvalue $$\lambda>0$$, the symmetric positive definite restriction of $$C$$ has square $$\lambda I$$, so all its eigenvalues equal $$\sqrt{\lambda}$$. Hence it is $$\sqrt{\lambda}I$$ there.

Returning to the original variable gives

$$
U=Y^{-1/2}M^{1/2}Y^{-1/2}.
$$

This matrix is positive definite, and direct substitution verifies

$$
\begin{aligned}
UYU
&=Y^{-1/2}M^{1/2}M^{1/2}Y^{-1/2}\\
&=Y^{-1/2}MY^{-1/2}=X.
\end{aligned}
$$

We have proved both existence and uniqueness.

## Why the inverse is smooth

The forward map is polynomial, hence smooth. To prove smoothness of the inverse, we can examine its differential instead of differentiating an eigendecomposition.

For a symmetric perturbation $$H$$,

$$
D\Psi_Y(U)[H]=HYU+UYH.
$$

Set $$C=Y^{1/2}UY^{1/2}$$ as above, and $$Z=Y^{1/2}HY^{1/2}$$. Then

$$
Y^{1/2}D\Psi_Y(U)[H]Y^{1/2}
=ZC+CZ.
$$

Diagonalize $$C$$ in an orthonormal basis, with eigenvalues $$\lambda_1,\ldots,\lambda_n>0$$. In that basis, the linear map $$Z\mapsto ZC+CZ$$ acts entrywise as

$$
Z_{ij}\longmapsto(\lambda_i+\lambda_j)Z_{ij}.
$$

All these multipliers are strictly positive. The map is therefore invertible on symmetric matrices: solving $$ZC+CZ=E$$ amounts to setting

$$
Z_{ij}=\frac{E_{ij}}{\lambda_i+\lambda_j}.
$$

The surrounding congruence transformations are invertible too, so $$D\Psi_Y(U)$$ is invertible at every $$U\in\mathbb S_n^{++}$$. The inverse function theorem gives a smooth local inverse everywhere. Since $$\Psi_Y$$ is already globally bijective, these local inverses agree with its unique global inverse. This proves the diffeomorphism claim.

This argument also explains why repeated eigenvalues cause no problem: the relevant denominators are **sums** of positive eigenvalues, never their differences.

## A noncommuting example

Take

$$
Y=\begin{pmatrix}1&0\\0&4\end{pmatrix},
\qquad
U=\begin{pmatrix}2&1\\1&2\end{pmatrix}.
$$

Then

$$
X=UYU=\begin{pmatrix}8&10\\10&17\end{pmatrix}.
$$

All three matrices are positive definite, but $$U$$ and $$Y$$ do not commute. The change of variables gives

$$
C=\begin{pmatrix}2&2\\2&8\end{pmatrix},
\qquad
C^2=\begin{pmatrix}8&20\\20&68\end{pmatrix}
=Y^{1/2}XY^{1/2}.
$$

The inverse formula recovers $$U$$ exactly. By contrast, the tempting expression $$X^{1/2}Y^{-1/2}$$ is generally not even symmetric. It is valid when $$X$$ and $$Y$$ commute, because they can then be diagonalized together and the problem reduces coordinatewise to the scalar equation.

## Covariances and the role of positivity

If a centered random vector $$z$$ has covariance $$Y$$, then

$$
\operatorname{Cov}(Uz)=UYU^\top=UYU.
$$

The theorem therefore selects a unique symmetric positive definite linear transformation sending covariance $$Y$$ to covariance $$X$$. For Gaussian vectors, it also sends the entire law $$\mathcal N(0,Y)$$ to $$\mathcal N(0,X)$$.

Positive definiteness is essential to the statement. Without positivity of $$U$$, uniqueness already fails for $$Y=X=I$$: both $$U=I$$ and $$U=-I$$ work. At the boundary of the positive semidefinite cone, the inverse need not be smooth: even for scalars with $$y=1$$, the derivative of $$\sqrt{x}$$ diverges at zero.

The useful principle is simple: surround the unknown with $$Y^{1/2}$$, take one positive square root, and undo the congruence.
