/**
 * Session exchange endpoint for Sky Claims.
 * Called by Sky Chamber after email/password sign-in to establish
 * a session on the claims.skyhealthtech.ca domain.
 *
 * Sky Chamber redirects here with access_token + refresh_token in the URL.
 * We call setSession() which sets Supabase cookies on THIS domain,
 * so the middleware will see the session on subsequent requests.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const access_token  = searchParams.get('t');
  const refresh_token = searchParams.get('r');

  if (access_token && refresh_token) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=session_exchange_failed`);
}
