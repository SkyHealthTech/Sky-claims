import { NextRequest, NextResponse } from 'next/server';

let getRemittances: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  getRemittances = require('../../../../../../teleplan/remittances').getRemittances;
} catch {
  // Module not bundled — mock in dev
}

export async function GET(_req: NextRequest) {
  if (getRemittances) {
    try {
      const result = await getRemittances();
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'Teleplan error' }, { status: 502 });
    }
  }
  // Mock
  return NextResponse.json({ ok: true, remittances: [], message: 'No new remittances (mock mode)' });
}
