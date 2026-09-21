"""
MCEDT method builders — creates the lxml Body element for each of the 8 methods.

EDT Namespace: http://edt.health.ontario.ca/
"""

import base64
from lxml import etree

EDT = "http://edt.health.ontario.ca/"
NS  = {"edt": EDT}


def _edt(tag):
    return f"{{{EDT}}}{tag}"


# ── 1. upload ─────────────────────────────────────────────────────────────────

def build_upload(files: list[dict]) -> etree.Element:
    """
    files: list of {"content": bytes, "resourceType": "CL"|"OB"|"SDC"|"RHB", "description": str}
    Max 5 files per call.
    Returns lxml Element for SOAP Body.

    NOTE: EBS schema uses elementFormDefault="unqualified" — only the outer wrapper
    element carries the edt: namespace; all children are unqualified (no namespace).
    """
    upload_el = etree.Element(_edt("upload"), nsmap={"edt": EDT})
    for f in files[:5]:
        item = etree.SubElement(upload_el, "upload")         # unqualified
        etree.SubElement(item, "content").text      = base64.b64encode(f["content"]).decode()
        if f.get("description"):
            etree.SubElement(item, "description").text = f["description"]
        etree.SubElement(item, "resourceType").text = f["resourceType"]
    return upload_el


# ── 2. submit ────────────────────────────────────────────────────────────────

def build_submit(resource_ids: list[int]) -> etree.Element:
    """Submit uploaded files by resourceID (max 100)."""
    submit_el = etree.Element(_edt("submit"), nsmap={"edt": EDT})
    for rid in resource_ids[:100]:
        etree.SubElement(submit_el, "resourceIDs").text = str(rid)  # unqualified
    return submit_el


# ── 3. download ───────────────────────────────────────────────────────────────

def build_download(resource_ids: list[int]) -> etree.Element:
    """Download reports/files by resourceID (max 5)."""
    dl_el = etree.Element(_edt("download"), nsmap={"edt": EDT})
    for rid in resource_ids[:5]:
        etree.SubElement(dl_el, "resourceIDs").text = str(rid)  # unqualified
    return dl_el


# ── 4. list ───────────────────────────────────────────────────────────────────

def build_list(
    resource_type: str | None = None,
    status: str | None = None,
    page_no: int | None = None
) -> etree.Element:
    """
    List files/reports.
    resource_type: CL, OB, SDC, RHB, RA, BE, ER … (None = all)
    status: UPLOADED, SUBMITTED, WIP, DOWNLOADABLE, APPROVED, DENIED, DELETED (None = all)
    page_no: 1-based page number (50 items/page)
    """
    list_el = etree.Element(_edt("list"), nsmap={"edt": EDT})
    if resource_type:
        etree.SubElement(list_el, "resourceType").text = resource_type  # unqualified
    if status:
        etree.SubElement(list_el, "status").text = status               # unqualified
    if page_no is not None:
        etree.SubElement(list_el, "pageNo").text = str(page_no)         # unqualified
    return list_el


# ── 5. info ───────────────────────────────────────────────────────────────────

def build_info(resource_ids: list[int]) -> etree.Element:
    """Get info for specific resourceIDs (max 100)."""
    info_el = etree.Element(_edt("info"), nsmap={"edt": EDT})
    for rid in resource_ids[:100]:
        etree.SubElement(info_el, "resourceIDs").text = str(rid)  # unqualified
    return info_el


# ── 6. delete ────────────────────────────────────────────────────────────────

def build_delete(resource_ids: list[int]) -> etree.Element:
    """Delete files in UPLOADED status (max 100)."""
    del_el = etree.Element(_edt("delete"), nsmap={"edt": EDT})
    for rid in resource_ids[:100]:
        etree.SubElement(del_el, "resourceIDs").text = str(rid)  # unqualified
    return del_el


# ── 7. update ────────────────────────────────────────────────────────────────

def build_update(updates: list[dict]) -> etree.Element:
    """
    Replace uploaded file content.
    updates: list of {"resourceID": int, "content": bytes, "resourceType": str, "description": str}
    Max 5.
    """
    up_el = etree.Element(_edt("update"), nsmap={"edt": EDT})
    for u in updates[:5]:
        item = etree.SubElement(up_el, "updates")                           # unqualified
        etree.SubElement(item, "content").text      = base64.b64encode(u["content"]).decode()
        if u.get("description"):
            etree.SubElement(item, "description").text = u["description"]
        etree.SubElement(item, "resourceID").text   = str(u["resourceID"])
        etree.SubElement(item, "resourceType").text = u["resourceType"]
    return up_el


# ── 8. getTypeList ────────────────────────────────────────────────────────────

def build_get_type_list() -> etree.Element:
    """Returns the list of resource types the caller can access."""
    return etree.Element(_edt("getTypeList"), nsmap={"edt": EDT})


# ── Response parsers ──────────────────────────────────────────────────────────

EDT_NS = {"edt": EDT}
XENC   = "http://www.w3.org/2001/04/xmlenc#"


def parse_upload_response(parsed_xml) -> list[dict]:
    """Extract list of {resourceID, code, msg, status} from uploadResponse.

    EBS responses use elementFormDefault="unqualified" — response children
    are in no namespace (xmlns=""), so we search by local name only.
    """
    results = []
    if parsed_xml is None:
        return results
    # EBS returns unqualified child elements (no namespace)
    for resp in parsed_xml.iter("response"):
        rid    = resp.findtext("resourceID") or ""
        status = resp.findtext("status") or ""
        result = resp.find("result")
        code   = result.findtext("code") if result is not None else ""
        msg    = result.findtext("msg")  if result is not None else ""
        results.append({"resourceID": rid, "status": status,
                         "code": code or "", "msg": msg or ""})
    return results


def parse_list_response(parsed_xml) -> list[dict]:
    """Extract list of {resourceID, resourceType, status, ...} from listResponse."""
    results = []
    if parsed_xml is None:
        return results
    for item in parsed_xml.iter("resources"):  # unqualified
        results.append({
            "resourceID":       item.findtext("resourceID") or "",
            "resourceType":     item.findtext("resourceType") or "",
            "status":           item.findtext("status") or "",
            "description":      item.findtext("description") or "",
            "createTimestamp":  item.findtext("createTimestamp") or "",
            "modifyTimestamp":  item.findtext("modifyTimestamp") or "",
        })
    return results


def parse_type_list_response(parsed_xml) -> list[dict]:
    """Extract list of {resourceType, accessType} from getTypeListResponse."""
    results = []
    if parsed_xml is None:
        return results
    for item in parsed_xml.iter("resourceTypes"):  # unqualified
        results.append({
            "resourceType": item.findtext("resourceType") or "",
            "accessType":   item.findtext("accessType") or "",
        })
    return results


def extract_fault(response_dict: dict) -> str | None:
    """Extract fault message from parsed XML or pre-set fault field."""
    if response_dict.get("fault"):
        return response_dict["fault"]
    parsed = response_dict.get("parsed")
    if parsed is None:
        return "No response received"
    fault_el = parsed.find(".//{http://schemas.xmlsoap.org/soap/envelope/}Fault")
    if fault_el is not None:
        fc = fault_el.findtext("faultcode") or ""
        fs = fault_el.findtext("faultstring") or ""
        return f"{fc}: {fs}"
    return None
