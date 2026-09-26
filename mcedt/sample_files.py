"""
Generate sample Ontario OHIP claim files for MCEDT conformance testing.

OHIP batch claim format (79 bytes per record, fixed-width, LF terminated):
  All records use Transaction Identifier 'HE' (Health Encounter) at positions 1-2.
  Position 3 is the Record Identification:
    B  = HEB Batch Header   (first record of each batch)
    H  = HEH Claim Header-1 (one per patient encounter)
    R  = HER Claim Header-2 (reciprocal claims only — not used here)
    T  = HET Item Record    (service item)
    E  = HEE Batch Trailer  (last record — end)

  HEB layout (79 bytes):
    1-2:  'HE'           Transaction Identifier
    3:    'B'            Record Identification
    4-6:  'V03'          Tech Spec Release Identifier
    7:    ' '            MOH Office Code
    8-19: YYYYMMDD####   Batch Identification (date + 4-digit seq)
    20-25: 000000        Operator Number (zero-fill)
    26-29: '0000'        Group Number (zeros = solo provider)
    30-35: billing#      HCP Practitioner Number (6 chars)
    36-37: '00'          Specialty Code
    38-79: spaces        Reserved (42 chars)

  HEH layout (79 bytes):
    1-2:   'HE'          Transaction Identifier
    3:     'H'           Record Identification
    4-13:  health#       Health Number (10 digits, Mod-10 valid)
    14-15: version       Version Code (1-2 alpha)
    16-23: birthdate     Patient Birthdate (YYYYMMDD)
    24-31: spaces        Accounting Number (optional)
    32-34: 'HCP'         Payment Program
    35:    'P'           Payee (P=Provider)
    36-41: spaces        Referring HCP Number (conditional)
    42-45: spaces        Master Number (conditional)
    46-53: spaces        In-Patient Admission Date (conditional)
    54-57: spaces        Referring Lab Licence Number (conditional)
    58:    ' '           Manual Review Indicator
    59-62: spaces        Service Location Indicator (conditional)
    63-73: spaces        Reserved for OOC (11 chars)
    74-79: spaces        Reserved for MOH (6 chars)

  HET layout (79 bytes):
    1-2:   'HE'          Transaction Identifier
    3:     'T'           Record Identification
    4-8:   fee_code      Service Code (format ANNNA, 5 chars)
    9-10:  spaces        Reserved (2 chars)
    11-16: amount        Fee Submitted ($$$$cc, 6 digits)
    17-18: '01'          Number of Services
    19-26: svc_date      Service Date (YYYYMMDD)
    27-30: spaces        Diagnostic Code (conditional, 4 chars)
    31-40: spaces        Reserved for OOC (10 chars)
    41:    ' '           Reserved for MOH (1 char)
    42-79: spaces        Item 2 (optional — all spaces = single service)

  HEE layout (79 bytes):
    1-2:   'HE'          Transaction Identifier
    3:     'E'           Record Identification (End)
    4-7:   H count       Total HEH records (4 digits, leading zeros)
    8-11:  R count       Total HER records (4 digits, leading zeros, = 0000)
    12-16: T count       Total HET records (5 digits, leading zeros)
    17-79: spaces        Reserved (63 chars)

OBEC format (79 bytes per record — different format, 'OH'/'OI'/'OT' headers):
  OH: batch header — pos 3-5 is transaction code (spaces = valid; 'OBE' = EOBEC0003)
  OI: service item
  OT: trailer

Billing/CSN used: 616900 (the conformance MOH ID / CSN)
"""

import datetime


