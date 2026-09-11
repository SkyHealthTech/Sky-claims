'use strict';

/**
 * hlink/conformance-harness.js
 *
 * Alberta AHCIP H-Link Conformance Test Harness
 * ==============================================
 *
 * Builds and submits all required test batches for AHCIP accreditation.
 * Run with:  node hlink/conformance-harness.js [--dry-run] [--batch=<num>]
 *
 * TEST SCENARIOS (from AHCIP Checklist for Accreditation of H-Link Software Vendor)
 * ──────────────────────────────────────────────────────────────────────────────────
 *  Batch 1 (530): ACPT — All valid claims. Expect ACPT batch result.
 *  Batch 2 (531): PART — Mix of valid + 1 invalid claim. Expect PART.
 *  Batch 3 (532): RFSE — Trailer TXN count intentionally wrong. Expect RFSE.
 *  Batch 4 (533): Resubmit PART batch with NEW batch number (corrected claims).
 *  Batch 5 (534): C/R/D — Change, Reassess, Delete of previous claims.
 *  Batch 6 (535): CST1 — Claim with supporting text segment.
 *  Batch 7 (536): CPD1 Good Faith — claim with no ULI + person data segment.
 *  Batch 8 (537): CPD1 Medical Reciprocal — OOP provincial health card.
 *  Batch 9 (538): CPD1 OOP Referral — referring provider from another province.
 *  Batch 10 (539): Locum — locum practitioner claim (2 BAs on CIB1).
 *
 * TEST DATA (from HZV - MEDDS 2449-310.doc)
 * ───────────────────────────────────────────
 *  Practitioners:
 *   896340008  CHIR  BA 2449310
 *   916220008  GP    BA 7291410
 *   300340008  GP    BA 7291410
 *   148220008  OPTO  BA 7291410
 *   237400008  CHIR  BA 3849310
 *   118360008  GP    BA 9914310
 *   751460008  GP    BA 9914310
 *   415440008  GP    BA 9914310
 *   309840008  GP    BA 9198510  (Locum)
 *   226270008  DIRD  BA 1413310  (Locum)
 *
 *  Patients (PHN/ULI, 9 digits):
 *   998816000  (99881-6000)
 *   875896000  (87589-6000)
 *   185846000  (18584-6000)
 *   975886000  (97588-6000)
 *
 *  Facilities:
 *   785800  office       FC: EXRM
 *   000025  active tx    FCs: SURG / MED / EMRG
 *
 *  OOP health plan numbers:
 *   01182302   PE (Prince Edward Island)
 *   720092620  SK (Saskatchewan)
 */

const fs   = require('fs');
const path = require('path');
const { loadConfig }   = require('./config');
const { buildCIB1, buildCPD1, buildCST1, assembleBatch, batchFilename } = require('./claims');
const { HlinkSftp }    = require('./sftp');
const { parseBatchBalance, parseArdFile, printBatchBalanceSummary } = require('./parser');

// ─── Shared test data ─────────────────────────────────────────────────────────

const PREFIX      = 'HZV';
const SOURCE_CODE = 'SC';
const YEAR        = new Date().getFullYear();

// Service date: 5 days before today (keep recent but avoid today)
const TODAY   = new Date();
const SVC_DAY = new Date(TODAY - 5 * 86400000);
const SVC_DATE = String(SVC_DAY.getFullYear()) +
  String(SVC_DAY.getMonth() + 1).padStart(2, '0') +
  String(SVC_DAY.getDate()).padStart(2, '0');

// Practitioners
const PRAC = {
  GP_1:   { prid: '916220008', ba: '7291410', skill: '' },
  GP_2:   { prid: '300340008', ba: '7291410', skill: '' },
  GP_3:   { prid: '118360008', ba: '9914310', skill: '' },
  CHIR_1: { prid: '896340008', ba: '2449310', skill: '' },
  CHIR_2: { prid: '237400008', ba: '3849310', skill: '' },
  OPTO:   { prid: '148220008', ba: '7291410', skill: '' },
  LOCUM_PRAC: { prid: '309840008', ba: '9198510', skill: '' }, // GP locum
  LOCUM_HOST: { prid: '226270008', ba: '1413310', skill: '' }, // DIRD host
};

// Patient PHNs (test patients — all have 9-digit ULIs)
const PHN = {
  P1: '998816000',
  P2: '875896000',
  P3: '185846000',
  P4: '975886000',
};

// Facilities
const FAC = {
  OFFICE:     { num: '785800', fc: 'EXRM' },
  ACTIVE_TX:  { num: '000025', fc: 'SURG' },
};

// OOP patients (for CPD1 tests)
const OOP = {
  PE: { regNum: '01182302   ', province: 'PE', recoveryCode: 'PE' },
  SK: { regNum: '720092620   ', province: 'SK', recoveryCode: 'SK' },
};

// Health service codes — GP uses 03.01A; CHIR/OPTO use placeholders
// (update if test system returns invalid-HSC errors)
const HSC = {
  GP_OFFICE_VISIT: '03.01A ',  // 7 chars: diagnostic interview unqualified
  CHIR_CONSULT:    '03.01A ',  // Placeholder — adjust after first batch result
  OPTO_EXAM:       '03.01A ',  // Placeholder — adjust after first batch result
};

// R3 health service codes — SOMB 2026 (replaces expired 03.01A, end date 2007-01-31)
// Source: Alberta Schedule of Medical Benefits, effective April 1, 2026
const HSC_R3 = {
  GP_OFFICE_VISIT: '03.03A ',  // Limited Assessment — in office, $40.23 (SOMB 2026)
};

