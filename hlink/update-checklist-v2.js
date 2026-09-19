'use strict';
/**
 * hlink/update-checklist-v2.js
 *
 * Updates the AHCIP-supplied Round 2 feedback template with Round 3 results.
 * Uses the EXACT row/column positions from the AHCIP template file.
 *
 * USAGE (from SKYCLAIMS root):
 *   node hlink/update-checklist-v2.js
 *
 * Source: AHCIP_template_round2.xlsx  (their original template)
 * Output: AHCIP H-Link Conformance Checklist - Round 3 Complete.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');

const SRC = path.join(__dirname, '..', 'AHCIP_template_round2.xlsx');
const OUT = path.join(__dirname, '..', 'AHCIP H-Link Conformance Checklist - Round 3 Complete.xlsx');

const wb = XLSX.readFile(SRC);
const ws = wb.Sheets['Claim submission checklist'];

// Helper: write a string to a cell (creates or overwrites).
function set(r, c, value) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v: value, t: 's' };
}

// Column indices (A=0 … H=7)
const D = 3, E = 4, F = 5, G = 6, H = 7;

// ─── Row map (confirmed from dump-template.js output) ────────────────────────
//   r=4  → 1A   r=8  → 1B   r=10 → 1C
//   r=11 → 2    r=12 → 3    r=13 → 4    r=14 → 5
//   r=17 → 6
//   r=19 → 7A   r=20 → 7B   r=21 → 7C
//   r=22 → 8    r=24 → 9A   r=25 → 9B   r=26 → 10
// ─────────────────────────────────────────────────────────────────────────────

// ── Test 1A (r=4) — already Y-Passed in template; update gen to include ARD ─
// Template has batch 541 / claims 109,117,125 / G0035 — correct. Just tighten gen + add ARD ref.
set(4, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0035V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0035V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0010V00');
set(4, G, 'Y - Passed');
set(4, H, 'Batch HZV000541 → OUTBB G0035: ACCEPTED. ARD G0010: all three claims (109, 117, 125) action A, reason N39B (test-env refusal at zero — confirms applied workflow). No further retest required.');

// ── Test 1B (r=8) — PARTIAL; already correctly updated in template ───────────
// Template already has batch 552 / PARTIAL. Confirm and tighten.
set(8, G, 'Y - Passed');
set(8, H, 'Batch HZV000552 → OUTBB G0042: PARTIAL (reason TX). Claim 802 accepted; claim 810 refused inline (batch edit error code 39 — invalid service date 00000000). Demonstrates PARTIAL result. Refused claim 810 resubmitted in new batch 553 (Test 3).');

// ── Test 1C (r=10) — RFSE; already Y-Passed ─────────────────────────────────
set(10, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0018V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0018V00');
set(10, G, 'Y - Passed');
set(10, H, 'Batch HZV000532 submitted with trailer TXN count = 0 (batch has 1 claim). OUTBB G0018: REFUSED ITTC (trailer count mismatch). Resubmitted correctly as Test 4 with same batch number.');

// ── Test 2 (r=11) — Retrieve batch results ───────────────────────────────────
set(11, D, 'N/A');
set(11, E, 'N/A');
set(11, F, 'OUTBB: G0015–G0053 (all batches)\nARD:   G0008, G0009, G0010, G0011, G0012\nBAK:   G0015–G0053 (all batches)');
set(11, G, 'Y - Passed');
set(11, H, '83 files downloaded from AHCIP SFTP (getfile.health.alberta.ca) via automated retrieval script. ACPT, PART, and RFSE OUTBB results retrieved and parsed. All 5 ARD files (G0008–G0012) retrieved and reconciled. GoAnywhere file-type issue resolved by AHCIP.');

// ── Test 3 (r=12) — Resubmit PART; already Y-Passed ─────────────────────────
set(12, H, 'Claim 810 refused in PARTIAL batch 552 (error 39 — invalid service date). Corrected service date, resubmitted in new batch HZV000553. OUTBB G0041: ACCEPTED. ARD G0010: claim 810 action A, reason N39B.');

// ── Test 4 (r=13) — Resubmit RFSE same batch; already Y-Passed ──────────────
set(13, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0031V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0031V00');
set(13, H, 'Batch HZV000532 resubmitted with corrected trailer TXN count (1). OUTBB G0031: ACCEPTED. Same batch number used for RFSE resubmission per spec.');

// ── Test 5 (r=14) — Retrieve ARD / reconcile ─────────────────────────────────
set(14, F, 'HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0008V00\nHMCT.XAOHHZV.DAILY.ASSMT.FILE.G0009V00\nHMCT.XAOHHZV.DAILY.ASSMT.FILE.G0010V00\nHMCT.XAOHHZV.DAILY.ASSMT.FILE.G0011V00\nHMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00');
set(14, G, 'Y - Passed');
set(14, H, 'All 5 ARD files retrieved and reconciled.\nApplied: claim 703 (N39B), claim 935 (ResultCode A — $37.09 paid, DIRD/BASE).\nRefused: claims 109/117 (N35FB 47 — HSC 03.01A expired) in G0011; corrected in Round 3.\nReferred: claims 919/927 (N28 — forwarded to IFH/reciprocal carrier).\nHeld: claim 901 (N63 — EMSAF/CST1 document required, SUBM flag set).');

// ── Test 5 sub-rows (r=15 Applied, r=16 Refused) ─────────────────────────────
set(15, D, 'N/A');
set(15, E, 'Claim 703 (N39B — applied at zero)\nClaim 935 (ResultCode A — $37.09 paid)');
set(15, F, 'ARD G0011 / ARD G0012');
set(15, G, 'Y - Passed');
set(16, D, 'N/A');
set(16, E, 'Claim 109 action C (N35FB 47)\nClaim 117 action R (N35FB 47)');
set(16, F, 'ARD G0011 / ARD G0012');
set(16, G, 'Y - Passed');

// ── Test 6 (r=17) — Resubmit refused with new claim#; ARD now confirmed ──────
set(17, D, 'HZV000551');
set(17, E, 'HZV26SC00000703 (new seq replacing refused claim 018)');
set(17, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0046V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0046V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0011V00');
set(17, G, 'Y - Passed');
set(17, H, 'Claim 018 was refused (N35FA) in ARD G0008. New claim number HZV26SC00000703 submitted in batch 551. OUTBB G0046: ACCEPTED. ARD G0011: claim 703 action A, reason N39B — applied at zero. Assessment confirmed.');

// ── Test 7A (r=19) — Change transaction; R3 retest ───────────────────────────
set(19, D, 'HZV000558 (R3 — corrected HSC 03.03A)\n[R2: HZV000548 — ARD N35FB 47, HSC 03.01A expired]');
set(19, E, 'HZV26SC00000109 (action C)');
set(19, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0052V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0052V00\nARD: Pending next cycle');
set(19, G, 'Pending ARD — OUTBB ACCEPTED');
set(19, H, 'R2 (batch 548): ARD G0011 returned N35FB 47 — HSC 03.01A end date 2007-01-31.\nR3 (batch 558, 2026-09-11): resubmitted with SOMB 2026 code 03.03A (Limited Assessment, $40.23). OUTBB G0052: ACCEPTED. ARD pending. Base action A for claim 109 confirmed N39B in ARD G0010 (batch 541).');

// ── Test 7B (r=20) — Reassess transaction; R3 retest ─────────────────────────
set(20, D, 'HZV000559 (R3 — corrected HSC 03.03A + CST1)\n[R2: HZV000549 — ARD N35FB 47, HSC 03.01A expired]');
set(20, E, 'HZV26SC00000117 (action R + CST1 text segment)');
set(20, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0051V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0051V00\nARD: Pending next cycle');
set(20, G, 'Pending ARD — OUTBB ACCEPTED');
set(20, H, 'R2 (batch 549): ARD G0012 returned N35FB 47 — HSC 03.01A expired.\nR3 (batch 559, 2026-09-11): resubmitted with HSC 03.03A and CST1 reassessment text segment. OUTBB G0051: ACCEPTED. ARD pending. Base action A for claim 117 confirmed N39B in ARD G0010 (batch 541).');

// ── Test 7C (r=21) — Delete transaction; R3 retest ───────────────────────────
set(21, D, 'HZV000560 (R3 — corrected HSC 03.03A)\n[R2: HZV000550 — ARD N35FB 47, HSC 03.01A expired]');
set(21, E, 'HZV26SC00000125 (action D)');
set(21, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0053V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0053V00\nARD: Pending next cycle');
set(21, G, 'Pending ARD — OUTBB ACCEPTED');
set(21, H, 'R2 (batch 550): ARD G0011 returned N35FB — HSC 03.01A expired.\nR3 (batch 560, 2026-09-11): resubmitted with HSC 03.03A. OUTBB G0053: ACCEPTED. ARD pending. Base action A for claim 125 confirmed N39B in ARD G0010 (batch 541).');

// ── Test 8 (r=22) — CST1/EMSAF; R3 retest ───────────────────────────────────
set(22, D, 'HZV000554 (R3 — corrected HSC 03.03A)\n[R2: HZV000544 — ARD G0010 N39B but wrong HSC noted for C/R/D]');
set(22, E, 'HZV26SC00000901 (action A, CIB1 EMSAF=Y + CST1 text segment)');
set(22, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0048V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0048V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00');
set(22, G, 'Y - Passed');
set(22, H, 'R3 (batch 554, 2026-09-11): CIB1 with EMSAF indicator Y + CST1 text segment (3 lines). HSC 03.03A. OUTBB G0048: ACCEPTED.\nARD G0012: claim 901 action A, reason N63 HELD + SUBM flag — claim correctly held pending EMSAF document submission. CST1 segment structure accepted.');

// ── Test 9A (r=24) — Medical Reciprocal; R3 retest ───────────────────────────
set(24, D, 'HZV000555 (R3 — corrected HSC 03.03A)\n[R2: HZV000545 — ARD G0010 N39B]');
set(24, E, 'HZV26SC00000919 (action A, CIB1 SK recovery code + CPD1 RECP)');
set(24, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0047V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0047V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00');
set(24, G, 'Y - Passed');
set(24, H, 'R3 (batch 555, 2026-09-11): CIB1 with SK recovery code (OOP reg# 720092620) + CPD1 (RECP, referring prac RECPJOHNSON). HSC 03.03A. OUTBB G0047: ACCEPTED.\nARD G0012: claim 919 action A, reason N28 — referred to interprovincial IFH/reciprocal carrier. Person data segment confirmed correct.');

// ── Test 9B (r=25) — OOP Referral; R3 retest ─────────────────────────────────
set(25, D, 'HZV000556 (R3 — corrected HSC 03.03A)\n[R2: HZV000546 — ARD G0010 N39B]');
set(25, E, 'HZV26SC00000927 (action A, CIB1 OOP referral + CPD1 RFRC)');
set(25, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0050V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0050V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00');
set(25, G, 'Y - Passed');
set(25, H, 'R3 (batch 556, 2026-09-11): CIB1 with OOP referral indicator + CPD1 (RFRC, PEI referring provider RFRCLEBLANC). HSC 03.03A. OUTBB G0050: ACCEPTED.\nARD G0012: claim 927 action A, reason N28 — forwarded to out-of-province carrier. OOP referral segment confirmed correct.');

// ── Test 10 (r=26) — Locum; R3 retest ────────────────────────────────────────
set(26, D, 'HZV000557 (R3 — corrected BA fields + HSC 03.03A)\n[R2: HZV000547 — locum BA field 173-179 incorrect]');
set(26, E, 'HZV26SC00000935\nLocum prac BA (field 153-159): 9198510\nSubmitter FFS BA (field 173-179): 2449310 (prefix HZV)');
set(26, F, 'HMCT.XAOHHZV.DAILY.OUTBB.G0049V00\nHMCT.XAOHHZV.INPUT.BACKUP.G0049V00\nARD: HMCT.XAOHHZV.DAILY.ASSMT.FILE.G0012V00');
set(26, G, 'Y - Passed');
set(26, H, 'R3 (batch 557, 2026-09-11): Field 153-159 = locum prac BA (9198510). Field 173-179 = submitter FFS BA for prefix HZV (2449310) — corrected per AHCIP feedback (R2 had host prac BA in this field). HSC 03.03A. OUTBB G0049: ACCEPTED.\nARD G0012: claim 935 action A, ResultCode A — APPLIED, $37.09 paid (DIRD/BASE). Locum billing confirmed working.');

// ── Save ──────────────────────────────────────────────────────────────────────
XLSX.writeFile(wb, OUT);

console.log('');
console.log('=== Checklist updated (from AHCIP template) ===');
console.log('Source:', SRC);
console.log('Output:', OUT);
console.log('');
console.log('Round 3 status:');
console.log('  1A  ACPT          Y - Passed  (batch 541, ARD G0010)');
console.log('  1B  PART          Y - Passed  (batch 552, G0042 PARTIAL)');
console.log('  1C  RFSE          Y - Passed  (batch 532, G0018 RFSE)');
console.log('  2   Retrieve      Y - Passed  (83 files, G0008-G0012)');
console.log('  3   Resubmit PART Y - Passed  (batch 553, G0041)');
console.log('  4   Resubmit RFSE Y - Passed  (batch 532, G0031)');
console.log('  5   ARD retrieval Y - Passed  (G0008-G0012 reconciled)');
console.log('  6   New claim#    Y - Passed  (batch 551, N39B confirmed)');
console.log('  7A  Change        Pending ARD (batch 558, G0052 ACCEPTED)');
console.log('  7B  Reassess      Pending ARD (batch 559, G0051 ACCEPTED)');
console.log('  7C  Delete        Pending ARD (batch 560, G0053 ACCEPTED)');
console.log('  8   CST1/EMSAF   Y - Passed  (batch 554, N63 HELD+SUBM)');
console.log('  9A  Reciprocal    Y - Passed  (batch 555, N28 referred)');
console.log('  9B  OOP Referral  Y - Passed  (batch 556, N28 forwarded)');
console.log('  10  Locum         Y - Passed  (batch 557, Applied $37.09)');
