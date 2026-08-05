'use strict';

/**
 * teleplan/claims.js
 *
 * Teleplan inbound record serializers — spec v4.6.
 *
 * RECORD TYPES (all require CRLF termination, handled by buildSubmissionFile)
 *   VS1  200 chars — Vendor Submission Control  (mandatory first record)
 *   B04   80 chars — Batch Eligibility Request
 *   C02  424 chars — MSP Claim Detail (part 1 = 264, OIN part 2 = 160)
 *   N01  426 chars — Note Record (immediately follows its parent C02)
 *
 * DATA-CENTRE-SEQNUM must be strictly sequential across ALL records in a
 * submission.  A persistent counter is kept in teleplan/.seqnum so numbers
 * don't restart between harness runs.
 *
 * SPEC SOURCE: ch2.pdf – Teleplan4 Web Record Specifications v4.6
 */

const fs   = require('fs');
const path = require('path');

// ── Padding helpers ────────────────────────────────────────────────────────────

/**
 * Left-justify string, right-pad with spaces.
 * Pass truncate=true for free-text fields (addresses, names) where silently
 * capping to the field width is the correct behaviour.
 */
function rpad(val, len, truncate) {
  var s = (val == null ? '' : String(val));
  if (s.length > len) {
    if (truncate) return s.slice(0, len);
    throw new Error('rpad overflow "' + s + '" → ' + len);
  }
  return s.padEnd(len, ' ');
}

/** Right-justify, left-pad with zeros (numeric fields). */
function zpad(val, len) {
  var s = (val == null ? '0' : String(val).replace(/\D/g, ''));
  if (s === '') s = '0';
  if (s.length > len) s = s.slice(-len);
  return s.padStart(len, '0');
}

/** Dollar amount → 9(5)V99 (7-char integer cents, no decimal point). */
function moneypad(dollars) {
  var cents = Math.round(parseFloat(dollars || 0) * 100);
  return String(cents).padStart(7, '0').slice(-7);
}

/** Alphanumeric right-justified (fee items). */
function zpadA(val, len) {
  var s = (val == null ? '' : String(val));
  if (s.length > len) throw new Error('zpadA overflow "' + s + '" → ' + len);
  return s.padStart(len, '0');
}

// ── Sequence counter ──────────────────────────────────────────────────────────

var SEQNUM_FILE = path.join(__dirname, '.seqnum');

function readSeq() {
  try { return parseInt(fs.readFileSync(SEQNUM_FILE, 'utf8').trim(), 10) || 0; }
  catch (e) { return 0; }
}

function saveSeq(n) {
  fs.writeFileSync(SEQNUM_FILE, String(n));
}

/** Return next sequence number (1-9999999 wrapping). */
function nextSeq(counter) {
  var n = counter[0] + 1;
  if (n > 9999999) n = 1;
  counter[0] = n;
  return n;
}

// ── VS1 — Vendor Submission Control (200 chars) ───────────────────────────────
// P01 RECORD-CODE (3)
// P02 DATA-CENTRE-NUMBER (5)
// P03 DATA-CENTRE-SEQUENCE (7)
// P04 VENDORS-MSP-DC-NUMBR (5)
// P05 VENDORS-SOFTWARE-NAME (25)
// P06 VENDORS-SOFTWARE-VERSION (10)
// P07 VENDORS-SOFTWARE-INSTALLED-DATE (8) CCYYMMDD
// P08 VENDORS-COMPANY-NAME (40)
// P09 VENDOR-CONTACT (15)
// P10 VENDOR-CONTACT-NAME (25)
// P100 FILLER (57)

