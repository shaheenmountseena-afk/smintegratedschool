import 'server-only'
import { getAdminAuth, getAdminFirestore } from './admin'
import type { DecodedIdToken } from 'firebase-admin/auth'

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
 * Extracts and verifies the Firebase ID token or session cookie from an incoming HTTP Request.
 * Verifies:
 * 1. Cryptographic token signature and expiration via Firebase Admin SDK
 * 2. Token revocation status (checkRevoked = true)
 * 3. Administrator whitelist in Firestore 'admins' collection
 * 4. Active account status (isActive: true)
 * 5. Firebase Auth user disabled status
 *
 * Never trusts client-side admin assertions.
 */
export async function verifyAdminRequest(request: Request): Promise<VerifyAdminResult> {
  const authHeader = request.headers.get('authorization')
  let token = ''

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim()
  } else {
    // Also check session cookie if present
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/)
      if (match) {
        token = match[1].trim()
      }
    }
  }

  if (!token) {
    return { success: false, error: 'Unauthorized: Missing authentication token', status: 401 }
  }

  return verifyAdminToken(token)
}

/**
 * Verifies a raw Firebase ID token or Session Cookie with mandatory revocation checks,
 * and validates authorization against the server 'admins' collection.
 */
export async function verifyAdminToken(token: string): Promise<VerifyAdminResult> {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminFirestore()

  if (!adminAuth || !adminDb) {
    return {
      success: false,
      error: 'Server configuration error: Firebase Admin is not configured',
      status: 503,
    }
  }

  let decodedToken: DecodedIdToken | null = null

  // 1. Verify token signature and check revocation (checkRevoked: true)
  // Check if it is a session cookie or ID token
  try {
    // Try verifying as session cookie first (with checkRevoked = true)
    decodedToken = await adminAuth.verifySessionCookie(token, true)
  } catch (cookieErr: any) {
    if (cookieErr?.code === 'auth/session-cookie-revoked') {
      return { success: false, error: 'Unauthorized: Session has been revoked. Please log in again.', status: 401 }
    }

    // Fall back to ID token verification (with checkRevoked = true)
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true)
    } catch (tokenErr: any) {
      const code = tokenErr?.code
      if (code === 'auth/id-token-revoked') {
        return { success: false, error: 'Unauthorized: Token has been revoked. Please log in again.', status: 401 }
      }
      if (code === 'auth/id-token-expired') {
        return { success: false, error: 'Unauthorized: Session expired. Please log in again.', status: 401 }
      }
      return {
        success: false,
        error: 'Unauthorized: Invalid authentication credentials',
        status: 401,
      }
    }
  }

  if (!decodedToken) {
    return { success: false, error: 'Unauthorized: Failed to decode authentication token', status: 401 }
  }

  const { uid, email } = decodedToken

  if (!email) {
    return { success: false, error: 'Unauthorized: Token contains no email', status: 403 }
  }

  // 2. Check if Firebase Auth user account is disabled or deleted
  try {
    const userRecord = await adminAuth.getUser(uid)
    if (userRecord.disabled) {
      return { success: false, error: 'Forbidden: Administrator account is disabled', status: 403 }
    }
  } catch (authErr: any) {
    if (authErr?.code === 'auth/user-not-found') {
      return { success: false, error: 'Unauthorized: Administrator account not found', status: 401 }
    }
    console.warn('[Admin Auth] Warning: getUser check failed:', authErr?.message)
  }

  // 3. Strict UID-based authorization: Read admins/{UID} from Firestore whitelist
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
        error: 'Forbidden: Administrator account is deactivated',
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

/**
 * Creates a cryptographically signed Firebase session cookie for an authenticated ID token.
 * Default expiration: 5 days (in milliseconds).
 */
export async function createAdminSessionCookie(
  idToken: string,
  expiresInMs: number = 5 * 24 * 60 * 60 * 1000
): Promise<string | null> {
  const adminAuth = getAdminAuth()
  if (!adminAuth) return null

  try {
    return await adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs })
  } catch (err) {
    console.warn('[Admin Auth] Failed to create session cookie, falling back to idToken:', err)
    return null
  }
}

/**
 * Revokes all refresh tokens and active sessions for a user in Firebase Auth.
 * Used on logout or when deactivating an administrator.
 */
export async function revokeAdminSessions(uid: string): Promise<boolean> {
  const adminAuth = getAdminAuth()
  if (!adminAuth || !uid) return false

  try {
    await adminAuth.revokeRefreshTokens(uid)
    return true
  } catch (err) {
    console.error(`[Admin Auth] Failed to revoke refresh tokens for uid ${uid}:`, err)
    return false
  }
}
