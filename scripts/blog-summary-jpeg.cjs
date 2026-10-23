"use strict";
// Losslessly remove application/comment metadata; preserve all encoded pixels.
function stripMetadata(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<4||bytes[0]!==255||bytes[1]!==216)throw Error("Invalid JPEG capture");
 const chunks=[bytes.subarray(0,2)];let offset=2;
 while(offset<bytes.length){
  const start=offset;if(bytes[offset++]!==255)throw Error("Invalid JPEG marker");
  while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];
  if(marker===218){chunks.push(bytes.subarray(start));return Buffer.concat(chunks);}
  if(marker===217)throw Error("JPEG contains no encoded image");
  const size=bytes.readUInt16BE(offset);if(size<2||offset+size>bytes.length)throw Error("Invalid JPEG segment");
  if(!(marker===254||(marker>=225&&marker<=239)))chunks.push(bytes.subarray(start,offset+size));
  offset+=size;
 }
 throw Error("Incomplete JPEG capture");
}
// Read the encoded size, not the fractional CSS box (Chrome rounds it up).
function dimensions(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<4||bytes[0]!==255||bytes[1]!==216)throw Error("Invalid JPEG capture");
 let offset=2;
 while(offset<bytes.length){
  if(bytes[offset++]!==255)throw Error("Invalid JPEG marker");
  while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];
  if(marker===218||marker===217)break;
  if(offset+2>bytes.length)throw Error("Incomplete JPEG segment");
  const size=bytes.readUInt16BE(offset);
  if(size<2||offset+size>bytes.length)throw Error("Invalid JPEG segment");
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
   if(size<8)throw Error("Invalid JPEG frame");
   const height=bytes.readUInt16BE(offset+3),width=bytes.readUInt16BE(offset+5);
   if(!width||!height)throw Error("Empty JPEG frame");
   return{width,height};
  }
  offset+=size;
 }
 throw Error("Missing JPEG dimensions");
}
module.exports={stripMetadata,dimensions};
