#!/usr/bin/env python3
"""Offline deployment checks: never read credentials or call the real network."""
import importlib.util
import json
import pathlib
import sys
import unittest
from unittest.mock import Mock, patch

sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("publisher_deployment", pathlib.Path(__file__).resolve().parents[1] / "scripts/blog-publication-git.py")
BLOG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BLOG)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.commit = "a" * 40
        self.run = {"id": 123, "head_sha": self.commit, "head_branch": "master", "name": "pages build and deployment", "status": "completed", "conclusion": "success"}
        self.job = {"run_id": 123, "head_sha": self.commit, "name": "deploy", "status": "completed", "conclusion": "success"}

    def lookup(self, runs=None, jobs=None):
        return [{"total_count": len(runs or []), "workflow_runs": runs or []}, {"total_count": len(jobs or []), "jobs": jobs or []}]

    def test_success_requires_exact_commit_run_and_deploy_job(self):
        with patch.object(BLOG, "github_json", side_effect=self.lookup([self.run], [self.job])) as get:
            self.assertEqual(BLOG.deployment(self.commit)["status"], "success")
        self.assertEqual(get.call_args_list[0].args[0], "actions/runs?head_sha=" + self.commit + "&per_page=100")
        self.assertEqual(get.call_args_list[1].args[0], "actions/runs/123/jobs?per_page=100")

    def test_no_matching_run_remains_pending(self):
        for run in ([], [dict(self.run, head_sha="b" * 40)], [dict(self.run, head_branch="other")], [dict(self.run, name="ordinary build")]):
            with patch.object(BLOG, "github_json", side_effect=self.lookup(run)) as get:
                self.assertEqual(BLOG.deployment(self.commit)["status"], "pending")
                self.assertEqual(get.call_count, 1)

    def test_newest_retry_wins_over_an_old_success(self):
        pending = dict(self.run, id=124, status="in_progress", conclusion=None)
        with patch.object(BLOG, "github_json", side_effect=self.lookup([self.run, pending])):
            self.assertEqual(BLOG.deployment(self.commit)["status"], "pending")

    def test_failed_run_is_not_a_deployment(self):
        with patch.object(BLOG, "github_json", side_effect=self.lookup([dict(self.run, conclusion="failure")])):
            self.assertEqual(BLOG.deployment(self.commit)["status"], "failed")

    def test_successful_build_without_matching_deploy_is_rejected(self):
        for job in ([], [dict(self.job, name="build")], [dict(self.job, head_sha="b" * 40)], [dict(self.job, run_id=456)]):
            with patch.object(BLOG, "github_json", side_effect=self.lookup([self.run], job)):
                with self.assertRaises(BLOG.SafeError):
                    BLOG.deployment(self.commit)

    def test_invalid_commit_does_not_call_network(self):
        with patch.object(BLOG, "github_json") as get:
            with self.assertRaises(BLOG.SafeError):
                BLOG.deployment("../unsafe")
            get.assert_not_called()

    def test_public_requests_are_fixed_https_get_without_auth(self):
        response = Mock()
        response.read.return_value = json.dumps({"total_count": 0, "workflow_runs": []}).encode()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        opener = Mock()
        opener.open.return_value = response
        with patch.object(BLOG.urllib.request, "build_opener", return_value=opener):
            BLOG.github_json("actions/runs?head_sha=" + self.commit + "&per_page=100")
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertTrue(request.full_url.startswith(BLOG.GITHUB_API))
        self.assertIsNone(request.get_header("Authorization"))
        self.assertIsNone(request.data)

    def test_other_endpoints_and_redirects_are_refused(self):
        with patch.object(BLOG.urllib.request, "build_opener") as build:
            for path in ("../other", "https://example.org", "actions/runs/123/cancel", "contents/secrets"):
                with self.assertRaises(BLOG.SafeError):
                    BLOG.github_json(path)
            build.assert_not_called()
        with self.assertRaises(BLOG.SafeError):
            BLOG.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://example.org")


if __name__ == "__main__":
    unittest.main()
