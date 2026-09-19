"""
Generate sample Ontario OHIP claim files for MCEDT conformance testing.

OHIP batch claim format (79 bytes per record, fixed-width):
  Header-1  (HX record): batch header
  Header-2  (HB record): claim header
  Item       (HI record): service item
  Trailer    (HT record): counts

Minimal valid structure based on MCEDT Technical Specifications.
Billing number used: 616900 (the conformance MOH ID, acts as CSN)
"""

import datetime


def _pad(s, length, char=" ", align="left"):
    s = str(s)
    if align == "left":
        return s[:length].ljust(length, char)
    else:
        return s[:length].rjust(length, char)


def make_claims_file(
    billing_number: str = "J4674 ",
    health_number:  str = "1234567890",
    version_code:   str = "AB",
    service_date:   str = "20260917",
    fee_code:       str = "A001",
    amount_cents:   int = 3000,  # $30.00
    num_claims:     int = 1,
) -> bytes:
    """
    Generate a minimal valid Ontario OHIP claim batch file.
    Returns bytes (fixed 79-byte records, \\n terminated).
    """
    lines = []
    today = datetime.date.today().strftime("%Y%m%d")

    # ── HX — Batch Header (header-1) ─────────────────────────────────────────
    # Pos  Len  Field
    #  1    2   Record type = "HX"
    #  3    1   Transaction code = "H" (header)
    #  4    6   Billing number (CSN) — right-justified, space-padded
    #  10   1   Filler
    #  11   1   Ministry use
    #  12   4   Batch date (MMDD)
    #  16  64   Filler
    hx  = "HX"                                # 2
    hx += "H"                                 # 1
    hx += billing_number[:6].rjust(6)        # 6
    hx += " " * 1                             # 1 filler
    hx += " " * 1                             # 1 ministry
    hx += datetime.date.today().strftime("%m%d")  # 4
    hx += " " * 64                            # 64 filler
    lines.append(hx[:79])

    # ── HB — Claim Header (header-2) per batch ───────────────────────────────
    # One per unique practitioner/specialty
    # Pos  Len  Field
    #  1    2   Record type = "HB"
    #  3    6   Billing number
    #  9    2   Specialty code (00 = general practice)
    #  11   8   Service date
    #  19  61   Filler
    hb  = "HB"
    hb += billing_number[:6].rjust(6)
    hb += "00"              # specialty — general
    hb += service_date      # 8 digits YYYYMMDD
    hb += " " * 61
    lines.append(hb[:79])

    # ── HI — Item records ────────────────────────────────────────────────────
    # One per service item
    for i in range(num_claims):
        hi  = "HI"
        hi += billing_number[:6].rjust(6)     # 6 billing
        hi += health_number[:10].rjust(10)    # 10 health number
        hi += version_code[:2].ljust(2)       # 2 version code
        hi += service_date                    # 8 service date
        hi += fee_code[:4].ljust(4)           # 4 fee code
        hi += str(amount_cents).rjust(6, "0") # 6 amount (cents)
        hi += "0" * 2                          # 2 units
        hi += " " * 37                        # filler to 79
        lines.append(hi[:79])

    # ── HT — Trailer ─────────────────────────────────────────────────────────
    # Pos  Len  Field
    #  1    2   Record type = "HT"
    #  3    1   Transaction code = "T"
    #  4    5   Header-1 count = 1
    #  9    5   Header-2 count = 1
    #  14   5   Item record count
    #  19  61   Filler
    ht  = "HT"
    ht += "T"
    ht += "00001"            # header-1 count
    ht += "00001"            # header-2 count
    ht += str(num_claims).rjust(5, "0")  # item count
    ht += " " * 61
    lines.append(ht[:79])

    return "\n".join(lines).encode("ascii")


def make_stale_dated_claims_file(
    billing_number: str = "J4674 ",
) -> bytes:
    """
    Generate a minimal stale-dated claims file (SDC).
    Same structure as claims but with a date more than 6 months old.
    """
    stale_date = "20250101"  # well past the stale-date threshold
    return make_claims_file(
        billing_number = billing_number,
        service_date   = stale_date,
        fee_code       = "A001",
    )


def make_obec_file(
    billing_number: str = "J4674 ",
    health_number:  str = "1234567890",
    version_code:   str = "AB",
) -> bytes:
    """
    Generate a minimal OBEC (Out-of-Province Billing / Electronic Claim) file.
    OBE prefix in transaction code field.
    """
    today = datetime.date.today().strftime("%Y%m%d")

    lines = []

    # OBEC header
    oh  = "OH"               # OBEC header record type
    oh += "OBE"              # transaction code
    oh += billing_number[:6].rjust(6)
    oh += " " * 62
    lines.append(oh[:79])

    # OBEC item
    oi  = "OI"
    oi += billing_number[:6].rjust(6)
    oi += health_number[:10].rjust(10)
    oi += version_code[:2].ljust(2)
    oi += today              # 8 — service date
    oi += "A001"             # fee code
    oi += "003000"           # amount
    oi += " " * 35
    lines.append(oi[:79])

    # OBEC trailer
    ot  = "OT"
    ot += "T"
    ot += "00001" * 3        # header/item counts
    ot += " " * 46
    lines.append(ot[:79])

    return "\n".join(lines).encode("ascii")


# ── Invalid/error files for negative test cases ───────────────────────────────

def make_malformed_header_file() -> bytes:
    """ECLAM0002 — malformed header (wrong record type)."""
    lines = [
        "ZZINVALID_HEADER_RECORD" + " " * 57,  # wrong record type
        "HI" + "J4674 " + "1234567890" + "AB" + "20260917" + "A001" + "003000" + " " * 37,
        "HT" + "T" + "00001" + "00001" + "00001" + " " * 61,
    ]
    return "\n".join(l[:79] for l in lines).encode("ascii")


def make_missing_billing_number_file() -> bytes:
    """ECLAM0003 — missing billing number (blank CSN in header)."""
    lines = [
        "HX" + "H" + "      " + " " * 2 + datetime.date.today().strftime("%m%d") + " " * 64,
        "HB" + "      " + "00" + "20260917" + " " * 61,
        "HI" + "J4674 " + "1234567890" + "AB" + "20260917" + "A001" + "003000" + " " * 37,
        "HT" + "T" + "00001" + "00001" + "00001" + " " * 61,
    ]
    return "\n".join(l[:79] for l in lines).encode("ascii")


def make_short_record_file() -> bytes:
    """ECLAM0008 — record shorter than 79 bytes."""
    return b"HX H J4674 20260917\n"  # only 20 bytes
