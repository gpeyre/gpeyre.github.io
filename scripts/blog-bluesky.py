#!/usr/bin/env python3
"""Publish approved blog announcements without storing Bluesky credentials.

The dedicated app password is read from one macOS Keychain item, held only in
memory, and sent only to Bluesky's fixed HTTPS authentication endpoint. Server
responses and exception details are deliberately never printed.
"""

import argparse
import datetime
import hashlib
import html.parser
import json
import os
import pathlib
import re
import secrets
import stat
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request


ACCOUNT = "gabrielpeyre.bsky.social"
KEYCHAIN_ITEM = "codex-bluesky-blog"
XRPC_ROOT = "https://bsky.social/xrpc/"
NETWORK_TIMEOUT = 20
MAX_RESPONSE_BYTES = 1_048_576
ROOT = pathlib.Path(__file__).resolve().parents[1]
PUBLICATION_LOG = ROOT / "blog" / "publication-log.json"
ANNOUNCEMENT_QUEUE = ROOT / "blog" / "announcement-queue.md"
RUN_LOCK = ROOT / "blog" / ".publication-run.lock"


class SafeError(Exception):
    """A deliberately non-sensitive error suitable for display."""


class RemoteHTTPError(SafeError):
    def __init__(self, status, code=None):
        super().__init__("The Bluesky request failed (HTTP {}).".format(status))
        self.status = status
        self.code = code


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SafeError("An unexpected redirect was refused.")


