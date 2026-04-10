import os
import bibtexparser
from collections import defaultdict
from operator import itemgetter

def replace_latex_chars(text):
    replacements = {
        "{\\'e}": "é",
    }
    for latex_char, html_char in replacements.items():
        text = text.replace(latex_char, html_char)
    return text.strip()

def replace_double_hyphen(text):
    return text.replace('--', '-')


def generate_html(entries_by_year):
    html_template = '''---
layout: page
title: "Publications"
description: "of Gabriel Peyré"
header-img: "img/louis-livres.jpg"
---
<div>
  <div class="mt-3">
    {% for year, entries in entries_by_year.items() %}
    <h3>{{ year }}</h3>
    {% for entry in entries %}
    <div class="entry" style="margin-top: -15px;">
      <p>
      {% if entry.title %}
        {% if entry.url %}
          <strong><a href="{{ entry.url }}" target="_blank">{{ entry.title.strip() }}</a>,</strong>
        {% else %}
          <strong>{{ entry.title.strip() }},</strong>
        {% endif %}
      {% endif %}
      {% if entry.author %}{{ entry.author }},{% endif %}
      {% if entry.journal %} {{ entry.journal.strip() }},{% endif %}
      {% if entry.booktitle %} {{ entry.booktitle.strip() }},{% endif %}
      {% if entry.type %}{% if entry.type == 'Preprint' %} preprint,{% endif %}{% endif %}
      {% if entry.pages %} pp. {{ entry.pages.strip() }},{% endif %}
      {% if entry.year %} {{ entry.year.strip() }}.{% endif %}
      </p>
    </div>
    {% endfor %}
    {% endfor %}
  </div>
</div>'''

    from jinja2 import Template
    template = Template(html_template)
    html_output = template.render(entries_by_year=entries_by_year)
    
    return html_output





def main():
    bibtex_dir = 'bibtex'
    entries_by_year = defaultdict(list)

    for file_name in os.listdir(bibtex_dir):
        if file_name.endswith('.bib'):
            with open(os.path.join(bibtex_dir, file_name)) as bibtex_file:
                bibtex_str = bibtex_file.read()

            bib_database = bibtexparser.loads(bibtex_str)
            for entry in bib_database.entries:
                if 'author' in entry:
                    authors = entry['author'].split(' and ')
                    if len(authors) > 1:
                        formatted_authors = ', '.join(authors[:-1]) + ' and ' + authors[-1]
                    else:
                        formatted_authors = authors[0]
                    entry['author'] = replace_latex_chars(formatted_authors)  # Format authors and replace special characters
                    
                if 'pages' in entry:
                    entry['pages'] = replace_double_hyphen(entry['pages'])
                year = entry.get('year', 'Unknown Year')
                entries_by_year[year].append(entry)

    # Sort entries within each year
    for year, entries in entries_by_year.items():
        entries.sort(key=itemgetter('title'))

    # Sort years in descending order
    sorted_entries_by_year = dict(sorted(entries_by_year.items(), key=lambda item: item[0], reverse=True))

    html_output = generate_html(sorted_entries_by_year)

    with open('../publications.html', 'w', encoding='utf-8') as f:
        f.write(html_output)

    print("HTML page has been successfully generated as '../publications.html'.")

if __name__ == "__main__":
    main()
