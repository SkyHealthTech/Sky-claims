'use strict';

/**
 * hlink/retrieve.js
 *
 * Downloads all available files from the AHCIP SFTP /DOWNLOAD/ folder,
 * saves them to hlink/conformance-proof/, and prints a summary.
 *
 * USAGE:
 *   node hlink/retrieve.js
 *
 * Files retrieved:
 *   *.BBAL  — Batch Balance (immediate result after submission)
 *   *.ARD   — Assessment Result Detail (payment/refusal per claim)
 *   other   — saved as-is for manual review
 */

const fs     = require('fs');
const path   = require('path');
const zlib   = require('zlib');
const { loadConfig }   = require('./config');
const { HlinkSftp }    = require('./sftp');
const { parseBatchBalance, parseArdFile, printBatchBalanceSummary } = require('./parser');

const PROOF_DIR = path.join(__dirname, 'conformance-proof');

/**
 * Extract the first entry from a ZIP buffer and return its content as a UTF-8 string.
 * Alberta Health ZIPs use standard deflate (not encrypted). If encrypted, throws.
 *
 * ZIP local file header layout (per PKZIP spec):
 *   0-3:   signature (PK\x03\x04)
 *   4-5:   version needed
 *   6-7:   general purpose bit flags
 *   8-9:   compression method (8 = deflate, 0 = store)
 *   10-13: last mod time/date
 *   14-17: CRC-32
 *   18-21: compressed size
 *   22-25: uncompressed size
 *   26-27: file name length
 *   28-29: extra field length
 *   30+:   file name, extra field, then compressed data
 */
function extractZipText(buf, debugName) {
  // Verify local file header signature
  if (buf[0] !== 0x50 || buf[1] !== 0x4B || buf[2] !== 0x03 || buf[3] !== 0x04) {
    throw new Error('Not a valid ZIP local file header');
  }

  const flags          = buf.readUInt16LE(6);
  const method         = buf.readUInt16LE(8);
  const compressedSize = buf.readUInt32LE(18);
  const fileNameLen    = buf.readUInt16LE(26);
  const extraLen       = buf.readUInt16LE(28);
  const dataStart      = 30 + fileNameLen + extraLen;

  // Bit 0 = traditional encryption; strong encryption is method 99
  if (flags & 0x01) {
    throw new Error('ZIP uses traditional encryption — password required');
  }
  if (method === 99) {
    throw new Error('ZIP uses AES/strong encryption — decryption key required');
  }

  const compressedData = buf.slice(dataStart, dataStart + compressedSize);

  if (method === 0) {
    // STORE — no compression
    return compressedData.toString('utf8');
  } else if (method === 8) {
    // DEFLATE
    const raw = zlib.inflateRawSync(compressedData);
    return raw.toString('utf8');
  } else {
    throw new Error('Unsupported compression method: ' + method);
  }
}

async function main() {
  console.log('=== Sky Claims — H-Link Retrieve Results ===\n');

  const config = loadConfig();
  console.log('SFTP Host : ' + config.sftp.host);
  console.log('User      : ' + config.sftp.username + '\n');

  const sftp = new HlinkSftp(config);
  await sftp.connect();

  let files;
  try {
    files = await sftp.listDownloads();
  } catch (e) {
    console.error('Failed to list /DOWNLOAD/: ' + e.message);
    await sftp.disconnect();
    return;
  }

  if (!files.length) {
    console.log('No files in /DOWNLOAD/ — results not yet available.');
    console.log('Alberta Health processes batches within 1 hour.');
    await sftp.disconnect();
    return;
  }

  console.log('Files available: ' + files.length);
  files.forEach(function(f) {
    console.log('  ' + f.name + '  (' + f.size + ' bytes)');
  });
  console.log();

  fs.mkdirSync(PROOF_DIR, { recursive: true });

  const downloaded = await sftp.downloadAll(PROOF_DIR);
  await sftp.disconnect();

  // Parse and summarize each downloaded file
  console.log('\n=== File Summaries ===\n');
  for (const dl of downloaded) {
    const nameUpper = dl.name.toUpperCase();
    console.log('─── ' + dl.name + ' ───');

    // ZIP files from Alberta Health: unzip and parse inner content
    if (nameUpper.endsWith('.ZIP')) {
      let innerText = null;
      try {
        innerText = extractZipText(dl.buffer, dl.name);
      } catch (e) {
        console.log('  (could not unzip: ' + e.message + ')');
        console.log('  Raw size: ' + dl.buffer.length + ' bytes');
        console.log('  Tip: If encrypted, AHCIP may need to provide a decryption password.');
        console.log();
        continue;
      }
      if (innerText !== null) {
        console.log('  (unzipped successfully)');
        // Determine content type from ZIP filename
        if (nameUpper.includes('OUTBB')) {
          console.log('  Content type: Batch Balance (OUTBB)');
          const bbal = parseBatchBalance(innerText);
          printBatchBalanceSummary(bbal);
          if (!bbal.batches.length) {
            console.log('  Raw content:');
            innerText.split(/\r?\n/).slice(0, 30).forEach(function(l) {
              if (l.trim()) console.log('    ' + l);
            });
          }
        } else if (nameUpper.includes('ASSMT')) {
          console.log('  Content type: Assessment Result (ARD)');
          const ard = parseArdFile(innerText);
          console.log('  ARD records: ' + ard.records.length);
          for (const r of ard.records) {
            console.log('  Claim ' + r.claimNumber + '  Action ' + r.actionCode +
              '  Reason: ' + (r.reasonCode || '(see raw)'));
          }
          if (!ard.records.length) {
            innerText.split(/\r?\n/).slice(0, 30).forEach(function(l) {
              if (l.trim()) console.log('    ' + l);
            });
          }
        } else if (nameUpper.includes('BACKUP')) {
          console.log('  Content type: Input Backup (echo of submitted batch)');
          innerText.split(/\r?\n/).slice(0, 5).forEach(function(l) {
            if (l.trim()) console.log('    ' + l.substring(0, 80) + (l.length > 80 ? '...' : ''));
          });
        } else {
          console.log('  Raw content:');
          innerText.split(/\r?\n/).slice(0, 20).forEach(function(l) {
            if (l.trim()) console.log('    ' + l);
          });
        }
      }
    } else if (nameUpper.includes('BBAL') || nameUpper.includes('OUTBB')) {
      const bbal = parseBatchBalance(dl.content);
      printBatchBalanceSummary(bbal);
    } else if (nameUpper.includes('ARD') || nameUpper.includes('ASSMT')) {
      const ard = parseArdFile(dl.content);
      console.log('ARD records: ' + ard.records.length);
      for (const r of ard.records) {
        console.log('  Claim ' + r.claimNumber + '  Action ' + r.actionCode +
          '  Reason: ' + (r.reasonCode || '(see raw)') +
          (r.description ? '  ' + r.description : ''));
      }
    } else {
      // Unknown file — print first few lines
      const lines = dl.content.split(/\r?\n/).slice(0, 20);
      lines.forEach(function(l) { if (l.trim()) console.log('  ' + l); });
    }
    console.log();
  }

  console.log('All files saved to: ' + PROOF_DIR);
  console.log('\nNext steps:');
  console.log('  1. For ACPT batch  → proceed to ARD retrieval (if not already downloaded)');
  console.log('  2. For PART batch  → resubmit refused claims in a NEW batch');
  console.log('  3. For RFSE batch  → fix the error and resubmit with the SAME batch number');
  console.log('  4. Once ARD files received → run reconciliation to match claim payments');
}

main().catch(function(err) {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
