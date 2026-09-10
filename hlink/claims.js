'use strict';

/**
 * hlink/claims.js
 *
 * Alberta Health H-Link batch and claim record builder.
 *
 * RECORD TYPES
 * ─────────────
 *  "2" — Batch Header
 *  "3" — Claim Transaction (CIB1 / CPD1 / CST1 / CTX1 segments)
 *  "4" — Batch Trailer
 *
 * All records are exactly 254 characters, space-padded, followed by CRLF.
 *
 * CLAIM NUMBER STRUCTURE (15 chars)
 * ────────────────────────────────
 *  Prefix(3) + Year(2) + SourceCode(2) + Seq(7) + CheckDigit(1)
 *  e.g.  HZV 26 SC 0000001 3  →  HZV26SC00000013
 *
 * TRANSACTION HEADER (positions 1-35, 1-indexed per spec)
 * ────────────────────────────────────────────────────────
 *  01     Record type "3"
 *  02-04  Submitter Prefix
 *  05-06  Current Year (YY)
 *  07-08  Source Code
 *  09-15  Sequence Number (7 digits, zero-padded)
 *  16     Check Digit
 *  17-20  Transaction Type "CIP1"
 *  21-24  Segment Type (CIB1 / CPD1 / CST1 / CTX1)
 *  25-28  Segment Sequence (4 digits, "0001" etc.)
 *  29     Action Code (A / C / D / R)
 *  30-35  Unused — blanks
 *  36-254 Segment data (219 chars)
 *
 * SPEC REF: HLINK Electronic Claims Submission Specifications v3.1 Oct 2021
 */

const RECORD_LEN = 254;

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Pad string to length on the right with spaces.
 */
function padR(str, len) {
  str = String(str == null ? '' : str);
  return (str + ' '.repeat(len)).slice(0, len);
}

/**
 * Pad number/string to length on the left with zeros.
 */
function padL0(val, len) {
  val = String(val == null ? '' : val);
  return ('0'.repeat(len) + val).slice(-len);
}

/**
 * Pad number/string to length on the left with spaces.
 */
function padLS(val, len) {
  val = String(val == null ? '' : val);
  return (' '.repeat(len) + val).slice(-len);
}

/**
 * Pad a fixed-width line to exactly RECORD_LEN chars.
 */
function padRecord(line) {
  line = String(line);
  if (line.length > RECORD_LEN) throw new Error('Record exceeds 254 chars: ' + line.length);
  return (line + ' '.repeat(RECORD_LEN)).slice(0, RECORD_LEN);
}

/**
 * Modulus-10 (Luhn) check digit for a 7-digit sequence number.
 *
 * Algorithm per Alberta Health H-Link spec:
 *  1. Process digits left-to-right; multiply alternating digits by 2 starting
 *     with the LEFT-most (position 1). If product > 9, subtract 9.
 *  2. Sum all results.
 *  3. checkDigit = (10 - (sum % 10)) % 10
 *
 * Note: Alberta's Luhn starts doubling from the LEFT (unlike standard credit-card
 * Luhn which doubles from the right). Verify with AHCIP if errors occur.
 */
