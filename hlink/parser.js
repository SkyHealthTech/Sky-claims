'use strict';

/**
 * hlink/parser.js
 *
 * Parser for Alberta Health H-Link response files:
 *  1. Batch Balance (BBAL) — immediate response to each submitted batch
 *  2. ARD (Assessment Result Detail) — payment/refusal detail per claim
 *
 * BATCH BALANCE FORMAT (from spec section 3.1, example on p.3.2)
 * ──────────────────────────────────────────────────────────────
 *  The Batch Balance is an ASCII text report (not fixed-width records).
 *  Key fields:
 *    Batch Number | First TXN ID | Last TXN ID | Status | Reason
 *  Status codes: ACPT | PART | RFSE
 *
 *  After the summary table, individual refused/error transactions appear
 *  in the same format as ARD records.
 *
 * ARD FORMAT (Assessment Result Detail)
 * ──────────────────────────────────────
 *  The ARD file contains one record per processed claim.
 *  Alberta Health has not published a formal fixed-width spec for ARD in
 *  the public documentation; parse by splitting on whitespace/delimiters.
 *
 * NOTE: Until the first real batch balance is received, the parser is
 * written against the example in spec section 3.1 (p.3.2). It will need
 * minor adjustments once actual response files are in hand.
 */

// ─── Batch Balance Parser ─────────────────────────────────────────────────────

/**
 * Parse a batch balance report text into a structured object.
 *
 * @param {string} text  Full text of the batch balance file
 * @returns {BatchBalanceResult}
 */
function parseBatchBalance(text) {
  const lines = text.split(/\r?\n/);

  const result = {
    raw:      text,
    batches:  [],          // Array of batch summary lines
    errors:   [],          // Refused/errored transactions (ARD-format lines at end)
    rawLines: lines,
  };

  // The header and detail table look like (from spec example):
  //   Batch First Transaction Last Transaction Status  Reason
  //   Number  ID               ID               Code   Code
  //   XCC123212 XCC98MN00039056 XCC98MN00039056 PART
  //
  // We look for lines that contain a known status code token.
  const STATUS_RE = /\b(ACPT|PART|RFSE)\b/;

  // Separate the summary section from the trailing ARD-format error records
  let inErrorSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Type-3 records (ARD inline errors) start with "3" + prefix pattern
    if (/^3[A-Z]{3}/.test(trimmed)) {
      inErrorSection = true;
      result.errors.push(parseArdRecord(trimmed));
      continue;
    }

    // Batch trailer marker
    if (/^4[A-Z]{3}/.test(trimmed)) {
      result.errors.push({ raw: trimmed, type: 'TRAILER' });
      continue;
    }

    if (!inErrorSection && STATUS_RE.test(trimmed)) {
      result.batches.push(parseBatchSummaryLine(trimmed));
    }
  }

  return result;
}

/**
 * Parse a single batch summary line from the batch balance report.
 *
 * Expected format (space-separated):
 *   BatchNumber  FirstTxnID  LastTxnID  StatusCode  [ReasonCode]
 *
 * e.g.:  HZV000530  HZV26SC0000011  HZV26SC0000011  ACPT
 *        HZV000531  HZV26SC0000021  HZV26SC0000022  PART
 *        HZV000532  HZV26SC0000031  HZV26SC0000031  RFSE  <reasonCode>
 */
function parseBatchSummaryLine(line) {
  const parts = line.trim().split(/\s+/);
  return {
    raw:           line,
    batchNumber:   parts[0] || '',
    firstTxnId:    parts[1] || '',
    lastTxnId:     parts[2] || '',
    statusCode:    parts[3] || '',
    reasonCode:    parts[4] || '',
    accepted:      parts[3] === 'ACPT',
    partial:       parts[3] === 'PART',
    refused:       parts[3] === 'RFSE',
  };
}

// ─── ARD Record Parser ────────────────────────────────────────────────────────

