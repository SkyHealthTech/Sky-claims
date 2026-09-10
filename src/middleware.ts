import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC = ['/login', '/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const response = NextResponse.next();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookieHandler = {
    getAll: () => request.cookies.getAll(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAll: (cookies: any[]) => {
      cookies.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
        response.cookies.set(name, value, options)
      );
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieHandler },
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect('https://app.skyhealthtech.ca/login?redirect=claims');
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'] };
