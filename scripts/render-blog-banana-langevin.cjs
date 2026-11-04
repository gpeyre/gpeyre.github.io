/* Reproduce the article's numerical density renderer as a summary and H.264 video.
   Usage: node scripts/render-blog-banana-langevin.cjs --summary PATH [--video PATH]
   No browser recording or stochastic point-cloud substitute is used. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),{spawn}=require("node:child_process"),{once}=require("node:events");
const M=require("../blog/preparations/assets/banana-langevin/core.js"),V=require("../blog/preparations/assets/banana-langevin/view.js");
const {stripMetadata,dimensions}=require("./blog-summary-jpeg.cjs");
let library;try{library=require(process.env.BLOG_CANVAS_PATH||"@napi-rs/canvas");}catch(_){library=require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas");}
const {createCanvas}=library;
function flag(name){const i=process.argv.indexOf(name);if(i<0)return null;if(!process.argv[i+1]||process.argv[i+1].startsWith("--"))throw new Error(name+" requires a destination");return path.resolve(process.argv[i+1]);}
const summary=flag("--summary"),video=flag("--video");if(!summary&&!video)throw new Error("Specify --summary and/or --video with explicit output paths");
const runs=[M.run(0),M.run(4)],colors=["#127d86","#c55e39"];
const settings={bends:[0,4],time:4,nx:M.defaults.nx,ny:M.defaults.ny,dt:M.defaults.dt,a:M.defaults.a,domain:V.domain,renderer:"shared banana-langevin core.js and view.js, native canvas comparison layout"};
function text(ctx,t,x,y,size=18,weight=400,color="#243d49"){ctx.font=weight+" "+size+"px sans-serif";ctx.fillStyle=color;ctx.fillText(t,x,y);}
function comparison(canvas,t,includeHistory){
  const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,scale=w/1080;ctx.save();ctx.scale(scale,scale);
  const height=h/scale;ctx.fillStyle="#fafbf9";ctx.fillRect(0,0,1080,height);
  text(ctx,"LANGEVIN DIFFUSION",36,35,13,600,"#127d86");
  text(ctx,"Bending the route to equilibrium",36,79,35,600);
  text(ctx,"Same isotropic noise · same initial KL = 1.125 · no time rescaling",37,112,17,400,"#617782");
  text(ctx,"t = "+t.toFixed(2),885,78,28,500);
  const panelsY=153,plotHeight=includeHistory?620:510;
  runs.forEach((result,k)=>{
    const x=28+k*526,state=M.sample(result,t);text(ctx,k?"Strongly bent · b = 4":"Unbent Gaussian · b = 0",x+18,panelsY,21,600,colors[k]);
    text(ctx,"KL = "+V.number(state.entropy),x+18,panelsY+28,18,500,colors[k]);
    const plot=createCanvas(500,plotHeight);V.drawDensity(plot.getContext("2d"),500,plotHeight,result.grid,state.density,{bend:result.bend,targetContours:true,createCanvas});ctx.drawImage(plot,x,panelsY+38);
    const b=M.lsiBounds(result.bend);text(ctx,k?b.lower.toFixed(3)+" ≤ best LSI constant ≤ "+b.upper.toFixed(3):"Best log-Sobolev constant = 1",x+36,panelsY+plotHeight+69,14,400,"#617782");
  });
  if(includeHistory){
    const chartY=861; text(ctx,"RELATIVE ENTROPY",43,chartY-2,12,600,"#617782");
    const chart=createCanvas(994,130);V.drawEntropy(chart.getContext("2d"),994,130,runs,t,{colors});ctx.drawImage(chart,43,chartY+5);
    text(ctx,"Teal: Gaussian   Rust: bent target   Dashed: exact Gaussian entropy",85,1025,14,400,"#617782");
  }
  const captionY=includeHistory?1059:height-17;text(ctx,"Color + solid contours: density   ·   Dark dashed contours: target   ·   Equal spatial units",37,captionY,14,400,"#617782");
  ctx.restore();return canvas;
}
if(summary){
  fs.mkdirSync(path.dirname(summary),{recursive:true});const canvas=createCanvas(1200,850);comparison(canvas,4,false);
  const bytes=stripMetadata(canvas.encodeSync("jpeg",90));if(bytes.length>1000000)throw new Error("Summary exceeds 1 MB");fs.writeFileSync(summary,bytes);
  console.log(JSON.stringify({slug:"logarithmic-sobolev-wasserstein-pl",path:"/blog/imgs/summaries/logarithmic-sobolev-wasserstein-pl.jpg",...dimensions(bytes),alt:"At the same physical time, an unbent Gaussian Langevin density is nearly equilibrated while a bent banana density remains concentrated in its left arm; dashed contours mark the targets.",source:"/blog/preparations/assets/banana-langevin/index.html",settings,sha256:crypto.createHash("sha256").update(bytes).digest("hex")}));
}
async function renderVideo(){
  if(!video)return;fs.mkdirSync(path.dirname(video),{recursive:true});if(fs.existsSync(video))throw new Error("Refusing to overwrite existing video: "+video);
  const width=1080,height=1080,fps=24,seconds=24,canvas=createCanvas(width,height);
  const encoder=spawn(process.env.BLOG_FFMPEG_PATH||"/opt/homebrew/bin/ffmpeg",["-hide_banner","-loglevel","error","-f","rawvideo","-pixel_format","rgba","-video_size",width+"x"+height,"-framerate",String(fps),"-i","pipe:0","-an","-c:v","libx264","-preset","medium","-crf","21","-pix_fmt","yuv420p","-movflags","+faststart","-map_metadata","-1",video],{stdio:["pipe","inherit","inherit"]});
  const finished=once(encoder,"exit");let encoderError;encoder.on("error",error=>{encoderError=error;});
  for(let i=0;i<fps*seconds;i++){
    const wall=i/fps,t=Math.max(0,Math.min(20,(wall-1)*20/21));comparison(canvas,t,true);
    if(!encoder.stdin.write(canvas.data()))await once(encoder.stdin,"drain");
    if(i%96===0)console.log("Video "+Math.round(100*i/(fps*seconds))+"% · t="+t.toFixed(2));
  }
  encoder.stdin.end();const [code]=await finished;if(encoderError)throw encoderError;if(code!==0)throw new Error("Video encoding failed: "+code);
  console.log(JSON.stringify({video,width,height,fps,duration:seconds,bytes:fs.statSync(video).size,physicalTime:[0,20],bends:[0,4]}));
}
renderVideo().catch(error=>{console.error(error);process.exitCode=1;});
