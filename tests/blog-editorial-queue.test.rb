require "minitest/autorun"
require "json"
require "date"
require_relative "../scripts/build-blog-search"

class BlogEditorialQueueTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)
  ORIGIN = "https://www.gpeyre.com"

  def blocks(path)
    File.read(File.join(ROOT, path), encoding: "UTF-8").split(/^## /).drop(1).map do |body|
      heading = body.lines.first.strip.match(/\A(\d+)\. (.+)\z/)
      assert heading, "Keep helper-compatible numbered second-level headings"
      quotes = body.scan(/^> (.+)$/).flatten
      assert_equal 1, quotes.size, "Each entry must contain one exact announcement"
      preview = quotes.first.match(%r{ (https://www\.gpeyre\.com/blog/preparations/([a-z0-9-]+)\.html)\z})
      assert preview, "Keep the original preview URL at the end of the announcement"
      boxes = body.scan(/^- \[([^\]]*)\] Ready to publish\s*$/).flatten
      assert_equal 1, boxes.size
      assert_includes [" ", "x"], boxes.first
      {number: heading[1].to_i, title: heading[2], slug: preview[2], preview: preview[1],
       message: quotes.first, ready: boxes.first == "x", body: body}
    end
  end

  def setup
    @active = blocks("blog/announcement-queue.md")
    @archive = blocks("blog/published.md")
    @records = BlogSearchIndex.records
    @journal = JSON.parse(File.read(File.join(ROOT, "blog/publication-log.json"))).fetch("publications")
  end

  def test_complete_separate_catalogues_and_consistent_titles
    forthcoming = @records.select { |r| r["status"] == "forthcoming" }
    assert_equal forthcoming.map { |r| ORIGIN + r["url"] }.sort, @active.map { |b| b[:preview] }.sort
    all = @active + @archive
    assert_equal all.size, all.map { |b| b[:slug] }.uniq.size, "No duplicate or cross-file entries"
    [@active, @archive].each do |entries|
      assert_equal (1..entries.size).to_a, entries.map { |b| b[:number] }
      refute entries.any? { |b| b[:title].include?("->") }, "Apply title annotations instead of retaining arrows"
    end
    @active.each do |entry|
      record = forthcoming.find { |r| ORIGIN + r["url"] == entry[:preview] }
      assert_equal record.fetch("title"), entry[:title]
      refute_match(/^Published:/, entry[:body])
    end
  end

  def test_archive_preserves_completed_approvals_dates_and_announcements
    completed = @journal.select { |entry| entry["status"] == "announced" }
    assert_equal completed.map { |e| e["slug"] }.sort, @archive.map { |b| b[:slug] }.sort
    @archive.each do |entry|
      logged = completed.find { |e| e["slug"] == entry[:slug] }
      assert entry[:ready], "Historical approval must remain checked"
      assert_equal logged.fetch("title"), entry[:title]
      assert_equal ["#{logged.fetch('date')} · [Read post](#{logged.fetch('url')})"], entry[:body].scan(/^Published: (.+)$/).flatten
      assert_equal logged.fetch("message"), entry[:message].delete_suffix(entry[:preview]) + logged.fetch("url")
      assert logged["bluesky_uri"] && logged["bluesky_cid"]
      assert @records.any? { |r| r["status"] == "published" && ORIGIN + r["url"] == logged["url"] }
    end
    @journal.reject { |entry| entry["status"] == "announced" }.each do |entry|
      assert @active.any? { |b| b[:slug] == entry["slug"] }, "Pending work must stay active"
    end
  end

  def test_approved_first_and_best_effort_topic_alternation
    seen_review = false
    @active.each do |entry|
      seen_review ||= !entry[:ready]
      refute seen_review && entry[:ready], "Approved entries must precede unchecked ones"
      topics = entry[:body].scan(/^Topic: (.+)$/).flatten
      assert_equal 1, topics.size
      assert_includes ["OT / Wasserstein geometry", "Other topics", "Transport geometry (not generally optimal transport)"], topics.first
      entry[:transport] = topics.first != "Other topics"
    end
    @active.partition { |entry| entry[:ready] }.each do |group|
      group.each_cons(2).with_index do |(a, b), i|
        next unless a[:transport] == b[:transport]
        refute group.drop(i + 2).any? { |later| later[:transport] != a[:transport] },
               "Do not schedule consecutive same-topic entries while the opposite topic remains available in this approval group"
      end
    end
  end

  def test_announcements_fit_preview_and_final_urls
    (@active + @archive).each do |entry|
      dated = "#{ORIGIN}/blog/2099/12/31/#{entry[:slug]}/"
      [entry[:message], entry[:message].delete_suffix(entry[:preview]) + dated].each do |message|
        assert_operator message.scan(/\X/).size, :<=, 280
        assert_operator message.codepoints.size, :<=, 280
      end
    end
  end

  def test_editorial_files_remain_private
    config = YAML.safe_load(File.read(File.join(ROOT, "_config.yml")))
    %w[blog/announcement-queue.md blog/published.md blog/publication-log.json].each do |path|
      assert_includes config.fetch("exclude"), path
    end
  end
end
