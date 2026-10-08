# Run after a Jekyll build: ruby tests/blog-feeds.test.rb /path/to/generated/site
# For a subpath build, set BLOG_BASEURL=/preview to match --baseurl /preview.
require "cgi"
require "date"
require "liquid"
require "rexml/document"
require "time"
require "uri"
require "yaml"

ATOM = "http://www.w3.org/2005/Atom"
DC = "http://purl.org/dc/elements/1.1/"
NS = { "a" => ATOM, "dc" => DC }.freeze
SOURCE = File.expand_path("..", __dir__)
DESTINATION = File.expand_path(ARGV.fetch(0, "_site"))
CONFIG = YAML.safe_load(File.read(File.join(SOURCE, "_config.yml")))
BASEURL = ENV.fetch("BLOG_BASEURL", CONFIG.fetch("baseurl", ""))
ORIGIN = CONFIG.fetch("url").delete_suffix("/")
ROOT = ORIGIN + BASEURL.delete_suffix("/")

def check(condition, message)
  raise message unless condition
end

def elements(node, path)
  REXML::XPath.match(node, path, NS)
end

def one(node, path)
  matches = elements(node, path)
  check(matches.size == 1, "Expected exactly one #{path}, got #{matches.size}")
  matches.first
end

def text(node, path)
  one(node, path).text.to_s
end

def attributes(tag)
  tag.scan(/([\w:-]+)="([^"]*)"/).to_h.transform_values { |value| CGI.unescapeHTML(value) }
end

def read_xml(name)
  source = File.read(File.join(DESTINATION, "blog", name), encoding: "UTF-8")
  check(source.valid_encoding?, "#{name} must be valid UTF-8")
  check(source.start_with?('<?xml version="1.0" encoding="UTF-8"?>'), "#{name} must start with its XML declaration, not an HTML layout")
  check(!source.include?("<!DOCTYPE"), "#{name} must not use an HTML doctype")
  REXML::Document.new(source)
end

# Exercise modification-date aggregation, including an edited older article
# and the empty-blog fallback, independently of the current post collection.
metadata_template = Liquid::Template.parse(File.read(File.join(SOURCE, "_includes", "blog-feed-metadata.html")) +
  "{{ blog_updated | date: '%Y-%m-%d' }}|{{ blog_posts | map: 'title' | join: ',' }}")
sample_site = { "author" => "Example", "pages" => [], "time" => "2026-10-08",
  "categories" => { "blog" => [
    { "title" => "Older", "date" => "2026-09-01", "last_modified_at" => "2026-10-07" },
    { "title" => "Newer", "date" => "2026-10-03" }
  ] } }
check(metadata_template.render!("site" => sample_site) == "2026-10-07|Newer,Older", "An edited older article must advance the feed timestamp without changing publication order")
sample_site["categories"]["blog"][0].delete("last_modified_at")
check(metadata_template.render!("site" => sample_site) == "2026-10-03|Newer,Older", "Without modification dates, use the newest publication")
sample_site["categories"].clear
check(metadata_template.render!("site" => sample_site) == "2026-10-08|", "An empty blog must still have a valid feed timestamp")

rss = read_xml("rss.xml")
atom = read_xml("atom.xml")
channel = one(rss, "/rss/channel")
feed = one(atom, "/a:feed")
check(rss.root.attributes["version"] == "2.0", "RSS version must be 2.0")
check(feed.namespace == ATOM, "Atom must use the Atom 1.0 namespace")
check(text(channel, "title") == text(feed, "a:title"), "Feed titles must agree")
check(text(channel, "title") == CONFIG.fetch("author") + " — Blog", "Feeds must identify the blog, not the old news archive")
check(!text(channel, "description").empty?, "RSS needs a channel description")
check(text(channel, "description") == text(feed, "a:subtitle"), "Feed descriptions must agree")
check(text(channel, "link") == ROOT + "/blog/", "RSS must link to the archive")
check(one(channel, "a:link[@rel='self']").attributes["href"] == ROOT + "/blog/rss.xml", "RSS self link must be absolute")
check(one(channel, "a:link[@rel='self']").attributes["type"] == "application/rss+xml", "RSS self link must declare its type")
check(text(feed, "a:id") == ROOT + "/blog/atom.xml", "Atom feed needs a stable absolute ID")
check(one(feed, "a:link[@rel='self']").attributes["href"] == text(feed, "a:id"), "Atom self link must match its ID")
check(one(feed, "a:link[@rel='self']").attributes["type"] == "application/atom+xml", "Atom self link must declare its type")
check(one(feed, "a:link[@rel='alternate']").attributes["href"] == ROOT + "/blog/", "Atom must link to the archive")
check(text(feed, "a:author/a:name") == CONFIG.fetch("author"), "Atom needs a feed author")

