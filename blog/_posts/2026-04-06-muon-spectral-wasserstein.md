---
title: "Muon as a spectral Wasserstein flow"
subtitle: "From matrix orthogonalization to a geometry of distributions."
description: "How Muon's polar update connects to a Wasserstein gradient flow defined through displacement covariances."
topic: Optimal transport
---

In my [paper *Muon Dynamics as a Spectral Wasserstein Flow*](https://arxiv.org/abs/2604.04891), I connect a matrix optimizer to optimal transport by changing how a distribution's motion is measured.

<!--more-->

**Muon** replaces the nonzero singular values of its momentum matrix by ones. Ignoring momentum and stochasticity, the compact SVD $$G_k=\nabla F(X_k)=U_k\Sigma_k V_k^\top$$ gives the update direction

$$
X_{k+1}=X_k-\eta_k U_kV_k^\top.
$$

**The spectral Wasserstein distance** uses a norm $$\gamma$$ on symmetric matrices, monotone in the positive semidefinite order. For probability measures on $$\mathbb R^d$$ with finite second moments, define

$$
\begin{aligned}
\Sigma_\pi&=\int(y-x)(y-x)^\top\,\mathrm d\pi(x,y),\\
\mathsf W_\gamma(\mu,\nu)^2
&=\inf_{\pi\in\Pi(\mu,\nu)}\gamma(\Sigma_\pi).
\end{aligned}
$$

Here $$\Pi(\mu,\nu)$$ denotes all couplings. The trace choice $$\gamma(S)=\operatorname{tr}(S)$$ recovers $$\mathsf W_2$$; the operator norm $$\gamma(S)=\|S\|_{\mathrm{op}}$$ measures the largest directional mean-square displacement.

**The connection** comes from the infinitesimal cost $$\gamma(\int vv^\top\,\mathrm d\mu)$$. For particles $$\mu_X=n^{-1}\sum_i\delta_{x_i}$$ stacked as rows of $$X$$, the operator choice gives $$n^{-1}\|\dot X\|_{\mathrm{op}}^2$$. For a loss $$\mathcal F$$ and $$F(X)=n\mathcal F(\mu_X)$$, steepest descent reads

$$
\begin{aligned}
G&=\nabla F(X)=U\Sigma V^\top,\\
\dot X&=-\|G\|_*UV^\top,
\end{aligned}
$$

where $$\|G\|_*=\sum_i\sigma_i$$ is the nuclear norm. This is Muon's polar direction with a scalar speed factor: the paper's idealized continuous-time, zero-momentum mean-field dynamics is a $$\mathsf W_\gamma$$ gradient flow.
