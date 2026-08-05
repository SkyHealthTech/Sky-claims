'use strict';

/**
 * teleplan/conformance-harness.js
 *
 * HIBC vendor certification — runs all 13 test categories against the
 * Teleplan TEST environment and writes a proof bundle for HIBC submission.
 *
 * USAGE:  node teleplan/conformance-harness.js
 *
 * Before running: call Teleplan Support (1-866-456-6950 > 3 > 2) to notify
 * them you are commencing vendor tests. Ask them to load test remittances.
 *
 * CONFORMANCE MATRIX
 *  1  Regular MSP claims            TODO: buildMspClaim() in claims.js
 *  2  Reciprocal claims             TODO: buildReciprocalClaim()
 *  3  ICBC claims                   TODO: non-physician only post 2025-11-27
 *  4  WorkSafeBC claims             TODO: buildWsbcClaim()
 *  5  Encounter records             TODO: buildEncounterRecord()
 *  6  Opted-out / supplementary     TODO: buildSupplementaryBenefitClaim()
 *  7  Institutional claims          TODO: buildInstitutionalClaim()
 *  8  Correctional claims           TODO: buildCorrectionalClaim()
 *  9  Debit request claims          TODO: buildDebitRequest()
 * 10  Claims with note records      TODO: buildNoteRecord()
 * 11  E45 eligibility requests      READY - 16 test PHNs in test-fixtures.js
 * 12  B04 batch eligibility         TODO: batch eligibility spec
 * 13  Clean real-data claims        TODO: real provider MSP# + valid PHNs
 */

const fs   = require('fs');
const path = require('path');
const { loadConfig }          = require('./config');
const { TeleplanClient }      = require('./client');
const { EligibilityService }  = require('./eligibility');
const claims = require('./claims');
const { buildSubmissionFile } = claims;
const { parseRemittanceBundle, reconcile } = require('./parser');
const { ELIGIBILITY_FIXTURES } = require('./test-fixtures');

const PROOF_DIR = path.join(__dirname, 'conformance-proof', new Date().toISOString().slice(0, 10));

