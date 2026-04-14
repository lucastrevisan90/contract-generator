import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If session exists and current path is login, redirect to dashboard
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If no session and trying to access dashboard routes, redirect to login
  if (!session && req.nextUrl.pathname !== '/login') {
    // Check if it's a dashboard route
    const dashboardRoutes = ['/dashboard', '/templates', '/generator', '/history', '/settings']
    if (dashboardRoutes.some(path => req.nextUrl.pathname.startsWith(path))) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
