import { NextRequest, NextResponse } from 'next/server';
import { stripe, getClaimsPriceId, normalisePlanId, type BillingCycle } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const plan  = normalisePlanId(body.plan  ?? 'solo');
  const cycle = (body.cycle ?? 'monthly') as BillingCycle;

  // Get or create Stripe customer, linked to this practice
  const { data: practice } = await (supabase as any)
    .from('practices')
    .select('id, name, stripe_customer_id')
    .eq('owner_id', user.id)
    .single();

  let customerId: string = practice?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: practice?.name ?? user.email,
      metadata: {
        supabase_user_id: user.id,
        practice_id: practice?.id ?? '',
        product: 'sky_claims',
      },
    });
    customerId = customer.id;
    await (supabase as any)
      .from('practices')
      .update({ stripe_customer_id: customerId })
      .eq('owner_id', user.id);
  }

  const origin =
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://claims.skyhealthtech.ca';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: getClaimsPriceId(plan, cycle), quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        plan,
        billing_cycle: cycle,
        practice_id: practice?.id ?? '',
        product: 'sky_claims',
      },
    },
    billing_address_collection: 'required',
    allow_promotion_codes: true,
    success_url: `${origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/billing?checkout=cancelled`,
    metadata: { plan, billing_cycle: cycle },
  });

  return NextResponse.json({ url: session.url });
}
