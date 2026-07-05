# MSP BC Teleplan — Vendor Conformance Handoff

**Owner product:** Sky Claims (billing / adjudication / EDI platform)
**Not the EHR.** Sky Chamber EHR hands a finalized claim to Sky Claims over the typed `sky-claims.ts` seam; Sky Claims is the registered Teleplan vendor that serializes records, transmits to HIBC, and reconciles the returned records. Certification belongs to whoever submits to MSP — that's Sky Claims.

**Purpose of this doc:** carry the context into the Sky Claims project so we can start building immediately. Drop this file + the MSP API kit into the Sky Claims repo, then re-open the task there.

---

## 1. What conformance actually requires

Health Insurance BC (HIBC) will not enable production submission until Sky Claims demonstrates it can, for each claim type: **build the record → transmit → pick up and correctly parse the returned records (including refusals).** Vendors must provide the Teleplan Support Centre with proof that the software submitted claims and retrieved responses before approval.

So this is **two engines plus a harness**, not one:

1. **Record builder / serializer** — emits valid Teleplan records (text files, no extension; first row is a header carrying software/vendor info; one claim per row).
2. **Response / remittance parser** — ingests returned records and interprets them, especially refusal records (e.g. **C12**) and remittance/payment records.
3. **Conformance harness** — generates the required test transactions, drives submit + retrieve, and captures proof (request payloads, transmission acks, returned records) for the HIBC submission package.

---

## 2. Conformance test matrix

Target: **3 of each** unless the kit says otherwise. Treat this as the certification checklist.

| # | Test category | What it is | Key data / notes |
|---|---------------|-----------|------------------|
| 1 | Regular MSP claims | Standard BC-resident fee-for-service | Valid BC PHN, payee, provider MSP#, dx + fee item |
| 2 | Reciprocal claims | Out-of-province Canadian patients (reciprocal agreement) | **Québec is excluded** from reciprocal; needs province + out-of-province ID |
| 3 | ICBC claims | Motor-vehicle / auto | **See §4 — 2026 change.** Confirm physician vs non-physician |
| 4 | WorkSafeBC (WSBC) claims | Workers' compensation | Separate payer routing; claim/injury identifiers |
| 5 | Encounter record claims | Alternative-payment / salaried reporting (no FFS payment) | Service reported, not paid FFS |
| 6 | Opted-out / supplementary-benefit | Chiro, physio, massage, naturopath, podiatry, etc. | Supplementary-benefits billing path |
| 7 | Institutional claims | Facility / institutional billing | Confirm exact record layout in kit |
| 8 | Correctional (incarcerated) | Patients in correctional facilities | Confirm coverage routing (provincial vs federal) |
| 9 | Debit request claims | Reversal / adjustment of a previously paid claim | References the original claim |
| 10 | Claims with note records | Claim accompanied by a text/note record | Often paired w/ late-submission reason codes |
| 11 | E45 requests | Eligibility-related request transaction | Confirm exact semantics vs B04 in kit |
| 12 | B04 requests | Eligibility request — MSP establishes an authorized period (≈1–7 days) | Claim must follow within the authorized window |
| 13 | "Clean" real-data claims | Real/valid data that clears pre-edit **without** a C12 refusal | Proves data validation correctness |

---

## 3. Key returned-record behaviour to handle