async function runConformance() {
  console.log('=== Sky Claims - Teleplan Conformance Harness ===\n');

  const config = loadConfig();

  if (!config.isTest) {
    throw new Error('STOP: harness must only run in TEST environment. Set TELEPLAN_ENV=test in .env');
  }

  console.log('Environment : ' + config.env);
  console.log('Endpoint    : ' + config.baseUrl);
  console.log('Vendor DC   : ' + config.vendorDC);
  console.log('Test Payee  : ' + config.testPayee);
  console.log('Proof dir   : ' + PROOF_DIR + '\n');

  fs.mkdirSync(PROOF_DIR, { recursive: true });

  const client      = new TeleplanClient(config);
  const eligibility = new EligibilityService(client);
  const results     = { eligibilityTests: [], claimTests: [], errors: [] };

  // ── Login ──────────────────────────────────────────────────────────────────
  console.log('Logging in to Teleplan test environment...');
  await client.login();
  console.log();

  try {

    // ── Category 11: E45 eligibility (all 16 HIBC test PHNs) ─────────────────
    console.log('-- Category 11: E45 Eligibility --');
    for (var fi = 0; fi < ELIGIBILITY_FIXTURES.length; fi++) {
      var fixture = ELIGIBILITY_FIXTURES[fi];
      var label = 'Test ' + String(fixture.id).padStart(2, '0') + ': PHN ' + fixture.input.phn;
      process.stdout.write('  ' + label + ' ... ');

      try {
        var result = await eligibility.check(fixture.input);
        var pass   = assertEligibility(result, fixture.expected);

        results.eligibilityTests.push({ id: fixture.id, phn: fixture.input.phn, pass: pass, result: result });

        var proofFile = path.join(PROOF_DIR, 'e45-' + String(fixture.id).padStart(2, '0') + '-phn-' + fixture.input.phn + '.json');
        fs.writeFileSync(proofFile, JSON.stringify({ request: fixture.input, response: result }, null, 2));

        console.log(pass ? 'PASS' : 'FAIL');
        if (!pass) {
          console.log('    Expected:', JSON.stringify(fixture.expected));
          console.log('    Got:     name=' + result.name + ' eligible=' + result.eligibleOnDate + ' code=' + result.responseCode);
        }
      } catch (err) {
        console.log('ERROR: ' + err.message);
        results.errors.push({ category: 'E45', id: fixture.id, error: err.message });
      }

      // Small delay — Teleplan monitors for automated calls
      await sleep(300);
    }

    // ── Categories 1-10, 12-13: Claim submission ──────────────────────────────
    var claimCategories = [
      { id: 1,  type: 'msp',            label: 'Regular MSP claims',      count: 3 },
      { id: 2,  type: 'reciprocal',     label: 'Reciprocal claims',        count: 3 },
      { id: 3,  type: 'icbc',           label: 'ICBC claims',              count: 3 },
      { id: 4,  type: 'wsbc',           label: 'WorkSafeBC claims',        count: 3 },
      { id: 5,  type: 'encounter',      label: 'Encounter records',        count: 3 },
      { id: 6,  type: 'supplementary',  label: 'Supplementary benefit',    count: 3 },
      { id: 7,  type: 'institutional',  label: 'Institutional claims',     count: 3 },
      { id: 8,  type: 'correctional',   label: 'Correctional claims',      count: 3 },
      { id: 9,  type: 'debit',          label: 'Debit request claims',     count: 3 },
      { id: 10, type: 'msp',            label: 'Claims with note records', count: 3, withNotes: true },
      { id: 12, type: 'b04',            label: 'B04 batch eligibility',    count: 3 },
      { id: 13, type: 'msp',            label: 'Clean real-data claims',   count: 3, realData: true },
    ];

    console.log('\n-- Categories 1-10, 12-13: Claim submission --');
    for (var ci = 0; ci < claimCategories.length; ci++) {
      var cat = claimCategories[ci];
      console.log('  Category ' + String(cat.id).padStart(2, '0') + ': ' + cat.label);

      var testClaims = generateTestClaims(cat, config);
      if (!testClaims) {
        console.log('    -> SKIPPED - serializer not yet implemented.');
        continue;
      }

      try {
        var fileText = buildSubmissionFile(config, testClaims);
        fs.writeFileSync(path.join(PROOF_DIR, 'cat-' + String(cat.id).padStart(2, '0') + '-request.txt'), fileText);

        var sendResult = await client.sendClaims(fileText);
        fs.writeFileSync(path.join(PROOF_DIR, 'cat-' + String(cat.id).padStart(2, '0') + '-send.txt'), sendResult.raw);
        console.log('    -> sent. Messages: ' + (sendResult.messages.map(function(m){ return m.code; }).join(', ') || 'none'));

        if (!sendResult.ok) {
          results.errors.push({ category: cat.id, error: sendResult.messages.map(function(m){ return m.code + ' ' + m.text; }).join('; ') || 'send failed' });
          // Still retrieve — clears any pending server session so next category isn't blocked
          console.log('    -> send error — retrieving anyway to clear server session...');
          await sleep(3000);
          try { await client.retrieveRemittances(); } catch(e) { /* ignore */ }
          await sleep(3000);
          continue;
        }

        console.log('    -> waiting 8s...');
        await sleep(8000);

        var retrieveResult = await client.retrieveRemittances();
        fs.writeFileSync(path.join(PROOF_DIR, 'cat-' + String(cat.id).padStart(2, '0') + '-retrieve.txt'), retrieveResult.raw);

        var bundle = parseRemittanceBundle(retrieveResult.raw);
        var report = reconcile(bundle, testClaims);
        fs.writeFileSync(path.join(PROOF_DIR, 'cat-' + String(cat.id).padStart(2, '0') + '-reconcile.json'), JSON.stringify({ cat: cat, report: report }, null, 2));
        console.log('    -> ' + report.summary);
        results.claimTests.push({ category: cat.id, label: cat.label, report: report });

      } catch (err) {
        if (err.message.indexOf('not implemented') > -1) {
          console.log('    -> SKIPPED - ' + err.message);
        } else {
          console.log('    -> ERROR: ' + err.message);
          results.errors.push({ category: cat.id, error: err.message });
        }
      }
    }

  } finally {
    // Always logout — even if tests fail
    await client.logout();
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  var e45Pass  = results.eligibilityTests.filter(function(t){ return t.pass; }).length;
  var e45Total = results.eligibilityTests.length;

  console.log('\n=== Summary ===');
  console.log('E45 eligibility : ' + e45Pass + '/' + e45Total + ' passed');
  console.log('Claim categories: ' + results.claimTests.length + ' run');
  console.log('Errors          : ' + results.errors.length);
  console.log('Proof bundle    : ' + PROOF_DIR);

  fs.writeFileSync(path.join(PROOF_DIR, 'summary.json'), JSON.stringify(results, null, 2));
  console.log('\nSend the proof/ directory to Teleplan Support once all categories pass.');
}

function assertEligibility(result, expected) {
  var checks = [];
  if (expected.successCode)   checks.push(result.responseCode === expected.successCode);
  if (expected.warningCode)   checks.push(result.responseCode === expected.warningCode);
  if (expected.name)          checks.push(result.name === expected.name);
  if (expected.birthDate)     checks.push(result.birthDate === expected.birthDate);
  if (expected.gender)        checks.push(result.gender === expected.gender);
  if (expected.eligibleOnDate !== undefined) checks.push(result.eligibleOnDate === expected.eligibleOnDate);
  if (expected.coverageEndReason) checks.push(result.coverageEndReason && result.coverageEndReason.indexOf(expected.coverageEndReason) > -1);
  if (expected.resolvedPhn)   checks.push(result.resolvedPhn === expected.resolvedPhn);
  if (expected.subsidyPaidToDate != null) checks.push(result.subsidyPaidToDate === expected.subsidyPaidToDate);
  return checks.length > 0 && checks.every(Boolean);
}

/**
 * generateTestClaims -- produce 3 test records for each conformance category.
 *
 * Test PHNs (confirmed via E45 category 11):
 *   9151210417  BURNHAM RICHARD GERD      M 19591128  nameVerify RGBU
 *   9151065434  BURROWS CHRISTINE JOS.    F 19591225  nameVerify CJBU
 *   9151242549  MERCER AUSTIN CHARLES     M 19880414  nameVerify ACME
 *   9151071072  MATTE GERALD FREDRICK     M 19410404  nameVerify GFMA
 *   9151274799  ABRAHAM MAXIMILIAN FERD   M 19930407  nameVerify MFAB
 *   9151206012  VAILLANCOURT SHELLY ANNE  F 19570705  nameVerify SAVA
 *   9151259051  WICKS ASHLEE NADINE       F 19901022  nameVerify ANWI
 *   9151252098  BUTLER SHELLY DOLLY       F 19611119  nameVerify SDBU
 *   9151237142  DALEY LISA CHARLOTTE      F 19560314  nameVerify LCDA
 *   9151247483  WHALEN MELISSA GIRARD     F 19741002  nameVerify MGWH
 *   9151234921  HUMPHREY SANDI D          F 19860815  nameVerify SDHU
 *   9151040354  TENNANT ADELIA            F 19241205  nameVerify A TE
 *   9151058034  ROLLINS MICHELE LOUISE    F 19671101  nameVerify MLRO
 *   9151285863  ROLLINS JADEN DANIEL      M 19970228  nameVerify JDRO
 *   9151261721  JACK AVA VALERIE          F 19670529  nameVerify AVJA
 *
 * Category 13 (real-data clean claims) requires your actual practitioner MSP#
 * and real patient PHNs -- set TELEPLAN_PRACTITIONER_NUM in .env then re-run.
 */
function generateTestClaims(cat, config) {
  var dos = claims.yesterdayYMD();

  // Standard GP office visit base
  function mspClaim(phn, nameVerify, dx) {
    return { type: 'c02', phn: phn, nameVerify: nameVerify,
             dependentNum: '00', units: '1', feeItem: '00110',
             amount: 36.60, dx1: dx || '465  ',
             serviceDate: dos, serviceLocation: 'L', submissionCode: '0' };
  }

  switch (cat.id) {

    // Category 1: Regular MSP Claims
    case 1:
      return [
        mspClaim('9151210417', 'RGBU', '465  '),
        mspClaim('9151065434', 'CJBU', '490  '),
        mspClaim('9151242549', 'ACME', '462  '),
      ];

    // Category 2: Reciprocal Claims (out-of-province patients)
    // PHN field zeros; patient demographics in OIN portion.
    // NAME-VERIFY must be '0000' (zeros) for OIN/Other-Insurer claims — spec P16.
    // P102 (OIN-REGISTRATION-NUM): out-of-province health numbers must be
    // RIGHT-JUSTIFIED and LEFT-ZERO-FILLED (spec p.63).
    // Pass the raw province health number — zpad() in buildC02 handles the
    // left-zero-fill to 12 chars. Do NOT append trailing zeros here.
    case 2:
      return [
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '465  ', serviceDate: dos, serviceLocation: 'L', submissionCode: '0',
          oin: { insurerCode: 'ON', regNum: '3456789012', birthDate: '19701201',
                 firstName: 'JAMES', middleInitial: 'R', surname: 'ONTARIO',
                 sex: 'M', address1: '123 MAIN ST TORONTO ON',
                 postalCode: 'M5V1A1' } },
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '490  ', serviceDate: dos, serviceLocation: 'L', submissionCode: '0',
          oin: { insurerCode: 'AB', regNum: '1234567890', birthDate: '19830620',
                 firstName: 'SARAH', middleInitial: 'L', surname: 'ALBERTA',
                 sex: 'F', address1: '456 ELM AVE CALGARY AB',
                 postalCode: 'T2P1B1' } },
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '462  ', serviceDate: dos, serviceLocation: 'L', submissionCode: '0',
          oin: { insurerCode: 'MB', regNum: '9876543210', birthDate: '19650903',
                 firstName: 'DAVID', middleInitial: 'T', surname: 'MANITOBA',
                 sex: 'M', address1: '789 OAK DR WINNIPEG MB',
                 postalCode: 'R3B2E1' } },
      ];

    // Category 3: ICBC Claims
    // MVA code Y, submission code I, ICBC claim number required.
    case 3:
      return [
        // ICBC numbers: 1 alpha + 6 digits + MOD-7 check digit (spec 1.14.4)
        // A→1, first7=1123456, 1123456%7=5 → check digit 5
        Object.assign(mspClaim('9151274799', 'MFAB', '959  '),
          { submissionCode: 'I', mvaCode: 'Y', icbcClaimNum: 'A1234565',
            serviceLocation: 'E' }),
        // first7=1234567, 1234567%7=5 → check digit 5
        Object.assign(mspClaim('9151206012', 'SAVA', '847  '),
          { submissionCode: 'I', mvaCode: 'Y', icbcClaimNum: 'A2345675',
            serviceLocation: 'E' }),
        // first7=1345678, 1345678%7=5 → check digit 5
        Object.assign(mspClaim('9151259051', 'ANWI', '724  '),
          { submissionCode: 'I', mvaCode: 'Y', icbcClaimNum: 'A3456785',
            serviceLocation: 'E' }),
      ];

    // Category 4: WorkSafeBC Claims
    // OIN insurer WC, submission code W.
    // NAME-VERIFY = '0000' for OIN claims (spec P16: "Zeros if Other Insurer Claim").
    // P102 (OIN-REGISTRATION-NUM): WSBC health numbers must start with "9" (spec p.25/26).
    // Pass the raw 10-digit BC PHN (no trailing spaces) — buildC02 now uses rpad for
    // WC/PP so the result is "9151252098  " (starts with 9, right-padded with spaces).
    // address1=date of injury, address2=area/anatomy, address3=nature of injury,
    // address4=WCB claim number (left zero-filled, max 8 chars, rest blank).
    case 4:
      return [
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '913  ', serviceDate: dos, serviceLocation: 'L', submissionCode: 'W',
          oin: { insurerCode: 'WC', regNum: '9151252098', birthDate: '19611119',
                 firstName: 'SHELLY', middleInitial: 'D', surname: 'BUTLER',
                 sex: 'F',
                 address1: '20260501                 ',
                 address2: '00110RP                  ',
                 address3: '00200                    ',
                 address4: '12345678                 ',
                 postalCode: '      ' } },
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '913  ', serviceDate: dos, serviceLocation: 'L', submissionCode: 'W',
          oin: { insurerCode: 'WC', regNum: '9151237142', birthDate: '19560314',
                 firstName: 'LISA', middleInitial: 'C', surname: 'DALEY',
                 sex: 'F',
                 address1: '20260501                 ',
                 address2: '00110RP                  ',
                 address3: '00200                    ',
                 address4: '12345679                 ',
                 postalCode: '      ' } },
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '913  ', serviceDate: dos, serviceLocation: 'L', submissionCode: 'W',
          oin: { insurerCode: 'WC', regNum: '9151247483', birthDate: '19741002',
                 firstName: 'MELISSA', middleInitial: 'G', surname: 'WHALEN',
                 sex: 'F',
                 address1: '20260501                 ',
                 address2: '00110RP                  ',
                 address3: '00200                    ',
                 address4: '12345680                 ',
                 postalCode: '      ' } },
      ];

    // Category 5: Encounter Records
    // Payment mode E, billed amount 0.
    case 5:
      return [
        { type: 'c02', phn: '9151252098', nameVerify: 'SDBU',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 0,
          paymentMode: 'E', dx1: '465  ', serviceDate: dos,
          serviceLocation: 'L', submissionCode: '0' },
        { type: 'c02', phn: '9151237142', nameVerify: 'LCDA',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 0,
          paymentMode: 'E', dx1: '490  ', serviceDate: dos,
          serviceLocation: 'L', submissionCode: '0' },
        { type: 'c02', phn: '9151247483', nameVerify: 'MGWH',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 0,
          paymentMode: 'E', dx1: '462  ', serviceDate: dos,
          serviceLocation: 'L', submissionCode: '0' },
      ];

    // Category 6: Opted-Out / Supplementary Benefit Claims
    // HIBC email: "3 Opted Out Claims (i.e. physiotherapist, chiropractor,
    // massage therapy, naturopathic, etc.)"
    // Each of the 3 claims demonstrates a DIFFERENT allied-health profession.
    // Format: PHN field P14 = 0000000000; patient PHN in OIN regNum (12 chars,
    // right-padded with spaces); OIN insurerCode = PP (pay patient).
    //
    // Fee items below are from the MSC Supplementary Benefits payment schedules.
    // ⚠ Verify codes/amounts against current schedules before a production run;
    //   the test broker validates record FORMAT, not fee-item rates.
    case 6:
      return [
        // Claim 1 — Physiotherapy opted-out
        // MATTE GERALD FREDRICK, M, born 1941  ICD 724 (low back pain)
        // Fee item 09938 = Physiotherapy Service  $23.00
        // Source: gov.bc.ca/msp/physiotherapists  Service location N = non-physician HCP office
        // NAME-VERIFY = '0000' for all OIN/PP claims (spec P16).
        // P102 regNum: raw 10-digit BC PHN — buildC02 uses rpad for PP so result
        // is "9151071072  " (starts with "9", right-padded with spaces). Spec p.25/26.
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '09938', amount: 23.00,
          dx1: '724  ', serviceDate: dos, serviceLocation: 'N', submissionCode: '0',
          oin: { insurerCode: 'PP', regNum: '9151071072', birthDate: '19410404',
                 firstName: 'GERALD', middleInitial: 'F', surname: 'MATTE',
                 sex: 'M', address1: '100 JOHNSON ST VICTORIA BC',
                 postalCode: 'V8W1M9' } },
        // Claim 2 — Chiropractic opted-out
        // WHALEN MELISSA GIRARD, F, born 1974  ICD 723 (cervicalgia/neck pain)
        // Fee item 00138 = Chiropractic Service  $23.00
        // Source: gov.bc.ca/msp/chiropractors
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '00138', amount: 23.00,
          dx1: '723  ', serviceDate: dos, serviceLocation: 'N', submissionCode: '0',
          oin: { insurerCode: 'PP', regNum: '9151247483', birthDate: '19741002',
                 firstName: 'MELISSA', middleInitial: 'G', surname: 'WHALEN',
                 sex: 'F', address1: '400 DOUGLAS ST VICTORIA BC',
                 postalCode: 'V8V2P5' } },
        // Claim 3 — Massage therapy opted-out
        // HUMPHREY SANDI D, F, born 1986  ICD 729 (myofascial/soft-tissue pain)
        // Fee item 09948 = Massage Therapy Service  $23.00
        // Source: gov.bc.ca/msp/massage-therapists
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          dependentNum: '00', units: '1', feeItem: '09948', amount: 23.00,
          dx1: '729  ', serviceDate: dos, serviceLocation: 'N', submissionCode: '0',
          oin: { insurerCode: 'PP', regNum: '9151234921', birthDate: '19860815',
                 firstName: 'SANDI', middleInitial: 'D', surname: 'HUMPHREY',
                 sex: 'F', address1: '700 PANDORA AVE VICTORIA BC',
                 postalCode: 'V8W1N9' } },
      ];

    // Category 7: Institutional Claims
    // OIN IN, institution number in OIN regNum positions 1-10.
    // Two fixes per HIBC feedback:
    //   1. AH refusal: the 2-digit sub-code after the institution number must NOT be
    //      "00". Spec p.63: use any two digits other than "00" (using "01" here).
    //      regNum = institution# (10) + sub-code (2): "0010000008" + "01" = "001000000801"
    //   2. CP refusal: the J4674 optometrist practitioner is opted-out; institutional
    //      test claims should use the opted-in test payee as the practitioner to avoid
    //      the opted-out vs opted-in mismatch in this category.
    case 7:
      return [
        // NAME-VERIFY = '0000' for all OIN/IN claims (spec P16).
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          practitionerNum: config.testPayee,
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '465  ', serviceDate: dos, serviceLocation: 'I', submissionCode: '0',
          oin: { insurerCode: 'IN', regNum: '001000000801', birthDate: '19500101',
                 firstName: 'JOHN', middleInitial: 'A', surname: 'INPATIENT',
                 sex: 'M', address1: '1234 HOSPITAL RD VANCOUVER' } },
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          practitionerNum: config.testPayee,
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '490  ', serviceDate: dos, serviceLocation: 'I', submissionCode: '0',
          oin: { insurerCode: 'IN', regNum: '001000000801', birthDate: '19620315',
                 firstName: 'MARY', middleInitial: 'B', surname: 'RESIDENT',
                 sex: 'F', address1: '5678 CARE CENTRE BURNABY' } },
        { type: 'c02', phn: '0000000000', nameVerify: '0000',
          practitionerNum: config.testPayee,
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '462  ', serviceDate: dos, serviceLocation: 'I', submissionCode: '0',
          oin: { insurerCode: 'IN', regNum: '001000000801', birthDate: '19750720',
                 firstName: 'PETER', middleInitial: 'C', surname: 'PATIENT',
                 sex: 'M', address1: '9101 FACILITY BLVD SURREY' } },
      ];

    // Category 8: Correctional (Incarcerated) Claims
    // Per HIBC feedback (spec pp. 52 & 31):
    //   - Correctional claims use C02 PART 1 ONLY. No OIN (Part 2) block.
    //   - P14 (MSP-REGISTRATION/PHN field) must contain a FAKE CORRECTIONAL ID,
    //     not a BC PHN. Use a facility-issued 10-digit patient identifier.
    //   - Patient DOB goes in C02 Part 1 field P52 (BIRTH-DATE).
    //   - NAME-VERIFY = '0000' (no MSP PHN to verify against).
    //   - Service location 'C' (correctional facility).
    // Do NOT include an oin block — buildC02 will set Part 2 to all spaces.
    case 8:
      return [
        { type: 'c02', phn: '0000001001', nameVerify: '0000',
          birthDate: '19750101',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '465  ', serviceDate: dos, serviceLocation: 'C', submissionCode: '0' },
        { type: 'c02', phn: '0000002001', nameVerify: '0000',
          birthDate: '19800215',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '490  ', serviceDate: dos, serviceLocation: 'C', submissionCode: '0' },
        { type: 'c02', phn: '0000003001', nameVerify: '0000',
          birthDate: '19920610',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '462  ', serviceDate: dos, serviceLocation: 'C', submissionCode: '0' },
      ];

    // Category 9: Debit Request Claims
    // Submission code E, correspondence code N (note required).
    // origMspFileNum = DC-NUM(5) + DC-SEQ(7) + DATE-RCVD(8).
    case 9:
      return [
        { type: 'c02', phn: '9151285863', nameVerify: 'JDRO',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '465  ', serviceDate: dos, serviceLocation: 'L',
          submissionCode: 'E', correspondenceCode: 'N',
          origMspFileNum: 'V01270000001' + dos },
        { type: 'n01', text: 'DEBIT - CLAIM SUBMITTED IN ERROR. DUPLICATE SUBMISSION.' },
        { type: 'c02', phn: '9151261721', nameVerify: 'AVJA',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '490  ', serviceDate: dos, serviceLocation: 'L',
          submissionCode: 'E', correspondenceCode: 'N',
          origMspFileNum: 'V01270000002' + dos },
        { type: 'n01', text: 'DEBIT - INCORRECT FEE ITEM. RESUBMITTING WITH CORRECT CODE.' },
        { type: 'c02', phn: '9151210417', nameVerify: 'RGBU',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '462  ', serviceDate: dos, serviceLocation: 'L',
          submissionCode: 'E', correspondenceCode: 'N',
          origMspFileNum: 'V01270000003' + dos },
        { type: 'n01', text: 'DEBIT - SERVICE DATE ENTERED INCORRECTLY ON ORIGINAL CLAIM.' },
      ];

    // Category 10: Claims with Note Records
    // Submission code C (coverage problem requires note). Correspondence code N.
    case 10:
      return [
        { type: 'c02', phn: '9151071072', nameVerify: 'GFMA',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '465  ', serviceDate: dos, serviceLocation: 'L',
          submissionCode: 'C', correspondenceCode: 'N' },
        { type: 'n01', text: 'SUBSCRIBER COVERAGE PROBLEM - PATIENT CONTACTED MSP. COVERAGE VERIFIED AT TIME OF SERVICE.' },
        { type: 'c02', phn: '9151274799', nameVerify: 'MFAB',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '490  ', serviceDate: dos, serviceLocation: 'L',
          submissionCode: 'C', correspondenceCode: 'N' },
        { type: 'n01', text: 'SUBSCRIBER COVERAGE PROBLEM - BC SERVICES CARD PRESENTED. MSP CONFIRMED VALID COVERAGE ON DATE OF SERVICE.' },
        { type: 'c02', phn: '9151206012', nameVerify: 'SAVA',
          dependentNum: '00', units: '1', feeItem: '00110', amount: 36.60,
          dx1: '462  ', serviceDate: dos, serviceLocation: 'L',
          submissionCode: 'C', correspondenceCode: 'N' },
        { type: 'n01', text: 'SUBSCRIBER COVERAGE PROBLEM - ADDRESS UPDATED WITH MSP. ELIGIBILITY RE-ESTABLISHED PRIOR TO DATE OF SERVICE.' },
      ];

    // Category 12: B04 Batch Eligibility Requests
    case 12:
      return [
        { type: 'b04', phn: '9151058034', nameVerify: 'MLRO',
          birthDate: '19671101', dateOfService: dos, sex: 'F' },
        { type: 'b04', phn: '9151285863', nameVerify: 'JDRO',
          birthDate: '19970228', dateOfService: dos, sex: 'M' },
        { type: 'b04', phn: '9151261721', nameVerify: 'AVJA',
          birthDate: '19670529', dateOfService: dos, sex: 'F' },
      ];

    // Category 13: Clean real-data claims — opted-out format (per HIBC feedback)
    //
    // Dr. Ekeoba (J4674) is an opted-out optometrist. HIBC requires:
    //   1. Use the optometrist's PERSONAL PAYEE NUMBER (TELEPLAN_PAYEE_NUM in .env),
    //      not the generic test payee.
    //   2. Use OPTED-OUT / PAY-PATIENT format:
    //      - P14 (phn field): '0000000000' — patient BC PHN goes in the OIN PP block
    //      - P16 (nameVerify): '0000' — no MSP PHN in P14 to verify against
    //      - OIN insurerCode 'PP' (Pay Patient) — same format as Cat 6 opted-out
    //      - OIN regNum: patient's 10-digit BC PHN (rpad → starts with "9")
    //
    // Fee items from MSC Optometry Payment Schedule (real amounts, real codes):
    //   02899: Full optometric diagnostic exam ($47.08) — routine benefit ≥65 or any
    //          age with eligible medical diagnosis
    //   02889: Diagnostic exam, no final refractive determination ($47.08) — adults
    //          19–64 when medically required
    //
    // Requires TELEPLAN_PRACTITIONER_NUM and TELEPLAN_PAYEE_NUM in .env.
    // Falls back to practitionerNum if payeeNum not separately configured.
    case 13:
      if (!config.practitionerNum) return null; // skip if TELEPLAN_PRACTITIONER_NUM not set
      var payee13 = config.payeeNum || config.practitionerNum;
      return [
        // BURNHAM RICHARD GERD, M, born 1959 (age 67) — senior routine eye exam (≥65 benefit)
        { type: 'c02',
          payeeNum: payee13,
          practitionerNum: config.practitionerNum,
          phn: '0000000000', nameVerify: '0000', birthDate: '19591128',
          dependentNum: '00', units: '1', feeItem: '02899', amount: 47.08,
          dx1: '366  ', serviceDate: dos, serviceLocation: 'L', submissionCode: '0',
          oin: { insurerCode: 'PP', regNum: '9151210417',
                 birthDate: '19591128', firstName: 'RICHARD', middleInitial: 'G',
                 surname: 'BURNHAM', sex: 'M', address1: '' } },

        // BURROWS CHRISTINE JOSEPHINE, F, born 1959 (age 67) — senior routine eye exam (≥65 benefit)
        { type: 'c02',
          payeeNum: payee13,
          practitionerNum: config.practitionerNum,
          phn: '0000000000', nameVerify: '0000', birthDate: '19591225',
          dependentNum: '00', units: '1', feeItem: '02899', amount: 47.08,
          dx1: '365  ', serviceDate: dos, serviceLocation: 'L', submissionCode: '0',
          oin: { insurerCode: 'PP', regNum: '9151065434',
                 birthDate: '19591225', firstName: 'CHRISTINE', middleInitial: 'J',
                 surname: 'BURROWS', sex: 'F', address1: '' } },

        // MERCER AUSTIN CHARLES, M, born 1988 (age 38) — medically required eye exam
        // Adults 19-64: routine exams NOT a benefit. ICD 250 (Diabetes Mellitus)
        // qualifies for semi-annual medically required exam per Optometry Preamble §A.2.
        { type: 'c02',
          payeeNum: payee13,
          practitionerNum: config.practitionerNum,
          phn: '0000000000', nameVerify: '0000', birthDate: '19880414',
          dependentNum: '00', units: '1', feeItem: '02889', amount: 47.08,
          dx1: '250  ', serviceDate: dos, serviceLocation: 'L', submissionCode: '0',
          oin: { insurerCode: 'PP', regNum: '9151242549',
                 birthDate: '19880414', firstName: 'AUSTIN', middleInitial: 'C',
                 surname: 'MERCER', sex: 'M', address1: '' } },
      ];

    default:
      return null;
  }
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

runConformance().catch(function(err) {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
