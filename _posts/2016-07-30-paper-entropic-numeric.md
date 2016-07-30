---
layout:     post
title:      "New Paper"
subtitle:   "Scaling Algorithms for Unbalanced Transport Problems"
date:       2016-07-30 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/ecriture.jpg"
---

Together with [Lenaic Chizat](https://www.ceremade.dauphine.fr/~chizat/), [François-Xavier Vialard](https://www.ceremade.dauphine.fr/~vialard/) and [Bernhard Schmitzer](https://www.ceremade.dauphine.fr/~schmitzer/), we released our paper ["Scaling Algorithms for Unbalanced Transport Problems"](http://arxiv.org/abs/1607.05816). It is the third and last paper about generalized "unbalanced" optimal transport, which is a recently hot topic in the (small but rapidly growing!) world of optimal transport (OT) theorists and practitioners.

- In the first paper ["An Interpolating Distance between Optimal Transport and Fisher-Rao"](http://arxiv.org/abs/1506.06430), we proposed (simultaneously and independently with two other groups of researchers) a new geodesic distance between two arbitrary positive measures, generalizing OT to the unblanced cases (i.e. when the measures are not normalized to unit mass).
- In the second paper ["Unbalanced Optimal Transport: Geometry and Kantorovich Formulation"](http://arxiv.org/abs/1508.05216), we showed (simultaneously and independently with another group of researchers) that this distance is a special case of a generic class of "static" OT problems, which generalizes the linear programming formulation of OT.
- In this last paper, ["Scaling Algorithms for Unbalanced Transport Problems"](http://arxiv.org/abs/1607.05816), we show how to solve efficiently these problems, and many more (in particular also barycenters and gradient flows) using entropic regularization, a recent computational technic championed by [Marco Cuturi](https://arxiv.org/abs/1306.0895). The resulting algorithm is a far reaching generalization of [Sinkhorn iterative scaling method](https://en.wikipedia.org/wiki/Sinkhorn%27s_theorem). 
