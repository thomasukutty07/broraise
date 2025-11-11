import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthUser } from './lib/auth';

// Public routes that don't require authentication
// These routes should redirect to dashboard if user is already logged in
const publicRoutes = [
  '/login',
  '/register',
  '/admin/login',
  '/',
  '/api/auth/login',
  '/api/auth/register',
];

// Admin-only routes
const adminOnlyRoutes = [
  '/admin/create-admin',
  '/settings',
  '/api/settings',
  '/api/users',
  '/api/categories',
  '/api/debug-socket',
  '/api/test-db',
  '/api/test-notification',
  '/api/test-socket',
];

// Admin/Management routes
const adminManagementRoutes = [
  '/analytics',
  '/api/analytics',
  '/api/complaints/export',
  '/api/complaints/bulk',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = getAuthUser(request);

  // If user is logged in and tries to access login/register/admin login, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/admin/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow public routes (but only if user is not logged in, handled above)
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/dashboard') || 
      pathname.startsWith('/complaints') || pathname.startsWith('/profile') ||
      pathname.startsWith('/users') || pathname.startsWith('/categories') ||
      pathname.startsWith('/analytics') || pathname.startsWith('/settings') ||
      pathname.startsWith('/admin')) {
    
    // If no user, redirect to login (for pages) or return 401 (for API)
    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin-only routes
    if (adminOnlyRoutes.some(route => pathname === route || pathname.startsWith(route))) {
      if (user.role !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check admin/management routes
    if (adminManagementRoutes.some(route => pathname === route || pathname.startsWith(route))) {
      if (user.role !== 'admin' && user.role !== 'management') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

