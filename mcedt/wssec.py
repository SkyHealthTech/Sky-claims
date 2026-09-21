"""
WS-Security IDP Model SOAP builder for Ontario EBS (MCEDT + HCV).

Implements:
  • IDP SOAP envelope structure (EBS + IDP headers)
  • WS-Security header: X.509 BinarySecurityToken + XML Signature + UsernameToken + Timestamp
  • Exclusive C14N (http://www.w3.org/2001/10/xml-exc-c14n#)
  • RSA-SHA1 signature over {UsernameToken, Timestamp, IDP, EBS, Body}
  • SHA-256 digest for each Reference
  • AES-128-CBC response decryption

References:
  EBS-EDT SOAP Specification v4.5
  EBS - EDT - IDP Model Message Example.docx
  FAQ.docx (Q16-Q22)
"""

import base64
import hashlib
import uuid as _uuid
from datetime import datetime, timezone, timedelta
from lxml import etree
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding as asym_padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.x509 import load_pem_x509_certificate

# ── Namespace map ──────────────────────────────────────────────────────────────
NS = {
    "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
    "ebs":     "http://ebs.health.ontario.ca/",
    "idp":     "http://idp.ebs.health.ontario.ca/",
    "msa":     "http://msa.ebs.health.ontario.ca/",
    "edt":     "http://edt.health.ontario.ca/",
    "hcv":     "http://hcv.health.ontario.ca/",        # no ".ebs." — confirmed from HCV WSDL
    "wsse":    "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
    "wsu":     "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
    "ds":      "http://www.w3.org/2000/09/xmldsig#",
    "ec":      "http://www.w3.org/2001/10/xml-exc-c14n#",
}

WSU    = NS["wsu"]
WSSE   = NS["wsse"]
DS     = NS["ds"]
EC     = NS["ec"]
SOAP   = NS["soapenv"]

# ── Exclusive C14N helpers ─────────────────────────────────────────────────────

def _c14n(element, inclusive_prefixes=None):
    """
    Serialize element using exclusive C14N (exc-c14n).
    Uses lxml's write_c14n on an element-scoped tree.
    Returns bytes.
    """
    import io
    inc = list(inclusive_prefixes) if inclusive_prefixes else []
    # Build an independent ElementTree rooted at this element
    # so that write_c14n serializes only this subtree.
    elem_copy = etree.fromstring(etree.tostring(element))
    tree = etree.ElementTree(elem_copy)
    out = io.BytesIO()
    tree.write_c14n(
        out,
        exclusive=True,
        with_comments=False,
        inclusive_ns_prefixes=inc if inc else None,
    )
    return out.getvalue()


def _c14n_str(element, inclusive_prefixes=None):
    return _c14n(element, inclusive_prefixes).decode("utf-8")


def _sha256_digest_b64(data: bytes) -> str:
    digest = hashlib.sha256(data).digest()
    return base64.b64encode(digest).decode()


def _rsa_sha1_sign_b64(private_key, data: bytes) -> str:
    sig = private_key.sign(data, asym_padding.PKCS1v15(), hashes.SHA1())
    return base64.b64encode(sig).decode()


def _cert_der_b64(cert_pem: bytes) -> str:
    cert = load_pem_x509_certificate(cert_pem)
    return base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode()


# ── ID generator ──────────────────────────────────────────────────────────────

def _uid(prefix="id"):
    return f"{prefix}-{str(_uuid.uuid4()).replace('-', '').upper()[:20]}"


# ── Timestamp (30-second window) ──────────────────────────────────────────────

def _make_timestamp():
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=30)
    fmt = "%Y-%m-%dT%H:%M:%S.000Z"
    return now.strftime(fmt), expires.strftime(fmt)


# ── Build a signed IDP SOAP envelope ──────────────────────────────────────────

