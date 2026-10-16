---
title: "How many tokens does attention need?"
subtitle: "A square-root law at each query can hide a much harder global approximation problem."
description: "Why finite-token attention can converge slowly despite a pointwise square-root rate: exponential query sensitivity, a radius–tail tradeoff in L2, and interactive Gaussian attention curves."
topic: Attention and sampling
keywords:
  - "token sample complexity"
  - "attention"
  - "self-attention"
  - "softmax attention"
  - "transformers"
  - "context length"
  - "prompt length"
  - "infinite-token limit"
  - "large-prompt regime"
  - "empirical measure"
  - "Gaussian tokens"
  - "sub-Gaussian distributions"
  - "exponential tilting"
  - "importance sampling"
  - "Monte Carlo"
  - "pointwise convergence"
  - "uniform convergence"
  - "L2 approximation"
  - "root mean square error"
  - "tail truncation"
  - "attention horizon"
  - "concentration inequalities"
  - "central limit theorem"
  - "lognormal weights"
  - "effective sample size"
  - "extreme tokens"
  - "Léa Bohbot"
  - "Cyril Letrouit"
  - "François-Xavier Vialard"
  - "Etienne Boursier"
  - "Claire Boyer"
  - "complexité en nombre de tokens"
  - "attention gaussienne"
  - "convergence statistique"
proofs: true
embedded_experiment: true
---

Suppose an attention head has already been trained. Keep its weights fixed, but give it more and more tokens sampled from the same distribution. How quickly does its output stabilize? Equivalently, how many sampled keys do we need to approximate attention over a very large context?