function calcCheckDigit(seq) {
  const digits = padL0(seq, 7).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 0) {          // odd positions (1,3,5,7) → 0-indexed 0,2,4,6
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Build the 15-char claim number.
 * @param {string} prefix       e.g. 'HZV'
 * @param {number|string} seq   Sequence number (will be zero-padded to 7)
 * @param {string} sourceCode   e.g. 'SC'
 * @param {number} year         Full year e.g. 2026 → stored as 2-digit '26'
 */
function buildClaimNumber(prefix, seq, sourceCode, year) {
  const yy      = String(year || new Date().getFullYear()).slice(-2);
  const seq7    = padL0(seq, 7);
  const check   = calcCheckDigit(seq);
  return padR(prefix, 3) + yy + padR(sourceCode, 2) + seq7 + check;
}

// ─── Batch Header (record type "2") ──────────────────────────────────────────

/**
 * Build batch header line.
 * @param {string} prefix       Submitter prefix, 3 chars (e.g. 'HZV')
 * @param {number|string} batchNum  Batch number (padded to 6 digits)
 * @returns {string} 254-char record
 */
function buildBatchHeader(prefix, batchNum) {
  // "2" + Prefix(3) + BatchNum(6) + blanks to 254
  const line = '2' + padR(prefix, 3) + padL0(batchNum, 6);
  return padRecord(line);
}

// ─── Transaction header (first 35 chars of a type-3 record) ──────────────────

/**
 * Build the 35-char transaction header portion.
 *
 * @param {string} prefix
 * @param {number|string} seq
 * @param {string} sourceCode
 * @param {string} segType      'CIB1' | 'CPD1' | 'CST1' | 'CTX1'
 * @param {number} segSeq       Segment sequence within this transaction (1, 2, 3...)
 * @param {string} actionCode   'A' | 'C' | 'D' | 'R'
 * @param {number} year         e.g. 2026
 */
function buildTxnHeader(prefix, seq, sourceCode, segType, segSeq, actionCode, year) {
  const yy    = String(year || new Date().getFullYear()).slice(-2);
  const seq7  = padL0(seq, 7);
  const check = calcCheckDigit(seq);
  //  01    02-04     05-06  07-08            09-15  16     17-20   21-24      25-28           29           30-35
  return '3' + padR(prefix, 3) + yy + padR(sourceCode, 2) + seq7 + check + 'CIP1' + padR(segType, 4) + padL0(segSeq, 4) + actionCode + '      ';
  // total = 1 + 3 + 2 + 2 + 7 + 1 + 4 + 4 + 4 + 1 + 6 = 35 ✓
}

// ─── CIB1 Segment ─────────────────────────────────────────────────────────────

/**
 * Build a CIB1 (In-Province Provider Base Claim) transaction record.
 *
 * All fields correspond to positions 36-254 of the full 254-char record
 * (i.e. the segment data portion, 219 chars).
 *
 * @param {object} opts
 *   prefix         {string}  Submitter prefix
 *   seq            {number}  Claim sequence number
 *   sourceCode     {string}  Source code
 *   actionCode     {string}  'A' | 'C' | 'D' | 'R'
 *   year           {number}
 *   segSeq         {number}  Usually 1 for CIB1
 *   prid           {string}  Service Provider ID, 9 digits
 *   skillCode      {string}  4-char skill code (or blank if single skill)
 *   uli            {string}  Service Recipient ULI/PHN, 9 digits (blank for Good Faith)
 *   regNum         {string}  Service Recipient Registration Num, 12 chars (Medical Reciprocal)
 *   hsc            {string}  Health Service Code, up to 7 chars
 *   serviceDate    {string}  YYYYMMDD
 *   encounter      {string}  '1' (default)
 *   dx1            {string}  ICD-9 diagnosis code 1, up to 6 chars
 *   dx2            {string}  ICD-9 diagnosis code 2
 *   dx3            {string}  ICD-9 diagnosis code 3
 *   calls          {number}  Number of calls/units (default 1)
 *   feeMod1        {string}  Explicit Fee Modifier 1 (6 chars)
 *   feeMod2        {string}  Explicit Fee Modifier 2
 *   feeMod3        {string}  Explicit Fee Modifier 3
 *   facilityNum    {string}  6-digit facility number
 *   functCentre    {string}  4-char functional centre
 *   locationCode   {string}  'HOME' | 'SCHL' | 'OTHR' (if no facility)
 *   origFacility   {string}  6-digit originating facility
 *   origLocation   {string}  4-char originating location
 *   businessArrangement {string} 7-digit BA number
 *   payToCode      {string}  'BAPY' | 'RECP' | 'CONT' | 'OTHR' | 'PRVD'
 *   payToULI       {string}  9-digit ULI if payToCode='OTHR'
 *   locumBA        {string}  7-digit locum BA (if locum)
 *   referralId     {string}  9-char referring PRID
 *   oopReferral    {string}  'Y' if OOP referral
 *   recoveryCode   {string}  Province code for Medical Reciprocal (e.g. 'SK')
 *   chartNum       {string}  Free-format, up to 14 chars
 *   claimedAmount  {number}  In cents (e.g. 4500 = $45.00), 9 digits
 *   claimedAmtInd  {string}  'Y' if claiming less than schedule
 *   interceptReason {string} 'PKUP' or blank
 *   confidential   {string}  'Y' if confidential
 *   goodFaith      {string}  'Y' if Good Faith claim
 *   newbornCode    {string}  'ADOP'|'LVBR'|'STBN'|'MULT' or blank
 *   emsaf          {string}  'Y' if EMSAF claim
 *   paperDocs      {string}  'Y' if paper supporting documentation
 *   hospAdmitDate  {string}  YYYYMMDD if hospital visit
 *   toothCode      {string}  2-char (dental)
 *   toothSurf1-5   {string}  2-char each (dental)
 *
 * @returns {string} 254-char record
 */
function buildCIB1(opts) {
  const o = opts || {};
  const hdr = buildTxnHeader(
    o.prefix, o.seq, o.sourceCode,
    'CIB1', o.segSeq || 1, o.actionCode || 'A', o.year
  );
  // hdr is exactly 35 chars

  // Segment data (positions 36-254 = 219 chars)
  // Spec positions are 1-indexed; segment starts at pos 36, so seg[0] = record[35]
  let seg = '';
  seg += padR(o.claimType || 'RGLR', 4);          // 36-39  Claim type
  seg += padL0(o.prid || '', 9);                    // 40-48  PRID (9 digits)
  seg += padR(o.skillCode || '', 4);                // 49-52  Skill code
  seg += padL0(o.uli || '', 9);                     // 53-61  Service Recipient ULI
  seg += padR(o.regNum || '', 12);                  // 62-73  Registration Number
  seg += padR(o.hsc || '', 7);                      // 74-80  Health Service Code
  seg += padR(o.serviceDate || '', 8);              // 81-88  Service Start Date
  seg += padR(o.encounter || '1', 1);               // 89     Encounter Number
  seg += padR(o.dx1 || '', 6);                      // 90-95  Diagnosis Code 1
  seg += padR(o.dx2 || '', 6);                      // 96-101 Diagnosis Code 2
  seg += padR(o.dx3 || '', 6);                      // 102-107 Diagnosis Code 3
  seg += padL0(o.calls || 1, 3);                    // 108-110 Calls
  seg += padR(o.feeMod1 || '', 6);                  // 111-116 Fee Modifier 1
  seg += padR(o.feeMod2 || '', 6);                  // 117-122 Fee Modifier 2
  seg += padR(o.feeMod3 || '', 6);                  // 123-128 Fee Modifier 3
  seg += padL0(o.facilityNum || '', 6);             // 129-134 Facility Number
  seg += padR(o.functCentre || '', 4);              // 135-138 Functional Centre
  seg += padR(o.locationCode || '', 4);             // 139-142 Location Code
  seg += padL0(o.origFacility || '', 6);            // 143-148 Originating Facility
  seg += padR(o.origLocation || '', 4);             // 149-152 Originating Location
  seg += padL0(o.businessArrangement || '', 7);     // 153-159 Business Arrangement
  seg += padR(o.payToCode || 'BAPY', 4);            // 160-163 Pay To Code
  seg += padL0(o.payToULI || '', 9);                // 164-172 Pay To ULI
  seg += padL0(o.locumBA || '', 7);                 // 173-179 Locum Arrangement BA
  seg += padR(o.referralId || '', 9);               // 180-188 Referral ID
  seg += padR(o.oopReferral || '', 1);              // 189     OOP Referral Indicator
  seg += padR(o.recoveryCode || '', 4);             // 190-193 Recovery Code
  seg += padR(o.chartNum || '', 14);                // 194-207 Chart Number
  seg += padL0(o.claimedAmount || '', 9);           // 208-216 Claimed Amount
  seg += padR(o.claimedAmtInd || '', 1);            // 217     Claimed Amount Indicator
  seg += padR(o.interceptReason || '', 4);          // 218-221 Intercept Reason
  seg += padR(o.confidential || '', 1);             // 222     Confidential Indicator
  seg += padR(o.goodFaith || '', 1);                // 223     Good Faith Indicator
  seg += padR(o.newbornCode || '', 4);              // 224-227 Newborn Code
  seg += padR(o.emsaf || '', 1);                    // 228     EMSAF Indicator
  seg += padR(o.paperDocs || '', 1);                // 229     Paper Supporting Docs
  seg += padR(o.hospAdmitDate || '', 8);            // 230-237 Hospital Admission Date
  seg += padR(o.toothCode || '', 2);                // 238-239 Tooth Code
  seg += padR(o.toothSurf1 || '', 2);               // 240-241 Tooth Surface 1
  seg += padR(o.toothSurf2 || '', 2);               // 242-243 Tooth Surface 2
  seg += padR(o.toothSurf3 || '', 2);               // 244-245 Tooth Surface 3
  seg += padR(o.toothSurf4 || '', 2);               // 246-247 Tooth Surface 4
  seg += padR(o.toothSurf5 || '', 2);               // 248-249 Tooth Surface 5
  seg += '     ';                                    // 250-254 Unused (5)

  // seg should be exactly 219 chars
  if (seg.length !== 219) throw new Error('CIB1 segment wrong length: ' + seg.length + ' (expected 219)');

  return padRecord(hdr + seg);
}

// ─── CPD1 Segment ─────────────────────────────────────────────────────────────

/**
 * Build a CPD1 (Claim Person Data) transaction record.
 *
 * Required for: Good Faith (RECP), Medical Reciprocal (RECP),
 *               OOP Referral (RFRC), or Other Payee (PYST) where ULI unknown.
 *
 * @param {object} opts
 *   prefix, seq, sourceCode, actionCode, year  — same as CIB1
 *   segSeq         {number}  Segment sequence (2 for first CPD1, etc.)
 *   personType     {string}  'RECP' | 'PYST' | 'RFRC'
 *   surname        {string}  up to 30 chars
 *   middleName     {string}  up to 12 chars
 *   firstName      {string}  up to 12 chars
 *   birthDate      {string}  YYYYMMDD
 *   genderCode     {string}  'M' | 'F'
 *   addrLine1      {string}  up to 25 chars
 *   addrLine2      {string}  up to 25 chars
 *   addrLine3      {string}  up to 25 chars
 *   city           {string}  up to 30 chars
 *   postalCode     {string}  up to 6 chars (no space e.g. 'T5J2Z3')
 *   provinceCode   {string}  2 chars e.g. 'AB'
 *   countryCode    {string}  4 chars e.g. 'CAN '
 *   guardianULI    {string}  9-digit ULI of parent/guardian (newborn)
 *   guardianRegNum {string}  12-char registration number
 *
 * @returns {string} 254-char record
 */
function buildCPD1(opts) {
  const o = opts || {};
  const hdr = buildTxnHeader(
    o.prefix, o.seq, o.sourceCode,
    'CPD1', o.segSeq || 2, o.actionCode || 'A', o.year
  );

  let seg = '';
  seg += padR(o.personType || 'RECP', 4);      // 36-39  Person Type
  seg += padR(o.surname || '', 30);             // 40-69  Surname
  seg += padR(o.middleName || '', 12);          // 70-81  Middle Name
  seg += padR(o.firstName || '', 12);           // 82-93  First Name
  seg += padR(o.birthDate || '', 8);            // 94-101 Birth Date
  seg += padR(o.genderCode || '', 1);           // 102    Gender Code
  seg += padR(o.addrLine1 || '', 25);           // 103-127 Address Line 1
  seg += padR(o.addrLine2 || '', 25);           // 128-152 Address Line 2
  seg += padR(o.addrLine3 || '', 25);           // 153-177 Address Line 3
  seg += padR(o.city || '', 30);                // 178-207 City Name
  seg += padR(o.postalCode || '', 6);           // 208-213 Postal Code
  seg += padR(o.provinceCode || '', 2);         // 214-215 Province/State Code
  seg += padR(o.countryCode || '', 4);          // 216-219 Country Code
  seg += padL0(o.guardianULI || '', 9);         // 220-228 Guardian/Parent ULI
  seg += padR(o.guardianRegNum || '', 12);      // 229-240 Guardian/Parent Reg No
  seg += padR('', 14);                          // 241-254 Unused

  if (seg.length !== 219) throw new Error('CPD1 segment wrong length: ' + seg.length + ' (expected 219)');

  return padRecord(hdr + seg);
}

// ─── CST1 Segment ─────────────────────────────────────────────────────────────

/**
 * Build a CST1 (Claim Supporting Text) transaction record.
 * Each record holds up to 3 text lines of 73 chars each.
 *
 * @param {object} opts
 *   prefix, seq, sourceCode, actionCode, year  — same as CIB1
 *   segSeq    {number}  Segment sequence
 *   line1     {string}  up to 73 chars
 *   line2     {string}  up to 73 chars
 *   line3     {string}  up to 73 chars
 *
 * @returns {string} 254-char record
 */
function buildCST1(opts) {
  const o = opts || {};
  const hdr = buildTxnHeader(
    o.prefix, o.seq, o.sourceCode,
    'CST1', o.segSeq || 2, o.actionCode || 'A', o.year
  );

  let seg = '';
  seg += padR(o.line1 || '', 73);   // 36-108  Text Line 1
  seg += padR(o.line2 || '', 73);   // 109-181 Text Line 2
  seg += padR(o.line3 || '', 73);   // 182-254 Text Line 3

  if (seg.length !== 219) throw new Error('CST1 segment wrong length: ' + seg.length + ' (expected 219)');

  return padRecord(hdr + seg);
}

// ─── Batch Trailer (record type "4") ─────────────────────────────────────────

/**
 * Build batch trailer line.
 *
 * @param {string} prefix         Submitter prefix
 * @param {number|string} batchNum  Batch number
 * @param {number} totalTxns      Count of transaction records (type-3 lines)
 * @param {number} totalSegs      Count of ALL segments across all transactions
 * @returns {string} 254-char record
 */
function buildBatchTrailer(prefix, batchNum, totalTxns, totalSegs) {
  // "4" + Prefix(3) + BatchNum(6) + TotalTxns(5) + TotalSegs(8) + blanks
  const line = '4' + padR(prefix, 3) + padL0(batchNum, 6) + padL0(totalTxns, 5) + padL0(totalSegs, 8);
  return padRecord(line);
}

// ─── Batch assembler ──────────────────────────────────────────────────────────

/**
 * Assemble a complete batch from an array of transaction records.
 *
 * @param {string} prefix
 * @param {number} batchNum
 * @param {string[]} txnRecords  Array of 254-char transaction (type-3) strings
 * @param {object} [opts]
 *   forceTrailerTxnCount  {number}  Override trailer TXN count (for RFSE testing)
 * @returns {string}  Complete batch text (header + transactions + trailer, CRLF-terminated)
 */
function assembleBatch(prefix, batchNum, txnRecords, opts) {
  const o = opts || {};
  const hdr = buildBatchHeader(prefix, batchNum);

  // Count unique transactions = records where segment sequence = '0001'
  // (positions 25-28 in the 1-indexed spec = slice(24,28) in 0-indexed JS)
  // Supporting segments (CST1, CPD1 with segSeq > 1) are segments, not new transactions.
  const totalSegs = txnRecords.length;
  const totalTxns = o.forceTrailerTxnCount !== undefined
    ? o.forceTrailerTxnCount
    : txnRecords.filter(function(r) { return r.slice(24, 28) === '0001'; }).length;

  const trailer = buildBatchTrailer(prefix, batchNum, totalTxns, totalSegs);

  const lines = [hdr, ...txnRecords, trailer];
  return lines.join('\r\n') + '\r\n';
}

// ─── Batch filename convention ────────────────────────────────────────────────

/**
 * Standard filename for an H-Link batch upload.
 * Alberta Health's GoAnywhere SFTP rejects .txt and requires no extension.
 * Standard H-Link batch filename: PrefixBatchNum (e.g. HZV000530)
 *
 * @param {string} prefix
 * @param {number} batchNum
 */
function batchFilename(prefix, batchNum) {
  return prefix + padL0(batchNum, 6) + '.dat';
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  calcCheckDigit,
  buildClaimNumber,
  buildBatchHeader,
  buildTxnHeader,
  buildCIB1,
  buildCPD1,
  buildCST1,
  buildBatchTrailer,
  assembleBatch,
  batchFilename,
  // Utilities exposed for testing
  padR,
  padL0,
  padRecord,
};
