/* Recompute equation widths when a native proof disclosure is opened. */
(function () {
    "use strict";
    document.querySelectorAll("details.blog-proof").forEach(function (proof) {
        proof.addEventListener("toggle", function () {
            if (!proof.open) return;
            proof.setAttribute("aria-busy", "true");
            window.requestAnimationFrame(function () {
                const hub = window.MathJax && window.MathJax.Hub;
                const done = function () { proof.removeAttribute("aria-busy"); };
                if (hub) hub.Queue(["Rerender", hub, proof], done);
                else done();
            });
        });
    });
}());