def acquire_run_lock(lock_path=RUN_LOCK):
    """Claim this publication workflow once; never reclaim an existing lock."""
    path = pathlib.Path(lock_path)
    try:
        path.mkdir(mode=0o700)
    except FileExistsError:
        raise SafeError("A publication run lock already exists; stop for review, without reclaiming it.") from None
    except OSError:
        raise SafeError("The publication run lock could not be created.") from None
    token = secrets.token_hex(32)  # An ownership marker, not an account credential.
    owner = {
        "token": token,
        "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    }
    try:
        descriptor = os.open(path / "owner.json", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(owner, stream)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
    except (OSError, ValueError):
        # Even an incomplete claim stays in place: only explicit human review
        # may resolve it, rather than accidentally admitting a concurrent run.
        raise SafeError("The run lock was created but its owner could not be saved; leave it for review.") from None
    return token


def release_run_lock(token, lock_path=RUN_LOCK):
    """Release only our exact ordinary lock directory; preserve other files."""
    if not isinstance(token, str) or not re.fullmatch(r"[0-9a-f]{64}", token):
        raise SafeError("The publication run lock token is invalid.")
    path = pathlib.Path(lock_path)
    try:
        if not stat.S_ISDIR(path.lstat().st_mode):
            raise SafeError("The publication run lock is not an ordinary directory; leave it for review.")
        if {item.name for item in path.iterdir()} != {"owner.json"}:
            raise SafeError("The publication run lock has missing or unexpected files; leave them untouched for review.")
        owner_path = path / "owner.json"
        if not stat.S_ISREG(owner_path.lstat().st_mode):
            raise SafeError("The publication run lock owner is not an ordinary file; leave it for review.")
        with owner_path.open("r", encoding="utf-8") as stream:
            owner = json.loads(stream.read(4097))
        if not isinstance(owner, dict) or owner.get("token") != token:
            raise SafeError("The publication run lock belongs to another run; it was not released.")
        owner_path.unlink()
        path.rmdir()  # Never recursive: an unexpected file prevents removal.
    except SafeError:
        raise
    except (OSError, ValueError, UnicodeError):
        raise SafeError("The publication run lock could not be released safely; leave it for review.") from None


def read_password():
    """Read this task's exact item; never enumerate or modify the Keychain."""
    searches = ("-s", "-l")
    for search in searches:
        try:
            result = subprocess.run(
                ["/usr/bin/security", "find-generic-password", search,
                 KEYCHAIN_ITEM, "-a", ACCOUNT, "-w"],
                capture_output=True,
                check=False,
                timeout=30,
            )
        except (OSError, subprocess.TimeoutExpired):
            raise SafeError("The dedicated Keychain item could not be read.") from None
        if result.returncode == 0:
            try:
                password = result.stdout.decode("utf-8").rstrip("\r\n")
            except UnicodeError:
                raise SafeError("The dedicated Keychain item has an invalid value.") from None
            if not password or "\n" in password or "\r" in password:
                raise SafeError("The dedicated Keychain item has an invalid value.")
            return password
        # Only item-not-found authorizes the equally specific label fallback.
        # Access denial, a locked Keychain, or a cancelled prompt are stop signs.
        if result.returncode != 44:
            raise SafeError("Keychain access was not granted; no request was sent.")
    raise SafeError("The dedicated Bluesky Keychain item was not found.")


def request_json(method, endpoint, payload=None, token=None):
    """Call a fixed official XRPC endpoint, refusing redirects and unsafe logs."""
    if not re.fullmatch(r"[A-Za-z0-9.]+(?:\?[^\s]*)?", endpoint):
        raise SafeError("The Bluesky request is invalid.")
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json", "User-Agent": "gpeyre-blog-announcer/1"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token is not None:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(XRPC_ROOT + endpoint, data=data, headers=headers, method=method)
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=NETWORK_TIMEOUT) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise SafeError("Bluesky returned an unexpectedly large response.")
            result = json.loads(raw)
    except SafeError:
        raise
    except urllib.error.HTTPError as error:
        # Inspect only the machine-readable error identifier. Never log bodies,
        # messages, request headers, credentials, or exception representations.
        code = None
        try:
            problem = json.loads(error.read(MAX_RESPONSE_BYTES + 1))
            if isinstance(problem, dict) and isinstance(problem.get("error"), str):
                code = problem["error"]
        except (OSError, ValueError, UnicodeError):
            pass
        raise RemoteHTTPError(error.code, code) from None
    except (urllib.error.URLError, OSError, ValueError, UnicodeError):
        raise SafeError("The Bluesky request failed; no server details were logged.") from None
    if not isinstance(result, dict):
        raise SafeError("Bluesky returned an invalid response.")
    return result


def authenticate():
    password = read_password()
    result = request_json("POST", "com.atproto.server.createSession", {
        "identifier": ACCOUNT,
        "password": password,
    })
    del password
    handle, did, token = result.get("handle"), result.get("did"), result.get("accessJwt")
    if handle != ACCOUNT or not isinstance(did, str) or not re.fullmatch(r"did:[a-z0-9]+:[A-Za-z0-9._:%-]+", did):
        raise SafeError("Bluesky returned an identity different from the configured account.")
    if not isinstance(token, str) or not token or any(character.isspace() for character in token):
        raise SafeError("Bluesky did not return a usable session.")
    return {"handle": handle, "did": did, "token": token}


def canonical_url(slug, date):
    if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise SafeError("The publication slug is invalid.")
    try:
        if datetime.date.fromisoformat(date).isoformat() != date:
            raise ValueError
    except (TypeError, ValueError):
        raise SafeError("The publication date must be YYYY-MM-DD.") from None
    return "https://www.gpeyre.com/blog/{}/{}/".format(date.replace("-", "/"), slug)


def load_announcement(slug, date, log_path=PUBLICATION_LOG, queue_path=ANNOUNCEMENT_QUEUE):
    """Demand explicit readiness and exact agreement with the publication log."""
    url = canonical_url(slug, date)
    try:
        log = json.loads(pathlib.Path(log_path).read_text(encoding="utf-8"))
        queue = pathlib.Path(queue_path).read_text(encoding="utf-8")
    except (OSError, ValueError, UnicodeError):
        raise SafeError("The publication log or approved queue could not be read.") from None
    if not isinstance(log, dict) or log.get("version") != 1 or log.get("timezone") != "Europe/Paris" or not isinstance(log.get("publications"), list):
        raise SafeError("The publication log has an unsupported format.")
    matches = [entry for entry in log["publications"] if isinstance(entry, dict) and entry.get("slug") == slug]
    if len(matches) != 1:
        raise SafeError("Exactly one publication log entry is required for this slug.")
    entry = matches[0]
    if any(isinstance(other, dict) and other is not entry and other.get("date") == date for other in log["publications"]):
        raise SafeError("The daily publication quota already has another article for this date.")
    if (entry.get("status") not in ("published", "announced") or entry.get("date") != date
            or entry.get("url") != url or not isinstance(entry.get("title"), str) or not entry["title"].strip()
            or not isinstance(entry.get("source_sha256"), str) or not re.fullmatch(r"[0-9a-f]{64}", entry["source_sha256"])
            or not isinstance(entry.get("publication_commit"), str) or not re.fullmatch(r"[0-9a-f]{40}", entry["publication_commit"])):
        raise SafeError("The article does not have a valid completed publication record.")
    if entry["status"] == "published" and (entry.get("bluesky_uri") is not None or entry.get("bluesky_cid") is not None):
        raise SafeError("The publication log has inconsistent announcement status.")
    if entry["status"] == "announced" and (not isinstance(entry.get("bluesky_uri"), str) or not isinstance(entry.get("bluesky_cid"), str)):
        raise SafeError("The announced publication record is incomplete.")
    message = entry.get("message")
    if not isinstance(message, str) or not message.endswith(" " + url) or len(message) > 280 or any(character in message for character in "\r\n"):
        raise SafeError("The approved message must end with the dated URL and fit within 280 characters.")
    blocks = re.split(r"(?m)^## ", queue)[1:]
    preview = "https://www.gpeyre.com/blog/preparations/{}.html".format(slug)
    queue_matches = []
    for block in blocks:
        quotes = re.findall(r"(?m)^> (.+)$", block)
        for quote in quotes:
            if quote.endswith(" " + preview):
                queue_matches.append((block, quote))
    if len(queue_matches) != 1:
        raise SafeError("Exactly one matching approved queue entry is required.")
    block, quote = queue_matches[0]
    title_line = block.splitlines()[0]
    if not re.fullmatch(r"\d+\. " + re.escape(entry["title"]), title_line):
        raise SafeError("The queue title differs from the published article.")
    if not re.search(r"(?m)^- \[x\] Ready to publish\s*$", block):
        raise SafeError("This article has not been explicitly marked ready to publish.")
    if quote[:-len(preview)] + url != message:
        raise SafeError("The logged message differs from the explicitly approved queue message.")
    return log, entry


class PublicationHTML(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.canonicals = []
        self.dates = []
        self.headings = []
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href"))
        if tag == "meta" and attrs.get("name", "").lower() == "robots" and "noindex" in attrs.get("content", "").lower():
            self.noindex = True
        if tag == "time" and any("blog-eyebrow" in item[1].get("class", "").split() for item in self.stack):
            self.dates.append(attrs.get("datetime"))
        if tag == "h1":
            self.headings.append([])
        if tag not in ("area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"):
            self.stack.append((tag, attrs))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        if self.headings and any(item[0] == "h1" for item in self.stack):
            self.headings[-1].append(data)


def verify_live_page(entry):
    """A 200/soft-404 is insufficient: require dated canonical publication HTML."""
    request = urllib.request.Request(entry["url"], headers={"Accept": "text/html", "User-Agent": "gpeyre-blog-announcer/1"})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=NETWORK_TIMEOUT) as response:
            if response.status != 200 or response.geturl() != entry["url"] or "text/html" not in response.headers.get("Content-Type", "").lower():
                raise SafeError("The final dated article is not live at its exact canonical URL.")
            raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise SafeError("The published page is unexpectedly large.")
            page = PublicationHTML()
            page.feed(raw.decode("utf-8"))
    except SafeError:
        raise
    except (urllib.error.URLError, OSError, ValueError, UnicodeError):
        raise SafeError("The published article could not be verified; no announcement was sent.") from None
    titles = [" ".join("".join(parts).split()) for parts in page.headings]
    if page.canonicals != [entry["url"]] or entry["date"] not in page.dates or titles != [" ".join(entry["title"].split())] or page.noindex:
        raise SafeError("The live page does not match the approved article's title, date, and canonical URL.")


def post_record(entry):
    message, url = entry["message"], entry["url"]
    start = len(message[:-len(url)].encode("utf-8"))
    return {
        "$type": "app.bsky.feed.post",
        "text": message,
        "facets": [{"index": {"byteStart": start, "byteEnd": len(message.encode("utf-8"))},
                    "features": [{"$type": "app.bsky.richtext.facet#link", "uri": url}]}],
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
    }


def deterministic_rkey(slug, date):
    return "blog-{}-{}".format(date.replace("-", ""), hashlib.sha256(slug.encode("utf-8")).hexdigest()[:20])


def get_record(did, rkey, token):
    query = urllib.parse.urlencode({"repo": did, "collection": "app.bsky.feed.post", "rkey": rkey})
    try:
        return request_json("GET", "com.atproto.repo.getRecord?" + query, token=token)
    except RemoteHTTPError as error:
        if error.code == "RecordNotFound":
            return None
        raise


def validate_record(result, expected, did, rkey):
    value = result.get("value")
    uri, cid = result.get("uri"), result.get("cid")
    if (not isinstance(value, dict) or value.get("$type") != expected["$type"] or value.get("text") != expected["text"]
            or value.get("facets") != expected["facets"] or uri != "at://{}/app.bsky.feed.post/{}".format(did, rkey)
            or not isinstance(cid, str) or not re.fullmatch(r"[A-Za-z0-9]+", cid)):
        raise SafeError("The deterministic Bluesky record already exists with unexpected content; no overwrite was attempted.")
    return uri, cid


def save_announcement(log, entry, uri, cid, log_path):
    # Preserve concurrent edits to the queue/log instead of overwriting them.
    path = pathlib.Path(log_path)
    try:
        current = json.loads(path.read_text(encoding="utf-8"))
        if current != log:
            raise SafeError("The publication log changed; retry to reconcile the already-created announcement.")
        entry.update(status="announced", bluesky_uri=uri, bluesky_cid=cid)
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, prefix=".publication-log-", suffix=".tmp", delete=False) as temporary:
            temporary_name = temporary.name
            json.dump(log, temporary, ensure_ascii=False, indent=2)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_name, path)
    except SafeError:
        raise
    except (OSError, ValueError):
        raise SafeError("The announcement exists, but its public status could not be saved; retry safely.") from None


