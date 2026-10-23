# Authoring the blog

The public archive is /blog/, linked from the main navigation. Each article is a
Jekyll Markdown post in blog/_posts/YYYY-MM-DD-title.md. These are separate from
the older news posts in the root _posts directory.

Forthcoming posts are available as public alpha previews at /blog/preparations/,
linked from the archive. They are standalone HTML pages, visibly marked as work
in progress, without dates or feed entries. Their README is excluded from the
website build; the preview pages and assets are included.

## Search published and forthcoming posts

Both `/blog/` and `/blog/preparations/` offer the same local search, with
Published/Forthcoming filters, relevance-ranked titles, and expandable keyword
lists. Multiple query words are combined with AND; matching ignores accents,
case, and punctuation and supports partial words. Titles rank above keywords,
which rank above summary-only matches. Short acronyms such as OT and KL match
whole words. Search state is shareable in `?q=...&status=forthcoming` URLs.
The ordinary archives remain available if JavaScript is disabled or fails.

Every published article has a `keywords:` YAML array in its front matter.
Every standalone preview has a comma-separated `<meta name="keywords">` tag.
Add at least 18 specific terms per article (currently 21–35), including actual
concepts, theorem/algorithm names, acronyms, author names, and useful language
variants. Do not use generic filler or unrelated topics. The search result's
“All keywords” disclosure lets readers inspect the full list and follow a term.

After adding, renaming, redating, publishing, or changing keywords/metadata of
an article, run `ruby scripts/build-blog-search.rb` and commit the regenerated
`js/blog-search-index.js` along with the source changes. The generator reads
all blog posts and standalone preview articles, excludes `published: false`,
and derives titles, summaries, dates, and URLs directly from their metadata.
It fails on missing or duplicate keyword lists. The committed catalogue works
with GitHub Pages safe builds and local static previews without plugins,
external services, or a data-fetch request. The actual matching runs in
`js/blog-search-core.js`; rendering uses safe text nodes in `js/blog-search.js`.

Run `ruby scripts/build-blog-search.rb --check` to detect stale or incomplete
catalogues, `node tests/blog-search-core.test.js` for matching/ranking, and
`ruby tests/blog-search-index.test.rb /path/to/built/site` for metadata and
link coverage. Browser checks live in `tests/blog-search-browser.test.js`.

## Daily publication and Bluesky announcements

The local Codex schedule targets 07:00 Europe/Paris. Keep it paused until the
dedicated Bluesky Keychain connection and unattended permissions have been
verified. The Mac must be awake and online with Codex running. Scheduled time
is the start of the workflow, not a guarantee of an announcement at that minute.

`announcement-queue.md` is the ordered editorial queue. Only an entry bearing
`- [x] Ready to publish` is approved. Unchecked entries are never selected;
an empty ready queue is a quiet no-op. Checkboxes approve the paired article
and its quoted announcement. Keep each original preview URL in the queue;
replace it with the final dated URL only in the outgoing message.

### Illustrated editorial queue

Open `blog/announcement-queue.html` locally for an illustrated, searchable review
page with topic/readiness filters and copyable announcements. It is a generated
snapshot, not a second source of approvals. The HTML page, its editor assets,
the Markdown queue, archive and journal are excluded from the public build;
the forthcoming articles themselves remain public previews.

Use **Open current Markdown** before editing if the queue has changed elsewhere.
Readiness boxes are drafts until saved to the original
`blog/announcement-queue.md`. Supported browsers can save to that explicitly
selected file; otherwise use **Download Markdown** and replace the original
yourself. The editor rejects unexpected file formats and concurrent source
changes, and preserves article order and announcement wording. Then ask Codex
to review, commit and push the saved changes before the next scheduled run:
unsaved boxes have no effect, and an uncommitted queue can stop publication.

Run `ruby scripts/build-blog-queue.rb` after changing the queue or illustrations;
use `--check` to detect a stale HTML snapshot. Regression checks are
`ruby tests/blog-queue-generator.test.rb` and
`node tests/blog-queue-browser.test.js` (set `BLOG_PLAYWRIGHT_PATH` if needed).
The browser tests use mocked file access, not the real approval file.

