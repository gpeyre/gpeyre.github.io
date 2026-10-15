/* Pure-text blog search. No DOM access, HTML generation, external requests,
 * regular expressions built from queries, or inferred topic aliases.
 *
 * Every query token must occur in a title, keyword, or description.
 * Title matches dominate keyword-only results; description matches are a
 * lower-ranked fallback. Queries exceeding the limits return no results,
 * rather than silently dropping words from the AND query.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BlogSearch = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  const limits = Object.freeze({queryCharacters: 256, queryTokens: 16});
  const exactTokens = new Set(["ot", "kl", "sgd", "w2"]);
  const irregularPlurals = Object.freeze({
    matrices: "matrix", indices: "index", vertices: "vertex",
    analyses: "analysis", hypotheses: "hypothesis", theses: "thesis",
    biases: "bias"
  });
  const weights = {
    title: [0, 9000, 9500, 10000],
    keyword: [0, 90, 95, 100],
    description: [0, 8, 9, 10]
  };

  function normalize(text) {
    return String(text == null ? "" : text)
      .normalize("NFKD").toLowerCase()
      .replace(/\p{M}/gu, "")
      .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function tokens(text) {
    const normalized = normalize(text);
    return normalized ? [...new Set(normalized.split(" "))] : [];
  }

  function singular(word) {
    if (Object.prototype.hasOwnProperty.call(irregularPlurals, word)) {
      return irregularPlurals[word];
    }
    if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
    if (word.length > 4 && /(?:ches|shes|xes|zes|sses)$/.test(word)) {
      return word.slice(0, -2);
    }
    if (word.length > 3 && word.endsWith("s") &&
        !/(?:ss|us|is|as)$/.test(word) && word !== "news") {
      return word.slice(0, -1);
    }
    return word;
  }

  function match(query, word) {
    if (query === word) return 3;
    // These short mathematical acronyms are complete tokens, not prefixes.
    if (exactTokens.has(query)) return 0;
    if (singular(query) === singular(word)) return 2;
    return word.startsWith(query) ? 1 : 0;
  }

  function bestMatch(query, words) {
    let best = 0;
    for (const word of words) {
      best = Math.max(best, match(query, word));
      if (best === 3) break;
    }
    return best;
  }

  function prepare(records) {
    if (!Array.isArray(records)) throw new TypeError("records must be an array");
    return records.map((post, index) => {
      if (!post || typeof post !== "object" || typeof post.title !== "string") {
        throw new TypeError("each record must have a text title");
      }
      if (post.status !== "published" && post.status !== "forthcoming") {
        throw new TypeError("record status must be published or forthcoming");
      }
      const seen = new Set(), keywords = [];
      for (const label of Array.isArray(post.keywords) ? post.keywords : []) {
        if (typeof label !== "string") continue;
        const normalized = normalize(label);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        keywords.push({label, words: tokens(normalized)});
      }
      return {
        post, index, title: normalize(post.title), titleWords: tokens(post.title),
        descriptionWords: tokens(post.description || ""),
        keywords,
        keywordWords: [...new Set(keywords.flatMap(keyword => keyword.words))],
        date: typeof post.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(post.date)
          ? post.date : "",
        url: String(post.url || ""), id: String(post.id || "")
      };
    });
  }

  function compareText(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function comparePosts(a, b) {
    const aStatus = a.post.status === "published" ? 0 : 1;
    const bStatus = b.post.status === "published" ? 0 : 1;
    if (aStatus !== bStatus) return aStatus - bStatus;
    if (aStatus === 0 && a.date !== b.date) return compareText(b.date, a.date);
    return compareText(a.title, b.title) || compareText(a.url, b.url) ||
      compareText(a.id, b.id) || a.index - b.index;
  }

  function search(prepared, query, {status = "all"} = {}) {
    if (!Array.isArray(prepared)) throw new TypeError("prepared records must be an array");
    if (!["all", "published", "forthcoming"].includes(status)) {
      throw new RangeError("status must be all, published, or forthcoming");
    }
    const raw = String(query == null ? "" : query);
    // Check length before normalization, so enormous inputs do not consume work.
    if (raw.length > limits.queryCharacters) return [];
    const queryWords = tokens(raw);
    if (queryWords.length > limits.queryTokens) return [];
    const normalizedQuery = queryWords.join(" ");
    const results = [];
    for (const record of prepared) {
      if (status !== "all" && record.post.status !== status) continue;
      let score = 0, matched = true;
      for (const word of queryWords) {
        const title = bestMatch(word, record.titleWords);
        const keyword = bestMatch(word, record.keywordWords);
        const description = bestMatch(word, record.descriptionWords);
        if (!title && !keyword && !description) {
          matched = false;
          break;
        }
        score += title ? weights.title[title] :
          keyword ? weights.keyword[keyword] : weights.description[description];
      }
      if (!matched) continue;
      if (queryWords.length && normalizedQuery === record.title) score += 2000;
      const matchedKeywords = queryWords.length ? record.keywords
        .filter(keyword => queryWords.some(word => bestMatch(word, keyword.words)))
        .map(keyword => keyword.label) : [];
      results.push({record, score, matchedKeywords});
    }
    results.sort((a,b) => b.score - a.score || comparePosts(a.record, b.record));
    return results.map(result => ({
      post: result.record.post,
      score: result.score,
      matchedKeywords: result.matchedKeywords
    }));
  }

  return Object.freeze({normalize, prepare, search, limits});
});
