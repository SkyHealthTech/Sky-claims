import { NextResponse } from 'next/server';
import { isMcedtEnabled, listMcedtRemittances } from '@/lib/services/mcedt';

/** GET /api/mcedt/remittances — list available OHIP RA / OBEC files */
export async function GET() {
  if (!isMcedtEnabled()) {
    return NextResponse.json(
      {
        error:  'MCEDT is not yet enabled for this account.',
        code:   'MCEDT_PENDING_MOH_SIGNOFF',
      },
      { status: 503 },
    );
  }

  try {
    const files = await listMcedtRemittances();
    return NextResponse.json({ ok: true, files });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'MCEDT error';
    console.error('[mcedt/remittances]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
