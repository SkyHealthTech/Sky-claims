# Manitoba EPiCS — Technical Deep-Dive Brief
**Sky Claims | Internal Reference | September 2026**
**Contact: Ni DeP (Ni.DeP@gov.mb.ca) — Shared Health / Manitoba Blue Cross**

---

## 1. Overview

Manitoba Health (MH) eClaims Portal (EPiCS) replaces manual file upload via FTP/USB with a REST API + portal interface for:

- **Batch claim submission** (fixed-width flat files → POST to API)
- **Remittance download** (return files listing processed/pending claims)
- **P2 payment statement download**
- **Real-time queries** (status, WCB, incorrect billing, SCI with file attachment)

The file format itself (80-character fixed-width records) is unchanged from the legacy Medical Claims File Exchange Guide. EPiCS adds the REST wrapper around it.

---

## 2. Accreditation Process

### 2.1 Steps to Go Live
1. **Apply for Electronic User Site Number** — forms to practitionerregistry@gov.mb.ca (fax 204-942-2356)
   - Request for Electronic User Number form
   - Letter of Agreement (per practitioner)
   - EFT Application Form (per fee-for-service practitioner + voided cheque)
   - E-Claims Portal User Set Up Form
   - E-Claims Confidentiality and Security Agreement
   - MHEISA Confidentiality & Security Agreement and Pledge of Confidentiality
2. **Receive User Site Number** — assigned by MH Practitioner Registry
3. **Submit test file** — minimum 15 claims, cross-section of services, written diagnosis in remarks for ALL test claims
4. **Await MH review** — results within 10 business days; must pass to proceed
5. **User site activated** — 2–3 business days after passing

### 2.2 Test File Requirements (from ECPIM)
- At minimum: office visits, consultations, hospital visits, one confidential claim, one reciprocal (non-resident) claim, one claim with multiple remarks lines
- Written diagnosis text MUST appear in the remarks record for every claim during testing (e.g., `"Abdominal Pain, Generalized"` with ICD-9-CM `78907`)
- File must be ALL CAPITAL LETTERS
- One file per test submission
- Test data may be fictitious

### 2.3 UAT API Onboarding (EPiCS Vendor Path)
Fill out **E-Claims Vendor Access Set Up Form UAT** and send to practitionerregistry@gov.mb.ca:
- Vendor Name, address, contact
- UserSite Name, UserSite ID, UserSite Email (API key delivered here)

Technical contact for API issues: **ramakrishna.ananthula@mb.bluecross.ca**

---

## 3. File Format — Submission (80-char fixed-width, all caps, .txt)

### 3.1 File Naming
```
usersiteno_YYYYMMDDHHMMSS.txt
```
Max size: 100 MB

### 3.2 Record Sequence (Submission)
```
[1] File Exchange Header      — 1 per file
  [2] Batch Header            — 1 per practitioner batch
    [3] Sociological Record   — 1 per patient session (demographics + PHIN)
    [4] Registrant Address    — 1 per patient session (address + PHIN)
    [5] Remarks               — 0–66 per session (free text, sequence 01–66)
    [6] Service Record        — 1–30 per session (the actual tariff lines)
    [7] Non-Resident Record   — 1 per session if patient is non-MB resident
  [8] Batch Trailer           — 1 per batch (counts + total fees)
[9] File Exchange Trailer     — 1 per file (grand totals)
```

### 3.3 Key Submission Fields

**Record 1 — File Exchange Header**
| Pos | Len | Field | Notes |
|-----|-----|-------|-------|
| 1 | 1 | Record Code | `1` |
| 2–6 | 5 | User Site Number | Assigned by MH (00001–00999) |
| 7–46 | 40 | User Site Name | Clinic/practitioner name |
| 72–80 | 9 | First Claim Number | MOD-11 check digit (see §3.5) |

**Record 2 — Batch Header**
| Pos | Len | Field | Notes |
|-----|-----|-------|-------|
| 2–6 | 5 | Practitioner Number | Assigned by MH Practitioner Registry |
| 7–46 | 40 | Practitioner Name | |

