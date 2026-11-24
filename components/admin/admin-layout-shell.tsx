'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Film,
  Trophy,
  Images,
  Mail,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { useAdminAuth } from './admin-auth-context'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Faculty Members', href: '/admin/faculty', icon: Users },
  { name: 'Homepage Media', href: '/admin/homepage-media', icon: Film },
  { name: 'Results & Toppers', href: '/admin/results', icon: Trophy },
  { name: 'Gallery Media', href: '/admin/gallery', icon: Images },
  { name: 'Enquiries & Leads', href: '/admin/enquiries', icon: Mail },
]

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAdminAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out of the admin panel?')) {
      setIsLoggingOut(true)
      await logout()
    }
  }

  const currentNav = navigation.find(
    (item) => item.href === pathname || (item.href !== '/admin' && pathname.startsWith(item.href))
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-18 items-center justify-between px-6 border-b border-slate-100">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 shadow-xs group-hover:border-slate-300 transition-colors">
              <Image
                src="/images/shaheen-logo.png"
                alt="Shaheen Logo"
                width={36}
                height={36}
                className="size-full object-contain"
              />
            </div>
            <div>
              <span className="block font-heading text-sm font-bold tracking-tight text-slate-900 leading-tight">
                SHAHEEN – MS
              </span>
              <span className="block text-[11px] font-medium text-blue-600 uppercase tracking-wider">
                Admin Dashboard
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Management
          </p>
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`size-4.5 ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="size-4 text-blue-600" />}
              </Link>
            )
          })}

          <div className="pt-6">
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Quick Links
            </p>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="size-4.5 text-slate-400" />
                <span>View Live Site</span>
              </div>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Public
              </span>
            </Link>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {user?.displayName || user?.email?.split('@')[0]}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="size-3 text-blue-600" />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-blue-600">
                    {user?.role || 'Admin'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                {currentNav?.name || 'Admin Portal'}
              </h1>
              <p className="text-xs text-slate-500">
                Shaheen – Mount Seena Residential NEET/JEE School
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="size-3.5 text-slate-500" />
              <span>Open Public Site</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
