---
layout:     post
title:      "New Paper"
subtitle:   "Support Recovery for Sparse Deconvolution of Positive Measures"
date:       2015-06-30 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/hokusai-0.jpg"
---

Together with [Quentin Denoyelle](https://www.ceremade.dauphine.fr/~denoyelle/) and [Vincent Duval](https://who.rocq.inria.fr/Vincent.Duval/), we released our paper ["Support Recovery for Sparse Deconvolution of Positive Measures"](http://arxiv.org/abs/1506.08264). It is a sequel to my [paper with Vincent](https://hal.archives-ouvertes.fr/hal-00839635/) on support recovery for sparse spikes deconvolution over the space of measures using total variation of measures (not to be confounded with the total variation of an image) aka the BLASSO program. In the special case of positive measure, the BLASSO always recovers the initial sparse measure when there is no noise. Here we study the robustness to noise of the method when the spikes come closer together. In particular we show that one can estimate exactely the correct number of spikes, provided that the signal-to-noise ratio grows sufficiently fast with respect to the separation distance. The precise rate of growth matches the one predicted by the Cramer-Rao bound of estimation in the case of a Gaussian additive noise.
