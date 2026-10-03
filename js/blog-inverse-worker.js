/* Trace exact assignment envelopes away from the UI thread. */
"use strict";
importScripts("blog-math.js");
let cachedSeed = null;
const curves = new Map();
self.onmessage = function ({ data }) {
    const { job, seed, counts } = data;
    try {
        if (seed !== cachedSeed) { curves.clear(); cachedSeed = seed; }
        counts.forEach(count => {
            if (!curves.has(count)) curves.set(count, BlogMath.inverseOTCurve(BlogMath.inverseOTSample(count, seed)));
            self.postMessage({ job, seed, count, curve: curves.get(count) });
        });
    } catch (error) {
        self.postMessage({ job, error: error.message });
    }
};