items = elements(channel, "item")
entries = elements(feed, "a:entry")
archive = File.read(File.join(DESTINATION, "blog", "index.html"))
archive_links = archive.scan(/<h2><a href="([^"]+)">/).flatten.map { |link| ORIGIN + CGI.unescapeHTML(link) }
rss_links = items.map { |item| text(item, "link") }
atom_links = entries.map { |entry| one(entry, "a:link[@rel='alternate']").attributes["href"] }
check(!items.empty?, "The current blog must have feed entries")
check(rss_links == archive_links, "RSS must include exactly the blog archive posts, in the same order")
check(atom_links == rss_links, "Atom and RSS must include the same posts in the same order")
check(rss_links.uniq.size == rss_links.size, "Entry URLs must be unique")
check(rss_links.all? { |link| link.start_with?(ROOT + "/blog/") && URI.parse(link).scheme == "https" }, "Entry URLs must be absolute HTTPS blog URLs")

posts = Dir.glob(File.join(SOURCE, "blog", "_posts", "*.md")).map do |path|
  front_matter = File.read(path).match(/\A---\s*\n(.*?)\n---\s*\n/m)[1]
  YAML.safe_load(front_matter, permitted_classes: [Date, Time])
end
published_dates = []
updated_dates = []
items.zip(entries).each do |item, entry|
  title = text(item, "title")
  post = posts.find { |candidate| candidate.fetch("title") == title }
  check(post, "The feed must not include an old root news post: #{title}")
  check(text(entry, "a:title") == title, "RSS and Atom titles must agree")
  check(text(item, "guid") == text(item, "link"), "RSS GUID must be the stable article URL")
  check(one(item, "guid").attributes["isPermaLink"] == "true", "RSS GUID must identify a permalink")
  check(text(entry, "a:id") == text(item, "guid"), "Atom ID and RSS GUID must agree")
  check(one(entry, "a:link[@rel='alternate']").attributes["type"] == "text/html", "Summary-only Atom entries need an HTML article link")
  check(one(entry, "a:summary").attributes["type"] == "text", "Atom summaries must be plain text")
  summary = text(item, "description")
  check(!summary.empty? && !summary.match?(/<script|<canvas|<input|<button/i), "Feeds must contain readable summaries, not interactive controls")
  check(summary == text(entry, "a:summary"), "RSS and Atom summaries must agree")
  if post["description"]
    check(summary == post["description"].split.join(" "), "Summary must preserve the post's description and Unicode")
  end
  check(text(item, "category") == post.fetch("topic"), "RSS topic must survive XML escaping")
  check(one(entry, "a:category").attributes["term"] == post.fetch("topic"), "Atom topic must survive attribute escaping")
  author = post.fetch("author", CONFIG.fetch("author"))
  check(text(item, "dc:creator") == author && text(entry, "a:author/a:name") == author, "Entry authors must agree")
  language = post.fetch("lang", "en")
  check(text(item, "dc:language") == language && entry.attributes["xml:lang"] == language, "Entry languages must agree")
  published = Time.rfc2822(text(item, "pubDate"))
  check(published == Time.iso8601(text(entry, "a:published")), "RSS and Atom publication dates must agree")
  updated = Time.iso8601(text(entry, "a:updated"))
  check(updated >= published, "Modification dates must not precede publication")
  published_dates << published
  updated_dates << updated
end
check(published_dates == published_dates.sort.reverse, "Feeds must be newest first")
last_update = Time.iso8601(text(feed, "a:updated"))
check(last_update == updated_dates.max, "Atom feed timestamp must reflect its most recently modified entry")
check(Time.rfc2822(text(channel, "lastBuildDate")) == last_update, "RSS and Atom modification dates must agree")

# Check discovery on the homepage, archive, and every article, without a browser.
([ROOT + "/", ROOT + "/blog/"] + rss_links).each do |url|
  relative_path = URI.parse(url).path.delete_prefix(BASEURL)
  html = File.read(File.join(DESTINATION, relative_path.delete_prefix("/"), "index.html"))
  head = html.match(/<head>(.*?)<\/head>/m)[1]
  alternate_links = head.scan(/<link\b[^>]+>/).map { |tag| attributes(tag) }.select { |attrs| attrs["rel"] == "alternate" }
  { "rss" => "application/rss+xml", "atom" => "application/atom+xml" }.each do |format, type|
    matches = alternate_links.select { |attrs| attrs["type"] == type }
    check(matches.size == 1 && matches.first["href"] == ROOT + "/blog/#{format}.xml", "#{url} needs one absolute #{format} autodiscovery link")
    next if relative_path == "/"
    subscribe = html.match(/<p class="blog-subscribe">(.*?)<\/p>/m)
    check(subscribe && subscribe[1].include?("href=\"#{BASEURL}/blog/#{format}.xml\""), "#{url} needs a visible #{format} subscription link")
  end
end

puts "Blog feeds passed: #{items.size} matching RSS/Atom entries, XML, metadata, dates, HTTPS URLs, and visible/autodiscovery links (baseurl=#{BASEURL.inspect})."
