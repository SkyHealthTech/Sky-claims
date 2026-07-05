'use strict';

/**
 * teleplan/probe2.js
 * Deep probe — fetches the login page HTML to find form field names,
 * then attempts a cookie-based login and eligibility call.
 * Run: node teleplan/probe2.js
 */

const https = require('https');
const { loadConfig } = require('./config');

const config = loadConfig();
const creds  = Buffer.from(config.userId + ':' + config.password).toString('base64');
const auth   = 'Basic ' + creds;

function request(method, path, body, extraHeaders, cookies) {
  return new Promise(function(resolve) {
    var headers = Object.assign({
      'Authorization': auth,
      'User-Agent': 'SkyClaims/1.0 (Teleplan Vendor V0127)',
      'Accept': 'text/html,application/xhtml+xml,*/*',
    }, extraHeaders || {});

    if (cookies) headers['Cookie'] = cookies;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    var options = { hostname: 'tlpt2.moh.hnet.bc.ca', port: 443, path: path, method: method, headers: headers };
    var respBody = '';
    var req = https.request(options, function(res) {
      res.setEncoding('latin1');
      res.on('data', function(c){ respBody += c; });
      res.on('end', function(){
        resolve({ status: res.statusCode, headers: res.headers, body: respBody });
      });
    });
    req.on('error', function(e){ resolve({ status: 'ERR', error: e.message, headers: {}, body: '' }); });
    req.setTimeout(15000, function(){ req.destroy(); resolve({ status: 'TIMEOUT', headers: {}, body: '' }); });
    if (body) req.write(body);
    req.end();
  });
}

function extractForms(html) {
  var forms = [];
  var formRe = /<form[^>]*>([\s\S]*?)<\/form>/gi;
  var inputRe = /<input([^>]*)>/gi;
  var attrRe = /(\w+)=["']([^"']*)["']/g;

  var fm;
  while ((fm = formRe.exec(html)) !== null) {
    var formTag = fm[0].slice(0, fm[0].indexOf('>') + 1);
    var formAttrs = {};
    var a;
    while ((a = attrRe.exec(formTag)) !== null) formAttrs[a[1].toLowerCase()] = a[2];
    attrRe.lastIndex = 0;

    var inputs = [];
    var im;
    while ((im = inputRe.exec(fm[1])) !== null) {
      var iAttrs = {};
      while ((a = attrRe.exec(im[1])) !== null) iAttrs[a[1].toLowerCase()] = a[2];
      attrRe.lastIndex = 0;
      inputs.push(iAttrs);
    }
    forms.push({ attrs: formAttrs, inputs: inputs });
  }
  return forms;
}

function extractCookies(headers) {
  var raw = headers['set-cookie'];
  if (!raw) return null;
  if (!Array.isArray(raw)) raw = [raw];
  return raw.map(function(c){ return c.split(';')[0]; }).join('; ');
}

async function probe() {
  console.log('=== Deep Teleplan probe ===\n');

  // Step 1: GET the login page and find form fields
  console.log('Step 1: Fetching login page...');
  var loginPage = await request('GET', '/TeleplanBroker', null);
  console.log('Status:', loginPage.status);
  var cookies1 = extractCookies(loginPage.headers);
  if (cookies1) console.log('Cookies received:', cookies1);

  var forms = extractForms(loginPage.body);
  console.log('Forms found:', forms.length);
  forms.forEach(function(f, i) {
    console.log('  Form ' + i + ' action=' + (f.attrs.action || '(none)') + ' method=' + (f.attrs.method || 'GET'));
    f.inputs.forEach(function(inp) {
      console.log('    input: name=' + inp.name + ' type=' + inp.type + ' value=' + (inp.value || ''));
    });
  });

  // Also extract any links that look like API actions
  var links = loginPage.body.match(/href=["'][^"']*["']/gi) || [];
  var apiLinks = links.filter(function(l){ return l.indexOf('teleplan') > -1 || l.indexOf('Broker') > -1 || l.indexOf('Check') > -1; });
  if (apiLinks.length) {
    console.log('\nRelevant links on page:');
    apiLinks.forEach(function(l){ console.log(' ', l); });
  }

  // Print first 3000 chars of the page to spot structure
  console.log('\n--- Login page HTML (first 3000 chars) ---');
  console.log(loginPage.body.slice(0, 3000));

  // Step 2: Try form POST with userid/password field patterns
  console.log('\n\nStep 2: Trying form login patterns...');

  var loginPatterns = [
    'userid=' + config.userId + '&password=' + encodeURIComponent(config.password),
    'userID=' + config.userId + '&password=' + encodeURIComponent(config.password),
    'UserId=' + config.userId + '&Password=' + encodeURIComponent(config.password),
    'j_username=' + config.userId + '&j_password=' + encodeURIComponent(config.password),
    'Username=' + config.userId + '&Password=' + encodeURIComponent(config.password),
    'loginID=' + config.userId + '&loginPW=' + encodeURIComponent(config.password),
  ];

  for (var i = 0; i < loginPatterns.length; i++) {
    var pat = loginPatterns[i];
    var fieldName = pat.split('=')[0];
    var resp = await request('POST', '/TeleplanBroker', pat, null, cookies1);
    var statusDesc = resp.status + (resp.body.indexOf('error') > -1 || resp.body.indexOf('Error') > -1 ? ' (error in body)' : ' (no error keyword)');
    var hasCookie = !!extractCookies(resp.headers);
    console.log('  Pattern [' + fieldName + '...]: HTTP ' + statusDesc + ' | new cookie: ' + hasCookie);
    if (resp.status === 302 || hasCookie) {
      console.log('  *** Possible login success! Redirects to:', resp.headers.location || '(no redirect)');
      console.log('  Cookie:', extractCookies(resp.headers));
      console.log('  Body snippet:', resp.body.slice(0, 500));
    }
  }

  console.log('\nDone. Share this output to determine the correct call format.');
}

probe().catch(function(e){ console.error('FATAL:', e.message); process.exit(1); });