### Queue order and publication safeguards

Keep every forthcoming article in this queue, with one readiness checkbox and
a short announcement. New entries start unchecked. Put approved entries first,
alternating OT/Wasserstein geometry and other topics where the approved pool
allows it; never approve an article merely to fill a topic slot. Keep relative
order within each topic where possible. Clearly distinguish transport-related
constructions, such as Moser’s interpolation, from optimal transport itself.

Move fully announced entries to `published.md`, retaining the original title,
checked approval, quoted preview URL and
`Published: YYYY-MM-DD · [Read post](CANONICAL_URL)` line. Use the actual journal
date and canonical URL. Keep pending work in the active queue until the final
announcement journal commit has been pushed. Archive reconciliation is separate
from the five-file publication commit; do not expand that manifest.
An archived approval is accepted by the helpers only for an already-announced
journal entry with its recorded Bluesky identifiers; it cannot approve a new
publication. Both editorial files are excluded from the website build.

Run `ruby tests/blog-editorial-queue.test.rb` after reconciling the list. It
checks coverage, readiness boxes, approved-first ordering, best-effort topic
alternation, archive dates and announcements, and private build exclusions.

`publication-log.json` is the durable retry journal. It contains version 1,
timezone `Europe/Paris`, and a `publications` array. Before changing an article,
record its `slug`, `title`, Paris-calendar `date`, canonical `url`, final
`message`, `source_sha256`, and status `prepared`; initialize
`publication_commit`, `bluesky_uri`, and `bluesky_cid` to null. Resume a pending
entry before selecting another. Never change its original date on a retry,
and never select a second article for a date already present in the journal.
Also record the baseline `base_commit` and the exact planned relative `files`
to change, so an interrupted run can be reconciled without claiming unrelated
edits. The five allowed paths are the dated Markdown article, its old HTML
preview redirect, `blog/preparations/index.html`, `js/blog-search-index.js`
and `blog/publication-log.json`. After editing and checking the article, record
`working_sha256`, a path-to-SHA-256 dictionary for the four content files
(not the changing journal), before the publication commit. The source hash
must match the original preview in `base_commit`.
Do not run publication jobs concurrently.

Before any publication change, acquire the shared lock with
`python3 scripts/blog-bluesky.py lock`. Keep the returned nonsecret
owner token for the entire run, including deployment and the final journal
push. An existing `blog/.publication-run.lock` is a stop condition; never
automatically steal or remove a stale lock. Release only your own lock using
`python3 scripts/blog-bluesky.py unlock --token TOKEN` when the run has
stopped. An interrupted run may leave a lock requiring explicit user-reviewed
recovery. The connection-only check does not require this lock.

Promote the selected HTML preview to a dated Markdown post, preserving content,
numbered statements, folded proofs, and experiments. Preserve a redirect from
the old preview; remove its forthcoming card and regenerate search. Use the
established relative-url convention for embedded assets. Verify the Jekyll
build, feeds, search, and the published page's mathematics and interactive
figure before pushing. A substantive content problem is a reason to stop and
ask, not permission to invent a new proof or rewrite an approved article.

Inspect Git status first. Preserve all unrelated edits, including Finder files;
never stage everything or discard changes. Stop if existing edits overlap the
selected article, index, search catalogue, or journal, except for changes that
can be verified as this same pending entry's own work using its baseline,
recorded file list, source hash and publication commit. If attribution is
uncertain, stop and ask instead of discarding or adopting edits. Commit only
explicitly enumerated publication files. If local commits diverge from the remote, stop
instead of rebasing or force-pushing. Record the publication's commit hash.

Use `scripts/blog-publication-git.py` for unattended Git operations, not a
general Git permission. Its `check` is read-only; `probe` also tests push access
with a fixed dry run, without sending a commit. Publication mutations use
`commit-publication`, `commit-log` and `push`, each with `--slug SLUG`,
`--date YYYY-MM-DD` and the owning `--lock-token TOKEN`. The tool fixes the
repository, remote and branch, verifies the approved journal and exact file
manifest, and rejects unrelated commits, staged files and force-push options.

