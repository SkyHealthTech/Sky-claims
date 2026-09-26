import { NextResponse } from 'next/server';
import { isEpicsEnabled, listEpicsRemittances } from '@/lib/services/epics';

/** GET /api/epics/remittances — list Manitoba EPiCS remittance files */
export async function GET() {
  if (!isEpicsEnabled()) {
    return NextResponse.json(
      { error: 'Manitoba EPiCS not yet active.', code: 'EPICS_UAT_PENDING' },
      { status: 503 },
    );
  }

  try {
    const files = await listEpicsRemittances();
    return NextResponse.json({ ok: true, files });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'EPiCS error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
