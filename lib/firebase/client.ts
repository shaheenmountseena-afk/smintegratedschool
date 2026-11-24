import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFirebaseClientConfig } from './config'

let clientApp: FirebaseApp | null = null
let clientAuth: Auth | null = null
let clientFirestore: Firestore | null = null

/**
 * Initializes and returns the Firebase Client App instance.
 * Reuses existing initialized instance to prevent duplicate app errors.
 */
export function getClientApp(): FirebaseApp | null {
  if (clientApp) return clientApp

  const existingApps = getApps()
  if (existingApps.length > 0) {
    clientApp = existingApps[0]
    return clientApp
  }

  const config = getFirebaseClientConfig()
  if (!config) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[Firebase Client] Missing configuration. Ensure NEXT_PUBLIC_FIREBASE_* environment variables are set in .env.local',
      )
    }
    return null
  }

  clientApp = initializeApp(config)
  return clientApp
}

/**
 * Returns the Firebase Client Auth instance.
 */
export function getClientAuth(): Auth | null {
  if (clientAuth) return clientAuth
  const app = getClientApp()
  if (!app) return null

  clientAuth = getAuth(app)
  return clientAuth
}

/**
 * Returns the Firebase Client Firestore instance.
 */
export function getClientFirestore(): Firestore | null {
  if (clientFirestore) return clientFirestore
  const app = getClientApp()
  if (!app) return null

  clientFirestore = getFirestore(app)
  return clientFirestore
}
