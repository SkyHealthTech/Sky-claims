'use strict';

/**
 * teleplan/parser.js
 *
 * Response / remittance parser.
 * Ingests the records retrieved from Teleplan and maps them to typed results.
 *
 * RECORD TYPES HANDLED
 * ─────────────────────
 *   C12   — Refusal record (the most important one to get right)
 *   RA    — Remittance / payment record
 *   E45   — Eligibility response (from B04 batch eligibility)
 *   VS1   — Header (metadata only)
 *
 * C12 REFUSAL PARSING
 * ────────────────────
 * The C12 is the pre-edit / edit & eligibility refusal record.
 * Two stages:
 *   Pre-edit refusal: "YY" in the first field — claim never reached MSP adjudication.
 *   Edit & eligibility: up to 3 error fields, each surfacing a specific reason code.
 *
 * SPEC REFERENCE: The exact field positions for C12, RA, and E45 records
 * are in the Teleplan Specifications (gov.bc.ca/teleplan). Fill in
 * parseC12Refusal() once you have confirmed the spec layout.
 */

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Parse the full text of a Teleplan retrieve-remittances response.
 *
 * @param {string} rawText  Complete text from retrieveRemittances()
 * @returns {RemittanceBundle}
 */
function parseRemittanceBundle(rawText) {
  const lines = rawText.split(/\r?\n/).filter(Boolean);

  const bundle = {
    raw:           rawText,
    header:        null,
    refusals:      [],
    payments:      [],
    eligibility:   [],
    messages:      [],
    unknownLines:  [],
  };

  for (const line of lines) {
    // Host messages (TETZ-NNN) — informational, not record data
    if (/^TETZ-\d+/.test(line)) {
      bundle.messages.push(line.trim());
      continue;
    }

    // Identify record type from first field
    // SPEC: confirm record type indicator position (typically cols 1-2 or 1-3)
    const recordType = identifyRecordType(line);

    switch (recordType) {
      case 'VS1':
        bundle.header = parseVS1(line);
        break;
      case 'C12':
        bundle.refusals.push(parseC12Refusal(line));
        break;
      case 'RA':
        bundle.payments.push(parseRemittanceRecord(line));
        break;
      case 'E45':
        bundle.eligibility.push(parseEligibilityReturn(line));
        break;
      default:
        bundle.unknownLines.push(line);
    }
  }

  return bundle;
}

// ─── Record type identification ───────────────────────────────────────────────

/**
 * Identify the record type from a returned record line.
 *
 * SPEC REFERENCE: The record type indicator position is fixed.
 * Confirm position and length from the spec.
 */
function identifyRecordType(line) {
  // TODO: extract the record type code at the correct position
  // Typical pattern: first 2-3 characters identify the record type.
  // Examples: "C12...", "RA...", "VS1..."
  const prefix = line.slice(0, 3).trim().toUpperCase();

  if (prefix === 'VS1') return 'VS1';
  if (prefix === 'C12') return 'C12';
  if (prefix.startsWith('RA'))  return 'RA';
  if (prefix.startsWith('E45')) return 'E45';

  return 'UNKNOWN';
}

// ─── C12 Refusal record ───────────────────────────────────────────────────────

/**
 * Parse a C12 refusal record.
 *
 * A C12 is returned when a claim fails pre-edit or edit & eligibility checks.
 * It must be surfaced to the user with actionable messaging so they can correct
 * and resubmit. Category #13 in the conformance matrix ("clean real-data claims")
 * proves we can *avoid* C12s with properly formatted data.
 *
 * Pre-edit refusal marker:
 *   "YY" in the first field means the claim was refused at the data-centre
 *   level before reaching MSP adjudication.
 *
 * Edit & eligibility errors: up to 3 error fields, each containing:
 *   - Error field indicator
 *   - Specific reason code
 *   - Explanation text
 *
 * SPEC REFERENCE: "C12 Refusal Record Layout" — fill in field positions.
 *
 * @param {string} line
 * @returns {C12Refusal}
 */
