"use strict";
importScripts("../ot-lab/core.js","core.js");
self.onmessage=function(event){const{mode,width,tau}=event.data;try{const M=TransportGeometry,d=M.data(mode,width);let state={C:d.C,D:d.D,residual:0,change:null};self.postMessage({type:"state",index:0,state});for(let i=1;i<=16;i++){state=M.cycle(state,d,tau);self.postMessage({type:"state",index:i,state});}self.postMessage({type:"done"});}catch(error){self.postMessage({type:"error",message:error.message});}};
