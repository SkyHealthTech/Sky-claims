'use strict';

/**
 * teleplan/client.js — Teleplan Web Services HTTP transport.
 *
 * ExternalAction naming pattern (confirmed from live server):
 *   J = navigate to HTML form page (GET)
 *   W = submit form data / execute action (POST/GET)
 *
 * Confirmed actions:
 *   WsignOn      — login
 *   WsignOff     — logout
 *   WcheckE45    — real-time eligibility check (POST, HTML response)
 *   WputRemit    — submit claims file (POST multipart/form-data)
 *                  field: submitFile (file), rfc1867statusid (hidden UUID)
 */

const https = require('https');
const { URLSearchParams } = require('url');

class TeleplanClient {
  constructor(config) {
    this.config    = config;
    this._cookie   = null;
    this._loggedIn = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async login() {
    const init = await this._request('GET', '/TeleplanBroker', null);
    this._cookie = extractCookies(init.headers, null);
    if (!this._cookie) throw new TeleplanError('Login failed: no session cookie from initial GET.');

    const body = new URLSearchParams({
      username: this.config.userId, password: this.config.password,
      ExternalAction: 'WsignOn', Login: 'Login',
    }).toString();
    const resp = await this._request('POST', '/TeleplanBroker', body);
    this._cookie = extractCookies(resp.headers, this._cookie);

    if (resp.body.indexOf('locked out') > -1)
      throw new TeleplanError('Account locked out. Call Teleplan Support: 1-866-456-6950 > 3 > 2.');
    if (resp.body.indexOf('User is not logged in') > -1 || resp.body.indexOf('Please log in') > -1)
      throw new TeleplanError('Login failed — check username and password in .env');

    this._loggedIn = true;
    console.log('[teleplan] Logged in. Session established.');
    return true;
  }

  async logout() {
    if (!this._loggedIn) return;
    await this._request('GET', '/TeleplanBroker?ExternalAction=WsignOff', null);
    this._loggedIn = false;
    this._cookie   = null;
    console.log('[teleplan] Logged out.');
  }

  async checkEligibility({ phn, birthDate, dateOfService, checkSubsidy, checkEyeExam }) {
    this._requireLogin();
    // Default to yesterday — avoids "future date" rejection when running UTC
    // while Teleplan server runs Pacific time (one calendar day behind).
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10).replace(/-/g,'');
    const dob = birthDate;
    const dos = dateOfService || yesterday;

    const params = new URLSearchParams({
      ExternalAction:    'WcheckE45',
      PHN:               phn,
      dateOfBirthyyyy:   dob.slice(0,4),
      dateOfBirthmm:     dob.slice(4,6),
      dateOfBirthdd:     dob.slice(6,8),
      dateOfServiceyyyy: dos.slice(0,4),
      dateOfServicemm:   dos.slice(4,6),
      dateOfServicedd:   dos.slice(6,8),
      E45Submit:         'Submit',
    });
    if (checkSubsidy) params.set('PatientVisitCharge', 'true');
    if (checkEyeExam) params.set('LastEyeExam', 'true');

    const resp = await this._request('POST', '/TeleplanBroker', params.toString());
    this._checkSessionExpiry(resp.body);
    return { ok: resp.status === 200, body: resp.body, raw: resp.body };
  }

  /**
   * Submit a fixed-width ASCII claims file.
   *
   * The JsubmitClaim form uses:
   *   ExternalAction = WputRemit
   *   submitFile     = <file upload field>
   *   rfc1867statusid = UUID (for the server-side progress popup)
   *   submit         = "Send file "
   *
   * We fetch the form page first to extract the server-generated statusid.
   */
  async sendClaims(recordText) {
    this._requireLogin();

    // Fetch the form to get the server-generated rfc1867statusid
    const formResp = await this._request('GET', '/TeleplanBroker?ExternalAction=JsubmitClaim', null);
    const sidMatch = formResp.body.match(/NAME="rfc1867statusid"\s+VALUE="([^"]+)"/i);
    const statusId = sidMatch ? sidMatch[1] : generateUUID();

