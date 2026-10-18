#!/usr/bin/env python3
"""Offline regression tests: no real Keychain access or network traffic."""

import contextlib
import importlib.util
import io
import json
import pathlib
import stat
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from unittest.mock import Mock, patch


sys.dont_write_bytecode = True
SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "blog-bluesky.py"
SPEC = importlib.util.spec_from_file_location("blog_bluesky", SCRIPT)
BLOG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BLOG)


class PublicationRunLockTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.path = pathlib.Path(self.temporary.name) / ".publication-run.lock"
        self.keychain_guard = patch.object(BLOG.subprocess, "run", side_effect=AssertionError("Unexpected subprocess"))
        self.network_guard = patch.object(BLOG.urllib.request, "build_opener", side_effect=AssertionError("Unexpected network"))
        self.keychain_guard.start()
        self.network_guard.start()
        self.addCleanup(self.keychain_guard.stop)
        self.addCleanup(self.network_guard.stop)

    def test_acquire_records_private_directory_and_public_owner_token(self):
        token = BLOG.acquire_run_lock(self.path)
        self.assertRegex(token, r"\A[0-9a-f]{64}\Z")
        self.assertEqual(stat.S_IMODE(self.path.stat().st_mode), 0o700)
        owner_path = self.path / "owner.json"
        self.assertEqual(stat.S_IMODE(owner_path.stat().st_mode), 0o600)
        owner = json.loads(owner_path.read_text())
        self.assertEqual(owner["token"], token)
        self.assertRegex(owner["started_at"], r"\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\Z")

    def test_existing_lock_is_never_reclaimed_even_without_owner(self):
        self.path.mkdir()
        with self.assertRaises(BLOG.SafeError):
            BLOG.acquire_run_lock(self.path)
        self.assertEqual(list(self.path.iterdir()), [])

    def test_existing_owned_lock_is_unchanged(self):
        BLOG.acquire_run_lock(self.path)
        original = (self.path / "owner.json").read_bytes()
        with self.assertRaises(BLOG.SafeError):
            BLOG.acquire_run_lock(self.path)
        self.assertEqual((self.path / "owner.json").read_bytes(), original)

    def test_release_requires_exact_token(self):
        token = BLOG.acquire_run_lock(self.path)
        with self.assertRaises(BLOG.SafeError):
            BLOG.release_run_lock("0" * 64 if token != "0" * 64 else "1" * 64, self.path)
        self.assertEqual(json.loads((self.path / "owner.json").read_text())["token"], token)
        BLOG.release_run_lock(token, self.path)
        self.assertFalse(self.path.exists())

    def test_unexpected_file_blocks_release_without_touching_anything(self):
        token = BLOG.acquire_run_lock(self.path)
        unexpected = self.path / "other-run.txt"
        unexpected.write_text("preserve this")
        owner = (self.path / "owner.json").read_bytes()
        with self.assertRaises(BLOG.SafeError):
            BLOG.release_run_lock(token, self.path)
        self.assertEqual(unexpected.read_text(), "preserve this")
        self.assertEqual((self.path / "owner.json").read_bytes(), owner)

    def test_symlink_lock_is_not_followed(self):
        target = self.path.parent / "other-directory"
        target.mkdir()
        owner = target / "owner.json"
        owner.write_text(json.dumps({"token": "a" * 64}))
        self.path.symlink_to(target, target_is_directory=True)
        with self.assertRaises(BLOG.SafeError):
            BLOG.release_run_lock("a" * 64, self.path)
        self.assertTrue(self.path.is_symlink())
        self.assertTrue(owner.exists())

    def test_symlink_owner_is_not_followed(self):
        self.path.mkdir()
        target = self.path.parent / "other-owner.json"
        target.write_text(json.dumps({"token": "a" * 64}))
        (self.path / "owner.json").symlink_to(target)
        with self.assertRaises(BLOG.SafeError):
            BLOG.release_run_lock("a" * 64, self.path)
        self.assertTrue((self.path / "owner.json").is_symlink())
        self.assertTrue(target.exists())

    def test_malformed_owner_is_preserved(self):
        self.path.mkdir()
        owner = self.path / "owner.json"
        owner.write_text("not valid JSON")
        with self.assertRaises(BLOG.SafeError):
            BLOG.release_run_lock("a" * 64, self.path)
        self.assertEqual(owner.read_text(), "not valid JSON")

    def test_cli_uses_only_default_lock_path_without_auth(self):
        output = io.StringIO()
        with patch.object(BLOG, "acquire_run_lock", return_value="a" * 64) as acquire, patch.object(BLOG, "release_run_lock") as release, contextlib.redirect_stdout(output):
            self.assertEqual(BLOG.main(["lock"]), 0)
            self.assertEqual(BLOG.main(["unlock", "--token", "a" * 64]), 0)
        acquire.assert_called_once_with()
        release.assert_called_once_with("a" * 64)
        self.assertIn("a" * 64, output.getvalue())


