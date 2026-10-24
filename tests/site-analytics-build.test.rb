#!/usr/bin/env ruby
# Usage: ruby tests/site-analytics-build.test.rb /absolute/path/to/jekyll-output
# These are static checks only: no requests are sent to GoatCounter.
require "minitest/autorun"

ANALYTICS_ROOT = File.expand_path("..", __dir__)
ANALYTICS_BUILD = ARGV.shift

class SiteAnalyticsBuildTest < Minitest::Test
  def read(relative, root = ANALYTICS_ROOT)
    path = File.join(root, relative)
    assert File.file?(path), "Missing page: #{path}"
    File.read(path, encoding: "UTF-8")
  end

  def loader_tags(html)
    html.scan(/<script\b[^>]*>/im).select do |tag|
      tag.match?(/\bsrc\s*=/i) && tag.include?("site-analytics.js")
    end
  end

  def redirect?(html)
    html.match?(/^redirect_to\s*:/) ||
      html.match?(/<meta\b[^>]*http-equiv\s*=\s*["']refresh["']/i)
  end

  def assert_page_integration(html, label)
    scripts = loader_tags(html)
    assert_equal 1, scripts.size, "#{label}: exactly one first-party analytics loader"
    assert_match(/\bdefer(?:\s|>|=)/i, scripts.first, "#{label}: defer the loader until the document is parsed")
    footer = html.scan(/<footer\b[^>]*>.*?<\/footer>/im).join
    links = footer.scan(/<a\b[^>]*\bhref\s*=\s*["'](?:https:\/\/www\.gpeyre\.com)?\/privacy\/["'][^>]*>/i)
    assert_equal 1, links.size, "#{label}: one visible privacy link in the footer"
    refute_match(/(?:google-analytics\.com|GoogleAnalyticsObject|\b_gaq\b)/i, html,
      "#{label}: do not retain the old Google Analytics tracker")
    refute_match(/<script\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\/gc\.zgo\.at\//i, html,
      "#{label}: the third-party tracker must go through the privacy-aware loader")
  end

  def previews
    Dir.glob(File.join(ANALYTICS_ROOT, "blog/preparations/*.html")).map do |path|
      path.delete_prefix(ANALYTICS_ROOT + "/")
    end
  end

  def test_every_standalone_preview_and_index_has_loader_and_privacy_footer
    active = 0
    previews.each do |relative|
      html = read(relative)
      if redirect?(html)
        assert_empty loader_tags(html), "#{relative}: published-preview redirects must not load analytics"
      else
        active += 1
        assert_page_integration(html, relative)
      end
    end
    assert_operator active, :>, 1, "Check actual forthcoming articles, not just the index"
  end

  def test_shared_templates_and_loader
    head = read("_includes/head.html")
    footer = read("_includes/footer.html")
    assert_equal 1, loader_tags(head).size
    assert_includes footer, "'/privacy/' | relative_url"
    %w[_includes/head.html _includes/footer.html _layouts/default.html].each do |relative|
      refute_match(/(?:google-analytics\.com|GoogleAnalyticsObject|\b_gaq\b)/i, read(relative), relative)
    end
    assert File.file?(File.join(ANALYTICS_ROOT, "js/site-analytics.js"))
  end

  def test_experimental_assets_are_not_instrumented
    paths = Dir.glob(File.join(ANALYTICS_ROOT, "blog/preparations/assets/**/*.html"))
    refute_empty paths
    paths.each do |path|
      relative = path.delete_prefix(ANALYTICS_ROOT + "/")
      assert_empty loader_tags(read(relative)), "#{relative}: embedded experiments must not load analytics"
      assert_empty loader_tags(read(relative, ANALYTICS_BUILD)), relative if ANALYTICS_BUILD
    end
  end

  def test_built_previews_and_redirects
    skip "Pass the built Jekyll directory to check rendered pages" unless ANALYTICS_BUILD
    previews.each do |relative|
      source = read(relative)
      html = read(relative, ANALYTICS_BUILD)
      if redirect?(source)
        assert redirect?(html), "#{relative}: preserve the redirect"
        assert_empty loader_tags(html), "#{relative}: redirect must not be counted"
      else
        assert_page_integration(html, relative)
      end
    end
  end

  def test_built_shared_layout_pages_and_feeds
    skip "Pass the built Jekyll directory to check rendered pages" unless ANALYTICS_BUILD
    # Discover pages through the established shared theme, rather than keeping
    # a fragile hand-written inventory of every historical post.
    themed = Dir.glob(File.join(ANALYTICS_BUILD, "**/*.html")).select do |path|
      File.read(path, encoding: "UTF-8").include?("/css/clean-blog.css")
    end
    refute_empty themed
    themed.each do |path|
      relative = path.delete_prefix(File.expand_path(ANALYTICS_BUILD) + "/")
      assert_page_integration(File.read(path, encoding: "UTF-8"), relative)
    end
    %w[index.html blog/index.html books/index.html projects/index.html teaching/index.html contact/index.html privacy/index.html].each do |relative|
      html = read(relative, ANALYTICS_BUILD)
      assert_page_integration(html, relative)
    end
    articles = Dir.glob(File.join(ANALYTICS_BUILD, "blog/[0-9][0-9][0-9][0-9]/*/*/*/index.html"))
    refute_empty articles, "The rendered blog articles must be included"
    articles.each { |path| assert_includes themed, path }
    %w[blog/rss.xml blog/atom.xml].each do |relative|
      refute_includes read(relative, ANALYTICS_BUILD), "site-analytics.js", "Feeds must not include tracking scripts"
    end
    assert_equal read("js/site-analytics.js"), read("js/site-analytics.js", ANALYTICS_BUILD),
      "The build must contain the current privacy-aware loader"
  end
end
