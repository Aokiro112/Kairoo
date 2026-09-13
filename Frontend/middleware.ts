import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 MAINTENANCE MODE TOGGLE
// Set to `true` to put the entire site in maintenance mode.
// Set to `false` to restore normal operation.
const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── Maintenance Mode ────────────────────────────
  if (MAINTENANCE_MODE) {
    // Allow the maintenance page itself, static assets, and Next.js internals
    const isAllowed =
      pathname === '/maintenance' ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/icon') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/logo') ||
      pathname.startsWith('/apple-touch-icon') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.woff2') ||
      pathname.endsWith('.woff') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.js');

    if (!isAllowed) {
      const maintenanceUrl = new URL('/maintenance', request.url);
      return NextResponse.redirect(maintenanceUrl, { status: 302 });
    }
    return NextResponse.next();
  }

  // ── Normal Mode (below runs only when MAINTENANCE_MODE = false) ──

  const cookieUser = request.cookies.get('kairo_user')?.value;
  let isAuthenticated = false;

  if (cookieUser) {
    try {
      const decoded = decodeURIComponent(cookieUser);
      if (decoded && decoded !== 'null' && decoded !== 'undefined' && decoded !== '""') {
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === 'object' && (parsed.email || parsed.name)) {
          isAuthenticated = true;
        }
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
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icon.png etc. (browser auto-requests)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};
