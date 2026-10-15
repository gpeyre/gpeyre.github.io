# Forthcoming blog posts: public alpha previews

The public preview index is `/blog/preparations/`, linked from the blog archive.
Serve the pages over HTTP and open `index.html` to review the standalone HTML
articles; the training worker requires an HTTP origin. Each article uses
the shared files in `assets/`; mathematical typesetting loads MathJax from its
CDN, so the initial equation rendering requires an Internet connection.

The HTML pages and assets are included in the website build. Only this README
is excluded in `_config.yml`. The index and every article visibly identify the
content as an alpha preview and use `noindex,follow` until the finished posts
are published. These files are not Jekyll posts and have no publication dates
or RSS/Atom entries. Publishing a finished article should create a selected
dated post in `blog/_posts`, then update its preview to link to that article.

The max/softmax experiment retains a tangent-plane construction for its 1D
reference. Its 2D max and LSE networks are fitted independently with Adam in
assets/max-softmax-train.js, using nonuniform seeded initializations and free
affine slopes and offsets. A worker keeps training and dense evaluation off the
main thread; changed controls supersede pending jobs. Completed fits are cached
locally for repeated settings. The displays report validation losses and sampled
errors; the tangent-grid certificates from the theoretical construction do not
apply to these trained fits.
The heatmaps and 3D softmax surface use a 201-by-201 evaluation grid, independent
of network width. The 3D max surface uses the exact clipped affine faces.
Analytic LSE gradients give smooth normals without blurring model values.
Both 3D panels share a camera, height scale, and studio
lighting with view-dependent specular highlights. The max keeps flat facet
normals; the LSE uses its smooth analytic normals. The target remains available
in the separate 2D contour views, without a wireframe over the 3D surfaces.
Run node tests/blog-max-softmax.test.js to check parameter gradients, deterministic
training, free affine parameters, sampled values, and analytic surface normals.

Image credits are also given in the relevant articles:

- Marshall H. Stone: University of Chicago Photographic Archive, apf1-07972,
  educational and scholarly use permission, copied unchanged from the existing
  blog asset. https://photoarchive.lib.uchicago.edu/rights.html
- Karl Weierstrass: Smithsonian Institution Libraries, public domain, copied
  unchanged from the existing blog asset.
  https://commons.wikimedia.org/wiki/File:Karl_Weierstrass.jpg
- Werner Fenchel (1972): Konrad Jacobs, Oberwolfach Photo Collection, unchanged.
  https://commons.wikimedia.org/wiki/File:Werner_Fenchel.jpeg
  CC BY-SA 2.0 Germany: https://creativecommons.org/licenses/by-sa/2.0/de/deed.en
