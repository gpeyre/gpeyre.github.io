/* Search is computed in the browser, without a search API or analytics calls. */
(function () {
  "use strict";
  const core=window.BlogSearch,records=window.BLOG_SEARCH_RECORDS;
  document.querySelectorAll("[data-blog-search]").forEach(function (root) {
    const input=root.querySelector("input[type=search]"),form=root.querySelector("form"),
      filters=root.querySelector("fieldset"),clear=root.querySelector("[data-search-clear]"),
      message=root.querySelector("[data-search-status]"),results=root.querySelector("[data-search-results]"),
      browse=document.querySelector("[data-blog-browse]");
    if(!core||!Array.isArray(records)){
      message.textContent="Search is temporarily unavailable. Please use the article list below.";return;
    }
    const prepared=core.prepare(records),siteRoot=new URL(root.dataset.siteRoot||"/",document.baseURI);
    const counts={published:records.filter(p=>p.status==="published").length,forthcoming:records.filter(p=>p.status==="forthcoming").length};
    let timer;
    function element(tag,className,value){const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=value;return node;}
    function scope(){return form.querySelector('input[name="status"]:checked')?.value||"all";}
    function articleURL(post){
      if(typeof post.url!=="string"||!post.url.startsWith("/blog/")||post.url.includes(".."))return null;
      if(siteRoot.protocol==="file:"&&post.status==="published")return new URL(post.url,"https://www.gpeyre.com/").href;
      return new URL(post.url.slice(1),siteRoot).href;
    }
    function keywordURL(keyword){const url=new URL(location.href);url.searchParams.set("q",keyword);url.searchParams.delete("status");url.hash="blog-search";return url.href;}
    function card(match){
      const post=match.post,url=articleURL(post);if(!url)return null;
      const node=element("article","blog-search-result"),meta=element("div","blog-search-result-meta"),
        badge=element("span","blog-search-badge"+(post.status==="forthcoming"?" is-forthcoming":""),post.status==="forthcoming"?"Forthcoming · Alpha preview":"Published");
      meta.appendChild(badge);
      if(post.date){const date=new Date(post.date+"T12:00:00Z"),time=element("time","",new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(date));time.dateTime=post.date;meta.appendChild(time);}
      const heading=element("h3"),link=element("a","",post.title);link.href=url;heading.appendChild(link);
      node.append(meta,heading,element("p","blog-search-description",post.description));
      if(match.matchedKeywords.length){const tags=element("div","blog-search-keywords");tags.setAttribute("aria-label","Matching keywords");match.matchedKeywords.slice(0,5).forEach(word=>tags.appendChild(element("span","blog-search-keyword",word)));node.appendChild(tags);}
      const details=element("details"),summary=element("summary","","All keywords ("+post.keywords.length+")"),words=element("div","blog-search-all-keywords");
      post.keywords.forEach(word=>{const a=element("a","",word);a.href=keywordURL(word);words.appendChild(a);});
      details.append(summary,words);node.appendChild(details);return node;
    }
    function setURL(){
      const url=new URL(location.href),query=input.value.trim();
      if(query)url.searchParams.set("q",query);else url.searchParams.delete("q");
      if(scope()!=="all")url.searchParams.set("status",scope());else url.searchParams.delete("status");
      try{history.replaceState(null,"",url);}catch(_error){/* Local-file previews may disallow history edits. */}
    }
    function render(updateURL=true){
      clearTimeout(timer);const query=input.value.trim(),status=scope(),active=Boolean(query)||status!=="all";
      if(updateURL)setURL();clear.hidden=!active;if(browse)browse.hidden=active;
      results.replaceChildren();results.hidden=!active;
      if(!active){message.textContent=counts.published+" published articles · "+counts.forthcoming+" forthcoming previews. Search both collections above.";return;}
      if(query.length>core.limits.queryCharacters){message.textContent="Please shorten your search to "+core.limits.queryCharacters+" characters or fewer.";return;}
      if(new Set(core.normalize(query).split(" ")).size>core.limits.queryTokens){message.textContent="Please use at most "+core.limits.queryTokens+" different search words.";return;}
      const matches=core.search(prepared,query,{status});
      const published=matches.filter(match=>match.post.status==="published").length;
      message.textContent=matches.length+" "+(matches.length===1?"result":"results")+(query?' for “'+query+'”':"")+" · "+published+" published · "+(matches.length-published)+" forthcoming";
      if(!matches.length){results.appendChild(element("p","blog-search-empty","No matching posts. Try fewer words, another keyword, or the All posts filter."));return;}
      const fragment=document.createDocumentFragment();matches.forEach(match=>{const node=card(match);if(node)fragment.appendChild(node);});results.appendChild(fragment);
    }
    function fromURL(){
      const params=new URL(location.href).searchParams;input.value=params.get("q")||"";
      const requested=params.get("status"),status=["published","forthcoming"].includes(requested)?requested:"all";
      form.querySelectorAll('input[name="status"]').forEach(radio=>{radio.checked=radio.value===status;});render(false);
    }
    input.disabled=false;filters.disabled=false;root.dataset.ready="true";
    input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(render,100);});
    input.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();input.value="";render();}});
    form.addEventListener("submit",event=>{event.preventDefault();render();});
    filters.addEventListener("change",()=>render());
    clear.addEventListener("click",()=>{input.value="";form.querySelector('input[value="all"]').checked=true;render();input.focus();});
    window.addEventListener("popstate",fromURL);fromURL();
  });
})();
