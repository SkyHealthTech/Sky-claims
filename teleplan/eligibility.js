'use strict';

/**
 * teleplan/eligibility.js
 *
 * Real-time eligibility check (WcheckE45) — point-of-service only.
 *
 * USAGE CONSTRAINTS
 *   - For unknown / previously-unseen patients only.
 *   - Batching / automated repeated calls NOT ALLOWED — HIBC will disable your DC.
 *   - A positive result is honoured through end of month of date of service.
 *   - For repeat / scheduled patients use B04 (batch eligibility in claims file).
 *
 * RESPONSE HTML STRUCTURE (confirmed from live probe7-response.html, 2026-05-26)
 *   Response code  : <OPTION VALUE="0">HJMB001I SUCCESSFULLY COMPLETED</OPTION>
 *   Person table   : <!-- Person data values --> comment precedes 4-column <span> row
 *                    Columns in order: PHN | Name | Birth Date | Gender
 *                    Name has NO comma — "BURNHAM RICHARD GERD" not "BURNHAM, RICHARD GERD"
 *   Service table  : <!-- Service data values --> comment precedes 4-column <font> row
 *                    Columns: Date of Service | YES/NO | Coverage End Date | Coverage End Reason
 *   Subsidy block  : <B>Subsidy Insured Service:</B> SERVICES PD TO DATE - N
 *                    or THIS IS NOT AN INSURED BENEFIT
 *   Eye exam block : <B>Date of Last Eye Examination:</B> YYYY-MM-DD
 *   Client instruc : <B>Patient Restriction:</B> <text><BR>
 */

class EligibilityService {
  constructor(client) {
    this.client = client;
  }

