#!/usr/bin/env python3
"""Offline regression tests: no real Keychain access or network traffic."""

import contextlib
import base64
import datetime
import hashlib
import importlib.util
import io
import json
import pathlib
import stat
import struct
import subprocess
import sys
import tempfile
import unittest
import urllib.error
import zlib
from unittest.mock import Mock, patch


sys.dont_write_bytecode = True
SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "blog-bluesky.py"
SPEC = importlib.util.spec_from_file_location("blog_bluesky", SCRIPT)
BLOG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BLOG)


def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)


def png_image(width=3, height=2, metadata=False):
    data = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    if metadata:
        data += png_chunk(b"tEXt", b"Private\x00Do not upload")
    return data + png_chunk(b"IDAT", zlib.compress((b"\0" + b"\x22\x44\x66" * width) * height)) + png_chunk(b"IEND", b"")


class SummaryImageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = pathlib.Path(self.temporary.name)
        self.folder = self.root / "blog" / "imgs" / "summaries"
        self.folder.mkdir(parents=True)
        self.manifest = self.root / "blog" / "summary-images.json"
        self.patches = (patch.object(BLOG, "ROOT", self.root), patch.object(BLOG, "SUMMARY_IMAGES", self.manifest),
                        patch.object(BLOG.subprocess, "run", side_effect=AssertionError("Unexpected subprocess")),
                        patch.object(BLOG.urllib.request, "build_opener", side_effect=AssertionError("Unexpected network")))
        for mocked in self.patches:
            mocked.start()
            self.addCleanup(mocked.stop)
        self.entry = {"slug": "test-image", "status": "published"}
        self.specification = {"path": "/blog/imgs/summaries/test-image.png", "alt": "Blue and orange Gaussian ellipses.",
                              "width": 3, "height": 2, "source": "/blog/preparations/test-image.html#experiment"}
        self.file = self.folder / "test-image.png"
        self.file.write_bytes(png_image())
        self.write_manifest()

    def write_manifest(self):
        self.manifest.write_text(json.dumps({"version": 1, "images": {"test-image": self.specification}}))

    def test_valid_png_creates_deterministic_raw_cid_embed_without_network(self):
        image = BLOG.load_summary_image(self.entry)
        self.assertEqual(image["metadata"]["sha256"], hashlib.sha256(self.file.read_bytes()).hexdigest())
        blob = image["embed"]["images"][0]["image"]
        self.assertRegex(blob["ref"]["$link"], r"\Abafkrei[a-z2-7]{52}\Z")
        encoded = blob["ref"]["$link"][1:]
        decoded = base64.b32decode(encoded.upper() + "=" * ((-len(encoded)) % 8))
        self.assertEqual(decoded[:4], bytes([1, 0x55, 0x12, 32]))
        self.assertEqual(decoded[4:], hashlib.sha256(self.file.read_bytes()).digest())
        self.assertEqual(blob["mimeType"], "image/png")
        self.assertEqual(blob["size"], self.file.stat().st_size)
        self.assertEqual(image["embed"]["images"][0]["aspectRatio"], {"width": 3, "height": 2})
        self.assertEqual(BLOG.load_summary_image(self.entry), image)

    def test_no_manifest_or_no_matching_image_keeps_new_posts_text_only(self):
        self.manifest.unlink()
        self.assertIsNone(BLOG.load_summary_image(self.entry))
        self.manifest.write_text('{"version":1,"images":{}}')
        self.assertIsNone(BLOG.load_summary_image(self.entry))

    def test_completed_legacy_text_only_post_does_not_read_new_manifest(self):
        self.entry["status"] = "announced"
        with patch.object(BLOG, "read_summary_file", side_effect=AssertionError("Legacy post must remain unchanged")):
            self.assertIsNone(BLOG.load_summary_image(self.entry))

    def test_completed_image_metadata_must_stay_exact(self):
        self.entry["announcement_image"] = BLOG.load_summary_image(self.entry)["metadata"]
        self.entry["status"] = "announced"
        self.assertIsNotNone(BLOG.load_summary_image(self.entry))
        self.specification["alt"] = "Changed alternative text."
        self.write_manifest()
        with self.assertRaisesRegex(BLOG.SafeError, "has changed"):
            BLOG.load_summary_image(self.entry)

    def test_completed_image_cannot_silently_disappear(self):
        self.entry["announcement_image"] = BLOG.load_summary_image(self.entry)["metadata"]
        self.entry["status"] = "announced"
        self.manifest.unlink()
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_summary_image(self.entry)
        self.manifest.write_text('{"version":1,"images":{}}')
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_summary_image(self.entry)

    def test_manifest_requires_supported_structure(self):
        for text in ("not JSON", "null", '{"version":2,"images":{}}', '{"version":1,"images":[]}',
                     '{"version":1,"images":{"test-image":[]}}'):
            with self.subTest(text=text):
                self.manifest.write_text(text)
                with self.assertRaises(BLOG.SafeError):
                    BLOG.load_summary_image(self.entry)

    def test_path_is_exact_slug_under_fixed_subtree_not_arbitrary_file(self):
        for path in ("/blog/imgs/summaries/../private.png", "/etc/passwd", "/blog/imgs/summaries/other.png",
                     "/blog/imgs/summaries/test-image.svg", "https://example.org/test-image.png", "blog/imgs/summaries/test-image.png"):
            with self.subTest(path=path):
                self.specification["path"] = path
                self.write_manifest()
                with self.assertRaises(BLOG.SafeError):
                    BLOG.load_summary_image(self.entry)

    def test_symlink_manifest_image_and_parent_are_refused(self):
        self.manifest.unlink()
        target = self.root / "manifest.json"
        target.write_text('{"version":1,"images":{}}')
        self.manifest.symlink_to(target)
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_summary_image(self.entry)
        self.manifest.unlink()
        self.write_manifest()
        self.file.unlink()
        target = self.root / "capture.png"
        target.write_bytes(png_image())
        self.file.symlink_to(target)
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_summary_image(self.entry)
        self.file.unlink()
        self.folder.rmdir()
        self.folder.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_summary_image(self.entry)

    def test_nonregular_and_oversized_files_are_refused(self):
        self.file.unlink()
        self.file.mkdir()
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_summary_image(self.entry)
        self.file.rmdir()
        self.file.write_bytes(b"x" * (BLOG.MAX_IMAGE_BYTES + 1))
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_summary_image(self.entry)

    def test_empty_or_control_alt_and_bad_dimensions_are_refused(self):
        for field, value in (("alt", ""), ("alt", " "), ("alt", "Secret\ntext"), ("alt", "x" * 1001),
                             ("width", True), ("width", 0), ("width", 4097), ("width", 4), ("height", "2")):
            with self.subTest(field=field, value=value):
                previous = self.specification[field]
                self.specification[field] = value
                self.write_manifest()
                with self.assertRaises(BLOG.SafeError):
                    BLOG.load_summary_image(self.entry)
                self.specification[field] = previous

    def test_png_crc_truncation_signature_and_private_metadata_are_refused(self):
        valid = png_image()
        for data in (b"not an image", valid[:-1], valid[:33] + b"bad" + valid[36:], png_image(metadata=True)):
            with self.subTest(data=data[:24]):
                self.file.write_bytes(data)
                with self.assertRaises(BLOG.SafeError):
                    BLOG.load_summary_image(self.entry)

    def test_jpeg_dimensions_and_private_metadata(self):
        frame = b"\xff\xc0\x00\x11\x08\x00\x02\x00\x03\x03\x01\x11\x00\x02\x11\x00\x03\x11\x00"
        scan = b"\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\x11\xff\xd9"
        valid = b"\xff\xd8" + frame + scan
        self.assertEqual(BLOG.image_dimensions(valid, "image/jpeg"), (3, 2))
        for bad in (valid[:-1], b"\xff\xd8\xff\xe1\x00\x08Exif\x00\x00" + frame + scan, b"\xff\xd8" + scan):
            with self.assertRaises(BLOG.SafeError):
                BLOG.image_dimensions(bad, "image/jpeg")

    def test_official_upload_response_must_match_content_addressed_blob(self):
        image = BLOG.load_summary_image(self.entry)
        blob = image["embed"]["images"][0]["image"]
        with patch.object(BLOG, "request_json", return_value={"blob": blob}) as request:
            BLOG.upload_summary_image(image, "secret-session")
        request.assert_called_once_with("POST", "com.atproto.repo.uploadBlob", token="secret-session",
                                        image_bytes=image["data"], image_type="image/png")
        with patch.object(BLOG, "request_json", return_value={"blob": dict(blob, size=1)}):
            with self.assertRaises(BLOG.SafeError):
                BLOG.upload_summary_image(image, "secret-session")


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

    def test_blob_request_sends_binary_not_json_to_only_the_fixed_official_endpoint(self):
        response = Mock()
        response.read.return_value = b'{"blob":{}}'
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        opener = Mock()
        opener.open.return_value = response
        data = png_image()
        with patch.object(BLOG.urllib.request, "build_opener", return_value=opener):
            BLOG.request_json("POST", "com.atproto.repo.uploadBlob", token=self.token, image_bytes=data, image_type="image/png")
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, "https://bsky.social/xrpc/com.atproto.repo.uploadBlob")
        self.assertEqual(request.data, data)
        self.assertEqual(request.get_header("Content-type"), "image/png")
        self.assertEqual(request.get_header("Authorization"), "Bearer " + self.token)
        for method, endpoint, payload, binary, mime in (
                ("GET", "com.atproto.repo.uploadBlob", None, data, "image/png"),
                ("POST", "com.atproto.repo.putRecord", None, data, "image/png"),
                ("POST", "com.atproto.repo.uploadBlob", {}, data, "image/png"),
                ("POST", "com.atproto.repo.uploadBlob", None, data, "image/svg+xml"),
                ("POST", "com.atproto.repo.uploadBlob", None, b"", "image/png"),
                ("POST", "com.atproto.repo.uploadBlob", None, b"x" * (BLOG.MAX_IMAGE_BYTES + 1), "image/png")):
            with self.subTest(method=method, endpoint=endpoint, mime=mime), self.assertRaises(BLOG.SafeError):
                BLOG.request_json(method, endpoint, payload, image_bytes=binary, image_type=mime)

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
        self.root_patch = patch.object(BLOG, "ROOT", self.path)
        self.manifest_patch = patch.object(BLOG, "SUMMARY_IMAGES", self.path / "blog" / "summary-images.json")
        self.root_patch.start()
        self.manifest_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.addCleanup(self.manifest_patch.stop)
        (self.path / "blog").mkdir()
        self.log_path = self.path / "publication-log.json"
        self.queue_path = self.path / "announcement-queue.md"
        self.archive_path = self.path / "published.md"
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
        self.legacy_rkey = BLOG.legacy_rkey(self.slug, self.date)
        self.record = BLOG.post_record(self.entry)
        self.stored = {"uri": "at://{}/app.bsky.feed.post/{}".format(self.session["did"], self.rkey), "cid": "bafyreivalidtestcid", "value": self.record}
        self.legacy_stored = dict(self.stored, uri="at://{}/app.bsky.feed.post/{}".format(self.session["did"], self.legacy_rkey))

    def write_log(self):
        self.log_path.write_text(json.dumps(self.log, ensure_ascii=False), encoding="utf-8")

    def mark_announced(self):
        self.entry.update(status="announced", bluesky_uri=self.stored["uri"], bluesky_cid=self.stored["cid"])
        self.write_log()

    def move_to_archive(self):
        block = self.queue_path.read_text(encoding="utf-8")
        block = block.replace("\n> ", "\nPublished: " + self.date + " · [Read post](" + self.url + ")\n\n> ")
        self.archive_path.write_text(block, encoding="utf-8")
        self.queue_path.write_text("# Queue\n", encoding="utf-8")

    def run_announcement(self, gets):
        with patch.object(BLOG, "verify_live_page") as verify, patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=gets) as get, patch.object(BLOG, "request_json", return_value={"uri": self.stored["uri"], "cid": self.stored["cid"]}) as request:
            result = BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        verify.assert_called_once()
        self.assertEqual([call.args[1] for call in get.call_args_list[:2]], [self.legacy_rkey, self.rkey])
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

    def test_completed_archived_approval_is_loaded_and_deduplicated_without_put(self):
        self.mark_announced()
        self.move_to_archive()
        _, loaded = BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)
        self.assertEqual(loaded, self.entry)
        result, request = self.run_announcement([None, self.stored])
        request.assert_not_called()
        self.assertTrue(result.endswith("/" + self.rkey))

    def test_completed_archived_legacy_approval_stays_deduplicated(self):
        self.entry.update(status="announced", bluesky_uri=self.legacy_stored["uri"], bluesky_cid=self.legacy_stored["cid"])
        self.write_log()
        self.move_to_archive()
        result, request = self.run_announcement([self.legacy_stored, None])
        request.assert_not_called()
        self.assertTrue(result.endswith("/" + self.legacy_rkey))

    def test_archive_cannot_authorize_a_pending_first_announcement(self):
        self.move_to_archive()
        with patch.object(BLOG, "authenticate") as authenticate:
            for status in ("prepared", "published"):
                with self.subTest(status=status):
                    self.entry["status"] = status
                    self.write_log()
                    with self.assertRaises(BLOG.SafeError):
                        BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        authenticate.assert_not_called()

    def test_archive_without_journal_entry_cannot_authorize_anything(self):
        self.move_to_archive()
        self.log["publications"] = []
        self.write_log()
        with patch.object(BLOG, "authenticate") as authenticate:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        authenticate.assert_not_called()

    def test_unchecked_archived_approval_is_rejected_before_authentication(self):
        self.mark_announced()
        self.move_to_archive()
        self.archive_path.write_text(self.archive_path.read_text().replace("[x]", "[ ]"))
        with patch.object(BLOG, "authenticate") as authenticate:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        authenticate.assert_not_called()

    def test_duplicate_or_conflicting_active_and_archived_approvals_are_rejected(self):
        self.mark_announced()
        active = self.queue_path.read_text()
        self.move_to_archive()
        for content in (active, active.replace("Peyré’s", "Conflicting")):
            with self.subTest(conflicting=content != active):
                self.queue_path.write_text(content)
                with self.assertRaises(BLOG.SafeError):
                    BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)

    def test_duplicate_archived_blocks_are_rejected(self):
        self.mark_announced()
        self.move_to_archive()
        self.archive_path.write_text(self.archive_path.read_text() * 2)
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)

    def test_archive_marker_title_and_message_must_match_completed_journal(self):
        self.mark_announced()
        self.move_to_archive()
        original = self.archive_path.read_text()
        variants = (
            original.replace("Published: " + self.date, "Published: 2026-10-20"),
            original.replace("[Read post](" + self.url + ")", "[Read post](" + self.preview + ")"),
            original.replace("## 1. Convexity & transport", "## 1. Another title"),
            original.replace("Peyré’s convexity example.", "Another announcement."),
            original.replace("Published: ", "Publication date: "),
        )
        for variant in variants:
            with self.subTest(variant=variant):
                self.archive_path.write_text(variant)
                with self.assertRaises(BLOG.SafeError):
                    BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)

    def test_archived_completion_requires_record_identifiers(self):
        self.mark_announced()
        self.move_to_archive()
        for field in ("bluesky_uri", "bluesky_cid"):
            original = self.entry[field]
            self.entry[field] = ""
            self.write_log()
            with self.subTest(field=field), self.assertRaises(BLOG.SafeError):
                BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)
            self.entry[field] = original

    def test_archived_missing_record_is_never_recreated(self):
        self.mark_announced()
        self.move_to_archive()
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", return_value=None), patch.object(BLOG, "request_json") as request:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()

    def test_archive_cannot_adopt_a_different_record_cid(self):
        self.mark_announced()
        self.move_to_archive()
        changed = dict(self.stored, cid="bafyothercid")
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=[None, changed]), patch.object(BLOG, "request_json") as request:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()

    def test_pending_active_approval_is_not_blocked_by_unrelated_archive_entry(self):
        self.archive_path.write_text("## 1. Another article\n\n- [x] Ready to publish\n\n> Other. https://www.gpeyre.com/blog/preparations/other.html\n")
        _, request = self.run_announcement([None, None, self.stored])
        self.assertEqual(request.call_count, 1)

    def test_archive_override_is_available_for_offline_fixture_only(self):
        self.mark_announced()
        self.move_to_archive()
        override = self.path / "fixture-archive.md"
        self.archive_path.rename(override)
        _, loaded = BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path, override)
        self.assertEqual(loaded, self.entry)

    def test_archive_symlink_is_not_followed(self):
        target = self.path / "other.md"
        target.write_text("preserve this")
        self.archive_path.symlink_to(target)
        with self.assertRaises(BLOG.SafeError):
            BLOG.load_announcement(self.slug, self.date, self.log_path, self.queue_path)
        self.assertEqual(target.read_text(), "preserve this")

    def test_multiple_readiness_markers_and_multiple_quotes_are_rejected(self):
        original = self.queue_path.read_text()
        variants = (original.replace("- [x] Ready to publish", "- [x] Ready to publish\n- [ ] Ready to publish"), original + "> Extra announcement\n")
        for variant in variants:
            with self.subTest(variant=variant):
                self.queue_path.write_text(variant)
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

    def test_rkey_is_a_valid_tid_with_exact_midnight_timestamp_and_slug_clock(self):
        self.assertRegex(self.rkey, r"\A[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}\Z")
        alphabet = "234567abcdefghijklmnopqrstuvwxyz"
        value = 0
        for character in self.rkey:
            value = (value << 5) + alphabet.index(character)
        expected_microseconds = (datetime.date(2026, 10, 19) - datetime.date(1970, 1, 1)).days * 86_400_000_000
        self.assertEqual(value >> 10, expected_microseconds)
        self.assertEqual(value & 1023, int.from_bytes(hashlib.sha256(self.slug.encode()).digest(), "big") & 1023)
        self.assertLess(value, 1 << 63)

    def test_tid_rejects_out_of_range_dates(self):
        for date in ("1969-12-31", "2256-01-01", "9999-12-31"):
            with self.assertRaises(BLOG.SafeError):
                BLOG.deterministic_rkey(self.slug, date)

    def test_create_is_put_record_with_null_swap_then_confirmed(self):
        result, request = self.run_announcement([None, None, self.stored])
        self.assertTrue(result.startswith("https://bsky.app/profile/" + BLOG.ACCOUNT))
        self.assertEqual(request.call_count, 1)
        self.assertEqual(request.call_args.args[:2], ("POST", "com.atproto.repo.putRecord"))
        payload = request.call_args.args[2]
        self.assertIn("swapRecord", payload)
        self.assertIsNone(payload["swapRecord"])
        self.assertIs(payload["validate"], True)
        self.assertEqual(payload["rkey"], self.rkey)
        self.assertEqual(payload["record"]["text"], self.message)
        saved = json.loads(self.log_path.read_text())["publications"][0]
        self.assertEqual(saved["status"], "announced")
        self.assertEqual(saved["bluesky_uri"], self.stored["uri"])
        self.assertEqual(saved["bluesky_cid"], self.stored["cid"])
        self.assertNotIn(self.session["token"], self.log_path.read_text())

    def test_existing_matching_record_deduplicates_without_put(self):
        _, request = self.run_announcement([None, self.stored])
        request.assert_not_called()

    def configure_image(self):
        directory = self.path / "blog" / "imgs" / "summaries"
        directory.mkdir(parents=True, exist_ok=True)
        (directory / (self.slug + ".png")).write_bytes(png_image())
        specification = {"path": "/blog/imgs/summaries/" + self.slug + ".png", "alt": "Orange and blue transport experiment.",
                         "width": 3, "height": 2, "source": "/blog/preparations/" + self.slug + ".html"}
        (self.path / "blog" / "summary-images.json").write_text(json.dumps({"version": 1, "images": {self.slug: specification}}))
        image = BLOG.load_summary_image(self.entry)
        self.record = BLOG.post_record(self.entry, image)
        self.stored["value"] = self.record
        return image

    def test_new_image_post_uploads_once_after_absence_checks_and_saves_metadata(self):
        image = self.configure_image()
        blob = image["embed"]["images"][0]["image"]
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), \
                patch.object(BLOG, "get_record", side_effect=[None, None, self.stored]) as get, \
                patch.object(BLOG, "request_json", side_effect=[{"blob": blob}, {}]) as request:
            BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        self.assertEqual([call.args[1] for call in request.call_args_list], ["com.atproto.repo.uploadBlob", "com.atproto.repo.putRecord"])
        self.assertEqual(get.call_count, 3)
        posted = request.call_args_list[1].args[2]["record"]
        self.assertEqual(posted["text"], self.message)
        self.assertEqual(posted["facets"], self.record["facets"])
        self.assertEqual(posted["embed"], image["embed"])
        saved = json.loads(self.log_path.read_text())["publications"][0]
        self.assertEqual(saved["announcement_image"], image["metadata"])
        self.assertEqual(saved["status"], "announced")

    def test_existing_image_record_reconciles_without_upload_or_put(self):
        image = self.configure_image()
        _, request = self.run_announcement([None, self.stored])
        request.assert_not_called()
        saved = json.loads(self.log_path.read_text())["publications"][0]
        self.assertEqual(saved["announcement_image"], image["metadata"])

    def test_old_completed_text_only_record_stays_unchanged_after_thumbnail_added(self):
        self.mark_announced()
        self.configure_image()
        self.stored["value"] = BLOG.post_record(self.entry)
        _, request = self.run_announcement([None, self.stored])
        request.assert_not_called()
        self.assertNotIn("announcement_image", json.loads(self.log_path.read_text())["publications"][0])

    def test_existing_image_with_changed_alt_blob_or_aspect_ratio_never_reuploads(self):
        self.configure_image()
        original = json.loads(json.dumps(self.stored))
        for field in ("alt", "image", "aspectRatio"):
            self.stored = json.loads(json.dumps(original))
            self.stored["value"]["embed"]["images"][0][field] = "conflict"
            with self.subTest(field=field), patch.object(BLOG, "verify_live_page"), \
                    patch.object(BLOG, "authenticate", return_value=self.session), \
                    patch.object(BLOG, "get_record", side_effect=[None, self.stored]), \
                    patch.object(BLOG, "request_json") as request:
                with self.assertRaises(BLOG.SafeError):
                    BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
            request.assert_not_called()
        self.assertEqual(json.loads(self.log_path.read_text())["publications"][0]["status"], "published")

    def test_completed_image_is_deduplicated_with_frozen_metadata_and_no_write(self):
        image = self.configure_image()
        self.entry["announcement_image"] = image["metadata"]
        self.mark_announced()
        _, request = self.run_announcement([None, self.stored])
        request.assert_not_called()

    def test_manifest_change_after_unlogged_image_creation_stops_without_duplicate(self):
        self.configure_image()
        manifest_path = self.path / "blog" / "summary-images.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["images"][self.slug]["alt"] = "A newly edited caption."
        manifest_path.write_text(json.dumps(manifest))
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), \
                patch.object(BLOG, "get_record", side_effect=[None, self.stored]), \
                patch.object(BLOG, "request_json") as request:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()

    def test_image_lost_create_response_reconciles_with_one_upload_and_one_put(self):
        image = self.configure_image()
        blob = image["embed"]["images"][0]["image"]
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), \
                patch.object(BLOG, "get_record", side_effect=[None, None, self.stored]), \
                patch.object(BLOG, "request_json", side_effect=[{"blob": blob}, BLOG.SafeError("Lost response")]) as request:
            BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        self.assertEqual(request.call_count, 2)
        saved = json.loads(self.log_path.read_text())["publications"][0]
        self.assertEqual(saved["announcement_image"], image["metadata"])
        self.assertEqual(saved["status"], "announced")

    def test_bad_summary_image_stops_before_keychain_access(self):
        self.configure_image()
        (self.path / "blog" / "imgs" / "summaries" / (self.slug + ".png")).write_bytes(b"not image")
        with patch.object(BLOG, "authenticate") as authenticate:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        authenticate.assert_not_called()

    def test_upload_mismatch_or_failure_cannot_create_post_or_change_journal(self):
        self.configure_image()
        original = self.log_path.read_bytes()
        for response in ({"blob": {"unexpected": "blob"}}, BLOG.SafeError("Upload failed")):
            with self.subTest(response=response), patch.object(BLOG, "verify_live_page"), \
                    patch.object(BLOG, "authenticate", return_value=self.session), \
                    patch.object(BLOG, "get_record", return_value=None), \
                    patch.object(BLOG, "request_json", side_effect=[response]) as request:
                with self.assertRaises(BLOG.SafeError):
                    BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
            self.assertEqual(request.call_count, 1)
            self.assertEqual(self.log_path.read_bytes(), original)

    def test_existing_matching_legacy_record_is_reconciled_without_new_tid_put(self):
        result, request = self.run_announcement([self.legacy_stored, None])
        request.assert_not_called()
        self.assertTrue(result.endswith("/" + self.legacy_rkey))
        saved = json.loads(self.log_path.read_text())["publications"][0]
        self.assertEqual(saved["status"], "announced")
        self.assertEqual(saved["bluesky_uri"], self.legacy_stored["uri"])

    def test_completed_legacy_announcement_stays_deduplicated_after_migration(self):
        self.entry.update(status="announced", bluesky_uri=self.legacy_stored["uri"], bluesky_cid=self.legacy_stored["cid"])
        self.write_log()
        _, request = self.run_announcement([self.legacy_stored, None])
        request.assert_not_called()

    def test_legacy_and_tid_records_both_existing_stop_without_write(self):
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=[self.legacy_stored, self.stored]), patch.object(BLOG, "request_json") as request:
            with self.assertRaisesRegex(BLOG.SafeError, "Both legacy and TID"):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()
        self.assertEqual(json.loads(self.log_path.read_text())["publications"][0]["status"], "published")

    def test_existing_mismatched_record_never_overwritten(self):
        self.stored["value"] = dict(self.record, text="Another post")
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=[None, self.stored]), patch.object(BLOG, "request_json") as request:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()

    def test_existing_mismatched_legacy_record_never_migrated_or_overwritten(self):
        self.legacy_stored["value"] = dict(self.record, text="Another legacy post")
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=[self.legacy_stored, None]), patch.object(BLOG, "request_json") as request:
            with self.assertRaises(BLOG.SafeError):
                BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        request.assert_not_called()

    def test_lost_create_response_is_reconciled_without_second_put(self):
        with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", side_effect=[None, None, self.stored]), patch.object(BLOG, "request_json", side_effect=BLOG.SafeError("network failure")) as request:
            BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
        self.assertEqual(request.call_count, 1)
        self.assertEqual(json.loads(self.log_path.read_text())["publications"][0]["status"], "announced")

    def test_failed_create_reports_only_safe_http_machine_code(self):
        for code, expected in (("InvalidRequest", "InvalidRequest"), ("unsafe " + self.session["token"], "Unspecified")):
            with patch.object(BLOG, "verify_live_page"), patch.object(BLOG, "authenticate", return_value=self.session), patch.object(BLOG, "get_record", return_value=None), patch.object(BLOG, "request_json", side_effect=BLOG.RemoteHTTPError(400, code)) as request:
                with self.assertRaises(BLOG.SafeError) as error:
                    BLOG.announce(self.slug, self.date, self.log_path, self.queue_path)
            self.assertEqual(str(error.exception), "Bluesky did not create the announcement (HTTP 400, {}); retry safely.".format(expected))
            self.assertNotIn(self.session["token"], str(error.exception))
            self.assertEqual(request.call_count, 1)

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
