"""
MCEDT / HCV Conformance Configuration
Credentials MUST stay out of git — stored here only for local conformance runs.
"""
import os

# ── IDP credentials (from MOH conformance email) ──────────────────────────────
USERNAME      = os.getenv("MCEDT_USERNAME",    "confsu+382@gmail.com")
PASSWORD      = os.getenv("MCEDT_PASSWORD",    "Password22!!")
MOH_ID        = os.getenv("MCEDT_MOH_ID",      "616900")
MCEDT_KEY     = os.getenv("MCEDT_CONF_KEY",    "a5e64401-fca0-4f68-b777-3f3b1531bd61")
HCV_KEY       = os.getenv("HCV_CONF_KEY",      "ae1d5821-5d3d-4815-91a3-a0a5391d9492")

# ── Conformance endpoints ──────────────────────────────────────────────────────
MCEDT_URL = "https://ws.conf.ebs.health.gov.on.ca:1443/EDTService/EDTService"
HCV_URL   = "https://ws.conf.ebs.health.gov.on.ca:1444/HCVService/HCValidationService"

# ── Signing key pair (generated locally; public cert sent to MOH) ──────────────
SIGNING_KEY_PATH  = os.path.join(os.path.dirname(__file__), "ebs_signing.key")
SIGNING_CERT_PATH = os.path.join(os.path.dirname(__file__), "ebs_signing.crt")
