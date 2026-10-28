---
title: Stable fluids
subtitle: Trace backwards, diffuse implicitly, and project away compression.
description: "Stam’s Stable Fluids combines semi-Lagrangian advection, implicit diffusion, and an orthogonal incompressibility projection. Derive its Fourier solver and stir a periodic fluid interactively."
date: '2026-10-28'
topic: Fluid simulation
keywords:
- "Stable Fluids"
- "Jos Stam"
- "incompressible Navier–Stokes"
- "fluid simulation"
- "semi-Lagrangian advection"
- "backward characteristics"
- "bilinear interpolation"
- "implicit diffusion"
- "pressure projection"
- "Helmholtz–Hodge decomposition"
- "Leray projector"
- "Poisson equation"
- "Fourier transform"
- "FFT"
- "mixed-radix FFT"
- "spectral differentiation"
- "periodic boundary conditions"
- "odd grid"
- "Nyquist mode"
- "vorticity"
- "passive scalar"
- "dye transport"
- "viscosity"
- "kinetic energy"
- "maximum principle"
- "mass conservation"
- "first-order splitting"
- "George Gabriel Stokes"
- "Alexandre Chorin"
- "Roger Temam"
- "Francis Harlow"
- "Eddie Welch"
- "Olivier Pironneau"
- "André Robert"
- "Andrew Staniforth"
- "Jean Côté"
- "marker-and-cell method"
- "Lagrange–Galerkin method"
- "simulation de fluides"
- "projection incompressible"
proofs: true
embedded_experiment: true
---

*Stable Fluids* is one of my favorite papers. Its blend of mathematics, numerical analysis, computer graphics, and physics has been a tremendous source of inspiration for me: a few elegant ideas become a simulation one can immediately see and interact with.

A moving cloud of smoke looks complicated. Its solver need not be. Jos Stam’s *Stable Fluids* <a href="#ref-stam">[1]</a> is built from a handful of operations with clear geometric meanings: carry a field along trajectories, smooth it, and enforce incompressibility by an orthogonal projection. Its achievement is an accessible synthesis for interactive graphics, built on a much older numerical-analysis tradition.

The trick is not to solve the entire fluid equation at once. Split it into manageable pieces, and choose each piece to avoid a familiar numerical instability. On a periodic domain, the pressure solve becomes particularly elegant: each Fourier coefficient is projected onto a line perpendicular to its wave vector. Stam’s later implementation notes <a href="#ref-stam2003">[4]</a> and Bridson’s book <a href="#ref-bridson">[5]</a> are useful companions.

<!--more-->

<figure class="portrait-single"><img src="{{ '/blog/preparations/assets/new-dynamics/jos-stam-azam-khan.jpg' | relative_url }}" width="1884" height="1712" alt="Jos Stam in front of a whiteboard with fluid simulation equations" loading="lazy"><figcaption>Jos Stam, photographed by Azam Khan in May 2005. <a href="https://commons.wikimedia.org/wiki/File:Jos_Stam_2005_-_by_Azam_Khan.jpg">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>. Image unchanged.</figcaption></figure>
<figure class="portrait-single"><img src="{{ '/blog/preparations/assets/new-dynamics/george-stokes.jpg' | relative_url }}" width="711" height="1065" alt="Portrait of George Gabriel Stokes after a photograph by Fradelle and Young" loading="lazy"><figcaption>George Gabriel Stokes (1819–1903), after a photograph by Fradelle &amp; Young, reproduced in Schuster and Shipley’s <em>Britain’s Heritage of Science</em> (1917). <a href="https://commons.wikimedia.org/wiki/File:SS-stokes.jpg">Wikimedia Commons</a>, public domain. Image unchanged.</figcaption></figure>

## Velocity, pressure, and the constraint

Work on a periodic square $$[0,L)^2$$. The velocity $$u(t,x)\in\mathbb R^2$$ solves the incompressible Navier–Stokes equations

$$
\partial_tu+(u\cdot\nabla)u
 =-\nabla p+\nu\Delta u+f,
 \qquad \nabla\cdot u=0.
$$

The force $$f$$ pushes the fluid and the viscosity $$\nu\ge0$$ smooths velocity variations. Pressure is the multiplier enforcing incompressibility: a parcel may move or deform, but its volume cannot change. Dye is a separate passive scalar $$a$$, evolving by

$$
\partial_ta+u\cdot\nabla a=\kappa\Delta a+s,
$$

where $$\kappa\ge0$$ is dye diffusivity and $$s$$ a dye source. Since $$\nabla\cdot u=0$$, the advection term can equally be written $$\nabla\cdot(au)$$. Dye does not feed back into the velocity in the simple model used here.

## First understand the projection

Suppose $$w$$ is a provisional velocity that may compress the fluid. Remove a gradient:

$$
\mathsf P w=w-\nabla\phi,
 \qquad \Delta\phi=\nabla\cdot w,
 \qquad \int\phi=0.
$$

The Poisson equation is compatible because a periodic divergence has integral zero. The field $$\mathsf Pw$$ is divergence free by construction.

<span id="proposition-1"></span>

**Proposition 1 (the pressure step is an orthogonal projection).** In periodic $$L^2$$, $$\mathsf Pw$$ is the unique closest divergence-free field to $$w$$. In particular,

$$
\|w\|_{L^2}^2
 =\|\mathsf Pw\|_{L^2}^2+\|\nabla\phi\|_{L^2}^2.
$$

<details class="blog-proof">

<summary>Proof: gradients are perpendicular to incompressible motion</summary>

<div class="blog-proof-body" markdown="1">

For any divergence-free $$z$$, periodic integration by parts gives $$\int\nabla\phi\cdot z=-\int\phi\nabla\cdot z=0$$. Hence the decomposition $$w=\mathsf Pw+\nabla\phi$$ is orthogonal. More generally,

$$
\|w-z\|_{L^2}^2
 =\|\nabla\phi\|_{L^2}^2+\|\mathsf Pw-z\|_{L^2}^2,
$$

so the unique minimum occurs at $$z=\mathsf Pw$$. $$\square$$

</div>

</details>

This is the Helmholtz–Hodge decomposition, or Leray projection. Harlow and Welch’s MAC method (1965) already used staggered velocities and a pressure Poisson equation to enforce incompressibility <a href="#ref-harlow-welch">[6]</a>. Chorin and Temam developed the projection/fractional-step approach <a href="#ref-chorin">[2]</a>, <a href="#ref-temam">[3]</a>; Chorin’s 1968 paper also uses implicit alternating-direction schemes, not merely explicit Euler. Stam explicitly follows Chorin and Marsden’s book for the decomposition <a href="#ref-chorin-marsden">[7]</a>.

## One time step, four operations

Let $$h>0$$ be the time step. A first-order splitting in the order of Stam’s 1999 presentation is

$$
\begin{aligned}
 w_1&=u^n+hf^n &&\text{add forces},\\
 w_2(x)&=\mathcal I[w_1](x-hw_1(x)) &&\text{advect},\\
 (I-h\nu\Delta)w_3&=w_2 &&\text{diffuse},\\
 u^{n+1}&=\mathsf Pw_3 &&\text{project}.
 \end{aligned}
$$

Here $$\mathcal I$$ is periodic bilinear interpolation of the grid values. The pressure potential $$\phi$$ in the projection has the units of $$hp$$; one should not identify it directly with the continuous pressure without that time-step scaling.

*Why trace backwards?* To fill a grid point at the next time, ask where the arriving fluid came from. The first-order answer is $$x-hw_1(x)$$. Interpolate the old field there. Forward tracing would leave the grid and create a separate problem of depositing particles back onto it.

Dye is advected by the resulting projected velocity, with the same backward-tracing operation, then optionally diffused. A mouse drag supplies a localized velocity impulse and a positive dye source. This is an externally forced simulation, not an unforced energy-decay experiment.

## Earlier characteristic methods

Backward tracing also has a substantial pre-1999 history. Robert (1982) combined semi-Lagrangian transport with semi-implicit integration for an atmospheric shallow-water model <a href="#ref-robert">[8]</a>. Staniforth and Côté’s 1991 review documents the wider meteorological use of these methods <a href="#ref-staniforth-cote">[9]</a>: taking large stable steps was already an important motivation, although the equations and stability analyses differ.

An especially close antecedent is Pironneau’s transport–diffusion algorithm (1982) <a href="#ref-pironneau">[10, §3]</a>. It transports the **evolving velocity itself** along backward characteristics, then performs an implicit incompressible Stokes solve. On our periodic domain with constant viscosity, that latter solve is equivalent, before spatial discretization, to implicit diffusion followed by pressure projection: the two operators commute. The distinction is in the realization—Pironneau’s variational finite-element formulation versus Stam’s grid interpolation and separate diffusion/projection steps. Pironneau proves an unconditional energy estimate for his analyzed schemes; it should not be transferred uncritically to the interpolated scheme below.

Graphics had its own predecessors: Kass and Miller (1990) used an implicit solver for a shallow-water approximation <a href="#ref-kass-miller">[11]</a>, while Foster and Metaxas (1997) supplied Stam’s explicit three-dimensional gas-simulation baseline <a href="#ref-foster-metaxas">[12]</a>. Stam’s contribution is the simple, robust combination that makes volumetric fluid animation interactive, accepting numerical dissipation. He cites these graphics works and Harlow–Welch; Robert, Pironneau, and Staniforth–Côté are historical comparisons here, not sources cited in his paper.

## Fourier projection: one small matrix per wave