// Submitter's Fee for Service BA for prefix HZV (field 173-179 in locum claims)
// AHCIP Round 2 feedback: field 173-179 must be submitter's FFS BA, not the host prac's BA
const SUBMITTER_FFS_BA = '2449310';

// ICD-9 diagnosis code (6 chars, right-padded)
const DX_URI = '465   ';   // Acute upper respiratory infection

// ─── Sequence counter ─────────────────────────────────────────────────────────

let _seqCounter = 1;
function nextSeq() { return _seqCounter++; }
function resetSeq() { _seqCounter = 1; }

// ─── Batch builders ───────────────────────────────────────────────────────────

/** Helper for a common CIB1 with GP office visit at facility. */
function gpOfficeVisit(prac, uli, overrides) {
  const seq = nextSeq();
  return buildCIB1(Object.assign({
    prefix:              PREFIX,
    seq,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'A',
    segSeq:              1,
    prid:                prac.prid,
    skillCode:           prac.skill,
    uli,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: prac.ba,
    payToCode:           'BAPY',
  }, overrides || {}));
}

// ─── BATCH 1: ACPT (all valid, expect full acceptance) ───────────────────────

function buildBatch1_ACPT(batchNum) {
  resetSeq();
  const txns = [
    // Claim 1: GP office visit, patient 1
    gpOfficeVisit(PRAC.GP_1, PHN.P1),
    // Claim 2: GP office visit, patient 2
    gpOfficeVisit(PRAC.GP_2, PHN.P2),
    // Claim 3: GP office visit, active treatment facility
    gpOfficeVisit(PRAC.GP_3, PHN.P3, {
      facilityNum: FAC.ACTIVE_TX.num,
      functCentre: FAC.ACTIVE_TX.fc,
    }),
  ];
  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, txns) };
}

// ─── BATCH 2: PART (one valid + one claim expected to be refused) ─────────────

function buildBatch2_PART(batchNum) {
  resetSeq();
  // Claim 1: valid
  const claim1 = gpOfficeVisit(PRAC.GP_1, PHN.P4);

  // Claim 2: deliberately invalid — use a PHN that should not exist in test system
  // Using all-zeros ULI causes an eligibility failure on the claim but
  // doesn't kill the whole batch, producing a PART result.
  const seq2 = nextSeq();
  const claim2 = buildCIB1({
    prefix:              PREFIX,
    seq:                 seq2,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'A',
    segSeq:              1,
    prid:                PRAC.GP_2.prid,
    uli:                 '000000000',   // invalid ULI → expect claim refusal
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_2.ba,
    payToCode:           'BAPY',
  });

  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, [claim1, claim2]) };
}

// ─── BATCH 3: RFSE (trailer TXN count wrong → force batch refusal) ───────────

function buildBatch3_RFSE(batchNum, opts) {
  resetSeq();
  const txns = [
    gpOfficeVisit(PRAC.GP_1, PHN.P1),
  ];
  // Normally force trailer count to 0 → batch format error → RFSE (test 1C).
  // Pass opts.fix = true to build the corrected version for test 4 resubmission.
  const asmOpts = (opts && opts.fix) ? {} : { forceTrailerTxnCount: 0 };
  return {
    filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, txns, asmOpts),
  };
}

// ─── BATCH 4: Resubmit PART with new batch number (corrected claims) ──────────

function buildBatch4_ResubmitPART(batchNum) {
  // Resubmit only the VALID claim from batch 2 (the refused claim is dropped).
  // In practice, this would be the same claim rebuilt with the same claim number
  // but in a new batch. For simplicity we re-build with a new sequence.
  resetSeq();
  const txns = [
    gpOfficeVisit(PRAC.GP_1, PHN.P4),
  ];
  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, txns) };
}

// ─── BATCH 5: C / R / D transactions ────────────────────────────────────────
//
// These reference a claim that was ACCEPTED in batch 1 (Claim 1).
// The original claim number: HZV + YY + SC + 0000001 + checkDigit
// We'll use the same seq=1 with action code C/R/D.
//
// IMPORTANT: For C/D/R, the ORIGINAL claim number must be used, meaning
// the same prefix+year+sourceCode+seq as submitted in the original 'A' transaction.

function buildBatch5_CRD(batchNum, originalSeq1, originalSeq2, originalSeq3) {
  // Use original seqs from batch 1 (seqs 1, 2, 3)
  const seq1 = originalSeq1 || 1;
  const seq2 = originalSeq2 || 2;
  const seq3 = originalSeq3 || 3;

  // Change (C): update the HSC on claim 1
  const change = buildCIB1({
    prefix:              PREFIX,
    seq:                 seq1,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'C',
    segSeq:              1,
    prid:                PRAC.GP_1.prid,
    uli:                 PHN.P1,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_1.ba,
    payToCode:           'BAPY',
  });

  // Reassess (R) with text: claim 2 — requires CST1 segment
  const reassessSeq = nextSeq(); // new batch seq for new type-3 records
  const reassess = buildCIB1({
    prefix:              PREFIX,
    seq:                 seq2,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'R',
    segSeq:              1,
    prid:                PRAC.GP_2.prid,
    uli:                 PHN.P2,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_2.ba,
    payToCode:           'BAPY',
  });
  const reassessText = buildCST1({
    prefix:     PREFIX,
    seq:        seq2,
    sourceCode: SOURCE_CODE,
    year:       YEAR,
    actionCode: 'R',
    segSeq:     2,
    line1:      'REASSESSMENT REQUEST: Additional documentation submitted.',
    line2:      'Service medically necessary per attending physician notes.',
  });

  // Delete (D): claim 3
  const del = buildCIB1({
    prefix:              PREFIX,
    seq:                 seq3,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'D',
    segSeq:              1,
    prid:                PRAC.GP_3.prid,
    uli:                 PHN.P3,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.ACTIVE_TX.num,
    functCentre:         FAC.ACTIVE_TX.fc,
    businessArrangement: PRAC.GP_3.ba,
    payToCode:           'BAPY',
  });

  const txns = [change, reassess, reassessText, del];
  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, txns) };
}

