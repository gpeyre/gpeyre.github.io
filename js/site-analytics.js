(function () {
    "use strict";

    // Load audience measurement only on the public website, never in previews
    // served locally or in embedded numerical experiments.
    function isSite(hostname) {
        return hostname === "www.gpeyre.com" || hostname === "gpeyre.com";
    }
    if (!/^https?:$/.test(window.location.protocol) || !isSite(window.location.hostname)) return;
    if (window.self !== window.top) return;
    if (document.querySelector('meta[http-equiv="refresh" i]')) return;
    if (document.getElementById("site-goatcounter")) return;

    var path = window.location.pathname.replace(/\/index\.html$/, "/");
    if (/^\/(?:blog\/(?:preparations\/assets(?:\/|$)|announcement-queue(?:\.html|\.md|\/|$)|published\.md$|publication-log\.json$|ideas(?:\/|$))|scripts(?:\/|$)|tests(?:\/|$))/.test(path)) return;

    function doNotTrack(value) { return value === "1" || value === "yes"; }
    if (navigator.globalPrivacyControl === true || doNotTrack(navigator.doNotTrack) ||
        doNotTrack(navigator.msDoNotTrack) || doNotTrack(window.doNotTrack)) return;
    try {
        if (window.localStorage.getItem("goatcounter-ignore") !== null) return;
    } catch (_) {
        // If a saved opt-out cannot be checked, err on the side of privacy.
        return;
    }

    // Never send search queries, fragments, or an external referring page's path.
    var referrer = "";
    try {
        var source = new URL(document.referrer);
        if (/^https?:$/.test(source.protocol) && !isSite(source.hostname)) referrer = source.origin;
    } catch (_) { /* Empty or invalid referrer. */ }
    var heading = document.querySelector("h1");
    window.goatcounter = {
        no_events: true,
        path: path,
        title: heading && heading.textContent.trim() || document.title,
        referrer: referrer
    };
    var script = document.createElement("script");
    script.id = "site-goatcounter";
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.setAttribute("data-goatcounter", "https://gpeyre.goatcounter.com/count");
    document.head.appendChild(script);
}());
