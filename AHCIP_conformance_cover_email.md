# AHCIP H-Link Conformance — Round 3 Cover Email

**To:** AHCIP Conformance Coordinator
**From:** Dr. Ekeoba — Sky Claims / Sky Health Tech Inc.
**Subject:** H-Link Conformance Submission — Round 3 Complete (prefix HZV, 12/15 tests passed; 3 pending ARD)
**Attachments:** AHCIP H-Link Conformance Checklist - Round 3 Complete.xlsx

---

Hello,

Please find attached the updated H-Link conformance checklist for prefix **HZV** (Sky Health Tech Inc.), covering our Round 3 submissions.

**Summary of results:**

12 of 15 required tests have been fully verified through OUTBB and ARD assessment results. The remaining 3 (Tests 7A/7B/7C — Change, Reassess, Delete) have cleared batch validation (OUTBB ACCEPTED) and are awaiting their ARD.

| Test | Description | Batch | Status |
|------|-------------|-------|--------|
| 1A | ACPT batch result | HZV000530 | ✅ Passed |
| 1B | PARTIAL batch result | HZV000552 | ✅ Passed |
| 1C | RFSE batch result | HZV000532 | ✅ Passed |
| 2 | Retrieve batch results | G0015–G0053 | ✅ Passed |
| 3 | Resubmit PART with new batch | HZV000553 | ✅ Passed |
| 4 | Resubmit RFSE same batch | HZV000532 | ✅ Passed |
| 5 | Retrieve ARD / reconcile | G0008–G0012 | ✅ Passed |
| 6 | Refused claim — new claim# | HZV000551 | ✅ Passed |
| 7A | Change (C) transaction | HZV000558 | ⏳ OUTBB ACCEPTED — ARD pending |
| 7B | Reassess (R) transaction | HZV000559 | ⏳ OUTBB ACCEPTED — ARD pending |
| 7C | Delete (D) transaction | HZV000560 | ⏳ OUTBB ACCEPTED — ARD pending |
| 8 | CST1/EMSAF accompanying text | HZV000554 | ✅ Passed (N63 HELD + SUBM) |
| 9A | Medical Reciprocal person data | HZV000555 | ✅ Passed (N28 referred) |
| 9B | OOP Referral person data | HZV000556 | ✅ Passed (N28 forwarded) |
| 10 | Locum billing | HZV000557 | ✅ Passed (Applied — $37.09 paid) |

**A few notes for your review:**

- **Test 1B** was previously submitted against batch HZV000531, which returned ACCEPTED (not PARTIAL). We have corrected this in the checklist to batch HZV000552, which produced the required PARTIAL result (claim 802 accepted, claim 810 refused with batch edit error 39). The checklist includes a note explaining the correction.

- **Tests 7A/7B/7C** (Change/Reassess/Delete): Round 2 ARD results showed refusal code N35FB 47 — HSC 03.01A had an end date of 2007-01-31. All three were resubmitted in Round 3 with the current SOMB 2026 GP code **03.03A** (Limited Assessment). All three batches cleared OUTBB as ACCEPTED. We are awaiting the next ARD cycle to confirm payment disposition.

- **Test 10 (Locum)**: The Round 2 submission had an incorrect Billing Arrangement (BA) in field 173-179. Per AHCIP feedback, that field must carry the **submitter's FFS BA for the HZV prefix** (2449310), not the host practitioner's BA. The corrected Round 3 submission (batch 557) resulted in a paid assessment: ResultCode A, $37.09 (DIRD/BASE). Confirmed working.

- **Test 8 (CST1/EMSAF)**: Claim 901 assessed N63 HELD with SUBM flag in ARD G0012 — the claim is correctly held pending EMSAF document submission, confirming the CST1 text segment was accepted.

We will follow up with the ARD results for Tests 7A/7B/7C as soon as they post. Please let us know if any further information or re-submission is required.

Thank you for your continued support through the conformance process.

Best regards,

**Dr. Ekeoba**
Sky Health Tech Inc.
Dr.ekeoba@gmail.com
