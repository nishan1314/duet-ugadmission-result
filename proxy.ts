import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // --- OFFLINE MOCK CHECK ---
  // If the user used the offline mock login, they will have this cookie.
  const mockCookie = request.cookies.get("mock_admin_auth")
  let hasValidMock = false

  if (mockCookie) {
    const val = decodeURIComponent(mockCookie.value)
    if (val === "true") {
      hasValidMock = true
    } else {
      try {
        const mockUser = JSON.parse(val)
        if (mockUser && mockUser.email === "admin@duet.ac.bd") {
          hasValidMock = true
        }
      } catch (e) {
        console.warn("[Proxy] Failed to parse mock_admin_auth cookie:", e)
      }
    }

    if (hasValidMock) {
      // Treat as authenticated mock user
      if (path === '/admin/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/dashboard'
        return NextResponse.redirect(url)
      }
      // Allow access to other /admin routes
      return NextResponse.next()
    } else {
      // Cookie exists but is invalid/corrupt. Clear it to prevent loops!
      console.warn("[Proxy] Invalid mock cookie detected. Clearing cookie to prevent loop.")
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      const response = NextResponse.redirect(url)
      response.cookies.delete("mock_admin_auth")
      return response
    }
  }
  // --------------------------

  const { supabase, response } = createClient(request)

  // Retrieve auth session state securely with a timeout to prevent hanging
  const getUserPromise = supabase.auth.getUser()
  const timeoutPromise = new Promise<{ data: { user: any }; error: any }>((resolve) =>
    setTimeout(() => resolve({ data: { user: null }, error: new Error("getUser timed out") }), 2500)
  )
  
  const {
    data: { user },
  } = await Promise.race([getUserPromise, timeoutPromise])

  // Protect all /admin/* routes except the login page
  if (!user && path.startsWith('/admin') && path !== '/admin/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if logged in admin tries to access the login page
  if (user && path === '/admin/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image assets inside public/
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