    const boundary = '----TeleplanBoundary' + Date.now();
    const CR = '\r\n';
    var parts = '';

    // Hidden: rfc1867statusid
    parts += '--' + boundary + CR;
    parts += 'Content-Disposition: form-data; name="rfc1867statusid"' + CR + CR;
    parts += statusId + CR;

    // Hidden: ExternalAction
    parts += '--' + boundary + CR;
    parts += 'Content-Disposition: form-data; name="ExternalAction"' + CR + CR;
    parts += 'WputRemit' + CR;

    // File field: submitFile
    parts += '--' + boundary + CR;
    parts += 'Content-Disposition: form-data; name="submitFile"; filename="claims.txt"' + CR;
    parts += 'Content-Type: text/plain' + CR + CR;
    parts += recordText + CR;

    // Submit button
    parts += '--' + boundary + CR;
    parts += 'Content-Disposition: form-data; name="submit"' + CR + CR;
    parts += 'Send file ' + CR;

    parts += '--' + boundary + '--' + CR;

    const resp = await this._requestMultipart('/TeleplanBroker', parts, boundary);
    this._checkSessionExpiry(resp.body);
    return this._parseHostMessages(resp.body);
  }

  /**
   * Retrieve remittances.
   * Fetch the JretrieveRemit page to find the correct action, then retrieve.
   */
  async retrieveRemittances() {
    this._requireLogin();

    // First probe the retrieve page to see what action it uses
    const formResp = await this._request('GET', '/TeleplanBroker?ExternalAction=JretrieveRemit', null);
    // Extract ExternalAction from the retrieve form
    const actionMatch = formResp.body.match(/NAME="ExternalAction"\s+VALUE="([^"]+)"/i) ||
                        formResp.body.match(/ExternalAction=([A-Za-z]+)[&"]/);
    const retrieveAction = actionMatch ? actionMatch[1] : 'WgetRemit';

    const resp = await this._request('GET', '/TeleplanBroker?ExternalAction=' + retrieveAction, null);
    this._checkSessionExpiry(resp.body);
    return this._parseHostMessages(resp.body);
  }

  /** Fetch the send-claims form page (used by probe-sendform.js). */
  async probeSendClaimsForm() {
    this._requireLogin();
    const resp = await this._request('GET', '/TeleplanBroker?ExternalAction=JsubmitClaim', null);
    return resp.body;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _requireLogin() {
    if (!this._loggedIn) throw new TeleplanError('Not logged in — call client.login() first.');
  }

  _checkSessionExpiry(body) {
    if (body && (body.indexOf('User is not logged in') > -1 ||
                 body.indexOf('session expired') > -1)) {
      this._loggedIn = false;
      throw new TeleplanError('Session expired — call client.login() to re-authenticate.');
    }
  }

  _request(method, path, body) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var headers = {
        'User-Agent': 'SkyClaims/1.0 (Teleplan Vendor V0127)',
        'Accept':     'text/html,application/xhtml+xml,*/*',
      };
      if (self._cookie) headers['Cookie'] = self._cookie;
      if (body) {
        headers['Content-Type']   = 'application/x-www-form-urlencoded';
        headers['Content-Length'] = Buffer.byteLength(body);
      }
      var opts = {
        hostname: self.config.isTest ? 'tlpt2.moh.hnet.bc.ca' : 'teleplan.hnet.bc.ca',
        port: 443, path: path, method: method, headers: headers,
      };
      var respBody = '';
      var r = https.request(opts, function(res) {
        res.setEncoding('latin1');
        res.on('data', function(c){ respBody += c; });
        res.on('end', function(){
          self._cookie = extractCookies(res.headers, self._cookie);
          resolve({ status: res.statusCode, headers: res.headers, body: respBody });
        });
      });
      r.on('error', function(e){ reject(new TeleplanError('Network error: ' + e.message)); });
      r.setTimeout(30000, function(){ r.destroy(); reject(new TeleplanError('Request timed out')); });
      if (body) r.write(body);
      r.end();
    });
  }

  _requestMultipart(path, body, boundary) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var buf = Buffer.from(body, 'binary');
      var headers = {
        'User-Agent':   'SkyClaims/1.0 (Teleplan Vendor V0127)',
        'Accept':       'text/html,application/xhtml+xml,*/*',
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': buf.length,
      };
      if (self._cookie) headers['Cookie'] = self._cookie;
      var opts = {
        hostname: self.config.isTest ? 'tlpt2.moh.hnet.bc.ca' : 'teleplan.hnet.bc.ca',
        port: 443, path: path, method: 'POST', headers: headers,
      };
      var respBody = '';
      var r = https.request(opts, function(res) {
        res.setEncoding('latin1');
        res.on('data', function(c){ respBody += c; });
        res.on('end', function(){
          self._cookie = extractCookies(res.headers, self._cookie);
          resolve({ status: res.statusCode, headers: res.headers, body: respBody });
        });
      });
      r.on('error', function(e){ reject(new TeleplanError('Network error: ' + e.message)); });
      r.setTimeout(60000, function(){ r.destroy(); reject(new TeleplanError('Upload timed out')); });
      r.write(buf);
      r.end();
    });
  }

  // ── Probe helpers (probe-sendform.js) ──────────────────────────────────────

  async _sendMultipartProbe(action, fieldName, recordText) {
    const boundary = '----TeleplanBoundary' + Date.now();
    const CR = '\r\n';
    var parts = '';
    parts += '--' + boundary + CR;
    parts += 'Content-Disposition: form-data; name="ExternalAction"' + CR + CR;
    parts += action + CR;
    parts += '--' + boundary + CR;
    parts += 'Content-Disposition: form-data; name="' + fieldName + '"; filename="claims.txt"' + CR;
    parts += 'Content-Type: text/plain' + CR + CR;
    parts += recordText + CR;
    parts += '--' + boundary + CR;
    parts += 'Content-Disposition: form-data; name="Submit"' + CR + CR;
    parts += 'Submit' + CR;
    parts += '--' + boundary + '--' + CR;
    return this._requestMultipart('/TeleplanBroker', parts, boundary);
  }

  async _sendUrlencodedProbe(action, fieldName, recordText) {
    var p = new URLSearchParams({ ExternalAction: action, Submit: 'Submit' });
    p.set(fieldName, recordText);
    return this._request('POST', '/TeleplanBroker', p.toString());
  }

  _parseHostMessages(body) {
    var lines = body.split(/\r?\n/).filter(Boolean);
    var messages = [];
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^(TET[ABZ]-\d+)\s*(.*)/);
      if (m) messages.push({ code: m[1], text: m[2].trim() });
    }
    var hasError = messages.some(function(m){ return ERROR_CODES.has(m.code); });
    return { ok: !hasError, messages: messages, raw: body };
  }
}