**Record 3 — Sociological (Demographics)**
| Pos | Len | Field | Format/Notes |
|-----|-----|-------|--------------|
| 2–6 | 5 | Practitioner Number | |
| 7–12 | 6 | MH Registration Number | 000001–999999 or blank (non-resident) |
| 13–32 | 20 | Surname | First char alpha; may include `-` `'` |
| 33–47 | 15 | Given Name | Alpha or blank |
| 48–51 | 4 | Birth Date | `YYMM` |
| 52 | 1 | Gender | `M`, `F`, or `X` |
| 53–59 | 7 | Medical Records Number | Provider's internal ID |
| 60–65 | 6 | Total Amount Billed to Patient | `9999V99`; blank if opted-in |
| 66 | 1 | Pre-Auth Indicator | `P` if prior approval |
| 67 | 1 | On-Call Indicator | `C` if on call |
| 68 | 1 | WCB Indicator | `W` if originally submitted to WCB |
| 72–80 | 9 | Claim Number | MOD-11; same for all records in session |

**Record 4 — Registrant Address**
| Pos | Len | Field | Notes |
|-----|-----|-------|-------|
| 7–12 | 6 | MH Registration Number | |
| 13–32 | 20 | Address Line 1 | Box before street; abbreviate street types |
| 33–52 | 20 | Address Line 2 | Province abbreviation; must be present if postal blank |
| 53–58 | 6 | Postal Code | `ANANAN` format |
| 59–67 | 9 | PHIN | 9-digit Personal Health Info Number; mandatory for MB residents |

**Record 5 — Remarks**
| Pos | Len | Field | Notes |
|-----|-----|-------|-------|
| 7–69 | 63 | Remarks | Free text |
| 70–71 | 2 | Sequence Number | `01`–`66` |

**Record 6 — Service (the billing line)**
| Pos | Len | Field | Notes |
|-----|-----|-------|-------|
| 2 | 1 | Incorporated Indicator | `0`=regular, `1`=incorporated |
| 3–6 | 4 | Practitioner Number | |
| 7–11 | 5 | Referring Practitioner | `00000` if none; required for consults, surgeries, labs |
| 12–16 | 5 | Facility Number | `00000` or `06000–06099` (radiology) or `06100–06199` (lab) |
| 17–19 | 3 | Hospital Code | `000` if not in hospital |
| 20–25 | 6 | Service Date | `YYMMDD` |
| 26 | 1 | Prefix | 0=surgical asst, 1=post-op, 2=surgery, 3=maternity, 4=anesthesia, 5=radiology, 6=2nd anesthetist, 7=calls/tests, 8=pathology, 9=undefined |
| 27–30 | 4 | Tariff | 4-digit tariff code per MB Practitioner's Manual |
| 31–32 | 2 | Services | `01`–`99` |
| 33–34 | 2 | Anesthesia Units | `00` if not anesthesia; 1 unit = 15 min |
| 35–40 | 6 | Fee Submitted | `9999V99` (no decimal in file) |
| 41 | 1 | Confidential Code | `C` to exclude from patient statement |
| 42–46 | 5 | ICD-9-CM | Left-justified, no decimal; required for physicians/NPs/oral surgery |
| 47–48 | 2 | Optometric Reason Code | `00` if not optometric |
| 49–51 | 3 | Chiropractic Service Code | Blank if not chiropractic |
| 52 | 1 | Service Location Indicator | `C`=clinic, `E`=ED, `O`=outpatient; blank if office |
| 53 | 1 | 3rd Party Liability | `T` or `W` if applicable |
| 54 | 1 | Special Circumstance Indicator | A/C/D/E/G/H/K/L/N/P/S/T/U/V/W/X or 1–7 |
| 55–59 | 5 | Interpreting Radiologist | Blank if not radiology |
| 60 | 1 | Location of Service | `W`=Winnipeg, `B`=Brandon, `N`=Northern, `R`=Rural, `C`=Remote; virtual: S/M/H/P/T/U/D/V/X/F/Y/Z/G/A/Q |
| 61–62 | 2 | Number of Patients | For group psychotherapy/case mgmt |
| 63–66 | 4 | Start Time | `HHMM` 24-hr |
| 67–70 | 4 | Stop Time | `HHMM` 24-hr |
| 71 | 1 | Bilateral/Incision Indicator | `B`=bilateral, `S`=same incision, `D`=different |

