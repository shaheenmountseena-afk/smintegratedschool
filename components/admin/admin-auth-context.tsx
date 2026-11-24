'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signInAdmin, signOutAdmin, onAdminAuthStateChanged, getAdminIdToken } from '@/lib/firebase/auth-client'

export interface AdminUser {
  uid: string
  email: string
  displayName?: string
  role: 'superadmin' | 'admin'
  isActive: boolean
}

interface AdminAuthContextType {
  user: AdminUser | null
  isLoading: boolean
  error: string | null
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const checkServerSession = useCallback(async () => {
    try {
      // First try session cookie
      const res = await fetch('/api/admin/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
          setError(null)
          return
        }
      }

      // If session cookie failed or expired, check if client Firebase has a live user
      const freshToken = await getAdminIdToken(false)
      if (freshToken) {
        const syncRes = await fetch('/api/admin/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: freshToken }),
        })
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          if (syncData.success && syncData.user) {
            setUser(syncData.user)
            setError(null)
            return
          }
        }
      }

      setUser(null)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkServerSession()
  }, [checkServerSession])

  // Automatically listen to client Firebase Auth state to keep token and session synced
  useEffect(() => {
    const unsubscribe = onAdminAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken()
          const res = await fetch('/api/admin/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.user) {
              setUser(data.user)
            }
          }
        } catch {
          // Non-blocking background sync
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, pass: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // 1. Authenticate with Firebase Client SDK
      const fbUser = await signInAdmin(email, pass)
      const idToken = await fbUser.getIdToken(true)

      // 2. Exchange token with server session endpoint (checks admins/{uid} & sets httpOnly cookie)
      const res = await fetch('/api/admin/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        // Sign out client SDK immediately if rejected by server
        await signOutAdmin().catch(() => {})
        const errorMsg = data.error || 'Access denied: You are not authorized as an administrator.'
        setError(errorMsg)
        setIsLoading(false)
        return { success: false, error: errorMsg }
      }

      setUser(data.user)
      setIsLoading(false)
      router.push('/admin')
      return { success: true }
    } catch (err: any) {
      await signOutAdmin().catch(() => {})
      const message =
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found'
          ? 'Invalid email or password.'
          : err?.message || 'Failed to authenticate.'
      setError(message)
      setIsLoading(false)
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/admin/auth/session', { method: 'DELETE' }).catch(() => {})
      await signOutAdmin().catch(() => {})
    } finally {
      setUser(null)
      setIsLoading(false)
      router.push('/admin/login')
    }
  }

  const getIdToken = async () => {
    return getAdminIdToken()
  }

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        refreshUser: checkServerSession,
        getIdToken,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