def announce(slug, date, log_path=PUBLICATION_LOG, queue_path=ANNOUNCEMENT_QUEUE):
    log, entry = load_announcement(slug, date, log_path, queue_path)
    verify_live_page(entry)
    # Do not request Keychain access before the publication/readiness checks pass.
    session = authenticate()
    rkey = deterministic_rkey(slug, date)
    expected = post_record(entry)
    result = get_record(session["did"], rkey, session["token"])
    if result is None:
        if entry["status"] == "announced":
            raise SafeError("The log says this article was announced, but the record is absent; no repost was attempted.")
        try:
            request_json("POST", "com.atproto.repo.putRecord", {
                "repo": session["did"], "collection": "app.bsky.feed.post", "rkey": rkey,
                "record": expected, "swapRecord": None, "validate": True,
            }, token=session["token"])
        except SafeError:
            # A lost response can follow a successful creation. Re-read the one
            # deterministic key, never repeat an unconstrained create request.
            result = get_record(session["did"], rkey, session["token"])
            if result is None:
                raise SafeError("The create-only announcement could not be confirmed; retry safely.") from None
        else:
            result = get_record(session["did"], rkey, session["token"])
            if result is None:
                raise SafeError("The announcement could not yet be verified; retry safely.")
    uri, cid = validate_record(result, expected, session["did"], rkey)
    if entry["status"] == "announced" and (entry["bluesky_uri"] != uri or entry["bluesky_cid"] != cid):
        raise SafeError("The Bluesky record no longer matches the completed announcement log.")
    save_announcement(log, entry, uri, cid, log_path)
    return "https://bsky.app/profile/{}/post/{}".format(session["handle"], rkey)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser(
        "check", help="Authenticate the dedicated account without creating a post."
    )
    commands.add_parser("lock", help="Claim the shared publication run lock and print its nonsecret owner token.")
    unlock = commands.add_parser("unlock", help="Release only the publication run lock belonging to this token.")
    unlock.add_argument("--token", required=True)
    announcement = commands.add_parser("announce", help="Announce one explicitly approved, deployed publication.")
    announcement.add_argument("--slug", required=True)
    announcement.add_argument("--date", required=True)
    announcement.add_argument("--publication-log", type=pathlib.Path, default=PUBLICATION_LOG)
    args = parser.parse_args(argv)
    try:
        if args.command == "lock":
            print(acquire_run_lock())
        elif args.command == "unlock":
            release_run_lock(args.token)
            print("Publication run lock released.")
        elif args.command == "check":
            session = authenticate()
            print("Connected as {} ({}). No post was created.".format(session["handle"], session["did"]))
        elif args.command == "announce":
            if args.publication_log.resolve() != PUBLICATION_LOG.resolve():
                raise SafeError("Only this repository's dedicated publication log may authorize an announcement.")
            print("Announcement verified: " + announce(args.slug, args.date, args.publication_log))
    except SafeError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception:
        # Never let a traceback accidentally include credential-bearing objects.
        print("The Bluesky operation failed safely; no private details were logged.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
