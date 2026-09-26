import { NextRequest, NextResponse } from 'next/server';

// Lazy-load the AHCIP service (wraps hlink/ CommonJS module)
let ahcipService: typeof import('@/lib/services/ahcip') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ahcipService = require('@/lib/services/ahcip');
} catch {
  // hlink module not bundled — will use mock path
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { claims } = body;

  if (!Array.isArray(claims) || claims.length === 0) {
    return NextResponse.json({ error: 'claims array is required' }, { status: 400 });
  }

  // ── Real AHCIP H-Link path ────────────────────────────────────────────────
  if (ahcipService) {
    try {
      const result = await ahcipService.submitAhcipClaims(claims);
      return NextResponse.json({
        ok: true,
        batchRef:   result.batchRef,
        filename:   result.filename,
        claimCount: result.claimCount,
        uploadedAt: result.uploadedAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AHCIP submission error';
      console.error('[ahcip/submit]', msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  // ── Mock path (dev / missing hlink module) ────────────────────────────────
  await new Promise((r) => setTimeout(r, 800));

  const batchNum = 570 + Math.floor(Math.random() * 10);
  return NextResponse.json({
    ok:         true,
    batchRef:   `AHCIP-HZV${String(batchNum).padStart(6, '0')}`,
    filename:   `HZV${String(batchNum).padStart(6, '0')}.dat`,
    claimCount: claims.length,
    uploadedAt: new Date().toISOString(),
    _mock:      true,
  });
}