The local command rules are in
`/Users/gpeyre/.codex/rules/blog-publication.rules`. They permit only the
absolute `/opt/homebrew/bin/python3` invocation of the dedicated Bluesky
`check`/`announce` commands and the constrained Git helper. They do not permit
arbitrary Python, Git or Keychain commands, and do not change the sandbox mode.
Codex must be restarted after installing or changing these rules. Keep the
schedule paused until a fresh session's noninteractive connection and Git dry
run succeed; a successful one-off escalated check alone is insufficient.

After pushing, wait for the matching GitHub Pages deployment and verify the
actual article's canonical URL, title, and publication date. Then set its
journal status to `published` with the 40-character `publication_commit`.
The scoped Git helper's `deployment --commit SHA` reads only the public
GitHub API for this repository. It requires the matching Pages workflow and
its `deploy` job to succeed; it exits with status 2 while pending or failed.
It never requests a GitHub token, starts a build or changes a deployment.
The announcement helper independently checks the live page and readiness:

```sh
python3 scripts/blog-bluesky.py check
python3 scripts/blog-bluesky.py announce --slug SLUG --date YYYY-MM-DD
```

The first command authenticates without posting. The second accepts only an
approved, published journal entry. It uses a stable, schema-valid Bluesky TID
record key derived from the publication date and slug, and
create-only semantics; identical retries succeed without another post, while
conflicting content stops. Before creating a record, it checks both its legacy
key and its TID key; a matching legacy record is reused, while simultaneous
records stop for review. It records `announced`, the public record URI and
CID atomically. Save the updated journal in a separate exact-path Git commit
and push, without selecting another article in the same run. If that final
commit fails, preserve the journal and resume its synchronization next time.

Credentials come only from the dedicated macOS Keychain item
`codex-bluesky-blog`, account `gabrielpeyre.bsky.social`. Never put passwords or
session tokens in the queue, journal, automation prompt, logs, or Git. A missing
item, denied access, or network permission failure is a stop condition, not a
reason to search for other credentials or weaken permissions. The active queue, published archive and
journal are excluded from the public website build.

## Numerical summary images

Every article with a numerical experiment has a real capture of that experiment
(currently 35 images across published and forthcoming posts). The JPEGs in
`blog/imgs/summaries/` illustrate archive cards, the local editorial queue, and
article social-sharing metadata. Theory-only articles do not get invented plots.
Each image has descriptive alt text, its experiment URL and control settings,
encoded dimensions, and a SHA-256 digest in `blog/summary-images.json`.

The three `scripts/blog-summary-capture-*.cjs` tools reproduce the captures
from a built site served locally, using Playwright and Chrome. Their default
preview address is `http://127.0.0.1:4197`; native captures accept
`BLOG_PREVIEW_URL`, OT captures accept `BLOG_CAPTURE_BASE`, and modern captures
accept `--base`. All accept `BLOG_PLAYWRIGHT_PATH`. Native/modern captures can
select one article with `--only SLUG`; OT captures take slug arguments.
They choose documented control states, wait for numerical results, and adjust
layout for legibility without replacing the underlying computations. Generated
manifest fragments in `/private/tmp` must be reconciled into the main manifest
with actual JPEG dimensions and fresh digests after a recapture.
`scripts/blog-summary-jpeg.cjs` strips application/comment metadata without
changing the encoded image pixels.

Run `ruby scripts/build-blog-summary-images.rb` after updating images or adding
an experiment. It checks exact experiment coverage, image bytes, dimensions,
digests and provenance, then generates `_data/blog_summary_images.json`,
forthcoming-card thumbnails, and preview social metadata. Published cards and
article metadata read the same catalogue through Liquid. Follow with
`ruby scripts/build-blog-queue.rb`. Both generators offer `--check`.
Run `ruby tests/blog-summary-images.test.rb` and
`node tests/blog-summary-jpeg.test.js` for offline regression checks.

