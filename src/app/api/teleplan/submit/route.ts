import { NextRequest, NextResponse } from 'next/server';

let submitClaims: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  submitClaims = require('../../../../../../teleplan/claims').submitClaims;
} catch {
  // Module not bundled — will use mock in dev
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { claims } = body;

  if (!Array.isArray(claims) || claims.length === 0) {
    return NextResponse.json({ error: 'claims array is required' }, { status: 400 });
  }

  // --- Real Teleplan path ---
  if (submitClaims) {
    try {
      const result = await submitClaims(claims);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'Teleplan submission error' }, { status: 502 });
    }
  }

  // --- Mock path ---
  await new Promise((r) => setTimeout(r, 1200));

  const submitted = claims.map((c: any, i: number) => ({
    claimId: c.id ?? `CLM-MOCK-${i}`,
    sequenceNumber: `${Date.now()}${i}`,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  }));

  return NextResponse.json({
    ok: true,
    batchRef: `BATCH-${Date.now()}`,
    submittedCount: submitted.length,
    claims: submitted,
  });
}
