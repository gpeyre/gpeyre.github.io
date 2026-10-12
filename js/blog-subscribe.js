/* Progressive enhancement: feed links and instructions also work without JS. */
(function () {
    "use strict";

    document.querySelectorAll(".blog-subscription").forEach(function (subscription) {
        var button = subscription.querySelector("[data-copy-feed]");
        var field = subscription.querySelector("input[data-feed-url]");
        var details = subscription.querySelector("details");
        var status = subscription.querySelector("[data-copy-status]");
        if (!button || !field || !details || !status) return;

        var label = button.textContent;
        var resetTimer;
        field.addEventListener("click", function () { field.select(); });

        button.addEventListener("click", async function () {
            window.clearTimeout(resetTimer);
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
            button.textContent = label;
            status.textContent = "";
            try {
                // Call directly during the click: Safari requires user activation.
                if (!navigator.clipboard || !navigator.clipboard.writeText) {
                    throw new Error("Clipboard copying is unavailable");
                }
                await navigator.clipboard.writeText(button.dataset.feedUrl);
                button.textContent = "Copied!";
                status.textContent = "RSS feed URL copied. Paste it into your RSS reader.";
                resetTimer = window.setTimeout(function () { button.textContent = label; }, 3000);
            } catch (error) {
                // Respect clipboard denial: reveal a manual copy option instead.
                details.open = true;
                field.focus();
                field.select();
                field.setSelectionRange(0, field.value.length);
                status.textContent = "Automatic copying is unavailable. The URL is selected below: press Command+C on Mac or Ctrl+C on Windows/Linux.";
            } finally {
                button.disabled = false;
                button.removeAttribute("aria-busy");
            }
        });
        button.hidden = false;
    });
}());
