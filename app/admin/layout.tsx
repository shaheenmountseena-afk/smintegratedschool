import React from 'react'
import type { Metadata } from 'next'
import { AdminAuthProvider } from '@/components/admin/admin-auth-context'

export const metadata: Metadata = {
  title: 'Admin Dashboard | SHAHEEN – MOUNT SEENA',
  description: 'Administrative portal for Shaheen – Mount Seena Integrated Residential School.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>
}
