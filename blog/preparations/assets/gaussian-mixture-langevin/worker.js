"use strict";
importScripts("../banana-langevin/core.js", "core.js");
self.onmessage = event => {
  const { id, k, spread } = event.data;
  try {
    const result = MixtureLangevin.run(k, spread);
    const buffers = [result.target.buffer, result.times.buffer, result.entropies.buffer,
      result.totalVariations.buffer, ...result.snapshots.map(density => density.buffer)];
    self.postMessage({ id, result }, buffers);
  } catch (error) { self.postMessage({ id, error: error.message }); }
};