**Record 7 — Non-Resident**
| Pos | Len | Field | Notes |
|-----|-----|-------|-------|
| 7–18 | 12 | Health ID Number | Home province health number, left-justified |
| 19–20 | 2 | Province Code | AB/BC/NB/NL/NT/NS/NU/ON/PE/QC/SK/YT |
| 27–34 | 8 | Patient Birth Date | `CCYYMMDD` |

**Record 8 — Batch Trailer**
| Pos | Len | Field | Notes |
|-----|-----|-------|-------|
| 7–16 | 10 | # Sociological Records | Must match actual count |
| 17–26 | 10 | # Address Records | |
| 27–36 | 10 | # Remarks Records | |
| 37–46 | 10 | # Service Records | |
| 47–56 | 10 | Total Fee Submitted | `9(8)V99`; no decimal |
| 57–66 | 10 | # Non-Resident Records | |

**Record 9 — File Exchange Trailer**
| Pos | Len | Field |
|-----|-----|-------|
| 2–6 | 5 | User Site Number |
| 7–16 | 10 | # Sociological Records (file total) |
| 17–26 | 10 | # Address Records |
| 27–36 | 10 | # Remarks Records |
| 37–46 | 10 | # Service Records |
| 47–56 | 10 | Total Fee Submitted |
| 57–66 | 10 | # Non-Resident Records |
| 72–80 | 9 | Last Claim Number |

### 3.4 Claim Number Allocation
- Range: `000000013` to `999999987`
- Claim numbers are per **patient session** (shared across all records 3–7 for that session)
- Sequential across files; save the last claim number after each submission
- After `999999987`, wrap back to `000000013`

### 3.5 Claim Number Check Digit (MOD-11)
Positions 72–79 multiplied by prime numbers `[29, 23, 19, 17, 13, 7, 5, 3]`, summed, divided by 11. Remainder = check digit in position 80. If remainder = 10, increment positions 72–79 by 1 and recalculate.

```
Example: 11231114? → 1×29 + 1×23 + 2×19 + 3×17 + 1×13 + 1×7 + 1×5 + 4×3 = 178
178 / 11 = 16 remainder 2 → claim number is 112311142
```

---

## 4. File Format — Return (Remittance)

### 4.1 Return File Naming
```
usersiteno_REMYYYYMMDDHHMMSS.txt
```

### 4.2 Return Record Types
| Code | Name | Content |
|------|------|---------|
| 0 | File Exchange Header | User site, creation date (Julian YYDDD) |
| 2 | Processed Sociological | Patient demographics for processed claims |
| 3 | Processed Service | Fee assessed, EOB codes, PHIN, interest |
| 5 | Pending Sociological | Patient demographics for pending claims |
| 6 | Pending Service | Service details; EOB `77` = pending |
| 9 | File Exchange Trailer | Total fee assessed, record counts |

### 4.3 Key Return Fields (Record 3 — Processed Service)
| Pos | Field | Notes |
|-----|-------|-------|
| 35–40 | Fee Submitted | |
| 41–46 | Fee Assessed | Signed numeric (`S9999V99`); uses EBCDIC overpunch for sign |
| 66–71 | EOB Codes | Three 2-char codes; blank = no adjustment |

**Fee Assessed Sign Encoding** (position 46 units digit):
- Positive: 0=`{`, 1=`A`, 2=`B`, …, 9=`I`
- Negative (drawback): 0=`}`, 1=`J`, 2=`K`, …, 9=`R`

