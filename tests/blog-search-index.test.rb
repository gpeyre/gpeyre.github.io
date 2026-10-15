#!/usr/bin/env ruby
require "minitest/autorun"
require_relative "../scripts/build-blog-search"

BUILT_SITE = ARGV.shift

class BlogSearchIndexTest < Minitest::Test
  def setup
    @records = BlogSearchIndex.records
  end

  def test_catalogue_is_current
    assert_equal BlogSearchIndex.render, File.read(BlogSearchIndex::OUTPUT, encoding: "UTF-8")
  end

  def test_full_coverage_and_metadata
    root = BlogSearchIndex::ROOT
    expected = Dir.glob("#{root}/blog/_posts/*.md").reject do |path|
      YAML.safe_load(File.read(path).split("---", 3)[1], permitted_classes: [Date, Time])["published"] == false
    end
    expected += Dir.glob("#{root}/blog/preparations/*.html").reject { |path| File.basename(path) == "index.html" }
    assert_equal expected.map { |path| path.delete_prefix(root + "/") }.sort, @records.map { |post| post["id"] }.sort
    assert_equal @records.size, @records.map { |post| post["url"] }.uniq.size
    index = File.read("#{root}/blog/preparations/index.html")
    @records.each do |post|
      assert_operator post["keywords"].size, :>=, 18, post["id"]
      assert_equal post["keywords"].size, post["keywords"].map(&:downcase).uniq.size, post["id"]
      refute_empty post["title"]
      refute_empty post["description"]
      if post["status"] == "forthcoming"
        assert_nil post["date"]
        assert_includes index, 'href="' + File.basename(post["url"]) + '"'
      else
        assert_equal post["date"], Date.iso8601(post["date"]).iso8601
      end
    end
  end

  def test_missing_and_duplicate_keywords_fail
    assert_raises(RuntimeError) { BlogSearchIndex.keywords(nil, "fixture") }
    assert_raises(RuntimeError) { BlogSearchIndex.keywords(["one"], "fixture") }
    words = (1..18).map { |i| "keyword #{i}" }
    assert_raises(RuntimeError) { BlogSearchIndex.keywords(words + ["KEYWORD 1"], "fixture") }
    assert_equal "A & B", BlogSearchIndex.meta('<meta content="A &amp; B" name="description">', "description")
  end

  def test_built_links_and_head_keywords
    skip "Pass the built site directory to verify rendered URLs and metadata" unless BUILT_SITE
    @records.each do |post|
      relative = post["url"].delete_prefix("/")
      relative += "index.html" if relative.end_with?("/")
      path = File.join(BUILT_SITE, relative)
      assert File.file?(path), "Missing search destination: #{path}"
      html = File.read(path, encoding: "UTF-8")
      assert_equal post["keywords"], BlogSearchIndex.meta(html, "keywords").split(",").map(&:strip), post["id"]
    end
    ["blog/index.html", "blog/preparations/index.html"].each do |relative|
      html = File.read(File.join(BUILT_SITE, relative))
      assert_includes html, "data-blog-search"
      assert_includes html, "data-blog-browse"
      %w[blog-search-index.js blog-search-core.js blog-search.js blog-search.css].each { |asset| assert_includes html, asset }
    end
  end
end
