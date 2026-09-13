import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ active: false }, { status: 401 });
    }

    const { data: practice } = await (supabase as any)
      .from('practices')
      .select('stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (!practice?.stripe_customer_id) {
      return NextResponse.json({ active: false });
    }

    // Check for active subscriptions
    const subs = await stripe.subscriptions.list({
      customer: practice.stripe_customer_id,
      status: 'all',
      limit: 5,
    });

    const activeSub = subs.data.find(s =>
      ['active', 'trialing', 'past_due'].includes(s.status)
    );

    if (!activeSub) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      status: activeSub.status,
      plan: activeSub.metadata?.plan ?? 'solo',
      trialEnd: activeSub.trial_end,
      currentPeriodEnd: activeSub.current_period_end,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
