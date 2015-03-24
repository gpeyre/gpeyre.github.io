---
layout:     post
title:      "New Paper"
subtitle:   "Sparse Spikes Deconvolution on Thin Grids"
date:       2015-03-24 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/hokusai-0.jpg"
---


[Vincent Duval](https://who.rocq.inria.fr/Vincent.Duval/) and [myself](http://gpeyre.github.io/) just released [a new paper](http://hal.archives-ouvertes.fr/hal-01135200) on the asymptotic performance of $\ell^1$-type methods for deconvoluton, when the grid-size tends to zero. This paper is quite technical, and extends our [previous results](https://hal.archives-ouvertes.fr/hal-00839635/) on the subject. It basically proves that both the classical lasso/basis-pursuit method, and the less known [continuous basis-pursuit method](http://nbviewer.ipython.org/github/gpeyre/numerical-tours/blob/master/matlab/sparsity_9_sparsespikes_cbp.ipynb) estimate twice the number of spikes. This is not so surprising because approximating arbitrary spikes location on a quantized grid somehow necessitates this slight delocalization of the positions. An interesting feature of our analysis is that we are able to perfectly predict which of the neighboring grid points will be selected using a careful analysis of so-called dual certificates. Another interesting feature of these theoretical findings is that we provide an "abstract" analysis of $\ell^1$-like methods, that can be used beyond deconvolution problems. In the numerical section, we show how it can be used to asses numerically support-instability in compressed sensing reconstruction. This is a somehow under-studied problem. Indeed, the litterature only focus on the case where the support is stable or only on $\ell^2$ stability, never on the "gray area" where support is unstable but the method is sucessful when there is no noise.
