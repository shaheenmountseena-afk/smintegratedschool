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
  Images,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  FileImage,
} from 'lucide-react'
import { Modal } from '@/components/admin/modal'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { MediaUploader } from '@/components/admin/media-uploader'
import type { GalleryDoc } from '@/lib/firebase/firestore'
import { getAdminIdToken } from '@/lib/firebase/auth-client'

const STANDARD_CATEGORIES = [
  'Campus',
  'Classrooms',
  'Labs',
  'Hostel',
  'Events',
  'Admissions',
  'Programmes',
  'Academics',
]

export default function GalleryManagementPage() {
  const [gallery, setGallery] = useState<GalleryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<'all' | 'photo' | 'poster' | 'video'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryDoc | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GalleryDoc | null>(null)
  const [previewItem, setPreviewItem] = useState<GalleryDoc | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form Fields
  const [type, setType] = useState<'photo' | 'poster' | 'video'>('photo')
  const [category, setCategory] = useState('Campus')
  const [customCategory, setCustomCategory] = useState('')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [url, setUrl] = useState('')
  const [thumbnail, setThumbnail] = useState('')
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

  const fetchGallery = async () => {
    try {
      const res = await authFetch('/api/admin/gallery')
      const data = await res.json()
      if (res.ok) {
        setGallery(data.data || [])
      }
    } catch (e) {
      console.error('Failed to load gallery:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGallery()
  }, [])

  const categories = [
    ...new Set([...STANDARD_CATEGORIES, ...gallery.map((g) => g.category)]),
  ]

  const resetForm = () => {
    setType('photo')
    setCategory('Campus')
    setCustomCategory('')
    setYear(new Date().getFullYear())
    setTitle('')
    setCaption('')
    setUrl('')
    setThumbnail('')
    setCloudinaryPublicId('')
    setIsPublished(true)
    setEditingItem(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (item: GalleryDoc) => {
    setEditingItem(item)
    setType(item.type)
    if (STANDARD_CATEGORIES.includes(item.category)) {
      setCategory(item.category)
      setCustomCategory('')
    } else {
      setCategory('Custom')
      setCustomCategory(item.category)
    }
    setYear(item.year)
    setTitle(item.title)
    setCaption(item.caption || '')
    setUrl(item.url)
    setThumbnail(item.thumbnail)
    setCloudinaryPublicId(item.cloudinaryPublicId || '')
    setIsPublished(item.isPublished)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalCategory = category === 'Custom' ? customCategory.trim() : category
    if (!finalCategory || !title.trim() || !url.trim()) {
      alert('Category, Title, and Media URL are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        type,
        category: finalCategory,
        year: Number(year),
        title: title.trim(),
        caption: caption.trim() || undefined,
        url: url.trim(),
        thumbnail: thumbnail.trim() || url.trim(),
        cloudinaryPublicId: cloudinaryPublicId.trim() || undefined,
        isPublished,
      }

      const endpoint = editingItem ? `/api/admin/gallery/${editingItem.id}` : '/api/admin/gallery'
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
          message: editingItem ? 'Gallery item updated.' : 'Gallery item created successfully.',
        })
        setIsModalOpen(false)
        resetForm()
        await fetchGallery()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save gallery item.' })
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
      const res = await authFetch(`/api/admin/gallery/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Gallery item and media deleted successfully.' })
        setDeleteTarget(null)
        await fetchGallery()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete gallery item.' })
        setDeleteTarget(null)
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete gallery item.' })
      setDeleteTarget(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async (item: GalleryDoc) => {
    try {
      const res = await authFetch(`/api/admin/gallery/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      })
      if (res.ok) {
        setGallery((prev) =>
          prev.map((g) => (g.id === item.id ? { ...g, isPublished: !item.isPublished } : g))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= gallery.length) return

    const newGallery = [...gallery]
    const temp = newGallery[index]
    newGallery[index] = newGallery[targetIndex]
    newGallery[targetIndex] = temp

    setGallery(newGallery)

    try {
      await authFetch('/api/admin/gallery/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newGallery.map((g) => g.id) }),
      })
    } catch (err) {
      console.error('Failed to update order on server:', err)
      await fetchGallery()
    }
  }

  const filteredGallery = gallery.filter((item) => {
    const matchesType = selectedType === 'all' || item.type === selectedType
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
            Gallery Media
          </h2>
          <p className="text-xs text-slate-500">
            Manage photos, posters, and videos for the public gallery.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Upload Media Item</span>
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
      <div className="space-y-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search gallery title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'photo', 'poster', 'video'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  selectedType === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'all' ? 'All Types' : t + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                selectedCategory === c
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="size-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs">Loading gallery media...</p>
        </div>
      ) : filteredGallery.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Images className="size-8 mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No gallery media found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload your first photo or video, or sync initial content from the dashboard overview.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGallery.map((item, idx) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col"
            >
              {/* Media Thumbnail */}
              <div
                className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden cursor-pointer"
                onClick={() => setPreviewItem(item)}
              >
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-slate-100 text-slate-400">
                    <FileImage className="size-8" />
                  </div>
                )}

                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
                    <div className="flex size-10 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-md">
                      <Play className="size-4 ml-0.5" />
                    </div>
                  </div>
                )}

                <div className="absolute top-2 left-2 flex gap-1">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'video'
                        ? 'bg-rose-600 text-white'
                        : item.type === 'poster'
                        ? 'bg-amber-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {item.type}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-medium">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Information */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.year} Academic Year</p>
                </div>

                {/* Status & Reorder */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(item)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded-md p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                      title="Move up"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === gallery.length - 1}
                      className="rounded-md p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                      title="Move down"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-md p-1 hover:bg-slate-100 text-slate-600 hover:text-blue-600"
                      title="Edit"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded-md p-1 hover:bg-rose-50 text-slate-600 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Gallery Item' : 'Add Gallery Item'}
        description="Upload photos, posters or videos to Cloudinary."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="photo">Photo</option>
                <option value="poster">Poster</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                {STANDARD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Custom">+ Custom Category</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Year *
              </label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          {category === 'Custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Custom Category Name *
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Sports Day 2026"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Title / Caption *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Smart digital classroom session"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
              />
              <span className="text-xs font-medium text-slate-700">Publish in public gallery</span>
            </label>
          </div>

          {/* Cloudinary Uploader */}
          <MediaUploader
            folder="shaheen-mount-seena/gallery"
            resourceType={type === 'video' ? 'video' : 'image'}
            label={type === 'video' ? 'Upload Video File (Cloudinary)' : 'Upload Photo / Poster (Cloudinary)'}
            description={type === 'video' ? 'Upload MP4/WebM video' : 'Upload gallery photo or poster'}
            currentUrl={url}
            currentThumbnail={thumbnail}
            onUploadComplete={(res) => {
              setUrl(res.url)
              setThumbnail(res.thumbnail)
              setCloudinaryPublicId(res.publicId)
            }}
            onClear={() => {
              setUrl('')
              setThumbnail('')
              setCloudinaryPublicId('')
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {type === 'video' ? 'Video URL or YouTube Embed URL *' : 'Media URL *'}
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (!thumbnail) setThumbnail(e.target.value)
              }}
              placeholder="Image or video URL (auto-populated upon uploading above)"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

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
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Gallery Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          description={`${previewItem.category} • ${previewItem.year}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {previewItem.type === 'video' ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                {previewItem.url.includes('youtube') ? (
                  <iframe
                    src={previewItem.url}
                    title={previewItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="size-full border-0"
                  />
                ) : (
                  <video src={previewItem.url} controls className="size-full" />
                )}
              </div>
            ) : (
              <div className="relative aspect-[4/3] max-h-[500px] w-full rounded-xl overflow-hidden bg-slate-100">
                <Image
                  src={previewItem.url}
                  alt={previewItem.title}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Gallery Media"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Yes, Delete"
        isLoading={isSubmitting}
      />
    </div>
  )
}
