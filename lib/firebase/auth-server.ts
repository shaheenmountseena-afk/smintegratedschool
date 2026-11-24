import 'server-only'
import { getAdminAuth, getAdminFirestore } from './admin'

export interface AdminAuthUser {
  uid: string
  email: string
  displayName?: string
  role: 'superadmin' | 'admin'
  isActive: boolean
}

export type VerifyAdminResult =
  | { success: true; user: AdminAuthUser }
  | { success: false; error: string; status: number }

/**
 * Extracts and verifies the Firebase ID token from an incoming HTTP Request.
 * Verifies:
 * 1. Token signature and validity via Firebase Admin SDK
 * 2. Administrator whitelist in Firestore 'admins' collection
 * 3. Active account status (isActive: true)
 *
 * Never trusts client-side admin assertions.
 */
export async function verifyAdminRequest(request: Request): Promise<VerifyAdminResult> {
  const authHeader = request.headers.get('authorization')
  let idToken = ''

  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.substring(7).trim()
  } else {
    // Also check session cookie if present
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/)
      if (match) {
        idToken = match[1]
      }
    }
  }

  if (!idToken) {
    return { success: false, error: 'Unauthorized: Missing authentication token', status: 401 }
  }

  return verifyAdminToken(idToken)
}

/**
 * Verifies a raw Firebase ID token and checks authorization against the 'admins' collection.
 */
export async function verifyAdminToken(idToken: string): Promise<VerifyAdminResult> {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminFirestore()

  if (!adminAuth || !adminDb) {
    return {
      success: false,
      error: 'Server configuration error: Firebase Admin is not configured',
      status: 503,
    }
  }

  let decodedToken
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken, false)
  } catch (error: any) {
    const isExpired = error?.code === 'auth/id-token-expired'
    return {
      success: false,
      error: isExpired ? 'Unauthorized: Token expired' : 'Unauthorized: Invalid authentication token',
      status: 401,
    }
  }

  const { uid, email } = decodedToken

  if (!email) {
    return { success: false, error: 'Unauthorized: Token contains no email', status: 403 }
  }

  // Check if Firebase Auth user account is disabled
  try {
    const userRecord = await adminAuth.getUser(uid)
    if (userRecord.disabled) {
      return { success: false, error: 'Forbidden: Account is disabled', status: 403 }
    }
  } catch (authErr: any) {
    if (authErr?.code === 'auth/user-not-found') {
      return { success: false, error: 'Unauthorized: User not found', status: 401 }
    }
    // Non-blocking log if getUser fails due to transient network issues
    console.warn('[Admin Auth] Warning: getUser check failed:', authErr?.message)
  }

  // Strict UID-based authorization: Read admins/{UID} from Firestore
  try {
    const adminDoc = await adminDb.collection('admins').doc(uid).get()

    if (!adminDoc.exists) {
      return {
        success: false,
        error: 'Forbidden: Account is not an authorized administrator',
        status: 403,
      }
    }

    const data = adminDoc.data()
    if (!data || data.isActive !== true) {
      return {
        success: false,
        error: 'Forbidden: Administrator account is disabled',
        status: 403,
      }
    }

    const adminUser: AdminAuthUser = {
      uid,
      email: data.email || email,
      displayName: data.displayName || decodedToken.name,
      role: data.role === 'superadmin' ? 'superadmin' : 'admin',
      isActive: true,
    }

    return { success: true, user: adminUser }
  } catch (dbErr: any) {
    console.error('[Admin Auth] Firestore admin check error:', dbErr?.message)
    return {
      success: false,
      error: 'Internal Server Error: Unable to verify administrator status',
      status: 500,
    }
  }
}
