'use strict';
/**
 * teleplan/probe4.js
 * Full login + AcheckE45 — confirms session flow and param names.
 * Run: node teleplan/probe4.js
 */
const https = require('https');
const { loadConfig } = require('./config');
const config = loadConfig();

function req(method, path, body, cookies) {
  return new Promise(function(resolve) {
    var headers = {
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

function extractCookies(headers, existing) {
  var raw = headers['set-cookie'];
  if (!raw) return existing || null;
  if (!Array.isArray(raw)) raw = [raw];
  var map = {};
  if (existing) {
    existing.split('; ').forEach(function(c) {
      var p = c.indexOf('='); if (p > -1) map[c.slice(0,p)] = c.slice(p+1);
    });
  }
  raw.forEach(function(c) {
    var part = c.split(';')[0];
    var p = part.indexOf('='); if (p > -1) map[part.slice(0,p).trim()] = part.slice(p+1).trim();
  });
  return Object.entries(map).map(function(e){ return e[0]+'='+e[1]; }).join('; ');
}

function textOf(html) {
  return html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}

async function run() {
  console.log('=== Teleplan login + AcheckE45 probe ===\n');

  // Step 1: Get initial session
  console.log('1. GET /TeleplanBroker (init session)...');
  var r1 = await req('GET', '/TeleplanBroker', null, null);
  var cookies = extractCookies(r1.headers, null);
  console.log('   Status:', r1.status, '| Cookie:', cookies, '\n');

  // Step 2: Login with WsignOn
  console.log('2. POST WsignOn (login)...');
  var loginBody = 'username=' + config.userId +
                  '&password=' + encodeURIComponent(config.password) +
                  '&ExternalAction=WsignOn&Login=Login';
  var r2 = await req('POST', '/TeleplanBroker', loginBody, cookies);
  cookies = extractCookies(r2.headers, cookies);
  var r2text = textOf(r2.body).slice(0, 300);
  console.log('   Status:', r2.status);
  console.log('   Cookie:', cookies);
  console.log('   Body:', r2text, '\n');
  console.log('   Full HTML:\n', r2.body, '\n');

  // Step 3: Try AcheckE45 with various param names
  console.log('3. AcheckE45 attempts...');
  var variants = [
    '?ExternalAction=AcheckE45&phn=9151210417&birthDate=19591128&dateOfService=20260526',
    '?ExternalAction=AcheckE45&PHN=9151210417&BirthDate=19591128&DateOfService=20260526',
    '?ExternalAction=AcheckE45&phn=9151210417&dob=19591128',
    '?ExternalAction=AcheckE45',
  ];
  for (var i = 0; i < variants.length; i++) {
    var r = await req('GET', '/TeleplanBroker' + variants[i], null, cookies);
    var t = textOf(r.body).slice(0, 500);
    console.log('\n  Variant', i+1, ':', variants[i]);
    console.log('  Status:', r.status);
    console.log('  Text:', t);
    // If it looks like an eligibility form or result, print full HTML
    if (r.body.indexOf('PHN') > -1 || r.body.indexOf('Eligib') > -1 || r.body.indexOf('phn') > -1) {
      console.log('\n  *** Full HTML (looks promising) ***');
      console.log(r.body);
    }
  }
}

run().catch(function(e){ console.error('FATAL:', e.message); process.exit(1); });
