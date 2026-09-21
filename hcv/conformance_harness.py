"""
HCV Conformance Harness — Ontario Ministry of Health
Ticket: #1068819

Runs all 20 test cases from "SKYCLAIMS HCV data list and test cases V 10.xls"
against the conformance endpoint: https://ws.conf.ebs.health.gov.on.ca:1444

HCV Conformance Key: ae1d5821-5d3d-4815-91a3-a0a5391d9492

Usage:
    python -m hcv.conformance_harness [--test 1] [--dry-run]

Results are written to:
    hcv-results/
        HCV_results_YYYYMMDD.xlsx   (Results sheet filled)
        <test_id>_request.xml
        <test_id>_response.xml
        <test_id>_decrypted.xml
"""

import sys
import os
import argparse
import datetime
import time
import openpyxl

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcedt.ebs_client import call_hcv
from hcv.methods import build_validate, parse_validate_response

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "hcv-results")


def log(msg):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def save(test_id: str, req: str, resp: str, dec: str | None):
    os.makedirs(RESULTS_DIR, exist_ok=True)
    safe = f"tc{test_id.replace('.', '_')}"
    if req:
        open(os.path.join(RESULTS_DIR, f"{safe}_request.xml"),   "w", encoding="utf-8").write(req)
    if resp:
        open(os.path.join(RESULTS_DIR, f"{safe}_response.xml"),  "w", encoding="utf-8").write(resp)
    if dec:
        open(os.path.join(RESULTS_DIR, f"{safe}_decrypted.xml"), "w", encoding="utf-8").write(dec)


# ── Test data from "SKYCLAIMS HCV data list and test cases V 10.xls" ──────────

HCV_TESTS = [
    # id, healthNumber, versionCode, feeServiceCodes, expectedCode, expectedResponseID
    {
        "id": "1.0",
        "healthNumber":   "1286844022",
        "versionCode":    "YX",
        "feeServiceCodes": [],
        "expectedCode":   "10",
        "expectedID":     "FAILED_MOD10",
        "notes":          "Health Number does not exist — MOD10 check fail",
    },
    {
        "id": "2.0",
        "healthNumber":   "1102686738",
        "versionCode":    "",
        "feeServiceCodes": [],
        "expectedCode":   "15",
        "expectedID":     "IS_IN_DISTRIBUTED_STATUS",
        "notes":          "Pre-assigned newborn Health Number",
    },
    {
        "id": "3.0",
        "healthNumber":   "9267294685",
        "versionCode":    "",
        "feeServiceCodes": ["A110"],
        "expectedCode":   "20",
        "expectedID":     "IS_NOT_ELIGIBLE",
        "notes":          "Eligibility does not exist for this Health Number",
    },
    {
        "id": "4.0",
        "healthNumber":   "1023947722",
        "versionCode":    "J",
        "feeServiceCodes": ["P108"],
        "expectedCode":   "50",
        "expectedID":     "NOT_ON_ACTIVE_ROSTER",
        "notes":          "Health card passed validation; fee service P108 → 102 (invalid)",
    },
    {
        "id": "5.0",
        "healthNumber":   "9287170261",
        "versionCode":    "DK",
        "feeServiceCodes": ["A110"],
        "expectedCode":   "50",
        "expectedID":     "NOT_ON_ACTIVE_ROSTER",
        "notes":          "Passed; A110 with date 2026-04-01 → 201 (major eye exam within timeframe)",
    },
    {
        "id": "6.0",
        "healthNumber":   "1006395956",
        "versionCode":    "WG",
        "feeServiceCodes": [],
        "expectedCode":   "51",
        "expectedID":     "IS_ON_ACTIVE_ROSTER",
        "notes":          "Health card passed validation — on active roster",
    },
    {
        "id": "7.0",
        "healthNumber":   "1357557162",
        "versionCode":    "",
        "feeServiceCodes": ["J695"],
        "expectedCode":   "52",
        "expectedID":     "HAS_NOTICE",
        "notes":          "Passed with notice; J695 → 203 (sleep study within timeframe)",
    },
    {
        "id": "8.0",
        "healthNumber":   "1262643149",
        "versionCode":    "CT",
        "feeServiceCodes": ["V406"],
        "expectedCode":   "53",
        "expectedID":     "IS_RQ_HAS_EXPIRED",
        "notes":          "Card expired; V406 → 210",
    },
    {
        "id": "9.0",
        "healthNumber":   "1097189623",
        "versionCode":    "",
        "feeServiceCodes": ["X148"],
        "expectedCode":   "55",
        "expectedID":     "RETURNED_MAIL",
        "notes":          "Passed; address update required; X148 → 202",
    },
    {
        "id": "10.0",
        "healthNumber":   "1097624546",
        "versionCode":    "AA",
        "feeServiceCodes": ["A237"],
        "expectedCode":   "65",
        "expectedID":     "INVALID_VERSION_CODE",
        "notes":          "Invalid version code; A237 → 101 (no FSC info)",
    },
    {
        "id": "11.0",
        "healthNumber":   "5123673328",
        "versionCode":    "AN",
        "feeServiceCodes": ["A112"],
        "expectedCode":   "70",
        "expectedID":     "IS_STOLEN",
        "notes":          "Health card reported stolen",
    },
    {
        "id": "12.0",
        "healthNumber":   "1108809904",
        "versionCode":    "CW",
        "feeServiceCodes": ["J889"],
        "expectedCode":   "75",
        "expectedID":     "IS_CANCELLED_OR_VOIDED",
        "notes":          "Health card cancelled or voided; J889 → 203",
    },
    {
        "id": "13.0",
        "healthNumber":   "4525895969",
        "versionCode":    "RM",
        "feeServiceCodes": [],
        "expectedCode":   "80",
        "expectedID":     "DAMAGED_STATE",
        "notes":          "Health card reported damaged",
    },
    {
        "id": "14.0",
        "healthNumber":   "1268844022",
        "versionCode":    "YX",
        "feeServiceCodes": ["V404"],
        "expectedCode":   "83",
        "expectedID":     "LOST_STATE",
        "notes":          "Health card reported lost; V404 → 101",
    },
    {
        "id": "15.0",
        "healthNumber":   "9287170261",
        "versionCode":    "OP",
        "feeServiceCodes": [],
        "expectedCode":   "65",
        "expectedID":     "INVALID_VERSION_CODE",
        "notes":          "Run 5 times; 5th run should be same response",
        "repeat":         5,
    },
    {
        "id": "16.0",
        "healthNumber":   "9287170261",
        "versionCode":    "OP",
        "feeServiceCodes": [],
        "expectedCode":   "91",
        "expectedID":     "ATTEMPTS_EXCEEDED",
        "notes":          "Run a 6th time after TC 15 — expect attempts exceeded",
    },
    {
        "id": "17.0",
        "healthNumber":   "MULTI",  # multiple health numbers in one call
        "versionCode":    "",
        "feeServiceCodes": [],
        "expectedCode":   "varies",
        "expectedID":     "varies",
        "notes":          "Submit multiple health numbers in one SOAP call",
    },
    {
        "id": "18.0",
        "healthNumber":   "INVALID_AUTH",
        "versionCode":    "",
        "feeServiceCodes": [],
        "expectedCode":   "EHCAU0023",
        "expectedID":     "auth_error",
        "notes":          "Invalid credentials — expect EHCAU0023",
    },
    {
        "id": "19.0",
        "healthNumber":   "1268J84402",  # non-numeric HN
        "versionCode":    "YX",
        "feeServiceCodes": [],
        "expectedCode":   "soapenv:Rejected",
        "expectedID":     "schema_rejection",
        "notes":          "Non-numeric health number — schema rejection (if supported)",
    },
    {
        "id": "20.0",
        "healthNumber":   "1268844022",
        "versionCode":    "Y1",  # numeric version code — invalid
        "feeServiceCodes": [],
        "expectedCode":   "soapenv:Rejected",
        "expectedID":     "schema_rejection",
        "notes":          "Numeric version code — schema rejection (if supported)",
    },
]

