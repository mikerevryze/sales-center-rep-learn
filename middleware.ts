import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Publicly reachable routes; everything else requires an authenticated session.
const PUBLIC_PREFIXES = ['/signin', '/api/auth', '/_next', '/favicon', '/logo'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.auth;

  if (!session?.user) {
    const signinUrl = new URL('/signin', req.nextUrl);
    signinUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signinUrl);
  }

  // Role gate for /admin — MANAGER or ADMIN only.
  if (pathname.startsWith('/admin')) {
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets and Next internals.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