/**
 * Parse a single ARD (Assessment Result Detail) record.
 *
 * ARD records are type-3 lines (start with "3") in the same format as
 * submitted transactions, but with RESULT data in the segment area.
 *
 * The actual ARD format is determined by what Alberta Health returns.
 * This is a best-effort parser based on available spec documentation.
 * Adjust field offsets once real ARD files are received.
 *
 * Known fields from spec Appendix B:
 *  Col 1:     Record type "3"
 *  Col 2-16:  Claim number (15 chars: Prefix+YY+SC+Seq7+Check)
 *  Col 17-20: Transaction type "CIP1"
 *  Col 21-24: Segment type (usually "CIB1" on ARD)
 *  Col 25-28: Segment sequence
 *  Col 29:    Action code
 *  Col 30-35: Unused
 *  Col 36+:   Assessment result data (varies)
 *
 * @param {string} line
 * @returns {object}
 */
function parseArdRecord(line) {
  if (!line || line.length < 16) return { raw: line, type: 'UNKNOWN' };

  const claimNum  = line.slice(1, 16);      // cols 2-16
  const txnType   = line.slice(16, 20);     // cols 17-20
  const segType   = line.slice(20, 24);     // cols 21-24
  const segSeq    = line.slice(24, 28);     // cols 25-28
  const action    = line.slice(28, 29);     // col 29
  const segData   = line.slice(35);         // col 36+

  // Extract error/reason code from segment data
  // Alberta returns reason codes as a 2-4 char code starting around col 36
  const reasonCode = segData.slice(0, 4).trim();

  return {
    raw:         line,
    type:        'ARD',
    claimNumber: claimNum.trim(),
    txnType:     txnType.trim(),
    segType:     segType.trim(),
    segSeq:      parseInt(segSeq, 10) || 0,
    actionCode:  action,
    segData:     segData,
    reasonCode:  reasonCode,
    // We'll expand this once actual ARD format is confirmed
    description: describeArdReason(reasonCode),
  };
}

/**
 * Descriptions for common ARD reason/refusal codes.
 * Source: H-Link spec Appendix B (error/reject messages).
 * Expand as real codes are received.
 */
function describeArdReason(code) {
  const codes = {
    '37B ': 'Batch balance error — transaction count mismatch.',
    '39DA': 'Transaction refused — reason code 39DA.',
    'RFSE': 'Batch refused — see batch balance report.',
    'ACPT': 'Claim accepted.',
    'PART': 'Batch partially accepted.',
  };
  return codes[code] || (code ? 'Code: ' + code : '');
}

// ─── ARD File Parser ──────────────────────────────────────────────────────────

/**
 * Parse an ASSMT record line (the text-report format returned by Alberta Health).
 *
 * ASSMT record layout (254-char lines, space-padded):
 *   pos  0-14  ClaimNum    — 15-char claim number (Prefix+YY+SC+Seq7+Check)
 *   pos 15-18  VersionNum  — submission version counter (0000 = first submission)
 *   pos    19  ActionCode  — A / C / D / R
 *   pos 20-23  Reserved    — flags / prior-action indicators
 *   pos    24  ResultCode  — R = processed; space = pending
 *   pos 25-39  Spaces
 *   pos 40-48  PHN/ULI     — 9-digit Alberta ULI (zeros if blank/OOP)
 *   pos 49-59  OOP RegNum  — out-of-province registration number or spaces
 *   pos 60+    Assessment data fields (dates, amounts, batch IDs)
 *   ~pos 90    Amount      — 14-digit amount field (e.g. 00003709 = $37.09)
 *   ~pos 104   PayCode     — e.g. N39B, N35FA, N35FB 47, N28, N63, N (applied)
 *
 * ResultCode (pos 24) meanings — confirmed from real AHCIP ARD files:
 *   R   — Processed (refused or forwarded to reciprocal carrier)
 *   A   — Applied / Paid (claim assessed and payment issued)
 *   H   — Held (pending EMSAF/CST1 documentation or external adjudication)
 *   ' ' — Pending (not yet processed)
 *
 * PayCode meanings — confirmed from AHCIP ARD files (G0010–G0012):
 *   N39B      — Not Applied / test-env assessment refusal
 *   N35FA     — Refused — eligibility or claim edit failure
 *   N35FB     — Refused — change/reassess/delete not payable
 *   N35FB 47  — Refused — HSC expired (reason 47)
 *   N28       — Referred to interprovincial reciprocal/IFH carrier (OOP/RECP claims)
 *   N63       — Held for EMSAF (CST1) document submission
 *   N         — Applied at base rate (paid; DIRD/BASE processing)
 *
 * @param {string} line
 * @returns {object}
 */
