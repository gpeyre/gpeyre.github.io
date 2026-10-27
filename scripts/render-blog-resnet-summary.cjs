/* Reuse the interactive experiment's analytic contour paths, without a surrogate grid. */
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const G = require("../blog/preparations/assets/deep-resnet/landscape-core.js");
const {stripMetadata, dimensions} = require("./blog-summary-jpeg.cjs");
let library;
if (process.env.BLOG_CANVAS_PATH) library = require(process.env.BLOG_CANVAS_PATH);
else {
  try { library = require("@napi-rs/canvas"); }
  catch (_) { library = require("/Users/gpeyre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas"); }
}
for (const file of ["Arial.ttf", "Arial Bold.ttf", "Arial Unicode.ttf"]) {
  const name = path.join("/System/Library/Fonts/Supplemental", file);
  if (fs.existsSync(name)) library.GlobalFonts.registerFromPath(name, "ResNet Summary");
}
const L = 8, camera = {...G.INITIAL_CAMERA}, canvas = library.createCanvas(1200, 900), ctx = canvas.getContext("2d");
const colors = ["#526db4", "#2d84a2", "#163c45", "#45977a", "#a79337", "#c17735", "#b74d69"];
const plot = {x:74, y:134, width:1076, height:668};
const b = G.cameraBounds(camera, plot.width, plot.height), screen = p => ({x:plot.x+(p.x-b.xmin)*b.scale,y:plot.y+(b.ymax-p.y)*b.scale});
const text = (value, x, y, size, color="#19363b", weight="normal") => {ctx.fillStyle=color;ctx.font=`${weight} ${size}px "ResNet Summary",sans-serif`;ctx.fillText(value,x,y);};
ctx.fillStyle="#f7fafa";ctx.fillRect(0,0,1200,900);
text("Training (very) deep ResNets",34,46,29,"#19363b","bold");
text("Exact loss contours · L = 8 · eight minima and one degenerate saddle",35,81,19,"#536c70");
ctx.fillStyle="#fff";ctx.fillRect(plot.x,plot.y,plot.width,plot.height);
ctx.save();ctx.beginPath();ctx.rect(plot.x,plot.y,plot.width,plot.height);ctx.clip();
for(let x=Math.ceil(b.xmin/5)*5;x<=b.xmax;x+=5){const p=screen({x,y:0});ctx.strokeStyle=x===0?"#a4b7b9":"#e7eeee";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,plot.y);ctx.lineTo(p.x,plot.y+plot.height);ctx.stroke();}
for(let y=Math.ceil(b.ymin/5)*5;y<=b.ymax;y+=5){const p=screen({x:0,y});ctx.strokeStyle=y===0?"#a4b7b9":"#e7eeee";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(plot.x,p.y);ctx.lineTo(plot.x+plot.width,p.y);ctx.stroke();}
const paths=G.contours(L,b,b.scale).sort((a,c)=>(a.level===1?1:0)-(c.level===1?1:0));
for(const curve of paths){ctx.strokeStyle=colors[G.LEVELS.indexOf(curve.level)];ctx.lineWidth=curve.level===1?2:1.7;ctx.setLineDash(curve.level===1?[7,5]:[]);ctx.beginPath();curve.points.forEach((p,i)=>{const q=screen(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});if(curve.closed)ctx.closePath();ctx.stroke();}
ctx.setLineDash([]);
for(const p of G.minima(L,b)){const q=screen(p);ctx.beginPath();ctx.arc(q.x,q.y,5,0,2*Math.PI);ctx.fillStyle="#126b72";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=1.7;ctx.stroke();}
const saddle=screen(G.saddle(L));ctx.beginPath();ctx.moveTo(saddle.x,saddle.y-7);ctx.lineTo(saddle.x+7,saddle.y);ctx.lineTo(saddle.x,saddle.y+7);ctx.lineTo(saddle.x-7,saddle.y);ctx.closePath();ctx.fillStyle="#b34e4a";ctx.fill();ctx.strokeStyle="#fff";ctx.stroke();
ctx.restore();ctx.strokeStyle="#cedcde";ctx.strokeRect(plot.x,plot.y,plot.width,plot.height);
ctx.textAlign="center";
for(let x=Math.ceil(b.xmin/5)*5;x<=b.xmax;x+=5)text(String(x),screen({x,y:0}).x,plot.y+plot.height+24,14,"#536c70");
ctx.textAlign="right";for(let y=Math.ceil(b.ymin/5)*5;y<=b.ymax;y+=5)text(String(y),plot.x-12,screen({x:0,y}).y+5,14,"#536c70");ctx.textAlign="left";
text("Im z",plot.x,plot.y-14,15,"#536c70");text("Re z",plot.x+plot.width-29,plot.y+plot.height+47,15,"#536c70");
text("Loss",35,862,15,"#536c70");G.LEVELS.forEach((level,i)=>{const x=84+i*88;ctx.strokeStyle=colors[i];ctx.lineWidth=3;ctx.setLineDash(level===1?[7,4]:[]);ctx.beginPath();ctx.moveTo(x,856);ctx.lineTo(x+25,856);ctx.stroke();ctx.setLineDash([]);text(String(level),x+33,862,14,"#536c70");});
text("Minima  f = 0     Saddle  f = 1",728,862,15,"#536c70");
const flag=process.argv.indexOf("--out"), output=flag<0?path.join(__dirname,"../blog/imgs/summaries/training-very-deep-resnets.jpg"):process.argv[flag+1];
if(!output)throw Error("--out requires a path");
const bytes=stripMetadata(canvas.encodeSync("jpeg",91));if(bytes.length>1000000)throw Error("Summary exceeds 1 MB");fs.writeFileSync(output,bytes);
console.log(JSON.stringify({slug:"training-very-deep-resnets",path:"/blog/imgs/summaries/training-very-deep-resnets.jpg",...dimensions(bytes),alt:"Exact residual-network loss contours at depth eight: eight zero-loss minima surrounding the degenerate saddle at minus eight, with its loss-one contour dashed.",source:"/blog/preparations/assets/deep-resnet/landscape.html",settings:{depth:L,camera,levels:G.LEVELS,renderer:"interactive landscape-core.js analytic contour paths; native canvas summary layout"},sha256:crypto.createHash("sha256").update(bytes).digest("hex")}));
