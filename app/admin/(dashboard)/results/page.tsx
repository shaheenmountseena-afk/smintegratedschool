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
  Trophy,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
} from 'lucide-react'
import { Modal } from '@/components/admin/modal'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { MediaUploader } from '@/components/admin/media-uploader'
import type { ResultDoc } from '@/lib/firebase/firestore'
import { getAdminIdToken } from '@/lib/firebase/auth-client'

export default function ResultsManagementPage() {
  const [results, setResults] = useState<ResultDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ResultDoc | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ResultDoc | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form Fields
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [name, setName] = useState('')
  const [score, setScore] = useState('')
  const [exam, setExam] = useState('NEET-UG')
  const [photo, setPhoto] = useState('')
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState('')
  const [isPublished, setIsPublished] = useState(true)

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

  const fetchResults = async () => {
    try {
      const res = await authFetch('/api/admin/results')
      const data = await res.json()
      if (res.ok) {
        setResults(data.data || [])
      }
    } catch (e) {
      console.error('Failed to load results:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [])

  const availableYears = [...new Set(results.map((r) => String(r.year)))].sort((a, b) => Number(b) - Number(a))

  const resetForm = () => {
    setYear(new Date().getFullYear())
    setName('')
    setScore('')
    setExam('NEET-UG')
    setPhoto('')
    setCloudinaryPublicId('')
    setIsPublished(true)
    setEditingItem(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (item: ResultDoc) => {
    setEditingItem(item)
    setYear(item.year)
    setName(item.name)
    setScore(item.score)
    setExam(item.exam)
    setPhoto(item.photo || '')
    setCloudinaryPublicId(item.cloudinaryPublicId || '')
    setIsPublished(item.isPublished)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !score.trim() || !exam.trim()) {
      alert('Student Name, Score, and Exam are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        year: Number(year),
        name: name.trim(),
        score: score.trim(),
        exam: exam.trim(),
        photo: photo.trim() || undefined,
        cloudinaryPublicId: cloudinaryPublicId.trim() || undefined,
        isPublished,
      }

      const endpoint = editingItem ? `/api/admin/results/${editingItem.id}` : '/api/admin/results'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: editingItem ? 'Result record updated.' : 'Student result added successfully.',
        })
        setIsModalOpen(false)
        resetForm()
        await fetchResults()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save result.' })
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
      const res = await authFetch(`/api/admin/results/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Result record deleted.' })
        setDeleteTarget(null)
        await fetchResults()
      } else {
        const data = await res.json()
        setFeedback({ type: 'error', message: data.error || 'Failed to delete result.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async (item: ResultDoc) => {
    try {
      const res = await authFetch(`/api/admin/results/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      })
      if (res.ok) {
        setResults((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, isPublished: !item.isPublished } : r))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= results.length) return

    const newResults = [...results]
    const temp = newResults[index]
    newResults[index] = newResults[targetIndex]
    newResults[targetIndex] = temp

    setResults(newResults)

    try {
      await authFetch('/api/admin/results/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newResults.map((r) => r.id) }),
      })
    } catch (err) {
      console.error('Failed to update order on server:', err)
      await fetchResults()
    }
  }

  const filteredResults = results.filter((r) => {
    const matchesYear = selectedYear === 'all' || String(r.year) === selectedYear
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.score.toLowerCase().includes(search.toLowerCase()) ||
      r.exam.toLowerCase().includes(search.toLowerCase())
    return matchesYear && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
            Results & Toppers
          </h2>
          <p className="text-xs text-slate-500">
            Manage NEET-UG, JEE Main, and entrance examination toppers and ranks.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Result Entry</span>
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

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedYear('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedYear === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Years
          </button>
          {availableYears.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedYear === y
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="size-6 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading result records...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="size-8 mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No results found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add your first topper or sync initial content from the dashboard overview.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Order</th>
                  <th className="py-3.5 px-3">Student</th>
                  <th className="py-3.5 px-3">Score</th>
                  <th className="py-3.5 px-3">Exam</th>
                  <th className="py-3.5 px-3">Year</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((item, idx) => (
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
                          disabled={idx === results.length - 1}
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
                        <div className="font-semibold text-slate-900">{item.name}</div>
                      </div>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className="font-heading font-bold text-sm text-blue-600">
                        {item.score}
                      </span>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap font-medium text-slate-700">
                      {item.exam}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        {item.year}
                      </span>
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
        title={editingItem ? 'Edit Result Record' : 'Add Student Result'}
        description="Record topper details, score, and optional portrait photo."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mohammed Ali Iqbal"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year *
              </label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                placeholder="2026"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Score / Mark *
              </label>
              <input
                type="text"
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 680 / 720 or 99.8%ile"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Exam Name *
              </label>
              <input
                type="text"
                required
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                placeholder="e.g. NEET-UG, JEE Main, KEAM"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
              />
              <span className="text-xs font-medium text-slate-700">Publish in results section</span>
            </label>
          </div>

          {/* Cloudinary Student Photo Uploader */}
          <MediaUploader
            folder="shaheen-mount-seena/gallery"
            resourceType="image"
            label="Student Portrait (Optional Cloudinary Upload)"
            description="Upload student passport photo"
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
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Record Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Result Entry"
        message={`Are you sure you want to delete the result entry for ${deleteTarget?.name}?`}
        confirmText="Yes, Delete"
        isLoading={isSubmitting}
      />
    </div>
  )
}
