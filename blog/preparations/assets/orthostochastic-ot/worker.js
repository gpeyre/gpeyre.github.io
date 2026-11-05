"use strict";
importScripts("core.js?v=orthostochastic-v1");
self.onmessage = event => {
  const {id, options} = event.data;
  try {
    const result = OrthostochasticOT.run(options);
    self.postMessage({id, result});
  } catch (error) { self.postMessage({id, error: error.message}); }
};
