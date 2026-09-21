/**
 * GET /api/practice/province
 *
 * Returns the billing province set on the practice record during onboarding.
 * Used by the new claim form and batch billing page to default to the
 * practitioner's home province instead of relying solely on localStorage.
 */
import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { practiceId } = await getCurrentContext();
    const supabase = await createClient();

    const { data } = await supabase
      .from('practices')
      .select('province')
      .eq('id', practiceId)
      .single();

    return NextResponse.json({ province: data?.province ?? 'BC' });
  } catch {
    return NextResponse.json({ province: 'BC' });
  }
}
