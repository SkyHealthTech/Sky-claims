import { NextResponse } from 'next/server';

let ahcipService: typeof import('@/lib/services/ahcip') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ahcipService = require('@/lib/services/ahcip');
} catch {
  // hlink module not available
}

/** GET /api/ahcip/remittances — list available ARD / batch balance files */
export async function GET() {
  if (ahcipService) {
    try {
      const files = await ahcipService.listAhcipRemittances();
      return NextResponse.json({ ok: true, files });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AHCIP SFTP error';
      console.error('[ahcip/remittances]', msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  // Mock — return a plausible list for dev
  return NextResponse.json({
    ok: true,
    files: [
      { name: 'HZV000565.ARD', size: 4096, modifiedAt: new Date(Date.now() - 86_400_000).toISOString() },
      { name: 'HZV000566.ARD', size: 2048, modifiedAt: new Date(Date.now() - 43_200_000).toISOString() },
    ],
    _mock: true,
  });
}
