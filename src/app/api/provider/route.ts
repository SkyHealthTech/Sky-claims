import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentContext } from '@/lib/dal';

export type ProviderProfile = {
  id?: string;
  first_name: string;
  last_name: string;
  designation: string;
  practitioner_number: string;   // MSP payee / provincial provider number
  discipline_code: string;
  college: string;
  registration_number: string;
  payee_number: string;          // Teleplan MSP payee number (BC)
  prac_id: string;               // Teleplan practice ID
  ohip_billing_number: string;   // OHIP billing number (ON)
  business_arrangement: string;  // Teleplan business arrangement
};

/** GET /api/provider — return the current user's provider profile */
export async function GET() {
  try {
    const ctx = await getCurrentContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('providers')
      .select(`
        id, first_name, last_name, designation,
        practitioner_number, discipline_code, college, registration_number,
        payee_number, prac_id, ohip_billing_number, business_arrangement
      `)
      .eq('practice_id', ctx.practiceId)
      .eq('user_id', ctx.userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data ?? null });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

/** PUT /api/provider — upsert the current user's provider profile */
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getCurrentContext();
    const supabase = await createClient();
    const body: Partial<ProviderProfile> = await req.json();

    // Check if a row already exists
    const { data: existing } = await supabase
      .from('providers')
      .select('id')
      .eq('practice_id', ctx.practiceId)
      .eq('user_id', ctx.userId)
      .maybeSingle();

    const payload = {
      practice_id:          ctx.practiceId,
      user_id:              ctx.userId,
      first_name:           body.first_name           ?? '',
      last_name:            body.last_name            ?? '',
      designation:          body.designation          ?? '',
      practitioner_number:  body.practitioner_number  ?? '',
      discipline_code:      body.discipline_code      ?? '',
      college:              body.college              ?? '',
      registration_number:  body.registration_number  ?? '',
      payee_number:         body.payee_number         ?? '',
      prac_id:              body.prac_id              ?? '',
      ohip_billing_number:  body.ohip_billing_number  ?? '',
      business_arrangement: body.business_arrangement ?? '',
      updated_at:           new Date().toISOString(),
    };

    let error;
    if (existing?.id) {
      ({ error } = await supabase
        .from('providers')
        .update(payload)
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase
        .from('providers')
        .insert(payload));
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
