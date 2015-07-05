---
layout:     post
title:      "New Paper"
subtitle:   "An Interpolating Distance between Optimal Transport and Fisher-Rao"
date:       2015-06-24 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/hokusai-0.jpg"
---

Together with [Lenaic Chizat](https://www.ceremade.dauphine.fr/~chizat/), [François-Xavier Vialard](https://www.ceremade.dauphine.fr/~vialard/) and [Bernhard Schmitzer](https://www.ceremade.dauphine.fr/~schmitzer/), we released our paper ["An Interpolating Distance between Optimal Transport and Fisher-Rao"](http://arxiv.org/abs/1506.06430). It details a new metric between positive Radon measures, that does not need to be normalized. It is a blend of optimal transport (to take care of spatial displacement of mass) and Fisher-Rao (to take care of mass variation). On the mathematical side, we show existence of geodesics, existence and uniqueness of travelling Dirac's solutions, and give a precise meaning to the interpolation properties of the model between transport and F-R. We also present an extension of proximal solvers for optimal transport that can handle the extra Fisher-Rao term. The [Julia](http://julialang.org/) code to reproduce the results of this paper [is available online](https://github.com/lchizat/optimal-transport/). Note that the exact same metric was proposed independently in [this paper](http://arxiv.org/abs/1505.07746), that is quite complementary, since it presents many other mathematical contributions, including a derivation of gradient flows for this metric. 