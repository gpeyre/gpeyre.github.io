Instruction: you should turn each post into a very clean post, with title, date, and clear expositin, with nice maths rendering and if needed an interacttive javascript python figure. Each post should be stored in a separate .md file index by YYYY-MM-DD-title.md
The main menu of the blog should have ordered by date a snipset (only the beginning with a transparaceny fading of the following, nicely rendered) to navigate between them.



2026-09-15 IA pour les maths : clarifications
Mettre au propre ce message en français, et faire aussi la traduction en anglais dans le même post.
J'ai été interviewé dans le cadre sur le sujet "OpenAI résout l'équation de Navier-Stokes, l'un des problèmes du millénaire en mathématiques"
[lien: https://www.radiofrance.fr//franceinter/podcasts/nos-vies-numeriques/nos-vies-numeriques-du-jeudi-10-septembre-2026-6149706]
Mon intervension a été fortement tronquée (ce qui peut s'expliquer par le format extrèmement court de la chonique) et le contenu ne reflète pas ma pensée. En particulier l'interview se termine sur le fait que les progrès récent pour l'IA sont excitant, ce qui est vrai, on peut facilement entrevoir de nouvelles façons de faire des maths qui ouvriront très vraissemblablement la porte a des avancées majeures. Mais (et mon "mais" a été coupé), comme le souligne Isabelle Galagher, il soulève aussi beaucoup de questions et d'inquiétude sur l'avenir de la pratique de la recherche et de l'étudation mathématique, en particulier pour l'accès à ces outils à tous, à l'amélioraton de l'éducation mathématique, au regard de la capatation de ces ressources et savoir par les grandes compagnie d'IA. Mon interview se terminait par une exhortation aux pouvoir public d'investir massivement dans la recherche publiqué et l'étudcation scientifique (en particuliuer mathématiques et informatique), ce qui n'est pas semble t il pas complètement dans l'air du temps au vu des coupes budgétaires de nos instutions.

 7 août 2026
The Mathematical Nexus brings together 800 animated vignettes and 140 accompanying Python notebooks, encompassing most of the mathematical content I have shared on social media.
https://www.gpeyre.com/mathematical-nexus/
[add an image like in imgs/nexus]

14 août 2026
Create a short post about P-L functions, with a link to the 10 year old paper by Schmidt et al (test time award this year at AISATS!) and say my favorite one is this one
https://www.gpeyre.com/mathematical-nexus/python/p-l-flow/banana_gradient_flow_interactive.html
and add a an embedded animation like this one
Make this figure interactive


30 juil. 2026
Make a post contrasting linear perron frobenius and sinkhorn which is non-linear perron frobenius and illustrate their convergence using the figure in imgs/markov
Top: Markov chains contract the probability simplex toward the unique stationary positive eigenvector (Perron-Frobenius). Bottom: Sinkhorn contracts the simplex non-linearly to an approximate solution of optimal transport (nonlinear Perron-Frobenius).
Make this figure interactive

 13 juil. 2026
The KL barycenter of Gaussians is Gaussian:
    argmin_μ ∑ᵢ λᵢ KL(μ | 𝒩(mᵢ, Σᵢ)) = 𝒩(m, Σ),
with
    Σ⁻¹ = ∑ᵢ λᵢ Σᵢ⁻¹
    m = ∑ᵢ λᵢ Σ Σᵢ⁻¹ mᵢ
Make an animated figure illustrating this

 10 juil. 2026
Make a post (quite more details, with an image of Jean-Marie Duhamel (oncle de Joseph Bertrand et Charles Hermite) on:
Duhamel (discrete) formula for the difference of matrix products:
A1 ... An − B1 ... Bn = sum_{k=1}^n A1 ... A_{k-1} (Ak − Bk) B_{k+1} ... Bn

 7 juil. 2026
 Make a short post on:
Denoting f⁎ the Legendre transform of f, the map {f convex} ↦ −log ∫ exp(−f⁎) is convex. arxiv.org/abs/1304.0630
And speak a bit on moment measure with references.

4 juil. 2026
Make a post on:
Doubly positive matrices: D_n = { X = Xᵀ in R_+^{n×n}, eig(X) ≥ 0 }. Totally positive matrices: T_n = { X = AAᵀ : ∃p, A in R_+^{n×p} }. One has T_n ⊂ D_n. For n ≤ 4: T_n = D_n. For n ≥ 5: T_n ≠ D_n.
Counterexample, a = (√5 − 1)/2:
[1 a 0 0 a;
a 1 a 0 0;
0 a 1 a 0;
0 0 a 1 a;
a 0 0 a 1],
Ref: Anstreicher–Burer–Dür, optimization-online.org/2008/05/1990/


16 juin 2026
The alpha version of my new book "Optimal Transport
for Machine Learners" is out, with in particular an online version with interactive figures
www.gpeyre.com/ot4ml/
[use figure from figs/ot4ml]

 6 mai 2026
Malke a detailed post on: a norm one covariances lifts to a norm on matrices if and only if it is monotone (e.g., Shatten norms). Look at the equation in imgs/matrixnorm.webp to see what precisely you should write and expose. Put a proof of this in the post.

 16 avr. 2026
 Make a clean post to explain and prove in detail :
 https://github.com/gpeyre/DiscreteDiffusion/tree/main/draft/cauchy-lipschitz
i.e. While it is intuitively clear that straighter trajectories should reduce discretization error when integrating an ODE (for instance, in flow matching), I could not find a precise bound. I therefore rewrote the proof of Cauchy-Lipschitz to make this explicit.
