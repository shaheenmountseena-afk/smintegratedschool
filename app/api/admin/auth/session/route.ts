import { NextResponse } from 'next/server'
import { verifyAdminRequest, verifyAdminToken } from '@/lib/firebase/auth-server'

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json().catch(() => ({}))

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
    }

    const authResult = await verifyAdminToken(idToken)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
    })

    // Set secure __session cookie (matches verifyAdminRequest check)
    response.cookies.set({
      name: '__session',
      value: idToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to authenticate session' }, { status: 500 })
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
    return NextResponse.json({ authenticated: false, error: err?.message }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
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
