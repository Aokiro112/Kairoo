import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const authRoutes = ['/', '/login', '/register', '/signin', '/signup'];
  if (authRoutes.includes(pathname)) {
    // If explicit logout is requested, allow viewing auth/landing pages
    if (searchParams.get('logout') === 'true') {
      return NextResponse.next();
    }

    const cookieUser = request.cookies.get('kairo_user')?.value;
    if (cookieUser) {
      try {
        const decoded = decodeURIComponent(cookieUser);
        const parsed = JSON.parse(decoded);
        if (parsed && (parsed.email || parsed.name)) {
          const chatUrl = new URL('/chat', request.url);
          const prompt = searchParams.get('prompt');
          if (prompt) {
            chatUrl.searchParams.set('prompt', prompt);
          }
          return NextResponse.redirect(chatUrl);
        }
      } catch {}
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/signin', '/signup'],
};