For a Fourier mode $$e^{ik\cdot x}$$, with $$k=(2\pi/L)(j_1,j_2)$$, differentiation becomes multiplication by $$ik$$. Thus, for $$k\ne0$$,

$$
\widehat\phi(k)=-\frac{i\,k\cdot\widehat w(k)}{|k|^2},
 \qquad
 \widehat{\nabla\phi}(k)
 =\frac{k(k\cdot\widehat w(k))}{|k|^2}.
$$

<span id="proposition-2"></span>

**Proposition 2 (spectral pressure and diffusion).** The periodic projection is

$$
\widehat{\mathsf Pw}(k)
 =\left(I-\frac{kk^\top}{|k|^2}\right)\widehat w(k)
 \quad(k\ne0),
 \qquad \widehat{\mathsf Pw}(0)=\widehat w(0).
$$

Implicit velocity diffusion multiplies each coefficient by $$(1+h\nu\lvert k\rvert^2)^{-1}$$. The two operations commute and can be combined into a single Fourier pass.

<details class="blog-proof">

<summary>Proof: solve the scalar Poisson equation mode by mode</summary>

<div class="blog-proof-body" markdown="1">

The Fourier Poisson equation is $$-\lvert k\rvert^2\widehat\phi=ik\cdot\widehat w$$. Solving it gives the formula above; subtracting its gradient gives the projector. The matrix $$I-kk^\top/\lvert k\rvert^2$$ removes the component parallel to $$k$$, so its output has zero Fourier divergence. The zero mode is the mean velocity, already divergence free, and remains unchanged. Finally the diffusion equation gives $$(1+h\nu\lvert k\rvert^2)\widehat w_3=\widehat w_2$$. Both multipliers act on each mode independently, and the diffusion multiplier is scalar. $$\square$$

</div>

</details>

In practice: transform the two velocity components, apply these multipliers, inverse transform. An FFT makes the cost $$O(M\log M)$$ for $$M$$ grid cells; no iterative pressure solver is hidden inside this step. The experiment uses a genuine mixed-radix FFT on a $$45\times45$$ grid.

<aside class="note" markdown="1">

**Why an odd grid?** Spectral differentiation must preserve conjugate symmetry so that real fields stay real. On an even grid, the Nyquist modes need a special consistent convention. An odd grid avoids that issue: every nonzero wave number has a distinct opposite. The divergence diagnostic below uses exactly the same Fourier derivative as the projection—not an incompatible finite-difference derivative.

</aside>

## What “stable” really means

<span id="proposition-3"></span>

**Proposition 3 (three separate stability facts).** Bilinear semi-Lagrangian advection preserves the range of each transported scalar component. Implicit spectral diffusion is an $$L^2$$ contraction for every $$h>0$$. Pressure projection is also an $$L^2$$ contraction.

<details class="blog-proof">

<summary>Proof: convex weights, bounded multipliers, and orthogonality</summary>

<div class="blog-proof-body" markdown="1">

A bilinear interpolated value is a convex combination of four old values, even if the backtrace crosses many grid cells. It therefore lies between the old minimum and maximum. Every diffusion multiplier lies in $$(0,1]$$, so Parseval’s identity gives its $$L^2$$ contraction. Proposition 1, or the orthogonal matrix in Proposition 2 at each Fourier mode, gives the projection contraction. $$\square$$

</div>

</details>

These are statements in *different norms*. They do not combine into a universal monotone kinetic-energy theorem for the entire discrete split scheme. In particular, bilinear advection is not generally a grid-mass-preserving operator, nor automatically an $$\ell^2$$ contraction. Increasing $$h$$ can make a bounded animation very inaccurate: the backtrace is less precise, splitting error grows, and interpolation introduces numerical diffusion. Stability is not an accuracy certificate.

One more discretization detail matters for dye. Spectral implicit diffusion is $$L^2$$-stable but its truncated-grid kernel need not preserve positivity. We instead diffuse dye with the periodic five-point Laplacian $$\Delta_h$$. Its implicit inverse is positive, and the same FFT diagonalizes it, with multiplier

$$
\left[1+\frac{4h\kappa}{\Delta x^2}
 \left(\sin^2\frac{\pi j_1}{N}
 +\sin^2\frac{\pi j_2}{N}\right)\right]^{-1}.
$$

The maximum-principle argument is elementary: at a negative minimum of a hypothetical solution of $$(I-h\kappa\Delta_h)a=b\ge0$$, one has $$\Delta_h a\ge0$$, so the left side is negative, a contradiction. This diffusion step also preserves the mean. The *advection* step can still change dye mass; the display reports it honestly rather than renormalizing it away.

## Numerical experimentation

