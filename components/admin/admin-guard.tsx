'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from './admin-auth-context'
import { Loader2 } from 'lucide-react'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/admin/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="size-8 animate-spin text-blue-600" />
        <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">
          Verifying administrator session...
        </p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