- **C12 — refusal record.** Returned when a claim is refused on format / edit / eligibility conditions (data-centre #, payee ID, provider MSP#, diagnosis, service code, patient PHN, etc.). Production **pre-edit** refusals carry `YY` in the first field; **edit & eligibility** errors surface in one of three fields. The parser must surface these to the user with actionable messaging — and item #13 above proves we can *avoid* them with valid data.
- **Remittance / payment records** — must reconcile back to the originating claim (status, paid amount).
- **Eligibility responses** (to B04 / E45) — must be stored and honoured (e.g. the authorized-period window).

---

## 4. Current caveats to verify against the kit

- **ICBC, effective 2025-11-27:** ICBC no longer processes **physician** MVA services — those flow as **standard MSP claims**. Non-physician practitioners (physio, chiro, etc.) may still bill ICBC. → Our "3 ICBC" test cases may need to be non-physician, or the kit's revision may have changed the requirement. **Check the kit's revision date and the ICBC section.**
- **Reciprocal:** Québec is not a reciprocal participant — don't use a QC patient for those test cases.
- **Teleplan version:** confirm whether the kit targets the v4.x web record specs or a newer API. Field layouts are version-specific and unforgiving.

---

## 5. Architecture sketch (Sky Claims)

```
EHR / other source
      │  finalized claim (typed)
      ▼
┌──────────────────────────────────────────────┐
│ Sky Claims — Teleplan module                   │
│                                                │
│  claim model ──► record builder/serializer ──► transmission client ──► HIBC/Teleplan
│       ▲                                              │
│       │                                              ▼ returned records
│  test fixtures ◄── conformance harness        response/remittance parser
│                          │                           │
│                          └──── proof capture ◄───────┘
│                               (logs, acks, records)
└──────────────────────────────────────────────┘
```

**Components**

1. **Claim domain model** — one normalized claim type that can express all 13 categories (payer = MSP / reciprocal / ICBC / WSBC; record kind = claim / encounter / debit / eligibility; attachments = note records).
2. **Record builder / serializer** — pure functions: `claim → Teleplan record line(s)` + the file header. Field positions/lengths come straight from the kit spec. Keep this a thin, exhaustively unit-tested layer.
3. **Transmission client** — wraps the transport the kit defines (Teleplan Web service / SFTP / API). Handles auth + the data-centre/vendor/payee identifiers, submit, and retrieve.
4. **Response/remittance parser** — `returned record → typed result`; first-class handling of C12 refusals, remittance, and eligibility responses.
5. **Conformance harness** — generates the matrix in §2, runs submit→retrieve end-to-end against the **test environment**, and writes a proof bundle for HIBC.
6. **Proof capture** — persists request payloads, transmission acknowledgements, and returned records per test case (this *is* the certification deliverable).

---

## 6. What I need from the API kit to build precisely

1. **Record-format spec** — field positions, lengths, and data-element codes for each record type (claim, encounter, debit, note, eligibility B04/E45, and the returned C12/remittance records).
2. **Transport details** — the test endpoint (Teleplan Web / SFTP host / API base URL), auth mechanism, and the **data-centre #, vendor #/software ID, and payee/provider identifiers** to put in the header.
3. **Test environment access** — credentials for the conformance/test environment (distinct from production).
4. **Test PHNs / fixtures** — any HIBC-issued test patient PHNs and the expected results, if the kit provides them.
5. **Submission package format** — what HIBC wants as proof of successful submit + retrieve.

---

## 7. Suggested build sequence

1. Load kit → encode the record-format spec as typed field definitions; write the serializer + exhaustive unit tests against the kit's sample records.
2. Build the transmission client against the **test** transport; get a single regular MSP claim to submit and retrieve.
3. Build the response parser; get C12 refusals and remittance records parsing cleanly.
4. Expand the serializer to cover all 13 categories; add the conformance harness to generate ×3 each.
5. Run the full matrix end-to-end in test; assemble the proof bundle for HIBC.
6. Submit for vendor approval; only then wire production transport.

---

## 8. Open questions (confirm in Sky Claims tab)

- Where does the Sky Claims codebase live, and what stack is it on?
- Does the kit target Teleplan v4.x records or a newer programmatic API?
- Transport: Web service, SFTP, or API?
- Is there a HIBC-provided test PHN set + expected outcomes?
- ICBC: post-2025-11-27, what does the kit require for the "3 ICBC" cases?

---

*Prepared as a portable handoff. Move into the Sky Claims repo with the API kit, then re-open this task in the Sky Claims project tab.*
