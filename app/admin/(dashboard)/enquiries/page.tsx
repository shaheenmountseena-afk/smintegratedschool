'use client'

import React, { useEffect, useState } from 'react'
import {
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  Archive,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { Modal } from '@/components/admin/modal'
import type { EnquiryDoc } from '@/lib/firebase/firestore'
import { getAdminIdToken } from '@/lib/firebase/auth-client'

export default function EnquiriesManagementPage() {
  const [enquiries, setEnquiries] = useState<EnquiryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'resolved' | 'archived'>('all')
  const [search, setSearch] = useState('')
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDoc | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [notes, setNotes] = useState('')

  const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getAdminIdToken().catch(() => null)
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(endpoint, { ...options, headers })
  }

  const fetchEnquiries = async () => {
    try {
      const res = await authFetch('/api/admin/enquiries')
      const data = await res.json()
      if (res.ok) {
        setEnquiries(data.data || [])
      }
    } catch (e) {
      console.error('Failed to load enquiries:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnquiries()
  }, [])

  const openDetailModal = (item: EnquiryDoc) => {
    setSelectedEnquiry(item)
    setNotes(item.notes || '')
  }

  const handleUpdateStatus = async (status: EnquiryDoc['status']) => {
    if (!selectedEnquiry) return
    setIsUpdating(true)
    try {
      const res = await authFetch(`/api/admin/enquiries/${selectedEnquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      if (res.ok) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === selectedEnquiry.id ? { ...e, status, notes } : e))
        )
        setSelectedEnquiry({ ...selectedEnquiry, status, notes })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter
    const matchesSearch =
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (e.parentName && e.parentName.toLowerCase().includes(search.toLowerCase())) ||
      e.phone.includes(search) ||
      (e.programme && e.programme.toLowerCase().includes(search.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: EnquiryDoc['status']) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-semibold"><Clock className="size-3" /> New Lead</span>
      case 'contacted':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-semibold"><Phone className="size-3" /> Contacted</span>
      case 'resolved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-semibold"><CheckCircle className="size-3" /> Resolved / Admitted</span>
      case 'archived':
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-semibold"><Archive className="size-3" /> Archived</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
          Admission Enquiries & Leads
        </h2>
        <p className="text-xs text-slate-500">
          Review and manage admission requests submitted through the online enquiry form.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, parent, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'new', 'contacted', 'resolved', 'archived'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'All Leads' : s}
            </button>
          ))}
        </div>
      </div>

      {/* List / Table */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="size-6 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading enquiry records...</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="size-8 mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No enquiries found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Admission enquiries submitted on the website will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Student / Parent</th>
                  <th className="py-3.5 px-3">Contact</th>
                  <th className="py-3.5 px-3">Programme</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnquiries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{item.studentName}</div>
                      {item.parentName && (
                        <div className="text-[11px] text-slate-500">Parent: {item.parentName}</div>
                      )}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{item.phone}</div>
                      {item.email && (
                        <div className="text-[11px] text-slate-400">{item.email}</div>
                      )}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className="text-xs text-slate-700 font-medium">
                        {item.programme || 'General Enquiry'}
                      </span>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                      {new Date(item.submittedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDetailModal(item)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <span>View Details</span>
                        <ChevronRight className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details & Status Modal */}
      {selectedEnquiry && (
        <Modal
          isOpen={Boolean(selectedEnquiry)}
          onClose={() => setSelectedEnquiry(null)}
          title={`Enquiry: ${selectedEnquiry.studentName}`}
          description={`Submitted on ${new Date(selectedEnquiry.submittedAt).toLocaleString('en-IN')}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Phone</p>
                <a href={`tel:${selectedEnquiry.phone}`} className="text-sm font-semibold text-blue-600 hover:underline">
                  {selectedEnquiry.phone}
                </a>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</p>
                <p className="text-sm text-slate-800">{selectedEnquiry.email || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Programme of Interest</p>
                <p className="text-sm font-medium text-slate-800">{selectedEnquiry.programme || 'General'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current Status</p>
                <div className="mt-0.5">{getStatusBadge(selectedEnquiry.status)}</div>
              </div>
            </div>

            {selectedEnquiry.message && (
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Student / Parent Message</p>
                <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
                  {selectedEnquiry.message}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Administrative Notes</p>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log internal follow-up remarks, counsellor call notes, or admission outcome..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Update Status</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus('new')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedEnquiry.status === 'new'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Mark New
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus('contacted')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedEnquiry.status === 'contacted'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Mark Contacted
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus('resolved')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedEnquiry.status === 'resolved'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Mark Resolved / Admitted
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus('archived')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedEnquiry.status === 'archived'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Archive Lead
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