// ─── BATCH 6: CST1 Supporting Text ──────────────────────────────────────────

function buildBatch6_CST1(batchNum) {
  resetSeq();
  const seq = nextSeq();

  const cib1 = buildCIB1({
    prefix:              PREFIX,
    seq,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'A',
    segSeq:              1,
    prid:                PRAC.GP_1.prid,
    uli:                 PHN.P1,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_1.ba,
    payToCode:           'BAPY',
    emsaf:               'Y',       // EMSAF indicator triggers supporting text requirement
  });

  const text1 = buildCST1({
    prefix:     PREFIX,
    seq,
    sourceCode: SOURCE_CODE,
    year:       YEAR,
    actionCode: 'A',
    segSeq:     2,
    line1:      'EMSAF CLAIM: Extraordinary medical service provided after hours.',
    line2:      'Patient required immediate intervention outside scheduled hours.',
    line3:      'Additional compensation amount: $75.00 above schedule rate.',
  });

  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, [cib1, text1]) };
}

// ─── BATCH 7: CPD1 Good Faith ────────────────────────────────────────────────

function buildBatch7_GoodFaith(batchNum) {
  resetSeq();
  const seq = nextSeq();

  // Good Faith: ULI blank, Good Faith indicator 'Y', CPD1 for RECP required
  const cib1 = buildCIB1({
    prefix:              PREFIX,
    seq,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'A',
    segSeq:              1,
    prid:                PRAC.GP_1.prid,
    uli:                 '',          // blank for Good Faith
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_1.ba,
    payToCode:           'BAPY',
    goodFaith:           'Y',
  });

  // CPD1 for Service Recipient (fabricated demographics — Good Faith patient)
  const cpd1 = buildCPD1({
    prefix:       PREFIX,
    seq,
    sourceCode:   SOURCE_CODE,
    year:         YEAR,
    actionCode:   'A',
    segSeq:       2,
    personType:   'RECP',
    surname:      'SMITH',
    firstName:    'JOHN',
    middleName:   'A',
    birthDate:    '19750315',
    genderCode:   'M',
    addrLine1:    '123 MAIN STREET',
    city:         'EDMONTON',
    postalCode:   'T5J2Z3',
    provinceCode: 'AB',
    countryCode:  'CAN ',
  });

  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, [cib1, cpd1]) };
}

// ─── BATCH 8: CPD1 Medical Reciprocal (OOP — Saskatchewan) ──────────────────

function buildBatch8_MedReciprocal(batchNum) {
  resetSeq();
  const seq = nextSeq();

  // Medical Reciprocal: Service Recipient has OOP health card (SK)
  // Service Recipient ULI = blank, regNum = OOP health card, recoveryCode = 'SK'
  // CPD1 for RECP with demographics required
  const cib1 = buildCIB1({
    prefix:              PREFIX,
    seq,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'A',
    segSeq:              1,
    prid:                PRAC.GP_1.prid,
    uli:                 '',
    regNum:              OOP.SK.regNum,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_1.ba,
    payToCode:           'BAPY',
    recoveryCode:        'SK  ',
  });

  // CPD1 for OOP Service Recipient (fabricated SK demographics)
  const cpd1 = buildCPD1({
    prefix:       PREFIX,
    seq,
    sourceCode:   SOURCE_CODE,
    year:         YEAR,
    actionCode:   'A',
    segSeq:       2,
    personType:   'RECP',
    surname:      'JOHNSON',
    firstName:    'MARY',
    birthDate:    '19820620',
    genderCode:   'F',
    addrLine1:    '456 QUEEN STREET',
    city:         'REGINA',
    postalCode:   'S4P3Y2',
    provinceCode: 'SK',
    countryCode:  'CAN ',
  });

  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, [cib1, cpd1]) };
}

// ─── BATCH 9: CPD1 OOP Referral ──────────────────────────────────────────────

function buildBatch9_OOPReferral(batchNum) {
  resetSeq();
  const seq = nextSeq();

  // OOP Referral: Service Recipient is Alberta patient (has ULI),
  // Referring provider is from another province (PEI) — no Alberta PRID.
  // OOP Referral Indicator = 'Y', CPD1 for RFRC required.
  const cib1 = buildCIB1({
    prefix:              PREFIX,
    seq,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'A',
    segSeq:              1,
    prid:                PRAC.GP_1.prid,
    uli:                 PHN.P1,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_1.ba,
    payToCode:           'BAPY',
    referralId:          '',         // blank — OOP referring provider has no AB PRID
    oopReferral:         'Y',
  });

  // CPD1 for OOP Referring Service Provider (fabricated PEI provider)
  const cpd1 = buildCPD1({
    prefix:       PREFIX,
    seq,
    sourceCode:   SOURCE_CODE,
    year:         YEAR,
    actionCode:   'A',
    segSeq:       2,
    personType:   'RFRC',
    surname:      'LEBLANC',
    firstName:    'PIERRE',
    addrLine1:    '789 UNIVERSITY AVENUE',
    city:         'CHARLOTTETOWN',
    postalCode:   'C1A4L9',
    provinceCode: 'PE',
    countryCode:  'CAN ',
  });

  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, [cib1, cpd1]) };
}

// ─── BATCH 10: Locum Claim ───────────────────────────────────────────────────

