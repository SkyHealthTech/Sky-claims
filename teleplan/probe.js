'use strict';

/**
 * teleplan/probe.js
 * Diagnostic script — runs once, tells us the correct API call format.
 * Run: node teleplan/probe.js
 */

const https = require('https');
const { loadConfig } = require('./config');

const config = loadConfig();
const creds  = Buffer.from(config.userId + ':' + config.password).toString('base64');
const auth   = 'Basic ' + creds;

function get(path) {
  return new Promise(function(resolve) {
    var options = {
      hostname: 'tlpt2.moh.hnet.bc.ca',
      port: 443,
      path: path,
      method: 'GET',
      headers: { 'Authorization': auth, 'User-Agent': 'SkyClaims/1.0' }
    };
    var body = '';
    var req = https.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function(c){ body += c; });
      res.on('end', function(){ resolve({ status: res.statusCode, headers: res.headers, body: body.slice(0, 800) }); });
    });
    req.on('error', function(e){ resolve({ status: 'ERR', error: e.message }); });
    req.setTimeout(10000, function(){ req.destroy(); resolve({ status: 'TIMEOUT' }); });
    req.end();
  });
}

function post(path, body, contentType) {
  contentType = contentType || 'application/x-www-form-urlencoded';
  return new Promise(function(resolve) {
    var options = {
      hostname: 'tlpt2.moh.hnet.bc.ca',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'SkyClaims/1.0'
      }
    };
    var respBody = '';
    var req = https.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function(c){ respBody += c; });
      res.on('end', function(){ resolve({ status: res.statusCode, headers: res.headers, body: respBody.slice(0, 1200) }); });
    });
    req.on('error', function(e){ resolve({ status: 'ERR', error: e.message }); });
    req.setTimeout(10000, function(){ req.destroy(); resolve({ status: 'TIMEOUT' }); });
    req.write(body);
    req.end();
  });
}

async function probe() {
  console.log('=== Teleplan endpoint probe ===');
  console.log('Host: tlpt2.moh.hnet.bc.ca');
  console.log('User: ' + config.userId + '\n');

  var paths = [
    ['GET',  '/TeleplanBroker'],
    ['GET',  '/TeleplanBroker/'],
    ['GET',  '/TeleplanBroker?wsdl'],
    ['GET',  '/TeleplanBroker/wsdl'],
    ['POST', '/TeleplanBroker'],
    ['POST', '/TeleplanBroker/'],
  ];

  for (var i = 0; i < paths.length; i++) {
    var method = paths[i][0];
    var path   = paths[i][1];
    var result;
    if (method === 'GET') {
      result = await get(path);
    } else {
      result = await post(path, 'action=AcheckE45&phn=9151210417&birthDate=19591128');
    }
    console.log('--- ' + method + ' ' + path + ' ---');
    console.log('Status :', result.status);
    if (result.error) { console.log('Error  :', result.error); }
    if (result.headers && result.headers['content-type']) {
      console.log('Content-Type:', result.headers['content-type']);
    }
    if (result.body) {
      console.log('Body preview:');
      console.log(result.body);
    }
    console.log();
  }
}

probe().catch(function(e){ console.error('FATAL:', e.message); process.exit(1); });
