/**
 * Firebase Authentication & Authorization Hub.
 *
 * For Server Components, Route Handlers, and API Routes:
 * import { verifyAdminRequest, verifyAdminToken } from '@/lib/firebase/auth'
 *
 * For Client Components ('use client'):
 * import { signInAdmin, signOutAdmin, onAdminAuthStateChanged, getAdminIdToken } from '@/lib/firebase/auth-client'
 */

export * from './auth-server'
