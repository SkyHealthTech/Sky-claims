"""
HCV method builder — creates the validate request element for the SOAP body.

HCV Namespace: http://hcv.ebs.health.ontario.ca/  (verify from WSDL)
WSDL: https://ws.conf.ebs.health.gov.on.ca:1444/HCVService/HCValidationService?wsdl

Input fields (per EBS-HCV SOAP Specification v4.3):
  healthNumber:   10-digit string, pattern [1-9]\\d{9}
  versionCode:    0-2 alpha chars, pattern [A-Z]{0,2}
  feeServiceCodes: up to 5, pattern [A-Z]\\d{3}
  locale:         "en" | "fr" | "" (default en)

Up to 100 health number requests per SOAP call.
"""

from lxml import etree

# The HCV service namespace — from example WSDL (to be confirmed against actual WSDL)
HCV_NS = "http://hcv.health.ontario.ca/"   # NOTE: no ".ebs." — confirmed from WSDL schema error


def _hcv(tag):
    return f"{{{HCV_NS}}}{tag}"


def build_validate(requests: list[dict]) -> etree.Element:
    """
    Build the validate body element.

    requests: list of dicts with keys:
        healthNumber    (required, 10 digits as string)
        versionCode     (optional, 0-2 uppercase letters)
        feeServiceCodes (optional, list of up to 5 strings like "A110")
        locale          (optional, "en" | "fr", default "en")

    Returns lxml Element to place in SOAP Body.
    """
    validate_el = etree.Element(
        _hcv("validate"),
        nsmap={"hcv": HCV_NS}
    )

    # HCV schema (confirmed from WSDL errors):
    #   <hcv:validate>
    #     <requests>                     ← ONE wrapper for all HNs
    #       <hcvRequest>
    #         <healthNumber/> <versionCode/> [<feeServiceCodes/>...]
    #       </hcvRequest>
    #       <hcvRequest>...</hcvRequest>  ← additional HNs go here, not in new <requests>
    #     </requests>
    #   </hcv:validate>
    requests_el = etree.SubElement(validate_el, "requests")  # single wrapper

    for req in requests[:100]:
        hcv_req_el = etree.SubElement(requests_el, "hcvRequest")
        etree.SubElement(hcv_req_el, "healthNumber").text = req["healthNumber"].replace(" ", "")
        vc = req.get("versionCode", "")
        etree.SubElement(hcv_req_el, "versionCode").text = vc.strip()

        for fsc in (req.get("feeServiceCodes") or [])[:5]:
            etree.SubElement(hcv_req_el, "feeServiceCodes").text = fsc
        # locale is NOT a valid field inside hcvRequest per HCV WSDL schema

    return validate_el


def parse_validate_response(parsed_xml) -> list[dict]:
    """
    Parse a validateResponse element.
    Returns list of dicts per health number:
    {
        auditUID, responseCode, responseActionEn, responseActionFr,
        responseID, responseDescEn, responseDescFr,
        birthDate, firstName, lastName, gender,
        feeServices: [{code, date, responseCode, responseDescEn}]
    }
    """
    results = []
    if parsed_xml is None:
        return results

    # Decrypted HCV response structure (confirmed from actual decrypted XML):
    #   <results>                          ← outer wrapper
    #     <auditUID>...</auditUID>
    #     <results>                        ← one per health number
    #       <healthNumber/> <responseCode/> <responseID/>
    #       <responseAction/> <responseDescription/>
    #       <firstName/> <lastName/> <birthDate/> <gender/>
    #       <feeService>...</feeService>   ← if fee service codes requested
    #     </results>
    #   </results>

    # Find outer wrapper (root or first results child)
    outer = parsed_xml if parsed_xml.tag == "results" else parsed_xml.find(".//results")
    if outer is None:
        return results

    audit_uid = outer.findtext("auditUID") or ""

    # Each inner <results> is one health number response
    for item in outer.findall("results"):
        rec = {
            "auditUID":         audit_uid,
            "responseCode":     item.findtext("responseCode") or "",
            "responseActionEn": item.findtext("responseAction") or "",
            "responseActionFr": item.findtext("responseActionFr") or "",
            "responseID":       item.findtext("responseID") or "",
            "responseDescEn":   item.findtext("responseDescription") or "",
            "responseDescFr":   item.findtext("responseDescriptionFr") or "",
            "birthDate":        item.findtext("birthDate") or "",
            "firstName":        item.findtext("firstName") or "",
            "lastName":         item.findtext("lastName") or "",
            "gender":           item.findtext("gender") or "",
            "feeServices":      [],
        }
        for fs in item.findall("feeService"):
            rec["feeServices"].append({
                "code":          fs.findtext("feeServiceCode") or "",
                "date":          fs.findtext("feeServiceDate") or "",
                "responseCode":  fs.findtext("feeServiceResponseCode") or "",
                "responseDescEn": fs.findtext("feeServiceResponseDescription") or "",
            })
        results.append(rec)

    return results