def make_claims_file(
    billing_number: str = "616900",
    health_number:  str = "1234567897",   # Luhn/Mod-10 valid
    version_code:   str = "AB",
    service_date:   str = "20260917",
    fee_code:       str = "A001A",         # format: ANNNA (5 chars)
    amount_cents:   int = 3000,            # $30.00
    num_claims:     int = 1,
    patient_dob:    str = "19800101",      # patient date of birth YYYYMMDD
    specialty:      str = "00",            # 00 = General Practice
) -> bytes:
    """
    Generate a valid Ontario OHIP HE-format claim batch file.
    Returns bytes — 79-byte records, LF terminated.
    """
    lines = []
    bn6   = billing_number[:6].ljust(6)
    today = datetime.date.today().strftime("%Y%m%d")

    # ── HEB — Batch Header ───────────────────────────────────────────────────
    # Total = 2+1+3+1+12+6+4+6+2+42 = 79 ✓
    heb  = "HE"
    heb += "B"
    heb += "V03"
    heb += " "                             # MOH Office Code
    heb += today + "0001"                  # Batch Identification: YYYYMMDD####
    heb += "000000"                        # Operator Number (zero-fill)
    heb += "0000"                          # Group Number (solo provider)
    heb += bn6                             # HCP Practitioner Number
    heb += specialty[:2].ljust(2)          # Specialty Code
    heb += " " * 42                        # Reserved
    assert len(heb) == 79, f"HEB length={len(heb)}"
    lines.append(heb)

    for _ in range(num_claims):
        # ── HEH — Claim Header-1 ────────────────────────────────────────────
        # Total = 2+1+10+2+8+8+3+1+6+4+8+4+1+4+11+6 = 79 ✓
        heh  = "HE"
        heh += "H"
        heh += health_number[:10].ljust(10)    # Health Number
        heh += version_code[:2].ljust(2)       # Version Code
        heh += patient_dob[:8]                 # Patient Birthdate
        heh += " " * 8                         # Accounting Number (optional)
        heh += "HCP"                           # Payment Program
        heh += "P"                             # Payee
        heh += " " * 6                         # Referring HCP Number
        heh += " " * 4                         # Master Number
        heh += " " * 8                         # In-Patient Admission Date
        heh += " " * 4                         # Referring Lab Licence Number
        heh += " "                             # Manual Review Indicator
        heh += " " * 4                         # Service Location Indicator
        heh += " " * 11                        # Reserved for OOC
        heh += " " * 6                         # Reserved for MOH
        assert len(heh) == 79, f"HEH length={len(heh)}"
        lines.append(heh)

        # ── HET — Item Record ────────────────────────────────────────────────
        # Total = 2+1+5+2+6+2+8+4+10+1+38 = 79 ✓
        het  = "HE"
        het += "T"
        het += fee_code[:5].ljust(5)           # Service Code (ANNNA)
        het += "  "                            # Reserved (2 spaces)
        het += str(amount_cents).rjust(6, "0") # Fee Submitted
        het += "01"                            # Number of Services
        het += service_date[:8]                # Service Date
        het += "    "                          # Diagnostic Code (optional)
        het += " " * 10                        # Reserved for OOC
        het += " "                             # Reserved for MOH
        het += " " * 38                        # Item 2 (spaces = single item)
        assert len(het) == 79, f"HET length={len(het)}"
        lines.append(het)

    # ── HEE — Batch Trailer ──────────────────────────────────────────────────
    # Total = 2+1+4+4+5+63 = 79 ✓
    hee  = "HE"
    hee += "E"
    hee += str(num_claims).rjust(4, "0")      # H Count (HEH records)
    hee += "0000"                              # R Count (HER = 0 for solo)
    hee += str(num_claims).rjust(5, "0")      # T Count (HET records)
    hee += " " * 63                            # Reserved
    assert len(hee) == 79, f"HEE length={len(hee)}"
    lines.append(hee)

    return "\n".join(lines).encode("ascii")


def make_stale_dated_claims_file(
    billing_number: str = "616900",
) -> bytes:
    """
    Generate a stale-dated claims file (SDC).
    Same HE structure as CL but with a service date > 6 months old.
    """
    stale_date = "20250101"    # well past the stale-date threshold
    return make_claims_file(
        billing_number = billing_number,
        service_date   = stale_date,
        fee_code       = "A001A",
    )


def make_obec_file(
    billing_number: str = "616900",   # unused in OBEC format, kept for API compatibility
    health_number:  str = "1234567890",
    version_code:   str = "AB",
    num_items:      int = 1,
) -> bytes:
    """
    Generate a valid OBEC (Overnight Batch Eligibility Checking) input file.

    OBEC record format (each record terminated with CRLF):
      Pos 01-06 (6):  Transaction Code = "OBEC01"
      Pos 07-16 (10): Health Number (10 digits)
      Pos 17-18 (2):  Version Code (2 alpha chars or spaces)
      [Pos 19-22 (4): Submission Identifier — optional, omitted here]

    File terminated with CTRL-Z (0x1A) per MOH spec.
    CRLF (\\r\\n) required after each record.
    """
    records = []
    for _ in range(num_items):
        rec  = "OBEC01"
        rec += health_number[:10].ljust(10)    # health number, 10 chars
        rec += version_code[:2].ljust(2)       # version code, 2 chars
        records.append(rec)

    content = "\r\n".join(records) + "\r\n"
    return content.encode("ascii") + b"\x1a"   # CTRL-Z = EOF marker


# ── Invalid/error files for negative test cases ───────────────────────────────

def make_malformed_header_file() -> bytes:
    """ECLAM0002 — malformed header (transaction identifier ≠ 'HE')."""
    lines = [
        "ZZINVALID_HEADER_RECORD" + " " * 56,    # wrong TI, 79 bytes
        "HET" + "A001A" + "  " + "003000" + "01" + "20260917" + "    " + " " * 10 + " " + " " * 38,
        "HEE" + "0001" + "0000" + "00001" + " " * 63,
    ]
    return "\n".join(l[:79].ljust(79) for l in lines).encode("ascii")