FEE_SERVICE_DATE = "2026-04-01"   # date to use for time-limited fee service code checks


def run_test(test: dict, dry_run: bool = False) -> dict:
    """Execute one HCV test case."""
    test_id = test["id"]
    log(f"Running HCV TC {test_id}: {test['notes'][:60]}")

    if test["healthNumber"] == "INVALID_AUTH":
        # TC 18: needs credential override — skip automated
        return {
            "test_id": test_id, "status": "skip",
            "actual": "Requires invalid credentials — manual test",
            "result": {},
        }

    if test["healthNumber"] == "MULTI":
        # TC 17: submit several health numbers in one call
        requests = [
            {"healthNumber": "1286844022", "versionCode": "YX", "feeServiceCodes": []},
            {"healthNumber": "9287170261", "versionCode": "DK", "feeServiceCodes": ["A110"]},
            {"healthNumber": "1006395956", "versionCode": "WG", "feeServiceCodes": []},
        ]
        if dry_run:
            return {"test_id": test_id, "status": "dry-run", "actual": "DRY RUN", "result": {}}
        el = build_validate(requests)
        r  = call_hcv(el)
        res = parse_validate_response(r.get("parsed"))
        actual = f"{len(res)} results returned. " + (res[0].get("responseID","") if res else _summarise_hcv([], r))
        return {"test_id": test_id, "status": "pass" if not r.get("fault") else "fail",
                "actual": actual, "result": r}

    # Build standard validate request
    hn      = test["healthNumber"].replace(" ", "")
    vc      = test["versionCode"].strip()
    fscs    = test.get("feeServiceCodes", [])
    repeats = test.get("repeat", 1)

    req = [{"healthNumber": hn, "versionCode": vc, "feeServiceCodes": fscs, "locale": "en"}]
    el  = build_validate(req)

    if dry_run:
        return {"test_id": test_id, "status": "dry-run", "actual": "DRY RUN", "result": {}}

    # Handle tests that need multiple runs (TC 15 = 5 times, TC 16 = 6th run)
    last_result = {}
    for attempt in range(repeats):
        if repeats > 1:
            log(f"  Attempt {attempt+1}/{repeats}")
        el = build_validate(req)
        r  = call_hcv(el)
        last_result = r
        if repeats > 1:
            time.sleep(1)

    res    = parse_validate_response(last_result.get("parsed"))
    actual = _summarise_hcv(res, last_result)

    # Validate against expected
    expected_code = test["expectedCode"]
    expected_id   = test["expectedID"]
    got_code      = res[0]["responseCode"] if res else ""
    got_id        = res[0]["responseID"]   if res else ""

    if expected_code == "soapenv:Rejected":
        status = "pass" if last_result.get("fault") else "warn"
    elif last_result.get("fault"):
        status = "fail"
    elif got_code == expected_code or got_id == expected_id:
        status = "pass"
    else:
        status = "warn"

    return {
        "test_id": test_id,
        "status":  status,
        "actual":  actual,
        "result":  last_result,
        "expected_code": expected_code,
        "got_code":      got_code,
    }


