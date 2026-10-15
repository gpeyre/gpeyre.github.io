# Forthcoming blog posts: public alpha previews

The public preview index is `/blog/preparations/`, linked from the blog archive.
Open `index.html` to review the four standalone HTML articles. Each article uses
the shared files in `assets/`; mathematical typesetting loads MathJax from its
CDN, so the initial equation rendering requires an Internet connection.

The HTML pages and assets are included in the website build. Only this README
is excluded in `_config.yml`. The index and every article visibly identify the
content as an alpha preview and use `noindex,follow` until the finished posts
are published. These files are not Jekyll posts and have no publication dates
or RSS/Atom entries. Publishing a finished article should create a selected
dated post in `blog/_posts`, then update its preview to link to that article.

The max/softmax experiment evaluates supporting-plane constructions directly;
it does not train neural networks. Its plots label sampled errors as sampled
errors. Temperature, network width, and the smoothing bound remain explicit.

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