Future Bluesky announcements attach the matching verified image, with alt text,
without changing the approved announcement or its final dated URL. The helper
accepts only local, metadata-free JPEG/PNG files under the summary-image
directory, no larger than 1 MB; it verifies uploaded bytes and uses the same
create-only deduplication as text posts. Completed text-only announcements stay
text-only: images are not added retroactively. A completed image announcement
records immutable `announcement_image` metadata in the journal. Prepare and
commit image assets as editorial work before publication; this does not add
paths to the daily workflow's fixed five-file manifest. Offline safety checks
are `python3 tests/blog-bluesky.test.py` and
`python3 tests/blog-publication-git.test.py`.

## Subscribe

The blog publishes RSS 2.0 at /blog/rss.xml and Atom 1.0 at /blog/atom.xml.
Text links appear on the archive and each article, and every page advertises
both feeds for reader autodiscovery. They are generated at build time from the
blog category only, newest first, with stable article URLs, dates, authors,
topics, and plain-text summaries from each post's description (or excerpt).
The full articles, mathematics, and interactive figures remain on the website.
The shared subscription block explains how to add the feed to an RSS reader,
including why Safari may display raw feed text. Its Copy feed URL button uses
js/blog-subscribe.js to copy the canonical HTTPS RSS address, not the preview
server address. If clipboard access is unavailable or denied, the native help
panel opens and selects the URL for manual copying. Instructions, a readonly
URL field, and both feed links remain usable without JavaScript; the copy button
is then hidden. No subscription service, account, or email signup is added.
New posts appear automatically; no manual feed edits or extra plugins are needed.
For a substantial article revision, optionally add last_modified_at to its
front matter in ISO 8601 format to update Atom's entry timestamp and both feeds'
modification timestamps without changing the entry's identity.

## Add a post

Create a file with front matter such as:

~~~yaml
---
title: "A short, descriptive title"
subtitle: "Optional one-line introduction."
description: "A plain-text summary for metadata and screen readers."
topic: Optimal transport
keywords:
  - optimal transport
  - transport optimal
  # Add the other article-specific concepts, names, and abbreviations.
---
~~~

The date comes from the filename. Future-dated posts are included in builds
(`future: true`), so the chosen date is not a publication schedule. Use
`published: false` for a post that is not ready to publish.
Write two or three opening paragraphs, then
place <!--more--> on its own line. That opening becomes the archive’s fading,
math-rendered preview. The full article follows. Avoid figures, headings, and
interactive controls before the separator.

Use $$...$$ for inline mathematics and a separate block delimited by $$ for
display mathematics (Kramdown/MathJax). Use lang: fr for French posts and
an HTML section with lang="en" and markdown="1" for an English translation.

Images live in blog/imgs/. Include meaningful alt text and credit external
images. The Duhamel portrait is public domain; its source is credited in the post.

For expandable proofs, add `proofs: true` to the front matter and use a native
`details.blog-proof` with a `summary` label and a `div.blog-proof-body` bearing
`markdown="1"`. Proofs start closed and can be nested for a lemma's proof.
Number results consecutively within each post, with separate series for
theorems, propositions, lemmas, and corollaries. Keep each statement visible
and use italic paragraphs for steps inside a proof rather than section headings.
The indentation reflects nesting, and js/blog-proofs.js reflows equations when
a proof opens. The disclosure controls also work without JavaScript.

## Interactive figures

Published posts with a standalone embedded experiment can set
`embedded_experiment: true` and use `iframe.idea-experiment` with a matching
`data-experiment` topic. The shared height listener adapts the iframe to its
contents. The attention sample-complexity post uses this mechanism; its
experiment assets remain at `blog/preparations/assets/attention-sampling/`
to preserve their existing URLs.

When promoting a forthcoming preview to a dated post, its old HTML page may
remain as a redirect with YAML `redirect_to` metadata, an explicit `permalink`
preserving its `.html` URL, a canonical URL, a
meta-refresh, and an ordinary fallback link. Search skips such redirect pages;
remove their cards from the forthcoming archive and regenerate the catalogue.

