'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import { Modal } from '@/components/admin/modal'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { MediaUploader } from '@/components/admin/media-uploader'
import type { FacultyDoc } from '@/lib/firebase/firestore'
import { getAdminIdToken } from '@/lib/firebase/auth-client'

export default function FacultyManagementPage() {
  const [faculty, setFaculty] = useState<FacultyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'academic' | 'mentorship'>('all')

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FacultyDoc | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FacultyDoc | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [group, setGroup] = useState<'academic' | 'mentorship'>('academic')
  const [previous, setPrevious] = useState('')
  const [photo, setPhoto] = useState('')
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getAdminIdToken().catch(() => null)
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(url, { ...options, headers })
  }

  const fetchFaculty = async () => {
    try {
      const res = await authFetch('/api/admin/faculty')
      const data = await res.json()
      if (res.ok) {
        setFaculty(data.data || [])
      }
    } catch (e) {
      console.error('Failed to load faculty:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaculty()
  }, [])

  const resetForm = () => {
    setName('')
    setRole('')
    setGroup('academic')
    setPrevious('')
    setPhoto('')
    setCloudinaryPublicId('')
    setIsPublished(true)
    setEditingItem(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (item: FacultyDoc) => {
    setEditingItem(item)
    setName(item.name)
    setRole(item.role)
    setGroup(item.group)
    setPrevious(item.previous || '')
    setPhoto(item.photo || '')
    setCloudinaryPublicId(item.cloudinaryPublicId || '')
    setIsPublished(item.isPublished)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !role.trim()) {
      alert('Name and Role/Designation are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        group,
        previous: previous.trim() || undefined,
        photo: photo.trim() || undefined,
        cloudinaryPublicId: cloudinaryPublicId.trim() || undefined,
        isPublished,
      }

      const url = editingItem ? `/api/admin/faculty/${editingItem.id}` : '/api/admin/faculty'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: editingItem ? 'Faculty member updated successfully.' : 'New faculty member added.',
        })
        setIsModalOpen(false)
        resetForm()
        await fetchFaculty()
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to save faculty member.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      const res = await authFetch(`/api/admin/faculty/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Faculty member deleted successfully.' })
        setDeleteTarget(null)
        await fetchFaculty()
      } else {
        const data = await res.json()
        setFeedback({ type: 'error', message: data.error || 'Failed to delete.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async (item: FacultyDoc) => {
    try {
      const res = await authFetch(`/api/admin/faculty/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      })
      if (res.ok) {
        setFaculty((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, isPublished: !item.isPublished } : f))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= faculty.length) return

    const newFaculty = [...faculty]
    const temp = newFaculty[index]
    newFaculty[index] = newFaculty[targetIndex]
    newFaculty[targetIndex] = temp

    setFaculty(newFaculty)

    try {
      await authFetch('/api/admin/faculty/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newFaculty.map((f) => f.id) }),
      })
    } catch (err) {
      console.error('Failed to update order on server:', err)
      await fetchFaculty()
    }
  }

  const filteredFaculty = faculty.filter((f) => {
    const matchesGroup = selectedGroup === 'all' || f.group === selectedGroup
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.role.toLowerCase().includes(search.toLowerCase()) ||
      (f.previous && f.previous.toLowerCase().includes(search.toLowerCase()))
    return matchesGroup && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
            Faculty & Mentors
          </h2>
          <p className="text-xs text-slate-500">
            Manage teacher profiles, designations, credentials, and photos.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between gap-2.5 rounded-xl p-4 text-xs font-medium ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty by name or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'academic', 'mentorship'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGroup(g)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                selectedGroup === g
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g === 'all' ? 'All Roles' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="size-6 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading faculty records...</p>
          </div>
        ) : filteredFaculty.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="size-8 mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No faculty members found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add your first faculty member or click &quot;Sync Static Content&quot; from the dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Order</th>
                  <th className="py-3.5 px-3">Faculty</th>
                  <th className="py-3.5 px-3">Group</th>
                  <th className="py-3.5 px-3">Background</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFaculty.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="rounded-md p-1 hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === faculty.length - 1}
                          className="rounded-md p-1 hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {item.photo ? (
                            <Image
                              src={item.photo}
                              alt={item.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center font-bold text-xs text-slate-500 bg-slate-100">
                              {item.name[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-blue-600 font-medium">{item.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                          item.group === 'academic'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {item.group}
                      </span>
                    </td>
                    <td className="py-4 px-3 max-w-xs truncate text-[11px] text-slate-500">
                      {item.previous || '—'}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(item)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold cursor-pointer ${
                          item.isPublished
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                        title="Click to toggle publish status"
                      >
                        {item.isPublished ? (
                          <>
                            <Eye className="size-3 text-emerald-600" /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="size-3 text-slate-400" /> Hidden
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Faculty Member' : 'Add Faculty Member'}
        description="Enter credentials and profile details. Profile photos are uploaded directly to Cloudinary."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. K.N. Sherin"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Role / Subject *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Chemistry & Academic Head"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department Group *
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="academic">Academic Faculty</option>
                <option value="mentorship">Mentorship & Wellbeing</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                />
                <span className="text-xs font-medium text-slate-700">Publish on public website</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Background / Previous Institution (Optional)
            </label>
            <textarea
              rows={2}
              value={previous}
              onChange={(e) => setPrevious(e.target.value)}
              placeholder="e.g. Former Faculty, Pala Brilliance & PC Thomas Entrance Coaching Institute"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Cloudinary Profile Photo Uploader */}
          <MediaUploader
            folder="shaheen-mount-seena/gallery"
            resourceType="image"
            label="Faculty Photo (Cloudinary Signed Upload)"
            description="Upload official portrait photo"
            currentUrl={photo}
            onUploadComplete={(res) => {
              setPhoto(res.url)
              setCloudinaryPublicId(res.publicId)
            }}
            onClear={() => {
              setPhoto('')
              setCloudinaryPublicId('')
            }}
          />

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Faculty Member"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone and will permanently remove this record from Firestore.`}
        confirmText="Yes, Delete"
        isLoading={isSubmitting}
      />
    </div>
  )
}
