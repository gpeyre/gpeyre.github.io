/* Only the three experiments using stored trajectories need the data bundle. */
(function () {
  "use strict";
  const topic = new URLSearchParams(location.search).get("topic") || "weak";
  window.BLOG_DATA = {};
  function load(name, done) {
    const script = document.createElement("script");
    script.src = name;
    script.onload = done;
    script.onerror = () => {
      document.getElementById("status").textContent = "The experiment could not load. Please reload this page.";
    };
    document.body.appendChild(script);
  }
  const start = () => load("app.js", () => {});
  if (topic === "gaussian") { load("../gaussian-sinkhorn-core.js", start); return; }
  const computed = ["monge", "moments", "caps", "composition", "cdf", "matchings", "bernstein", "quantization", "independence", "envelope"];
  if (computed.includes(topic)) start();
  else load("data.js", start); // Unknown selections fall back to weak transport.
})();