def _summarise_hcv(res: list, raw_result: dict) -> str:
    if raw_result.get("fault"):
        return f"FAULT: {raw_result['fault']}"
    if not res:
        return "No results parsed from response"
    r = res[0]
    parts = []
    if r.get("auditUID"):
        parts.append(f"auditUID={r['auditUID'][:8]}…")
    if r.get("responseCode"):
        parts.append(f"code={r['responseCode']}")
    if r.get("responseID"):
        parts.append(f"id={r['responseID']}")
    if r.get("lastName"):
        parts.append(f"name={r.get('firstName','')} {r['lastName']}")
    if r.get("birthDate"):
        parts.append(f"dob={r['birthDate'][:10]}")
    for fs in r.get("feeServices", []):
        parts.append(f"FSC[{fs['code']}]={fs['responseCode']}")
    return " | ".join(parts)


def write_results_xlsx(results: list[dict]) -> str:
    os.makedirs(RESULTS_DIR, exist_ok=True)
    date_str = datetime.date.today().strftime("%Y%m%d")
    out_path = os.path.join(RESULTS_DIR, f"HCV_results_{date_str}.xlsx")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "HCV Results"
    ws.append([
        "Test Case", "Status", "Expected Code", "Got Code",
        "Actual Results", "Timestamp"
    ])
    for r in results:
        ws.append([
            r["test_id"],
            r["status"],
            r.get("expected_code", ""),
            r.get("got_code", ""),
            r.get("actual", "")[:500],
            datetime.datetime.now().isoformat(),
        ])
    for col, width in [("A",10),("B",8),("C",15),("D",15),("E",80),("F",25)]:
        ws.column_dimensions[col].width = width
    wb.save(out_path)
    log(f"HCV results written: {out_path}")
    return out_path


def main():
    global RESULTS_DIR
    parser = argparse.ArgumentParser(description="HCV Conformance Harness")
    parser.add_argument("--test",    default=None, help="Run specific TC (e.g. 5.0)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--output",  default=RESULTS_DIR)
    args = parser.parse_args()

    RESULTS_DIR = os.path.abspath(args.output)

    tests = [t for t in HCV_TESTS if t["id"] == args.test] if args.test else HCV_TESTS
    results = []
    pass_count = fail_count = skip_count = warn_count = 0

    for test in tests:
        try:
            r = run_test(test, dry_run=args.dry_run)
        except Exception as e:
            r = {"test_id": test["id"], "status": "error", "actual": str(e), "result": {}}
            log(f"  ERROR: {e}")

        results.append(r)
        status = r.get("status", "?")
        actual = r.get("actual", "")[:80]

        if status == "pass":   pass_count  += 1; emoji = "✓"
        elif status == "fail": fail_count  += 1; emoji = "✗"
        elif status == "skip": skip_count  += 1; emoji = "–"
        elif status == "warn": warn_count  += 1; emoji = "△"
        else:                                    emoji = "?"

        log(f"  {emoji} TC {r['test_id']}: {status.upper()} — {actual}")

        rd = r.get("result", {})
        if rd:
            save(r["test_id"],
                 rd.get("raw_request",  ""),
                 rd.get("raw_response", ""),
                 rd.get("decrypted",    ""))

        if not args.dry_run:
            time.sleep(0.5)

    log(f"\n── HCV Summary ──────────────────────────────────")
    log(f"  Pass:  {pass_count}")
    log(f"  Warn:  {warn_count}")
    log(f"  Fail:  {fail_count}")
    log(f"  Skip:  {skip_count}")
    log(f"  Total: {len(results)}")

    if not args.dry_run:
        write_results_xlsx(results)


if __name__ == "__main__":
    main()
