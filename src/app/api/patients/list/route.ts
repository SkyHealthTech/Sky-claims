/**
 * GET /api/patients/list
 *
 * Returns the known patient list (aggregated from claims) for the current practice.
 * Used by the batch billing page to populate the patient picker.
 */
import { NextResponse } from 'next/server';
import { getCurrentContext, getPatients } from '@/lib/dal';

export async function GET() {
  try {
    const { practiceId } = await getCurrentContext();
    const patients = await getPatients(practiceId);
    return NextResponse.json(patients);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
