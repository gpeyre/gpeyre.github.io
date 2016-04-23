---
layout:     post
title:      "Papers"
subtitle:   "Two optimal transport related papers at SIGGRAPH 2016"
date:       2016-04-22 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/ecriture.jpg"
---

Together with my co-authors, we have released two papers accepted at SIGGRAPH 2016, that are related to optimal transport and its applications in computer graphics and imaging.

With [Nicolas](http://liris.cnrs.fr/~nbonneel/) and [Marco](http://www.iip.ist.i.kyoto-u.ac.jp/member/cuturi/) we propose in  [Wasserstein Barycentric Coordinates: Histogram Regression Using Optimal Transport](https://hal.archives-ouvertes.fr/hal-01303148) a way to compute barycentric coordinates for histograms, according to the geometry defined by optimal transport (the so-called [Wasserstein distance](https://en.wikipedia.org/wiki/Wasserstein_metric). It is useful to perform vizualization and to navigate in collections of histograms, and also enables to compute "projections" on a geodesic simplex defined by these histograms. The main contribution is a computationally tractable optimization scheme, that makes use of recursive differentiation of [Sinkhorn's algorithm](http://www.numerical-tours.com/matlab/optimaltransp_5_entropic/).


With [Justin](people.csail.mit.edu/jsolomon/), [Vova](http://vovakim.com/) and [Suvrit](http://suvrit.de/), we propose in
[Entropic Metric Alignment for Correspondence Problems](https://hal.archives-ouvertes.fr/hal-01305808) a fast iterative scaling algorithm to approximate the solution of quadratic assignment problems. It iteratively solves an entropic regularization of optimal transport, which in turn can be solved using [Sinkhorn's algorithm](http://www.numerical-tours.com/matlab/optimaltransp_5_entropic/), and is similar to the ["softassign" algorithm](http://ieeexplore.ieee.org/iel1/34/10562/00491619.pdf).
