import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC = ['/login', '/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (c: { name: string; value: string; options?: Record<string, unknown> }[]) => c.forEach(({ name, value, options }) => response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])) } },
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect('https://app.skyhealthtech.ca/login?redirect=claims');
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'] };
