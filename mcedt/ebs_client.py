"""
EBS HTTP client — sends signed SOAP requests to MCEDT or HCV endpoints.
"""

import requests
import urllib3
from lxml import etree
from . import config
from .wssec import build_envelope, decrypt_response
from cryptography.hazmat.primitives import serialization

# Suppress SSL warnings for conformance env (self-signed EBS CA)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_private_key  = None
_cert_pem     = None


def _load_keys():
    global _private_key, _cert_pem
    if _private_key is None:
        with open(config.SIGNING_KEY_PATH, "rb") as f:
            _private_key = serialization.load_pem_private_key(f.read(), password=None)
    if _cert_pem is None:
        with open(config.SIGNING_CERT_PATH, "rb") as f:
            _cert_pem = f.read()


def call_mcedt(method_element, conformance_key=None) -> dict:
    """
    Send a signed MCEDT SOAP request.

    Returns {
        "status": "ok" | "error",
        "raw_request":  str,
        "raw_response": str,
        "decrypted":    str | None,
        "parsed":       lxml Element | None,
        "fault":        str | None,
    }
    """
    _load_keys()
    ck = conformance_key or config.MCEDT_KEY
    return _call(config.MCEDT_URL, method_element, ck)


def call_hcv(method_element, conformance_key=None) -> dict:
    """Send a signed HCV SOAP request."""
    _load_keys()
    ck = conformance_key or config.HCV_KEY
    return _call(config.HCV_URL, method_element, ck)


def _call(url: str, method_element, conformance_key: str) -> dict:
    _load_keys()

    envelope_bytes = build_envelope(
        body_element    = method_element,
        moh_id          = config.MOH_ID,
        username        = config.USERNAME,
        password        = config.PASSWORD,
        conformance_key = conformance_key,
        private_key     = _private_key,
        cert_pem        = _cert_pem,
    )

    headers = {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction":   '""',
    }

    result = {
        "status":       "error",
        "raw_request":  envelope_bytes.decode("utf-8", errors="replace"),
        "raw_response": "",
        "decrypted":    None,
        "parsed":       None,
        "fault":        None,
    }

    try:
        resp = requests.post(
            url,
            data    = envelope_bytes,
            headers = headers,
            verify  = False,   # conformance env uses EBS test CA; skip chain verification
            timeout = 60,
        )
        result["raw_response"] = resp.text

        if resp.status_code != 200:
            # Check for SOAP Fault
            try:
                fault_root = etree.fromstring(resp.content)
                fault_el   = fault_root.find(".//{http://schemas.xmlsoap.org/soap/envelope/}Fault")
                if fault_el is not None:
                    fc = fault_el.findtext("faultcode") or ""
                    fs = fault_el.findtext("faultstring") or ""
                    result["fault"] = f"{fc}: {fs}"
            except Exception:
                result["fault"] = f"HTTP {resp.status_code}"
            return result

        # Try to decrypt
        try:
            decrypted = decrypt_response(resp.content, _private_key)
            result["decrypted"] = decrypted.decode("utf-8", errors="replace")
            result["parsed"]    = etree.fromstring(decrypted)
        except Exception as e:
            # If decryption fails, try parsing raw response
            result["decrypted"] = resp.text
            try:
                result["parsed"] = etree.fromstring(resp.content)
            except Exception:
                result["fault"] = f"Decrypt/parse error: {e}"

        result["status"] = "ok"

    except requests.exceptions.ConnectionError as e:
        result["fault"] = f"Connection error: {e}"
    except requests.exceptions.Timeout:
        result["fault"] = "Request timed out"
    except Exception as e:
        result["fault"] = f"Unexpected error: {e}"

    return result
