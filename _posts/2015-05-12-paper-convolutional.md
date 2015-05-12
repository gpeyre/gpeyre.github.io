---
layout:     post
title:      "New Paper"
subtitle:   "Convolutional Wasserstein Distances: Efficient Optimal Transportation on Geometric Domains"
date:       2015-05-12 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/hokusai-0.jpg"
---

Together with a bunch of co-authors, including [Justin Solomon](http://web.stanford.edu/~justso1/), 
[Fernando de Goes](http://fernandodegoes.org/) and [Marco Cuturi](http://www.iip.ist.i.kyoto-u.ac.jp/member/cuturi/), we released our [paper on Convolutional Wasserstein Distances](http://gpeyre.github.io/papers/2015-SIGGRAPH-convolutional-ot.pdf), accepted at [SIGGRAPH](http://s2015.siggraph.org/) conference. It is a nice blend between the entropic Wasserstein regularization [pioneered by Marco](http://www.iip.ist.i.kyoto-u.ac.jp/member/cuturi/SI.html) and the heat approximation of geodesic kernels introduced in the [geodesic in heat paper](http://www.cs.columbia.edu/~keenan/Projects/GeodesicsInHeat/paper.pdf) (see also my [numerical tour](http://www.numerical-tours.com/matlab/meshproc_7_geodesic_poisson/) on this very nice idea). Our SIGGRAPH paper shows how the resulting method is able to cope with large scale transportation-like problems (including the computation of displacement interpolations and Wasserstein barycenters) to handle large 2-D, 3-D and mesh datasets. The code implementing the method and allowing to reproduce the results of the article [is available online](https://github.com/gpeyre/2015-SIGGRAPH-convolutional-ot).
