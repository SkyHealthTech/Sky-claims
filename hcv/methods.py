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
HCV_NS = "http://hcv.ebs.health.ontario.ca/"


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

    for req in requests[:100]:
        input_el = etree.SubElement(validate_el, _hcv("inputs"))
        etree.SubElement(input_el, _hcv("healthNumber")).text = req["healthNumber"].replace(" ", "")
        vc = req.get("versionCode", "")
        etree.SubElement(input_el, _hcv("versionCode")).text = vc.strip()

        for fsc in (req.get("feeServiceCodes") or [])[:5]:
            etree.SubElement(input_el, _hcv("feeServiceCodes")).text = fsc

        locale = req.get("locale", "en")
        etree.SubElement(input_el, _hcv("locale")).text = locale

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

    for item in parsed_xml.iter(f"{{{HCV_NS}}}results"):
        rec = {
            "auditUID":         item.findtext(f"{{{HCV_NS}}}auditUID") or "",
            "responseCode":     item.findtext(f"{{{HCV_NS}}}responseCode") or "",
            "responseActionEn": item.findtext(f"{{{HCV_NS}}}responseActionEnglishText") or "",
            "responseActionFr": item.findtext(f"{{{HCV_NS}}}responseActionFrenchText") or "",
            "responseID":       item.findtext(f"{{{HCV_NS}}}responseID") or "",
            "responseDescEn":   item.findtext(f"{{{HCV_NS}}}responseDescriptionEnglishText") or "",
            "responseDescFr":   item.findtext(f"{{{HCV_NS}}}responseDescriptionFrenchText") or "",
            "birthDate":        item.findtext(f"{{{HCV_NS}}}birthDate") or "",
            "firstName":        item.findtext(f"{{{HCV_NS}}}firstName") or "",
            "lastName":         item.findtext(f"{{{HCV_NS}}}lastName") or "",
            "gender":           item.findtext(f"{{{HCV_NS}}}gender") or "",
            "feeServices":      [],
        }
        for fs in item.iter(f"{{{HCV_NS}}}feeService"):
            rec["feeServices"].append({
                "code":          fs.findtext(f"{{{HCV_NS}}}feeServiceCode") or "",
                "date":          fs.findtext(f"{{{HCV_NS}}}feeServiceDate") or "",
                "responseCode":  fs.findtext(f"{{{HCV_NS}}}feeServiceResponseCode") or "",
                "responseDescEn": fs.findtext(f"{{{HCV_NS}}}feeServiceResponseEnglishDescription") or "",
            })
        results.append(rec)

    return results
