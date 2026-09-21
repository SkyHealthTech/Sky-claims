/**
 * POST /api/ohip/eligibility
 *
 * Ontario OHIP / MCEDT eligibility check.
 * Production: connects to Service Ontario's MCEDT (Medical Claims Electronic
 * Data Transfer) gateway using the practice's MOH credentials.
 *
 * Request body: { phn, birthDate, dateOfService }
 * Response:     { ok, phn, name, birthDate, gender, eligibleOnDate, versionCode, ... }
 *
 * OHIP version codes are returned by the eligibility check and should be
 * stored on the claim — they are required for submission.
 *
 * In dev / demo mode (no MCEDT module) returns a deterministic mock.
 */
import { NextRequest, NextResponse } from 'next/server';

let checkOhipEligibility: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  checkOhipEligibility = require('../../../../../../ohip/eligibility').checkEligibility;
} catch {
  // Module not bundled — will use mock below
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phn, birthDate, dateOfService } = body;

  if (!phn || !birthDate || !dateOfService) {
    return NextResponse.json(
      { error: 'phn (OHIP number), birthDate, and dateOfService are required' },
      { status: 400 },
    );
  }

  // --- Real MCEDT path ---
  if (checkOhipEligibility) {
    try {
      const result = await checkOhipEligibility({
        healthCardNumber: phn.replace(/\s|-/g, ''),
        birthDate,
        dateOfService,
      });
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'MCEDT error' }, { status: 502 });
    }
  }

  // --- Mock path (dev / demo) ---
  await new Promise((r) => setTimeout(r, 650));

  const eligible = phn !== '9999999999';
  return NextResponse.json({
    ok: true,
    phn,
    name: 'SAMPLE PATIENT',
    birthDate,
    gender: 'M',
    eligibleOnDate: eligible,
    versionCode: 'AC',          // OHIP version code — required on submission
    coverageEndDate: eligible ? undefined : '2025-12-31',
    coverageEndReason: eligible ? undefined : 'Card expired',
    clientInstruction: eligible ? undefined : 'OHIP card is not valid on this date of service.',
  });
}
