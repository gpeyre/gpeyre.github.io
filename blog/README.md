# Authoring the blog

The public archive is /blog/, linked from the main navigation. Each article is a
Jekyll Markdown post in blog/_posts/YYYY-MM-DD-title.md. These are separate from
the older news posts in the root _posts directory.

## Add a post

Create a file with front matter such as:

~~~yaml
---
title: "A short, descriptive title"
subtitle: "Optional one-line introduction."
description: "A plain-text summary for metadata and screen readers."
topic: Optimal transport
---
~~~

The date comes from the filename. Write two or three opening paragraphs, then
place <!--more--> on its own line. That opening becomes the archive’s fading,
math-rendered preview. The full article follows. Avoid figures, headings, and
interactive controls before the separator.

Use $$...$$ for inline mathematics and a separate block delimited by $$ for
display mathematics (Kramdown/MathJax). Use lang: fr for French posts and
an HTML section with lang="en" and markdown="1" for an English translation.

Images live in blog/imgs/. Include meaningful alt text and credit external
images. The Duhamel portrait is public domain; its source is credited in the post.

## Interactive figures

Add figure: pl, sinkhorn, gaussian, gaussian-flow, ode, diffusion, or inverse to the front matter, then use:

~~~liquid
{% include blog-figure.html kind="gaussian" %}
~~~

The numerical functions live in js/blog-math.js, the canvas renderers in
js/blog-figures.js, and the accessible controls in _includes/blog-figure.html.
The gaussian-flow figure evaluates the Gaussian KL gradient flow in closed
form, with target orientation and ellipse-axis ratio controls.
The two-panel diffusion/OT comparison has a dedicated renderer in
js/blog-diffusion.js. Its analytic mixture score and exact empirical assignment
solver are also in js/blog-math.js. The reference image is its no-JavaScript fallback.
The inverse figure uses js/blog-inverse.js and js/blog-inverse-worker.js to show
paired empirical marginals and the unregularized OT gap along an affine cost
slice. A point-count slider uses nested seeded IID samples; a cost slider changes
the exact assignment. The worker traces the piecewise-linear assignment envelope
without entropy or spline smoothing, and the renderer subsamples only the drawn
pairing segments, never the numerical loss.
Figures run locally in the browser without Python, a backend, or a third-party
charting library. Animated figures start paused and stop when the tab or figure
is hidden; the inverse figure is controlled directly by its sliders.

## Verify

Run node tests/blog-math.test.js, then jekyll build. Preview the generated site
over HTTP and check the archive, article mathematics, and figure controls at
desktop and mobile widths. blog/blog-todo.md, this README, and tests/ are
excluded from the published site.
