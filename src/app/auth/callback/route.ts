/**
 * Auth callback for Sky Claims.
 * Handles code exchange from Supabase OAuth and magic-link flows.
 *
 * Cases:
 *  A. New direct signup (no existing membership) → create practice + membership + provider → /onboarding
 *  B. Invited staff / existing Sky Chamber user  → membership already exists → redirect to /claims
 *  C. Returning user (magic link, password reset) → redirect normally
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
  }

  const cookieStore = cookies();

  // Regular client — auth only
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Admin client — bypasses RLS for practice/membership inserts
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    console.error('sky-claims auth/callback: exchange failed', exchangeErr);
    return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
  }

  // Check for existing membership (admin to bypass RLS)
  const { count } = await supabaseAdmin
    .from('practice_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  const hasNoMembership = (count ?? 0) === 0;
  const meta = user.user_metadata ?? {};

  if (hasNoMembership) {
    // Case A: New standalone Sky Claims signup — bootstrap practice
    const emailDomain  = user.email?.split('@')[1]?.split('.')[0] ?? '';
    const practiceName = meta.practice_name
      ?? (emailDomain ? emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1) + ' Billing' : 'New Practice');
    const providerName = meta.full_name ?? user.email ?? 'Provider';
    const practiceType = meta.practice_type ?? 'optometry';

    const { data: practice, error: practiceErr } = await supabaseAdmin
      .from('practices')
      .insert({
        name: practiceName,
        email: user.email,
        province: 'BC',
        practice_type: practiceType,
        plan: 'professional',
        subscription_status: 'trialing',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (practiceErr) {
      console.error('sky-claims auth/callback: failed to create practice', practiceErr);
      return NextResponse.redirect(`${origin}/onboarding?setup_error=1`);
    }

    if (practice) {
      const practiceId = practice.id;

      await supabaseAdmin.from('practice_memberships').insert({
        practice_id: practiceId,
        user_id: user.id,
        role: 'owner',
        is_active: true,
      });

      await supabaseAdmin.from('providers').insert({
        practice_id: practiceId,
        user_id: user.id,
        name: providerName,
        title: 'OD',
        province: 'BC',
        color: '#7c5cbf',
        is_active: true,
      });
    }

    // New signup always goes to onboarding
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Existing user — redirect normally
  const redirectUrl = next.startsWith('http') ? next : `${origin}${next}`;
  return NextResponse.redirect(redirectUrl);
}
