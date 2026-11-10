#!/usr/bin/env ruby
# Optional rendered-page checks: ruby tests/blog-ai-disclosure.test.rb /path/to/build
# Set BLOG_BASEURL=/preview for a build made with --baseurl /preview.
require "minitest/autorun"
require "nokogiri"
require "uri"
require_relative "../scripts/build-blog-search"

DISCLOSURE_BUILD = ARGV.shift

class BlogAiDisclosureTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)
  PAGE = "/blog/ai-disclosure/"
  CONFIG = YAML.safe_load(File.read(File.join(ROOT, "_config.yml")))
  BASEURL = ENV.fetch("BLOG_BASEURL", CONFIG.fetch("baseurl", "")).delete_suffix("/")
  ORIGIN = CONFIG.fetch("url").delete_suffix("/")

  def read(path, root = ROOT)
    full = File.join(root, path.delete_prefix("/"))
    assert File.file?(full), "Missing #{full}"
    File.read(full, encoding: "UTF-8")
  end

  def previews
    Dir.glob(File.join(ROOT, "blog/preparations/*.html")).reject do |path|
      File.basename(path) == "index.html" || File.read(path).match?(/^redirect_to\s*:/)
    end
  end

  def document(source)
    Nokogiri::HTML(source)
  end

  def assert_endnote(doc, label)
    notes = doc.css("p.blog-ai-disclosure")
    assert_equal 1, notes.length, "#{label}: exactly one AI disclosure endnote"
    note = notes.first
    article = doc.at_css("article.blog-prose")
    refute_nil article, "#{label}: article body exists"
    assert_equal article.parent, note.parent, "#{label}: endnote is outside article body"
    assert_equal article, note.previous_element, "#{label}: endnote immediately follows the article"
    assert_equal "main", note.parent.name, "#{label}: endnote stays in main content"
    assert_equal 1, note.css("a[href]").length, "#{label}: one endnote link"
    refute_empty note.css("a").text.strip, "#{label}: visible link text"
    note
  end

  def built_path(url)
    relative = url.delete_prefix("/")
    relative += "index.html" if relative.end_with?("/")
    relative
  end

  def test_disclosure_is_an_undated_page_with_the_requested_process
    source = read("blog/ai-disclosure.html")
    matter = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
    refute_nil matter
    data = YAML.safe_load(matter[1], permitted_classes: [Date, Time])
    assert_equal PAGE, data.fetch("permalink")
    assert_equal "AI disclosure", data.fetch("title")
    assert_equal "default", data.fetch("layout")
    assert_equal true, data.fetch("blog")
    %w[date category categories].each { |key| refute data.key?(key), "Disclosure is not a dated blog post" }
    doc = document(source.sub(matter[0], ""))
    assert_equal "AI disclosure", doc.at_css("h1").text
    prose = doc.at_css("article.blog-prose").text
    [/LaTeX/, /(?:ten|10) years/, /optimal transport/i, /GPT6/, /DeepSeek Flash/,
      /open-weight/, /under my guidance/, /not formal verification/, /mistakes may remain/].each do |phrase|
      assert_match phrase, prose
    end
    assert_equal "Optimal Transport for Machine Learners", doc.at_css('a[href="https://www.gpeyre.com/ot4ml/"]').text
    assert_empty doc.css(".blog-ai-disclosure"), "The disclosure page must not point to itself as an article endnote"
  end

  def test_published_layout_has_a_shared_endnote_outside_the_article
    layout = read("_layouts/blog-post.html")
    assert_equal 1, layout.scan("{% include blog-ai-disclosure.html %}").length
    assert_match %r{</article>\s*\{% include blog-ai-disclosure\.html %\}}, layout
    assert_operator layout.index("{% include blog-ai-disclosure.html %}"), :<, layout.index('<nav class="blog-pagination"')
    shared = read("_includes/blog-ai-disclosure.html")
    assert_equal 1, shared.scan('class="blog-ai-disclosure"').length
    assert_includes shared, "'/blog/ai-disclosure/' | relative_url"
  end

  def test_homepage_has_a_disclosure_link_in_the_header
    source = read("blog/index.html")
    doc = document(source)
    links = doc.css("header.blog-home-header .blog-disclosure-link a")
    assert_equal 1, links.length
    assert_equal "AI disclosure", links.first.text
    assert_equal "{{ '/blog/ai-disclosure/' | relative_url }}", links.first["href"]
    assert_operator source.index('class="blog-disclosure-link"'), :<,
      source.index("{% include blog-subscribe.html %}"), "Disclosure precedes subscription controls"
    return unless DISCLOSURE_BUILD

    built = document(read("blog/index.html", DISCLOSURE_BUILD))
    top_link = built.at_css("header.blog-home-header .blog-disclosure-link a")
    refute_nil top_link
    assert_equal BASEURL + PAGE, top_link["href"]
    assert File.file?(File.join(DISCLOSURE_BUILD, built_path(PAGE)))
  end

  def test_every_standalone_preview_has_a_promotion_safe_endnote
    refute_empty previews
    previews.each do |path|
      label = path.delete_prefix(ROOT + "/")
      note = assert_endnote(document(File.read(path, encoding: "UTF-8")), label)
      assert_equal "../ai-disclosure/", note.at_css("a")["href"], label
      refute_match(/\{%|\{\{/, note.to_html, "#{label}: standalone HTML must not depend on Liquid")
    end
  end

  def test_redirects_and_embedded_experiments_have_no_article_endnote
    paths = Dir.glob(File.join(ROOT, "blog/preparations/*.html")).select do |path|
      File.read(path).match?(/^redirect_to\s*:/)
    end
    paths += Dir.glob(File.join(ROOT, "blog/preparations/assets/**/*.html"))
    refute_empty paths
    paths.each do |path|
      refute_includes File.read(path, encoding: "UTF-8"), "blog-ai-disclosure", path
    end
  end

  def test_disclosure_is_not_a_search_post
    records = BlogSearchIndex.records
    refute records.any? { |record| record["url"] == PAGE || record["id"] == "blog/ai-disclosure.html" }
    published = Dir.glob(File.join(ROOT, "blog/_posts/*.md")).reject do |path|
      matter = File.read(path).match(/\A---\s*\n(.*?)\n---\s*\n/m)
      YAML.safe_load(matter[1], permitted_classes: [Date, Time])["published"] == false
    end
    assert_equal published.length,
      records.count { |record| record["status"] == "published" }
  end

  def test_built_disclosure_metadata_and_book_link
    skip "Pass the built site directory for rendered checks" unless DISCLOSURE_BUILD
    doc = document(read("blog/ai-disclosure/index.html", DISCLOSURE_BUILD))
    assert_equal ORIGIN + BASEURL + PAGE, doc.at_css('link[rel="canonical"]')["href"]
    assert_equal "AI disclosure", doc.at_css("h1").text
    assert_equal "Optimal Transport for Machine Learners", doc.at_css('a[href="https://www.gpeyre.com/ot4ml/"]').text
    assert_empty doc.css(".blog-ai-disclosure")
    assert_empty doc.css(".blog-eyebrow time"), "The disclosure has no publication date"
  end

  def test_all_built_articles_have_one_working_endnote_before_navigation
    skip "Pass the built site directory for rendered checks" unless DISCLOSURE_BUILD
    BlogSearchIndex.records.each do |record|
      doc = document(read(built_path(record["url"]), DISCLOSURE_BUILD))
      note = assert_endnote(doc, record["url"])
      resolved = URI.join(ORIGIN + BASEURL + record["url"], note.at_css("a")["href"])
      assert_equal ORIGIN + BASEURL + PAGE, resolved.to_s, "#{record['url']}: correct disclosure URL"
      assert File.file?(File.join(DISCLOSURE_BUILD, built_path(PAGE))), "Disclosure destination exists"
      if record["status"] == "published"
        nav = doc.at_css("nav.blog-pagination")
        refute_nil nav
        assert_equal note, nav.previous_element, "#{record['url']}: disclosure precedes pagination"
      end
    end
  end

  def test_disclosure_does_not_become_a_feed_entry_or_archive_post
    skip "Pass the built site directory for rendered checks" unless DISCLOSURE_BUILD
    rss = Nokogiri::XML(read("blog/rss.xml", DISCLOSURE_BUILD))
    atom = Nokogiri::XML(read("blog/atom.xml", DISCLOSURE_BUILD))
    url = ORIGIN + BASEURL + PAGE
    refute_includes rss.xpath("//item/link").map(&:text), url
    refute_includes atom.xpath("//a:entry/a:link/@href", "a" => "http://www.w3.org/2005/Atom").map(&:value), url
    archive = document(read("blog/index.html", DISCLOSURE_BUILD))
    refute archive.css(".blog-preview h2 a").any? { |link| link["href"].include?(PAGE) }
  end
end