---

## 5. REST API Reference

### 5.1 Endpoints

| API | Method | UAT URL | PROD URL |
|-----|--------|---------|----------|
| Authentication | POST | `https://eclaims-mh-uat.manitobabluecross.auth0.com/oauth/token` | `https://eclaims-mh-prod.manitobabluecross.auth0.com/oauth/token` |
| Batch Submit | POST | `https://api.eclaims.uat.ecserv.ca/eclaim/vendor/upload` | `https://api.eclaims.ecserv.ca/eclaim/vendor/upload` |
| Remittance List | GET | `https://api.eclaims.uat.ecserv.ca/eclaim/vendor/remittance` | `https://api.eclaims.ecserv.ca/eclaim/vendor/remittance` |
| Remittance Download | GET | `https://api.eclaims.uat.ecserv.ca/eclaim/vendor/remittance/download` | `https://api.eclaims.ecserv.ca/eclaim/vendor/remittance/download` |
| P2 List | GET | `https://api.eclaims.uat.ecserv.ca/eclaim/vendor/p2-reports` | `https://api.eclaims.ecserv.ca/eclaim/vendor/p2-reports` |
| P2 Download | GET | `https://api.eclaims.uat.ecserv.ca/eclaim/vendor/p2-reports/download` | `https://api.eclaims.ecserv.ca/eclaim/vendor/p2-reports/download` |
| Submit Query | POST | `https://api.eclaims.uat.ecserv.ca/eclaim/vendor/query/submit` | `https://api.eclaims.ecserv.ca/eclaim/vendor/query/submit` |
| Query Status | POST | `https://api.eclaims.uat.ecserv.ca/eclaim/vendor/query/status` | `https://api.eclaims.ecserv.ca/eclaim/vendor/query/status` |

Portal:
- UAT: `https://portal.eclaims.uat.ecserv.ca/login`
- PROD: `https://portal.eclaims.ecserv.ca/login`

### 5.2 Authentication Flow
```
POST https://eclaims-mh-uat.manitobabluecross.auth0.com/oauth/token
Content-Type: application/json

{
  "client_id": "<from onboarding>",
  "client_secret": "<from onboarding>",
  "audience": "https://portal.eclaims.uat.ecserv.ca/vendor-api",
  "grant_type": "client_credentials"
}

→ { "access_token": "...", "expires_in": <seconds>, "token_type": "Bearer" }
```
Token must be included as `Authorization: Bearer <token>` on all subsequent calls.

**Per-UserSite API key** is also required on each call as the `usersite_key` parameter. This is issued separately per UserSite during onboarding.

### 5.3 Batch Submission
```
POST /eclaim/vendor/upload
Headers:
  Authorization: Bearer <token>
  Content-Type: multipart/form-data

Form params:
  usersite_key: <usersite API key>
  file: <file content as multipart byte array>

File name: usersiteno_YYYYMMDDHHMMSS
Extension: .txt
Max size: 100 MB

Response 200 (success): { status: 200, message: "Success",
  response: { fileName: "P1-accepted-...", report: <base64 PDF> } }
Response 400 (validation fail): { status: 400, ..., fileName: "P1-Error-...", report: <base64 PDF> }
```
The P1 report (PDF) is returned inline in the response as base64.

### 5.4 Remittance List & Download
```
GET /eclaim/vendor/remittance
Params: user_site_id=<site>, usersite_key=<key>

Response: { response: { reports: ["USRSTE001_REM20230316171241.txt", ...] } }

GET /eclaim/vendor/remittance/download
Params: filename=<from list>, usersite_key=<key>

Response: { response: <base64 file content> }
```

### 5.5 Real-Time Queries
7 query types:

| Code | Name | Services Required |
|------|------|-------------------|
| IP | Incorrect Patient | All services |
| WQ | WCB Query | All services |
| IB | Incorrect Billing ID | All services |
| PR | Provided Requested Billing Error Drawback | All services |
| OT | Other query adjustment | Selected services |
| FA | MB Finance Audit | Selected services |
| SCI | Supplementary Claim Information | Selected + file attachment (mandatory) |

