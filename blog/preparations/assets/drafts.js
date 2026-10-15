(function () {
    "use strict";
    function reflow(node) {
        node.setAttribute("aria-busy", "true");
        requestAnimationFrame(function () {
            var hub = window.MathJax && window.MathJax.Hub;
            var done = function () { node.removeAttribute("aria-busy"); };
            if (hub) hub.Queue(["Rerender", hub, node], done);
            else done();
        });
    }
    document.querySelectorAll("details.blog-proof").forEach(function (proof) {
        proof.addEventListener("toggle", function () { if (proof.open) reflow(proof); });
    });
    function revealTarget() {
        var id;
        try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
        var target = id && document.getElementById(id);
        if (!target) return;
        var parent = target.parentElement;
        while (parent) { if (parent.matches("details")) parent.open = true; parent = parent.parentElement; }
    }
    window.addEventListener("hashchange", revealTarget);
    revealTarget();
}());
