'use strict';
/**
 * hlink/dump-ard.js
 *
 * Dumps raw record content from an ARD ZIP file so we can see what
 * assessment codes the parser missed.
 *
 * USAGE:
 *   node hlink/dump-ard.js <path-to-ARD-zip>
 *
 * Example:
 *   node hlink/dump-ard.js hlink/conformance-proof/HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00.ZIP
 */

const fs   = require('fs');
const zlib = require('zlib');

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Usage: node hlink/dump-ard.js <path-to-ARD-zip>');
  process.exit(1);
}

const buf = fs.readFileSync(zipPath);

// Minimal ZIP extractor (same logic as retrieve.js extractZipText)
if (buf[0] !== 0x50 || buf[1] !== 0x4B || buf[2] !== 0x03 || buf[3] !== 0x04) {
  console.error('Not a valid ZIP file');
  process.exit(1);
}
const method         = buf.readUInt16LE(8);
const compressedSize = buf.readUInt32LE(18);
const fileNameLen    = buf.readUInt16LE(26);
const extraLen       = buf.readUInt16LE(28);
const dataStart      = 30 + fileNameLen + extraLen;
const compressed     = buf.slice(dataStart, dataStart + compressedSize);
const text           = (method === 8 ? zlib.inflateRawSync(compressed) : compressed).toString('utf8');

console.log('=== Raw ARD File Content ===');
console.log('File:', zipPath);
console.log('Length:', text.length, 'chars');
console.log('');

const lines = text.split(/\r?\n/);
console.log('--- All lines ---');
lines.forEach(function(line, i) {
  if (!line.trim()) return;
  console.log('Line ' + (i+1) + ' [len=' + line.length + ']:');
  console.log('  Full: ' + JSON.stringify(line));
  // Show hex of positions 90-120 (where pay code should be)
  if (line.length > 90) {
    const segment = line.slice(90, 130);
    console.log('  pos90-130: ' + JSON.stringify(segment));
    const hex = Buffer.from(segment, 'utf8').toString('hex').match(/../g).join(' ');
    console.log('  hex90-130: ' + hex);
  }
  console.log('');
});
