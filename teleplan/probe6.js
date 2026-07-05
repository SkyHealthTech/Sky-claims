'use strict';
/**
 * probe6.js — get the JcheckEligibility form HTML (exact field names)
 * then try split-field date submissions.
 *
 * The "INCOMPLETE" error across ALL date formats strongly suggests
 * the form uses three separate year/month/day fields, not one combined date string.
 */
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { URLSearchParams } = require('url');
const { loadConfig }     = require('./config');
const { TeleplanClient } = require('./client');

async function probe() {
  const config = loadConfig();
  const client = new TeleplanClient(config);
  await client.login();

  try {
    // ── 1: Fetch the browser eligibility form — read exact <input name="..."> ──
    console.log('\n=== 1: GET JcheckEligibility form HTML ===');
    const form = await client._request('GET',
      '/TeleplanBroker?ExternalAction=JcheckEligibility', null);
    console.log('Status:', form.status, '| Length:', form.body.length);
    console.log(form.body);
    fs.writeFileSync(path.join(__dirname, 'probe6-form.html'), form.body);
    console.log('\n--- (full HTML saved to teleplan/probe6-form.html) ---');

    // ── 2: Try split year/month/day fields (most common Java form pattern) ────
    console.log('\n=== 2: GET AcheckE45 with split dobYear/dobMonth/dobDay ===');
    const r2 = await rawGet(
      '/TeleplanBroker?ExternalAction=AcheckE45&PHN=9151210417' +
      '&dobYear=1959&dobMonth=11&dobDay=28' +
      '&dosYear=2026&dosMonth=05&dosDay=26' +
      '&subBen=Y&eyeExam=Y', client._cookie);
    console.log(r2.body.slice(0, 300));

    // ── 3: Try DOBYEAR / DOBMONTH / DOBDAY (uppercase variant) ───────────────
    console.log('\n=== 3: GET AcheckE45 DOBYEAR/DOBMONTH/DOBDAY ===');
    const r3 = await rawGet(
      '/TeleplanBroker?ExternalAction=AcheckE45&PHN=9151210417' +
      '&DOBYEAR=1959&DOBMONTH=11&DOBDAY=28' +
      '&DOSYEAR=2026&DOSMONTH=05&DOSDAY=26' +
      '&subBen=Y&eyeExam=Y', client._cookie);
    console.log(r3.body.slice(0, 300));

    // ── 4: Try Year/Month/Day (title case) ───────────────────────────────────
    console.log('\n=== 4: GET AcheckE45 Year/Month/Day title-case ===');
    const r4 = await rawGet(
      '/TeleplanBroker?ExternalAction=AcheckE45&PHN=9151210417' +
      '&BirthYear=1959&BirthMonth=11&BirthDay=28' +
      '&ServiceYear=2026&ServiceMonth=05&ServiceDay=26' +
      '&subBen=Y&eyeExam=Y', client._cookie);
    console.log(r4.body.slice(0, 300));

    // ── 5: Try GET JcheckEligibility with POST — simulating the actual form submit ─
    console.log('\n=== 5: POST JcheckEligibility (simulate browser form submit) ===');
    const postBody = new URLSearchParams({
      ExternalAction: 'JcheckEligibility',
      PHN:   '9151210417',
      DOB:   '19591128',
      DOS:   '20260526',
      subBen: 'Y', eyeExam: 'Y',
    }).toString();
    const r5 = await client._request('POST', '/TeleplanBroker', postBody);
    console.log('Status:', r5.status);
    console.log(r5.body.slice(0, 1000));

  } finally {
    await client.logout();
  }
}

function rawGet(urlPath, cookie) {
  return new Promise(function(resolve, reject) {
    var headers = {
      'User-Agent': 'SkyClaims/1.0 (Teleplan Vendor V0127)',
      'Accept':     'text/html,application/xhtml+xml,*/*',
    };
    if (cookie) headers['Cookie'] = cookie;
    https.request({
      hostname: 'tlpt2.moh.hnet.bc.ca',
      port: 443, path: urlPath, method: 'GET', headers: headers,
    }, function(res) {
      var body = '';
      res.setEncoding('latin1');
      res.on('data', function(c){ body += c; });
      res.on('end', function(){ resolve({ status: res.statusCode, body: body }); });
    }).on('error', reject).end();
  });
}

probe().catch(function(err) {
  console.error('FATAL:', err.message);
  process.exit(1);
});
