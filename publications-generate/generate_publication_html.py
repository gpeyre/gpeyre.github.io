#!/usr/bin/env python3

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from html import escape
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parent
BIBTEX_DIR = ROOT / "bibtex"
OUTPUT_HTML = ROOT / "publication.html"


CATEGORY_BY_FILE = {
    "peyre-biblio-journal.bib": ("journal", "Journal Articles"),
    "peyre-biblio-conf-en.bib": ("conference", "Conference Papers"),
    "peyre-biblio-conf-fr.bib": ("conference-fr", "French Conferences"),
    "peyre-biblio-preprint.bib": ("preprint", "Preprints"),
    "peyre-biblio-book.bib": ("book", "Books"),
    "peyre-biblio-book-chap.bib": ("book-chapter", "Book Chapters"),
}

CATEGORY_ORDER = {
    "journal": 0,
    "conference": 1,
    "conference-fr": 2,
    "preprint": 3,
    "book-chapter": 4,
    "book": 5,
}

LATEX_SPECIALS = {
    r"\&": "&",
    r"\%": "%",
    r"\_": "_",
    r"\$": "$",
    r"\#": "#",
    r"\{": "{",
    r"\}": "}",
    r"\textquotesingle": "'",
    r"\i": "i",
    r"\j": "j",
    r"\ss": "ss",
    r"\ae": "ae",
    r"\AE": "AE",
    r"\oe": "oe",
    r"\OE": "OE",
    r"\aa": "aa",
    r"\AA": "AA",
    r"\o": "o",
    r"\O": "O",
    r"\l": "l",
    r"\L": "L",
}

ACCENT_COMBINERS = {
    "'": "\u0301",
    "`": "\u0300",
    "^": "\u0302",
    '"': "\u0308",
    "~": "\u0303",
    "=": "\u0304",
    ".": "\u0307",
    "c": "\u0327",
    "k": "\u0328",
    "u": "\u0306",
    "v": "\u030C",
    "H": "\u030B",
    "r": "\u030A",
    "b": "\u0331",
    "d": "\u0323",
}


@dataclass
class Publication:
    key: str
    entry_type: str
    category: str
    category_label: str
    year: str
    year_sort: int
    title: str
    authors: list[str]
    venue: str
    details: str
    url: str
    doi: str
    doi_url: str
    search_blob: str


def collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def strip_outer_braces(text: str) -> str:
    text = text.strip()
    while text.startswith("{") and text.endswith("}"):
        depth = 0
        valid = True
        for index, char in enumerate(text):
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0 and index != len(text) - 1:
                    valid = False
                    break
        if valid:
            text = text[1:-1].strip()
        else:
            break
    return text


def combine_latex_accent(match: re.Match[str]) -> str:
    accent = match.group(1)
    letter = match.group(2)
    combined = letter + ACCENT_COMBINERS[accent]
    return unicodedata.normalize("NFC", combined)


