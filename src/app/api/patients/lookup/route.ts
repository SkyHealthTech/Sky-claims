/**
 * GET /api/patients/lookup?phn=<phn>&province=<province>&dob=<YYYYMMDD>
 *
 * Confirms patient identity via the provincial eligibility server and returns
 * the registered name and date of birth. This is the same mechanism all major
 * Canadian billing platforms use for PHN auto-name ("Patient Inquiry").
 *
 * Province routing:
 *   BC  → /api/teleplan/eligibility  (Teleplan E45 — MSP registry)
 *   AB  → /api/ahcip/eligibility     (H-Link — AHCIP registry)
 *   ON  → /api/ohip/eligibility      (MCEDT — OHIP registry)
 *   MB  → /api/epics/eligibility     (EPiCS — Manitoba Health registry)
 *
 * DOB is sent as "00000000" when not yet known; most provincial servers still
 * return the registered name in that case (name mismatch is flagged in
 * clientInstruction). For production accuracy, pass the DOB once known.
 *
 * Returns: { name: string | null, dob: string | null }
 */
import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/dal';

// Map province code → internal eligibility route path
const ELIGIBILITY_ROUTES: Record<string, string> = {
  BC: '/api/teleplan/eligibility',
  AB: '/api/ahcip/eligibility',
  ON: '/api/ohip/eligibility',
  MB: '/api/epics/eligibility',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phn      = searchParams.get('phn')?.replace(/\s/g, '') ?? '';
  const province = (searchParams.get('province') ?? 'BC').toUpperCase();
  // DOB optional — send zeros so the server still returns the registered name
  const dob      = searchParams.get('dob')?.replace(/-/g, '') || '00000000';

  if (!phn) {
    return NextResponse.json({ name: null, dob: null });
  }

  const eligibilityPath = ELIGIBILITY_ROUTES[province] ?? ELIGIBILITY_ROUTES.BC;

  try {
    // Verify the caller is authenticated
    await getCurrentContext();

    const dos = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const base = process.env.NEXT_PUBLIC_APP_URL
      ?? (request.headers.get('origin') ?? 'http://localhost:3000');

    const res = await fetch(`${base}${eligibilityPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phn,
        birthDate: dob,
        dateOfService: dos,
        // BC-specific optional flags (ignored by other province routes)
        checkEyeExam: false,
        checkSubsidy: false,
        province,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ name: null, dob: null });
    }

    const data = await res.json();

    // All provincial routes return { name, birthDate } in a normalised shape
    let dob_iso: string | null = null;
    if (data.birthDate && data.birthDate !== '00000000' && data.birthDate.length === 8) {
      const y = data.birthDate.slice(0, 4);
      const m = data.birthDate.slice(4, 6);
      const d = data.birthDate.slice(6, 8);
      dob_iso = `${y}-${m}-${d}`;
    }

    return NextResponse.json({
      name: data.name ?? null,
      dob:  dob_iso,
    });
  } catch {
    return NextResponse.json({ name: null, dob: null });
  }
}
