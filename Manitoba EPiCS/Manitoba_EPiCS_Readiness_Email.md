**To:** Ni.DeP@gov.mb.ca
**From:** Austin Ekeoba, MD — Sky Claims
**Subject:** Sky Claims — eClaims Portal API Vendor Onboarding Request (UAT)

---

Dear Ni,

Thank you for sending over the Manitoba EPiCS specifications and guides. We have completed our technical review of the eClaims Portal API Specifications, the Medical Claims File Exchange Guide, and the ECPIM, and we are ready to begin UAT integration.

**About Sky Claims**

Sky Claims is a SaaS medical billing platform that manages electronic claims submission and remittance reconciliation on behalf of fee-for-service physicians across multiple provinces. We have completed conformance with Ontario MCEDT and Alberta AHCIP H-Link, and Manitoba is our next province expansion.

**Our Technical Readiness**

We have completed development of:

- The 80-character fixed-width claim file builder (Records 1–9), including MOD-11 claim number check digit generation and all-caps normalization
- OAuth2 client_credentials authentication against the Auth0 endpoint
- Per-UserSite API key management for batch submission via the `/vendor/upload` endpoint
- P1 validation report parsing (base64 PDF extraction from response)
- Remittance file download and parser for Return Records 0, 2, 3, 5, 6, and 9, including EBCDIC-style Fee Assessed sign decoding and EOB code handling
- P2 payment statement download
- Real-time query submission (`/vendor/query/submit`) and status polling (`/vendor/query/status`)
- Claim number state persistence across submission cycles

**UAT Onboarding Request**

We would like to proceed with UAT API access. Please find below the information requested in Appendix A of the onboarding deck:

**Vendor Information:**

| Field | Value |
|-------|-------|
| Vendor Name | Sky Claims Inc. |
| Contact Name | Austin Ekeoba, MD |
| Contact Email | Dr.ekeoba@gmail.com |

**Test UserSite Details:**

| UserSite Name | UserSite ID | Email for API Key | First Name | Last Name |
|---------------|-------------|-------------------|------------|-----------|
| SKY CLAIMS UAT | *(to be assigned by MH)* | Dr.ekeoba@gmail.com | Austin | Ekeoba |

We understand that the UserSite ID and practitioner number will be assigned once the Electronic User Site Number application is processed. We are prepared to submit that application in parallel with the API onboarding form if that is the preferred sequence.

**Next Steps**

Please let us know:
1. Whether we should submit the full Electronic User Site Number application (Request for Electronic User Number, Letter of Agreement, EFT, and portal access forms) to practitionerregistry@gov.mb.ca concurrently, or whether UAT API credentials can be issued first for integration testing with test patient demographics.
2. The preferred email for the completed E-Claims Vendor Access Set Up Form UAT — we will send it immediately upon your confirmation.

We are aware of the UAT run schedule and are ready to submit test files within any open cycle window. Our technical team can also engage directly with Ramakrishna Ananthula (ramakrishna.ananthula@mb.bluecross.ca) for any API-level troubleshooting.

Thank you for your assistance. We look forward to working with Manitoba Health.

Regards,

Austin Ekeoba, MD
Sky Claims
Dr.ekeoba@gmail.com