function buildVS1(config, seqNum) {
  var r =
    'VS1' +
    rpad(config.vendorDC,      5) +
    zpad(seqNum,               7) +
    rpad(config.vendorDC,      5) +
    rpad(config.softwareName  || 'Sky Claims',               25, true) +
    rpad(config.softwareVer   || '1.0.0',                    10, true) +
    rpad(config.installDate   || '20260521',                  8) +
    rpad(config.companyName   || 'Sky Health Technologies Inc', 40, true) +
    rpad(config.contactPhone  || '(604) 000-0000',           15, true) +
    rpad(config.contactName   || 'Austin Ekeoba',             25, true) +
    rpad('',                  57);

  if (r.length !== 200) throw new Error('VS1 length=' + r.length + ' (expected 200)');
  return r;
}

// ── B04 — Batch Eligibility Request (80 chars) ────────────────────────────────
// P00 REC-CODE-IN (3)
// P02 DATA-CENTRE-NUM (5)
// P04 DATA-CENTRE-SEQNUM (7)
// P06 PAYEE-NUM (5)
// P08 MSP-REGISTRATION/PHN (10)
// P10 DEPENDENT-NUM (2)
// P12 NAME-VERIFY (4)
// P14 BIRTH-DATE (8)     CCYYMMDD
// P16 DATE-OF-SERVICE (8) CCYYMMDD
// P18 SEX (1)
// P20 PATIENT-STATUS-REQUEST (1)
// P22 OFFICE-FOLIO-NUMBER (7)
// P99 FILLER (19)

function buildB04(config, seqNum, rec) {
  var r =
    'B04' +
    rpad(config.vendorDC,           5) +
    zpad(seqNum,                    7) +
    rpad(config.testPayee,          5) +
    zpad(rec.phn,                  10) +
    zpad(rec.dependentNum || '0',   2) +
    rpad(rec.nameVerify   || '    ', 4) +
    zpad(rec.birthDate,             8) +
    zpad(rec.dateOfService || todayYMD(), 8) +
    rpad(rec.sex           || ' ',  1) +
    rpad(rec.statusRequest || ' ',  1) +
    zpad(rec.folioNum      || '0',  7) +
    rpad('',                       19);

  if (r.length !== 80) throw new Error('B04 length=' + r.length + ' (expected 80)');
  return r;
}

// ── C02 — MSP Claim Detail (424 chars = 264 part-1 + 160 OIN part-2) ─────────
//
// Part 1 (264 chars):
// P00 REC-CODE-IN (3)
// P02 DATA-CENTRE-NUM (5)
// P04 DATA-CENTRE-SEQNUM (7)
// P06 PAYEE-NUM (5)
// P08 PRACTITIONER-NUM (5)
// P14 MSP-REGISTRATION/PHN (10)
// P16 NAME-VERIFY (4)
// P18 DEPENDENT-NUM (2)
// P20 BILLED-SRV-UNITS (3)
// P22 SERVICE-CLARIFICATION-CODE (2)
// P23 ANATOMICAL-AREA (2)
// P24 AFTER-HOURS-INDICATOR (1)
// P25 NEW-PROGRAM-INDICATOR (2)
// P26 BILLED-FEE-ITEM (5)
// P27 BILLED-AMOUNT 9(5)V99 (7)
// P28 PAYMENT-MODE (1)
// P30 SERVICE-DATE (8)
// P32 SERVICE-TO-DAY (2)
// P34 SUBMISSION-CODE (1)
// P35 EXTENDED-SUBMISSION-CODE (1)
// P36 DIAGNOSTIC-CODE-1 (5)
// P37 DIAGNOSTIC-CODE-2 (5)
// P38 DIAGNOSTIC-CODE-3 (5)
// P39 DIAGNOSTIC-EXPANSION (15)
// P40 SERVICE-LOCATION-CD (1)
// P41 REF-PRACT-1-CD (1)
// P42 REF-PRACT-1 (5)
// P44 REF-PRACT-2-CD (1)
// P46 REF-PRACT-2 (5)
// P47 TIME-CALL-RECEIVED (4)
// P48 SERVICE-TIME-START (4)
// P50 SERVICE-TIME-FINISH (4)
// P52 BIRTH-DATE (8)
// P54 OFFICE-FOLIO-NUMBER (7)
// P56 CORRESPONDENCE-CODE (1)
// P58 CLAIM-SHORT-COMMENT (20)
// P60 MVA-CLAIM-CODE (1)
// P62 ICBC-CLAIM-NUM (8)
// P64 ORIGINAL-MSP-FILE-NUM (20)
// P70 FACILITY-NUM (5)
// P72 FACILITY-SUB-NUM (5)
// P80 FILLER (58)
//
// Part 2 OIN (160 chars):
// P100 OIN-INSURER-CODE (2)
// P102 OIN-REGISTRATION-NUM (12)
// P104 OIN-BIRTHDATE (8)
// P106 OIN-FIRST-NAME (12)
// P108 OIN-SECOND-NAME-INITIAL (1)
// P110 OIN-SURNAME (18)
// P112 OIN-SEX-CODE (1)
// P114 OIN-ADDRESS-1 (25)
// P116 OIN-ADDRESS-2 (25)
// P118 OIN-ADDRESS-3 (25)
// P120 OIN-ADDRESS-4 (25)
// P122 OIN-POSTAL-CODE (6)

