---
title: "Duhamel’s formula for matrix products"
subtitle: "A telescoping identity that keeps track of noncommutativity."
description: "Derive the discrete Duhamel identity and use it to propagate local perturbations through a matrix product."
topic: Linear algebra
---

How does a long product of matrices change when each factor is perturbed? There is an exact answer that replaces one factor at a time:

$$
A_1\cdots A_n-B_1\cdots B_n
=\sum_{k=1}^n
A_1\cdots A_{k-1}(A_k-B_k)B_{k+1}\cdots B_n.
$$

This discrete Duhamel formula is simply a telescoping sum — but one whose ordering is indispensable when matrices do not commute.

<!--more-->

Empty products in this formula mean identity matrices. Assume square matrices of the same size for simplicity; the identity also holds for compatible rectangular factors.

<figure class="portrait-figure">
  <img src="{{ '/blog/imgs/duhamel.jpg' | prepend: site.baseurl }}" alt="A nineteenth-century portrait of the mathematician Jean-Marie Duhamel." loading="lazy" width="275" height="326">
  <figcaption>Jean-Marie Duhamel (1797–1872), circa 1860. Unknown photographer; public domain, via <a href="https://commons.wikimedia.org/wiki/File:JMC_Duhamel.jpg">Wikimedia Commons</a>.</figcaption>
</figure>

## Replace the factors one by one

Introduce the mixed products

$$
P_k=A_1\cdots A_kB_{k+1}\cdots B_n,
\qquad 0\leq k\leq n.
$$

Then $$P_0=B_1\cdots B_n$$ and $$P_n=A_1\cdots A_n$$. Two consecutive mixed products differ in exactly one place:

$$
P_k-P_{k-1}
=A_1\cdots A_{k-1}(A_k-B_k)B_{k+1}\cdots B_n.
$$

Summing over $$k$$ cancels all intermediate terms and proves the formula. No factor was moved past another, so no commutativity assumption was used.

For three factors, the identity reads

$$
\begin{aligned}
A_1A_2A_3-B_1B_2B_3
={}&(A_1-B_1)B_2B_3\\
&+A_1(A_2-B_2)B_3\\
&+A_1A_2(A_3-B_3).
\end{aligned}
$$

## From local errors to global stability

For a submultiplicative matrix norm, the identity immediately yields

$$
\|A_1\cdots A_n-B_1\cdots B_n\|
\leq
\sum_{k=1}^n
\left(\prod_{j<k}\|A_j\|\right)
\|A_k-B_k\|
\left(\prod_{j>k}\|B_j\|\right).
$$

Each term consists of a local perturbation, multiplied by the amplification contributed by the surrounding factors.

If all factors have norm at most $$M$$, then

$$
\|A_1\cdots A_n-B_1\cdots B_n\|
\leq M^{n-1}\sum_{k=1}^n\|A_k-B_k\|.
$$

For contractions ($$M\leq1$$), the total error is bounded by the sum of the local errors. If instead $$M=1+Lh$$ and $$nh=T$$, the amplification remains at most $$e^{LT}$$. This is the mechanism behind many discrete stability and numerical-integration estimates.

## The continuous analogue

For fixed matrices $$A,B$$, differentiate a mixed propagator:

$$
\frac{\mathrm d}{\mathrm ds}
\left(e^{sA}e^{(t-s)B}\right)
=e^{sA}(A-B)e^{(t-s)B}.
$$

Integration from $$0$$ to $$t$$ gives

$$
e^{tA}-e^{tB}
=\int_0^t e^{sA}(A-B)e^{(t-s)B}\,\mathrm ds.
$$

The discrete sum and the continuous integral have the same structure: insert a perturbation at one intermediate time, then propagate it on either side.

## A family connection

Duhamel was Joseph Bertrand’s uncle by marriage: his wife Virginie was the sister of Joseph’s father. Charles Hermite married Joseph’s sister Louise, connecting him to the same family. For this mathematical family history, see the [biographical account of Joseph Bertrand](https://www.annales.org/archives/x/jbertrand.html).
