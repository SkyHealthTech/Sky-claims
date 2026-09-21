/**
 * POST /api/ahcip/eligibility
 *
 * Alberta AHCIP / H-Link eligibility check.
 * Production: connects to Alberta Health's H-Link XML gateway using
 * the practice's H-Link credentials (stored in practices.hlink_sender_id,
 * practices.hlink_password).
 *
 * Request body: { phn, birthDate, dateOfService, province }
 * Response:     { ok, phn, name, birthDate, gender, eligibleOnDate, ... }
 *
 * In dev / demo mode (no H-Link module) returns a deterministic mock.
 */
import { NextRequest, NextResponse } from 'next/server';

let checkAhcipEligibility: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  checkAhcipEligibility = require('../../../../../../ahcip/eligibility').checkEligibility;
} catch {
  // Module not bundled — will use mock below
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phn, birthDate, dateOfService } = body;

  if (!phn || !birthDate || !dateOfService) {
    return NextResponse.json(
      { error: 'phn, birthDate, and dateOfService are required' },
      { status: 400 },
    );
  }

  // --- Real H-Link path ---
  if (checkAhcipEligibility) {
    try {
      const result = await checkAhcipEligibility({
        uli: phn.replace(/\s|-/g, ''),
        birthDate,
        dateOfService,
      });
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'H-Link error' }, { status: 502 });
    }
  }

  // --- Mock path (dev / demo) ---
  await new Promise((r) => setTimeout(r, 700));

  const eligible = phn !== '9999999999';
  return NextResponse.json({
    ok: true,
    phn,
    name: 'SAMPLE PATIENT',
    birthDate,
    gender: 'F',
    eligibleOnDate: eligible,
    coverageEndDate: eligible ? undefined : '2025-12-31',
    coverageEndReason: eligible ? undefined : 'Coverage not active',
    clientInstruction: eligible ? undefined : 'Patient does not have active AHCIP coverage on this date.',
  });
}
