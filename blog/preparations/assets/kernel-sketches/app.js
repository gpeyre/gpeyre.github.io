(function(){
  "use strict";
  const V=window.KernelSketchesView,$=id=>document.getElementById(id),keys=["exact","positive","fourier"];
  let p=1,r=64,data=null,busy=true,worker=null,requestId=0,drawFrame=0,computeFrame=0;
  const number=value=>Number.isFinite(value)?Number(value.toPrecision(4)).toString():"not finite";
  const percent=value=>(100*value).toFixed(value>0&&value<.001?3:1)+"%";
  function height(){
    if(window.parent!==window)window.parent.postMessage({type:"ot-experiment-size",topic:"kernel-sketches",height:Math.ceil(document.querySelector("main").getBoundingClientRect().height)+2},location.protocol==="file:"?"*":location.origin);
  }
  function context(canvas){
    const width=canvas.clientWidth,height=canvas.clientHeight,ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    const ctx=canvas.getContext("2d");ctx.scale(ratio,ratio);return {ctx,width,height};
  }
  function draw(){
    for(const key of keys){const {ctx,width,height}=context($("plot-"+key));if(width>50)V.draw(ctx,width,height,busy?null:data?.[key],data?.size||129);}
    const scale=context($("colorbar"));if(scale.width>50)V.drawScale(scale.ctx,scale.width,scale.height);
    height();
  }
  function scheduleDraw(){cancelAnimationFrame(drawFrame);drawFrame=requestAnimationFrame(draw);}
  function labels(){
    $("power-value").textContent=p.toFixed(2);$("power").setAttribute("aria-valuetext","p = "+p.toFixed(2));
    $("sketches-value").textContent=r.toLocaleString("en-US");$("sketches").setAttribute("aria-valuetext",r+" real-valued features");
    $("plots").setAttribute("aria-busy",String(busy));
  }
  function resultText(){
    for(const key of keys){
      const stats=data.stats[key];
      $("stats-"+key).textContent="min "+number(stats.min)+" · max "+number(stats.max)+(key==="exact"?"":" · RMSE "+number(stats.rmse))+" · negative grid values "+percent(stats.negativeFraction);
      $("plot-"+key).setAttribute("aria-label",$("title-"+key).textContent+" for p = "+p.toFixed(2)+" and "+r+" features. "+$("stats-"+key).textContent+". Fixed axes from minus two to two; fixed color range minus two to two.");
    }
    const saturated=keys.filter(key=>data.stats[key].saturatedFraction>0);
    $("saturation").textContent=saturated.length?"Color saturation outside [−2,2]: "+saturated.map(key=>$("title-"+key).textContent+" "+percent(data.stats[key].saturatedFraction)+" of grid points").join("; ")+". The reported values and errors still use the unclipped sketches.":"All displayed grid values are inside the fixed color range [−2,2].";
    $("status").textContent="p = "+p.toFixed(2)+" · r = "+r.toLocaleString("en-US")+" features in each sketch · fixed random seed 42";
  }
  function compute(){
    const id=++requestId;if(worker)worker.terminate();
    busy=true;data=null;labels();$("status").textContent="Computing p = "+p.toFixed(2)+" with "+r.toLocaleString("en-US")+" features…";$("saturation").textContent="";scheduleDraw();
    try{worker=new Worker("worker.js");}
    catch(error){fail(id,"This browser could not start the numerical worker. Open the preview over HTTP and reload.");return;}
    worker.onmessage=event=>{
      if(event.data.id!==requestId)return;
      if(event.data.error){fail(id,event.data.error);return;}
      data=event.data.result;busy=false;worker.terminate();worker=null;labels();resultText();scheduleDraw();
    };
    worker.onerror=()=>fail(id,"The numerical computation could not load. Please reload this page.");
    worker.postMessage({id,p,r});
  }
  function fail(id,message){if(id!==requestId)return;if(worker)worker.terminate();worker=null;busy=false;data=null;labels();$("status").textContent=message;height();}
  function change(){
    p=Number($("power").value);r=2**Number($("sketches").value);
    // Invalidate immediately; a previous worker may finish before the next frame.
    requestId++;if(worker){worker.terminate();worker=null;}busy=true;data=null;labels();
    $("status").textContent="Updating p = "+p.toFixed(2)+" with "+r.toLocaleString("en-US")+" features…";$("saturation").textContent="";
    cancelAnimationFrame(computeFrame);computeFrame=requestAnimationFrame(compute);scheduleDraw();
  }
  $("power").addEventListener("input",change);$("sketches").addEventListener("input",change);
  window.addEventListener("resize",scheduleDraw);
  window.addEventListener("message",event=>{if(event.source===window.parent&&(event.origin===location.origin||event.origin==="null")&&event.data?.type==="ot-experiment-measure")height();});
  if(window.ResizeObserver)new ResizeObserver(()=>{scheduleDraw();}).observe(document.querySelector("main"));
  window.addEventListener("pagehide",()=>{if(worker)worker.terminate();cancelAnimationFrame(drawFrame);cancelAnimationFrame(computeFrame);});
  window.KernelSketchesApp=Object.freeze({
    getState:()=>({p,r,ready:!!data&&!busy,busy,size:129,domain:[-2,2],colorRange:[-2,2],stats:data?.stats||null}),
    getData:()=>busy?null:data,
    getDisplayedState:()=>busy||!data?null:{p:data.p,r:data.r}
  });
  labels();compute();
})();
