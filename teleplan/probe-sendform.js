'use strict';
/**
 * probe-sendform.js
 * Run from: teleplan/
 * Logs in, fetches the JsubmitClaim page, extracts all form fields,
 * then tries candidate ExternalAction values to find the working one.
 *
 * Usage:  node teleplan/probe-sendform.js
 */
const fs   = require('fs');
const path = require('path');
const { loadConfig }     = require('./config');
const { TeleplanClient } = require('./client');
const claims             = require('./claims');

async function probe() {
  const config = loadConfig();
  const client = new TeleplanClient(config);
  await client.login();

  try {
    // 1. Fetch the Send Claims navigation page to read form fields
    console.log('\n=== Fetching JsubmitClaim form page ===');
    const formHtml = await client.probeSendClaimsForm();
    fs.writeFileSync(path.join(__dirname, 'probe-sendform-page.html'), formHtml, 'latin1');

    // Extract form and input lines
    var formLines = formHtml.split('\n').filter(function(l) {
      return /form|input|textarea|ExternalAction|enctype|multipart|action|submit/i.test(l);
    });
    console.log('--- Form/Input elements ---');
    formLines.forEach(function(l) { console.log(' ', l.trim()); });

    // 2. Build a minimal 1-claim test file
    const testRecs = [
      { type: 'c02', phn: '9151210417', nameVerify: 'RGBU',
        dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
        dx1: '465  ', serviceDate: claims.yesterdayYMD(),
        serviceLocation: 'L', submissionCode: '0' }
    ];
    const fileText = claims.buildSubmissionFile(config, testRecs);
    console.log('\nTest file length:', fileText.length, 'chars, lines:', fileText.split('\r\n').filter(Boolean).length);

    // 3. Try candidate ExternalActions (multipart first, then url-encoded)
    const candidates = [
      { action: 'WsendClaims',     field: 'claimsFile',  mode: 'multipart' },
      { action: 'WsubmitClaims',   field: 'claimsFile',  mode: 'multipart' },
      { action: 'WsendFile',       field: 'claimsFile',  mode: 'multipart' },
      { action: 'WsendClaims',     field: 'claimsData',  mode: 'urlencoded' },
      { action: 'AsendClaims',     field: 'claimsData',  mode: 'urlencoded' },
      { action: 'WsubmitClaims',   field: 'claimsData',  mode: 'urlencoded' },
    ];

    console.log('\n=== Probing ExternalAction candidates ===');
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      try {
        var resp;
        if (c.mode === 'multipart') {
          resp = await client._sendMultipartProbe(c.action, c.field, fileText);
        } else {
          resp = await client._sendUrlencodedProbe(c.action, c.field, fileText);
        }

        var body = resp.body || '';
        var isError = body.indexOf('not recognized') > -1 || body.indexOf('application error') > -1;
        var hasTid  = body.indexOf('#TID=') > -1 || body.indexOf('TETA-') > -1 || body.indexOf('TETB-') > -1;
        var snippet = body.replace(/\s+/g, ' ').slice(0, 200);

        console.log('\n[' + (i+1) + '] ' + c.mode + ' | action=' + c.action + ' field=' + c.field);
        console.log('    isError=' + isError + ' hasTid=' + hasTid);
        console.log('    snippet:', snippet.slice(0, 150));

        fs.writeFileSync(path.join(__dirname, 'probe-send-' + (i+1) + '-' + c.action + '.txt'), body, 'latin1');

        if (!isError) {
          console.log('\n>>> WORKING: action="' + c.action + '" field="' + c.field + '" mode=' + c.mode);
          console.log('>>> Update sendClaims() in client.js with these values.');
          break;
        }
      } catch (e) {
        console.log('[' + (i+1) + '] ERROR:', e.message);
      }
    }

  } finally {
    await client.logout();
  }
}

probe().catch(function(e) { console.error('FATAL:', e.message); process.exit(1); });
