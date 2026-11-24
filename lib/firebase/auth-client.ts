import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth'
import { getClientAuth } from './client'

/**
 * Signs in an administrator using Firebase Email and Password.
 * Registration is strictly closed to the public; only pre-authorized admin emails can authenticate.
 */
export async function signInAdmin(email: string, pass: string): Promise<User> {
  const auth = getClientAuth()
  if (!auth) {
    throw new Error('Firebase Client is not configured. Check environment variables.')
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass)
  return credential.user
}

/**
 * Signs out the current administrator session.
 */
export async function signOutAdmin(): Promise<void> {
  const auth = getClientAuth()
  if (!auth) return
  await signOut(auth)
}

/**
 * Subscribes to Firebase Authentication state changes on the client.
 */
export function onAdminAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  const auth = getClientAuth()
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

/**
 * Gets the current user's Firebase ID token for authenticated server requests.
 */
export async function getAdminIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getClientAuth()
  if (!auth?.currentUser) return null

  return auth.currentUser.getIdToken(forceRefresh)
}
