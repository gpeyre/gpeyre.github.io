#!/usr/bin/env ruby
# Optional rendered-page checks: ruby tests/blog-preview-title-sync.test.rb /path/to/build
require "minitest/autorun"
require "nokogiri"
require "digest"
require "open3"
require "rbconfig"
require_relative "../scripts/build-blog-search"

PREVIEW_TITLE_BUILD = ARGV.shift

class BlogPreviewTitleSyncTest < Minitest::Test
  ROOT = BlogSearchIndex::ROOT

  def post(slug, title, status = "forthcoming")
    { "url" => "/blog/preparations/#{slug}.html", "title" => title, "status" => status }
  end

  def sync(html, posts)
    BlogSearchIndex.preview_index(html: html, posts: posts)
  end

  def plain(text)
    text.gsub(/\s+/, " ").strip
  end

  def test_all_current_cards_match_the_article_titles_and_are_idempotent
    html = File.read(BlogSearchIndex::PREVIEW_INDEX, encoding: "UTF-8")
    records = BlogSearchIndex.records
    previews = records.select { |record| record["status"] == "forthcoming" }
    cards = Nokogiri::HTML(html).css("a.draft-card")
    assert_equal previews.length, cards.length
    previews.each do |record|
      matches = cards.select { |card| card["href"] == File.basename(record["url"]) || card["href"] == record["url"] }
      assert_equal 1, matches.length, record["url"]
      assert_equal record["title"], plain(matches.first.at_css("h2").text), record["url"]
    end
    assert_equal html, sync(html, records), "Current list is already synchronized"
    assert_equal html, sync(sync(html, records), records), "Synchronization is idempotent"
  end

  def test_only_heading_text_changes_with_all_other_bytes_preserved
    html = <<~HTML
      <section id="first"><a href="/elsewhere"><h2>Unrelated heading</h2></a>
        <a data-review="keep" class="extra draft-card" href='second.html'>
          <img src="second.jpg" alt="Keep this image"><small>Topic B</small>
          <h2 id="second-title" data-keep="yes"><em>Stale second title</em></h2>
          <p>Keep the second summary and its punctuation.</p>
        </a>
      </section>
      <section id="last"><a class="draft-card" href="/blog/preparations/first.html"><small>Topic A</small><H2 class="title">Stale first title</H2><p>Keep the first summary.</p></a></section>
    HTML
    records = [post("first", "Canonical first"), post("second", "Canonical second")]
    expected = html.sub("<em>Stale second title</em>", "Canonical second").sub("Stale first title", "Canonical first")
    assert_equal expected, sync(html, records)
    assert_equal expected, sync(expected, records)
  end

  def test_titles_are_html_escaped_and_not_double_escaped_on_repeat
    title = %q{A & B < C > D "quoted" 'single'}
    html = '<a class="draft-card" href="escaping.html"><h2>Old</h2><p>Unchanged &amp; summary.</p></a>'
    result = sync(html, [post("escaping", title)])
    assert_includes result, "<h2>#{CGI.escapeHTML(title)}</h2>"
    assert_equal title, Nokogiri::HTML(result).at_css("h2").text
    assert_includes result, "<p>Unchanged &amp; summary.</p>"
    assert_equal result, sync(result, [post("escaping", title)])
  end

  def test_duplicate_card_destinations_are_rejected_even_across_url_forms
    html = '<a class="draft-card" href="one.html"><h2>One</h2></a>' \
      '<a class="draft-card" href="/blog/preparations/one.html"><h2>One again</h2></a>'
    error = assert_raises(RuntimeError) { sync(html, [post("one", "One")]) }
    assert_match(/Duplicate forthcoming card/, error.message)
  end

  def test_missing_forthcoming_cards_are_rejected
    error = assert_raises(RuntimeError) { sync('<a href="one.html">Not a card</a>', [post("one", "One")]) }
    assert_match(/missing from the list/, error.message)
  end

  def test_unknown_and_published_card_destinations_are_rejected
    html = '<a class="draft-card" href="unknown.html"><h2>Unknown</h2></a>'
    error = assert_raises(RuntimeError) { sync(html, []) }
    assert_match(/no matching article/, error.message)
    error = assert_raises(RuntimeError) { sync(html, [post("unknown", "Already published", "published")]) }
    assert_match(/no matching article/, error.message)
  end

  def test_cards_require_one_heading_and_a_destination
    record = post("one", "One")
    [
      '<a class="draft-card" href="one.html"><p>No heading</p></a>',
      '<a class="draft-card" href="one.html"><h2>One</h2><h2>Two</h2></a>'
    ].each do |html|
      error = assert_raises(RuntimeError) { sync(html, [record]) }
      assert_match(/expected one card heading/, error.message)
    end
    error = assert_raises(RuntimeError) { sync('<a class="draft-card"><h2>One</h2></a>', [record]) }
    assert_match(/no destination/, error.message)
  end

  def test_empty_preview_collection_leaves_an_index_without_cards_unchanged
    html = '<h1>Forthcoming posts</h1><p>No forthcoming posts.</p><a href="../">Published posts</a>'
    assert_equal html, sync(html, [])
  end

  def test_check_mode_is_read_only
    paths = [BlogSearchIndex::PREVIEW_INDEX, BlogSearchIndex::OUTPUT]
    before = paths.to_h { |path| [path, Digest::SHA256.file(path).hexdigest] }
    stdout, stderr, status = Open3.capture3(RbConfig.ruby, File.join(ROOT, "scripts/build-blog-search.rb"), "--check", chdir: ROOT)
    after = paths.to_h { |path| [path, Digest::SHA256.file(path).hexdigest] }
    assert_equal before, after, "--check must not write the list or catalogue"
    assert status.success?, "#{stdout}\n#{stderr}"
  end

  def test_preview_document_titles_agree_with_visible_headings
    BlogSearchIndex.records.select { |record| record["status"] == "forthcoming" }.each do |record|
      doc = Nokogiri::HTML(File.read(File.join(ROOT, record["id"]), encoding: "UTF-8"))
      assert_equal record["title"], plain(doc.at_css("h1").text), record["id"]
      assert doc.at_css("title").text.start_with?(record["title"] + " — Alpha preview"), record["id"]
    end
  end

  def test_built_archive_and_search_titles_match_every_article_heading
    skip "Pass the built site directory to check every public list and destination" unless PREVIEW_TITLE_BUILD
    records = BlogSearchIndex.records
    published_links = Nokogiri::HTML(File.read(File.join(PREVIEW_TITLE_BUILD, "blog/index.html"))).css(".blog-preview h2 a")
    preview_cards = Nokogiri::HTML(File.read(File.join(PREVIEW_TITLE_BUILD, "blog/preparations/index.html"))).css("a.draft-card")
    assert_equal records.count { |record| record["status"] == "published" }, published_links.length
    assert_equal records.count { |record| record["status"] == "forthcoming" }, preview_cards.length
    records.each do |record|
      relative = record["url"].delete_prefix("/")
      relative += "index.html" if relative.end_with?("/")
      doc = Nokogiri::HTML(File.read(File.join(PREVIEW_TITLE_BUILD, relative), encoding: "UTF-8"))
      assert_equal record["title"], plain(doc.at_css("h1").text), record["url"]
      assert doc.at_css("title").text.start_with?(record["title"]), record["url"]
      if record["status"] == "published"
        matches = published_links.select { |link| link["href"].end_with?(record["url"]) }
        assert_equal 1, matches.length, record["url"]
        assert_equal record["title"], plain(matches.first.text), record["url"]
      else
        matches = preview_cards.select { |card| card["href"] == File.basename(record["url"]) || card["href"] == record["url"] }
        assert_equal 1, matches.length, record["url"]
        assert_equal record["title"], plain(matches.first.at_css("h2").text), record["url"]
      end
    end
  end
end
