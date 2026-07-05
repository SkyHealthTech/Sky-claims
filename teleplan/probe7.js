'use strict';
/**
 * probe7.js — make one WcheckE45 call and dump the raw HTML response to a file.
 * Bypasses JSON serialization so we can read the actual eligibility result page.
 */
const fs   = require('fs');
const path = require('path');
const { loadConfig }     = require('./config');
const { TeleplanClient } = require('./client');

async function probe() {
  const config = loadConfig();
  const client = new TeleplanClient(config);
  await client.login();

  try {
    const result = await client.checkEligibility({
      phn:          '9151210417',
      birthDate:    '19591128',
      checkSubsidy: true,
      checkEyeExam: true,
    });

    // Write raw HTML directly (no JSON wrapping — preserves all chars)
    const outFile = path.join(__dirname, 'probe7-response.html');
    fs.writeFileSync(outFile, result.body, 'latin1');
    console.log('Response length:', result.body.length);
    console.log('Saved to probe7-response.html');
    console.log('\n--- First 500 chars ---');
    console.log(result.body.slice(0, 500));
    console.log('\n--- Searching for key terms ---');
    ['HJMB001I','HNHR','Name','Birth','Gender','Eligible','PHN','BURNHAM'].forEach(function(term) {
      var idx = result.body.indexOf(term);
      console.log(term + ': ' + (idx >= 0 ? 'found at ' + idx : 'NOT FOUND'));
      if (idx >= 0) console.log('  context: ' + result.body.slice(Math.max(0,idx-30), idx+80));
    });

  } finally {
    await client.logout();
  }
}

probe().catch(function(err) {
  console.error('FATAL:', err.message);
  process.exit(1);
});