function buildBatch10_Locum(batchNum) {
  resetSeq();
  const seq = nextSeq();

  // Locum claim:
  //  - Service Provider (practitioner performing the service): LOCUM_PRAC (GP)
  //  - Business Arrangement field (153-159): LOCUM_PRAC's own BA
  //  - Locum Arrangement BA field (173-179): LOCUM_HOST's BA
  //    (the host provider's BA under whose submitter this is being claimed)
  const cib1 = buildCIB1({
    prefix:              PREFIX,
    seq,
    sourceCode:          SOURCE_CODE,
    year:                YEAR,
    actionCode:          'A',
    segSeq:              1,
    prid:                PRAC.LOCUM_PRAC.prid,
    uli:                 PHN.P1,
    hsc:                 HSC.GP_OFFICE_VISIT,
    serviceDate:         SVC_DATE,
    encounter:           '1',
    dx1:                 DX_URI,
    calls:               1,
    facilityNum:         FAC.OFFICE.num,
    functCentre:         FAC.OFFICE.fc,
    businessArrangement: PRAC.LOCUM_PRAC.ba,     // locum's own BA
    payToCode:           'BAPY',
    locumBA:             PRAC.LOCUM_HOST.ba,      // host practitioner's BA
  });

  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, [cib1]) };
}

// ─── BATCH 11: Resubmit Refused Claim with New Claim Number (Test 6) ─────────
//
// ASSMT G0008V00 shows HZV26SC00000018 version 0000 was assessed as N39B
// (refused/not applied in UAT). Test 6 requires resubmitting that service
// with a brand-new claim number — a new sequence not previously used.
//
// Original refused claim: HZV26SC00000018  (prefix=HZV, YY=26, SC=SC, seq=1, check=8)
// New claim number:        HZV26SC00000042  (seq=4, check=2)
//   Luhn check: seq '0000004' → pos6(even)=4*2=8 → sum=8 → check=(10-8)%10=2  ✓
//
// Same service (GP office visit, patient P1) — action code A, new seq.

function buildBatch11_ResubmitRefused(batchNum) {
  // Directly specify seq=4 to produce claim HZV26SC00000042.
  // (seq 1-3 were used in batch 530; seq 4 is the next clean sequence.)
  const seq = 4;
  const txns = [
    buildCIB1({
      prefix:              PREFIX,
      seq,
      sourceCode:          SOURCE_CODE,
      year:                YEAR,
      actionCode:          'A',
      segSeq:              1,
      prid:                PRAC.GP_1.prid,
      uli:                 PHN.P1,
      hsc:                 HSC.GP_OFFICE_VISIT,
      serviceDate:         SVC_DATE,
      encounter:           '1',
      dx1:                 DX_URI,
      calls:               1,
      facilityNum:         FAC.OFFICE.num,
      functCentre:         FAC.OFFICE.fc,
      businessArrangement: PRAC.GP_1.ba,
      payToCode:           'BAPY',
    }),
  ];
  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, txns) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUND 2 RETEST (batches 541–551)
// ═══════════════════════════════════════════════════════════════════════════════
//
// AHCIP coordinator review (2026-09-03): passed 1C and 4C; all other scenarios
// require retesting with UNIQUE claim numbers per test so results are traceable.
//
// Claim number assignments (no overlap with round 1 seqs 1–4):
//
//   PHASE 1 (submit now — no ARD dependency):
//   ─────────────────────────────────────────
//   Batch 541  Test 1A ACPT          seqs 10, 11, 12
//   Batch 542  Test 1B PART          seqs 20 (valid) + 21 (invalid → PART)
//   Batch 543  Test 3  Resubmit PART seq 21 corrected (same claim# as refused txn in 542)
//   Batch 544  Test 8  CST1 text     seq 30
//   Batch 545  Test 9A Med Reciprocal seq 40
//   Batch 546  Test 9B OOP Referral   seq 50
//   Batch 547  Test 10 Locum          seq 60
//
//   PHASE 2 (submit AFTER ARD for batch 541 arrives — weekly Tue/Wed/Thu):
//   ───────────────────────────────────────────────────────────────────────
//   Batch 548  Test 7A Change   seq 10 (C action on assessed claim from 541)
//   Batch 549  Test 7B Reassess seq 11 (R action + CST1 on assessed claim from 541)
//   Batch 550  Test 7C Delete   seq 12 (D action on assessed claim from 541)
//   Batch 551  Test 6  Resubmit refused with NEW claim#  seq 70 (replaces refused seq 10)
//
// Check digits (Alberta Luhn, double-from-left on 7-digit seq):
//   seq 10 → HZV26SC00000109   seq 11 → HZV26SC00000117   seq 12 → HZV26SC00000125
//   seq 20 → HZV26SC00000208   seq 21 → HZV26SC00000216
//   seq 30 → HZV26SC00000307
//   seq 40 → HZV26SC00000406
//   seq 50 → HZV26SC00000505
//   seq 60 → HZV26SC00000604
//   seq 70 → HZV26SC00000703

// ─── R2 BATCH 541: Test 1A — ACPT (3 unique valid claims) ────────────────────

