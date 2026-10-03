/* Exact OT solves and certified assignment envelopes away from the UI thread. */
"use strict";
importScripts("blog-math.js");
let cachedSeed = null;
const curves = new Map();
const samples = new Map(), pendingCurves = new Map(), scenes = new Map();
let generation = 0, sceneJob = 0;
self.onmessage = function ({ data }) {
    const { type, job, seed } = data;
    if (seed !== cachedSeed) {
        curves.clear(); samples.clear(); pendingCurves.clear(); scenes.clear(); cachedSeed = seed;
    }
    const token = ++generation;
    const sampleAt = count => {
        if (!samples.has(count)) samples.set(count, BlogMath.inverseOTSample(count, seed));
        return samples.get(count);
    };
    if (type === "scene") {
        sceneJob = job;
        setTimeout(() => {
            if (job !== sceneJob || token !== generation) return;
            try {
                const { count, theta } = data, sample = sampleAt(count);
                const previous = scenes.get(count);
                const scene = BlogMath.inverseOTGap(sample, theta, previous ? previous.matching : sample.referenceMatching);
                scenes.set(count, scene);
                self.postMessage({ type, job, seed, count, sample, scene });
            } catch (error) { self.postMessage({ type, job, error: error.message }); }
        }, 0);
        return;
    }
    const { counts } = data;
    let index = 0;
    function advance() {
        if (token !== generation || index === counts.length) return;
        const count = counts[index];
        try {
            if (curves.has(count)) {
                self.postMessage({ type: "curve", job, seed, count, curve: curves.get(count) });
                index++; setTimeout(advance, 0); return;
            }
            if (!pendingCurves.has(count)) {
                // 10^-3 in mean gap is below the visible line width. Each
                // oracle value and assignment is still an exact OT solve.
                const maxError = count > 200 ? 1e-3 : 1e-10;
                pendingCurves.set(count, BlogMath.inverseOTCurveSteps(sampleAt(count), 0.2, 2.6, maxError));
            }
            const step = pendingCurves.get(count).next();
            if (step.done) {
                curves.set(count, step.value); pendingCurves.delete(count);
                self.postMessage({ type: "curve", job, seed, count, curve: step.value });
                index++;
            }
            // Yield between OT solves so a new size/seed request can cancel or
            // reprioritize this trace, rather than queue behind an old curve.
            setTimeout(advance, 0);
        } catch (error) {
            self.postMessage({ type: "curve", job, error: error.message });
        }
    }
    setTimeout(advance, 0);
};
