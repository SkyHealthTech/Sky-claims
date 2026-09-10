import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: practice } = await (supabase as any)
    .from('practices')
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .single();

  if (!practice?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No active subscription found. Please subscribe first.' },
      { status: 404 },
    );
  }

  const origin =
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://claims.skyhealthtech.ca';

  const session = await stripe.billingPortal.sessions.create({
    customer: practice.stripe_customer_id,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
