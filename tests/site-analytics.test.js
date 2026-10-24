"use strict";

// No network is involved: only the small first-party loader executes. The
// third-party script is represented by a DOM node and is never downloaded.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const filename = path.join(__dirname, "../js/site-analytics.js");
const source = fs.readFileSync(filename, "utf8");

function fixture(options = {}) {
    const location = new URL(options.url || "https://www.gpeyre.com/blog/2026/10/24/example/?token=private#proof");
    const nodes = [], appended = [];
    const storage = options.storage || {};
    const context = {
        URL, location,
        navigator: { ...options.navigator },
        doNotTrack: options.doNotTrack,
        console,
        fetch() { throw new Error("The loader must not make a direct network request"); },
        XMLHttpRequest() { throw new Error("The loader must not make a direct network request"); }
    };
    context.window = context;
    context.self = context;
    context.top = options.embedded ? {} : context;
    context.navigator.sendBeacon = () => { throw new Error("The loader must not send a direct beacon"); };
    if (options.storageThrows) {
        Object.defineProperty(context, "localStorage", {
            get() { throw new Error("Storage is disabled"); }
        });
    } else {
        context.localStorage = {
            getItem(key) {
                if (options.storageReadThrows) throw new Error("Storage is inaccessible");
                return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
            }
        };
    }
    function node(tagName) {
        return {
            tagName: tagName.toUpperCase(), attributes: {}, dataset: {},
            setAttribute(name, value) {
                this.attributes[name] = String(value);
                if (name === "id" || name === "src") this[name] = String(value);
                if (name.startsWith("data-")) {
                    this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
                }
            },
            getAttribute(name) {
                if (name === "id" || name === "src") return this[name] || null;
                return this.attributes[name] ?? null;
            }
        };
    }
    const refresh = options.refresh ? node("meta") : null;
    const heading = options.noHeading ? null : { textContent: options.heading || "  Example article  " };
    if (refresh) refresh.setAttribute("http-equiv", "refresh");
    const appendChild = element => {
        nodes.push(element);
        appended.push({ element, config: context.goatcounter });
        return element;
    };
    context.document = {
        location, referrer: options.referrer || "", readyState: "complete", title: "Site title fallback",
        head: { appendChild }, body: { appendChild }, documentElement: { appendChild },
        createElement: node,
        getElementById: id => nodes.find(item => item.id === id) || null,
        querySelector(selector) {
            if (selector === "h1") return heading;
            if (/http-equiv/i.test(selector) && /refresh/i.test(selector)) return refresh;
            if (selector.startsWith("#")) return nodes.find(item => item.id === selector.slice(1)) || null;
            if (/data-goatcounter/.test(selector)) return nodes.find(item => item.getAttribute("data-goatcounter")) || null;
            return null;
        },
        querySelectorAll(selector) {
            if (selector === "meta[http-equiv]") return refresh ? [refresh] : [];
            return nodes.filter(item => selector === "script" && item.tagName === "SCRIPT");
        },
        getElementsByTagName(tagName) {
            if (tagName.toLowerCase() === "meta") return refresh ? [refresh] : [];
            return nodes.filter(item => item.tagName.toLowerCase() === tagName.toLowerCase());
        }
    };
    if (options.existingScript) {
        const script = node("script");
        script.id = "site-goatcounter";
        nodes.push(script);
    }
    vm.createContext(context);
    return { context, nodes, appended, run() { vm.runInContext(source, context, { filename }); } };
}

function configuredValue(config, key) {
    return typeof config[key] === "function" ? config[key]({}) : config[key];
}

function tracked(options = {}) {
    const browser = fixture(options);
    assert.doesNotThrow(() => browser.run());
    assert.equal(browser.appended.length, 1, "One script should be loaded on an eligible visit");
    const { element, config } = browser.appended[0];
    assert.equal(element.tagName, "SCRIPT");
    assert.equal(element.id, "site-goatcounter");
    assert.equal(element.async, true);
    assert.equal(element.src, "https://gc.zgo.at/count.js");
    assert.equal(element.getAttribute("data-goatcounter"), "https://gpeyre.goatcounter.com/count");
    assert.ok(config, "Privacy configuration must exist before the script is appended");
    assert.equal(config.no_events, true, "Do not collect automatic click events");
    assert.equal(configuredValue(config, "path"), browser.context.location.pathname.replace(/\/index\.html$/, "/"),
        "Only the pathname may be sent, never query parameters or fragments");
    return browser;
}

