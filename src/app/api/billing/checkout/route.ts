import { NextRequest, NextResponse } from 'next/server';
import { stripe, getClaimsPriceId, normalisePlanId, type BillingCycle } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function makeClient(serviceRole = false) {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRole
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const supabase = makeClient();
  const admin    = makeClient(true);

  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const user = authData.user;

  const body = await req.json();
  const plan      = normalisePlanId(body.plan  ?? 'solo');
  const cycle     = (body.cycle    ?? 'monthly') as BillingCycle;
  const promoCode = (body.promoCode ?? '') as string;

  // Get practice via membership (admin to bypass RLS)
  const { data: membership } = await admin
    .from('practice_memberships')
    .select('practice_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const practiceId = membership?.practice_id ?? null;

  const { data: practice } = practiceId
    ? await admin.from('practices').select('id, name, stripe_customer_id').eq('id', practiceId).single()
    : { data: null };

  let customerId: string = practice?.stripe_customer_id ?? '';
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: practice?.name ?? user.email,
      metadata: {
        supabase_user_id: user.id,
        practice_id: practiceId ?? '',
        product: 'sky_claims',
      },
    });
    customerId = customer.id;
    if (practiceId) {
      await admin
        .from('practices')
        .update({ stripe_customer_id: customerId })
        .eq('id', practiceId);
    }
  }

  const origin =
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://claims.skyhealthtech.ca';

  // Pre-apply promo code if provided
  let discounts: { promotion_code: string }[] | undefined;
  if (promoCode) {
    try {
      const codes = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      if (codes.data.length > 0) {
        discounts = [{ promotion_code: codes.data[0].id }];
      }
    } catch { /* non-fatal */ }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: getClaimsPriceId(plan, cycle), quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        plan,
        billing_cycle: cycle,
        practice_id: practiceId ?? '',
        product: 'sky_claims',
      },
    },
    billing_address_collection: 'required',
    allow_promotion_codes: !discounts,
    ...(discounts ? { discounts } : {}),
    success_url: `${origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/billing?checkout=cancelled`,
    metadata: { plan, billing_cycle: cycle, practice_id: practiceId ?? '' },
  });

  return NextResponse.json({ url: session.url });
}