Paint and stir, adjust the brush radius and stirring strength, compare viscosity levels, and increase the time step. Zero stirring strength paints without pushing. Every stroke is a discrete impulse, and its actual grid-integrated dye increment is recorded: the reference mass is the initial mass plus all these increments. The signed difference from that reference exposes the advection error. Turn projection off to see what is lost, then turn it back on and take one step: the spectral divergence falls back to roundoff. This is an educational low-resolution periodic solver, not a turbulence benchmark.

<iframe class="idea-experiment" data-experiment="fluids" src="{{ '/blog/preparations/assets/new-dynamics/index.html' | relative_url }}?topic=fluids" title="Interactive periodic Stable Fluids with dye injection, viscosity, and pressure projection" loading="lazy" style="height:1100px"></iframe>

There is a useful companion viewpoint in <a href="{{ '/blog/2026/10/25/lagrangian-density-interpolation/' | relative_url }}">Moser’s interpolation of measures</a>. There, one prescribes a density change and solves for a flux having the right divergence. Here, one starts with a velocity and removes its divergence. In both constructions, a Poisson equation turns conservation of mass into a practical operation.

## Bibliography

<ol class="references">
<li id="ref-stam">Jos Stam. <em>Stable Fluids</em>. SIGGRAPH, 121–128, 1999. <a href="https://doi.org/10.1145/311535.311548">Paper</a>; <a href="https://graphics.stanford.edu/courses/cs468-05-fall/Papers/p121-stam.pdf">PDF</a>.</li>
<li id="ref-chorin">Alexandre J. Chorin. <em>Numerical Solution of the Navier–Stokes Equations</em>. Mathematics of Computation 22(104), 745–762, 1968. <a href="https://doi.org/10.1090/S0025-5718-1968-0242392-2">Paper</a>.</li>
<li id="ref-temam">Roger Temam. <em>Sur l’approximation de la solution des équations de Navier–Stokes par la méthode des pas fractionnaires (I)</em>. Archive for Rational Mechanics and Analysis 32, 135–153, 1969. <a href="https://doi.org/10.1007/BF00247678">Paper</a>.</li>
<li id="ref-stam2003">Jos Stam. <em>Real-Time Fluid Dynamics for Games</em>. Game Developers Conference, 2003. <a href="https://www.josstam.com/publications">Author’s publications</a>.</li>
<li id="ref-bridson">Robert Bridson. <em>Fluid Simulation for Computer Graphics</em>. Second edition, A K Peters/CRC Press, 2015. <a href="https://www.cs.ubc.ca/~rbridson/fluidsimulation/">Author’s materials</a>.</li>
<li id="ref-harlow-welch">Francis H. Harlow and J. Eddie Welch. <em>Numerical Calculation of Time-Dependent Viscous Incompressible Flow of Fluid with Free Surface</em>. Physics of Fluids 8(12), 2182–2189, 1965. <a href="https://doi.org/10.1063/1.1761178">Paper</a>.</li>
<li id="ref-chorin-marsden">Alexandre J. Chorin and Jerrold E. Marsden. <em>A Mathematical Introduction to Fluid Mechanics</em>. Second edition, Springer, 1990. <a href="https://doi.org/10.1007/978-1-4684-0364-0">Book</a>.</li>
<li id="ref-robert">André Robert. <em>A Semi-Lagrangian and Semi-Implicit Numerical Integration Scheme for the Primitive Meteorological Equations</em>. Journal of the Meteorological Society of Japan, Series II 60(1), 319–325, 1982. <a href="https://doi.org/10.2151/jmsj1965.60.1_319">Paper</a>.</li>
<li id="ref-staniforth-cote">Andrew Staniforth and Jean Côté. <em>Semi-Lagrangian Integration Schemes for Atmospheric Models—A Review</em>. Monthly Weather Review 119(9), 2206–2223, 1991. <a href="https://doi.org/10.1175/1520-0493%281991%29119%3C2206%3ASLISFA%3E2.0.CO%3B2">Paper</a>.</li>
<li id="ref-pironneau">Olivier Pironneau. <em>On the Transport-Diffusion Algorithm and Its Applications to the Navier–Stokes Equations</em>. Numerische Mathematik 38, 309–332, 1982. <a href="https://doi.org/10.1007/BF01396435">Paper</a>.</li>
<li id="ref-kass-miller">Michael Kass and Gavin Miller. <em>Rapid, Stable Fluid Dynamics for Computer Graphics</em>. Computer Graphics (SIGGRAPH ’90) 24(4), 49–57, 1990. <a href="https://doi.org/10.1145/97880.97884">Paper</a>.</li>
<li id="ref-foster-metaxas">Nick Foster and Dimitris Metaxas. <em>Modeling the Motion of a Hot, Turbulent Gas</em>. SIGGRAPH, 181–188, 1997. <a href="https://doi.org/10.1145/258734.258838">Paper</a>.</li>
</ol>