Add figure: pl, sinkhorn, gaussian, gaussian-flow, ode, diffusion, inverse,
barycentric, or icnn to the front matter, then use:

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
slice. A logarithmic point-count slider runs from 10 to 400 points per marginal,
using independent draws from two mixtures of two Gaussians with nested marginal
samples. Its normalized position t in [0, 1] maps to round(10 × 40^t); outputs
and accessible value text show the actual integer n. The reference pairing is recomputed at
θ = 1 for each count, then fixed along the cost slice. A cost slider changes the
exact assignment. Separate workers compute the current pairing and trace the
piecewise-linear assignment envelope, so large comparison curves do not block
the controls. Traces yield between solves, reuse feasible duals, and certify
absolute error at most 0.001 for n > 200 (numerical precision for smaller n),
without entropy or spline smoothing. The renderer draws up to 120 pairing
segments, but never subsamples the numerical loss.
The barycentric figure uses js/blog-barycentric-math.js and
js/blog-barycentric.js. Its independent sliders set 3–40 uniform source atoms,
30–600 uniform target atoms, and target rotation/deformation. It starts with
n = 12 and m = 240. Log-domain Sinkhorn at ε = 0.2 is the default;
ε ranges from 0.05 to 1. A button switches to genuine unregularized quadratic OT
via integer min-cost flow, with checked primal/dual certificates. Both modes
handle unequal counts without nearest-neighbor or equal-cardinality shortcuts.
Solves yield in short chunks and discard superseded control requests.
All masses enter the projection; only coupling segments below 0.5% of the
largest entry are omitted from drawing. Solid black arrows end at conditional
means, not at the original target cloud. Repeated source coordinates share one
conditional mean. Both axes use the same spatial scale.
Figures run locally in the browser without Python, a backend, or a third-party
charting library. Animated figures start paused and stop when the tab or figure
is hidden; the inverse figure is controlled directly by its sliders.

The icnn figure loads js/blog-icnn-models.js, js/blog-icnn-diagnostics.js,
js/blog-icnn-math.js, and js/blog-icnn.js. A shared slider selects widths
1, 2, 4, 8, 16, 32, 64 (default 64). The default planar view shows signed
residuals, target crease lines, and the four-plane target's zero triangle.
The L=2 residual range is fixed at ±0.30. The L=3 close-up uses ±0.025 on
[-0.57,0.07]²; turning off the close-up uses ±0.12 on the whole square.
Saturation is explicitly reported. An enlarged diagonal section x=y=t over
[-1/4,0] shows the loss of the flat face, with vertical range ±0.035 in the
close-up and ±0.12 otherwise. It is a restriction of the fitted 2D network,
not a one-dimensional obstruction. A separate 1D positive-hinge interpolant
shows successful approximation of x². The view selector retains the original
function heatmaps and target/fit contour overlays.
The extra-hidden-layer option selects exact width-one formulas for both 2D
targets and the diagonal section, retaining the error scales. Only the 1D
control still uses the width slider. The 1D error is analytic. Whole-square
planar maximum errors are computed offline to numerical precision: maximize
h−target at the vertices of the target's affine cells, and maximize target−h
with an ICNN epigraph linear program for each target affine piece. These
evaluate the stored fits, not the best possible networks at those widths.
Reproduce diagnostics with scripts/check-blog-icnn.py (NumPy and SciPy).
The generated data includes the model-file SHA-256, checked by the unit tests.
Reproduce model weights with scripts/train-blog-icnn.py (NumPy and PyTorch).
Training uses two deterministic starts, projected nonnegative weights, a
41-by-41 training grid, and increasing loss powers 2, 4, 8. Checkpoints are
selected by 101-by-101 evaluation-grid maximum error, including the padded
previous-width model as a feasible candidate. In particular, the L=3 width-64
network is exactly its width-32 predecessor with zero-padding; the plateau
does not estimate the architectural lower bound. Models load instantly;
the browser does not train or solve linear programs.

## Verify

Run node tests/blog-math.test.js, node tests/blog-barycentric.test.js, and
node tests/blog-icnn.test.js,
then jekyll build and
ruby tests/blog-feeds.test.rb _site. Preview the generated site
over HTTP and check the archive, article mathematics, and figure controls at
desktop and mobile widths. blog/blog-todo.md, this README, and tests/ are
excluded from the published site.
For subscription UI checks, run tests/blog-subscribe.test.js with the same
BLOG_PLAYWRIGHT_PATH and BLOG_PREVIEW_URL settings as tests/blog-browser.test.js.
