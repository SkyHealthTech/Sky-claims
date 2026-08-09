'use strict';

/**
 * teleplan/parser.js
 *
 * Remittance / response parser for Teleplan4 records.
 *
 * RECORD TYPES HANDLED
 * ─────────────────────
 *  C12   — Claim refusal (pre-edit or eligibility edit)
 *  B14   — Batch eligibility response (returned for B04 submissions)
 *  S01   — Individual claim payment record (basic)
 *  S02   — Individual claim payment record (with patient/OIN info)
 *  S03   — Enrolment record
 *  S04   — Claim hold record
 *  S21   — Payee summary header
 *  S22   — Payee financial summary
 *  S23   — Practitioner adjustment/rollback summary
 *  S24   — Deduction summary
 *  S25   — Broadcast message record
 *  M01   — Administrative message (e.g. next close-off date)
 *  VRCV  — Receive acknowledgement (per-batch)
 *  VTCV  — File trailer
 *
 * C12 FIELD LAYOUT (confirmed from 2026-08-08 dummy remittance)
 * ──────────────────────────────────────────────────────────────
 *  Pos  0-2   Record type "C12"
 *  Pos  3-7   Vendor DC number (e.g. "V0127")
 *  Pos  8-14  DC sequence number (7 digits, the submitted claim's seq)
 *  Pos 15-19  Payee number (5 chars)
 *  Pos 20-24  Practitioner number (5 chars)
 *  Pos 25-30  Refusal codes (6 chars = up to 3 × 2-char codes, space-padded right)
 *  Pos 31-38  Spaces (8 chars)
 *  Pos 39-45  Cross-reference seq (7 digits, mirrors pos 8-14 when present, else 0000000)
 *
 * B14 FIELD LAYOUT (confirmed from 2026-08-08 dummy remittance)
 * ──────────────────────────────────────────────────────────────
 *  Pos  0-2   Record type "B14"
 *  Pos  3-7   Vendor DC number
 *  Pos  8-14  DC sequence number (the B04 submission seq)
 *  Pos 15-18  Name-verify (4 chars)
 *  Pos 19-26  Date of service (8 digits, YYYYMMDD)
 *  Pos 27-28  Response code (2 chars, e.g. "AB" = rejected)
 *  Pos 29     Space
 *  Pos 30-37  (8 chars — 00000000 in sample)
 *  Pos 38+    Text description (e.g. "REJECTED - CODE: AB")
 *
 * S-RECORD FIELD LAYOUT (common prefix, all S-types)
 * ────────────────────────────────────────────────────
 *  Pos  0-2   Record type (S01, S02, S03, S04, S21-S25)
 *  Pos  3-7   Vendor DC number
 *  Pos  8-14  Internal claim reference number (7 digits)
 *  Pos 15-22  Remittance date (8 digits, YYYYMMDD)
 *  Pos 23     Sub-type indicator (P=paid, H=hold, R=enrolment, etc.)
 *  Pos 24-28  Payee number (5 chars)
 *  Pos 29+    Type-specific fields
 *
 * S25 (broadcast message):
 *  Pos  0-2   "S25"
 *  Pos  3-7   Vendor DC number
 *  Pos  8-14  Sequence
 *  Pos 15-22  Date
 *  Pos 23     "B" (broadcast)
 *  Pos 24-28  PHN or payee (5 chars)
 *  Pos 29-35  (7-char routing)
 *  Pos 36+    Message text
 */

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Parse the full text of a Teleplan retrieve-remittances response.
 *
 * @param {string} rawText  Complete text from retrieveRemittances()
 * @returns {RemittanceBundle}
 */
function parseRemittanceBundle(rawText) {
  var lines = rawText.split(/\r?\n/).filter(Boolean);

  var bundle = {
    raw:           rawText,
    refusals:      [],   // C12
    batchEligibility: [], // B14
    payments:      [],   // S01/S02
    holds:         [],   // S04
    messages:      [],   // S25 broadcast + M01
    summaries:     [],   // S21-S24
    vrcv:          [],   // receive acknowledgements
    vtcv:          null, // file trailer
    hostMessages:  [],   // TETA/TETB/TETZ- codes
    unknownLines:  [],
  };

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Host messages (TETZ-NNN etc.) — informational, not record data
    if (/^TETZ-\d+|^TETA-\d+|^TETB-\d+/.test(line)) {
      bundle.hostMessages.push(line.trim());
      continue;
    }

    var recordType = identifyRecordType(line);

    switch (recordType) {
      case 'C12':
        bundle.refusals.push(parseC12Refusal(line));
        break;
      case 'B14':
        bundle.batchEligibility.push(parseB14Response(line));
        break;
      case 'S01':
      case 'S02':
        bundle.payments.push(parseSPayment(line));
        break;
      case 'S03':
        // Enrolment record — store typed
        bundle.payments.push({ type: 'S03', raw: line, seq: parseSeq(line) });
        break;
      case 'S04':
        bundle.holds.push({ type: 'S04', raw: line, seq: parseSeq(line) });
        break;
      case 'S21':
      case 'S22':
      case 'S23':
      case 'S24':
        bundle.summaries.push({ type: recordType, raw: line, seq: parseSeq(line) });
        break;
      case 'S25':
        bundle.messages.push(parseS25Message(line));
        break;
      case 'M01':
        bundle.messages.push({ type: 'M01', raw: line, text: line.slice(15).trim() });
        break;
      case 'VRCV':
        bundle.vrcv.push({ type: 'VRCV', raw: line });
        break;
      case 'VTCV':
        bundle.vtcv = { type: 'VTCV', raw: line };
        break;
      default:
        bundle.unknownLines.push(line);
    }
  }

  return bundle;
}

