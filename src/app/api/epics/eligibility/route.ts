/**
 * POST /api/epics/eligibility
 *
 * Manitoba MHSAL / EPiCS eligibility check.
 * Production: connects to Manitoba Health's EPiCS (Electronic Processing
 * and Information Claims System) gateway using the practice's EPiCS credentials.
 *
 * Request body: { phn, birthDate, dateOfService }
 * Response:     { ok, phn, name, birthDate, gender, eligibleOnDate, ... }
 *
 * In dev / demo mode (no EPiCS module) returns a deterministic mock.
 */
import { NextRequest, NextResponse } from 'next/server';

let checkEpicsEligibility: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  checkEpicsEligibility = require('../../../../../../epics/eligibility').checkEligibility;
} catch {
  // Module not bundled — will use mock below
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phn, birthDate, dateOfService } = body;

  if (!phn || !birthDate || !dateOfService) {
    return NextResponse.json(
      { error: 'phn (PHIN), birthDate, and dateOfService are required' },
      { status: 400 },
    );
  }

  // --- Real EPiCS path ---
  if (checkEpicsEligibility) {
    try {
      const result = await checkEpicsEligibility({
        phin: phn.replace(/\s|-/g, ''),
        birthDate,
        dateOfService,
      });
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'EPiCS error' }, { status: 502 });
    }
  }

  // --- Mock path (dev / demo) ---
  await new Promise((r) => setTimeout(r, 750));

  const eligible = phn !== '9999999999';
  return NextResponse.json({
    ok: true,
    phn,
    name: 'SAMPLE PATIENT',
    birthDate,
    gender: 'F',
    eligibleOnDate: eligible,
    coverageEndDate: eligible ? undefined : '2025-12-31',
    coverageEndReason: eligible ? undefined : 'Coverage lapsed',
    clientInstruction: eligible ? undefined : 'Patient does not have active Manitoba Health coverage on this date.',
  });
}