function ignored(options, reason) {
    const browser = fixture(options);
    assert.doesNotThrow(() => browser.run(), reason);
    assert.equal(browser.appended.length, 0, reason);
}

for (const origin of ["https://www.gpeyre.com", "https://gpeyre.com", "http://www.gpeyre.com", "http://gpeyre.com"]) {
    tracked({ url: origin + "/blog/?search=private#section" });
}
for (const pathname of ["/", "/index.html", "/book/", "/project/", "/blog/", "/blog/index.html", "/blog/preparations/", "/blog/preparations/hump-algebra.html"]) {
    tracked({ url: "https://www.gpeyre.com" + pathname });
}
for (const url of [
    "http://localhost:4173/blog/", "http://127.0.0.1:4192/blog/", "http://[::1]/blog/",
    "file:///Users/example/site/blog/index.html", "https://example.com/", "https://gpeyre.github.io/",
    "https://gpeyre.com.example.org/", "https://preview.gpeyre.com/", "ftp://gpeyre.com/blog/"
]) ignored({ url }, "Local previews and unapproved origins must not be counted: " + url);
ignored({ embedded: true }, "Embedded numerical experiments must not cause an extra page view");
ignored({ refresh: true }, "Redirect pages must not be counted before their destination");
for (const pathname of [
    "/blog/preparations/assets/hump-algebra/index.html", "/blog/preparations/assets/",
    "/blog/announcement-queue.html", "/blog/announcement-queue/", "/blog/announcement-queue.md",
    "/blog/published.md", "/blog/publication-log.json", "/blog/ideas/idea.html", "/scripts/test.html", "/tests/test.html"
]) ignored({ url: "https://www.gpeyre.com" + pathname }, "Do not count experimental or editorial pages: " + pathname);

// Do not attach sensitive referrer paths, queries or fragments to a visit.
for (const [referrer, expected] of [
    ["", ""], ["not a URL", ""], ["file:///private/document.html", ""],
    ["javascript:alert(1)", ""], ["https://www.gpeyre.com/blog/?search=private", ""],
    ["https://gpeyre.com/book/#private", ""], ["http://gpeyre.com/blog/", ""],
    ["https://bsky.app/profile/person/post/private?token=secret#hidden", "https://bsky.app"],
    ["https://www.google.com/search?q=private", "https://www.google.com"],
    ["http://example.org:8080/private?token=secret", "http://example.org:8080"]
]) {
    const browser = tracked({ referrer });
    assert.equal(configuredValue(browser.context.goatcounter, "referrer"), expected,
        "Referrer must be an external HTTP(S) origin only: " + referrer);
}

for (const value of ["1", "true", "", "0"]) {
    ignored({ storage: { "goatcounter-ignore": value } }, "Presence of the local opt-out must be respected");
}
ignored({ storageThrows: true }, "If the opt-out setting cannot be checked, do not track");
ignored({ storageReadThrows: true }, "If reading the opt-out setting fails, do not track");
ignored({ navigator: { globalPrivacyControl: true } }, "Honor Global Privacy Control");
for (const value of ["1", "yes"]) {
    ignored({ navigator: { doNotTrack: value } }, "Honor navigator Do Not Track");
}
ignored({ doNotTrack: "1" }, "Honor legacy window Do Not Track");
ignored({ navigator: { msDoNotTrack: "1" } }, "Honor legacy Microsoft Do Not Track");
tracked({ navigator: { doNotTrack: "0", globalPrivacyControl: false } });

assert.equal(configuredValue(tracked().context.goatcounter, "title"), "Example article");
assert.equal(configuredValue(tracked({ noHeading: true }).context.goatcounter, "title"), "Site title fallback");

const repeated = tracked();
repeated.run();
assert.equal(repeated.appended.length, 1, "Repeated execution must not load the tracker twice");
ignored({ existingScript: true }, "An existing tracker script must not be duplicated");

console.log("Site analytics: production-only loading, single page views, minimized URLs, opt-outs, and no-network VM checks pass.");
