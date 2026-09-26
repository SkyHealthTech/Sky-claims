import { NextRequest, NextResponse } from 'next/server';
import { isMcedtEnabled, submitMcedtClaims } from '@/lib/services/mcedt';

/**
 * POST /api/mcedt/submit
 *
 * Feature-flagged. Returns 503 if MCEDT_ENABLED is not set.
 * MCEDT is conformance-complete (85/85) but awaiting MOH official sign-off.
 *
 * Body: { claims: ClaimRow[] }
 */
export async function POST(req: NextRequest) {
  // ── Feature flag check ───────────────────────────────────────────────────
  if (!isMcedtEnabled()) {
    return NextResponse.json(
      {
        error:  'MCEDT is not yet enabled for this account.',
        detail: 'Ontario MCEDT conformance is complete (85/85 tests). '
              + 'This integration will be activated automatically once MOH official sign-off is received.',
        code:   'MCEDT_PENDING_MOH_SIGNOFF',
      },
      { status: 503 },
    );
  }

  const body = await req.json();
  const { claims } = body;

  if (!Array.isArray(claims) || claims.length === 0) {
    return NextResponse.json({ error: 'claims array is required' }, { status: 400 });
  }

  // Only accept Ontario claims
  const ontarioClaims = claims.filter((c: { province?: string }) => c.province === 'ON');
  if (ontarioClaims.length === 0) {
    return NextResponse.json({ error: 'No Ontario (ON) claims in payload' }, { status: 400 });
  }

  try {
    const result = await submitMcedtClaims(ontarioClaims);
    return NextResponse.json({
      ok:          true,
      batchRef:    `MCEDT-${result.resourceId}`,
      resourceId:  result.resourceId,
      claimCount:  result.claimCount,
      uploadedAt:  result.uploadedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'MCEDT submission error';
    console.error('[mcedt/submit]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