function buildC02(config, seqNum, rec) {
  // rec.payeeNum overrides config.testPayee — used for opted-out practitioners
  // who must bill under their own payee number rather than the generic test payee.
  var payeeNum = rec.payeeNum || config.testPayee;
  var practNum = rec.practitionerNum || config.practitionerNum || config.testPayee;

  var p1 =
    'C02' +
    rpad(config.vendorDC,                    5) +
    zpad(seqNum,                             7) +
    rpad(payeeNum,                           5) +
    rpad(practNum,                           5) +
    zpad(rec.phn       || '0000000000',     10) +
    rpad(rec.nameVerify || '    ',           4) +
    zpad(rec.dependentNum || '0',            2) +
    zpad(rec.units     || '1',               3) +
    rpad(rec.scc       || '00',              2) +
    rpad(rec.anatomicalArea || '  ',         2) +
    rpad(rec.afterHours || '0',              1) +
    rpad(rec.newProgram || '00',             2) +
    zpadA(rec.feeItem  || '00110',           5) +
    moneypad(rec.amount || 0)               +
    rpad(rec.paymentMode || '0',             1) +
    zpad(rec.serviceDate || todayYMD(),      8) +
    zpad(rec.serviceToDay || '0',            2) +
    rpad(rec.submissionCode || '0',          1) +
    rpad(rec.extSubmissionCode || ' ',       1) +
    rpad(rec.dx1 || '     ',                 5) +
    rpad(rec.dx2 || '     ',                 5) +
    rpad(rec.dx3 || '     ',                 5) +
    rpad(rec.dxExpansion || '               ', 15) +
    rpad(rec.serviceLocation || 'L',         1) +
    rpad(rec.ref1Code  || '0',               1) +
    rpad(rec.ref1Pract || '00000',           5) +
    rpad(rec.ref2Code  || '0',               1) +
    rpad(rec.ref2Pract || '00000',           5) +
    zpad(rec.timeCallReceived || '0',        4) +
    zpad(rec.timeStart || '0',               4) +
    zpad(rec.timeFinish || '0',              4) +
    zpad(rec.birthDate || '0',               8) +
    zpad(rec.folioNum  || '0',               7) +
    rpad(rec.correspondenceCode || '0',      1) +
    rpad(rec.shortComment || '                    ', 20) +
    rpad(rec.mvaCode   || 'N',               1) +
    rpad(rec.icbcClaimNum || '00000000',     8) +
    rpad(rec.origMspFileNum || '                    ', 20) +
    rpad(rec.facilityNum || '     ',         5) +
    rpad(rec.facilitySubNum || '     ',      5) +
    rpad('',                                58);

  if (p1.length !== 264) throw new Error('C02 p1 length=' + p1.length + ' (expected 264)');

  var oin = rec.oin || null;
  var p2;
  if (oin) {
    // P102 (OIN-REGISTRATION-NUM, 12 chars) — padding rule depends on insurer type:
    //   WC (WorkSafeBC) / PP (Pay Patient / opted-out BC):
    //     BC PHN is 10 digits starting with "9"; right-pad with spaces so the
    //     leading "9" is preserved. Spec p.25/26: health number must start with "9".
    //   All other OIN insurer codes (ON, AB, MB, SK, etc.):
    //     Out-of-province health numbers right-justified, left-zero-filled. Spec p.63.
    var oinRegNum = (oin.insurerCode === 'WC' || oin.insurerCode === 'PP')
      ? rpad(oin.regNum || '            ', 12, true)
      : zpad(oin.regNum || '0', 12);

    p2 =
      rpad(oin.insurerCode  || '  ',  2) +
      oinRegNum                          +
      zpad(oin.birthDate    || '0',   8) +
      rpad(oin.firstName    || '            ', 12, true) +
      rpad(oin.middleInitial || ' ',   1) +
      rpad(oin.surname      || '                  ', 18, true) +
      rpad(oin.sex          || ' ',    1) +
      rpad(oin.address1     || '                         ', 25, true) +
      rpad(oin.address2     || '                         ', 25, true) +
      rpad(oin.address3     || '                         ', 25, true) +
      rpad(oin.address4     || '                         ', 25, true) +
      rpad(oin.postalCode   || '      ',  6);
  } else {
    p2 = rpad('', 160);
  }

  if (p2.length !== 160) throw new Error('C02 p2 length=' + p2.length + ' (expected 160)');

  var r = p1 + p2;
  if (r.length !== 424) throw new Error('C02 length=' + r.length + ' (expected 424)');
  return r;
}

