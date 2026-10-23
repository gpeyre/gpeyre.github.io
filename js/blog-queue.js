/* Local editorial interface. Markdown on disk is the only approval authority. */
(function () {
  "use strict";
  const dataElement = document.getElementById("queue-data");
  if (!dataElement) return;
  const data = JSON.parse(dataElement.textContent), cardsRoot = document.querySelector("[data-cards]");
  let baseline = data.source, draft = baseline, handle = null, records = [], dirty = false;
  const query = selector => document.querySelector(selector);
  const status = query("[data-save-status]"), search = query("[data-search]"), readyFilter = query("[data-ready-filter]"), topicFilter = query("[data-topic-filter]");

  function parse(source) {
    const headings = [...source.matchAll(/^## ([^\r\n]+)\r?$/gm)];
    if (!headings.length) throw new Error("The file has no queue entries.");
    if (headings.length !== [...source.matchAll(/^##(?:[ \t]|$)/gm)].length) throw new Error("The queue has a malformed heading.");
    const seen = new Set();
    return headings.map((heading, index) => {
      if (!/^[1-9]\d*\. \S[^\r\n]*$/.test(heading[1])) throw new Error("Each entry must have a numbered title.");
      const end = index + 1 < headings.length ? headings[index + 1].index : source.length;
      const body = source.slice(heading.index, end), checks = [...body.matchAll(/^- \[([ x])\] Ready to publish\r?$/gm)];
      if (checks.length !== 1 || [...body.matchAll(/^- \[/gm)].length !== 1) throw new Error("Each entry must have exactly one exact readiness checkbox.");
      const quotes = body.split(/\r?\n/).filter(line => line.startsWith(">"));
      if (quotes.length !== 1 || !quotes[0].startsWith("> ")) throw new Error("Each entry must have one single-line quoted announcement.");
      const unknown = body.split(/\r?\n/).slice(1).filter(line => line.trim() && !line.startsWith("Topic: ") && !line.startsWith("> ") && !/^- \[[ x]\] Ready to publish$/.test(line));
      if (unknown.length) throw new Error("The queue entry contains unexpected content or a wrapped announcement.");
      const message = quotes[0].slice(2), match = message.match(/ (https:\/\/www\.gpeyre\.com\/blog\/preparations\/([a-z0-9-]+)\.html)$/);
      if (!match || message.startsWith(" ")) throw new Error("Each announcement must end with its exact gpeyre.com preview URL.");
      if (seen.has(match[2])) throw new Error("Queue entries must have unique article slugs.");
      seen.add(match[2]);
      const topic = (body.match(/^Topic: (.+)\r?$/m) || [null, "Other topics"])[1].trim();
      return { title: heading[1].replace(/^\d+\. /, ""), topic, ready: checks[0][1] === "x", message, url: match[1], slug: match[2], boxOffset: heading.index + checks[0].index + 3 };
    });
  }
  function normalize(text) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function topicKind(record) { return record.topic.startsWith("OT /") ? "ot" : record.topic.startsWith("Transport geometry") ? "transport" : "other"; }
  function node(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; }
  function imagePath(image) { return image.path.replace(/^\/blog\//, ""); }
  function report(message, kind) { status.textContent = message; status.className = "queue-save-status" + (kind ? " is-" + kind : ""); }
  function refreshState() {
    dirty = draft !== baseline;
    query("[data-save]").disabled = !dirty;
    query("[data-download]").disabled = !dirty;
    query("[data-count-total]").textContent = records.length;
    query("[data-count-ready]").textContent = records.filter(record => record.ready).length;
    query("[data-count-images]").textContent = records.filter(record => data.images[record.slug]).length;
    if (dirty) report("Unsaved draft. These checkboxes do not yet change publication approvals.", "warning");
    else report(handle ? "No unsaved readiness changes in the selected source. Queue edits still need review, commit, and push before the scheduled run." : "This generated snapshot can be stale. Open current Markdown before editing external updates.");
    filter();
  }
  function filter() {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    records.forEach(record => {
      const text = normalize(record.title + " " + record.topic + " " + record.message);
      const visible = terms.every(term => text.includes(term)) && (readyFilter.value === "all" || record.ready === (readyFilter.value === "ready")) && (topicFilter.value === "all" || topicKind(record) === topicFilter.value);
      record.card.hidden = !visible;
      count += Number(visible);
    });
    query("[data-results]").textContent = `${count} of ${records.length} articles · source order${dirty ? " · unsaved draft" : ""}`;
    query("[data-empty]").hidden = count !== 0;
  }
  async function copy(message, button) {
    try { await navigator.clipboard.writeText(message); button.textContent = "Copied"; window.setTimeout(() => { button.textContent = "Copy announcement"; }, 1600); }
    catch (_) { const panel = query("[data-copy-fallback]"), field = query("[data-copy-text]"); panel.hidden = false; field.value = message; field.focus(); field.select(); }
  }
  function render() {
    const parsed = parse(draft);
    records = parsed;
    cardsRoot.replaceChildren();
    records.forEach((record, index) => {
      const card = node("article", "queue-card"); card.dataset.slug = record.slug; record.card = card;
      const image = data.images[record.slug];
      if (image && /^\/blog\/imgs\/summaries\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(image.path)) {
        const picture = node("a", "queue-picture"); picture.href = imagePath(image); picture.setAttribute("aria-label", "Open illustration for " + record.title);
        const img = node("img"); img.src = imagePath(image); img.alt = image.alt || record.title; img.width = image.width || 1200; img.height = image.height || 630; img.loading = "lazy"; picture.append(img); card.append(picture);
      } else {
        const picture = node("div", "queue-picture queue-no-picture"); picture.append(node("span", "", record.topic), node("p", "", record.title), node("small", "", "No numerical illustration")); card.append(picture);
      }
      const body = node("div", "queue-card-body"), meta = node("div", "queue-card-meta"); meta.append(node("span", "queue-order", String(index + 1).padStart(2, "0")), node("span", "", record.topic));
      const heading = node("h2"), link = node("a", "", record.title); link.href = record.url; heading.append(link);
      const announcement = node("p", "queue-announcement", record.message), actions = node("div", "queue-card-actions"), label = node("label", "queue-ready" + (record.ready ? " is-ready" : "")), checkbox = node("input"); checkbox.type = "checkbox"; checkbox.checked = record.ready; checkbox.setAttribute("aria-label", "Ready to publish: " + record.title);
      label.append(checkbox, node("span", "", "Ready to publish"));
      checkbox.addEventListener("change", () => {
        draft = draft.slice(0, record.boxOffset) + (checkbox.checked ? "x" : " ") + draft.slice(record.boxOffset + 1);
        record.ready = checkbox.checked; label.classList.toggle("is-ready", record.ready); refreshState();
      });
      const button = node("button", "queue-copy", "Copy announcement"); button.type = "button"; button.addEventListener("click", () => copy(record.message, button));
      const preview = node("a", "", "Read preview ↗"); preview.href = record.url;
      actions.append(label, button, preview); body.append(meta, heading, announcement, actions); card.append(body); cardsRoot.append(card);
    });
    refreshState();
  }
  async function load(file, selectedHandle) {
    if (file.name !== "announcement-queue.md") throw new Error("Choose the original file named announcement-queue.md.");
    const source = await file.text(); parse(source);
    baseline = source; draft = source; handle = selectedHandle || null; render();
    report(handle ? "Current source opened. Save edits explicitly to this file, then ask Codex to review, commit, and push them." : "Current source opened. Use Download Markdown, replace the original file, then ask Codex to commit and push the edits.");
  }
  async function open() {
    if (dirty && !window.confirm("Discard unsaved draft checkboxes and open the current Markdown file?")) return;
    try {
      if (window.showOpenFilePicker) {
        const [selected] = await window.showOpenFilePicker({ multiple: false, types: [{ description: "Blog announcement queue", accept: { "text/markdown": [".md"] } }] });
        await load(await selected.getFile(), selected);
      } else query("[data-file-input]").click();
    } catch (error) { if (error.name !== "AbortError") report(error.message, "error"); }
  }
  async function save() {
    if (!dirty) return;
    try {
      let selected = handle;
      if (!selected) {
        if (!window.showOpenFilePicker) { report("Direct saving is unavailable. Download Markdown, replace blog/announcement-queue.md, then ask Codex to commit and push the edits before the scheduled run.", "warning"); return; }
        [selected] = await window.showOpenFilePicker({ multiple: false, types: [{ description: "Original announcement-queue.md", accept: { "text/markdown": [".md"] } }] });
      }
      let file = await selected.getFile();
      if (file.name !== "announcement-queue.md") throw new Error("Save only to the original announcement-queue.md file.");
      if ((await file.text()) !== baseline) throw new Error("The source changed outside this page. Nothing was written. Open current Markdown again and reapply your checkbox changes.");
      if (selected.queryPermission && (await selected.queryPermission({ mode: "readwrite" })) !== "granted") {
        if ((await selected.requestPermission({ mode: "readwrite" })) !== "granted") throw new Error("Write permission was not granted. Nothing was written.");
      }
      // Recheck after any asynchronous permission prompt before opening the writer.
      file = await selected.getFile();
      if ((await file.text()) !== baseline) throw new Error("The source changed while permission was requested. Nothing was written; reopen the current Markdown.");
      const writable = await selected.createWritable();
      // The file handle API has no cross-process transaction. This extra check also
      // catches edits made while createWritable was opening its temporary writer.
      if ((await (await selected.getFile()).text()) !== baseline) { await writable.abort(); throw new Error("The source changed before writing. Nothing was written; reopen the current Markdown."); }
      await writable.write(draft); await writable.close();
      const saved = await (await selected.getFile()).text();
      if (saved !== draft) throw new Error("The file could not be verified after saving. Reopen and inspect the source before relying on these approvals.");
      baseline = draft; handle = selected; refreshState(); report("Saved to the selected announcement-queue.md. Ask Codex to review, commit, and push these edits before the next scheduled run; uncommitted queue changes can stop publication.");
    } catch (error) { if (error.name !== "AbortError") report(error.message, "error"); }
  }
  function download() {
    if (!dirty) return;
    const blob = new Blob([draft], { type: "text/markdown;charset=utf-8" }), url = URL.createObjectURL(blob), anchor = node("a");
    anchor.href = url; anchor.download = "announcement-queue.md"; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 500);
    report("Downloaded only—not saved to the queue. Replace blog/announcement-queue.md, then ask Codex to review, commit, and push the edits before the next scheduled run. Your draft remains unsaved here.", "warning");
  }
  query("[data-open]").addEventListener("click", open); query("[data-save]").addEventListener("click", save); query("[data-download]").addEventListener("click", download);
  query("[data-file-input]").addEventListener("change", async event => { try { const file = event.target.files[0]; if (file) await load(file, null); } catch (error) { report(error.message, "error"); } finally { event.target.value = ""; } });
  query("[data-close-copy]").addEventListener("click", () => { query("[data-copy-fallback]").hidden = true; });
  [search, readyFilter, topicFilter].forEach(element => { element.disabled = false; element.addEventListener("input", filter); element.addEventListener("change", filter); });
  window.addEventListener("beforeunload", event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
  render(); query("[data-open]").disabled = false; document.documentElement.dataset.queueReady = "true";
}());
