---
layout:     post
title:      "New Paper"
subtitle:   "Stochastic Optimization for Large-scale Optimal Transport"
date:       2016-05-27 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/ecriture.jpg"
---

Together with my co-authors [Aude Genevay](https://fr.linkedin.com/in/audegenevay), [Marco Cuturi](http://www.iip.ist.i.kyoto-u.ac.jp/member/cuturi/) and [Francis Bach](http://www.di.ens.fr/~fbach/), we released the paper [Stochastic Optimization for Large-scale Optimal Transport](https://hal.archives-ouvertes.fr/hal-01321664). The idea is quite simple but powerful: it uses the fact that the dual optimal transport problem corresponds to the maximization of some expectation, so that it can be tackled using standard stochastic programming methods. It is also possible to consider the entropy-regularized version championed by [Marco Cuturi](https://arxiv.org/abs/1306.0895), which also has a similar dual form. An interesting feature of the paper is that it studies three different settings (discrete, semi-discrete and continuous), each time identifying which stochastic method is usable ([SAG](https://www.cs.ubc.ca/~schmidtm/Software/SAG.html), [SGD](https://en.wikipedia.org/wiki/Stochastic_gradient_descent) or [kernel-SGD](http://arxiv.org/abs/1408.0361)). 
