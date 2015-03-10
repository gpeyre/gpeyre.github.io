---
layout:     post
title:      "New Paper"
subtitle:   "A Smoothed Dual Approach for Variational Wasserstein Problems"
date:       2015-03-10 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/hokusai-0.jpg"
---

[Marco Cuturi](http://www.iip.ist.i.kyoto-u.ac.jp/member/cuturi/), [Antoine Rolet](http://www.iip.ist.i.kyoto-u.ac.jp/member/rolet/) and myself just released a new paper entitled [A Smoothed Dual Approach for Variational Wasserstein Problems](http://arxiv.org/abs/1503.02533). It computes the [Legendre transform](http://en.wikipedia.org/wiki/Legendre_transformation) of the [entropic](http://en.wikipedia.org/wiki/Entropy) smoothing of the Wasserstein distance in order to tackle various variational problems involving [optimal transport distances](http://en.wikipedia.org/wiki/Transportation_theory_%28mathematics%29). It is somehow complementary to this related paper on [iterative Bregman projection](https://hal.archives-ouvertes.fr/hal-01096124), since, as [I recently shown here](http://arxiv.org/abs/1502.06216), [Bregman iterative projections](http://en.wikipedia.org/wiki/Bregman_method) (and the more general [Dykstra's algorithm](http://en.wikipedia.org/wiki/Dykstra%27s_projection_algorithm)) can be interpreted as a [block coordinate descent](http://en.wikipedia.org/wiki/Coordinate_descent) over a [dual problem](http://en.wikipedia.org/wiki/Duality_%28optimization%29). In our [new paper](http://arxiv.org/abs/1503.02533), we leverage the fact that the dual problem is a smooth unconstrained optimization problem to use second order method ([Newton](http://en.wikipedia.org/wiki/Newton%27s_method) and [L-BFGS](http://en.wikipedia.org/wiki/Broyden%E2%80%93Fletcher%E2%80%93Goldfarb%E2%80%93Shanno_algorithm)).