def latex_to_unicode(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\r", " ").replace("\n", " ")
    text = strip_outer_braces(text)

    for latex, plain in LATEX_SPECIALS.items():
        text = text.replace(latex, plain)

    accent_pattern = re.compile(r"\{\\([`'\"^~=.ckuvHrbd])\s*\{?([A-Za-z])\}?\}")
    text = accent_pattern.sub(combine_latex_accent, text)

    accent_pattern_unbraced = re.compile(r"\\([`'\"^~=.ckuvHrbd])\s*\{?([A-Za-z])\}?")
    text = accent_pattern_unbraced.sub(combine_latex_accent, text)

    text = re.sub(r"\\[A-Za-z]+\s*", " ", text)
    text = text.replace("{", "").replace("}", "")
    text = text.replace("~", " ")

    return collapse_whitespace(text)


def ascii_fold(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text or "")
    return "".join(char for char in normalized if not unicodedata.combining(char)).lower()


def parse_bibtex_entries(content: str) -> list[tuple[str, str, dict[str, str]]]:
    entries: list[tuple[str, str, dict[str, str]]] = []
    index = 0
    length = len(content)

    while index < length:
        start = content.find("@", index)
        if start == -1:
            break

        cursor = start + 1
        while cursor < length and content[cursor].isspace():
            cursor += 1

        type_start = cursor
        while cursor < length and (content[cursor].isalnum() or content[cursor] in {"_", "-"}):
            cursor += 1
        entry_type = content[type_start:cursor].strip()
        if not entry_type:
            index = start + 1
            continue

        while cursor < length and content[cursor].isspace():
            cursor += 1
        if cursor >= length or content[cursor] not in "{(":
            index = cursor + 1
            continue

        opening = content[cursor]
        closing = "}" if opening == "{" else ")"
        cursor += 1

        key_start = cursor
        depth = 0
        in_quote = False
        while cursor < length:
            char = content[cursor]
            previous = content[cursor - 1] if cursor > 0 else ""
            if char == '"' and previous != "\\":
                in_quote = not in_quote
            elif not in_quote:
                if char == opening:
                    depth += 1
                elif char == closing:
                    if depth == 0:
                        break
                    depth -= 1
                elif char == "," and depth == 0:
                    break
            cursor += 1

        key = content[key_start:cursor].strip()
        if cursor >= length or content[cursor] != ",":
            index = cursor + 1
            continue

        cursor += 1
        body_start = cursor
        depth = 0
        in_quote = False

        while cursor < length:
            char = content[cursor]
            previous = content[cursor - 1] if cursor > 0 else ""
            if char == '"' and previous != "\\":
                in_quote = not in_quote
            elif not in_quote:
                if char == opening:
                    depth += 1
                elif char == closing:
                    if depth == 0:
                        body = content[body_start:cursor]
                        entries.append((entry_type, key, parse_bibtex_fields(body)))
                        cursor += 1
                        break
                    depth -= 1
            cursor += 1

        index = cursor

    return entries


def parse_bibtex_fields(body: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    cursor = 0
    length = len(body)

    while cursor < length:
        while cursor < length and body[cursor] in " \t\r\n,":
            cursor += 1
        if cursor >= length:
            break

        name_start = cursor
        while cursor < length and (body[cursor].isalnum() or body[cursor] in {"_", "-"}):
            cursor += 1
        field_name = body[name_start:cursor].strip().lower()
        if not field_name:
            cursor += 1
            continue

        while cursor < length and body[cursor].isspace():
            cursor += 1
        if cursor >= length or body[cursor] != "=":
            while cursor < length and body[cursor] != ",":
                cursor += 1
            continue

        cursor += 1
        while cursor < length and body[cursor].isspace():
            cursor += 1
        if cursor >= length:
            break

        value, cursor = parse_bibtex_value(body, cursor)
        fields[field_name] = value.strip()

        while cursor < length and body[cursor].isspace():
            cursor += 1
        if cursor < length and body[cursor] == ",":
            cursor += 1

    return fields


def parse_bibtex_value(body: str, cursor: int) -> tuple[str, int]:
    if body[cursor] == "{":
        depth = 0
        start = cursor + 1
        cursor += 1
        while cursor < len(body):
            if body[cursor] == "{":
                depth += 1
            elif body[cursor] == "}":
                if depth == 0:
                    return body[start:cursor], cursor + 1
                depth -= 1
            cursor += 1
        return body[start:], cursor

    if body[cursor] == '"':
        start = cursor + 1
        cursor += 1
        while cursor < len(body):
            if body[cursor] == '"' and body[cursor - 1] != "\\":
                return body[start:cursor], cursor + 1
            cursor += 1
        return body[start:], cursor

    start = cursor
    while cursor < len(body) and body[cursor] not in ",\n\r":
        cursor += 1
    return body[start:cursor], cursor


def normalize_url(url: str) -> str:
    url = collapse_whitespace(url)
    if not url:
        return ""
    if url.startswith("ttps://"):
        return "h" + url
    if url.startswith("ttp://"):
        return "h" + url
    return url


def normalize_doi(doi: str, url: str) -> tuple[str, str]:
    doi = collapse_whitespace(doi)
    if not doi:
        return "", ""

    if doi.startswith("http://") or doi.startswith("https://"):
        return doi, doi

    if re.match(r"^10\.\S+$", doi):
        return doi, f"https://doi.org/{doi}"

    arxiv_id = re.match(r"^\d{4}\.\d{4,5}(v\d+)?$", doi)
    if arxiv_id and "arxiv.org" not in url:
        return doi, f"https://arxiv.org/abs/{doi}"

    return doi, ""


def parse_authors(raw_authors: str) -> list[str]:
    return [
        latex_to_unicode(name)
        for name in re.split(r"\s+and\s+", raw_authors or "")
        if name.strip()
    ]


def format_author_list(authors: list[str]) -> str:
    if not authors:
        return ""
    if len(authors) == 1:
        return authors[0]
    if len(authors) == 2:
        return f"{authors[0]} and {authors[1]}"
    return f"{', '.join(authors[:-1])}, and {authors[-1]}"


def render_authors(authors: list[str]) -> str:
    chunks = []
    for name in authors:
        escaped = escape(name)
        if "peyr" in ascii_fold(name):
            escaped = f'<span class="me">{escaped}</span>'
        chunks.append(escaped)
    if not chunks:
        return ""
    if len(chunks) == 1:
        return chunks[0]
    if len(chunks) == 2:
        return f"{chunks[0]} and {chunks[1]}"
    return f"{', '.join(chunks[:-1])}, and {chunks[-1]}"


def entry_year(entry: dict[str, str]) -> tuple[str, int]:
    raw_year = latex_to_unicode(entry.get("year", "")).strip() or "Unknown"
    digits = re.search(r"\d{4}", raw_year)
    year_sort = int(digits.group(0)) if digits else -1
    return raw_year, year_sort


def build_venue(entry: dict[str, str], category_label: str) -> tuple[str, str]:
    venue = latex_to_unicode(
        entry.get("journal")
        or entry.get("booktitle")
        or entry.get("chapter")
        or entry.get("publisher")
        or entry.get("institution")
        or category_label
    )

    details = []
    if entry.get("publisher"):
        publisher = latex_to_unicode(entry["publisher"])
        if publisher and publisher != venue:
            details.append(publisher)

    if entry.get("institution"):
        institution = latex_to_unicode(entry["institution"])
        if institution and institution != venue:
            details.append(institution)

    if entry.get("volume"):
        details.append(f"Vol. {latex_to_unicode(entry['volume'])}")
    if entry.get("number"):
        details.append(f"No. {latex_to_unicode(entry['number'])}")
    if entry.get("pages"):
        pages = latex_to_unicode(entry["pages"]).replace("--", "-")
        details.append(f"pp. {pages}")
    if entry.get("isbn"):
        details.append(f"ISBN {latex_to_unicode(entry['isbn'])}")
    if entry.get("issn"):
        details.append(f"ISSN {latex_to_unicode(entry['issn'])}")
    if entry.get("type") and latex_to_unicode(entry["type"]) not in venue:
        details.append(latex_to_unicode(entry["type"]))

    return venue, " • ".join(details)


def build_publication(filename: str, entry_type: str, key: str, entry: dict[str, str]) -> Publication:
    category, category_label = CATEGORY_BY_FILE.get(filename, ("other", "Other"))
    year, year_sort = entry_year(entry)
    title = latex_to_unicode(entry.get("title", "Untitled"))
    authors = parse_authors(entry.get("author", ""))
    venue, details = build_venue(entry, category_label)
    url = normalize_url(latex_to_unicode(entry.get("url", "")))
    doi, doi_url = normalize_doi(latex_to_unicode(entry.get("doi", "")), url)
    authors_text = format_author_list(authors)

    search_parts = [
        title,
        authors_text,
        venue,
        details,
        year,
        category_label,
        doi,
        latex_to_unicode(entry.get("publisher", "")),
        latex_to_unicode(entry.get("chapter", "")),
    ]
    search_blob = ascii_fold(" ".join(part for part in search_parts if part))

    return Publication(
        key=key,
        entry_type=entry_type,
        category=category,
        category_label=category_label,
        year=year,
        year_sort=year_sort,
        title=title,
        authors=authors,
        venue=venue,
        details=details,
        url=url,
        doi=doi,
        doi_url=doi_url,
        search_blob=search_blob,
    )


def load_publications() -> list[Publication]:
    publications: list[Publication] = []
    for bib_file in sorted(BIBTEX_DIR.glob("*.bib")):
        content = bib_file.read_text(encoding="utf-8")
        for entry_type, key, entry in parse_bibtex_entries(content):
            publications.append(build_publication(bib_file.name, entry_type, key, entry))

    publications.sort(
        key=lambda publication: (
            -publication.year_sort,
            CATEGORY_ORDER.get(publication.category, 99),
            ascii_fold(publication.title),
        )
    )
    return publications


def group_by_year(publications: list[Publication]) -> dict[str, list[Publication]]:
    groups: defaultdict[str, list[Publication]] = defaultdict(list)
    for publication in publications:
        groups[publication.year].append(publication)

    return dict(
        sorted(
            groups.items(),
            key=lambda item: (
                -(int(re.search(r"\d{4}", item[0]).group(0)) if re.search(r"\d{4}", item[0]) else -1),
                item[0],
            ),
        )
    )


def build_filter_buttons(publications: list[Publication]) -> str:
    counts = Counter(publication.category for publication in publications)
    labels = {
        publication.category: publication.category_label
        for publication in publications
    }

    buttons = [
        '<button class="filter-chip active" type="button" data-filter="all" data-label="All">All<span>'
        f"{len(publications)}</span></button>"
    ]

    for category, _ in sorted(CATEGORY_ORDER.items(), key=lambda item: item[1]):
        if category not in counts:
            continue
        label = escape(labels[category])
        buttons.append(
            f'<button class="filter-chip" type="button" data-filter="{escape(category)}" data-label="{label}">{label}'
            f"<span>{counts[category]}</span></button>"
        )

    return "\n".join(buttons)


def render_publication_card(publication: Publication) -> str:
    title_html = escape(publication.title)
    if publication.url:
        title_html = (
            f'<a href="{escape(publication.url)}" target="_blank" rel="noreferrer">{title_html}</a>'
        )

    link_bits = []
    if publication.url:
        link_bits.append(
            f'<a class="action-link primary" href="{escape(publication.url)}" target="_blank" rel="noreferrer">Open paper</a>'
        )
    if publication.doi_url and publication.doi_url != publication.url:
        label = "DOI" if publication.doi.startswith("10.") or publication.doi.startswith("http") else "Reference"
        link_bits.append(
            f'<a class="action-link" href="{escape(publication.doi_url)}" target="_blank" rel="noreferrer">{label}</a>'
        )
    elif publication.doi:
        link_bits.append(f'<span class="doi-text">{escape(publication.doi)}</span>')

    details_html = f'<p class="details">{escape(publication.details)}</p>' if publication.details else ""
    links_html = f'<div class="actions">{"".join(link_bits)}</div>' if link_bits else ""

    return f"""
    <article class="publication-card" data-category="{escape(publication.category)}" data-year="{escape(publication.year)}" data-search="{escape(publication.search_blob)}">
      <div class="card-header">
        <span class="badge">{escape(publication.category_label)}</span>
        <span class="year-pill">{escape(publication.year)}</span>
      </div>
      <h3>{title_html}</h3>
      <p class="authors">{render_authors(publication.authors)}</p>
      <p class="venue">{escape(publication.venue)}</p>
      {details_html}
      {links_html}
    </article>
    """.strip()


def render_sections(publications_by_year: dict[str, list[Publication]]) -> str:
    sections = []
    for year, publications in publications_by_year.items():
        cards = "\n".join(render_publication_card(publication) for publication in publications)
        sections.append(
            f"""
            <section class="year-section" data-year-section="{escape(year)}">
              <div class="year-heading">
                <h2>{escape(year)}</h2>
                <p><span data-year-count>{len(publications)}</span> publication{"s" if len(publications) != 1 else ""}</p>
              </div>
              <div class="publication-grid">
                {cards}
              </div>
            </section>
            """.strip()
        )
    return "\n".join(sections)


def build_html(publications: list[Publication]) -> str:
    publications_by_year = group_by_year(publications)
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")

    return f"""---
layout: page
title: "Publications"
description: "of Gabriel Peyré"
header-img: "img/louis-livres.jpg"
---
<style>
  .publications-page {{
    --surface: rgba(255, 252, 247, 0.9);
    --surface-strong: #fffdf9;
    --ink: #1e2430;
    --muted: #5a6473;
    --line: rgba(48, 62, 84, 0.12);
    --accent-soft: rgba(175, 63, 38, 0.12);
    --accent-deep: #7a2619;
    --sage: #28594f;
    --shadow: 0 18px 35px rgba(36, 25, 14, 0.08);
    --radius: 24px;
    color: var(--ink);
    line-height: 1.6;
  }}

  .publications-page * {{
    box-sizing: border-box;
  }}

  .publications-page a {{
    color: inherit;
    text-decoration: none;
  }}

  .publications-page .page-shell {{
    width: min(1240px, 100%);
    margin: 0 auto;
    padding: 4px 0 48px;
  }}

  .publications-page .toolbar {{
    position: sticky;
    top: 16px;
    z-index: 10;
    margin: 0 0 24px;
    padding: 18px;
    border-radius: 24px;
    background: rgba(255, 250, 243, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(18px);
    box-shadow: var(--shadow);
  }}

  .publications-page .search-row {{
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }}

  .publications-page .search-input {{
    width: 100%;
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.94);
    color: var(--ink);
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }}

  .publications-page .search-input:focus {{
    border-color: rgba(175, 63, 38, 0.45);
    transform: translateY(-1px);
  }}

  .publications-page .ghost-button {{
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.94);
    color: var(--ink);
    font-weight: 700;
    cursor: pointer;
  }}

  .publications-page .filter-row {{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }}

  .publications-page .filter-chip {{
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.8);
    color: var(--ink);
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }}

  .publications-page .filter-chip span {{
    display: inline-grid;
    place-items: center;
    min-width: 24px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(40, 89, 79, 0.1);
    color: var(--sage);
    font-size: 0.82rem;
  }}

  .publications-page .filter-chip:hover,
  .publications-page .filter-chip.active {{
    transform: translateY(-1px);
    border-color: rgba(175, 63, 38, 0.3);
  }}

  .publications-page .filter-chip.active {{
    background: rgba(175, 63, 38, 0.12);
    color: var(--accent-deep);
  }}

  .publications-page .status-row {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 18px 2px 0;
    color: var(--muted);
    font-size: 0.95rem;
  }}

  .publications-page .year-section {{
    margin-top: 28px;
    padding: 24px;
    border-radius: 28px;
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 20px 40px rgba(51, 38, 19, 0.06);
  }}

  .publications-page .year-heading {{
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }}

  .publications-page .year-heading h2 {{
    margin: 0;
    font-family: "Iowan Old Style", "Palatino Linotype", serif;
    font-size: clamp(1.8rem, 2.2vw, 2.4rem);
    letter-spacing: -0.04em;
  }}

  .publications-page .year-heading p {{
    margin: 0;
    color: var(--muted);
  }}

  .publications-page .publication-grid {{
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }}

  .publications-page .publication-card {{
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 100%;
    padding: 22px;
    border-radius: var(--radius);
    background: var(--surface-strong);
    border: 1px solid rgba(50, 65, 88, 0.08);
    box-shadow: 0 16px 34px rgba(52, 38, 20, 0.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  }}

  .publications-page .publication-card:hover {{
    transform: translateY(-4px);
    box-shadow: 0 24px 40px rgba(52, 38, 20, 0.1);
  }}

  .publications-page .publication-card[hidden] {{
    display: none;
  }}

  .publications-page .card-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }}

  .publications-page .badge,
  .publications-page .year-pill {{
    display: inline-flex;
    align-items: center;
    padding: 7px 11px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
  }}

  .publications-page .badge {{
    background: var(--accent-soft);
    color: var(--accent-deep);
  }}

  .publications-page .year-pill {{
    background: rgba(40, 89, 79, 0.1);
    color: var(--sage);
  }}

  .publications-page .publication-card h3 {{
    margin: 0;
    font-size: 1.24rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }}

  .publications-page .publication-card h3 a {{
    text-decoration: underline;
    text-decoration-thickness: 0.08em;
    text-underline-offset: 0.14em;
    text-decoration-color: rgba(175, 63, 38, 0.35);
  }}

  .publications-page .authors,
  .publications-page .venue,
  .publications-page .details {{
    margin: 0;
  }}

  .publications-page .authors {{
    color: #2e3541;
    font-size: 0.98rem;
  }}

  .publications-page .venue {{
    color: var(--sage);
    font-weight: 700;
  }}

  .publications-page .details {{
    color: var(--muted);
    font-size: 0.94rem;
  }}

  .publications-page .me {{
    font-weight: 800;
    color: var(--accent-deep);
  }}

  .publications-page .actions {{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: auto;
    padding-top: 8px;
  }}

  .publications-page .action-link,
  .publications-page .doi-text {{
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 9px 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.7);
    font-size: 0.92rem;
    font-weight: 700;
  }}

  .publications-page .action-link.primary {{
    border-color: rgba(175, 63, 38, 0.25);
    background: rgba(175, 63, 38, 0.09);
    color: var(--accent-deep);
  }}

  .publications-page .empty-state {{
    display: none;
    margin-top: 22px;
    padding: 36px 28px;
    text-align: center;
    border-radius: 28px;
    border: 1px dashed rgba(50, 65, 88, 0.18);
    background: rgba(255, 252, 247, 0.8);
    color: var(--muted);
  }}

  .publications-page .footer-note {{
    margin-top: 26px;
    color: var(--muted);
    text-align: right;
    font-size: 0.88rem;
  }}

  .publications-page kbd {{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid rgba(50, 65, 88, 0.14);
    background: rgba(255, 255, 255, 0.84);
    color: var(--ink);
    font-size: 0.82rem;
    font-family: inherit;
    font-weight: 700;
  }}

  @media (max-width: 940px) {{
    .publications-page .publication-grid {{
      grid-template-columns: 1fr;
    }}
  }}

  @media (max-width: 720px) {{
    .publications-page .page-shell {{
      padding-top: 0;
    }}

    .publications-page .year-section {{
      padding: 22px;
    }}

    .publications-page .toolbar {{
      top: 10px;
    }}

    .publications-page .search-row,
    .publications-page .year-heading,
    .publications-page .status-row {{
      grid-template-columns: 1fr;
      display: grid;
      justify-content: unset;
    }}
  }}
</style>

<div class="publications-page">
  <main class="page-shell">
    <section class="toolbar" aria-label="Publication filters">
      <div class="search-row">
        <input id="search-input" class="search-input" type="search" placeholder="Search publications, authors, venues, years, or DOI...">
        <button id="clear-search" class="ghost-button" type="button">Clear</button>
      </div>
      <div class="filter-row">
        {build_filter_buttons(publications)}
      </div>
      <div class="status-row">
        <span id="status-text">Showing all {len(publications)} publications.</span>
        <span>Tip: press <kbd>/</kbd> to focus search</span>
      </div>
    </section>

    <div id="empty-state" class="empty-state">
      No publication matches the current filters. Try a broader keyword or switch back to <strong>All</strong>.
    </div>

    {render_sections(publications_by_year)}

    <p class="footer-note">Generated on {escape(generated_at)} from {len(list(BIBTEX_DIR.glob("*.bib")))} BibTeX files.</p>
  </main>
</div>

  <script>
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');
    const statusText = document.getElementById('status-text');
    const emptyState = document.getElementById('empty-state');
    const cards = Array.from(document.querySelectorAll('.publication-card'));
    const yearSections = Array.from(document.querySelectorAll('[data-year-section]'));
    const filterChips = Array.from(document.querySelectorAll('.filter-chip'));

    let activeFilter = 'all';

    function fold(text) {{
      return (text || '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase();
    }}

    function updateFilters() {{
      const query = fold(searchInput.value.trim());
      const terms = query.split(/\\s+/).filter(Boolean);
      let shown = 0;

      cards.forEach((card) => {{
        const matchesCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
        const haystack = card.dataset.search || '';
        const matchesQuery = terms.every((term) => haystack.includes(term));
        const visible = matchesCategory && matchesQuery;
        card.hidden = !visible;
        if (visible) {{
          shown += 1;
        }}
      }});

      yearSections.forEach((section) => {{
        const yearCards = Array.from(section.querySelectorAll('.publication-card'));
        const yearShown = yearCards.filter((card) => !card.hidden).length;
        section.hidden = yearShown === 0;
        const countNode = section.querySelector('[data-year-count]');
        if (countNode) {{
          countNode.textContent = String(yearShown);
        }}
      }});

      emptyState.style.display = shown === 0 ? 'block' : 'none';

      const label = activeFilter === 'all'
        ? 'all categories'
        : (document.querySelector(`.filter-chip[data-filter="${{activeFilter}}"]`)?.dataset.label || activeFilter);

      if (!query && activeFilter === 'all') {{
        statusText.textContent = `Showing all ${{cards.length}} publications.`;
      }} else if (!query) {{
        statusText.textContent = `Showing ${{shown}} publications in ${{label.toLowerCase()}}.`;
      }} else {{
        statusText.textContent = `Showing ${{shown}} result${{shown === 1 ? '' : 's'}} for "${{searchInput.value.trim()}}" in ${{label.toLowerCase()}}.`;
      }}
    }}

    filterChips.forEach((chip) => {{
      chip.addEventListener('click', () => {{
        activeFilter = chip.dataset.filter || 'all';
        filterChips.forEach((button) => button.classList.toggle('active', button === chip));
        updateFilters();
      }});
    }});

    searchInput.addEventListener('input', updateFilters);
    clearButton.addEventListener('click', () => {{
      searchInput.value = '';
      activeFilter = 'all';
      filterChips.forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
      updateFilters();
      searchInput.focus();
    }});

    document.addEventListener('keydown', (event) => {{
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (event.key === '/' && !isTyping) {{
        event.preventDefault();
        searchInput.focus();
      }}
    }});

    updateFilters();
  </script>
"""


def main() -> None:
    publications = load_publications()
    html = build_html(publications)
    OUTPUT_HTML.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT_HTML}")


if __name__ == "__main__":
    main()