class BlueskyCheckTests(unittest.TestCase):
    def setUp(self):
        self.password = "test-app-password-never-log"
        self.token = "test-token-never-log"
        self.identity = {
            "handle": BLOG.ACCOUNT,
            "did": "did:plc:publictestidentity",
            "accessJwt": self.token,
            "refreshJwt": "refresh-token-never-log",
        }

    def test_exact_keychain_service_and_no_password_in_arguments(self):
        with patch.object(BLOG.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, (self.password + "\n").encode(), b"")) as run:
            self.assertEqual(BLOG.read_password(), self.password)
        arguments = run.call_args.args[0]
        self.assertEqual(arguments, ["/usr/bin/security", "find-generic-password", "-s", BLOG.KEYCHAIN_ITEM, "-a", BLOG.ACCOUNT, "-w"])
        self.assertNotIn(self.password, arguments)
        self.assertTrue(run.call_args.kwargs["capture_output"])

    def test_label_fallback_only_after_exact_service_missing(self):
        results = [subprocess.CompletedProcess([], 44, b"", b"missing"), subprocess.CompletedProcess([], 0, self.password.encode(), b"")]
        with patch.object(BLOG.subprocess, "run", side_effect=results) as run:
            self.assertEqual(BLOG.read_password(), self.password)
        self.assertEqual(run.call_args_list[1].args[0], ["/usr/bin/security", "find-generic-password", "-l", BLOG.KEYCHAIN_ITEM, "-a", BLOG.ACCOUNT, "-w"])

    def test_keychain_permission_failure_does_not_fallback(self):
        with patch.object(BLOG.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, b"", self.password.encode())) as run:
            with self.assertRaises(BLOG.SafeError) as error:
                BLOG.read_password()
        self.assertEqual(run.call_count, 1)
        self.assertNotIn(self.password, str(error.exception))

    def test_keychain_timeout_is_safe(self):
        with patch.object(BLOG.subprocess, "run", side_effect=subprocess.TimeoutExpired([self.password], 30)):
            with self.assertRaises(BLOG.SafeError) as error:
                BLOG.read_password()
        self.assertNotIn(self.password, str(error.exception))

    def test_check_only_authenticates_and_prints_public_identity(self):
        output, errors = io.StringIO(), io.StringIO()
        with patch.object(BLOG, "read_password", return_value=self.password), patch.object(BLOG, "request_json", return_value=self.identity) as request, contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            self.assertEqual(BLOG.main(["check"]), 0)
        request.assert_called_once_with("POST", "com.atproto.server.createSession", {"identifier": BLOG.ACCOUNT, "password": self.password})
        self.assertIn(BLOG.ACCOUNT, output.getvalue())
        self.assertIn(self.identity["did"], output.getvalue())
        self.assertIn("No post was created", output.getvalue())
        self.assertNotIn(self.password, output.getvalue() + errors.getvalue())
        self.assertNotIn(self.token, output.getvalue() + errors.getvalue())

    def test_wrong_account_rejected_without_leaking_response(self):
        self.identity["handle"] = "someone-else.bsky.social"
        with patch.object(BLOG, "read_password", return_value=self.password), patch.object(BLOG, "request_json", return_value=self.identity):
            with self.assertRaises(BLOG.SafeError):
                BLOG.authenticate()

    def test_fixed_https_endpoint_no_redirects_and_timeout(self):
        response = Mock()
        response.read.return_value = json.dumps(self.identity).encode()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        opener = Mock()
        opener.open.return_value = response
        with patch.object(BLOG.urllib.request, "build_opener", return_value=opener) as build:
            BLOG.request_json("POST", "com.atproto.server.createSession", {"password": self.password})
        self.assertIsInstance(build.call_args.args[0], BLOG.NoRedirect)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, "https://bsky.social/xrpc/com.atproto.server.createSession")
        self.assertEqual(opener.open.call_args.kwargs["timeout"], BLOG.NETWORK_TIMEOUT)

    def test_refuses_redirect(self):
        with self.assertRaises(BLOG.SafeError):
            BLOG.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://example.org")

    def test_server_errors_never_print_details(self):
        output, errors = io.StringIO(), io.StringIO()
        opener = Mock()
        opener.open.side_effect = urllib.error.URLError(self.password + self.token)
        with patch.object(BLOG, "read_password", return_value=self.password), patch.object(BLOG.urllib.request, "build_opener", return_value=opener), contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            self.assertEqual(BLOG.main(["check"]), 1)
        self.assertNotIn(self.password, output.getvalue() + errors.getvalue())
        self.assertNotIn(self.token, output.getvalue() + errors.getvalue())