// ─── Record type identification ───────────────────────────────────────────────

function identifyRecordType(line) {
  if (line.length < 3) return 'UNKNOWN';
  var p3 = line.slice(0, 3).toUpperCase();
  var p4 = line.slice(0, 4).toUpperCase();

  if (p3 === 'C12') return 'C12';
  if (p3 === 'B14') return 'B14';
  if (p3 === 'S01') return 'S01';
  if (p3 === 'S02') return 'S02';
  if (p3 === 'S03') return 'S03';
  if (p3 === 'S04') return 'S04';
  if (p3 === 'S21') return 'S21';
  if (p3 === 'S22') return 'S22';
  if (p3 === 'S23') return 'S23';
  if (p3 === 'S24') return 'S24';
  if (p3 === 'S25') return 'S25';
  if (p3 === 'M01') return 'M01';
  if (p4 === 'VRCV') return 'VRCV';
  if (p4 === 'VTCV') return 'VTCV';
  // Legacy RA/E45 patterns (may appear in some response bodies)
  if (p3.startsWith('RA'))  return 'RA';
  if (p3.startsWith('E45')) return 'E45';

  return 'UNKNOWN';
}

// ─── C12 Refusal record ───────────────────────────────────────────────────────

/**
 * Parse a C12 refusal record.
 *
 * Field positions confirmed from 2026-08-08 HIBC dummy remittance.
 *
 * @param {string} line
 * @returns {C12Refusal}
 */
function parseC12Refusal(line) {
  var seqNum    = parseInt(line.slice(8, 15), 10);     // DC-SEQUENCE-NUM (7)
  var payeeNum  = line.slice(15, 20).trim();            // PAYEE-NUM (5)
  var practNum  = line.slice(20, 25).trim();            // PRACTITIONER-NUM (5)

  // Refusal code block: 6 chars (up to 3 × 2-char codes), space-padded right.
  var codeBlock = line.slice(25, 31);
  var codes = [];
  for (var i = 0; i < 3; i++) {
    var code = codeBlock.slice(i * 2, i * 2 + 2).trim();
    if (code) codes.push(code);
  }

  return {
    raw:             line,
    type:            'C12',
    sequenceNumber:  isNaN(seqNum) ? null : seqNum,
    payeeNum:        payeeNum,
    practitionerNum: practNum,
    refusalCodes:    codes,
    actionRequired:  codes.length
      ? 'Claim refused — code(s): ' + codes.join(', ') + '. ' + describeRefusalCodes(codes)
      : 'Claim refused (see raw record).',
  };
}

/**
 * Human-readable descriptions for common Teleplan refusal codes.
 * Source: Teleplan4 specifications and HIBC documentation.
 */
function describeRefusalCodes(codes) {
  var descriptions = {
    'AB': 'Age bar — patient age does not qualify for this benefit.',
    'AP': 'Authorization required — obtain prior approval before billing.',
    'AA': 'Already adjudicated — claim previously processed.',
    'BJ': 'Billing journal entry — claim has a note that requires review.',
    'CK': 'Check — claim requires manual review.',
    'CL': 'Claim limit reached — maximum claims per period exceeded.',
    'CN': 'Cannot verify — patient information could not be confirmed.',
    'CP': 'Coverage problem — patient may not be eligible on date of service.',
    'FX': 'Fee item not found — fee item code not in current schedule.',
    'RE': 'Refused — claim has been refused; see note for details.',
    'T3': 'Timing violation — service billed outside allowed time window.',
    'VI': 'Verification issue — identity verification required.',
    'W1': 'Waiting period — patient in MSP waiting period.',
    'X4': 'Format/edit error — check claim fields for compliance issues.',
    'X9': 'Refused — practitioner/payee combination not accepted.',
    'Y2': 'Advisory — no action required.',
  };
  return codes
    .filter(function(c) { return descriptions[c]; })
    .map(function(c) { return c + ': ' + descriptions[c]; })
    .join(' | ');
}

