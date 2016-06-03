---
layout:     post
title:      "New Paper"
subtitle:   "Gromov-Wasserstein Averaging of Kernel and Distance Matrices"
date:       2016-06-03 12:00:00
author:     "Gabriel Peyré"
header-img: "../img/ecriture.jpg"
---

Together with my co-authors [Marco Cuturi](http://www.iip.ist.i.kyoto-u.ac.jp/member/cuturi/) and [Justin Solomon](people.csail.mit.edu/jsolomon/), we released our [ICML'16](icml.cc/2016/) paper [Gromov-Wasserstein Averaging of Kernel and Distance Matrices](https://hal.archives-ouvertes.fr/hal-01322992). This paper makes use of the [Gromov-Wasserstein](http://link.springer.com/article/10.1007%2Fs10208-011-9093-5) (GW) distance between metric spaces we used in our [SIGGRAPH'16 paper](https://hal.archives-ouvertes.fr/hal-01305808) in order to compute the average (barycenter) of similarity matrices (typically pairwise distance matrices or SDP kernels). The key ingredient are nice formulas to update the GW cost matrix using matrix-multiplications and  to update the barycenter, together with Sinkhorn iterations to update the couplings between the input spaces and the barycenter's space. The resulting scheme is attractive because it does not require to actually pre-register the input matrices together, they are progressively registered toward the optimal barycenter as the algorithm converges. 
