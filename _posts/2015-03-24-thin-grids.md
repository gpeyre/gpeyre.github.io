---
layout:     post
title:      "New Paper"
subtitle:   "Sparse Spikes Deconvolution on Thin Grids"
date:       2015-03-24 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/hokusai-0.jpg"
---


[Vincent Duval](https://who.rocq.inria.fr/Vincent.Duval/) and [myself](http://gpeyre.github.io/) just released [a new paper](http://hal.archives-ouvertes.fr/hal-01135200) on the asymptotic performance of L1-type methods for deconvoluton, when the grid-size tends to zero. This paper extends our [previous results](https://hal.archives-ouvertes.fr/hal-00839635/) on the subject. It basically proves that both the classical lasso/basis-pursuit method, and the less known [continuous basis-pursuit method](http://nbviewer.ipython.org/github/gpeyre/numerical-tours/blob/master/matlab/sparsity_9_sparsespikes_cbp.ipynb) estimate twice the number of spikes. This is not so surprising because approximating arbitrary spikes locations on a quantized grid somehow necessitates this slight delocalization of the positions. An interesting feature of our analysis is that we are able to perfectly predict which of the neighboring grid points will be selected using a careful analysis of so-called dual certificates. Another interesting feature of these theoretical findings is that we provide an "abstract" analysis of L1-like methods that extend the classical results of [J. J. Fuchs](http://ieeexplore.ieee.org/xpl/login.jsp?tp=&arnumber=1512430&url=http%3A%2F%2Fieeexplore.ieee.org%2Fxpls%2Fabs_all.jsp%3Farnumber%3D1512430) to the setting where the support is not necessarily stable (which is always the case for coherent inverse problems like deconvolution). This abstract analysis can be used beyond deconvolution problems. In the numerical section, we show how it can be used to assess numerically support-instability in compressed sensing reconstruction. This is a somehow under-studied problem. Indeed, the literature only focus on the case where the support is stable or only on L2 stability, never on the "gray area" where support is unstable but the method is successful when there is no noise.
