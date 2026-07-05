'use strict';
/**
 * probe5.js — discover exact E45 field names and date format
 *
 * Tries all plausible combinations in one run:
 *   A. GET bare AcheckE45 (no PHN/DOB) → see form HTML + field names
 *   B. POST AcheckE45 with PHN+DOB YYYYMMDD
 *   C. GET birthDate/dateOfService (original names) YYYYMMDD
 *   D. GET DOB=1959/11/28 YYYY/MM/DD with raw slashes
 *   E. GET DOB=11/28/1959 MM/DD/YYYY  ← Austin's manual submission format
 *   F. GET main page after login → see available nav links
 */

const https   = require('https');
const { URLSearchParams } = require('url');
const fs      = require('fs');
const path    = require('path');
const { loadConfig }     = require('./config');
const { TeleplanClient } = require('./client');

async function probe() {
  const config = loadConfig();
  const client = new TeleplanClient(config);
  await client.login();

  try {
    // ── A: GET bare E45 endpoint ─────────────────────────────────────────────
    console.log('\n=== A: GET AcheckE45 no params (want: form HTML with field names) ===');
    const a = await client._request('GET', '/TeleplanBroker?ExternalAction=AcheckE45', null);
    console.log('Status:', a.status, '| Body length:', a.body.length);
    console.log(a.body.slice(0, 2000));
    fs.writeFileSync(path.join(__dirname, 'probe5-a.html'), a.body);

    // ── B: POST AcheckE45 PHN+DOB YYYYMMDD ──────────────────────────────────
    console.log('\n=== B: POST AcheckE45 PHN+DOB=19591128 DOS=20260526 ===');
    const bBody = new URLSearchParams({
      ExternalAction: 'AcheckE45',
      PHN: '9151210417', DOB: '19591128', DOS: '20260526',
      subBen: 'Y', eyeExam: 'Y',
    }).toString();
    const b = await client._request('POST', '/TeleplanBroker', bBody);
    console.log('Status:', b.status);
    console.log(b.body.slice(0, 500));

    // ── C: GET birthDate/dateOfService (original param names) ────────────────
    console.log('\n=== C: GET birthDate=19591128 dateOfService=20260526 ===');
    const c = await client._request('GET',
      '/TeleplanBroker?ExternalAction=AcheckE45&PHN=9151210417&birthDate=19591128&dateOfService=20260526&subBen=Y&eyeExam=Y', null);
    console.log('Status:', c.status);
    console.log(c.body.slice(0, 500));

    // ── D: GET DOB YYYY/MM/DD with literal slashes in URL ───────────────────
    console.log('\n=== D: GET DOB=1959/11/28 DOS=2026/05/26 (literal slashes) ===');
    const d = await rawGet('/TeleplanBroker?ExternalAction=AcheckE45&PHN=9151210417&DOB=1959/11/28&DOS=2026/05/26&subBen=Y&eyeExam=Y', client._cookie);
    console.log('Status:', d.status);
    console.log(d.body.slice(0, 500));

    // ── E: GET DOB MM/DD/YYYY — Austin's manual submission format ────────────
    console.log('\n=== E: GET DOB=11/28/1959 DOS=05/26/2026 (MM/DD/YYYY literal slashes) ===');
    const e = await rawGet('/TeleplanBroker?ExternalAction=AcheckE45&PHN=9151210417&DOB=11/28/1959&DOS=05/26/2026&subBen=Y&eyeExam=Y', client._cookie);
    console.log('Status:', e.status);
    console.log(e.body.slice(0, 500));

    // ── F: GET main page after login → nav links ─────────────────────────────
    console.log('\n=== F: GET main page (want: nav links to eligibility form) ===');
    const f = await client._request('GET', '/TeleplanBroker', null);
    console.log('Status:', f.status, '| Body length:', f.body.length);
    console.log(f.body.slice(0, 3000));
    fs.writeFileSync(path.join(__dirname, 'probe5-f.html'), f.body);

  } finally {
    await client.logout();
  }
}

// rawGet sends the URL path exactly as given — no URLSearchParams encoding
function rawGet(urlPath, cookie) {
  return new Promise(function(resolve, reject) {
    var headers = {
      'User-Agent': 'SkyClaims/1.0 (Teleplan Vendor V0127)',
      'Accept': 'text/html,application/xhtml+xml,*/*',
    };
    if (cookie) headers['Cookie'] = cookie;
    var r = https.request({
      hostname: 'tlpt2.moh.hnet.bc.ca',
      port: 443, path: urlPath, method: 'GET', headers: headers,
    }, function(res) {
      var body = '';
      res.setEncoding('latin1');
      res.on('data', function(c){ body += c; });
      res.on('end', function(){ resolve({ status: res.statusCode, body: body }); });
    });
    r.on('error', reject);
    r.end();
  });
}

probe().catch(function(err) {
  console.error('FATAL:', err.message);
  process.exit(1);
});