function buildR2_Batch541_ACPT(batchNum) {
  const txns = [
    buildCIB1({ prefix: PREFIX, seq: 10, sourceCode: SOURCE_CODE, year: YEAR,
      actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
      hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
      dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
      functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY' }),
    buildCIB1({ prefix: PREFIX, seq: 11, sourceCode: SOURCE_CODE, year: YEAR,
      actionCode: 'A', segSeq: 1, prid: PRAC.GP_2.prid, uli: PHN.P2,
      hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
      dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
      functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_2.ba, payToCode: 'BAPY' }),
    buildCIB1({ prefix: PREFIX, seq: 12, sourceCode: SOURCE_CODE, year: YEAR,
      actionCode: 'A', segSeq: 1, prid: PRAC.GP_3.prid, uli: PHN.P3,
      hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
      dx1: DX_URI, calls: 1, facilityNum: FAC.ACTIVE_TX.num,
      functCentre: FAC.ACTIVE_TX.fc, businessArrangement: PRAC.GP_3.ba, payToCode: 'BAPY' }),
  ];
  return { filename: batchFilename(PREFIX, batchNum), content: assembleBatch(PREFIX, batchNum, txns) };
}

// ─── R2 BATCH 542: Test 1B — PART ────────────────────────────────────────────
//
// Claim 1 (seq 20): valid GP office visit → accepted in batch
// Claim 2 (seq 21): Good Faith claim with invalid CPD1 birth date (00000000)
//   → should fail FIELD EDIT CHECKING → transaction refused at batch edit
//   → batch result: PART (one accepted, one refused)
//
// If UAT still returns ACPT (ULI/date leniency): fallback is to set
// serviceDate = '00000000' on the CIB1 of claim 2. Adjust and resubmit.

function buildR2_Batch542_PART(batchNum) {
  // Claim 1: valid
  const claim1 = buildCIB1({ prefix: PREFIX, seq: 20, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P4,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY' });

  // Claim 2: Good Faith with invalid CPD1 birth date → batch field edit failure
  const claim2_cib = buildCIB1({ prefix: PREFIX, seq: 21, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_2.prid, uli: '',
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_2.ba,
    payToCode: 'BAPY', goodFaith: 'Y' });
  const claim2_cpd = buildCPD1({ prefix: PREFIX, seq: 21, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2, personType: 'RECP',
    surname: 'TESTPART', firstName: 'PATIENT',
    birthDate: '00000000',   // invalid date → triggers field edit failure
    genderCode: 'M',
    addrLine1: '1 TEST STREET', city: 'EDMONTON',
    postalCode: 'T5J0A1', provinceCode: 'AB', countryCode: 'CAN ' });

  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [claim1, claim2_cib, claim2_cpd]) };
}

// ─── R2 BATCH 543: Test 3 — Resubmit PART (same claim#, new batch) ───────────
//
// Resubmits the REFUSED claim from batch 542 (seq 21) with the SAME claim number
// but corrected birth date. New batch number (543) per spec requirement.

function buildR2_Batch543_ResubmitPART(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 21, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_2.prid, uli: '',
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_2.ba,
    payToCode: 'BAPY', goodFaith: 'Y' });
  const cpd = buildCPD1({ prefix: PREFIX, seq: 21, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2, personType: 'RECP',
    surname: 'TESTPART', firstName: 'PATIENT',
    birthDate: '19850101',   // corrected valid birth date
    genderCode: 'M',
    addrLine1: '1 TEST STREET', city: 'EDMONTON',
    postalCode: 'T5J0A1', provinceCode: 'AB', countryCode: 'CAN ' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, cpd]) };
}

// ─── R2 BATCH 552: Test 1B retry — PART (serviceDate='00000000' trigger) ─────
//
// Batch 542 (attempt 1) returned ACPT — UAT is lenient on ULI/CPD1 birth date.
// Fallback: set serviceDate='00000000' on claim 2's CIB1.
// Invalid service date should fail FIELD EDIT CHECKING at batch-edit level.
//
// Claim 1 (seq 80): HZV26SC00000802 — valid GP visit → accepted
// Claim 2 (seq 81): HZV26SC00000810 — invalid serviceDate='00000000' → PART trigger
//
// If ACPT again: ask AHCIP coordinator what specific condition triggers PART in UAT.

function buildR2_Batch552_PART_v2(batchNum) {
  const claim1 = buildCIB1({ prefix: PREFIX, seq: 80, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY' });

  const claim2 = buildCIB1({ prefix: PREFIX, seq: 81, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_2.prid, uli: PHN.P2,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: '00000000', encounter: '1',  // invalid date → PART trigger
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_2.ba, payToCode: 'BAPY' });

  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [claim1, claim2]) };
}

// ─── R2 BATCH 553: Test 3 retry — Resubmit PART v2 (corrected serviceDate) ───
//
// Resubmits the refused claim from batch 552 (seq 81) with corrected serviceDate.

function buildR2_Batch553_ResubmitPART_v2(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 81, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_2.prid, uli: PHN.P2,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',  // corrected
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_2.ba, payToCode: 'BAPY' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── R2 BATCH 544: Test 8 — CST1 Supporting Text ─────────────────────────────

function buildR2_Batch544_CST1(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 30, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba,
    payToCode: 'BAPY', emsaf: 'Y' });
  const txt = buildCST1({ prefix: PREFIX, seq: 30, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2,
    line1: 'EMSAF CLAIM: Extraordinary medical service provided after hours.',
    line2: 'Patient required immediate intervention outside scheduled hours.',
    line3: 'Additional compensation amount: $75.00 above schedule rate.' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, txt]) };
}

// ─── R2 BATCH 545: Test 9A — Medical Reciprocal (SK) ─────────────────────────

function buildR2_Batch545_MedReciprocal(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 40, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: '',
    regNum: OOP.SK.regNum, hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE,
    encounter: '1', dx1: DX_URI, calls: 1,
    facilityNum: FAC.OFFICE.num, functCentre: FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY', recoveryCode: 'SK  ' });
  const cpd = buildCPD1({ prefix: PREFIX, seq: 40, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2, personType: 'RECP',
    surname: 'JOHNSON', firstName: 'MARY', birthDate: '19820620', genderCode: 'F',
    addrLine1: '456 QUEEN STREET', city: 'REGINA',
    postalCode: 'S4P3Y2', provinceCode: 'SK', countryCode: 'CAN ' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, cpd]) };
}

