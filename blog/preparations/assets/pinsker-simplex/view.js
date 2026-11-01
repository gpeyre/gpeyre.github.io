/* Shared by the real interactive experiment and its social-summary renderer. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.PinskerSimplexView=factory(root.PinskerSimplex);})(typeof globalThis!=='undefined'?globalThis:this,function(M){
  'use strict';
  const stops=[[248,250,242],[188,224,203],[84,173,171],[34,111,145],[35,55,91]];
  function color(t){t=Math.max(0,Math.min(1,t));const a=Math.min(3,Math.floor(4*t)),s=4*t-a;return stops[a].map((x,i)=>Math.round(x+(stops[a+1][i]-x)*s));}
  function layout(width,height){const side=Math.max(30,Math.min(width-48,(height-93)/M.HEIGHT));return{left:(width-side)/2,top:23,side,bottom:23+side*M.HEIGHT};}
  function draw(ctx,width,height,state,key,createCanvas){
    const box=layout(width,height),{left,top,side,bottom}=box,{fields,p}=state,size=fields.size,data=fields[key],max=Math.max(1e-10,fields.max[key]);
    ctx.clearRect(0,0,width,height);
    const raster=createCanvas(size,size),rc=raster.getContext('2d'),pixels=rc.createImageData(size,size);
    for(let k=0;k<data.length;k++)if(Number.isFinite(data[k])){const c=color(data[k]/max);pixels.data.set([c[0],c[1],c[2],255],4*k);}
    rc.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;
    ctx.save();ctx.beginPath();ctx.moveTo(left,bottom);ctx.lineTo(left+side,bottom);ctx.lineTo(left+side/2,top);ctx.closePath();ctx.clip();ctx.drawImage(raster,left,top,side,side*M.HEIGHT);
    ctx.lineWidth=.8;ctx.strokeStyle='rgba(15,55,70,.42)';
    for(const fraction of [.2,.4,.6,.8]){
      const level=max*fraction;ctx.beginPath();
      function triangle(points){const hits=[];for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3];if(!Number.isFinite(a[2])||!Number.isFinite(b[2])||(a[2]<level)===(b[2]<level))continue;const s=(level-a[2])/(b[2]-a[2]);hits.push([a[0]+s*(b[0]-a[0]),a[1]+s*(b[1]-a[1])]);}if(hits.length===2){ctx.moveTo(left+side*hits[0][0]/(size-1),top+side*M.HEIGHT*hits[0][1]/(size-1));ctx.lineTo(left+side*hits[1][0]/(size-1),top+side*M.HEIGHT*hits[1][1]/(size-1));}}
      for(let r=0;r<size-1;r++)for(let c=0;c<size-1;c++){const k=r*size+c,a=[c,r,data[k]],b=[c+1,r,data[k+1]],d=[c,r+1,data[k+size]],e=[c+1,r+1,data[k+size+1]];triangle([a,b,e]);triangle([a,e,d]);}ctx.stroke();
    }
    const pos=M.point(p),px=left+side*pos.x,py=bottom-side*pos.y;ctx.beginPath();ctx.arc(px,py,5,0,2*Math.PI);ctx.fillStyle='#c2694c';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();ctx.restore();
    ctx.beginPath();ctx.moveTo(left,bottom);ctx.lineTo(left+side,bottom);ctx.lineTo(left+side/2,top);ctx.closePath();ctx.strokeStyle='#a9bfc2';ctx.lineWidth=1;ctx.stroke();
    ctx.font='11px system-ui,sans-serif';ctx.fillStyle='#546b73';ctx.textAlign='center';ctx.fillText('(1,0,0)',left,bottom+19);ctx.fillText('(0,1,0)',left+side,bottom+19);ctx.fillText('(0,0,1)',left+side/2,top-9);
    const bar=bottom+34;for(let i=0;i<100;i++){ctx.fillStyle='rgb('+color(i/99).join(',')+')';ctx.fillRect(left+side*i/100,bar,side/100+1,6);}
    ctx.fillStyle='#546b73';ctx.textAlign='left';ctx.fillText('0',left,bar+21);ctx.textAlign='right';ctx.fillText(max.toFixed(3),left+side,bar+21);ctx.textAlign='center';ctx.fillText(key==='tv'?'total variation':'nats',left+side/2,bar+21);
    return box;
  }
  return{color,layout,draw};
});