def make_missing_billing_number_file() -> bytes:
    """ECLAM0003 — missing billing number (blank HCP number in HEB)."""
    today = datetime.date.today().strftime("%Y%m%d")
    lines = []
    # HEB with blank HCP number (positions 30-35)
    heb  = "HE" + "B" + "V03" + " " + today + "0001" + "000000" + "0000"
    heb += "      "      # blank billing number — triggers ECLAM0003
    heb += "00" + " " * 42
    assert len(heb) == 79, f"HEB blank-bn length={len(heb)}"
    lines.append(heb)

    heh  = "HE" + "H"
    heh += "1234567897"   # health number
    heh += "AB"           # version code
    heh += "19800101"     # birthdate
    heh += " " * 8 + "HCP" + "P" + " " * 6 + " " * 4 + " " * 8 + " " * 4
    heh += " " + " " * 4 + " " * 11 + " " * 6
    assert len(heh) == 79, f"HEH length={len(heh)}"
    lines.append(heh)

    het  = "HE" + "T" + "A001A" + "  " + "003000" + "01" + "20260917"
    het += "    " + " " * 10 + " " + " " * 38
    assert len(het) == 79, f"HET length={len(het)}"
    lines.append(het)

    hee  = "HE" + "E" + "0001" + "0000" + "00001" + " " * 63
    assert len(hee) == 79
    lines.append(hee)

    return "\n".join(lines).encode("ascii")


def make_short_record_file() -> bytes:
    """ECLAM0008 — record shorter than 79 bytes."""
    return b"HEB V03\n"    # deliberately truncated


def make_mismatched_hx_count_file() -> bytes:
    """ECLAM0005 — H count in trailer doesn't match actual HEH records (1 HEH but trailer says 2)."""
    today = datetime.date.today().strftime("%Y%m%d")
    heb = "HE" + "B" + "V03" + " " + today + "0001" + "000000" + "0000" + "616900" + "00" + " " * 42
    heh = "HE" + "H" + "1234567897" + "AB" + "19800101" + " " * 8 + "HCP" + "P" + " " * 6 + " " * 4 + " " * 8 + " " * 4 + " " + " " * 4 + " " * 11 + " " * 6
    het = "HE" + "T" + "A001A" + "  " + "003000" + "01" + "20260917" + "    " + " " * 10 + " " + " " * 38
    hee = "HE" + "E" + "0002" + "0000" + "00001" + " " * 63    # H count=2 but only 1 HEH
    for r in [heb, heh, het, hee]:
        assert len(r) == 79, f"length={len(r)}: {r[:20]!r}"
    return "\n".join([heb, heh, het, hee]).encode("ascii")


def make_mismatched_hi_count_file() -> bytes:
    """ECLAM0007 — T count in trailer doesn't match actual HET records (1 HET but says 3)."""
    today = datetime.date.today().strftime("%Y%m%d")
    heb = "HE" + "B" + "V03" + " " + today + "0001" + "000000" + "0000" + "616900" + "00" + " " * 42
    heh = "HE" + "H" + "1234567897" + "AB" + "19800101" + " " * 8 + "HCP" + "P" + " " * 6 + " " * 4 + " " * 8 + " " * 4 + " " + " " * 4 + " " * 11 + " " * 6
    het = "HE" + "T" + "A001A" + "  " + "003000" + "01" + "20260917" + "    " + " " * 10 + " " + " " * 38
    hee = "HE" + "E" + "0001" + "0000" + "00003" + " " * 63    # T count=3 but only 1 HET
    for r in [heb, heh, het, hee]:
        assert len(r) == 79, f"length={len(r)}: {r[:20]!r}"
    return "\n".join([heb, heh, het, hee]).encode("ascii")


def make_mismatched_hb_count_file() -> bytes:
    """ECLAM0006 — R count in trailer doesn't match actual HER records (0 HER but says 2)."""
    today = datetime.date.today().strftime("%Y%m%d")
    heb = "HE" + "B" + "V03" + " " + today + "0001" + "000000" + "0000" + "616900" + "00" + " " * 42
    heh = "HE" + "H" + "1234567897" + "AB" + "19800101" + " " * 8 + "HCP" + "P" + " " * 6 + " " * 4 + " " * 8 + " " * 4 + " " + " " * 4 + " " * 11 + " " * 6
    het = "HE" + "T" + "A001A" + "  " + "003000" + "01" + "20260917" + "    " + " " * 10 + " " + " " * 38
    hee = "HE" + "E" + "0001" + "0002" + "00001" + " " * 63    # R count=2 but 0 HER records
    for r in [heb, heh, het, hee]:
        assert len(r) == 79, f"length={len(r)}: {r[:20]!r}"
    return "\n".join([heb, heh, het, hee]).encode("ascii")


def make_obec_invalid_transaction_file() -> bytes:
    """EOBEC0003 — invalid transaction code (not 'OBEC01' at positions 1-6)."""
    rec = "OBE   " + "1234567890" + "AB"   # "OBE" at pos 1-6 → EOBEC0003
    return (rec + "\r\n").encode("ascii") + b"\x1a"


def make_obec_invalid_health_length_file() -> bytes:
    """EOBEC0004 — health number field shorter than 10 digits (record truncated)."""
    rec = "OBEC01" + "12345"   # only 5 digits — record ends at col 11, not col 16 → EOBEC0004
    return (rec + "\r\n").encode("ascii") + b"\x1a"


def make_obec_invalid_health_numeric_file() -> bytes:
    """EOBEC0005 — health number contains non-numeric characters."""
    rec = "OBEC01" + "ABCDEFGHIJ" + "AB"   # alpha health number → EOBEC0005
    return (rec + "\r\n").encode("ascii") + b"\x1a"
