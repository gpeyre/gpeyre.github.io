/* Match an embedded experiment's height, including mobile control wrapping. */
(function () {
  "use strict";
  const frames = Array.from(document.querySelectorAll("iframe.idea-experiment"));
  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || data.type !== "ot-experiment-size" || !Number.isFinite(data.height)) return;
    const frame = frames.find(node => node.contentWindow === event.source);
    if (!frame || (event.origin !== location.origin && event.origin !== "null")) return;
    if (data.topic !== frame.dataset.experiment) return;
    frame.style.height = Math.ceil(Math.max(350, Math.min(4500, data.height))) + "px";
    frame.dataset.ready = "true";
  });
  frames.forEach(frame => frame.addEventListener("load", () => {
    frame.contentWindow.postMessage({type: "ot-experiment-measure"}, location.protocol === "file:" ? "*" : location.origin);
  }));
})();
