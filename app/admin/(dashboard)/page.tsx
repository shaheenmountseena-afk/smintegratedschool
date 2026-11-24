'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Film,
  Trophy,
  Images,
  Mail,
  PlusCircle,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { useAdminAuth } from '@/components/admin/admin-auth-context'
import { getAdminIdToken } from '@/lib/firebase/auth-client'

interface DashboardCounts {
  faculty: number
  homeMedia: number
  results: number
  gallery: number
  enquiries: number
}

export default function AdminDashboardPage() {
  const { user } = useAdminAuth()
  const [counts, setCounts] = useState<DashboardCounts>({
    faculty: 0,
    homeMedia: 0,
    results: 0,
    gallery: 0,
    enquiries: 0,
  })
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getAdminIdToken().catch(() => null)
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(url, { ...options, headers })
  }, [])

  const fetchCounts = useCallback(async () => {
    try {
      const [facRes, mediaRes, resRes, galRes, enqRes] = await Promise.all([
        authFetch('/api/admin/faculty').then((r) => (r.ok ? r.json() : { data: [] })),
        authFetch('/api/admin/home-media').then((r) => (r.ok ? r.json() : { data: [] })),
        authFetch('/api/admin/results').then((r) => (r.ok ? r.json() : { data: [] })),
        authFetch('/api/admin/gallery').then((r) => (r.ok ? r.json() : { data: [] })),
        authFetch('/api/admin/enquiries').then((r) => (r.ok ? r.json() : { data: [] })),
      ])

      setCounts({
        faculty: facRes.data?.length || 0,
        homeMedia: mediaRes.data?.length || 0,
        results: resRes.data?.length || 0,
        gallery: galRes.data?.length || 0,
        enquiries: enqRes.data?.length || 0,
      })
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  const handleSeed = async () => {
    if (
      !confirm(
        'This will safely import static website content into Firestore without overwriting or duplicating existing records. Proceed?'
      )
    ) {
      return
    }

    setSeeding(true)
    setSeedMessage(null)
    try {
      const res = await authFetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setSeedMessage(data.message || 'Static content synchronized with Firestore!')
        await fetchCounts()
      } else {
        setSeedMessage(`Error: ${data.error || 'Failed to sync content'}`)
      }
    } catch (err: any) {
      setSeedMessage(`Error: ${err.message}`)
    } finally {
      setSeeding(false)
    }
  }

  const statCards = [
    {
      title: 'Faculty Members',
      count: counts.faculty,
      icon: Users,
      href: '/admin/faculty',
      color: 'blue',
      description: 'Academic teachers and mentors',
    },
    {
      title: 'Homepage Media',
      count: counts.homeMedia,
      icon: Film,
      href: '/admin/homepage-media',
      color: 'indigo',
      description: 'Admission posters and campus videos',
    },
    {
      title: 'Results & Achievements',
      count: counts.results,
      icon: Trophy,
      href: '/admin/results',
      color: 'amber',
      description: 'NEET & JEE student toppers',
    },
    {
      title: 'Gallery Media',
      count: counts.gallery,
      icon: Images,
      href: '/admin/gallery',
      color: 'emerald',
      description: 'Photos, videos & campus moments',
    },
    {
      title: 'Student Enquiries',
      count: counts.enquiries,
      icon: Mail,
      href: '/admin/enquiries',
      color: 'sky',
      description: 'Prospective admission leads',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {user?.role?.toUpperCase() || 'ADMIN'}
            </span>
            <span className="text-xs text-slate-400">Authenticated via Firebase</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Welcome back, {user?.displayName || user?.email?.split('@')[0]}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage public website content, admissions media, faculty profiles, and student records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Populates initial data into Firestore if empty"
          >
            {seeding ? (
              <Loader2 className="size-4 animate-spin text-blue-600" />
            ) : (
              <Database className="size-4 text-blue-600" />
            )}
            <span>{seeding ? 'Syncing...' : 'Sync Static Content to Firestore'}</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <span>Live Website</span>
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      {seedMessage && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-4 text-xs font-medium ${
            seedMessage.startsWith('Error')
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {seedMessage.startsWith('Error') ? (
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          )}
          <span>{seedMessage}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-4 font-heading">
          Content Overview
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Icon className="size-6" />
                  </div>
                  <div className="text-right">
                    {loading ? (
                      <div className="h-8 w-12 bg-slate-100 rounded-md animate-pulse ml-auto" />
                    ) : (
                      <span className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
                        {card.count}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">{card.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600">
                  <span>Manage collection</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-2xs">
        <h3 className="text-base font-semibold text-slate-900 mb-2 font-heading">
          Administrative Actions
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Direct shortcuts to add new records or upload media to Cloudinary.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/faculty"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-500 hover:bg-blue-50/20 transition-all text-slate-700 hover:text-blue-700"
          >
            <PlusCircle className="size-5 text-blue-600 shrink-0" />
            <div className="text-xs font-semibold">Add Faculty Member</div>
          </Link>

          <Link
            href="/admin/homepage-media"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-500 hover:bg-blue-50/20 transition-all text-slate-700 hover:text-blue-700"
          >
            <PlusCircle className="size-5 text-blue-600 shrink-0" />
            <div className="text-xs font-semibold">Upload Home Media</div>
          </Link>

          <Link
            href="/admin/results"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-500 hover:bg-blue-50/20 transition-all text-slate-700 hover:text-blue-700"
          >
            <PlusCircle className="size-5 text-blue-600 shrink-0" />
            <div className="text-xs font-semibold">Add Student Result</div>
          </Link>

          <Link
            href="/admin/gallery"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-500 hover:bg-blue-50/20 transition-all text-slate-700 hover:text-blue-700"
          >
            <PlusCircle className="size-5 text-blue-600 shrink-0" />
            <div className="text-xs font-semibold">Upload to Gallery</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