This is the question of *token sample complexity*, which we study with Léa Bohbot, Cyril Letrouit, and François-Xavier Vialard in our recent paper [[1]](#ref-token). It concerns the number of tokens used at inference, not the number of examples used to train the model. There is also beautiful, independent and concurrent work by Etienne Boursier and Claire Boyer on this same question [[2]](#ref-boursier).

The apparent paradox is simple. For Gaussian or sub-Gaussian tokens, attention at a fixed query has the familiar Monte Carlo scale $$n^{-1/2}$$. But the constant can grow exponentially as the query moves away from the origin. To control the error over an entire token distribution, we must balance these increasingly difficult queries against their increasingly small probability. We will make this tradeoff explicit for one-dimensional Gaussians.

<!--more-->

## From a finite context to a population map

Let $$Y_1,\ldots,Y_n$$ be independent tokens with law $$\mu$$ on $$\mathbb R^d$$. A single, unmasked attention head maps a query $$x$$ to

$$
 T_n(x)=\frac{\sum_{j=1}^n e^{\langle Bx,Y_j\rangle}VY_j}
                    {\sum_{j=1}^n e^{\langle Bx,Y_j\rangle}}.
$$

The matrix $$B$$ combines the query and key projections, including their usual scaling; $$V$$ is the value projection. This is the usual softmax weighted average [[3]](#ref-vaswani). Replacing empirical averages by integrals, when finite, gives the infinite-token map

$$
 T(x)=\frac{\int e^{\langle Bx,y\rangle}Vy\,d\mu(y)}
                  {\int e^{\langle Bx,y\rangle}\,d\mu(y)}.
$$

Thus $$T_n=T_{\mu_n}$$, where $$\mu_n=n^{-1}\sum_j\delta_{Y_j}$$. This measure-based viewpoint lets us compare different context lengths without changing the ambient space [[4]](#ref-vuckovic). In self-attention, we evaluate the same map at the context tokens themselves.

> **A sampling model, not a model of every text sequence.** The mathematics below assumes i.i.d. tokens and a fixed attention head. Real text has dependence, position, and many interacting layers. These bounds isolate one source of error: replacing a token distribution by a finite random context.

## Gaussians make the target beautifully simple

For $$\mu=\mathcal N(0,\Sigma)$$, exponential tilting shifts the Gaussian mean without changing its covariance:

$$
 \frac{e^{\langle Bx,y\rangle}\,d\mu(y)}
      {\int e^{\langle Bx,z\rangle}\,d\mu(z)}
 =d\mathcal N(\Sigma Bx,\Sigma)(y).
$$

Consequently, population attention is exactly linear in the query:

$$
 T(x)=V\Sigma Bx.
$$

This Gaussian structure also makes attention dynamics tractable [[5]](#ref-castin). Here we only need one layer. In one dimension, take $$\mu=\mathcal N(0,1)$$, $$V=1$$, and $$B=\tau\ge0$$. Then

$$
 T_n(x)=\frac{\sum_jY_j e^{\tau xY_j}}{\sum_j e^{\tau xY_j}},
 \qquad T(x)=\tau x.
$$

The parameter $$\tau$$ controls the strength of attention: larger $$\tau$$ makes the weights more selective. Although its limiting target is a straight line, a finite-sample attention map is usually curved.

<details class="blog-proof">
<summary>Why the Gaussian map is linear</summary>
<div class="blog-proof-body" markdown="1">

The Gaussian moment-generating function is $$M(t)=\exp(t^\top\Sigma t/2)$$. Differentiating under the integral gives $$\int y e^{\langle t,y\rangle}\,d\mu(y)=\Sigma t\,M(t)$$. Substitute $$t=Bx$$ and cancel $$M(t)$$ between numerator and denominator. $$\square$$

</div>
</details>

## A square-root rate, with an expensive constant

At a fixed query, $$T_n(x)$$ is a ratio of sample averages. In our one-dimensional Gaussian example, the central limit theorem gives the particularly informative formula

$$
 \sqrt n\,[T_n(x)-\tau x]
 \;\Longrightarrow\;
 \mathcal N\!\left(0,(1+\tau^2x^2)e^{\tau^2x^2}\right).
$$

So the asymptotic fluctuation scale is

$$
 \frac{\sqrt{1+\tau^2x^2}\,e^{\tau^2x^2/2}}{\sqrt n}.
$$

The square-root law is there, but so is an exponential penalty in the squared query radius. A query near zero averages many ordinary tokens. A large positive query puts most weight on rare, large positive tokens, which a finite context may simply not contain. Attention is a form of self-normalized importance sampling, with its familiar difficulty of highly uneven weights [[6]](#ref-importance).

<details class="blog-proof">
<summary>A short calculation of the fixed-query variance</summary>
<div class="blog-proof-body" markdown="1">

Set $$t=\tau x$$, $$D_n=n^{-1}\sum_j e^{tY_j}$$, and $$D=e^{t^2/2}$$. The numerator of $$T_n(x)-t$$ is the average of the centered variables $$(Y_j-t)e^{tY_j}$$. The central limit theorem and $$D_n\to D$$ give an asymptotic variance equal to

$$
 \frac{\mathbb E[(Y-t)^2e^{2tY}]}{D^2}
 =(1+t^2)e^{t^2}.
$$

For the last equality, tilt the standard Gaussian by $$2t$$: its new mean is $$2t$$, so the expectation of $$(Y-t)^2$$ under the tilted law is $$1+t^2$$. This is a fixed-query asymptotic statement, not a finite-sample confidence interval. $$\square$$

</div>
</details>

Our paper goes beyond a fixed query: Theorem 4.2 controls *all queries in a ball at once*, for general sub-Gaussian token distributions [[1]](#ref-token). We only need its simple one-dimensional Gaussian specialization.

<span id="theorem-1"></span>
**Theorem 1 (local Gaussian control).** Let the context tokens be i.i.d. standard Gaussians. Fix $$\tau>0$$, a radius $$R>0$$, and $$\delta\in(0,1)$$. Then

$$
 \sup_{|x|\le R}|T_n(x)-\tau x|
 \le C_{\tau,\delta}(1+R)\,
       \frac{e^{8\tau^2R^2}}{\sqrt n}
$$

with probability at least $$1-\delta$$, once $$n$$ is sufficiently large depending on $$R,\tau,\delta$$. The constant $$C_{\tau,\delta}$$ does not depend on $$R,n$$. The required sample-size threshold also grows exponentially with $$R^2$$.

The important feature is the competition between $$n^{-1/2}$$ and the exponential radius factor, not the numerical constant $$8$$. In higher dimensions, the paper tracks the full sub-Gaussian parameter matrix $$\Sigma$$; a useful dimensionless measure of attention strength is the *attention horizon*

$$
 H=\|\Sigma^{1/2}B\Sigma^{1/2}\|_{\mathrm{op}}.
$$

For standard one-dimensional Gaussians, $$H=\tau$$.

## From local control to an $$L^2(\mu)$$ error

To avoid tracking output moments, let us measure the map error directly:

$$
 E_n=\|T_n-T\|_{L^2(\mu)}
     =\left(\int\|T_n(x)-T(x)\|^2\,d\mu(x)\right)^{1/2}.
$$

After drawing a context, this is its root-mean-square error on a fresh query with law $$\mu$$. The integral averages over queries; the context, and hence $$E_n$$, is still random. This is neither the error of the mean output nor an average over the same $$n$$ context points.

In our Gaussian example, split queries into the central interval $$[-R,R]$$ and its complement. On the interval, use Theorem 1. Outside it, the query density decays like $$e^{-x^2/2}$$; taking the square root for an $$L^2$$ norm leaves a factor $$e^{-R^2/4}$$. Suppressing polynomial and logarithmic factors for a moment, this gives

$$
 E_n\lesssim
 \underbrace{n^{-1/2}e^{8\tau^2R^2}}_{\text{central interval}}
 +\underbrace{e^{-R^2/4}}_{\text{Gaussian tail}}.
$$

Increasing $$R$$ makes the tail smaller but the central estimate worse. Equating the two terms chooses

$$
 R_n^2=\frac{2\log n}{1+32\tau^2}.
$$

Both contributions now have the same power $$n^{-1/[2(1+32\tau^2)]}$$, slower than $$n^{-1/2}$$. The region on which we demand accurate attention must expand with the number of samples, and this expansion consumes part of the square-root gain.

Here is a concrete $$L^2$$ version for the Gaussian example. It follows from Theorem 1 and Gaussian tails, and is intended to display the mechanism, not an optimal exponent.

<span id="theorem-2"></span>
**Theorem 2 (a Gaussian global bound).** Let $$Y_j$$ be i.i.d. standard Gaussians and fix $$\tau>0$$. For every $$\delta\in(0,1)$$, there are constants $$C_{\tau,\delta}$$ and $$n_0$$ such that, for every $$n\ge n_0$$, with probability at least $$1-\delta$$,

$$
 E_n\le C_{\tau,\delta}\sqrt{\log(en)}\,n^{-\beta_\tau},
$$

$$
 \beta_\tau=\frac{1}{2(1+32\tau^2)}.
$$

<details class="blog-proof">
<summary>Proof: balance the central interval against the Gaussian tail</summary>
<div class="blog-proof-body" markdown="1">

*Inside the interval.* Theorem 1, with failure probability $$\delta/2$$, gives

$$
 \|(T_n-T)\mathbf1_{|x|\le R}\|_{L^2(\mu)}
 \le C_{\tau,\delta}(1+R)\frac{e^{8\tau^2R^2}}{\sqrt n}.
$$

*Outside the interval.* Attention is a convex combination of its sampled values, so $$\lvert T_n(x)\rvert\le M_n:=\max_j\lvert Y_j\rvert$$ for every query. With probability at least $$1-\delta/2$$, the Gaussian union bound gives $$M_n\le\sqrt{2\log(4n/\delta)}$$. Together with $$T(x)=\tau x$$, this yields

$$
 \|(T_n-T)\mathbf1_{|x|>R}\|_{L^2(\mu)}
 \le C_\tau\sqrt{\log(n/\delta)+R+1}\,e^{-R^2/4}.
$$

<details class="blog-proof">
<summary>The tail estimate in two lines</summary>
<div class="blog-proof-body" markdown="1">

For a fresh $$X\sim\mathcal N(0,1)$$, use $$(u-v)^2\le2u^2+2v^2$$ to bound the squared tail error by

$$
 2M_n^2\mathbb P(|X|>R)
 +2\tau^2\mathbb E[X^2\mathbf1_{|X|>R}].
$$

The two Gaussian tail quantities are at most $$2e^{-R^2/2}$$ and $$C(R+1)e^{-R^2/2}$$, respectively. Taking a square root explains the exponent $$-R^2/4$$.

</div>
</details>

*Balance.* Choose $$R_n^2=2\log n/(1+32\tau^2)$$. Both exponential terms then contribute $$n^{-\beta_\tau}$$; the remaining factors are bounded by $$C_{\tau,\delta}\sqrt{\log(en)}$$. The sample-size condition in Theorem 1 is satisfied for all sufficiently large $$n$$: it takes the form $$n\ge C_\delta n^{4\tau^2/(1+32\tau^2)}$$, whose exponent on the right is less than one. A union bound completes the proof. $$\square$$

</div>
</details>

> **A slower guarantee is not a universal lower bound.** The exponent above is deliberately conservative. It does not say that every attention head, or every observable, must converge at exactly that rate. For a fixed compactly supported law, a global $$n^{-1/2}$$ bound remains possible, albeit with a potentially enormous constant. At $$\tau=0$$, attention is simply the sample mean and the ordinary square-root rate holds. The paper develops the broader sub-Gaussian theory; the result above is a short Gaussian $$L^2$$ consequence of its uniform estimate, not a verbatim restatement of a moment theorem.

## Numerical experimentation

The black line below is the exact population map $$x\mapsto\tau x$$. Each colored curve uses a different Gaussian context of the same size $$n$$. Move the token-count slider to enlarge these contexts; resampling draws five new contexts. Increasing $$\tau$$ makes the tail effect easier to see.

<iframe class="idea-experiment" data-experiment="attention-sampling" title="Gaussian attention: finite-token curves and population-weighted errors" src="{{ '/blog/preparations/assets/attention-sampling/index.html' | relative_url }}" loading="lazy"></iframe>

Five independent sample streams, nested as $$n$$ increases. Curves are evaluated from the actual softmax sums, without fitting or smoothing. The reported $$L^2$$ errors use Gaussian-weighted quadrature on $$[-8,8]$$, separately for each context; they are not an expectation over all possible contexts. The plotted query interval is $$[-4,4]$$.
{: .blog-figure-caption }

Look first near zero, where the empirical curves usually follow the line quite well. Then look farther out. For $$\tau>0$$, every finite-context curve eventually saturates:

$$
 \lim_{x\to+\infty}T_n(x)=\max_jY_j,
 \qquad
 \lim_{x\to-\infty}T_n(x)=\min_jY_j.
$$

The population map never saturates. More tokens move the extremes outward, but only on the scale $$\sqrt{2\log n}$$. Thus pointwise convergence and persistent tail discrepancies coexist. The weighted-error panel shows where those discrepancies actually matter to $$L^2(\mu)$$: raw error alone does not account for how rarely a query occurs.

These few sample paths illustrate the mechanism, not a fitted convergence exponent. A particular context can improve or worsen when more tokens are added. The statistical bounds describe probabilities over contexts, not monotone improvement along every realization.

## References

1. <span id="ref-token"></span> Léa Bohbot, Cyril Letrouit, Gabriel Peyré, and François-Xavier Vialard. [*Token Sample Complexity of Attention*](https://arxiv.org/abs/2512.10656). 2025; revised 2026. [Version used here: v3](https://arxiv.org/html/2512.10656v3).
1. <span id="ref-boursier"></span> Etienne Boursier and Claire Boyer. [*Softmax as Linear Attention in the Large-Prompt Regime: a Measure-based Perspective*](https://arxiv.org/abs/2512.11784). 2025; revised 2026.
1. <span id="ref-vaswani"></span> Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, and Illia Polosukhin. [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762). NeurIPS, 2017.
1. <span id="ref-vuckovic"></span> James Vuckovic, Aristide Baratin, and Remi Tachet des Combes. [*A Mathematical Theory of Attention*](https://arxiv.org/abs/2007.02876). 2020.
1. <span id="ref-castin"></span> Valérie Castin, Pierre Ablin, José Antonio Carrillo, and Gabriel Peyré. [*A Unified Perspective on the Dynamics of Deep Transformers*](https://arxiv.org/abs/2501.18322). 2025; revised 2026.
1. <span id="ref-importance"></span> Sergios Agapiou, Omiros Papaspiliopoulos, Daniel Sanz-Alonso, and Andrew M. Stuart. [*Importance Sampling: Intrinsic Dimension and Computational Cost*](https://arxiv.org/abs/1511.06196). Statistical Science 32(3), 405–431, 2017.
