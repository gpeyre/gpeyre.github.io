"use strict";
importScripts("core.js");
self.onmessage=function(event){
  const request=event.data;
  try{
    const result=self.KernelSketches.compute(request.p,request.r,{size:129,seed:42});
    self.postMessage({id:request.id,result});
  }catch(error){self.postMessage({id:request.id,error:String(error.message||error)});}
};
