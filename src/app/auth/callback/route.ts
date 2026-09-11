/**
 * Auth callback for Sky Claims.
 * Handles the code exchange from Supabase OAuth and magic-link flows.
 * Because this runs on claims.skyhealthtech.ca, session cookies are set
 * on this domain and the middleware can see them.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectUrl = next.startsWith('http') ? next : `${origin}${next}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
