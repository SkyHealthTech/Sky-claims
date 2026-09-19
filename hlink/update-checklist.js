'use strict';
/**
 * hlink/update-checklist.js
 *
 * Updates the AHCIP H-Link conformance checklist xlsx with all
 * Round 2 and Round 3 test results (batch numbers, claim numbers,
 * generation file refs, status, details).
 *
 * USAGE (from SKYCLAIMS root):
 *   node hlink/update-checklist.js
 *
 * Requires: xlsx  (cd hlink && npm install xlsx — already done)
 * Output:   AHCIP H-Link Conformance Checklist - Round 3 Complete.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');

const SRC  = path.join(__dirname, '..', 'AHCIP H-Link Conformance Checklist - Round 2 Complete.xlsx');
const OUT  = path.join(__dirname, '..', 'AHCIP H-Link Conformance Checklist - Round 3 Complete.xlsx');

const wb = XLSX.readFile(SRC);
const ws = wb.Sheets['Claim submission checklist'];

// Helper: write a string value to a cell (creates or overwrites).
function set(r, c, value) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v: value, t: 's' };
}

// Column indices (A=0 … H=7)
const COL = { testNum: 0, req: 2, batch: 3, claims: 4, gen: 5, status: 6, details: 7 };

// Row indices (0 = header row, data rows start at 1)
// Confirmed from dump-xlsx.js output:
const ROW = {
  t1A:       4,   // Test 1A — ACPT
  t1B:       6,   // Test 1B — PART
  t1C:       7,   // Test 1C — RFSE
  t2:        8,   // Test 2 — retrieve batch results
  t3:        9,   // Test 3 — resubmit PART with new batch
  t4:        10,  // Test 4 — resubmit RFSE same batch
  t5:        11,  // Test 5 — retrieve ARD
  t5applied: 12,  // Test 5 sub — Applied/Paid
  t5refused: 13,  // Test 5 sub — Refused
  t6:        14,  // Test 6 — resubmit refused claim, new claim#
  t7A:       16,  // Test 7A — Change
  t7B:       17,  // Test 7B — Reassess
  t7C:       18,  // Test 7C — Delete
  t8:        19,  // Test 8 — CST1/EMSAF
  t9A:       21,  // Test 9A — Reciprocal
  t9B:       22,  // Test 9B — OOP Referral
  t10:       23,  // Test 10 — Locum
};

// ─── Test 1A — ACPT (batch 530) ────────────────────────────────────────
set(ROW.t1A, COL.batch,   'HZV000530');
set(ROW.t1A, COL.claims,  'HZV26SC00000018\nHZV26SC00000026\nHZV26SC00000034');
set(ROW.t1A, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0015V00 (ACCEPTED)\nARD:   HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0008V00\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0016V00');
set(ROW.t1A, COL.status,  'Y - Passed');
set(ROW.t1A, COL.details, 'Batch 530 submitted 2026-08-26. OUTBB G0015: ACCEPTED. ARD G0008: all three original claims (018, 026, 034) assessed N39B (applied at zero in test env). Duplicate submission refused DUPB (G0016) as expected.');

// ─── Test 1B — PART (batch 552) ────────────────────────────────────────
// Original entry used batch 531 (which came back ACPT, not PART). Corrected.
set(ROW.t1B, COL.batch,   'HZV000552');
set(ROW.t1B, COL.claims,  'HZV26SC00000802 (accepted)\nHZV26SC00000810 (refused — batch edit error 39)');
set(ROW.t1B, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0042V00 (PARTIAL)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0042V00');
set(ROW.t1B, COL.status,  'Y - Passed');
set(ROW.t1B, COL.details, 'Batch 552 submitted with two claims. Claim 802 accepted; claim 810 refused (batch edit error code 39 — duplicate claim). OUTBB G0042: PARTIAL (reason TX). Demonstrates PART result. Refused claim 810 resubmitted in batch 553 (Test 3).\nNote: original entry used batch 531 which returned ACPT (not PART); batch 552 is the correct PARTIAL demonstration batch.');

// ─── Test 1C — RFSE (batch 532, intentional trailer count mismatch) ────
set(ROW.t1C, COL.batch,   'HZV000532');
set(ROW.t1C, COL.claims,  'HZV26SC00000018');
set(ROW.t1C, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0018V00 (REFUSED ITTC)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0018V00');
set(ROW.t1C, COL.status,  'Y - Passed');
set(ROW.t1C, COL.details, 'Batch 532 submitted with trailer TXN count = 0 (batch has 1 claim) to trigger RFSE. OUTBB G0018: REFUSED ITTC (transaction count mismatch). Batch then resubmitted correctly as Test 4 (same batch number, corrected trailer).');

// ─── Test 2 — Retrieve batch results ───────────────────────────────────
set(ROW.t2, COL.gen,     'All OUTBB files: HMCT.XAOHHZV.DAILY.OUTBB.G0015V00 through G0053V00\nAll ARD files:   HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0008V00 through G0012V00\nAll backups:     HMCT.XAOHHZV.INPUT.BACKUP.G0015V00 through G0053V00');
set(ROW.t2, COL.status,  'Y - Passed');
set(ROW.t2, COL.details, 'All batch balance (OUTBB), assessment result (ARD), and input backup files retrieved via SFTP using retrieve.js. 83 files downloaded across all rounds to hlink/conformance-proof/. Files parsed and summarised automatically. ACPT, PART, and RFSE outcomes all confirmed through retrieval.');

// ─── Test 3 — Resubmit PART batch with new batch number ────────────────
set(ROW.t3, COL.batch,   'HZV000553 (new batch)\n[PART source: HZV000552]');
set(ROW.t3, COL.claims,  'HZV26SC00000810 (same claim# from refused PART)');
set(ROW.t3, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0041V00 (ACCEPTED)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0041V00');
set(ROW.t3, COL.status,  'Y - Passed');
set(ROW.t3, COL.details, 'Claim 810 was refused in PARTIAL batch 552 (batch edit error 39). Resubmitted in new batch 553. OUTBB G0041: ACCEPTED. Correct PART resubmission workflow demonstrated. ARD G0010: claim 810 action A assessed N39B.');

// ─── Test 4 — Resubmit RFSE with same batch number ─────────────────────
set(ROW.t4, COL.batch,   'HZV000532 (same batch as Test 1C)');
set(ROW.t4, COL.claims,  'HZV26SC00000018');
set(ROW.t4, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0031V00 (ACCEPTED)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0030V00');
set(ROW.t4, COL.status,  'Y - Passed');
set(ROW.t4, COL.details, 'Batch 532 resubmitted with corrected trailer TXN count (1). OUTBB G0031: ACCEPTED. Same batch number used for RFSE resubmission as required by spec.');

// ─── Test 5 — Retrieve ARD and reconcile payments ──────────────────────
set(ROW.t5, COL.gen,     'ARD G0008: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0008V00 (15 records)\nARD G0009: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0009V00 (1 record)\nARD G0010: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0010V00 (12 records)\nARD G0011: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0011V00 (4 records)\nARD G0012: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00 (7 records)');
set(ROW.t5, COL.status,  'Y - Passed');
set(ROW.t5, COL.details, 'All ARD files retrieved and parsed. Applied: claim 703 (N39B), claim 935 (ResultCode A, $37.09 paid, DIRD/BASE). Refused: claim 109 action C (N35FB 47 — HSC ended), claim 117 action R (N35FB 47). Referred: claims 919/927 (N28 — forwarded to IFH carrier). Held: claim 901 (N63 HELD, EMSAF pending).');

// ─── Test 5 sub — Applied/Paid ─────────────────────────────────────────
set(ROW.t5applied, COL.claims,  'HZV26SC00000703 (N39B — applied at zero)\nHZV26SC00000935 (ResultCode A — $37.09 paid, DIRD/BASE)');
set(ROW.t5applied, COL.gen,     'ARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0011V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00');
set(ROW.t5applied, COL.status,  'Y - Passed');

// ─── Test 5 sub — Refused ──────────────────────────────────────────────
set(ROW.t5refused, COL.claims,  'HZV26SC00000109 action C (N35FB 47 — expired HSC, R2 submission)\nHZV26SC00000117 action R (N35FB 47 — expired HSC, R2 submission)');
set(ROW.t5refused, COL.gen,     'ARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0011V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00');
set(ROW.t5refused, COL.status,  'Y - Passed');

// ─── Test 6 — Resubmit refused claim with new claim number ─────────────
set(ROW.t6, COL.batch,   'HZV000551');
set(ROW.t6, COL.claims,  'HZV26SC00000703\n(Original refused claim: HZV26SC00000018, reason N35FA)');
set(ROW.t6, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0046V00 (ACCEPTED)\nARD:   HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0011V00 (N39B)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0046V00');
set(ROW.t6, COL.status,  'Y - Passed');
set(ROW.t6, COL.details, 'Original claim 018 assessed N35FA (refused) in ARD G0008. New claim number HZV26SC00000703 assigned and submitted in batch 551. OUTBB G0046: ACCEPTED. ARD G0011: N39B (applied at zero). Test 6 confirmed complete.');

// ─── Test 7A — Change transaction ──────────────────────────────────────
// R3 final submission (HSC 03.03A corrected); ARD pending next cycle.
set(ROW.t7A, COL.batch,   'HZV000558 (R3 — HSC 03.03A)\n[R2: HZV000548 — ARD N35FB 47, HSC 03.01A expired]\n[R1: HZV000534 — RFSE ITTC]');
set(ROW.t7A, COL.claims,  'HZV26SC00000109 (action C)\n[Action A base: N39B in ARD G0010, batch HZV000541]');
set(ROW.t7A, COL.gen,     'R3 OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0052V00 (ACCEPTED)\nARD: Pending next cycle\nBAK: HMCT.XAOHHZV.INPUT.BACKUP.G0052V00');
set(ROW.t7A, COL.status,  'Pending ARD — OUTBB ACCEPTED');
set(ROW.t7A, COL.details, 'R1 (batch 534) RFSE ITTC. R2 (batch 548) OUTBB ACCEPTED but ARD G0011 returned N35FB 47 — HSC 03.01A end date 2007-01-31. R3 (batch 558) submitted 2026-09-11 with corrected HSC 03.03A (SOMB 2026, Limited Assessment $40.23). OUTBB G0052: ACCEPTED. ARD pending. Original claim 109 action A was assessed N39B in ARD G0010 (batch 541) — satisfies "applied claim" requirement for Change action.');

// ─── Test 7B — Reassess transaction ────────────────────────────────────
set(ROW.t7B, COL.batch,   'HZV000559 (R3 — HSC 03.03A + CST1)\n[R2: HZV000549 — ARD N35FB 47, HSC 03.01A expired]\n[R1: HZV000534 — RFSE ITTC]');
set(ROW.t7B, COL.claims,  'HZV26SC00000117 (action R, with CST1 supporting text)\n[Action A base: N39B in ARD G0010, batch HZV000541]');
set(ROW.t7B, COL.gen,     'R3 OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0051V00 (ACCEPTED)\nARD: Pending next cycle\nBAK: HMCT.XAOHHZV.INPUT.BACKUP.G0051V00');
set(ROW.t7B, COL.status,  'Pending ARD — OUTBB ACCEPTED');
set(ROW.t7B, COL.details, 'R1 (batch 534) RFSE ITTC. R2 (batch 549) OUTBB ACCEPTED but ARD G0012 returned N35FB 47 — HSC 03.01A expired. R3 (batch 559) submitted 2026-09-11 with HSC 03.03A and CST1 reassessment text segment. OUTBB G0051: ACCEPTED. ARD pending. Original claim 117 action A assessed N39B in ARD G0010.');

// ─── Test 7C — Delete transaction ──────────────────────────────────────
set(ROW.t7C, COL.batch,   'HZV000560 (R3 — HSC 03.03A)\n[R2: HZV000550 — ARD N35FB, HSC 03.01A expired]\n[R1: HZV000534 — RFSE ITTC]');
set(ROW.t7C, COL.claims,  'HZV26SC00000125 (action D)\n[Action A base: N39B in ARD G0010, batch HZV000541]');
set(ROW.t7C, COL.gen,     'R3 OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0053V00 (ACCEPTED)\nARD: Pending next cycle\nBAK: HMCT.XAOHHZV.INPUT.BACKUP.G0053V00');
set(ROW.t7C, COL.status,  'Pending ARD — OUTBB ACCEPTED');
set(ROW.t7C, COL.details, 'R1 (batch 534) RFSE ITTC. R2 (batch 550) OUTBB ACCEPTED but ARD G0011 returned N35FB — HSC 03.01A expired. R3 (batch 560) submitted 2026-09-11 with HSC 03.03A. OUTBB G0053: ACCEPTED. ARD pending. Original claim 125 action A assessed N39B in ARD G0010.');

// ─── Test 8 — Add transaction with accompanying text segment (CST1/EMSAF) ─
set(ROW.t8, COL.batch,   'HZV000554 (R3 — HSC 03.03A)\n[R1: HZV000535 — RFSE ITTC]');
set(ROW.t8, COL.claims,  'HZV26SC00000901 (action A, CIB1 emsaf:Y + CST1 text segment)');
set(ROW.t8, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0048V00 (ACCEPTED)\nARD:   HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00 (N63 — HELD, SUBM flag)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0048V00');
set(ROW.t8, COL.status,  'Y - Passed');
set(ROW.t8, COL.details, 'R1 (batch 535) RFSE ITTC. R3 (batch 554) submitted 2026-09-11 with CIB1 (EMSAF indicator = Y, HSC 03.03A) + CST1 text segment (3 lines of supporting text). OUTBB G0048: ACCEPTED. ARD G0012: N63 HELD + SUBM flag — claim correctly held pending EMSAF document submission. Confirms CST1 segment accepted and EMSAF/HOLD workflow triggered correctly.');

// ─── Test 9A — Medical Reciprocal ──────────────────────────────────────
set(ROW.t9A, COL.batch,   'HZV000555 (R3 — HSC 03.03A)\n[R1: HZV000537 — ACPT but wrong HSC]');
set(ROW.t9A, COL.claims,  'HZV26SC00000919 (action A, CIB1 + CPD1 RECP)\nSK recovery code; OOP reg# 720092620; referring prac RECPJOHNSON');
set(ROW.t9A, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0047V00 (ACCEPTED)\nARD:   HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00 (N28 — referred to IFH carrier)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0047V00');
set(ROW.t9A, COL.status,  'Y - Passed');
set(ROW.t9A, COL.details, 'R3 (batch 555) submitted 2026-09-11 with CIB1 (SK recovery code, OOP reg# 720092620) + CPD1 (RECP, RECPJOHNSON). HSC 03.03A. OUTBB G0047: ACCEPTED. ARD G0012: N28 — claim referred to interprovincial IFH/reciprocal carrier. Demonstrates correct Medical Reciprocal person data segment formatting.');

// ─── Test 9B — OOP Referral ─────────────────────────────────────────────
set(ROW.t9B, COL.batch,   'HZV000556 (R3 — HSC 03.03A)\n[R1: HZV000538 — RFSE ITTC then ACPT but wrong HSC]');
set(ROW.t9B, COL.claims,  'HZV26SC00000927 (action A, CIB1 + CPD1 RFRC)\nOOP referral indicator Y; PEI referring provider RFRCLEBLANC');
set(ROW.t9B, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0050V00 (ACCEPTED)\nARD:   HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00 (N28 — forwarded OOP)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0050V00');
set(ROW.t9B, COL.status,  'Y - Passed');
set(ROW.t9B, COL.details, 'R3 (batch 556) submitted 2026-09-11 with CIB1 (OOP referral indicator, blank referring prac ID) + CPD1 (RFRC, PEI referring provider RFRCLEBLANC). HSC 03.03A. OUTBB G0050: ACCEPTED. ARD G0012: N28 — claim forwarded to out-of-province carrier. Demonstrates OOP referral person data with referring doctor segment.');

// ─── Test 10 — Locum ────────────────────────────────────────────────────
set(ROW.t10, COL.batch,   'HZV000557 (R3 — HSC 03.03A, corrected BA fields)');
set(ROW.t10, COL.claims,  'HZV26SC00000935\nLocum prac BA (field 153-159): 9198510\nSubmitter FFS BA (field 173-179): 2449310 (prefix HZV)');
set(ROW.t10, COL.gen,     'OUTBB: HMCT.XAOHHZV.DAILY.OUTBB.G0049V00 (ACCEPTED)\nARD:   HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00 (ResultCode A — APPLIED, $37.09 paid)\nBAK:   HMCT.XAOHHZV.INPUT.BACKUP.G0049V00');
set(ROW.t10, COL.status,  'Y - Passed');
set(ROW.t10, COL.details, 'R3 (batch 557) submitted 2026-09-11 with locum practitioner BA 9198510 in field 153-159 (locum\'s own BA) and submitter FFS BA 2449310 for prefix HZV in field 173-179 (locum BA field). HSC 03.03A. OUTBB G0049: ACCEPTED. ARD G0012: ResultCode A — claim APPLIED, $37.09 paid, DIRD/BASE processing confirmed. Previous R2 feedback: field 173-179 must be submitter\'s FFS BA for prefix, not the host practitioner\'s BA.');

// ─── Expand sheet range to cover any newly-populated rows ───────────────
ws['!ref'] = 'A1:H27';

// Save
XLSX.writeFile(wb, OUT);
console.log('');
console.log('=== Checklist updated ===');
console.log('Output:', OUT);
console.log('');
console.log('Test status summary:');
console.log('  1A  ACPT          Y - Passed  (batch 530, ARD G0008)');
console.log('  1B  PART          Y - Passed  (batch 552, G0042 PARTIAL)');
console.log('  1C  RFSE          Y - Passed  (batch 532, G0018 RFSE)');
console.log('  2   Retrieve      Y - Passed  (83 files, all G-numbers)');
console.log('  3   Resubmit PART Y - Passed  (batch 553, G0041)');
console.log('  4   Resubmit RFSE Y - Passed  (batch 532, G0031)');
console.log('  5   ARD retrieval Y - Passed  (G0008–G0012)');
console.log('  6   New claim#    Y - Passed  (batch 551, claim 703, N39B)');
console.log('  7A  Change        Pending ARD (batch 558, G0052 ACCEPTED)');
console.log('  7B  Reassess      Pending ARD (batch 559, G0051 ACCEPTED)');
console.log('  7C  Delete        Pending ARD (batch 560, G0053 ACCEPTED)');
console.log('  8   CST1/EMSAF   Y - Passed  (batch 554, N63 HELD+SUBM)');
console.log('  9A  Reciprocal    Y - Passed  (batch 555, N28 referred)');
console.log('  9B  OOP Referral  Y - Passed  (batch 556, N28 forwarded)');
console.log('  10  Locum         Y - Passed  (batch 557, Applied $37.09)');