// ─── R2 BATCH 546: Test 9B — OOP Referral (PEI referring provider) ───────────

function buildR2_Batch546_OOPReferral(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 50, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba,
    payToCode: 'BAPY', referralId: '', oopReferral: 'Y' });
  const cpd = buildCPD1({ prefix: PREFIX, seq: 50, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2, personType: 'RFRC',
    surname: 'LEBLANC', firstName: 'PIERRE',
    addrLine1: '789 UNIVERSITY AVENUE', city: 'CHARLOTTETOWN',
    postalCode: 'C1A4L9', provinceCode: 'PE', countryCode: 'CAN ' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, cpd]) };
}

// ─── R2 BATCH 547: Test 10 — Locum ───────────────────────────────────────────

function buildR2_Batch547_Locum(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 60, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.LOCUM_PRAC.prid, uli: PHN.P1,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.LOCUM_PRAC.ba,
    payToCode: 'BAPY', locumBA: PRAC.LOCUM_HOST.ba });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── R2 BATCH 548: Test 7A — Change (seq 10 from batch 541) ──────────────────

function buildR2_Batch548_Change(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 10, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'C', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── R2 BATCH 549: Test 7B — Reassess with text (seq 11 from batch 541) ──────

function buildR2_Batch549_Reassess(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 11, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'R', segSeq: 1, prid: PRAC.GP_2.prid, uli: PHN.P2,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_2.ba, payToCode: 'BAPY' });
  const txt = buildCST1({ prefix: PREFIX, seq: 11, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'R', segSeq: 2,
    line1: 'REASSESSMENT REQUEST: Additional documentation submitted.',
    line2: 'Service medically necessary per attending physician notes.',
    line3: 'Requesting reassessment with supporting clinical text.' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, txt]) };
}

// ─── R2 BATCH 550: Test 7C — Delete (seq 12 from batch 541) ──────────────────

function buildR2_Batch550_Delete(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 12, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'D', segSeq: 1, prid: PRAC.GP_3.prid, uli: PHN.P3,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.ACTIVE_TX.num,
    functCentre: FAC.ACTIVE_TX.fc, businessArrangement: PRAC.GP_3.ba, payToCode: 'BAPY' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── R2 BATCH 551: Test 6 — Resubmit refused claim (NEW claim# seq 70) ───────
//
// Source: seq 10 (HZV26SC00000109) from batch 541 assessed as N39B in ARD
// New claim number: seq 70 (HZV26SC00000703) — brand-new, not previously submitted

function buildR2_Batch551_ResubmitRefused(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 70, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── R3 BATCH 554: Test 8 R3 — CST1 Supporting Text (03.03A, seq 90) ────────
// AHCIP R2 feedback: structure good, retest with valid HSC for Held status

function buildR3_Batch554_CST1(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 90, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC_R3.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba,
    payToCode: 'BAPY', emsaf: 'Y' });
  const txt = buildCST1({ prefix: PREFIX, seq: 90, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2,
    line1: 'EMSAF CLAIM: Extraordinary medical service provided after hours.',
    line2: 'Patient required immediate intervention outside scheduled hours.',
    line3: 'Additional compensation amount: $75.00 above schedule rate.' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, txt]) };
}

// ─── R3 BATCH 555: Test 9A R3 — Medical Reciprocal SK (03.03A, seq 91) ──────
// AHCIP R2 feedback: structure good, retest with valid HSC for ACPT outcome

function buildR3_Batch555_MedReciprocal(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 91, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: '',
    regNum: OOP.SK.regNum, hsc: HSC_R3.GP_OFFICE_VISIT, serviceDate: SVC_DATE,
    encounter: '1', dx1: DX_URI, calls: 1,
    facilityNum: FAC.OFFICE.num, functCentre: FAC.OFFICE.fc,
    businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY', recoveryCode: 'SK  ' });
  const cpd = buildCPD1({ prefix: PREFIX, seq: 91, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2, personType: 'RECP',
    surname: 'JOHNSON', firstName: 'MARY', birthDate: '19820620', genderCode: 'F',
    addrLine1: '456 QUEEN STREET', city: 'REGINA',
    postalCode: 'S4P3Y2', provinceCode: 'SK', countryCode: 'CAN ' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, cpd]) };
}

// ─── R3 BATCH 556: Test 9B R3 — OOP Referral PEI (03.03A, seq 92) ───────────
// AHCIP R2 feedback: structure good, retest with valid HSC for Held status

function buildR3_Batch556_OOPReferral(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 92, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC_R3.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba,
    payToCode: 'BAPY', referralId: '', oopReferral: 'Y' });
  const cpd = buildCPD1({ prefix: PREFIX, seq: 92, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 2, personType: 'RFRC',
    surname: 'LEBLANC', firstName: 'PIERRE',
    addrLine1: '789 UNIVERSITY AVENUE', city: 'CHARLOTTETOWN',
    postalCode: 'C1A4L9', provinceCode: 'PE', countryCode: 'CAN ' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, cpd]) };
}

// ─── R3 BATCH 557: Test 10 R3 — Locum (03.03A, seq 93, corrected locum BA) ──
// AHCIP R2 feedback: field 173-179 must be submitter's FFS BA (2449310), not LOCUM_HOST.ba