function parseAssmtRecord(line) {
  if (!line || line.length < 20) return { raw: line, type: 'ASSMT_UNKNOWN' };

  const claimNum   = line.slice(0, 15).trim();
  const versionNum = line.slice(15, 19).trim();
  const actionCode = line.slice(19, 20);
  const resultCode = line.slice(24, 25).trim();  // R=processed A=applied H=held
  const phn        = line.slice(40, 49).trim();

  // Amount: 14-digit field starting around position 76 (after dates/IDs).
  // Scan for first non-zero numeric run of 8+ digits — represents cents (e.g. 00003709 = $37.09).
  const amountMatch = line.slice(70, 104).match(/(\d{8,14})/);
  const amountCents = amountMatch ? parseInt(amountMatch[1], 10) : 0;

  // PayCode: starts around position 104, begins with N.
  // Handles all observed formats:
  //   N + 2 digits + 0-2 letters + optional sub-code (e.g. N35FB 47, N28, N63)
  //   Bare "N" (applied at base rate, no suffix)
  const tail = line.slice(90);
  const payMatch = tail.match(/N(\d{2})([A-Z]{0,2})(\s{1,3}\d{1,2})?(?=\s|$)/) ||
                   tail.match(/(N)(?=\s{2,}|$)/);
  let payCode = '';
  if (payMatch) {
    if (payMatch[0] === 'N') {
      payCode = 'N';
    } else {
      payCode = ('N' + payMatch[1] + (payMatch[2] || '') +
                 (payMatch[3] ? ' ' + payMatch[3].trim() : '')).trim();
    }
  }

  // Supplement SUBM flag (EMSAF held)
  const submFlag = /\bSUBM\b/.test(line);

  // Derive display reasonCode — prefer payCode; for ResultCode A use "Applied"
  const reasonCode = payCode ||
    (resultCode === 'A' ? 'Applied' : resultCode === 'H' ? 'Held' : '');

  // Determine applied/held/refused/referred
  const applied  = resultCode === 'A';
  const held     = resultCode === 'H';
  const referred = payCode === 'N28';
  const refused  = !applied && !held && !referred && /^N(39|35)/.test(payCode);

  return {
    raw:         line,
    type:        'ASSMT',
    claimNumber: claimNum,
    versionNum:  parseInt(versionNum, 10) || 0,
    actionCode,
    resultCode,
    phn,
    payCode,
    amountCents,
    submFlag,
    applied,
    held,
    referred,
    refused,
    reasonCode,
    description: describeAssmtPayCode(payCode, resultCode, amountCents, submFlag),
  };
}

/**
 * Descriptions for AHCIP ASSMT payment/refusal codes.
 */
