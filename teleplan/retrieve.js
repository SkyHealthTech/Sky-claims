'use strict';

/**
 * teleplan/retrieve.js
 *
 * Downloads the current remittance from the Teleplan test server,
 * saves it to disk, and prints a summary of refusals and batch
 * eligibility responses.
 *
 * USAGE:
 *   node teleplan/retrieve.js
 *
 * The raw remittance file is saved to:
 *   teleplan/conformance-proof/remittance-YYYY-MM-DD.txt
 *
 * Run this AFTER submitting claims and waiting for MSP to process them
 * (typically same day for the test environment). The next close-off
 * date is shown in the M01 record at the top of each remittance file.
 */

const fs   = require('fs');
const path = require('path');
const { loadConfig }          = require('./config');
const { TeleplanClient }      = require('./client');
const { parseRemittanceBundle, describeRefusalCodes } = require('./parser');

const PROOF_DIR = path.join(__dirname, 'conformance-proof');

async function main() {
  console.log('=== Sky Claims — Retrieve Remittances ===\n');

  const config = loadConfig();

  if (!config.isTest) {
    console.warn('[WARN] Running against PRODUCTION environment. Proceed carefully.');
  }

  console.log('Environment : ' + config.env);
  console.log('Endpoint    : ' + config.baseUrl + '\n');

  const client = new TeleplanClient(config);

  console.log('Logging in...');
  await client.login();
  console.log();

  try {
    console.log('Retrieving remittances...');
    const result = await client.retrieveRemittances();

    if (!result.raw || result.raw.trim().length === 0) {
      console.log('No remittance available at this time.');
      return;
    }

    // Save raw file
    fs.mkdirSync(PROOF_DIR, { recursive: true });
    const today    = new Date().toISOString().slice(0, 10);
    const outFile  = path.join(PROOF_DIR, 'remittance-' + today + '.txt');
    fs.writeFileSync(outFile, result.raw);
    console.log('Saved: ' + outFile + '\n');

    // Parse
    const bundle = parseRemittanceBundle(result.raw);

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('=== Remittance Summary ===');
    console.log('C12  refusals    : ' + bundle.refusals.length);
    console.log('B14  batch elig  : ' + bundle.batchEligibility.length);
    console.log('S01/S02 payments : ' + bundle.payments.length);
    console.log('S04  holds       : ' + bundle.holds.length);
    console.log('S25  messages    : ' + bundle.messages.filter(function(m){ return m.type === 'S25'; }).length);
    console.log('VRCV batches     : ' + bundle.vrcv.length);
    console.log('Unknown lines    : ' + bundle.unknownLines.length);

    // ── Broadcast messages ────────────────────────────────────────────────────
    var broadcasts = bundle.messages.filter(function(m){ return m.type === 'S25' && m.text.trim(); });
    if (broadcasts.length) {
      console.log('\n-- MSP Broadcast Messages --');
      var seen = {};
      broadcasts.forEach(function(m) {
        if (!seen[m.text]) {
          console.log('  ' + m.text);
          seen[m.text] = true;
        }
      });
    }

    // ── Admin messages (M01) ──────────────────────────────────────────────────
    var admin = bundle.messages.filter(function(m){ return m.type === 'M01'; });
    if (admin.length) {
      console.log('\n-- Administrative Messages --');
      admin.forEach(function(m) { console.log('  ' + m.text); });
    }

    // ── C12 Refusals ──────────────────────────────────────────────────────────
    if (bundle.refusals.length) {
      console.log('\n-- C12 Claim Refusals (' + bundle.refusals.length + ') --');
      bundle.refusals.forEach(function(r) {
        var codes = r.refusalCodes.join(', ') || '(no codes parsed)';
        console.log('  Seq ' + String(r.sequenceNumber).padStart(7, '0') +
                    '  Payee ' + r.payeeNum +
                    '  Prac ' + r.practitionerNum +
                    '  Codes: ' + codes);
        if (r.refusalCodes.length) {
          console.log('       ' + describeRefusalCodes(r.refusalCodes));
        }
      });
    } else {
      console.log('\nNo C12 refusals — all claims accepted.');
    }

    // ── B14 Batch eligibility results ─────────────────────────────────────────
    if (bundle.batchEligibility.length) {
      console.log('\n-- B14 Batch Eligibility Results (' + bundle.batchEligibility.length + ') --');
      bundle.batchEligibility.forEach(function(b) {
        var status = b.eligible ? 'ELIGIBLE' : 'REJECTED (' + b.responseCode + ')';
        console.log('  Seq ' + String(b.sequenceNumber).padStart(7, '0') +
                    '  Name ' + b.nameVerify.padEnd(4) +
                    '  DOS ' + b.dateOfService +
                    '  ' + status);
        if (b.description) console.log('       ' + b.description.slice(0, 80));
      });
    }

    // ── Unknown lines (for debugging) ─────────────────────────────────────────
    if (bundle.unknownLines.length) {
      console.log('\n-- Unrecognized Lines (' + bundle.unknownLines.length + ') --');
      bundle.unknownLines.slice(0, 10).forEach(function(l) {
        console.log('  ' + l.slice(0, 80));
      });
      if (bundle.unknownLines.length > 10) {
        console.log('  ... and ' + (bundle.unknownLines.length - 10) + ' more.');
      }
    }

    console.log('\nDone.');

  } finally {
    await client.logout();
  }
}

main().catch(function(err) {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