SCI report types: Operative/Procedure Report, Pathology Report, Consultation Notes, Chart Notes, Other.

Key fields for query submission:
- `microFilmNumber` (9-char, from remittance) — mandatory
- `phinId` (PHIN or non-res health ID) — mandatory
- `billingId` (practitioner number) — mandatory
- `userSite`, `queryType` — mandatory
- `list[]` — array of service lines (serviceCode, serviceDate, paymentDate, billAmount, paymentAmount)

---

## 6. Return File Processing (EOB Codes)

EOB codes are 2-character alphanumeric codes (up to 3 per service line) that explain adjustments, refusals, or informational updates. Action types:
- **R** — Resubmit with correction
- **I** — Information only; update records
- **Q** — Submit formal query with supportive information
- **R/Q** — Either resubmit (if error) or query (if data was correct)

Key EOB codes to handle programmatically:

| Code | Meaning | Action |
|------|---------|--------|
| `77` | Pending — will appear on future remittance | I |
| `DR` | Drawback — previously paid service withdrawn | I |
| `CR` | Credit adjustment | I |
| `M7` | Benefit code doesn't exist, not effective, or not valid under provider specialty | R |
| `C2` | Submitted more than 6 months after service date | I (cannot resubmit) |
| `F1` | Patient coverage not effective on service date | R |
| `F3` | Patient not identifiable as MB resident | I |
| `A1` | Billing provider not found or blank | R |
| `44` | Patient demographics don't match PHIN on file | R |
| `41` | Full claim rejection — see other EOBs on same claim | R |
| `96` | Interest applied | I |

---

## 7. Key Integration Points for Sky Claims

### 7.1 What we need to build
1. **File builder** — 80-char fixed-width records (Records 1–9), MOD-11 claim numbers, all-caps
2. **API client** — Auth0 OAuth2 client_credentials flow + per-UserSite API key
3. **Submission** — multipart POST, parse P1 PDF response (base64 decode)
4. **Remittance parser** — list + download + parse return records (0/2/3/5/6/9), decode EBCDIC-style Fee Assessed, extract EOBs
5. **P2 parser** — list + download P2 payment statements
6. **Query submission** — POST query with microfilm number + services list
7. **Claim number state** — persist last claim number per UserSite across submissions

### 7.2 Architectural notes
- One **UserSite** per practitioner site; one API key per UserSite
- Multiple UserSites can share one vendor `client_id`/`client_secret` (different API keys)
- Token expiry must be respected; refresh before each batch or check `expires_in`
- Remittance files appear twice monthly (per production schedule); P2 also twice monthly
- All file content is all-caps; build normalizer in file writer

### 7.3 EOB handling strategy
- Parse all three EOB slots from Record 3, positions 66–71 (`XX XX XX`)
- If any slot = `77`: mark claim as pending, poll next remittance
- If any slot = `DR`: mark as drawn back, flag for review
- If action type = `R`: queue for resubmission with correction
- If action type = `I`: update patient/service record silently
- If `41` present: entire session rejected; inspect all other EOBs before resubmitting

---

## 8. UAT Environment

- **Portal**: https://portal.eclaims.uat.ecserv.ca/login
- **Auth0 audience** (UAT): `https://portal.eclaims.uat.ecserv.ca/vendor-api`
- UAT cycles run weekly (see UAT schedule in onboarding deck); remittance available ~2 business days after submission cutoff
- Credentials delivered to email registered in onboarding form

---

## 9. Contacts

| Role | Contact |
|------|---------|
| Vendor onboarding / User Site | practitionerregistry@gov.mb.ca |
| API technical issues | ramakrishna.ananthula@mb.bluecross.ca |
| Claims questions (tariffs, rejects) | 204-786-7355 |
| General enquiries | 204-788-2567 |
| EPiCS contact (our primary) | Ni.DeP@gov.mb.ca |
