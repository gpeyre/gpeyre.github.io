---
layout: page
title: "Codes"
description: "for reproductible research"
header-img: "img/paysages-paris.jpg"
---


You can find below Matlab code to reproduce the figures of some of my articles. All the code are hosted [on my Github page](https://github.com/gpeyre), and you can retrieve them either as .zip file or as a git repository.

<ul>
{% for codeitem in site.data.code_list %}
<li>
  {{ codeitem.name }} ({{ codeitem.authors }})
  [<a href="{{ codeitem.article }}">Article</a>|<a href="{{ codeitem.code }}">Code</a>]
</li>
{% endfor %}
</ul>
