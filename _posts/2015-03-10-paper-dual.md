---
layout:     post
title:      "New Paper"
subtitle:   "A Smoothed Dual Approach for Variational Wasserstein Problems"
date:       2015-03-10 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/hokusai-0.jpg"
---

Marco Cuturi, Antoine Rolet and myself just released a new paper entitled [A Smoothed Dual Approach for Variational Wasserstein Problems](http://arxiv.org/abs/1503.02533). It computes the Legendre transform of the entropic smoothing of the Wasserstein distance in order to tackle various variational problems involving optimal transport distances. It is somehow complementary to this related paper on [iterative Bregman projection](https://hal.archives-ouvertes.fr/hal-01096124), since, as [I recently shown here](http://arxiv.org/abs/1502.06216), Bregman projection (and the more general Dykstra's algorithm) can be interpreted as a block coordinate descent over a dual problem. In our [new paper](http://arxiv.org/abs/1503.02533), we leverage the fact that the dual problem is a smooth unconstrained optimization problem to use second order method (Newton and L-BFGS).