  /**
   * @param {object}  params
   * @param {string}  params.phn             10-digit BC PHN
   * @param {string}  params.birthDate       YYYYMMDD (use day=00 if unknown)
   * @param {string}  [params.dateOfService] YYYYMMDD — defaults to today
   * @param {boolean} [params.checkSubsidy]
   * @param {boolean} [params.checkEyeExam]
   * @returns {Promise<EligibilityResult>}
   */
  async check(params) {
    validateInput(params);
    const raw = await this.client.checkEligibility(params);
    if (!raw.ok) {
      throw new Error('Teleplan eligibility check failed (HTTP non-200).');
    }
    return parseResponse(raw.body);
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateInput({ phn, birthDate, dateOfService }) {
  if (!phn || !/^\d{10}$/.test(phn)) {
    throw new TypeError('Invalid PHN "' + phn + '" — must be exactly 10 digits.');
  }
  if (!birthDate || !/^\d{8}$/.test(birthDate)) {
    throw new TypeError('Invalid birthDate "' + birthDate + '" — must be YYYYMMDD.');
  }
  if (dateOfService && !/^\d{8}$/.test(dateOfService)) {
    throw new TypeError('Invalid dateOfService "' + dateOfService + '" — must be YYYYMMDD.');
  }
}

// ── Response parsing ──────────────────────────────────────────────────────────

function parseResponse(body) {
  var result = {
    raw:               body,
    ok:                false,
    responseCode:      null,
    isMergedPhn:       false,
    phn:               null,
    resolvedPhn:       null,
    name:              null,
    birthDate:         null,
    gender:            null,
    eligibleOnDate:    null,
    coverageEndDate:   null,
    coverageEndReason: null,
    subsidyPaidToDate: null,
    subsidyNotInsured: false,
    eyeExamDate:       null,
    eyeExamNoPayment:  false,
    clientInstruction: null,
    errorMsg:          null,
  };

  if (!body) return result;

  // ── Format (B): #TID= validation failure ──────────────────────────────────
  if (body.indexOf('#TID=') === 0) {
    var parts = {};
    body.split(';').forEach(function(seg) {
      var eq = seg.indexOf('=');
      if (eq > -1) parts[seg.slice(0, eq).replace('#','').trim()] = seg.slice(eq+1).trim();
    });
    result.ok       = false;
    result.errorMsg = parts['Msgs'] || parts['Result'] || body;
    return result;
  }

  // ── Format (A): WcheckE45 HTML result page ────────────────────────────────
  return parseHtmlPage(body, result);
}

function parseHtmlPage(html, result) {

  // ── 1. Response code ── in <OPTION VALUE="0">HJMB001I...</OPTION> ─────────
  var codeM = html.match(/<OPTION[^>]*>\s*(H[A-Z]{3}\d{3}[IW])/i);
  if (!codeM) {
    // Fallback: scan stripped text
    var stripped0 = html.replace(/<[^>]+>/g, ' ');
    codeM = stripped0.match(/\b(H[A-Z]{3}\d{3}[IW])\b/);
  }
  if (codeM) {
    result.responseCode = codeM[1].toUpperCase();
    result.ok           = result.responseCode === 'HJMB001I';
    result.isMergedPhn  = result.responseCode === 'HNHR511W';
  }

  // ── 2. Person data ── positional <span> row after "Person data values" ────
  //    Columns: PHN | Name | Birth Date | Gender
  var personSpans = [];
  var personIdx = html.indexOf('Person data values');
  if (personIdx > 0) {
    var personChunk = html.slice(personIdx, personIdx + 1500);
    var pRe = /<span[^>]*>\s*([^<]+?)\s*<\/span>/gi;
    var pm;
    while ((pm = pRe.exec(personChunk)) !== null) {
      var v = pm[1].trim();
      if (v) personSpans.push(v);
    }
  }
  if (personSpans[0]) result.phn       = personSpans[0];
  if (personSpans[1]) result.name      = personSpans[1].replace(/\s+/g, ' ').trim();
  if (personSpans[2]) result.birthDate = personSpans[2];
  if (personSpans[3]) result.gender    = personSpans[3].trim();

  // HNHR511W: the PHN shown in the table IS the resolved (merged) PHN
  if (result.isMergedPhn && result.phn) {
    result.resolvedPhn = result.phn;
    result.phn = null;
  }

  // ── 3. Service data ── positional <font> row after "Service data values" ──
  //    Columns: Date of Service | YES/NO | Coverage End Date | Coverage End Reason
  var cellVals = [];
  var serviceIdx = html.indexOf('Service data values');
  if (serviceIdx > 0) {
    var serviceChunk = html.slice(serviceIdx, serviceIdx + 800);
    var cRe = /<TD[^>]*>\s*<font[^>]*>([\s\S]*?)<\/font>/gi;
    var cv;
    while ((cv = cRe.exec(serviceChunk)) !== null) {
      cellVals.push(cv[1].replace(/<[^>]+>/g, '').trim());
    }
  }
  if (cellVals[1] !== undefined) {
    var elig = cellVals[1].toUpperCase().trim();
    if (elig === 'YES') result.eligibleOnDate = true;
    if (elig === 'NO')  result.eligibleOnDate = false;
  }
  if (cellVals[2] && /^\d{8}$/.test(cellVals[2])) result.coverageEndDate   = cellVals[2];
  if (cellVals[3] && cellVals[3].length > 0)       result.coverageEndReason = cellVals[3].replace(/\s+/g, ' ').trim();

  // ── 4. Subsidy block ─────────────────────────────────────────────────────
  // "SERVICES PD TO DATE - 0"  or  "SERVICES PAID TO DATE - 8"
  var subM = html.match(/SERVICES\s+P(?:AI)?D\s+TO\s+DATE\s*[-:]\s*(\d+)/i);
  if (subM) result.subsidyPaidToDate = parseInt(subM[1], 10);
  if (/THIS\s+IS\s+NOT\s+AN\s+INSURED\s+BENEFIT/i.test(html)) result.subsidyNotInsured = true;

  // ── 5. Eye exam block ────────────────────────────────────────────────────
  // "<B>Date of Last Eye Examination:</B> 2024-01-01"
  var eyeM = html.match(/Date\s+of\s+Last\s+Eye\s+Examination[^<]*<\/B>\s*([\d-]{10})/i);
  if (!eyeM) {
    // Fallback: search stripped text
    var t2 = html.replace(/<[^>]+>/g, ' ');
    eyeM = t2.match(/Date of Last Eye Examination\s*[:\s]+(\d{4}-\d{2}-\d{2})/i);
  }
  if (eyeM) result.eyeExamDate = eyeM[1].trim();
  if (/MSP\s+HAS\s+NOT\s+PAID\s+FOR\s+AN\s+EYE\s+EXAM/i.test(html)) result.eyeExamNoPayment = true;

  // ── 6. Client instruction ── "<B>Patient Restriction:</B> text <BR>" ─────
  var instrM = html.match(/<B>Patient[\s\S]{0,30}?Restriction:<\/B>([\s\S]*?)<BR/i);
  if (instrM) {
    var instr = instrM[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (instr.length > 2) result.clientInstruction = instr;
  }

  return result;
}

module.exports = { EligibilityService, parseResponse, validateInput };