// ─── B14 Batch eligibility response ──────────────────────────────────────────

/**
 * Parse a B14 batch eligibility response record.
 * These are returned in remittances for B04 batch eligibility submissions.
 *
 * Field positions confirmed from 2026-08-08 HIBC dummy remittance.
 *
 * @param {string} line
 * @returns {object}
 */
function parseB14Response(line) {
  var seqNum      = parseInt(line.slice(8, 15), 10);   // sequence of the B04 submission
  var nameVerify  = line.slice(15, 19).trim();          // name-verify (4)
  var dateOfSvc   = line.slice(19, 27).trim();          // YYYYMMDD (8)
  var code        = line.slice(27, 29).trim();          // response/refusal code (2)
  var descText    = line.slice(38).trim();              // text description (rest of record)

  return {
    raw:            line,
    type:           'B14',
    sequenceNumber: isNaN(seqNum) ? null : seqNum,
    nameVerify:     nameVerify,
    dateOfService:  dateOfSvc,
    responseCode:   code,
    description:    descText.replace(/\s+/g, ' ').trim(),
    eligible:       code !== 'AB' && code !== 'X4' && code !== 'RE',
  };
}

// ─── S-record payment ─────────────────────────────────────────────────────────

/**
 * Parse an S01/S02 claim payment record.
 * Full S-record layout is extensive; this extracts the common header fields
 * and stores the raw line for reconciliation.
 *
 * @param {string} line
 * @returns {object}
 */
function parseSPayment(line) {
  var type          = line.slice(0, 3).toUpperCase();
  var refNum        = parseInt(line.slice(8, 15), 10);   // internal reference number
  var remittDate    = line.slice(15, 23).trim();          // YYYYMMDD remittance date
  var indicator     = line.slice(23, 24).trim();          // P=paid, etc.
  var payeeNum      = line.slice(24, 29).trim();          // payee (5)

  return {
    raw:            line,
    type:           type,
    referenceNum:   isNaN(refNum) ? null : refNum,
    remittanceDate: remittDate,
    indicator:      indicator,
    payeeNum:       payeeNum,
    // sequenceNumber is the original DC seq (needed for reconciliation).
    // For S-records the reference num is the internal MSP claim ref, not the
    // vendor DC seq. Reconciliation must use other fields (date + fee item).
    sequenceNumber: null,
  };
}

// ─── S25 Broadcast message ────────────────────────────────────────────────────

/**
 * Parse an S25 broadcast message record.
 * These carry administrative messages from MSP to all practitioners.
 *
 * @param {string} line
 * @returns {object}
 */
function parseS25Message(line) {
  // Text starts at position 36 (after type+DC+seq+date+indicator+payee+routing)
  var text = line.slice(36).trim();
  return {
    raw:  line,
    type: 'S25',
    text: text,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function parseSeq(line) {
  var n = parseInt(line.slice(8, 15), 10);
  return isNaN(n) ? null : n;
}

// ─── Reconciliation helper ────────────────────────────────────────────────────

/**
 * Reconcile a parsed remittance bundle against submitted claims.
 *
 * C12 refusals are matched by DC sequence number.
 * S01/S02 payments cannot be matched by seq (MSP uses internal refs);
 * they are reported in aggregate.
 *
 * @param {RemittanceBundle} bundle       From parseRemittanceBundle()
 * @param {object[]}         submitted    Array of submitted records (with sequenceNumber)
 * @returns {ReconciliationReport}
 */
function reconcile(bundle, submitted) {
  var submittedSeqs = new Set(submitted.map(function(c) { return c.sequenceNumber; }));

  var refused   = [];
  var unmatched = [];

  for (var i = 0; i < bundle.refusals.length; i++) {
    var refusal = bundle.refusals[i];
    if (refusal.sequenceNumber && submittedSeqs.has(refusal.sequenceNumber)) {
      refused.push(refusal);
    } else {
      unmatched.push({ type: 'refusal', record: refusal });
    }
  }

  return {
    totalSubmitted:  submitted.length,
    totalRefusals:   bundle.refusals.length,
    matchedRefusals: refused,
    unmatchedRefusals: unmatched,
    payments:        bundle.payments.length,
    batchEligibility: bundle.batchEligibility.length,
    messages:        bundle.messages.length,
    summary: refused.length + ' refusal(s) for submitted seqs; ' +
             bundle.payments.length + ' payment record(s); ' +
             bundle.batchEligibility.length + ' B14 response(s)',
  };
}

module.exports = {
  parseRemittanceBundle,
  parseC12Refusal,
  parseB14Response,
  parseSPayment,
  parseS25Message,
  reconcile,
  identifyRecordType,
  describeRefusalCodes,
  // Legacy aliases so existing callers don't break
  parseRemittanceRecord:   parseSPayment,
  parseEligibilityReturn:  parseB14Response,
};