class BlueskyAnnouncementTests(unittest.TestCase):
    def setUp(self):
        # An unmocked credential or network operation must fail this offline test.
        self.keychain_guard = patch.object(BLOG.subprocess, "run", side_effect=AssertionError("Unexpected subprocess"))
        self.network_guard = patch.object(BLOG.urllib.request, "build_opener", side_effect=AssertionError("Unexpected network"))
        self.keychain_guard.start()
        self.network_guard.start()
        self.addCleanup(self.keychain_guard.stop)
        self.addCleanup(self.network_guard.stop)
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.path = pathlib.Path(self.temporary.name)
        self.log_path = self.path / "publication-log.json"
        self.queue_path = self.path / "announcement-queue.md"
        self.slug, self.date = "test-convexity", "2026-10-19"
        self.url = BLOG.canonical_url(self.slug, self.date)
        self.preview = "https://www.gpeyre.com/blog/preparations/test-convexity.html"
        self.message = "Peyré’s convexity example. " + self.url
        self.entry = {
            "slug": self.slug, "title": "Convexity & transport", "date": self.date, "url": self.url,
            "message": self.message, "status": "published", "source_sha256": "a" * 64,
            "publication_commit": "b" * 40, "bluesky_uri": None, "bluesky_cid": None,
        }
        self.log = {"version": 1, "timezone": "Europe/Paris", "publications": [self.entry]}
        self.write_log()
        self.queue_path.write_text("# Queue\n\n## 1. Convexity & transport\n\n- [x] Ready to publish\n\n> " + self.message.replace(self.url, self.preview) + "\n", encoding="utf-8")
        self.session = {"handle": BLOG.ACCOUNT, "did": "did:plc:publictestidentity", "token": "secret-session-never-log"}
        self.rkey = BLOG.deterministic_rkey(self.slug, self.date)
        self.record = BLOG.post_record(self.entry)
        self.stored = {"uri": "at://{}/app.bsky.feed.post/{}".format(self.session["did"], self.rkey), "cid": "bafyreivalidtestcid", "value": self.record}

    def write_log(self):
        self.log_path.write_text(json.dumps(self.log, ensure_ascii=False), encoding="utf-8")

    def run_announcement(self, gets):
        with patch.object(BLOG, "verify_live_page") as verify, patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=gets), patch.object(BLOG, "request_json", return_value={"uri": self.stored["uri"], "cid": self.stored["cid"]}) as request:
            result = BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        verify.assert_called_once()
        return result, request

    def test_approval_is_explicit_and_must_precede_authentication(self):
        self.queue_path.write_text(self.queue_path.read_text().replace("[x]", "[ ]"))
        with patch.object(BLOG, "authenticate") as authenticate:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        authenticate.assert_not_called()

    def test_prepared_not_yet_published_record_is_rejected(self):
        self.entry["status"] = "prepared"
        self.write_log()
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)

    def test_canonical_message_and_queue_must_agree(self):
        self.entry["message"] = "Unapproved message " + self.url
        self.write_log()
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)

    def test_280_codepoint_limit_is_conservative(self):
        self.entry["message"] = "X" * 281 + " " + self.url
        self.write_log()
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)

    def test_only_one_post_per_date(self):
        self.log["publications"].append(dict(self.entry, slug="another-post"))
        self.write_log()
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)

    def test_slug_and_date_validation(self):
        for slug, date in (("../unsafe", self.date), (self.slug, "2026-02-30"), (self.slug, "2026-1-1")):
            with self.assertRaises(BLOG.SafeError):
                BLOG.canonical_url(slug, date)

    def test_utf8_link_facet_offsets(self):
        facet = self.record["facets"][0]
        encoded = self.message.encode("utf-8")
        self.assertEqual(encoded[facet["index"]["byteStart"]:facet["index"]["byteEnd"]].decode(), self.url)
        self.assertGreater(facet["index"]["byteStart"], len(self.message[:-len(self.url)]))

    def test_rkey_is_stable_and_changes_with_slug_and_date(self):
        self.assertEqual(self.rkey, BLOG.deterministic_rkey(self.slug, self.date))
        self.assertNotEqual(self.rkey, BLOG.deterministic_rkey("another", self.date))
        self.assertNotEqual(self.rkey, BLOG.deterministic_rkey(self.slug, "2026-10-20"))

    def test_create_is_put_record_with_null_swap_then_confirmed(self):
        result, request = self.run_announcement([None, self.stored])
        self.assertTrue(result.startswith("https://bsky.app/profile/" + BLOG.ACCOUNT))
        self.assertEqual(request.call_count, 1)
        self.assertEqual(request.call_args.args[:2], ("POST", "com.atproto.repo.putRecord"))
        payload = request.call_args.args[2]
        self.assertIn("swapRecord", payload)
        self.assertIsNone(payload["swapRecord"])
        self.assertEqual(payload["rkey"], self.rkey)
        self.assertEqual(payload["record"]["text"], self.message)
        saved = json.loads(self.log_path.read_text())["publications"][0]
        self.assertEqual(saved["status"], "announced")
        self.assertEqual(saved["bluesky_uri"], self.stored["uri"])
        self.assertEqual(saved["bluesky_cid"], self.stored["cid"])
        self.assertNotIn(self.session["token"], self.log_path.read_text())

    def test_existing_matching_record_deduplicates_without_put(self):
        _, request = self.run_announcement([self.stored])
        request.assert_not_called()

    def test_existing_mismatched_record_never_overwritten(self):
        self.stored["value"] = dict(self.record, text="Another post")
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", return_value=self.stored), patch.object(BLOG, "request_json") as request:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()

    def test_lost_create_response_is_reconciled_without_second_put(self):
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=[None, self.stored]), patch.object(BLOG, "request_json", side_effect=BLOG.SafeError("network failure")) as request:
            BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        self.assertEqual(request.call_count, 1)
        self.assertEqual(json.loads(self.log_path.read_text())["publications"][0]["status"], "announced")

    def test_announced_but_missing_record_is_not_recreated(self):
        self.entry.update(status="announced", bluesky_uri=self.stored["uri"], bluesky_cid=self.stored["cid"])
        self.write_log()
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", return_value=None), patch.object(BLOG, "request_json") as request:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()

    def test_record_not_found_400_is_absence_but_other_errors_stop(self):
        with patch.object(BLOG, "request_json", side_effect=BLOG.RemoteHTTPError(400, "RecordNotFound")):
            self.assertIsNone(BLOG.get_record(self.session["did"], self.rkey, self.session["token"]))
        with patch.object(BLOG, "request_json", side_effect=BLOG.RemoteHTTPError(401)):
            with self.assertRaises(BLOG.SafeError):
                BLOG.get_record(self.session["did"], self.rkey, self.session["token"])

    def test_live_page_must_match_date_title_and_canonical(self):
        document = '<html><head><link rel="canonical" href="{}"></head><body><h1>Convexity &amp; transport</h1><p class="blog-eyebrow"><time datetime="{}">19 October 2026</time></p></body></html>'.format(self.url, self.date)
        response = Mock(status=200)
        response.geturl.return_value = self.url
        response.headers = {"Content-Type": "text/html; charset=utf-8"}
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        opener = Mock()
        opener.open.return_value = response
        variants = [document, document.replace(self.date, "2026-10-20"), document.replace("Convexity &amp; transport", "404 Not Found"), document.replace('href="' + self.url, 'href="https://www.gpeyre.com/blog/preparations/test.html')]
        for index, html in enumerate(variants):
            response.read.return_value = html.encode()
            with patch.object(BLOG.urllib.request, "build_opener", return_value=opener):
                if index == 0:
                    BLOG.verify_live_page(self.entry)
                else:
                    with self.assertRaises(BLOG.SafeError):
                        BLOG.verify_live_page(self.entry)

    def test_live_redirect_target_or_non_html_is_not_enough(self):
        response = Mock(status=200)
        response.geturl.return_value = "https://www.gpeyre.com/404.html"
        response.headers = {"Content-Type": "text/html"}
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        opener = Mock()
        opener.open.return_value = response
        with patch.object(BLOG.urllib.request, "build_opener", return_value=opener):
            with self.assertRaises(BLOG.SafeError):
                BLOG.verify_live_page(self.entry)

    def test_concurrent_publication_log_edit_is_preserved(self):
        self.log_path.write_text('{"changed": true}')
        with self.assertRaises(BLOG.SafeError):
            BLOG.save_announcement(self.log, self.entry, self.stored["uri"], self.stored["cid"], self.log_path)
        self.assertEqual(json.loads(self.log_path.read_text()), {"changed": True})


if __name__ == "__main__":
    unittest.main()
