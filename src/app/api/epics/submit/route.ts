import { NextRequest, NextResponse } from 'next/server';
import { isEpicsEnabled, submitEpicsClaims } from '@/lib/services/epics';

/**
 * POST /api/epics/submit
 *
 * Manitoba EPiCS claim submission.
 * Returns 503 until EPICS_ENABLED=true is set (pending UAT credential issuance).
 */
export async function POST(req: NextRequest) {
  if (!isEpicsEnabled()) {
    return NextResponse.json(
      {
        error:  'Manitoba EPiCS is not yet active for this account.',
        detail: 'EPiCS UAT onboarding request has been submitted to Manitoba Health. '
              + 'This integration will be activated once UAT credentials are issued.',
        code:   'EPICS_UAT_PENDING',
      },
      { status: 503 },
    );
  }

  const body = await req.json();
  const { claims } = body;

  if (!Array.isArray(claims) || claims.length === 0) {
    return NextResponse.json({ error: 'claims array is required' }, { status: 400 });
  }

  const mbClaims = claims.filter((c: { province?: string }) => c.province === 'MB');
  if (mbClaims.length === 0) {
    return NextResponse.json({ error: 'No Manitoba (MB) claims in payload' }, { status: 400 });
  }

  try {
    const result = await submitEpicsClaims(mbClaims);
    return NextResponse.json({
      ok:         true,
      batchRef:   result.batchRef,
      claimCount: result.claimCount,
      uploadedAt: result.uploadedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'EPiCS submission error';
    console.error('[epics/submit]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
