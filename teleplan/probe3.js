'use strict';

/**
 * teleplan/probe3.js
 * Tries ExternalAction-based calls with session cookie.
 * Run: node teleplan/probe3.js
 */

const https = require('https');
const { loadConfig } = require('./config');

const config = loadConfig();
const creds  = Buffer.from(config.userId + ':' + config.password).toString('base64');
const auth   = 'Basic ' + creds;

function req(method, path, body, cookies) {
  return new Promise(function(resolve) {
    var headers = {
      'Authorization': auth,
      'User-Agent': 'SkyClaims/1.0 (Teleplan Vendor V0127)',
      'Accept': 'text/html,application/xhtml+xml,*/*',
    };
    if (cookies) headers['Cookie'] = cookies;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    var opts = { hostname: 'tlpt2.moh.hnet.bc.ca', port: 443, path: path, method: method, headers: headers };
    var respBody = '';
    var r = https.request(opts, function(res) {
      res.setEncoding('latin1');
      res.on('data', function(c){ respBody += c; });
      res.on('end', function(){ resolve({ status: res.statusCode, headers: res.headers, body: respBody }); });
    });
    r.on('error', function(e){ resolve({ status: 'ERR', error: e.message, headers: {}, body: '' }); });
    r.setTimeout(15000, function(){ r.destroy(); resolve({ status: 'TIMEOUT', headers: {}, body: '' }); });
    if (body) r.write(body);
    r.end();
  });
}

function getCookies(headers) {
  var raw = headers['set-cookie'];
  if (!raw) return null;
  if (!Array.isArray(raw)) raw = [raw];
  return raw.map(function(c){ return c.split(';')[0]; }).join('; ');
}

async function probe() {
  console.log('=== Teleplan ExternalAction probe ===\n');

  // Step 1: Get session cookie
  console.log('Step 1: Getting session cookie...');
  var init = await req('GET', '/TeleplanBroker', null, null);
  var sessionCookie = getCookies(init.headers);
  console.log('Session cookie:', sessionCookie, '\n');

  // Step 2: Try login ExternalAction patterns
  console.log('Step 2: Login actions...');
  var loginActions = ['Alogin', 'AloginS', 'Jlogin', 'Alogin1', 'login', 'ALogin'];
  for (var i = 0; i < loginActions.length; i++) {
    var action = loginActions[i];
    var path = '/TeleplanBroker?ExternalAction=' + action +
               '&userid=' + config.userId +
               '&password=' + encodeURIComponent(config.password);
    var r = await req('GET', path, null, sessionCookie);
    var snippet = r.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    console.log('  ' + action + ': HTTP ' + r.status + ' | ' + snippet);
    var newCookie = getCookies(r.headers);
    if (newCookie) { sessionCookie = newCookie; console.log('  New cookie:', newCookie); }
  }

  // Step 3: Try AcheckE45 directly (credentials may be in Basic Auth, not form)
  console.log('\nStep 3: AcheckE45 with Basic Auth + session cookie...');
  var eligParams = [
    // variation 1: lowercase param names
    '&phn=9151210417&birthDate=19591128&dateOfService=20260526',
    // variation 2: uppercase
    '&PHN=9151210417&BirthDate=19591128&DateOfService=20260526',
    // variation 3: with subsidy/eyeexam flags
    '&phn=9151210417&birthDate=19591128&subBen=Y&eyeExam=Y',
    // variation 4: minimal
    '&phn=9151210417&dob=19591128',
    // variation 5: different field names seen in Teleplan docs
    '&PHN=9151210417&BDATE=19591128',
  ];

  for (var j = 0; j < eligParams.length; j++) {
    var params = eligParams[j];
    var eligPath = '/TeleplanBroker?ExternalAction=AcheckE45' + params;
    var er = await req('GET', eligPath, null, sessionCookie);
    var text = er.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
    console.log('\n  Params variant ' + (j+1) + ': HTTP ' + er.status);
    console.log('  ' + text);
  }

  // Step 4: Try AcheckE45 as POST
  console.log('\nStep 4: AcheckE45 as POST...');
  var postBodies = [
    'phn=9151210417&birthDate=19591128&dateOfService=20260526',
    'PHN=9151210417&BirthDate=19591128&DateOfService=20260526',
  ];
  for (var k = 0; k < postBodies.length; k++) {
    var pb = postBodies[k];
    var pr = await req('POST', '/TeleplanBroker?ExternalAction=AcheckE45', pb, sessionCookie);
    var pt = pr.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
    console.log('\n  POST variant ' + (k+1) + ': HTTP ' + pr.status);
    console.log('  ' + pt);
  }

  // Step 5: Print full raw response of most promising attempt (variant 1 GET)
  console.log('\n\nStep 5: Full raw HTML of AcheckE45 GET variant 1...');
  var fullPath = '/TeleplanBroker?ExternalAction=AcheckE45&phn=9151210417&birthDate=19591128&dateOfService=20260526';
  var full = await req('GET', fullPath, null, sessionCookie);
  console.log(full.body);
}

probe().catch(function(e){ console.error('FATAL:', e.message); process.exit(1); });