// ── N01 — Note Record (426 chars) ─────────────────────────────────────────────
// P01 NOTE-BASIC-IN (25) = REC-CODE-IN(3)+DC-NUM(5)+DC-SEQ(7)+PAYEE(5)+PRACT(5)
// P20 NOTE-DATA-TYPE (1) 'A'=regular 'W'=WSBC 'P'=PBF
// P22 NOTE-DATA-LINE (400)

function buildN01(config, seqNum, rec) {
  var practNum = rec.practitionerNum || config.practitionerNum || config.testPayee;

  var header =
    'N01' +
    rpad(config.vendorDC,   5) +
    zpad(seqNum,            7) +
    rpad(config.testPayee,  5) +
    rpad(practNum,          5);

  var r = header +
    rpad(rec.noteType || 'A', 1) +
    rpad(rec.text     || '',  400);

  if (r.length !== 426) throw new Error('N01 length=' + r.length + ' (expected 426)');
  return r;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function todayYMD() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function yesterdayYMD() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
}

// ── File assembler ────────────────────────────────────────────────────────────

/**
 * Build a complete Teleplan submission file.
 * @param {object}   config   from loadConfig()
 * @param {object[]} records  array of descriptors, each with `type` c02/b04/n01
 * @returns {string}  CRLF-terminated file content ready to POST to AsendClaims
 */
function buildSubmissionFile(config, records) {
  var startSeq = readSeq();
  var counter  = [startSeq];
  var lines    = [];

  lines.push(buildVS1(config, nextSeq(counter)));

  for (var i = 0; i < records.length; i++) {
    var rec  = records[i];
    var seq  = nextSeq(counter);
    var line;

    switch (rec.type) {
      case 'c02': line = buildC02(config, seq, rec); break;
      case 'b04': line = buildB04(config, seq, rec); break;
      case 'n01': line = buildN01(config, seq, rec); break;
      default:
        throw new Error('Unknown record type "' + rec.type + '"');
    }
    lines.push(line);
  }

  saveSeq(counter[0]);

  return lines.join('\r\n') + '\r\n';
}

module.exports = {
  buildSubmissionFile,
  buildVS1,
  buildB04,
  buildC02,
  buildN01,
  todayYMD,
  yesterdayYMD,
};
