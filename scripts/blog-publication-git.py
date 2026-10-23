#!/usr/bin/env python3
"""Narrow Git permissions for the explicitly approved daily blog workflow.

No arbitrary Git options, repository paths, remote names, or refspecs are
accepted. Unrelated work is preserved; uncertainty is a reason to stop.
"""

import argparse
import datetime
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
import sys
import urllib.error
import urllib.request


ROOT = pathlib.Path("/Users/gpeyre/Dropbox/github/gpeyre.github.io")
ORIGIN = "https://github.com/gpeyre/gpeyre.github.io.git"
BRANCH = "master"
GIT = "/usr/bin/git"
TIMEOUT = 30
MAX_FILE_BYTES = 8_388_608
LOG_PATH = "blog/publication-log.json"
GITHUB_API = "https://api.github.com/repos/gpeyre/gpeyre.github.io/"


class SafeError(Exception):
    """Public error without command output, credentials, or private data."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SafeError("An unexpected deployment API redirect was refused.")


def github_json(path):
    """Read only this public repository's workflow status, without credentials."""
    if not re.fullmatch(r"actions/runs(?:\?head_sha=[0-9a-f]{40}&per_page=100|/[1-9][0-9]*/jobs\?per_page=100)", path):
        raise SafeError("The deployment API path is not permitted.")
    request = urllib.request.Request(GITHUB_API + path, method="GET", headers={
        "Accept": "application/vnd.github+json", "User-Agent": "gpeyre-blog-publisher/1",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=20) as response:
            raw = response.read(4_194_305)
            if len(raw) > 4_194_304:
                raise SafeError("The public deployment response is unexpectedly large.")
            result = json.loads(raw)
    except SafeError:
        raise
    except (urllib.error.URLError, OSError, ValueError, UnicodeError):
        raise SafeError("The public deployment check failed; no credentials or response details were logged.") from None
    if not isinstance(result, dict):
        raise SafeError("The public deployment response has an unsupported format.")
    return result


def deployment(commit):
    """Confirm the latest matching Pages run and its actual deploy job."""
    commit = sha(commit)
    payload = github_json("actions/runs?head_sha={}&per_page=100".format(commit))
    runs = payload.get("workflow_runs")
    if not isinstance(runs, list) or not isinstance(payload.get("total_count"), int) or payload["total_count"] > 100:
        raise SafeError("The matching deployment runs could not be checked completely.")
    matches = [run for run in runs if isinstance(run, dict) and run.get("head_sha") == commit
               and run.get("head_branch") == BRANCH and run.get("name") == "pages build and deployment"]
    result = {"commit": commit, "status": "pending"}
    if not matches:
        return result
    if any(type(run.get("id")) is not int or run["id"] <= 0 for run in matches):
        raise SafeError("The matching deployment run has an invalid identifier.")
    run = max(matches, key=lambda item: item["id"])
    run_id = run["id"]
    result.update(run_id=run_id, url="https://github.com/gpeyre/gpeyre.github.io/actions/runs/{}".format(run_id))
    if run.get("status") != "completed":
        return result
    if run.get("conclusion") != "success":
        return dict(result, status="failed")
    payload = github_json("actions/runs/{}/jobs?per_page=100".format(run_id))
    jobs = payload.get("jobs")
    if not isinstance(jobs, list) or not isinstance(payload.get("total_count"), int) or payload["total_count"] > 100:
        raise SafeError("The deployment jobs could not be checked completely.")
    deploys = [job for job in jobs if isinstance(job, dict) and job.get("name") == "deploy"
               and job.get("run_id") == run_id and job.get("head_sha") == commit]
    if len(deploys) != 1:
        raise SafeError("Exactly one matching Pages deploy job is required before announcing.")
    job = deploys[0]
    if job.get("status") == "completed":
        result["status"] = "success" if job.get("conclusion") == "success" else "failed"
    return result


def git(arguments, network=False):
    # Inherit the user's ordinary Git configuration/credential helper, but not
    # environment overrides that can redirect the repository, index, or Git
    # executable, inject configuration, or disable TLS verification.
    environment = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    environment.update(GIT_TERMINAL_PROMPT="0", GIT_OPTIONAL_LOCKS="0")
    try:
        result = subprocess.run(
            [GIT, "-C", str(ROOT), *arguments], capture_output=True,
            timeout=TIMEOUT, check=False, env=environment,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise SafeError("The scoped Git operation could not complete; no command details were logged.") from None
    if result.returncode != 0:
        raise SafeError("The scoped Git operation failed; stop for review without discarding or force-pushing.")
    return result.stdout


def git_text(arguments, network=False):
    try:
        return git(arguments, network).decode("utf-8")
    except UnicodeError:
        raise SafeError("Git returned an unsupported response.") from None


def sha(value, label="commit"):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{40}", value):
        raise SafeError("The {} identifier is invalid.".format(label))
    return value


def digest(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{64}", value):
        raise SafeError("A publication content fingerprint is invalid.")
    return value


def canonical(slug, date):
    if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise SafeError("The publication slug is invalid.")
    try:
        if datetime.date.fromisoformat(date).isoformat() != date:
            raise ValueError
    except (TypeError, ValueError):
        raise SafeError("The publication date must be YYYY-MM-DD.") from None
    return "https://www.gpeyre.com/blog/{}/{}/".format(date.replace("-", "/"), slug)


def manifest(slug, date):
    canonical(slug, date)
    return sorted([
        "blog/_posts/{}-{}.md".format(date, slug),
        "blog/preparations/{}.html".format(slug),
        "blog/preparations/index.html",
        "js/blog-search-index.js",
        LOG_PATH,
    ])


def regular_file(relative):
    """Only fixed manifest paths may reach this function; reject symlinks."""
    path = pathlib.PurePosixPath(relative)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        raise SafeError("A publication path is invalid.")
    current = ROOT
    try:
        for index, part in enumerate(path.parts):
            current = current / part
            mode = current.lstat().st_mode
            expected = stat.S_ISREG if index == len(path.parts) - 1 else stat.S_ISDIR
            if not expected(mode):
                raise SafeError("A publication path is not an ordinary file/directory; leave it untouched.")
        if current.stat().st_size > MAX_FILE_BYTES:
            raise SafeError("A publication file is unexpectedly large.")
        return current.read_bytes()
    except OSError:
        raise SafeError("A required publication file could not be read.") from None


def verify_repository():
    if ROOT.resolve() != ROOT:
        raise SafeError("The publication repository path must not be redirected by a symlink.")
    if git_text(["rev-parse", "--show-toplevel"]).strip() != str(ROOT):
        raise SafeError("This is not the dedicated publication repository.")
    if git_text(["symbolic-ref", "--quiet", "--short", "HEAD"]).strip() != BRANCH:
        raise SafeError("Publication is permitted only on the dedicated master branch.")
    for arguments in (["remote", "get-url", "--all", "origin"], ["remote", "get-url", "--push", "--all", "origin"]):
        if git_text(arguments).splitlines() != [ORIGIN]:
            raise SafeError("The publication remote is not the one approved repository URL.")
    return sha(git_text(["rev-parse", "HEAD"]).strip())


def verify_lock(token):
    if not isinstance(token, str) or not re.fullmatch(r"[0-9a-f]{64}", token):
        raise SafeError("The publication lock token is invalid.")
    try:
        path = ROOT / "blog" / ".publication-run.lock"
        if not stat.S_ISDIR(path.lstat().st_mode) or {entry.name for entry in path.iterdir()} != {"owner.json"}:
            raise SafeError("The publication lock is not an ordinary owned lock; leave it untouched.")
        owner_path = path / "owner.json"
        if not stat.S_ISREG(owner_path.lstat().st_mode):
            raise SafeError("The publication lock owner is not an ordinary file.")
        owner = json.loads(owner_path.read_text(encoding="utf-8"))
        if not isinstance(owner, dict) or owner.get("token") != token:
            raise SafeError("The publication lock belongs to another run.")
    except (OSError, ValueError, UnicodeError):
        raise SafeError("The publication lock could not be verified; leave it untouched.") from None


def announcement_image(entry):
    """Permit only the nonsecret fingerprint of one confirmed image embed."""
    if "announcement_image" not in entry:
        return None
    image = entry["announcement_image"]
    fields = {"path", "alt", "width", "height", "sha256", "mime_type", "size"}
    if (entry.get("status") != "announced" or not isinstance(entry.get("publication_commit"), str)
            or not re.fullmatch(r"[0-9a-f]{40}", entry["publication_commit"])
            or not isinstance(entry.get("bluesky_uri"), str)
            or not re.fullmatch(r"at://did:[a-z0-9]+:[A-Za-z0-9._:%-]+/app\.bsky\.feed\.post/[A-Za-z0-9._~-]+", entry["bluesky_uri"])
            or not isinstance(entry.get("bluesky_cid"), str) or not re.fullmatch(r"[A-Za-z0-9]+", entry["bluesky_cid"])
            or not isinstance(image, dict) or set(image) != fields):
        raise SafeError("Image metadata requires an exact confirmed announcement record.")
    path, alt = image["path"], image["alt"]
    if (not isinstance(path, str) or not re.fullmatch(r"/blog/imgs/summaries/" + re.escape(entry["slug"]) + r"\.(jpg|png)", path)
            or image["mime_type"] != ("image/png" if path.endswith(".png") else "image/jpeg")
            or not isinstance(alt, str) or not alt.strip() or len(alt) > 1000
            or any(ord(character) < 32 for character in alt)):
        raise SafeError("The announcement image path, MIME type or alternative text is invalid.")
    if (any(type(image[field]) is not int or not 1 <= image[field] <= 4096 for field in ("width", "height"))
            or image["width"] * image["height"] > 16_000_000
            or type(image["size"]) is not int or not 0 < image["size"] <= 1_000_000):
        raise SafeError("The announcement image dimensions or byte size is invalid.")
    digest(image["sha256"])
    return image


def load_entry(slug, date):
    url, files = canonical(slug, date), manifest(slug, date)
    try:
        log = json.loads(regular_file(LOG_PATH))
        queue = regular_file("blog/announcement-queue.md").decode("utf-8")
        try:
            (ROOT / "blog/published.md").lstat()
        except FileNotFoundError:
            archive = ""
        else:
            archive = regular_file("blog/published.md").decode("utf-8")
    except (OSError, ValueError, UnicodeError):
        raise SafeError("The publication journal, approval queue or archive has an invalid format.") from None
    if not isinstance(log, dict) or log.get("version") != 1 or log.get("timezone") != "Europe/Paris" or not isinstance(log.get("publications"), list):
        raise SafeError("The publication journal format is unsupported.")
    matches = [entry for entry in log["publications"] if isinstance(entry, dict) and entry.get("slug") == slug]
    if len(matches) != 1:
        raise SafeError("Exactly one journal entry is required for this publication.")
    entry = matches[0]
    if any(isinstance(other, dict) and other is not entry and other.get("date") == date for other in log["publications"]):
        raise SafeError("Another article already occupies this publication date.")
    if (entry.get("date") != date or entry.get("url") != url or entry.get("status") not in ("prepared", "published", "announced")
            or not isinstance(entry.get("title"), str) or not entry["title"].strip() or any(char in entry["title"] for char in "\r\n")
            or not isinstance(entry.get("files"), list) or sorted(entry["files"]) != files):
        raise SafeError("The journal does not describe this exact authorized publication and manifest.")
    sha(entry.get("base_commit"), "baseline commit")
    digest(entry.get("source_sha256"))
    content_files = set(files) - {LOG_PATH}
    fingerprints = entry.get("working_sha256")
    if not isinstance(fingerprints, dict) or set(fingerprints) != content_files:
        raise SafeError("The journal must fingerprint the four exact publication content files.")
    for fingerprint in fingerprints.values():
        digest(fingerprint)
    announcement_image(entry)
    preview = "https://www.gpeyre.com/blog/preparations/{}.html".format(slug)
    matches = [(block, archived) for text, archived in ((queue, False), (archive, True))
               for block in re.split(r"(?m)^## ", text)[1:]
               if any(preview in quote for quote in re.findall(r"(?m)^> (.+)$", block))]
    if len(matches) != 1:
        raise SafeError("Exactly one matching queue or completed archive entry is required.")
    block, archived = matches[0]
    if archived:
        # Only the already-announced entry may use its historical approval for
        # journal synchronization. All source, commit and ancestry guards below
        # still apply; the archive cannot authorize a new publication.
        if (entry["status"] != "announced" or not isinstance(entry.get("publication_commit"), str)
                or not re.fullmatch(r"[0-9a-f]{40}", entry["publication_commit"])
                or not isinstance(entry.get("bluesky_uri"), str) or not entry["bluesky_uri"]
                or not isinstance(entry.get("bluesky_cid"), str) or not entry["bluesky_cid"]
                or re.findall(r"(?m)^Published: (.+)$", block) != [date + " · [Read post](" + url + ")"]):
            raise SafeError("An archived approval may only reconcile its exact completed announcement.")
    if (not re.fullmatch(r"\d+\. " + re.escape(entry["title"]), block.splitlines()[0])
            or re.findall(r"(?m)^- \[([^\]]*)\] Ready to publish\s*$", block) != ["x"]):
        raise SafeError("This publication has not been explicitly approved in the queue.")
    quotes = re.findall(r"(?m)^> (.+)$", block)
    if len(quotes) != 1 or not quotes[0].endswith(" " + preview) or entry.get("message") != quotes[0][:-len(preview)] + url:
        raise SafeError("The journal message differs from the explicitly approved announcement.")
    return entry


def paths(output):
    try:
        return [path for path in output.decode("utf-8").split("\0") if path]
    except UnicodeError:
        raise SafeError("Git returned an unsupported path.") from None


def staged_paths():
    return paths(git(["diff", "--cached", "--name-only", "-z"]))


def allow_staged(allowed):
    if set(staged_paths()) - set(allowed):
        raise SafeError("Unrelated staged files exist; preserve them and stop for review.")


def verify_working(entry):
    for relative, fingerprint in entry["working_sha256"].items():
        if hashlib.sha256(regular_file(relative)).hexdigest() != fingerprint:
            raise SafeError("A publication file changed after its approved fingerprint; stop for review.")


def verify_source(entry):
    preview = "blog/preparations/{}.html".format(entry["slug"])
    source = git(["show", "{}:{}".format(entry["base_commit"], preview)])
    if hashlib.sha256(source).hexdigest() != entry["source_sha256"]:
        raise SafeError("The baseline article does not match the approved source fingerprint.")
    post = "blog/_posts/{}-{}.md".format(entry["date"], entry["slug"])
    if paths(git(["ls-tree", "--name-only", "-z", entry["base_commit"], "--", post])):
        raise SafeError("A published article already occupies this dated path; do not overwrite it.")


def publication_message(entry):
    return "Publish blog post: {} ({})".format(entry["slug"], entry["date"])


def journal_message(entry):
    return "Record blog announcement: {} ({})".format(entry["slug"], entry["date"])


def commit_paths(commit):
    return paths(git(["diff-tree", "--root", "--no-commit-id", "--name-only", "-z", "-r", sha(commit)]))


def commit_parent(commit):
    identifiers = git_text(["rev-list", "--parents", "-n", "1", sha(commit)]).strip().split()
    if len(identifiers) != 2 or identifiers[0] != commit:
        raise SafeError("A publication commit must have exactly one parent.")
    return sha(identifiers[1])


def verify_commit_message(commit, message):
    if git_text(["log", "-1", "--format=%B", sha(commit)]).rstrip("\n") != message:
        raise SafeError("The pending commit is not this workflow's exact publication commit.")


def verify_publication_commit(entry, commit):
    if commit_parent(commit) != entry["base_commit"] or sorted(commit_paths(commit)) != sorted(entry["files"]):
        raise SafeError("The publication commit contains unexpected files or ancestry.")
    verify_commit_message(commit, publication_message(entry))
    for relative, fingerprint in entry["working_sha256"].items():
        if hashlib.sha256(git(["show", "{}:{}".format(commit, relative)])).hexdigest() != fingerprint:
            raise SafeError("The committed article files do not match the approved fingerprints.")


def verify_journal_transition(entry, publication_commit=None):
    """Never commit unrelated journal edits, even though the path is allowed."""
    try:
        current = json.loads(regular_file(LOG_PATH))
        baseline = json.loads(git(["show", "{}:{}".format(entry["base_commit"], LOG_PATH)]))
        image = announcement_image(entry)
        if image is not None and publication_commit is None:
            raise SafeError("Image metadata may only be added after a confirmed announcement, not while preparing publication.")
        initial_entry = dict(entry)
        initial_entry.update(status="prepared", publication_commit=None, bluesky_uri=None, bluesky_cid=None)
        if image is not None:
            # It is computed by the announcement helper after successful
            # create-only reconciliation, not part of the prepared journal.
            initial_entry.pop("announcement_image")
        expected_initial = dict(baseline)
        expected_initial["publications"] = [*baseline["publications"], initial_entry]
        if publication_commit is None:
            if current != expected_initial:
                raise SafeError("The prepared journal changes more than this one new publication entry.")
            return
        published = json.loads(git(["show", "{}:{}".format(publication_commit, LOG_PATH)]))
        if published != expected_initial:
            raise SafeError("The committed journal changed more than this one prepared publication entry.")
        expected = dict(published)
        entries = expected["publications"] = [dict(item) for item in published["publications"]]
        matching = [item for item in entries if item.get("slug") == entry["slug"]]
        if len(matching) != 1:
            raise SafeError("The committed publication journal could not be reconciled.")
        original = matching[0]
        for field in ("status", "publication_commit", "bluesky_uri", "bluesky_cid"):
            original[field] = entry.get(field)
        if image is not None:
            original["announcement_image"] = image
        if expected != current:
            raise SafeError("The publication journal has unrelated or unattributed edits; preserve them and stop.")
    except SafeError:
        raise
    except (KeyError, TypeError, ValueError, UnicodeError):
        raise SafeError("The publication journal history could not be verified safely.") from None


def verify_log_commit(entry, commit, publication_commit):
    if commit_parent(commit) != publication_commit or commit_paths(commit) != [LOG_PATH]:
        raise SafeError("Only this publication's single journal-only commit may follow its article commit.")
    verify_commit_message(commit, journal_message(entry))
    if entry["status"] != "announced":
        raise SafeError("The final journal commit requires a confirmed announcement.")
    if git(["show", "{}:{}".format(commit, LOG_PATH)]) != regular_file(LOG_PATH):
        raise SafeError("The final committed journal differs from this run's verified journal.")


def remote_tip():
    output = git_text(["ls-remote", "--heads", "origin", "refs/heads/master"], network=True)
    match = re.fullmatch(r"([0-9a-f]{40})\trefs/heads/master\n?", output)
    if not match:
        raise SafeError("The exact remote master tip could not be verified.")
    return match.group(1)


def check(probe=False):
    head = verify_repository()
    # No index refresh: git() sets GIT_OPTIONAL_LOCKS=0 for read-only status.
    status = git(["status", "--porcelain=v1", "-z", "--untracked-files=normal"])
    tip = remote_tip()
    if probe:
        if head != tip:
            raise SafeError("A dry-run permission probe requires local and remote master to be identical.")
        git(["push", "--dry-run", "--no-follow-tags", "--recurse-submodules=no", "origin", "HEAD:refs/heads/master"], network=True)
    return "Scoped Git connection verified; local master {} remote master; {}. No commit or real push was made.".format(
        "matches" if head == tip else "differs from", "working changes preserved" if status else "working tree clean")


def commit_publication(slug, date, token):
    head = verify_repository()
    verify_lock(token)
    entry = load_entry(slug, date)
    verify_working(entry)
    verify_source(entry)
    allow_staged(entry["files"])
    if entry["status"] != "prepared":
        raise SafeError("Only a prepared journal entry can create its publication commit.")
    if head != entry["base_commit"]:
        # A lost response after the commit is reconciled, never recommitted.
        verify_publication_commit(entry, head)
        verify_journal_transition(entry, head)
        return head
    if remote_tip() != head:
        raise SafeError("Local master must match remote master before preparing a new publication commit.")
    verify_journal_transition(entry)
    snapshot = regular_file(LOG_PATH)
    git(["add", "--", *entry["files"]])
    if regular_file(LOG_PATH) != snapshot:
        raise SafeError("The publication journal changed while staging; stop for review.")
    git(["commit", "--only", "--message", publication_message(entry), "--", *entry["files"]])
    commit = sha(git_text(["rev-parse", "HEAD"]).strip())
    verify_publication_commit(entry, commit)
    return commit


def commit_log(slug, date, token):
    head = verify_repository()
    verify_lock(token)
    entry = load_entry(slug, date)
    verify_working(entry)
    verify_source(entry)
    allow_staged([LOG_PATH])
    publication_commit = sha(entry.get("publication_commit"), "publication commit")
    verify_publication_commit(entry, publication_commit)
    verify_journal_transition(entry, publication_commit)
    if entry["status"] != "announced" or not isinstance(entry.get("bluesky_uri"), str) or not isinstance(entry.get("bluesky_cid"), str):
        raise SafeError("Only a confirmed announcement can be recorded in the final journal commit.")
    if head != publication_commit:
        verify_log_commit(entry, head, publication_commit)
        if git(["show", "{}:{}".format(head, LOG_PATH)]) != regular_file(LOG_PATH):
            raise SafeError("The already-committed journal changed; stop instead of creating another retry commit.")
        return head
    if paths(git(["diff", "--name-only", "-z", "HEAD", "--", *entry["working_sha256"]])):
        raise SafeError("Article content changed after publication; preserve it and stop.")
    git(["add", "--", LOG_PATH])
    git(["commit", "--only", "--message", journal_message(entry), "--", LOG_PATH])
    commit = sha(git_text(["rev-parse", "HEAD"]).strip())
    verify_log_commit(entry, commit, publication_commit)
    return commit


def push(slug, date, token):
    head = verify_repository()
    verify_lock(token)
    entry = load_entry(slug, date)
    verify_working(entry)
    verify_source(entry)
    allow_staged([LOG_PATH])
    publication_commit = entry.get("publication_commit")
    if publication_commit is None and entry["status"] == "prepared":
        publication_commit = head
    publication_commit = sha(publication_commit, "publication commit")
    verify_publication_commit(entry, publication_commit)
    verify_journal_transition(entry, publication_commit)
    if head != publication_commit:
        verify_log_commit(entry, head, publication_commit)
    if paths(git(["diff", "--name-only", "-z", "HEAD", "--", *entry["working_sha256"]])):
        raise SafeError("Article content changed after its publication commit; no push was attempted.")
    tip = remote_tip()
    if tip not in {entry["base_commit"], publication_commit, head}:
        raise SafeError("Remote master moved or unrelated local commits are pending; no push was attempted.")
    if tip == head:
        return "The authorized publication commit is already on remote master."
    # No force, extra refspec, deletion, upstream, or remote override is possible.
    git(["push", "--no-follow-tags", "--recurse-submodules=no", "origin", "HEAD:refs/heads/master"], network=True)
    if remote_tip() != head:
        raise SafeError("The exact remote publication commit was not confirmed; retry without force-pushing.")
    return "The exact authorized publication commit is verified on remote master."


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("check", help="Read-only repository/remote check; no commit or push.")
    commands.add_parser("probe", help="Check fixed-remote push permission using --dry-run only.")
    deployed = commands.add_parser("deployment", allow_abbrev=False, help="Read-only public Pages deployment check for one commit.")
    deployed.add_argument("--commit", required=True)
    for command in ("commit-publication", "commit-log", "push"):
        operation = commands.add_parser(command, allow_abbrev=False)
        operation.add_argument("--slug", required=True)
        operation.add_argument("--date", required=True)
        operation.add_argument("--lock-token", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "deployment":
            result = deployment(args.commit)
            print(json.dumps(result))
            return 0 if result["status"] == "success" else 2
        elif args.command in ("check", "probe"):
            print(check(probe=args.command == "probe"))
        else:
            operation = {"commit-publication": commit_publication, "commit-log": commit_log, "push": push}[args.command]
            print(operation(args.slug, args.date, args.lock_token))
    except SafeError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception:
        print("The scoped publication operation stopped safely; no private details were logged.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
