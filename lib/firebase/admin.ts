import 'server-only'
import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let adminApp: App | null = null
let adminAuth: Auth | null = null
let adminDb: Firestore | null = null

function getServiceAccountCredential() {
  // Option 1: Full JSON string in FIREBASE_SERVICE_ACCOUNT_KEY
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (rawServiceAccount) {
    try {
      const decoded = rawServiceAccount.startsWith('{')
        ? rawServiceAccount
        : Buffer.from(rawServiceAccount, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      return cert(parsed)
    } catch (err) {
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', err)
      return null
    }
  }

  // Option 2: Individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    return null
  }

  // Handle quotes and escaped newlines commonly required in .env files
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1)
  }
  privateKey = privateKey.replace(/\\n/g, '\n')

  return cert({
    projectId,
    clientEmail,
    privateKey,
  })
}

/**
 * Initializes and returns the Firebase Admin App instance on the server.
 * Ensures single instance initialization across server requests.
 */
export function getAdminApp(): App | null {
  if (adminApp) return adminApp

  const existingApps = getApps()
  if (existingApps.length > 0) {
    adminApp = existingApps[0]
    return adminApp
  }

  const credential = getServiceAccountCredential()
  if (!credential) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[Firebase Admin] Missing server credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your environment.',
      )
    }
    return null
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  adminApp = initializeApp({
    credential,
    projectId,
  })

  return adminApp
}

/**
 * Returns the Firebase Admin Auth service.
 */
export function getAdminAuth(): Auth | null {
  if (adminAuth) return adminAuth
  const app = getAdminApp()
  if (!app) return null

  adminAuth = getAuth(app)
  return adminAuth
}

/**
 * Returns the Firebase Admin Firestore service.
 */
export function getAdminFirestore(): Firestore | null {
  if (adminDb) return adminDb
  const app = getAdminApp()
  if (!app) return null

  adminDb = getFirestore(app)
  try {
    adminDb.settings({ ignoreUndefinedProperties: true })
  } catch {
    // Settings can only be applied once per process
  }
  return adminDb
}

/**
 * Checks whether the server environment variables for Firebase Admin SDK are present.
 */
export function isFirebaseAdminConfigured(): boolean {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountKey) return true

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  return Boolean(projectId && clientEmail && privateKey)
}