function extractCookies(headers, existing) {
  var raw = headers['set-cookie'];
  if (!raw) return existing || null;
  if (!Array.isArray(raw)) raw = [raw];
  var map = {};
  if (existing) {
    existing.split('; ').forEach(function(c) {
      var p = c.indexOf('=');
      if (p > -1) map[c.slice(0,p)] = c.slice(p+1);
    });
  }
  raw.forEach(function(c) {
    var part = c.split(';')[0].trim();
    var p = part.indexOf('=');
    if (p > -1) map[part.slice(0,p).trim()] = part.slice(p+1).trim();
  });
  return Object.entries(map).map(function(e){ return e[0]+'='+e[1]; }).join('; ');
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const ERROR_CODES = new Set([
  'TETA-002','TETA-005','TETA-006','TETA-008',
  'TETA-020','TETA-021','TETA-022','TETA-023','TETA-024','TETA-025','TETA-026',
  'TETB-001','TETB-002','TETB-005','TETB-006','TETB-007','TETB-008','TETB-020',
  'TETZ-002','TETZ-005','TETZ-006','TETZ-007','TETZ-008',
  'TETZ-020','TETZ-021','TETZ-022','TETZ-023','TETZ-024',
]);

class TeleplanError extends Error {
  constructor(message) { super(message); this.name = 'TeleplanError'; }
}

module.exports = { TeleplanClient, TeleplanError };
