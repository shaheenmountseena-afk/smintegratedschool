import { NextResponse } from 'next/server'
import {
  verifyAdminRequest,
  verifyAdminToken,
  createAdminSessionCookie,
  revokeAdminSessions,
} from '@/lib/firebase/auth-server'
import { authSessionLimiter, getClientIp } from '@/lib/rate-limit'
import { verifyCsrfOrigin, checkPayloadSize } from '@/lib/security'

export async function POST(request: Request) {
  try {
    // 1. CSRF Protection
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden: Invalid request origin' }, { status: 403 })
    }

    // 2. Rate Limiting Protection (Brute Force / Flooding Prevention)
    const clientIp = getClientIp(request)
    const rateLimit = authSessionLimiter.check(clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rateLimit.retryAfterSeconds || 60} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) },
        }
      )
    }

    // 3. Payload size limit (20 KB max)
    if (!checkPayloadSize(request, 20480)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const { idToken } = await request.json().catch(() => ({}))

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid idToken' }, { status: 400 })
    }

    // 4. Verify token validity and administrator authorization
    const authResult = await verifyAdminToken(idToken)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // 5. Generate secure Firebase Session Cookie (5-day lifetime)
    const sessionCookie = await createAdminSessionCookie(idToken)
    const cookieValue = sessionCookie || idToken
    const cookieMaxAge = sessionCookie ? 5 * 24 * 60 * 60 : 60 * 60 // 5 days for session cookie, 1 hr for ID token

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
    })

    // 6. Set secure, HttpOnly, SameSite=Lax session cookie
    response.cookies.set({
      name: '__session',
      value: cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: cookieMaxAge,
    })

    return response
  } catch (err: any) {
    console.error('[Admin Session POST] Error:', err?.message)
    return NextResponse.json({ error: 'Failed to authenticate session' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ authenticated: false, error: authResult.error }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: authResult.user,
    })
  } catch (err: any) {
    console.error('[Admin Session GET] Error:', err?.message)
    return NextResponse.json({ authenticated: false, error: 'Authentication check failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  // Invalidate server-side session and revoke refresh tokens if user is identified
  try {
    const authResult = await verifyAdminRequest(request)
    if (authResult.success && authResult.user?.uid) {
      await revokeAdminSessions(authResult.user.uid)
    }
  } catch {
    // Non-blocking revocation on logout
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully. All sessions revoked.' })
  response.cookies.set({
    name: '__session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
