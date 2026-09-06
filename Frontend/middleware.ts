import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const cookieUser = request.cookies.get('kairo_user')?.value;
  let isAuthenticated = false;

  if (cookieUser) {
    try {
      const decoded = decodeURIComponent(cookieUser);
      const parsed = JSON.parse(decoded);
      if (parsed && (parsed.email || parsed.name)) {
        isAuthenticated = true;
      }
    } catch {}
  }

  // 1. Protected routes: /chat, /settings
  const isProtectedRoute = pathname.startsWith('/chat') || pathname.startsWith('/settings');
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      const prompt = searchParams.get('prompt');
      if (prompt) {
        loginUrl.searchParams.set('prompt', prompt);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Auth & Landing routes: Redirect logged-in users to /chat
  const isAuthOrLandingRoute = ['/', '/login', '/register', '/signin', '/signup'].includes(pathname);
  if (isAuthOrLandingRoute) {
    if (searchParams.get('logout') === 'true') {
      return NextResponse.next();
    }
    if (isAuthenticated) {
      const chatUrl = new URL('/chat', request.url);
      const prompt = searchParams.get('prompt');
      if (prompt) {
        chatUrl.searchParams.set('prompt', prompt);
      }
      return NextResponse.redirect(chatUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/signin',
    '/signup',
    '/chat',
    '/chat/:path*',
    '/settings',
    '/settings/:path*',
  ],
};
