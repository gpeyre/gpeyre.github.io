#!/usr/bin/env python3
"""Offline tests: all Git commands and subprocesses are mocked."""

import contextlib
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("blog_publication_git", pathlib.Path(__file__).parents[1] / "scripts" / "blog-publication-git.py")
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)

BASE, PUBLICATION, FINAL, OTHER = (letter * 40 for letter in "abcd")
TOKEN = "e" * 64
SLUG, DATE = "an-approved-post", "2026-10-19"


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = pathlib.Path(self.temporary.name)
        self.patch = mock.patch.object(helper, "ROOT", self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.files = helper.manifest(SLUG, DATE)
        self.contents = {path: ("authorized content: " + path).encode() for path in self.files if path != helper.LOG_PATH}
        for path, contents in self.contents.items():
            self.write(path, contents)
        self.source = b"The approved original HTML article."
        self.baseline_log = {"version": 1, "timezone": "Europe/Paris", "publications": []}
        self.entry = {
            "slug": SLUG, "date": DATE, "title": "An approved post", "url": helper.canonical(SLUG, DATE),
            "message": "A concise announcement. " + helper.canonical(SLUG, DATE),
            "status": "prepared", "source_sha256": hashlib.sha256(self.source).hexdigest(),
            "base_commit": BASE, "files": self.files,
            "working_sha256": {path: hashlib.sha256(value).hexdigest() for path, value in self.contents.items()},
            "publication_commit": None, "bluesky_uri": None, "bluesky_cid": None,
        }
        self.initial = json.loads(json.dumps(self.entry))
        self.save()
        self.published_log_bytes = self.read(helper.LOG_PATH)
        self.write("blog/announcement-queue.md", (
            "## 1. An approved post\n\n- [x] Ready to publish\n\n"
            "> A concise announcement. https://www.gpeyre.com/blog/preparations/an-approved-post.html\n").encode())
        self.write("blog/.publication-run.lock/owner.json", json.dumps({"token": TOKEN}).encode())
        self.head, self.tip, self.staged = BASE, BASE, []
        self.publication_parent, self.final_parent = BASE, PUBLICATION
        self.baseline_post_exists = False
        self.final_log_bytes = None
        self.calls = []
        self.fake = mock.patch.object(helper, "git", side_effect=self.git)
        self.fake.start()
        self.addCleanup(self.fake.stop)
        self.repo_guard = mock.patch.object(helper, "verify_repository", side_effect=lambda: self.head)
        self.repo_guard.start()
        self.addCleanup(self.repo_guard.stop)

    def write(self, path, contents):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(contents)

    def read(self, path):
        return (self.root / path).read_bytes()

    def save(self):
        log = {"version": 1, "timezone": "Europe/Paris", "publications": [self.entry]}
        self.write(helper.LOG_PATH, (json.dumps(log, indent=2) + "\n").encode())

    def git(self, arguments, network=False):
        self.calls.append((arguments, network))
        if arguments[:1] == ["show"]:
            revision, path = arguments[1].split(":", 1)
            if revision == BASE and path == helper.LOG_PATH:
                return json.dumps(self.baseline_log).encode()
            if revision == BASE:
                return self.source
            if path == helper.LOG_PATH:
                return self.published_log_bytes if revision == PUBLICATION else (self.final_log_bytes if self.final_log_bytes is not None else self.read(path))
            return self.contents[path]
        if arguments[:1] == ["ls-tree"]:
            return (arguments[-1] + "\0").encode() if self.baseline_post_exists else b""
        if arguments[:3] == ["diff", "--cached", "--name-only"]:
            return "\0".join(self.staged).encode()
        if arguments[:1] == ["diff"]:
            return b""
        if arguments[:1] == ["ls-remote"]:
            return (self.tip + "\trefs/heads/master\n").encode()
        if arguments[:1] == ["rev-list"]:
            commit = arguments[-1]
            parent = self.publication_parent if commit == PUBLICATION else self.final_parent
            return (commit + " " + parent + "\n").encode()
        if arguments[:1] == ["diff-tree"]:
            names = self.files if arguments[-1] == PUBLICATION else [helper.LOG_PATH]
            return ("\0".join(names) + "\0").encode()
        if arguments[:1] == ["log"]:
            message = helper.publication_message(self.entry) if arguments[-1] == PUBLICATION else helper.journal_message(self.entry)
            return (message + "\n\n").encode()
        if arguments == ["rev-parse", "HEAD"]:
            return (self.head + "\n").encode()
        if arguments[:1] == ["add"]:
            self.staged = arguments[2:]
            return b""
        if arguments[:1] == ["commit"]:
            self.head = PUBLICATION if arguments[3].startswith("Publish") else FINAL
            self.staged = []
            return b""
        if arguments[:1] == ["push"]:
            if "--dry-run" not in arguments:
                self.tip = self.head
            return b""
        if arguments[:1] == ["status"]:
            return b"?? unrelated.txt\0"
        raise AssertionError("Unexpected mocked Git operation: " + repr(arguments))

    def announced(self):
        self.head, self.tip = PUBLICATION, PUBLICATION
        self.entry.update(status="announced", publication_commit=PUBLICATION,
                          bluesky_uri="at://did:plc:example/app.bsky.feed.post/example", bluesky_cid="bafexample")
        self.save()

    def move_to_archive(self):
        block = self.read("blog/announcement-queue.md")
        marker = "\nPublished: " + DATE + " · [Read post](" + self.entry["url"] + ")\n\n> "
        self.write("blog/published.md", block.replace(b"\n> ", marker.encode()))
        self.write("blog/announcement-queue.md", b"# Queue\n")

    def assert_no_mutation(self):
        self.assertFalse(any(args[0] in ("add", "commit", "push") for args, _ in self.calls))

    def test_exact_manifest(self):
        self.assertEqual(len(self.files), 5)
        self.assertIn("blog/_posts/2026-10-19-an-approved-post.md", self.files)

    def test_load_approved_entry(self):
        self.assertEqual(helper.load_entry(SLUG, DATE), self.entry)

    def image_metadata(self):
        return {"path": "/blog/imgs/summaries/" + SLUG + ".jpg", "alt": "Blue and orange ellipses in the numerical experiment.",
                "width": 1200, "height": 630, "sha256": "f" * 64, "mime_type": "image/jpeg", "size": 180000}

    def test_confirmed_image_metadata_allows_only_final_journal_commit(self):
        self.announced()
        self.entry["announcement_image"] = self.image_metadata()
        self.save()
        self.assertEqual(helper.load_entry(SLUG, DATE), self.entry)
        self.assertEqual(helper.commit_log(SLUG, DATE, TOKEN), FINAL)
        mutations = [args for args, _ in self.calls if args[0] in ("add", "commit")]
        self.assertEqual(mutations, [["add", "--", helper.LOG_PATH],
                                   ["commit", "--only", "--message", helper.journal_message(self.entry), "--", helper.LOG_PATH]])
        self.assertEqual(len(self.files), 5)
        self.assertNotIn("blog/summary-images.json", self.files)

    def test_confirmed_png_image_metadata_is_supported(self):
        self.announced()
        self.entry["announcement_image"] = dict(self.image_metadata(), path="/blog/imgs/summaries/" + SLUG + ".png", mime_type="image/png")
        self.save()
        self.assertEqual(helper.commit_log(SLUG, DATE, TOKEN), FINAL)

    def test_completed_archived_image_journal_reconciles_without_extra_commit(self):
        self.announced()
        self.entry["announcement_image"] = self.image_metadata()
        self.save()
        self.move_to_archive()
        self.head = FINAL
        self.assertEqual(helper.commit_log(SLUG, DATE, TOKEN), FINAL)
        self.assert_no_mutation()

    def test_image_metadata_is_rejected_before_announcement(self):
        for status in ("prepared", "published"):
            with self.subTest(status=status):
                self.entry.update(status=status, publication_commit=None if status == "prepared" else PUBLICATION,
                                  announcement_image=self.image_metadata())
                self.save()
                with self.assertRaises(helper.SafeError):
                    helper.load_entry(SLUG, DATE)
                with self.assertRaises(helper.SafeError):
                    helper.verify_journal_transition(self.entry, PUBLICATION)
        self.assert_no_mutation()

    def test_image_metadata_requires_confirmed_record_identifiers(self):
        self.announced()
        self.entry["announcement_image"] = self.image_metadata()
        for field, value in (("publication_commit", None), ("publication_commit", "bad"),
                             ("bluesky_uri", None), ("bluesky_uri", "https://example.org/"),
                             ("bluesky_cid", None), ("bluesky_cid", "has spaces")):
            previous = self.entry[field]
            self.entry[field] = value
            self.save()
            with self.subTest(field=field, value=value), self.assertRaises(helper.SafeError):
                helper.commit_log(SLUG, DATE, TOKEN)
            self.entry[field] = previous
        self.assert_no_mutation()

    def test_image_metadata_exact_shape_and_safe_values_are_required(self):
        self.announced()
        valid = self.image_metadata()
        variants = [None, [], {}, dict(valid, extra="not allowed"), {key: value for key, value in valid.items() if key != "sha256"}]
        for field, value in (("path", "/etc/passwd"), ("path", "/blog/imgs/summaries/another.jpg"),
                             ("path", "/blog/imgs/summaries/../" + SLUG + ".jpg"),
                             ("mime_type", "image/png"), ("mime_type", "image/svg+xml"),
                             ("alt", ""), ("alt", " "), ("alt", "Caption\nwith private field"), ("alt", "x" * 1001),
                             ("width", True), ("width", 0), ("width", 4097), ("height", "630"),
                             ("size", True), ("size", 0), ("size", 1_000_001), ("sha256", "invalid")):
            variants.append(dict(valid, **{field: value}))
        variants.append(dict(valid, width=4096, height=4096))
        for image in variants:
            self.entry["announcement_image"] = image
            self.save()
            with self.subTest(image=image), self.assertRaises(helper.SafeError):
                helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_image_metadata_cannot_be_smuggled_into_original_prepared_commit(self):
        self.announced()
        image = self.image_metadata()
        self.entry["announcement_image"] = image
        self.save()
        original = json.loads(self.published_log_bytes)
        original["publications"][0]["announcement_image"] = image
        self.published_log_bytes = json.dumps(original).encode()
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_new_image_metadata_cannot_bypass_original_publication_check(self):
        self.announced()
        self.entry["announcement_image"] = self.image_metadata()
        self.save()
        with self.assertRaises(helper.SafeError):
            helper.verify_journal_transition(self.entry)
        self.assert_no_mutation()

    def test_already_committed_completed_image_metadata_cannot_be_mutated(self):
        self.announced()
        image = self.image_metadata()
        self.entry["announcement_image"] = image
        self.save()
        self.final_log_bytes = self.read(helper.LOG_PATH)
        self.head = FINAL
        variants = [dict(image, alt="A different caption."), dict(image, sha256="1" * 64),
                    dict(image, width=1100), dict(image, size=170000)]
        for changed in variants:
            self.entry["announcement_image"] = changed
            self.save()
            for operation in (helper.commit_log, helper.push):
                with self.subTest(changed=changed, operation=operation.__name__), self.assertRaises(helper.SafeError):
                    operation(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_completed_text_only_commit_cannot_gain_image_metadata_retroactively(self):
        self.announced()
        self.final_log_bytes = self.read(helper.LOG_PATH)
        self.head = FINAL
        self.entry["announcement_image"] = self.image_metadata()
        self.save()
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_optional_image_metadata_does_not_allow_unrelated_journal_edit(self):
        self.announced()
        self.entry["announcement_image"] = self.image_metadata()
        self.save()
        current = json.loads(self.read(helper.LOG_PATH))
        current["unrelated"] = "must not be committed"
        self.write(helper.LOG_PATH, json.dumps(current).encode())
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_image_metadata_never_relaxes_publication_or_final_commit_ancestry(self):
        self.announced()
        self.entry["announcement_image"] = self.image_metadata()
        self.save()
        self.publication_parent = OTHER
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.publication_parent = BASE
        self.head, self.final_parent = FINAL, OTHER
        with self.assertRaises(helper.SafeError):
            helper.push(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_completed_archived_approval_is_loaded(self):
        self.announced()
        self.move_to_archive()
        self.assertEqual(helper.load_entry(SLUG, DATE), self.entry)

    def test_archive_cannot_authorize_prepared_or_published_entry(self):
        self.move_to_archive()
        for status in ("prepared", "published"):
            with self.subTest(status=status):
                self.entry.update(status=status, publication_commit=None if status == "prepared" else PUBLICATION)
                self.save()
                with self.assertRaises(helper.SafeError):
                    helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_completed_archive_never_authorizes_new_publication_commit(self):
        self.announced()
        self.move_to_archive()
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_archive_without_journal_entry_is_not_authority(self):
        self.move_to_archive()
        self.write(helper.LOG_PATH, json.dumps(self.baseline_log).encode())
        with self.assertRaises(helper.SafeError):
            helper.load_entry(SLUG, DATE)
        self.assert_no_mutation()

    def test_unchecked_archived_approval_is_rejected(self):
        self.announced()
        self.move_to_archive()
        self.write("blog/published.md", self.read("blog/published.md").replace(b"[x]", b"[ ]"))
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_duplicate_and_conflicting_active_archive_entries_are_rejected(self):
        self.announced()
        active = self.read("blog/announcement-queue.md")
        self.move_to_archive()
        for content in (active, active.replace(b"A concise", b"A conflicting")):
            with self.subTest(conflicting=content != active):
                self.write("blog/announcement-queue.md", content)
                with self.assertRaises(helper.SafeError):
                    helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_duplicate_archived_entries_are_rejected(self):
        self.announced()
        self.move_to_archive()
        self.write("blog/published.md", self.read("blog/published.md") * 2)
        with self.assertRaises(helper.SafeError):
            helper.load_entry(SLUG, DATE)

    def test_archive_requires_exact_date_url_title_and_message(self):
        self.announced()
        self.move_to_archive()
        original = self.read("blog/published.md")
        variants = (
            original.replace(b"Published: 2026-10-19", b"Published: 2026-10-20"),
            original.replace(("[Read post](" + self.entry["url"] + ")").encode(), b"[Read post](https://example.org/)"),
            original.replace(b"## 1. An approved post", b"## 1. Another title"),
            original.replace(b"A concise announcement.", b"A different announcement."),
            original.replace(b"Published: ", b"Publication date: "),
        )
        for content in variants:
            with self.subTest(content=content):
                self.write("blog/published.md", content)
                with self.assertRaises(helper.SafeError):
                    helper.load_entry(SLUG, DATE)

    def test_archived_completion_requires_valid_commit_and_record_identifiers(self):
        self.announced()
        self.move_to_archive()
        for field, value in (("publication_commit", "invalid"), ("bluesky_uri", ""), ("bluesky_cid", None)):
            original = self.entry[field]
            self.entry[field] = value
            self.save()
            with self.subTest(field=field), self.assertRaises(helper.SafeError):
                helper.load_entry(SLUG, DATE)
            self.entry[field] = original

    def test_pending_active_approval_remains_authorized_with_unrelated_archive(self):
        self.write("blog/published.md", b"## 1. Another post\n\n- [x] Ready to publish\n\n> Another. https://www.gpeyre.com/blog/preparations/other.html\n")
        self.assertEqual(helper.load_entry(SLUG, DATE), self.entry)

    def test_archived_announcement_journal_commit_still_changes_only_log(self):
        self.announced()
        self.move_to_archive()
        self.assertEqual(helper.commit_log(SLUG, DATE, TOKEN), FINAL)
        mutations = [args for args, _ in self.calls if args[0] in ("add", "commit")]
        self.assertEqual(mutations, [["add", "--", helper.LOG_PATH], ["commit", "--only", "--message", helper.journal_message(self.entry), "--", helper.LOG_PATH]])

    def test_archived_final_log_retry_is_noop(self):
        self.announced()
        self.move_to_archive()
        self.head = FINAL
        self.assertEqual(helper.commit_log(SLUG, DATE, TOKEN), FINAL)
        self.assert_no_mutation()

    def test_archived_final_log_push_keeps_exact_commit_ancestry(self):
        self.announced()
        self.move_to_archive()
        self.head = FINAL
        self.assertIn("verified", helper.push(SLUG, DATE, TOKEN))

    def test_archived_approval_does_not_bypass_publication_commit_ancestry(self):
        self.announced()
        self.move_to_archive()
        self.publication_parent = OTHER
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_archived_approval_does_not_bypass_final_commit_ancestry(self):
        self.announced()
        self.move_to_archive()
        self.head, self.final_parent = FINAL, OTHER
        with self.assertRaises(helper.SafeError):
            helper.push(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_archived_approval_does_not_bypass_journal_history(self):
        self.announced()
        self.move_to_archive()
        initial_log = json.loads(self.published_log_bytes)
        initial_log["unrelated"] = "preserve and reject"
        self.published_log_bytes = json.dumps(initial_log).encode()
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_archive_symlink_is_rejected(self):
        self.write("other.md", b"preserve this")
        (self.root / "blog/published.md").symlink_to(self.root / "other.md")
        with self.assertRaises(helper.SafeError):
            helper.load_entry(SLUG, DATE)
        self.assertEqual(self.read("other.md"), b"preserve this")

    def test_multiple_readiness_markers_and_quotes_are_rejected(self):
        original = self.read("blog/announcement-queue.md")
        variants = (original.replace(b"- [x] Ready to publish", b"- [x] Ready to publish\n- [ ] Ready to publish"), original + b"> Another announcement\n")
        for content in variants:
            with self.subTest(content=content):
                self.write("blog/announcement-queue.md", content)
                with self.assertRaises(helper.SafeError):
                    helper.load_entry(SLUG, DATE)

    def test_unchecked_entry_refused(self):
        self.write("blog/announcement-queue.md", self.read("blog/announcement-queue.md").replace(b"[x]", b"[ ]"))
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_unapproved_message_refused(self):
        self.entry["message"] = "Different message " + self.entry["url"]
        self.save()
        with self.assertRaises(helper.SafeError):
            helper.load_entry(SLUG, DATE)

    def test_duplicate_date_refused(self):
        log = json.loads(self.read(helper.LOG_PATH))
        log["publications"].append(dict(self.entry, slug="other"))
        self.write(helper.LOG_PATH, json.dumps(log).encode())
        with self.assertRaises(helper.SafeError):
            helper.load_entry(SLUG, DATE)

    def test_extra_manifest_path_refused(self):
        self.entry["files"].append("README.md")
        self.save()
        with self.assertRaises(helper.SafeError):
            helper.load_entry(SLUG, DATE)

    def test_missing_fingerprint_refused(self):
        self.entry["working_sha256"].pop(next(iter(self.contents)))
        self.save()
        with self.assertRaises(helper.SafeError):
            helper.load_entry(SLUG, DATE)

    def test_source_changed_refused(self):
        self.entry["source_sha256"] = "f" * 64
        self.save()
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_existing_published_post_is_not_overwritten(self):
        self.baseline_post_exists = True
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_working_content_changed_refused(self):
        self.write(next(iter(self.contents)), b"A concurrent edit.")
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_symlink_file_refused(self):
        path = self.root / next(iter(self.contents))
        path.unlink()
        path.symlink_to(self.root / helper.LOG_PATH)
        with self.assertRaises(helper.SafeError):
            helper.verify_working(self.entry)

    def test_wrong_lock_refused(self):
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, "f" * 64)
        self.assert_no_mutation()

    def test_symlink_lock_refused(self):
        owner = self.root / "blog/.publication-run.lock/owner.json"
        owner.unlink()
        owner.symlink_to(self.root / helper.LOG_PATH)
        with self.assertRaises(helper.SafeError):
            helper.verify_lock(TOKEN)

    def test_unrelated_staged_files_preserved(self):
        self.staged = ["a-user-file.txt"]
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()
        self.assertEqual(self.staged, ["a-user-file.txt"])

    def test_remote_moved_before_commit_refused(self):
        self.tip = OTHER
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_create_publication_only_exact_paths(self):
        self.assertEqual(helper.commit_publication(SLUG, DATE, TOKEN), PUBLICATION)
        mutations = [args for args, _ in self.calls if args[0] in ("add", "commit")]
        self.assertEqual(mutations[0], ["add", "--", *self.files])
        self.assertEqual(mutations[1], ["commit", "--only", "--message", helper.publication_message(self.entry), "--", *self.files])

    def test_retry_recognizes_existing_publication(self):
        self.head = PUBLICATION
        self.assertEqual(helper.commit_publication(SLUG, DATE, TOKEN), PUBLICATION)
        self.assert_no_mutation()

    def test_retry_after_publication_hash_is_recorded(self):
        self.head = PUBLICATION
        self.entry["publication_commit"] = PUBLICATION
        self.save()
        self.assertEqual(helper.commit_publication(SLUG, DATE, TOKEN), PUBLICATION)
        self.assert_no_mutation()

    def test_unrelated_prior_journal_edits_refused(self):
        log = json.loads(self.read(helper.LOG_PATH))
        log["unrelated"] = "unattributed metadata"
        self.write(helper.LOG_PATH, json.dumps(log).encode())
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_only_one_new_journal_entry_allowed(self):
        log = json.loads(self.read(helper.LOG_PATH))
        log["publications"].append(dict(self.entry, slug="another", date="2026-10-20"))
        self.write(helper.LOG_PATH, json.dumps(log).encode())
        with self.assertRaises(helper.SafeError):
            helper.commit_publication(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_push_prepared_publication(self):
        self.head = PUBLICATION
        self.entry["publication_commit"] = PUBLICATION
        self.save()
        self.assertIn("verified", helper.push(SLUG, DATE, TOKEN))
        self.assertIn((["push", "--no-follow-tags", "--recurse-submodules=no", "origin", "HEAD:refs/heads/master"], True), self.calls)

    def test_push_lost_commit_response_without_hash(self):
        self.head = PUBLICATION
        self.assertIn("verified", helper.push(SLUG, DATE, TOKEN))

    def test_push_rejects_other_remote_tip(self):
        self.head, self.tip = PUBLICATION, OTHER
        with self.assertRaises(helper.SafeError):
            helper.push(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_push_retry_is_noop(self):
        self.head, self.tip = PUBLICATION, PUBLICATION
        self.assertIn("already", helper.push(SLUG, DATE, TOKEN))
        self.assert_no_mutation()

    def test_final_log_commit_only_log(self):
        self.announced()
        self.assertEqual(helper.commit_log(SLUG, DATE, TOKEN), FINAL)
        mutations = [args for args, _ in self.calls if args[0] in ("add", "commit")]
        self.assertEqual(mutations, [["add", "--", helper.LOG_PATH], ["commit", "--only", "--message", helper.journal_message(self.entry), "--", helper.LOG_PATH]])

    def test_final_log_retry_is_noop(self):
        self.announced()
        self.head = FINAL
        self.assertEqual(helper.commit_log(SLUG, DATE, TOKEN), FINAL)
        self.assert_no_mutation()

    def test_log_commit_requires_announcement(self):
        self.entry.update(status="published", publication_commit=PUBLICATION)
        self.head = PUBLICATION
        self.save()
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_push_final_log_commit(self):
        self.announced()
        self.head = FINAL
        self.assertIn("verified", helper.push(SLUG, DATE, TOKEN))

    def test_push_rejects_incorrect_committed_journal(self):
        self.announced()
        self.head = FINAL
        self.final_log_bytes = b'{"unrelated": "incorrect committed journal"}'
        with self.assertRaises(helper.SafeError):
            helper.push(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_final_log_retry_rejects_incorrect_committed_journal(self):
        self.announced()
        self.head = FINAL
        self.final_log_bytes = b'{"unrelated": "incorrect committed journal"}'
        with self.assertRaises(helper.SafeError):
            helper.commit_log(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_push_rejects_unattributed_original_journal(self):
        self.head = PUBLICATION
        published = json.loads(self.published_log_bytes)
        published["unrelated"] = "Unexpected original journal change"
        self.published_log_bytes = json.dumps(published).encode()
        with self.assertRaises(helper.SafeError):
            helper.push(SLUG, DATE, TOKEN)
        self.assert_no_mutation()

    def test_check_is_read_only(self):
        self.assertIn("No commit or real push", helper.check())
        self.assert_no_mutation()

    def test_probe_is_only_fixed_dry_run(self):
        self.assertIn("No commit or real push", helper.check(probe=True))
        self.assertIn((["push", "--dry-run", "--no-follow-tags", "--recurse-submodules=no", "origin", "HEAD:refs/heads/master"], True), self.calls)

    def test_probe_refuses_unpushed_local_commits(self):
        self.head = PUBLICATION
        with self.assertRaises(helper.SafeError):
            helper.check(probe=True)
        self.assert_no_mutation()

    def test_cli_rejects_raw_git_options(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                helper.main(["push", "--slug", SLUG, "--date", DATE, "--lock-token", TOKEN, "--force"])
        self.assert_no_mutation()

    def test_cli_rejects_abbreviated_options(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                helper.main(["push", "--sl", SLUG, "--date", DATE, "--lock-token", TOKEN])
        self.assert_no_mutation()

    def test_slug_and_date_injection_rejected(self):
        for slug, date in (("../../other", DATE), (SLUG, "2026-10-19 --force"), ("--all", DATE), (SLUG, "2026-02-30")):
            with self.subTest(slug=slug, date=date), self.assertRaises(helper.SafeError):
                helper.manifest(slug, date)


class LowLevelTests(unittest.TestCase):
    def test_fixed_git_executable_and_repository(self):
        result = subprocess.CompletedProcess([], 0, b"ok", b"")
        with mock.patch.object(subprocess, "run", return_value=result) as run:
            self.assertEqual(helper.git(["status", "--porcelain"]), b"ok")
        self.assertEqual(run.call_args.args[0][:3], ["/usr/bin/git", "-C", str(helper.ROOT)])
        self.assertEqual(run.call_args.kwargs["timeout"], 30)

    def test_git_environment_cannot_redirect_or_inject_configuration(self):
        result = subprocess.CompletedProcess([], 0, b"ok", b"")
        with mock.patch.dict(os.environ, {"GIT_DIR": "/other", "GIT_INDEX_FILE": "/other/index", "GIT_CONFIG_COUNT": "1", "GIT_SSL_NO_VERIFY": "true"}), mock.patch.object(subprocess, "run", return_value=result) as run:
            helper.git(["status"])
        environment = run.call_args.kwargs["env"]
        for key in ("GIT_DIR", "GIT_INDEX_FILE", "GIT_CONFIG_COUNT", "GIT_SSL_NO_VERIFY"):
            self.assertNotIn(key, environment)
        self.assertEqual(environment["GIT_TERMINAL_PROMPT"], "0")
        self.assertEqual(environment["GIT_OPTIONAL_LOCKS"], "0")

    def test_failure_does_not_expose_command_response(self):
        result = subprocess.CompletedProcess([], 1, b"a credential", b"private response")
        with mock.patch.object(subprocess, "run", return_value=result), self.assertRaises(helper.SafeError) as error:
            helper.git(["status"])
        self.assertNotIn("credential", str(error.exception))
        self.assertNotIn("private response", str(error.exception))

    def test_timeout_is_safe(self):
        with mock.patch.object(subprocess, "run", side_effect=subprocess.TimeoutExpired("private", 30)), self.assertRaises(helper.SafeError):
            helper.git(["status"])

    def test_repository_guard_rejects_wrong_remote(self):
        values = iter([str(helper.ROOT) + "\n", "master\n", "https://github.com/other/repository.git\n"])
        with mock.patch.object(helper, "git_text", side_effect=lambda *args: next(values)), self.assertRaises(helper.SafeError):
            helper.verify_repository()

    def test_repository_guard_rejects_extra_push_url(self):
        values = iter([str(helper.ROOT) + "\n", "master\n", helper.ORIGIN + "\n", helper.ORIGIN + "\nhttps://github.com/other/repo.git\n"])
        with mock.patch.object(helper, "git_text", side_effect=lambda *args: next(values)), self.assertRaises(helper.SafeError):
            helper.verify_repository()

    def test_repository_guard_rejects_other_branch(self):
        values = iter([str(helper.ROOT) + "\n", "a-user-branch\n"])
        with mock.patch.object(helper, "git_text", side_effect=lambda *args: next(values)), self.assertRaises(helper.SafeError):
            helper.verify_repository()


if __name__ == "__main__":
    unittest.main()
