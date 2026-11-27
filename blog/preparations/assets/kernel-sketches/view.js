/* Fixed-scale heatmaps and bilinear marching-squares contours. No chart library. */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.KernelSketchesView=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const domain=Object.freeze([-2,2]),colorRange=Object.freeze([-2,2]);
  const levels=Object.freeze([-1,-.5,-.25,0,.25,.5,.75,1,1.5]);
  const stops=[[37,88,140],[247,248,245],[186,76,37]];
  function color(value){
    const t=Math.max(-1,Math.min(1,value/2));
    const a=stops[1],b=t<0?stops[0]:stops[2],u=Math.abs(t);
    return a.map((v,i)=>Math.round(v+(b[i]-v)*u));
  }
  function layout(width,height){
    const side=Math.max(12,Math.min(width-53,height-50));
    const left=37+(width-53-side)/2,top=10;
    return {left,top,side,right:left+side,bottom:top+side};
  }
  function canvasFor(width,height){const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;return canvas;}
  function contour(ctx,values,size,level,box){
    const step=box.side/(size-1);
    const vertex=(i,j)=>[box.left+i*step,box.bottom-j*step];
    const add=(a,b)=>{ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);};
    for(let j=0;j<size-1;j++)for(let i=0;i<size-1;i++){
      const p=[vertex(i,j+1),vertex(i+1,j+1),vertex(i+1,j),vertex(i,j)];
      const v=[values[(j+1)*size+i],values[(j+1)*size+i+1],values[j*size+i+1],values[j*size+i]];
      const hits=[];
      for(let e=0;e<4;e++){
        const f=(e+1)%4;
        if((v[e]<level)===(v[f]<level))continue;
        const t=(level-v[e])/(v[f]-v[e]);
        hits.push([p[e][0]+t*(p[f][0]-p[e][0]),p[e][1]+t*(p[f][1]-p[e][1])]);
      }
      if(hits.length===2)add(hits[0],hits[1]);
      else if(hits.length===4){
        // The bilinear asymptotic decider resolves ambiguous saddle cells.
        const q=(v[0]-level)*(v[2]-level)-(v[1]-level)*(v[3]-level);
        if(q>0){add(hits[0],hits[1]);add(hits[2],hits[3]);}
        else if(q<0){add(hits[0],hits[3]);add(hits[1],hits[2]);}
        else {add(hits[0],hits[2]);add(hits[1],hits[3]);}
      }
    }
  }
  function draw(ctx,width,height,values,size,createCanvas=canvasFor){
    const box=layout(width,height);
    ctx.clearRect(0,0,width,height);ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);
    if(values){
      const raster=createCanvas(size,size),rc=raster.getContext("2d"),pixels=rc.createImageData(size,size);
      for(let row=0;row<size;row++)for(let col=0;col<size;col++){
        const rgb=color(values[(size-1-row)*size+col]),k=4*(row*size+col);
        pixels.data[k]=rgb[0];pixels.data[k+1]=rgb[1];pixels.data[k+2]=rgb[2];pixels.data[k+3]=255;
      }
      rc.putImageData(pixels,0,0);ctx.save();ctx.beginPath();ctx.rect(box.left,box.top,box.side,box.side);ctx.clip();
      ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,box.left,box.top,box.side,box.side);
      for(const level of levels){
        ctx.beginPath();contour(ctx,values,size,level,box);
        ctx.strokeStyle=level===0?"rgba(36,53,64,.92)":"rgba(61,67,67,.48)";
        ctx.lineWidth=level===0?1.5:.7;ctx.stroke();
      }
      ctx.restore();
    }else{
      ctx.fillStyle="#f3f6f6";ctx.fillRect(box.left,box.top,box.side,box.side);
      ctx.fillStyle="#687c86";ctx.font="12px system-ui,sans-serif";ctx.textAlign="center";
      ctx.fillText("Computing…",box.left+box.side/2,box.top+box.side/2);
    }
    ctx.strokeStyle="#9bb0b7";ctx.lineWidth=1;ctx.strokeRect(box.left,box.top,box.side,box.side);
    ctx.font="12px system-ui,sans-serif";ctx.fillStyle="#536b76";
    for(const tick of [-2,-1,0,1,2]){
      const x=box.left+(tick+2)*box.side/4,y=box.bottom-(tick+2)*box.side/4;
      ctx.textAlign="center";ctx.fillText(String(tick),x,box.bottom+18);
      ctx.textAlign="right";ctx.fillText(String(tick),box.left-7,y+4);
    }
    ctx.font="italic 13px Georgia,serif";ctx.textAlign="center";
    ctx.fillText("x",box.left+box.side/2,box.bottom+35);
    ctx.save();ctx.translate(11,box.top+box.side/2);ctx.rotate(-Math.PI/2);ctx.fillText("y",0,0);ctx.restore();
    return box;
  }
  function drawScale(ctx,width,height){
    const left=22,right=width-22,y=5,h=13;
    ctx.clearRect(0,0,width,height);
    for(let i=0;i<400;i++){ctx.fillStyle="rgb("+color(-2+4*(i+.5)/400).join(",")+")";ctx.fillRect(left+i*(right-left)/400,y,(right-left)/400+1,h);}
    ctx.strokeStyle="#b0bdc3";ctx.lineWidth=.7;ctx.strokeRect(left,y,right-left,h);
    ctx.font="12px system-ui,sans-serif";ctx.fillStyle="#536b76";ctx.textAlign="center";
    for(const tick of [-2,-1,0,1,2]){const x=left+(tick+2)*(right-left)/4;ctx.fillText(tick<0?"−"+(-tick):String(tick),x,38);}
  }
  return Object.freeze({domain,colorRange,levels,color,layout,draw,drawScale});
});
