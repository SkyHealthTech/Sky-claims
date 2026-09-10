import { NextRequest, NextResponse } from 'next/server';

// Teleplan Node client lives in project root teleplan/ folder
// In production, resolve against the monorepo root. For now use a relative path.
// We wrap in try/catch so the app boots even without the module present.
let checkEligibility: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  checkEligibility = require('../../../../../../teleplan/eligibility').checkEligibility;
} catch {
  // Module not bundled — will use mock in dev
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phn, birthDate, dateOfService, checkEyeExam, checkSubsidy } = body;

  if (!phn || !birthDate || !dateOfService) {
    return NextResponse.json({ error: 'phn, birthDate, and dateOfService are required' }, { status: 400 });
  }

  // --- Real Teleplan path ---
  if (checkEligibility) {
    try {
      const result = await checkEligibility({
        phn: phn.replace(/\s/g, ''),
        birthDate,
        dateOfService,
        checkEyeExam: checkEyeExam ?? false,
        checkSubsidy: checkSubsidy ?? false,
      });
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'Teleplan error' }, { status: 502 });
    }
  }

  // --- Mock path (dev / demo) ---
  await new Promise((r) => setTimeout(r, 800)); // simulate latency

  const eligible = phn !== '9999999999'; // any non-sentinel PHN is eligible in mock
  return NextResponse.json({
    ok: true,
    phn,
    name: 'SAMPLE PATIENT',
    birthDate,
    gender: 'M',
    eligibleOnDate: eligible,
    coverageEndDate: eligible ? undefined : '2025-12-31',
    coverageEndReason: eligible ? undefined : 'Coverage expired',
    subsidyPaidToDate: checkSubsidy ? 0 : null,
    subsidyNotInsured: false,
    eyeExamDate: checkEyeExam ? '20240315' : undefined,
    eyeExamNoPayment: false,
    clientInstruction: eligible ? undefined : 'Patient does not have active MSP coverage on this date.',
  });
}
