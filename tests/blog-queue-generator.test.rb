require "minitest/autorun"
require_relative "../scripts/build-blog-queue"

class BlogQueueGeneratorTest < Minitest::Test
  def test_generated_view_is_current_and_preserves_source
    html = BlogQueue.render
    assert_equal html, File.read(BlogQueue::OUTPUT, encoding: "UTF-8")
    data = JSON.parse(html[/<script type="application\/json" id="queue-data">(.*?)<\/script>/m, 1])
    assert_equal File.read(BlogQueue::SOURCE, encoding: "UTF-8"), data.fetch("source")
    assert_equal BlogQueue.entries(data["source"]).length, html.scan(/<article class="queue-card"/).length
    refute_match(/https?:\/\/[^\s"']+\.(?:css|js)/, html)
    assert_includes html, 'name="robots" content="noindex,nofollow"'
    assert_includes html, "generated snapshot can be stale"
    assert_includes html, "commit and push"
  end

  def test_entries_preserve_message_order_and_readiness
    source = "# Test\n\n## 2. First & second\n\nTopic: Other topics\n\n- [x] Ready to publish\n\n> Exact & announcement. https://www.gpeyre.com/blog/preparations/a-post.html\n\n## 3. Later\n\n- [ ] Ready to publish\n\n> Another. https://www.gpeyre.com/blog/preparations/b-post.html\n"
    entries = BlogQueue.entries(source)
    assert_equal ["a-post", "b-post"], entries.map { |entry| entry["slug"] }
    assert_equal [true, false], entries.map { |entry| entry["ready"] }
    assert_equal "First & second", entries.first["title"]
    assert_equal "Exact & announcement. https://www.gpeyre.com/blog/preparations/a-post.html", entries.first["message"]
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("- [x] Ready to publish", "- [x] Ready to publish\n- [ ] Ready to publish")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("## 2.", "##")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("## 2. First & second", "##")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("b-post.html", "a-post.html")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("> Exact & announcement.", "> Another line\n> Exact & announcement.")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("> Exact & announcement.", "  > Indented second quotation\n> Exact & announcement.")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("a-post.html", "a-post.html trailing words")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("a-post.html\n", "a-post.html\nA wrapped continuation\n")) }
    assert_raises(RuntimeError) { BlogQueue.entries(source.sub("- [x] Ready to publish\n", "- [x] Ready to publish \n")) }
    assert_equal entries, BlogQueue.entries(source.gsub("\n", "\r\n"))
  end

  def test_no_hidden_browser_approval_store
    script = File.read(File.join(BlogQueue::ROOT, "js/blog-queue.js"))
    refute_includes script, "localStorage"
    refute_includes script, "sessionStorage"
    assert_includes script, "!== baseline"
    assert_includes script, "await writable.abort()"
    assert_includes script, "createWritable"
    assert_includes script, "file.name !== \"announcement-queue.md\""
  end
end
