"use strict";

// Offline, dependency-free checks. No image bytes or approval files are written.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {stripMetadata, dimensions} = require("../scripts/blog-summary-jpeg.cjs");

function segment(marker, payload = Buffer.alloc(0)) {
  const header = Buffer.alloc(4);
  header[0] = 0xff; header[1] = marker;
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

const soi = Buffer.from([0xff, 0xd8]);
const jfif = segment(0xe0, Buffer.from("JFIF\0"));
const quantization = segment(0xdb, Buffer.from([0, 1, 2, 3]));
const frame = segment(0xc0, Buffer.from([8, 0x01, 0xab, 0x04, 0xb0, 1, 1, 0x11, 0]));
const scan = Buffer.concat([
  segment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
  // Stuffed 0xff bytes and restart markers belong to encoded pixels, not metadata.
  Buffer.from([0x12, 0xff, 0x00, 0xe2, 0x34, 0xff, 0xd0, 0x56, 0xff, 0xd9])
]);
const clean = Buffer.concat([soi, jfif, quantization, frame, scan]);

assert.deepEqual(dimensions(clean), {width:1200, height:427});
assert.deepEqual(stripMetadata(clean), clean, "Keep JFIF and all image coding segments");

for (const marker of [...Array.from({length:15}, (_, i) => 0xe1 + i), 0xfe]) {
  const metadata = segment(marker, Buffer.from("private capture metadata"));
  const decorated = Buffer.concat([soi, metadata, jfif, quantization, metadata, frame, metadata, scan]);
  assert.deepEqual(stripMetadata(decorated), clean, `Remove marker ${marker.toString(16)} only`);
  assert.deepEqual(dimensions(decorated), {width:1200, height:427});
}

const progressive = Buffer.from(clean);
progressive[soi.length + jfif.length + quantization.length + 1] = 0xc2;
assert.deepEqual(dimensions(progressive), {width:1200, height:427});
assert.deepEqual(stripMetadata(progressive), progressive);

for (const malformed of [Buffer.from("PNG"), Buffer.from([0xff, 0xd8, 0x01]),
  Buffer.concat([soi, Buffer.from([0xff, 0xe1, 0x00, 0x01])]),
  Buffer.concat([soi, Buffer.from([0xff, 0xe1, 0x00, 0x08, 0x11])])]) {
  assert.throws(() => stripMetadata(malformed));
  assert.throws(() => dimensions(malformed));
}
assert.throws(() => stripMetadata(Buffer.concat([soi, jfif, Buffer.from([0xff, 0xd9])])));
assert.throws(() => dimensions(Buffer.concat([soi, jfif, scan])));
assert.throws(() => dimensions(Buffer.concat([soi, segment(0xc0, Buffer.from([8, 0, 1])), scan])));
assert.throws(() => dimensions(Buffer.concat([soi, segment(0xc0, Buffer.from([8, 0, 0, 0, 1, 1])), scan])));

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "blog/summary-images.json"), "utf8"));
assert.equal(manifest.version, 1);
let count = 0;
for (const [slug, image] of Object.entries(manifest.images)) {
  assert.equal(image.path, `/blog/imgs/summaries/${slug}.jpg`);
  const bytes = fs.readFileSync(path.join(root, image.path.slice(1)));
  assert.deepEqual(stripMetadata(bytes), bytes, `${slug}: no application/comment metadata`);
  assert.deepEqual(stripMetadata(stripMetadata(bytes)), bytes, `${slug}: idempotent stripping`);
  assert.deepEqual(dimensions(bytes), {width:image.width, height:image.height}, slug);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), image.sha256, slug);
  assert.ok(bytes.length <= 1_000_000, `${slug}: attachment byte limit`);
  count++;
}
assert.ok(count > 0);
console.log(`JPEG metadata/dimension regression tests passed; ${count} real captures verified.`);