function buildR3_Batch557_Locum(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 93, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'A', segSeq: 1, prid: PRAC.LOCUM_PRAC.prid, uli: PHN.P1,
    hsc: HSC_R3.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.LOCUM_PRAC.ba,
    payToCode: 'BAPY', locumBA: SUBMITTER_FFS_BA });  // field 173-179 = submitter's FFS BA
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── R3 BATCH 558: Test 7A R3 — Change (seq 10 from batch 541, HSC 03.03A) ──
// AHCIP R2 feedback: retest with different HSC; claim 109 already in system

function buildR3_Batch558_Change(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 10, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'C', segSeq: 1, prid: PRAC.GP_1.prid, uli: PHN.P1,
    hsc: HSC_R3.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_1.ba, payToCode: 'BAPY' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── R3 BATCH 559: Test 7B R3 — Reassess+text (seq 11 from batch 541, HSC 03.03A)
// AHCIP R2 feedback: retest with different HSC; claim 117 already in system

function buildR3_Batch559_Reassess(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 11, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'R', segSeq: 1, prid: PRAC.GP_2.prid, uli: PHN.P2,
    hsc: HSC_R3.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.OFFICE.num,
    functCentre: FAC.OFFICE.fc, businessArrangement: PRAC.GP_2.ba, payToCode: 'BAPY' });
  const txt = buildCST1({ prefix: PREFIX, seq: 11, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'R', segSeq: 2,
    line1: 'REASSESSMENT REQUEST: Additional documentation submitted.',
    line2: 'Service medically necessary per attending physician notes.',
    line3: 'Requesting reassessment with supporting clinical text.' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib, txt]) };
}

// ─── R3 BATCH 560: Test 7C R3 — Delete (seq 12 from batch 541, HSC 03.03A) ──
// AHCIP R2 feedback: retest with different HSC; claim 125 already in system

function buildR3_Batch560_Delete(batchNum) {
  const cib = buildCIB1({ prefix: PREFIX, seq: 12, sourceCode: SOURCE_CODE, year: YEAR,
    actionCode: 'D', segSeq: 1, prid: PRAC.GP_3.prid, uli: PHN.P3,
    hsc: HSC_R3.GP_OFFICE_VISIT, serviceDate: SVC_DATE, encounter: '1',
    dx1: DX_URI, calls: 1, facilityNum: FAC.ACTIVE_TX.num,
    functCentre: FAC.ACTIVE_TX.fc, businessArrangement: PRAC.GP_3.ba, payToCode: 'BAPY' });
  return { filename: batchFilename(PREFIX, batchNum),
    content: assembleBatch(PREFIX, batchNum, [cib]) };
}

// ─── Proof directory ─────────────────────────────────────────────────────────

const PROOF_DIR = path.join(__dirname, 'conformance-proof');