function parseC12Refusal(line) {
  // TODO: Extract fields at their confirmed spec positions.
  // Key fields to extract:
  //   - Original claim sequence number (links back to submitted claim)
  //   - Original service date
  //   - Original PHN
  //   - Pre-edit flag (YY = pre-edit refusal)
  //   - Error field 1 indicator + reason code
  //   - Error field 2 indicator + reason code
  //   - Error field 3 indicator + reason code

  return {
    raw:              line,
    type:             'C12',
    isPreEdit:        false,     // TODO: line.slice(pos, pos+len) === 'YY'
    sequenceNumber:   null,      // TODO
    serviceDate:      null,      // TODO
    phn:              null,      // TODO
    errors:           [],        // TODO: [{field, code, description}]
    actionRequired:   'Inspect C12 record — field parsing not yet implemented.',
  };
}

// ─── Remittance / payment record ──────────────────────────────────────────────

/**
 * Parse a remittance (RA) record.
 *
 * RA records confirm payment for a submitted claim.
 * Must reconcile back to the original claim via sequence number.
 *
 * SPEC REFERENCE: "Remittance Record Layout"
 *
 * @param {string} line
 * @returns {RemittanceRecord}
 */
function parseRemittanceRecord(line) {
  // TODO: extract field positions from spec
  // Key fields:
  //   - Original claim sequence number (reconciliation key)
  //   - Paid amount
  //   - Paid date
  //   - Adjustment codes (if any)

  return {
    raw:              line,
    type:             'RA',
    sequenceNumber:   null,   // TODO
    paidAmount:       null,   // TODO — in cents or dollars? confirm from spec
    paidDate:         null,   // TODO — YYYYMMDD
    adjustmentCode:   null,   // TODO
  };
}

// ─── VS1 header ──────────────────────────────────────────────────────────────

/**
 * @param {string} line
 * @returns {object}
 */
function parseVS1(line) {
  // TODO: extract data-centre #, submission sequence #, date/time from spec
  return {
    raw:  line,
    type: 'VS1',
  };
}

// ─── B04 eligibility return ───────────────────────────────────────────────────

/**
 * Parse an eligibility return record (E45 response from B04 batch eligibility).
 * This is used for repeat/scheduled patients — not the real-time AcheckE45.
 *
 * SPEC REFERENCE: "B04 / E45 Eligibility Return Record"
 *
 * @param {string} line
 * @returns {object}
 */
function parseEligibilityReturn(line) {
  // TODO: extract field positions from spec
  return {
    raw:               line,
    type:              'E45',
    phn:               null,   // TODO
    eligibleOnDate:    null,   // TODO
    authorizedPeriod:  null,   // TODO — the date range MSP has authorized
  };
}

// ─── Reconciliation helper ────────────────────────────────────────────────────

/**
 * Reconcile a parsed remittance bundle against the claims that were submitted.
 *
 * @param {RemittanceBundle} bundle       From parseRemittanceBundle()
 * @param {object[]}         submitted    Array of claims with sequenceNumber fields
 * @returns {ReconciliationReport}
 */
function reconcile(bundle, submitted) {
  const submittedMap = new Map(submitted.map(c => [c.sequenceNumber, c]));

  const paid     = [];
  const refused  = [];
  const unmatched = [];

  for (const payment of bundle.payments) {
    const original = submittedMap.get(payment.sequenceNumber);
    if (original) {
      paid.push({ original, payment });
    } else {
      unmatched.push({ type: 'payment', record: payment });
    }
  }

  for (const refusal of bundle.refusals) {
    const original = submittedMap.get(refusal.sequenceNumber);
    if (original) {
      refused.push({ original, refusal });
    } else {
      unmatched.push({ type: 'refusal', record: refusal });
    }
  }

  return {
    totalSubmitted: submitted.length,
    paid,
    refused,
    unmatched,
    summary: `${paid.length} paid / ${refused.length} refused / ${unmatched.length} unmatched`,
  };
}

module.exports = {
  parseRemittanceBundle,
  parseC12Refusal,
  parseRemittanceRecord,
  parseEligibilityReturn,
  reconcile,
  identifyRecordType,
};