def build_envelope(
    body_element,           # lxml Element — the method call element
    moh_id: str,
    username: str,
    password: str,
    conformance_key: str,
    private_key,            # cryptography RSAPrivateKey
    cert_pem: bytes,        # PEM bytes of our signing cert
    service_name: str = "edt",  # "edt" or "hcv"
) -> bytes:
    """
    Build a complete signed IDP SOAP envelope and return the raw XML bytes.
    """
    audit_id = str(_uuid.uuid4()).upper()
    ts_id    = _uid("TS")
    ut_id    = _uid("UT")
    idp_id   = _uid("IDP")
    ebs_id   = _uid("EBS")
    body_id  = _uid("BODY")
    bst_id   = _uid("X509")
    sig_id   = _uid("SIG")
    ki_id    = _uid("KI")
    str_id   = _uid("STR")

    ts_created, ts_expires = _make_timestamp()
    cert_b64 = _cert_der_b64(cert_pem)

    # ── 1. Build the envelope skeleton (without Security signature yet) ──────

    NSMAP = {
        "soapenv": SOAP,
        "ebs":     NS["ebs"],
        "idp":     NS["idp"],
        "edt":     NS["edt"],
        "hcv":     NS["hcv"],
        "wsse":    WSSE,
        "wsu":     WSU,
        "ds":      DS,
    }

    envelope = etree.Element(f"{{{SOAP}}}Envelope", nsmap=NSMAP)

    # ── Header ───────────────────────────────────────────────────────────────
    header = etree.SubElement(envelope, f"{{{SOAP}}}Header")

    # EBS header
    ebs_el = etree.SubElement(header, f"{{{NS['ebs']}}}EBS")
    ebs_el.set(f"{{{WSU}}}Id", ebs_id)
    etree.SubElement(ebs_el, "SoftwareConformanceKey").text = conformance_key
    etree.SubElement(ebs_el, "AuditId").text = audit_id

    # IDP header
    idp_el = etree.SubElement(header, f"{{{NS['idp']}}}IDP")
    idp_el.set(f"{{{WSU}}}Id", idp_id)
    etree.SubElement(idp_el, "ServiceUserMUID").text = moh_id

    # Security header (mustUnderstand="1")
    sec = etree.SubElement(header, f"{{{WSSE}}}Security")
    sec.set(f"{{{SOAP}}}mustUnderstand", "1")

    # Timestamp
    ts_el = etree.SubElement(sec, f"{{{WSU}}}Timestamp")
    ts_el.set(f"{{{WSU}}}Id", ts_id)
    etree.SubElement(ts_el, f"{{{WSU}}}Created").text = ts_created
    etree.SubElement(ts_el, f"{{{WSU}}}Expires").text  = ts_expires

    # UsernameToken (IDP model: username + password)
    ut_el = etree.SubElement(sec, f"{{{WSSE}}}UsernameToken")
    ut_el.set(f"{{{WSU}}}Id", ut_id)
    etree.SubElement(ut_el, f"{{{WSSE}}}Username").text = username
    pw_el = etree.SubElement(ut_el, f"{{{WSSE}}}Password")
    pw_el.set("Type",
        "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText")
    pw_el.text = password

    # BinarySecurityToken (our X.509 cert)
    bst_el = etree.SubElement(sec, f"{{{WSSE}}}BinarySecurityToken")
    bst_el.set("EncodingType",
        "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary")
    bst_el.set("ValueType",
        "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3")
    bst_el.set(f"{{{WSU}}}Id", bst_id)
    bst_el.text = cert_b64

    # ── Body ─────────────────────────────────────────────────────────────────
    body = etree.SubElement(envelope, f"{{{SOAP}}}Body")
    body.set(f"{{{WSU}}}Id", body_id)
    body.append(body_element)

    # ── 2. Compute digests for each element to sign ────────────────────────
    # Prefix lists per IDP example (exc-c14n with InclusiveNamespaces)
    INC_UT   = ["ebs", "edt", "idp", "msa", "soapenv"]
    INC_TS   = ["wsse", "ebs", "edt", "idp", "msa", "soapenv"]
    INC_IDP  = ["ebs", "edt", "msa", "soapenv"]
    INC_EBS  = ["edt", "idp", "msa", "soapenv"]
    INC_BODY = ["ebs", "edt", "idp", "msa"]

    refs = [
        (ut_id,   ut_el,   INC_UT),
        (ts_id,   ts_el,   INC_TS),
        (idp_id,  idp_el,  INC_IDP),
        (ebs_id,  ebs_el,  INC_EBS),
        (body_id, body,    INC_BODY),
    ]

    digest_values = {}
    for ref_id, el, inc in refs:
        c14n_bytes = _c14n(el, inclusive_prefixes=inc)
        digest_values[ref_id] = _sha256_digest_b64(c14n_bytes)

    # ── 3. Build Signature element ────────────────────────────────────────

    sig_el = etree.Element(f"{{{DS}}}Signature")
    sig_el.set("Id", sig_id)

    signed_info = etree.SubElement(sig_el, f"{{{DS}}}SignedInfo")

    c14n_method = etree.SubElement(signed_info, f"{{{DS}}}CanonicalizationMethod")
    c14n_method.set("Algorithm", "http://www.w3.org/2001/10/xml-exc-c14n#")
    inc_ns = etree.SubElement(c14n_method, f"{{{EC}}}InclusiveNamespaces")
    inc_ns.set("PrefixList", "ebs edt idp msa soapenv")

    sig_method = etree.SubElement(signed_info, f"{{{DS}}}SignatureMethod")
    sig_method.set("Algorithm", "http://www.w3.org/2000/09/xmldsig#rsa-sha1")

    INC_REFS = {
        ut_id:   INC_UT,
        ts_id:   INC_TS,
        idp_id:  INC_IDP,
        ebs_id:  INC_EBS,
        body_id: INC_BODY,
    }

    for ref_id, _, inc in refs:
        ref_el = etree.SubElement(signed_info, f"{{{DS}}}Reference")
        ref_el.set("URI", f"#{ref_id}")

        transforms = etree.SubElement(ref_el, f"{{{DS}}}Transforms")
        transform  = etree.SubElement(transforms, f"{{{DS}}}Transform")
        transform.set("Algorithm", "http://www.w3.org/2001/10/xml-exc-c14n#")
        inc_ns2 = etree.SubElement(transform, f"{{{EC}}}InclusiveNamespaces")
        inc_ns2.set("PrefixList", " ".join(inc))

        digest_method = etree.SubElement(ref_el, f"{{{DS}}}DigestMethod")
        digest_method.set("Algorithm", "http://www.w3.org/2001/04/xmlenc#sha256")

        digest_val = etree.SubElement(ref_el, f"{{{DS}}}DigestValue")
        digest_val.text = digest_values[ref_id]

    # ── 4. Sign SignedInfo ────────────────────────────────────────────────
    # Canonicalize SignedInfo (exc-c14n, InclusiveNamespaces: ebs edt idp msa soapenv)
    si_c14n = _c14n(signed_info, inclusive_prefixes=["ebs", "edt", "idp", "msa", "soapenv"])
    sig_value_b64 = _rsa_sha1_sign_b64(private_key, si_c14n)

    sig_val_el = etree.SubElement(sig_el, f"{{{DS}}}SignatureValue")
    sig_val_el.text = sig_value_b64

    # KeyInfo → SecurityTokenReference → Reference to BST
    ki_el = etree.SubElement(sig_el, f"{{{DS}}}KeyInfo")
    ki_el.set("Id", ki_id)
    str_el = etree.SubElement(ki_el, f"{{{WSSE}}}SecurityTokenReference")
    str_el.set(f"{{{WSU}}}Id", str_id)
    ref2 = etree.SubElement(str_el, f"{{{WSSE}}}Reference")
    ref2.set("URI", f"#{bst_id}")
    ref2.set("ValueType",
        "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3")

    # ── 5. Insert Signature into Security header (after BST) ────────────
    sec.append(sig_el)

    # ── 6. Serialize ─────────────────────────────────────────────────────
    return etree.tostring(envelope, xml_declaration=True, encoding="UTF-8", pretty_print=False)


