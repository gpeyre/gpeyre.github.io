"use strict";
importScripts("core.js");
self.onmessage = event => {
  const { id, bend } = event.data;
  try {
    const result = BananaLangevin.run(bend);
    const transfers = [result.target.buffer, result.times.buffer, result.entropies.buffer,
      result.leftMass.buffer, ...result.snapshots.map(d => d.buffer)];
    self.postMessage({ id, result }, transfers);
  } catch (error) { self.postMessage({ id, error: error.message }); }
};