function saveProof(filename, content) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
  const outPath = path.join(PROOF_DIR, filename);
  fs.writeFileSync(outPath, content);
  console.log('  Saved → ' + outPath);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Sky Claims — AHCIP H-Link Conformance Harness ===\n');

  const args    = process.argv.slice(2);
  const dryRun  = args.includes('--dry-run');
  const fixRfse = args.includes('--fix-rfse');   // resubmit batch 532 with correct trailer (test 4)
  const onlyArg = args.find(function(a) { return a.startsWith('--batch='); });
  const onlyBatch = onlyArg ? parseInt(onlyArg.split('=')[1], 10) : null;

  const config = loadConfig();
  const startBatch = config.startingBatch; // 530

  // Build all batches
  const batches = [
    // ── Round 1 (530–540) — kept for reference; 1C and 4C passed ─────────────
    { num: startBatch + 0,  label: 'R1-ACPT',              build: function() { return buildBatch1_ACPT(startBatch + 0); } },
    { num: startBatch + 1,  label: 'R1-PART',              build: function() { return buildBatch2_PART(startBatch + 1); } },
    { num: startBatch + 2,  label: fixRfse ? 'R1-RFSE-FIX(test4)' : 'R1-RFSE(PASSED)', build: function() { return buildBatch3_RFSE(startBatch + 2, { fix: fixRfse }); } },
    { num: startBatch + 3,  label: 'R1-RESUBMIT-PART',     build: function() { return buildBatch4_ResubmitPART(startBatch + 3); } },
    { num: startBatch + 4,  label: 'R1-C/R/D',             build: function() { return buildBatch5_CRD(startBatch + 4); } },
    { num: startBatch + 5,  label: 'R1-CST1-TEXT',         build: function() { return buildBatch6_CST1(startBatch + 5); } },
    { num: startBatch + 6,  label: 'R1-CPD1-GOODFAITH',    build: function() { return buildBatch7_GoodFaith(startBatch + 6); } },
    { num: startBatch + 7,  label: 'R1-CPD1-RECIPROCAL',   build: function() { return buildBatch8_MedReciprocal(startBatch + 7); } },
    { num: startBatch + 8,  label: 'R1-CPD1-OOP-REFERRAL', build: function() { return buildBatch9_OOPReferral(startBatch + 8); } },
    { num: startBatch + 9,  label: 'R1-LOCUM',              build: function() { return buildBatch10_Locum(startBatch + 9); } },
    { num: startBatch + 10, label: 'R1-RESUBMIT-REFUSED',   build: function() { return buildBatch11_ResubmitRefused(startBatch + 10); } },
    // ── Round 2 (541–551) — unique claim numbers per test ────────────────────
    // Phase 1 (no ARD dependency — submit now)
    { num: startBatch + 11, label: 'R2-1A-ACPT',            build: function() { return buildR2_Batch541_ACPT(startBatch + 11); } },
    { num: startBatch + 12, label: 'R2-1B-PART',            build: function() { return buildR2_Batch542_PART(startBatch + 12); } },
    { num: startBatch + 13, label: 'R2-3-RESUBMIT-PART',    build: function() { return buildR2_Batch543_ResubmitPART(startBatch + 13); } },
    { num: startBatch + 14, label: 'R2-8-CST1',             build: function() { return buildR2_Batch544_CST1(startBatch + 14); } },
    { num: startBatch + 15, label: 'R2-9A-MED-RECIPROCAL',  build: function() { return buildR2_Batch545_MedReciprocal(startBatch + 15); } },
    { num: startBatch + 16, label: 'R2-9B-OOP-REFERRAL',    build: function() { return buildR2_Batch546_OOPReferral(startBatch + 16); } },
    { num: startBatch + 17, label: 'R2-10-LOCUM',           build: function() { return buildR2_Batch547_Locum(startBatch + 17); } },
    // Phase 2 (submit AFTER ARD for batch 541 arrives)
    { num: startBatch + 18, label: 'R2-7A-CHANGE',          build: function() { return buildR2_Batch548_Change(startBatch + 18); } },
    { num: startBatch + 19, label: 'R2-7B-REASSESS',        build: function() { return buildR2_Batch549_Reassess(startBatch + 19); } },
    { num: startBatch + 20, label: 'R2-7C-DELETE',          build: function() { return buildR2_Batch550_Delete(startBatch + 20); } },
    { num: startBatch + 21, label: 'R2-6-RESUBMIT-REFUSED', build: function() { return buildR2_Batch551_ResubmitRefused(startBatch + 21); } },
    // Phase 1b — PART retry (submit now; seqs 80/81, serviceDate='00000000' trigger)
    { num: startBatch + 22, label: 'R2-1B-PART-v2',         build: function() { return buildR2_Batch552_PART_v2(startBatch + 22); } },
    { num: startBatch + 23, label: 'R2-3-RESUBMIT-PART-v2', build: function() { return buildR2_Batch553_ResubmitPART_v2(startBatch + 23); } },
    // ── Round 3 (554–560) — HSC 03.03A (SOMB 2026); locum BA fix ──────────────
    // All Phase 1 (no ARD dependency — submit immediately)
    { num: startBatch + 24, label: 'R3-8-CST1',             build: function() { return buildR3_Batch554_CST1(startBatch + 24); } },
    { num: startBatch + 25, label: 'R3-9A-MED-RECIPROCAL',  build: function() { return buildR3_Batch555_MedReciprocal(startBatch + 25); } },
    { num: startBatch + 26, label: 'R3-9B-OOP-REFERRAL',    build: function() { return buildR3_Batch556_OOPReferral(startBatch + 26); } },
    { num: startBatch + 27, label: 'R3-10-LOCUM',           build: function() { return buildR3_Batch557_Locum(startBatch + 27); } },
    { num: startBatch + 28, label: 'R3-7A-CHANGE',          build: function() { return buildR3_Batch558_Change(startBatch + 28); } },
    { num: startBatch + 29, label: 'R3-7B-REASSESS',        build: function() { return buildR3_Batch559_Reassess(startBatch + 29); } },
    { num: startBatch + 30, label: 'R3-7C-DELETE',          build: function() { return buildR3_Batch560_Delete(startBatch + 30); } },
  ];

  // Filter to --batch=N if requested
  const toSubmit = onlyBatch
    ? batches.filter(function(b) { return b.num === onlyBatch; })
    : batches;

  if (toSubmit.length === 0) {
    console.error('No batch matched --batch=' + onlyBatch);
    process.exit(1);
  }

  console.log('Mode       : ' + (dryRun ? 'DRY RUN (build only, no upload)' : 'LIVE UPLOAD'));
  console.log('Batches    : ' + toSubmit.map(function(b) { return b.num + ' (' + b.label + ')'; }).join(', '));
  console.log('Service Dt : ' + SVC_DATE);
  console.log();

  // Build all batches first (so we can catch any format errors before connecting)
  const built = [];
  for (const b of toSubmit) {
    process.stdout.write('Building batch ' + b.num + ' (' + b.label + ')... ');
    const result = b.build();
    const lineCount = result.content.split('\r\n').filter(Boolean).length;
    console.log(lineCount + ' lines (' + result.content.length + ' bytes)');
    saveProof(result.filename, result.content);
    built.push({ batch: b, result });
  }

  // Validate record lengths
  console.log('\nValidating record lengths...');
  let valid = true;
  for (const item of built) {
    const lines = item.result.content.split('\r\n').filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length !== 254) {
        console.error('  ERROR: ' + item.result.filename + ' line ' + (i+1) + ' = ' + lines[i].length + ' chars (expected 254)');
        valid = false;
      }
    }
    if (valid) console.log('  ' + item.result.filename + ' ✓ all records = 254 chars');
  }

  if (!valid) {
    console.error('\nAborting — fix record length errors above before uploading.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDry run complete. Files saved to ' + PROOF_DIR);
    console.log('Review them, then run without --dry-run to upload.');
    return;
  }

  // Upload via SFTP
  console.log('\nConnecting to SFTP...');
  const sftp = new HlinkSftp(config);
  await sftp.connect();

  try {
    for (const item of built) {
      process.stdout.write('Uploading ' + item.result.filename + '... ');
      await sftp.uploadBatch(item.result.filename, item.result.content);
      console.log('done.');
    }

    console.log('\nAll batches uploaded. Batch balance results typically available within 1 hour.');
    console.log('Run node hlink/retrieve.js to download and parse the results.');
  } finally {
    await sftp.disconnect();
  }
}

main().catch(function(err) {
  console.error('\nFATAL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
