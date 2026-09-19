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
    """
    upload_el = etree.Element(_edt("upload"), nsmap={"edt": EDT})
    for f in files[:5]:
        item = etree.SubElement(upload_el, _edt("upload"))
        etree.SubElement(item, _edt("content")).text      = base64.b64encode(f["content"]).decode()
        if f.get("description"):
            etree.SubElement(item, _edt("description")).text = f["description"]
        etree.SubElement(item, _edt("resourceType")).text = f["resourceType"]
    return upload_el


# ── 2. submit ────────────────────────────────────────────────────────────────

def build_submit(resource_ids: list[int]) -> etree.Element:
    """Submit uploaded files by resourceID (max 100)."""
    submit_el = etree.Element(_edt("submit"), nsmap={"edt": EDT})
    for rid in resource_ids[:100]:
        etree.SubElement(submit_el, _edt("resourceIDs")).text = str(rid)
    return submit_el


# ── 3. download ───────────────────────────────────────────────────────────────

def build_download(resource_ids: list[int]) -> etree.Element:
    """Download reports/files by resourceID (max 5)."""
    dl_el = etree.Element(_edt("download"), nsmap={"edt": EDT})
    for rid in resource_ids[:5]:
        etree.SubElement(dl_el, _edt("resourceIDs")).text = str(rid)
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
        etree.SubElement(list_el, _edt("resourceType")).text = resource_type
    if status:
        etree.SubElement(list_el, _edt("status")).text = status
    if page_no is not None:
        etree.SubElement(list_el, _edt("pageNo")).text = str(page_no)
    return list_el


# ── 5. info ───────────────────────────────────────────────────────────────────

def build_info(resource_ids: list[int]) -> etree.Element:
    """Get info for specific resourceIDs (max 100)."""
    info_el = etree.Element(_edt("info"), nsmap={"edt": EDT})
    for rid in resource_ids[:100]:
        etree.SubElement(info_el, _edt("resourceIDs")).text = str(rid)
    return info_el


# ── 6. delete ────────────────────────────────────────────────────────────────

def build_delete(resource_ids: list[int]) -> etree.Element:
    """Delete files in UPLOADED status (max 100)."""
    del_el = etree.Element(_edt("delete"), nsmap={"edt": EDT})
    for rid in resource_ids[:100]:
        etree.SubElement(del_el, _edt("resourceIDs")).text = str(rid)
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
        item = etree.SubElement(up_el, _edt("updates"))
        etree.SubElement(item, _edt("content")).text      = base64.b64encode(u["content"]).decode()
        if u.get("description"):
            etree.SubElement(item, _edt("description")).text = u["description"]
        etree.SubElement(item, _edt("resourceID")).text   = str(u["resourceID"])
        etree.SubElement(item, _edt("resourceType")).text = u["resourceType"]
    return up_el


# ── 8. getTypeList ────────────────────────────────────────────────────────────

def build_get_type_list() -> etree.Element:
    """Returns the list of resource types the caller can access."""
    return etree.Element(_edt("getTypeList"), nsmap={"edt": EDT})


# ── Response parsers ──────────────────────────────────────────────────────────

EDT_NS = {"edt": EDT}
XENC   = "http://www.w3.org/2001/04/xmlenc#"


def parse_upload_response(parsed_xml) -> list[dict]:
    """Extract list of {resourceID, code, msg, status} from uploadResponse."""
    results = []
    if parsed_xml is None:
        return results
    # Find return/response elements
    for resp in parsed_xml.iter(f"{{{EDT}}}response"):
        rid    = resp.findtext(f"{{{EDT}}}resourceID") or ""
        status = resp.findtext(f"{{{EDT}}}status") or ""
        code   = resp.findtext(f"{{{EDT}}}result/{{{EDT}}}code") or ""
        msg    = resp.findtext(f"{{{EDT}}}result/{{{EDT}}}msg") or ""
        results.append({"resourceID": rid, "status": status, "code": code, "msg": msg})
    return results


def parse_list_response(parsed_xml) -> list[dict]:
    """Extract list of {resourceID, resourceType, status, createTimestamp, modifyTimestamp}."""
    results = []
    if parsed_xml is None:
        return results
    for item in parsed_xml.iter(f"{{{EDT}}}resources"):
        results.append({
            "resourceID":       item.findtext(f"{{{EDT}}}resourceID") or "",
            "resourceType":     item.findtext(f"{{{EDT}}}resourceType") or "",
            "status":           item.findtext(f"{{{EDT}}}status") or "",
            "description":      item.findtext(f"{{{EDT}}}description") or "",
            "createTimestamp":  item.findtext(f"{{{EDT}}}createTimestamp") or "",
            "modifyTimestamp":  item.findtext(f"{{{EDT}}}modifyTimestamp") or "",
        })
    return results


def parse_type_list_response(parsed_xml) -> list[dict]:
    """Extract list of {resourceType, accessType} from getTypeListResponse."""
    results = []
    if parsed_xml is None:
        return results
    for item in parsed_xml.iter(f"{{{EDT}}}resourceTypes"):
        results.append({
            "resourceType": item.findtext(f"{{{EDT}}}resourceType") or "",
            "accessType":   item.findtext(f"{{{EDT}}}accessType") or "",
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