# ── Response decryption (AES-128-CBC) ────────────────────────────────────────

def decrypt_response(response_xml: bytes, private_key) -> bytes:
    """
    Decrypt an EBS encrypted SOAP response.

    The response body contains:
      xenc:EncryptedKey  → CipherData → CipherValue  (RSA-PKCS1 encrypted AES-128 key)
      xenc:EncryptedData → CipherData → CipherValue  (IV[16] || AES-CBC ciphertext)

    Returns the decrypted XML body bytes.
    """
    XENC = "http://www.w3.org/2001/04/xmlenc#"
    root = etree.fromstring(response_xml)

    # Find EncryptedKey CipherValue
    ek_cv = root.find(f".//{{{XENC}}}EncryptedKey/{{{XENC}}}CipherData/{{{XENC}}}CipherValue")
    if ek_cv is None:
        # Response might not be encrypted (error responses often aren't)
        return response_xml

    encrypted_key_bytes = base64.b64decode(ek_cv.text)

    # RSA-PKCS1 decrypt to get AES-128 key (128 bits = 16 bytes)
    aes_key = private_key.decrypt(encrypted_key_bytes, asym_padding.PKCS1v15())

    # Find EncryptedData CipherValue
    ed_cv = root.find(f".//{{{XENC}}}EncryptedData/{{{XENC}}}CipherData/{{{XENC}}}CipherValue")
    if ed_cv is None:
        return response_xml

    cipher_bytes = base64.b64decode(ed_cv.text)

    # First 16 bytes = IV, rest = ciphertext
    iv         = cipher_bytes[:16]
    ciphertext = cipher_bytes[16:]

    # AES-128-CBC decrypt with PKCS5/PKCS7 padding
    cipher    = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    plaintext = decryptor.update(ciphertext) + decryptor.finalize()

    # Strip PKCS7 padding
    pad_len   = plaintext[-1]
    plaintext = plaintext[:-pad_len]

    return plaintext