function describeAssmtPayCode(code, resultCode, amountCents, submFlag) {
  if (resultCode === 'A') {
    const dollars = amountCents ? ' ($' + (amountCents / 100).toFixed(2) + ')' : '';
    return 'Applied — payment issued' + dollars + '.';
  }
  if (resultCode === 'H') {
    return 'Held' + (submFlag ? ' — pending EMSAF/CST1 document submission.' : '.');
  }
  if (!code) return '';
  if (code.startsWith('N39B'))  return 'Not Applied — assessment refused (code 39B).';
  if (code.startsWith('N35FA')) return 'Refused — eligibility or claim edit failure (code 35FA).';
  if (code.startsWith('N35FB')) return 'Refused — change/reassess/delete not payable (code 35FB).';
  if (code === 'N28')           return 'Referred to interprovincial reciprocal/IFH carrier.';
  if (code === 'N63')           return 'Held — EMSAF document required (CST1 flag set).';
  if (code === 'N')             return 'Applied at base rate (DIRD/BASE).';
  return 'Pay code: ' + code;
}

/**
 * Parse a complete ARD / ASSMT file (Assessment Result Detail).
 *
 * Handles two formats:
 *  1. ASSMT text report (Alberta Health daily file): timestamp header, claim records
 *     starting directly with the 15-char claim number, TRAILER footer.
 *  2. Type-2/3/4 fixed-width records (legacy / inline ARD in batch balance).
 *
 * @param {string} text  Full file content
 * @returns {ArdResult}
 */
function parseArdFile(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const result = {
    raw:      text,
    header:   null,
    records:  [],
    trailer:  null,
  };

  // Detect ASSMT format: first non-empty line is a timestamp like "2026/08/28 15:53..."
  const isAssmt = /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/.test(lines[0] || '');

  if (isAssmt) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^\d{4}\/\d{2}\/\d{2}/.test(trimmed) && trimmed.endsWith('HEADER')) {
        result.header = { raw: line, format: 'ASSMT' };
      } else if (/^\d+TRAILER$/.test(trimmed)) {
        result.trailer = { raw: line, format: 'ASSMT' };
      } else if (/^[A-Z]{3}\d{2}[A-Z]{2}\d{8}/.test(trimmed)) {
        // Looks like a claim record: Prefix(3)+YY(2)+SC(2)+Seq7(7)+VerN(4)+...
        result.records.push(parseAssmtRecord(line));
      }
    }
    return result;
  }

  // Legacy type-2/3/4 format
  for (const line of lines) {
    const ch = line[0];
    if (ch === '2') {
      result.header = { raw: line, batchNum: line.slice(4, 10).trim() };
    } else if (ch === '4') {
      result.trailer = { raw: line, batchNum: line.slice(4, 10).trim() };
    } else if (ch === '3') {
      result.records.push(parseArdRecord(line));
    }
  }

  return result;
}

// ─── Retrieve summary ─────────────────────────────────────────────────────────

/**
 * Print a human-readable summary of a batch balance parse result.
 * @param {BatchBalanceResult} bbal
 */
function printBatchBalanceSummary(bbal) {
  console.log('=== Batch Balance Summary ===');
  if (!bbal.batches.length) {
    console.log('(no batch summary lines found — check raw output)');
  }
  for (const b of bbal.batches) {
    const statusLabel =
      b.accepted ? '✓ ACCEPTED' :
      b.partial  ? '⚠ PARTIAL' :
      b.refused  ? '✗ REFUSED' : b.statusCode;
    console.log('  Batch ' + b.batchNumber + '  ' + statusLabel +
      (b.reasonCode ? '  Reason: ' + b.reasonCode : ''));
  }
  if (bbal.errors.length) {
    console.log('\n-- Inline error records (' + bbal.errors.length + ') --');
    for (const e of bbal.errors) {
      if (e.type === 'TRAILER') continue;
      console.log('  Claim ' + e.claimNumber + '  Reason: ' + (e.reasonCode || '?') +
        '  ' + (e.description || ''));
    }
  }
}

module.exports = {
  parseBatchBalance,
  parseBatchSummaryLine,
  parseArdRecord,
  parseArdFile,
  parseAssmtRecord,
  printBatchBalanceSummary,
  describeArdReason,
  describeAssmtPayCode,
};
