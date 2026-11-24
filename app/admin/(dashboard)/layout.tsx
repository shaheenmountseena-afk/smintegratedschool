import React from 'react'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell'

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminGuard>
  )
}
