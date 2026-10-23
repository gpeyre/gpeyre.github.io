require "minitest/autorun"
require_relative "../scripts/build-blog-summary-images"

class BlogSummaryImagesTest < Minitest::Test
  def setup
    @catalogue = BlogSummaryImages.catalogue
  end

  def test_every_published_and_forthcoming_experiment_has_exactly_one_image
    experiments = BlogSummaryImages.experiments
    refute_empty experiments
    assert_equal experiments.keys, @catalogue.fetch("images").keys
    assert experiments.values.any? { |entry| entry["kind"] == "published" }
    assert experiments.values.any? { |entry| entry["kind"] == "forthcoming" }
    refute @catalogue.fetch("images").key?("konno-quadratic-relaxation"), "Do not manufacture a numerical illustration for an article without an experiment"
  end

  def test_images_have_verified_bytes_dimensions_accessible_descriptions_and_capture_provenance
    @catalogue.fetch("images").each do |slug, image|
      bytes = File.binread(File.join(BlogSummaryImages::ROOT, image.fetch("path").delete_prefix("/")))
      assert_equal [image.fetch("width"), image.fetch("height")], BlogSummaryImages.jpeg_dimensions(bytes)
      assert_operator bytes.bytesize, :<=, 1_000_000
      assert_equal Digest::SHA256.hexdigest(bytes), image.fetch("sha256")
      assert_operator image.fetch("alt").length, :>, 30
      assert_operator image.fetch("width"), :>=, 600
      assert image.fetch("source").start_with?("/blog/"), slug
    end
  end

  def test_jpeg_validation_rejects_metadata_truncation_and_wrong_format
    image = @catalogue.fetch("images").values.first
    bytes = File.binread(File.join(BlogSummaryImages::ROOT, image.fetch("path").delete_prefix("/")))
    assert_raises(RuntimeError) { BlogSummaryImages.jpeg_dimensions("PNG") }
    assert_raises(RuntimeError) { BlogSummaryImages.jpeg_dimensions(bytes[0...-1]) }
    app1 = "\xff\xe1\x00\x04ab".b
    assert_raises(RuntimeError) { BlogSummaryImages.jpeg_dimensions(bytes[0, 2] + app1 + bytes[2..]) }
  end

  def test_generation_is_current_and_deterministic
    BlogSummaryImages.outputs.each do |path, expected|
      assert_equal expected, File.read(path, encoding: "UTF-8"), path
    end
    slug, record = BlogSummaryImages.experiments.find { |_slug, entry| entry["kind"] == "forthcoming" }
    return unless record
    text = File.read(record.fetch("path"), encoding: "UTF-8")
    image = @catalogue.fetch("images").fetch(slug)
    assert_equal text, BlogSummaryImages.preview_metadata(text, image)
    assert_equal 1, text.scan(BlogSummaryImages::META_START).size
    assert_includes text, 'property="og:image"'
    assert_includes text, 'name="twitter:card" content="summary_large_image"'
    assert_includes text, 'property="og:image:alt"'
  end

  def test_preview_cards_use_portable_relative_images_without_altering_prose
    index = File.read(File.join(BlogSummaryImages::ROOT, "blog/preparations/index.html"), encoding: "UTF-8")
    assert_equal index, BlogSummaryImages.preview_index(index, @catalogue.fetch("images"))
    expected = BlogSummaryImages.experiments.values.count { |entry| entry["kind"] == "forthcoming" }
    assert_equal expected, index.scan(/class="draft-summary-image"/).size
    preview_slug = BlogSummaryImages.experiments.find { |_slug, entry| entry["kind"] == "forthcoming" }&.first
    assert_includes index, "src=\"../imgs/summaries/#{preview_slug}.jpg\"" if preview_slug
    assert_includes index, 'loading="lazy" decoding="async"'
    plain = '<a class="draft-card" href="theory-only.html"><h2>A theorem</h2><p>Keep me.</p></a>'
    assert_equal plain, BlogSummaryImages.preview_index(plain, @catalogue.fetch("images"))
  end

  def test_published_metadata_and_cards_use_the_shared_catalogue_without_post_edits
    head = File.read(File.join(BlogSummaryImages::ROOT, "_includes/head.html"))
    archive = File.read(File.join(BlogSummaryImages::ROOT, "blog/index.html"))
    assert_includes head, "site.data.blog_summary_images.images[page.slug]"
    assert_includes head, "summary_image.path | absolute_url | escape"
    assert_includes archive, "site.data.blog_summary_images.images[post.slug]"
    assert_includes archive, 'class="blog-preview-image"'
  end
end
